import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MedicinesApiService } from '../../Services/medicines-api.service';
import { TaxesService } from '../../../Tax/Services/tax';
import { Tax } from '../../../Tax/Models/tax';
import { MedicineDetails, MedicineEditFields } from '../../Models/medicine.model';
import { getErrorMessage } from '../../../../Shared/utils/get-error-message';
import { ModalOverlayDirective } from '../../../../Shared/Components/modal-overlay/modal-overlay';

@Component({
  selector: 'app-edit-pharmacy-medicine-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, ModalOverlayDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './edit-pharmacy-medicine-dialog.html',
})
export class EditPharmacyMedicineDialogComponent implements OnInit {
  private readonly api = inject(MedicinesApiService);
  private readonly taxesApi = inject(TaxesService);
  private readonly fb = inject(NonNullableFormBuilder);

  // id used for the PUT — this is the global Medicine.Id, same one the details route/page uses
  medicineId = input.required<string>();
  medicine = input.required<MedicineEditFields>();

  closed = output<void>();
  saved = output<void>();

  protected readonly submitting = signal(false);
  protected readonly errorMsg = signal<string | null>(null);

  protected readonly taxes = signal<Tax[]>([]);
  protected readonly taxesLoading = signal(true);
  protected readonly taxesError = signal<string | null>(null);
  protected readonly selectedTaxIds = signal<Set<string>>(new Set());

  readonly form = this.fb.group({
    sellingPrice: this.fb.control(0, [Validators.required, Validators.min(0)]),
    purchasePrice: this.fb.control(0, [Validators.required, Validators.min(0)]),
    minStockLevel: this.fb.control(0, [Validators.required, Validators.min(0)]),
  });

  ngOnInit(): void {
    const m = this.medicine();
    this.form.patchValue({
      sellingPrice: m.sellingPrice,
      purchasePrice: m.purchasePrice,
      minStockLevel: m.minStockLevel,
    });
    this.selectedTaxIds.set(new Set(m.taxes.map((t) => t.id)));

    this.loadTaxes();
  }

  protected loadTaxes(): void {
    this.taxesLoading.set(true);
    this.taxesError.set(null);
    this.taxesApi.getAll().subscribe({
      next: (list) => {
        this.taxes.set(list.filter((tax) => tax.status === 'Active'));
        this.taxesLoading.set(false);
      },
      error: () => {
        this.taxes.set([]);
        this.taxesLoading.set(false);
        this.taxesError.set('Could not load active taxes.');
      },
    });
  }

  toggleTax(id: string): void {
    const next = new Set(this.selectedTaxIds());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedTaxIds.set(next);
  }

  onClose(): void {
    this.closed.emit();
  }

  submit(): void {
    if (this.form.invalid || this.selectedTaxIds().size === 0) {
      this.form.markAllAsTouched();
      if (this.selectedTaxIds().size === 0) {
        this.errorMsg.set('At least one tax is required.');
      }
      return;
    }

    this.submitting.set(true);
    this.errorMsg.set(null);

    const { sellingPrice, purchasePrice, minStockLevel } = this.form.getRawValue();

    this.api
      .updatePharmacyMedicine(this.medicineId(), {
        sellingPrice,
        purchasePrice,
        minStockLevel,
        taxIds: Array.from(this.selectedTaxIds()),
        sKU: null, // leaves the current SKU unchanged
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.saved.emit();
          this.closed.emit();
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMsg.set(getErrorMessage(err, 'Could not save these changes.'));
        },
      });
  }
}

export { EditPharmacyMedicineDialogComponent as EditPharmacyMedicineDialog };
