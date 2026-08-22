import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CustomersApiService } from '../../Services/customers-api.service';
import { Customer, CustomerUpsertDto, CatalogItem } from '../../Models/customer.model';
import { getErrorMessage } from '../../../../Shared/utils/get-error-message';
import { TagPickerComponent } from '../../../../Shared/Components/tag-picker/tag-picker';
import {
  MedicinePickerComponent,
  MedicineSelection,
} from '../../../../Shared/Components/medicine-picker/medicine-picker';
import {
  CustomerPickerComponent,
  CustomerPickResult,
} from '../../../../Shared/Components/customer-picker/customer-picker';
import { fullNameValidator, phoneValidator } from '../../../subscribe/Validators/custom-validators';
import { ModalOverlayDirective } from '../../../../Shared/Components/modal-overlay/modal-overlay';
import { I18nService } from '../../../../Core/Services/i18n.service';

interface OrganFunctionEntry {
  organId: string;
  organName: string;
  organImpairmentLevelId: string;
  levelName: string;
}

@Component({
  selector: 'app-add-edit-customer-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TagPickerComponent,
    MedicinePickerComponent,
    CustomerPickerComponent,
    ModalOverlayDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-edit-customer-dialog.html',
  styleUrl: './add-edit-customer-dialog.css',
})
export class AddEditCustomerDialogComponent {
  private readonly api = inject(CustomersApiService);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly i18n = inject(I18nService);

  // Pass an existing customer to edit; omit (or leave undefined) to create a new one.
  readonly customer = input<Customer | null>(null);

  closed = output<void>();
  saved = output<void>();

  protected readonly isEdit = computed(() => this.customer() !== null);
  protected readonly submitting = signal(false);
  protected readonly errorMsg = signal<string | null>(null);
  private catalogsLoaded = false;

  readonly form = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.maxLength(255), fullNameValidator]),
    phone: this.fb.control('', [Validators.maxLength(50), phoneValidator]),
    email: this.fb.control('', [Validators.email]),
    address: this.fb.control(''),
    dateOfBirth: this.fb.control(''),
    notes: this.fb.control(''),
    status: this.fb.control<'Active' | 'Inactive'>('Active'),
  });

  constructor() {
    effect(() => {
      const existing = this.customer();
      if (existing) {
        this.form.reset({
          name: existing.name ?? '',
          phone: existing.phone ?? '',
          email: existing.email ?? '',
          address: existing.address ?? '',
          dateOfBirth: existing.dateOfBirth?.slice(0, 10) ?? '',
          notes: existing.notes ?? '',
          status: existing.status ?? 'Active',
        });
      } else if (!this.catalogsLoaded) {
        // These extra sections only make sense when creating a customer.
        this.catalogsLoaded = true;
        this.loadCatalogs();
      }
    });
  }

  onClose(): void {
    this.closed.emit();
  }

  // --- Reference catalogs (create mode only) ---

  protected readonly allergyCatalog = signal<CatalogItem[]>([]);
  protected readonly chronicConditionCatalog = signal<CatalogItem[]>([]);
  protected readonly organCatalog = signal<CatalogItem[]>([]);
  protected readonly organImpairmentLevelCatalog = signal<CatalogItem[]>([]);
  protected readonly selectedParent = signal<CustomerPickResult | null>(null);

  private loadCatalogs(): void {
    this.api.getAllergyCatalog().subscribe({ next: (list) => this.allergyCatalog.set(list) });
    this.api
      .getChronicConditionCatalog()
      .subscribe({ next: (list) => this.chronicConditionCatalog.set(list) });
    this.api.getOrganCatalog().subscribe({ next: (list) => this.organCatalog.set(list) });
    this.api
      .getOrganImpairmentLevelCatalog()
      .subscribe({ next: (list) => this.organImpairmentLevelCatalog.set(list) });
  }

  // --- Medicine (search global catalog first, fall back to manual entry) ---

  protected readonly medicineSelection = signal<MedicineSelection | null>(null);
  private readonly medicinePicker = viewChild(MedicinePickerComponent);
  readonly medicineForm = this.fb.group({
    quantity: this.fb.control(1, [Validators.min(1)]),
    isActive: this.fb.control(true),
  });

  onMedicineSelectionChange(selection: MedicineSelection | null): void {
    this.medicineSelection.set(selection);
    if (selection) {
      this.errorMsg.set(null);
    }
  }

  // --- Allergies (via shared tag-picker) ---

  protected readonly allergyItems = computed(() =>
    this.allergyCatalog().map((c) => ({ id: c.id, label: this.i18n.localizedName(c) })),
  );
  protected readonly selectedAllergyIds = signal<string[]>([]);

  onAllergySelectionChange(ids: string[]): void {
    this.selectedAllergyIds.set(ids);
  }

  // --- Chronic conditions (via shared tag-picker) ---

  protected readonly chronicConditionItems = computed(() =>
    this.chronicConditionCatalog().map((c) => ({ id: c.id, label: this.i18n.localizedName(c) })),
  );
  protected readonly selectedChronicConditionIds = signal<string[]>([]);

  onChronicConditionSelectionChange(ids: string[]): void {
    this.selectedChronicConditionIds.set(ids);
  }

  // --- Organ functions (build a small list before submit — organ + level pairs) ---

  readonly organFunctionForm = this.fb.group({
    organId: this.fb.control(''),
    organImpairmentLevelId: this.fb.control(''),
  });
  protected readonly organFunctionEntries = signal<OrganFunctionEntry[]>([]);

  onAddOrganFunctionEntry(): void {
    const raw = this.organFunctionForm.getRawValue();
    if (!raw.organId || !raw.organImpairmentLevelId) return;

    const organ = this.organCatalog().find((o) => o.id === raw.organId);
    const level = this.organImpairmentLevelCatalog().find(
      (l) => l.id === raw.organImpairmentLevelId,
    );
    if (!organ || !level) return;

    // Replace any existing entry for the same organ — same "one record per organ" rule as the backend.
    this.organFunctionEntries.update((entries) => [
      ...entries.filter((e) => e.organId !== organ.id),
      {
        organId: organ.id,
        organName: organ.nameEn,
        organImpairmentLevelId: level.id,
        levelName: level.nameEn,
      },
    ]);
    this.organFunctionForm.reset({ organId: '', organImpairmentLevelId: '' });
  }

  onRemoveOrganFunctionEntry(organId: string): void {
    this.organFunctionEntries.update((entries) => entries.filter((e) => e.organId !== organId));
  }

  onParentSelectionChange(selection: CustomerPickResult | null): void {
    this.selectedParent.set(selection);
  }

  // --- Submit ---

  onSubmit(): void {
    if (this.customer() === null && !this.form.get('phone')?.value) {
      this.form.get('phone')?.markAsTouched();
    }

    if (this.medicinePicker()?.hasIncompleteManualEntry()) {
      this.medicinePicker()?.markTouched();
      this.errorMsg.set(
        this.i18n.text('customer.finishMedicine'),
      );
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const dto: CustomerUpsertDto = {
      name: raw.name,
      phone: raw.phone || '',
      email: raw.email || null,
      address: raw.address || null,
      dateOfBirth: raw.dateOfBirth || null,
      notes: raw.notes || null,
      status: raw.status,
      hasParent: Boolean(this.selectedParent()),
    };

    this.submitting.set(true);
    this.errorMsg.set(null);

    const existing = this.customer();

    if (existing) {
      this.api.update(existing.id, dto).subscribe({
        next: () => {
          this.submitting.set(false);
          this.saved.emit();
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMsg.set(getErrorMessage(err, this.i18n.text('customer.errorSave')));
        },
      });
      return;
    }

    this.api.create(dto).subscribe({
      next: (created) => this.assignExtras(created.id),
      error: (err) => {
        this.submitting.set(false);
        this.errorMsg.set(getErrorMessage(err, this.i18n.text('customer.errorCreate')));
      },
    });
  }

  private assignExtras(customerId: string): void {
    const requests = [];

    const selection = this.medicineSelection();
    if (selection && selection.label.trim()) {
      const medicine = this.medicineForm.getRawValue();
      requests.push(
        this.api
          .addMedicineHistory(customerId, {
            medicineId: selection.medicineId,
            tradeName: selection.medicineId ? null : selection.label,
            scientificName: selection.medicineId ? null : (selection.scientificName ?? null),
            quantity: medicine.quantity,
            isActive: medicine.isActive,
          })
          .pipe(catchError(() => of(null))),
      );
    }

    for (const allergyId of this.selectedAllergyIds()) {
      requests.push(
        this.api.assignAllergy(customerId, { allergyId }).pipe(catchError(() => of(null))),
      );
    }

    for (const chronicConditionId of this.selectedChronicConditionIds()) {
      requests.push(
        this.api
          .assignChronicCondition(customerId, { chronicConditionId })
          .pipe(catchError(() => of(null))),
      );
    }

    const selectedParent = this.selectedParent();
    if (selectedParent) {
      requests.push(
        this.api
          .addRelative({
            customerId: selectedParent.customerId,
            relativeId: customerId,
            hasAccessToRelative: true,
          })
          .pipe(catchError(() => of(null))),
      );
    }

    for (const entry of this.organFunctionEntries()) {
      requests.push(
        this.api
          .assignOrganFunction(customerId, {
            organId: entry.organId,
            organImpairmentLevelId: entry.organImpairmentLevelId,
          })
          .pipe(catchError(() => of(null))),
      );
    }

    if (requests.length === 0) {
      this.submitting.set(false);
      this.saved.emit();
      return;
    }

    forkJoin(requests).subscribe(() => {
      this.submitting.set(false);
      this.saved.emit();
    });
  }
}

export { AddEditCustomerDialogComponent as AddEditCustomerDialog };
