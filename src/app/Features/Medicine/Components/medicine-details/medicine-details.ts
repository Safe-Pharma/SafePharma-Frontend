import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, tap } from 'rxjs';
import { MedicinesApiService } from '../../Services/medicines-api.service';
import { MedicineDetails as MedicineDetailsModel } from '../../Models/medicine.model';
import { getErrorMessage } from '../../../../Shared/utils/get-error-message';
import { AddBarcodeDialogComponent } from '../add-barcode-dialog/add-barcode-dialog';
import { EditPharmacyMedicineDialogComponent } from '../edit-pharmacy-medicine-dialog/edit-pharmacy-medicine-dialog';
import { EgpCurrencyPipe } from '../../../../Shared/Pipes/egp-currency.pipe';
import { I18nService } from '../../../../Core/Services/i18n.service';
import { PageHeaderComponent } from '../../../../Shared/Components/page-header/page-header';

type Tab = 'general' | 'pharmacy' | 'barcodes' | 'batches';

@Component({
  selector: 'app-medicine-details',
  standalone: true,
  imports: [CommonModule, RouterLink, AddBarcodeDialogComponent, EditPharmacyMedicineDialogComponent, EgpCurrencyPipe, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './medicine-details.html',
})
export class MedicineDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(MedicinesApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(I18nService);

  protected readonly showEditDialog = signal(false);
  protected readonly showAddBarcodeDialog = signal(false);
  protected readonly barcodeType = signal<'manufacturer' | 'pharmacy'>('pharmacy');
  protected readonly activeTab = signal<Tab>('general');
  protected readonly loading = signal(true);
  protected readonly errorMsg = signal<string | null>(null);
  protected readonly medicine = signal<MedicineDetailsModel | null>(null);
  protected readonly updatingStatus = signal(false);

  displayName(medicine: MedicineDetailsModel): string {
    return this.i18n.lang() === 'ar' ? medicine.tradeNameAr || medicine.tradeNameEn : medicine.tradeNameEn || medicine.tradeNameAr;
  }

  medicineSummary(medicine: MedicineDetailsModel): string {
    return [
      medicine.scientificName ? `${this.text('medicine.scientificName')}: ${medicine.scientificName}` : null,
      medicine.manufacturer ? `${this.text('medicine.manufacturer')}: ${medicine.manufacturer}` : null,
      medicine.strength ? `${this.text('medicine.strength')}: ${medicine.strength}` : null,
      medicine.dosageForm ? `${this.text('medicine.form')}: ${medicine.dosageForm}` : null,
      medicine.sku ? medicine.sku : null,
    ].filter((part): part is string => Boolean(part)).join(' · ');
  }

  constructor() {
    this.route.paramMap
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.errorMsg.set(null);
        }),
        switchMap((params) => {
          const id = params.get('id')!;
          return this.api.getDetails(id).pipe(
            tap((data) => {
              this.medicine.set(data);
              this.loading.set(false);
            }),
            catchError((err) => {
              this.loading.set(false);
              this.medicine.set(null);
              this.errorMsg.set(getErrorMessage(err, this.text('medicine.errorLoad')));
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  toggleStatus(): void {
    const m = this.medicine();
    if (!m || this.updatingStatus()) return;

    this.updatingStatus.set(true);
    this.api.toggleStatus(m.id).subscribe({
      next: () => {
        this.updatingStatus.set(false);
        this.medicine.set({ ...m, isPharmacyActive: !m.isPharmacyActive });
      },
      error: () => this.updatingStatus.set(false),
    });
  }

addBarcode(type: 'manufacturer' | 'pharmacy'): void {
    this.barcodeType.set(type);
    this.showAddBarcodeDialog.set(true);
  }

  onBarcodeDialogClosed(): void {
    this.showAddBarcodeDialog.set(false);
  }

  onBarcodeAdded(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.api.getDetails(id).subscribe({
      next: (data) => this.medicine.set(data),
    });
  }

editMedicine(): void {
  this.showEditDialog.set(true);
}

onEditDialogClosed(): void {
  this.showEditDialog.set(false);
}

onMedicineSaved(): void {
  const id = this.route.snapshot.paramMap.get('id');
  if (!id) return;

  this.api.getDetails(id).subscribe({
    next: (data) => this.medicine.set(data),
  });
}

  text(key: string, params?: Record<string, string | number>): string {
    return this.i18n.text(key, params);
  }
}

export { MedicineDetailsComponent as MedicineDetails };
