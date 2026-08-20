import { ChangeDetectionStrategy, Component, computed, inject, output, signal  } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { MedicinesApiService } from '../../Services/medicines-api.service';
import { GlobalMedicineSearchResult } from '../../Models/medicine.model';
import { TaxesService } from '../../../Tax/Services/tax';
import { Tax } from '../../../Tax/Models/tax';
import { AuthSessionService } from '../../../../Core/Services/auth-session.service';
import { getErrorMessage } from '../../../../Shared/utils/get-error-message';
import { NgTemplateOutlet } from '@angular/common';
import { ModalOverlayDirective } from '../../../../Shared/Components/modal-overlay/modal-overlay';

type Step = 'search' | 'link' | 'create';

@Component({
  selector: 'app-add-medicine-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, NgTemplateOutlet, ModalOverlayDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-medicine-dialog.html',
})
export class AddMedicineDialogComponent {
  private readonly api = inject(MedicinesApiService);
  private readonly taxesApi = inject(TaxesService);
  private readonly auth = inject(AuthSessionService);
  private readonly fb = inject(NonNullableFormBuilder);

  closed = output<void>();
  created = output<void>();

  protected readonly isOwner = computed(() => this.auth.user()?.role === 'Owner');

  protected readonly step = signal<Step>('search');
  protected readonly query = signal('');
  protected readonly selected = signal<GlobalMedicineSearchResult | null>(null);
  protected readonly submitting = signal(false);
  protected readonly errorMsg = signal<string | null>(null);

  protected readonly taxes = signal<Tax[]>([]);
  protected readonly taxesLoading = signal(true);
  protected readonly taxesError = signal<string | null>(null);
  protected readonly selectedTaxIds = signal<Set<string>>(new Set());

  private readonly query$ = toObservable(this.query).pipe(debounceTime(300), distinctUntilChanged());
  private readonly results$ = this.query$.pipe(
    switchMap((q) =>
      q.trim().length < 2
        ? of<GlobalMedicineSearchResult[]>([])
        : this.api.searchGlobal(q.trim()).pipe(catchError(() => of<GlobalMedicineSearchResult[]>([]))),
    ),
  );
  protected readonly results = toSignal(this.results$, { initialValue: [] as GlobalMedicineSearchResult[] });
  protected readonly searched = computed(() => this.query().trim().length >= 2);

  // Shared pharmacy-specific fields — used for both "link existing" and "create new"
  readonly pharmacyForm = this.fb.group({
    purchasePrice: this.fb.control(0, [Validators.required, Validators.min(0)]),
    sellingPrice: this.fb.control(0, [Validators.required, Validators.min(0)]),
    minStockLevel: this.fb.control(0, [Validators.required, Validators.min(0)]),
    sKU: this.fb.control(''),
  });

  // Only used when creating a brand-new medicine (global or local)
  readonly newMedicineForm = this.fb.group({
    tradeNameAr: this.fb.control('', Validators.required),
    tradeNameEn: this.fb.control('', Validators.required),
    scientificName: this.fb.control('', Validators.required),
    category: this.fb.control('', Validators.required),
    unitOfSale: this.fb.control('', Validators.required),
    unitsPerPackage: this.fb.control(1, [Validators.required, Validators.min(1)]),
    dosageForm: this.fb.control('', Validators.required),
    strength: this.fb.control('', Validators.required),
    isPrescriptionRequired: this.fb.control(false),
    isControlled: this.fb.control(false),
    manufacturer: this.fb.control(''),
    countryOfOrigin: this.fb.control(''),
    storageConditions: this.fb.control(''),
    therapeuticCategory: this.fb.control(''),
  });

  constructor() {
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

  onQueryInput(value: string): void {
    this.query.set(value);
  }

  toggleTax(id: string): void {
    const next = new Set(this.selectedTaxIds());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedTaxIds.set(next);
  }

  selectResult(result: GlobalMedicineSearchResult): void {
    if (result.isAlreadyInPharmacy) return;
    this.selected.set(result);
    this.errorMsg.set(null);
    this.step.set('link');
  }

  startCreateNew(): void {
    this.selected.set(null);
    this.errorMsg.set(null);
    this.newMedicineForm.patchValue({ tradeNameEn: this.query() });
    this.step.set('create');
  }

  backToSearch(): void {
    this.step.set('search');
    this.errorMsg.set(null);
  }

  onClose(): void {
    this.closed.emit();
  }

  submitLink(): void {
    const selected = this.selected();
    if (!selected || this.pharmacyForm.invalid || this.selectedTaxIds().size === 0) {
      this.pharmacyForm.markAllAsTouched();
      if (this.selectedTaxIds().size === 0) this.errorMsg.set('Select at least one tax.');
      return;
    }

    this.submitting.set(true);
    this.errorMsg.set(null);

    const { purchasePrice, sellingPrice, minStockLevel, sKU } = this.pharmacyForm.getRawValue();

    this.api
      .linkExisting({
        medicineId: selected.id,
        purchasePrice,
        sellingPrice,
        minStockLevel,
        sKU: sKU || null,
        taxIds: Array.from(this.selectedTaxIds()),
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.created.emit();
          this.closed.emit();
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMsg.set(getErrorMessage(err, 'Could not add this medicine to your pharmacy.'));
        },
      });
  }

  submitCreate(): void {
    if (this.newMedicineForm.invalid || this.pharmacyForm.invalid || this.selectedTaxIds().size === 0) {
      this.newMedicineForm.markAllAsTouched();
      this.pharmacyForm.markAllAsTouched();
      if (this.selectedTaxIds().size === 0) this.errorMsg.set('Select at least one tax.');
      return;
    }

    this.submitting.set(true);
    this.errorMsg.set(null);

    const { purchasePrice, sellingPrice, minStockLevel, sKU } = this.pharmacyForm.getRawValue();
    const dto = {
      ...this.newMedicineForm.getRawValue(),
      isActive: true,
      purchasePrice,
      sellingPrice,
      minStockLevel,
      sKU: sKU || null,
      taxIds: Array.from(this.selectedTaxIds()),
    };

    const create$ = this.isOwner() ? this.api.createGlobal(dto) : this.api.createLocal(dto);

    create$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.created.emit();
        this.closed.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMsg.set(getErrorMessage(err, 'Could not create this medicine.'));
      },
    });
  }
}

export { AddMedicineDialogComponent as AddMedicineDialog };
