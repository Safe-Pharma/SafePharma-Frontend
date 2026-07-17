import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomersApiService } from '../../Services/customers-api.service';
import { Customer, CustomerUpsertDto } from '../../Models/customer.model';
import { getErrorMessage } from '../../../../Shared/utils/get-error-message';

@Component({
  selector: 'app-add-edit-customer-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-edit-customer-dialog.html',
})
export class AddEditCustomerDialogComponent {
  private readonly api = inject(CustomersApiService);
  private readonly fb = inject(NonNullableFormBuilder);

  // Pass an existing customer to edit; omit (or leave undefined) to create a new one.
  readonly customer = input<Customer | null>(null);

  closed = output<void>();
  saved = output<void>();

  protected readonly isEdit = computed(() => this.customer() !== null);
  protected readonly submitting = signal(false);
  protected readonly errorMsg = signal<string | null>(null);

  readonly form = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.maxLength(255)]),
    phone: this.fb.control('', [Validators.required, Validators.maxLength(50)]),
    email: this.fb.control(''),
    address: this.fb.control(''),
    dateOfBirth: this.fb.control(''),
    notes: this.fb.control(''),
    status: this.fb.control<'Active' | 'Inactive'>('Active'),
  });

  constructor() {
    const existing = this.customer();
    if (existing) {
      this.form.patchValue({
        name: existing.name,
        phone: existing.phone,
        email: existing.email,
        address: existing.address,
        dateOfBirth: existing.dateOfBirth?.slice(0, 10) ?? '',
        notes: existing.notes,
        status: existing.status,
      });
    }
  }

  onClose(): void {
    this.closed.emit();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const dto: CustomerUpsertDto = {
      name: raw.name,
      phone: raw.phone,
      email: raw.email || null,
      address: raw.address || null,
      dateOfBirth: raw.dateOfBirth || null,
      notes: raw.notes || null,
      status: raw.status,
    };

    this.submitting.set(true);
    this.errorMsg.set(null);

    const existing = this.customer();
    const request$ = existing ? this.api.update(existing.id, dto) : this.api.create(dto);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.saved.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMsg.set(getErrorMessage(err, 'Could not save customer.'));
      },
    });
  }
}