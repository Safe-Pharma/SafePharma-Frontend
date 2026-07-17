import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomersApiService } from '../../Services/customers-api.service';
import { Customer, CustomerMedicineHistory } from '../../Models/customer.model';
import { getErrorMessage } from '../../../../Shared/utils/get-error-message';
import { AuthSessionService } from '../../../../Core/Services/auth-session.service';
import { AddEditCustomerDialogComponent } from '../add-edit-customer-dialog/add-edit-customer-dialog';

@Component({
  selector: 'app-customer-details',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, AddEditCustomerDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-details.html',
})
export class CustomerDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CustomersApiService);
  private readonly auth = inject(AuthSessionService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly isOwner = computed(() => this.auth.user()?.role === 'Owner');

  private readonly id = this.route.snapshot.paramMap.get('id')!;

  protected readonly loading = signal(true);
  protected readonly errorMsg = signal<string | null>(null);
  private readonly refreshTick = signal(0);

  protected readonly customer = signal<Customer | null>(null);
  protected readonly history = signal<CustomerMedicineHistory[]>([]);
  protected readonly historyFilter = signal<'all' | 'active'>('all');

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.errorMsg.set(null);

    this.api.getById(this.id).subscribe({
      next: (customer) => {
        this.customer.set(customer);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(getErrorMessage(err, 'Could not load customer.'));
      },
    });

    this.loadHistory();
  }

  private loadHistory(): void {
    const isActive = this.historyFilter() === 'active' ? true : undefined;
    this.api.getMedicineHistory(this.id, isActive).subscribe({
      next: (history) => this.history.set(history),
      error: (err) => this.errorMsg.set(getErrorMessage(err, 'Could not load medicine history.')),
    });
  }

  onFilterChange(filter: 'all' | 'active'): void {
    this.historyFilter.set(filter);
    this.loadHistory();
  }

  // --- Edit customer ---

  protected readonly showEditDialog = signal(false);

  onOpenEditDialog(): void {
    this.showEditDialog.set(true);
  }

  onCloseEditDialog(): void {
    this.showEditDialog.set(false);
  }

  onCustomerSaved(): void {
    this.showEditDialog.set(false);
    this.load();
  }

  // --- Record payment ---

  protected readonly paymentForm = this.fb.group({
    amount: this.fb.control(0, [Validators.required, Validators.min(0.01)]),
  });
  protected readonly recordingPayment = signal(false);

  onRecordPayment(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.recordingPayment.set(true);
    this.api.recordPayment(this.id, { amount: this.paymentForm.getRawValue().amount }).subscribe({
      next: (customer) => {
        this.customer.set(customer);
        this.recordingPayment.set(false);
        this.paymentForm.reset({ amount: 0 });
      },
      error: (err) => {
        this.recordingPayment.set(false);
        this.errorMsg.set(getErrorMessage(err, 'Could not record payment.'));
      },
    });
  }

  // --- Add medicine history ---

  protected readonly showAddHistoryForm = signal(false);
  protected readonly historyForm = this.fb.group({
    scientificName: this.fb.control(''),
    quantity: this.fb.control(1, [Validators.required, Validators.min(1)]),
    isActive: this.fb.control(true),
    notes: this.fb.control(''),
  });
  protected readonly addingHistory = signal(false);

  onOpenAddHistoryForm(): void {
    this.showAddHistoryForm.set(true);
  }

  onCloseAddHistoryForm(): void {
    this.showAddHistoryForm.set(false);
    this.historyForm.reset({ quantity: 1, isActive: true });
  }

  onAddHistory(): void {
    // No global-catalog picker wired up yet — this form only covers the free-text path
    // (medicine not found in the catalog). See note in customer-details.html.
    if (this.historyForm.invalid || !this.historyForm.getRawValue().scientificName.trim()) {
      this.historyForm.markAllAsTouched();
      return;
    }

    const raw = this.historyForm.getRawValue();
    this.addingHistory.set(true);
    this.api
      .addMedicineHistory(this.id, {
        scientificName: raw.scientificName.trim(),
        quantity: raw.quantity,
        isActive: raw.isActive,
        notes: raw.notes || null,
      })
      .subscribe({
        next: () => {
          this.addingHistory.set(false);
          this.onCloseAddHistoryForm();
          this.loadHistory();
        },
        error: (err) => {
          this.addingHistory.set(false);
          this.errorMsg.set(getErrorMessage(err, 'Could not add medicine history.'));
        },
      });
  }

  onToggleActive(entry: CustomerMedicineHistory): void {
    this.api.toggleMedicineActive(this.id, entry.id).subscribe({
      next: () => this.loadHistory(),
      error: (err) => this.errorMsg.set(getErrorMessage(err, 'Could not update.')),
    });
  }

  onDeleteHistory(entry: CustomerMedicineHistory): void {
    if (!confirm(`Remove "${entry.medicineName}" from this customer's history?`)) return;
    this.api.deleteMedicineHistory(this.id, entry.id).subscribe({
      next: () => this.loadHistory(),
      error: (err) => this.errorMsg.set(getErrorMessage(err, 'Could not delete history entry.')),
    });
  }
}