import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MedicinesApiService } from '../../Services/medicines-api.service';
import { AuthSessionService } from '../../../../Core/Services/auth-session.service';
import { getErrorMessage } from '../../../../Shared/utils/get-error-message';

type BarcodeType = 'pharmacy' | 'manufacturer';

@Component({
  selector: 'app-add-barcode-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-barcode-dialog.html',
})
export class AddBarcodeDialogComponent {
  private readonly api = inject(MedicinesApiService);
  private readonly auth = inject(AuthSessionService);
  private readonly fb = inject(NonNullableFormBuilder);

  medicineId = input.required<string>();
  pharmacyMedicineId = input.required<string>();

  closed = output<void>();
  added = output<void>();

  protected readonly isOwner = computed(() => this.auth.user()?.role === 'Owner');
  protected readonly type = signal<BarcodeType>('pharmacy');
  protected readonly submitting = signal(false);
  protected readonly errorMsg = signal<string | null>(null);

  readonly form = this.fb.group({
    barcode: this.fb.control(''),
    isPrimary: this.fb.control(false),
  });

  setType(type: BarcodeType): void {
    this.type.set(type);
    this.errorMsg.set(null);

    const barcodeControl = this.form.controls.barcode;
    barcodeControl.setValidators(
      type === 'manufacturer' ? [Validators.required, Validators.maxLength(100)] : [Validators.maxLength(100)],
    );
    barcodeControl.updateValueAndValidity();
  }

  onClose(): void {
    this.closed.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMsg.set(null);

    const { barcode, isPrimary } = this.form.getRawValue();
    const request$ =
      this.type() === 'manufacturer'
        ? this.api.addManufacturerBarcode({ medicineId: this.medicineId(), barcode, isPrimary })
        : this.api.addPharmacyBarcode({
            pharmacyMedicineId: this.pharmacyMedicineId(),
            barcode: barcode || null,
            isPrimary,
          });

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.added.emit();
        this.closed.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMsg.set(getErrorMessage(err, 'Could not add this barcode.'));
      },
    });
  }
}