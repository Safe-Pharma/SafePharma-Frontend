import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomersApiService } from '../../Services/customers-api.service';
import {
  Customer,
  CustomerMedicineHistory,
  CatalogItem,
  CustomerAllergy,
  CustomerChronicCondition,
  CustomerOrganFunction,
  CustomerRelative,
} from '../../Models/customer.model';
import { getErrorMessage } from '../../../../Shared/utils/get-error-message';
import { AuthSessionService } from '../../../../Core/Services/auth-session.service';
import { AddEditCustomerDialogComponent } from '../add-edit-customer-dialog/add-edit-customer-dialog';
import { TagPickerComponent } from '../../../../Shared/Components/tag-picker/tag-picker';
import {
  MedicinePickerComponent,
  MedicineSelection,
} from '../../../../Shared/Components/medicine-picker/medicine-picker';
import { Toast } from '../../../../Shared/Toasts/toast';
import {
  CustomerPickerComponent,
  CustomerPickResult,
} from '../../../../Shared/Components/customer-picker/customer-picker';

@Component({
  selector: 'app-customer-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    AddEditCustomerDialogComponent,
    TagPickerComponent,
    MedicinePickerComponent,
    CustomerPickerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-details.html',
})
export class CustomerDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CustomersApiService);
  private readonly toast = inject(Toast);
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
    this.loadCatalogs();
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
    this.loadAllergies();
    this.loadChronicConditions();
    this.loadOrganFunctions();
    this.loadRelatives();
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

  // Note: there's no manual "record payment" here anymore — totalPaid on the customer
  // is derived automatically from completed Sales (see SaleManager.Pay on the backend).

  // --- Add medicine history ---

  protected readonly showAddHistoryForm = signal(false);
  protected readonly medicineSelection = signal<MedicineSelection | null>(null);
  private readonly medicinePicker = viewChild(MedicinePickerComponent);
  protected readonly historyForm = this.fb.group({
    quantity: this.fb.control(1, [Validators.required, Validators.min(1)]),
    isActive: this.fb.control(true),
    notes: this.fb.control(''),
  });
  protected readonly addingHistory = signal(false);
  protected readonly historyErrorMsg = signal<string | null>(null);

  onOpenAddHistoryForm(): void {
    this.showAddHistoryForm.set(true);
    this.historyErrorMsg.set(null);
  }

  onCloseAddHistoryForm(): void {
    this.showAddHistoryForm.set(false);
    this.medicineSelection.set(null);
    this.historyErrorMsg.set(null);
    this.historyForm.reset({ quantity: 1, isActive: true });
  }

  onMedicineSelectionChange(selection: MedicineSelection | null): void {
    this.medicineSelection.set(selection);
    if (selection) {
      this.historyErrorMsg.set(null);
    }
  }

  onAddHistory(): void {
    const selection = this.medicineSelection();
    this.historyErrorMsg.set(null);

    if (this.medicinePicker()?.hasIncompleteManualEntry()) {
      this.medicinePicker()?.markTouched();
      return;
    }

    if (!selection || !selection.label.trim()) {
      this.historyErrorMsg.set(
        'Select a medicine from the catalog, or enter it manually with both a name and scientific name.',
      );
      return;
    }

    if (this.historyForm.invalid) {
      this.historyForm.markAllAsTouched();
      return;
    }

    const raw = this.historyForm.getRawValue();
    this.addingHistory.set(true);
    this.api
      .addMedicineHistory(this.id, {
        medicineId: selection.medicineId,
        tradeName: selection.medicineId ? null : selection.label,
        scientificName: selection.medicineId ? null : (selection.scientificName ?? null),
        quantity: raw.quantity,
        isActive: raw.isActive,
        notes: raw.notes || null,
      })
      .subscribe({
        next: (response) => {
          this.addingHistory.set(false);
          this.onCloseAddHistoryForm();
          this.loadHistory();
          this.toast.show(
            response.wasUpdated
              ? `${response.history.medicineName} was already in this customer's history — updated it.`
              : `${response.history.medicineName} added to medicine history.`,
            'success',
          );
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

  // --- Reference catalogs (dropdown sources — loaded once) ---

  protected readonly allergyCatalog = signal<CatalogItem[]>([]);
  protected readonly chronicConditionCatalog = signal<CatalogItem[]>([]);
  protected readonly organCatalog = signal<CatalogItem[]>([]);
  protected readonly organImpairmentLevelCatalog = signal<CatalogItem[]>([]);

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

  // --- Allergies (via shared tag-picker) ---

  protected readonly allergies = signal<CustomerAllergy[]>([]);
  protected readonly allergyItems = computed(() =>
    this.allergyCatalog().map((c) => ({ id: c.id, label: c.nameEn })),
  );
  protected readonly selectedAllergyIds = computed(() => this.allergies().map((a) => a.allergyId));

  private loadAllergies(): void {
    this.api.getAllergies(this.id).subscribe({
      next: (list) => this.allergies.set(list),
      error: (err) => this.errorMsg.set(getErrorMessage(err, 'Could not load allergies.')),
    });
  }

  onAllergySelectionChange(newIds: string[]): void {
    const currentIds = this.selectedAllergyIds();
    const added = newIds.find((id) => !currentIds.includes(id));
    const removed = currentIds.find((id) => !newIds.includes(id));

    if (added) {
      this.api.assignAllergy(this.id, { allergyId: added }).subscribe({
        next: () => this.loadAllergies(),
        error: (err) => this.errorMsg.set(getErrorMessage(err, 'Could not assign allergy.')),
      });
    } else if (removed) {
      this.api.removeAllergy(this.id, removed).subscribe({
        next: () => this.loadAllergies(),
        error: (err) => this.errorMsg.set(getErrorMessage(err, 'Could not remove allergy.')),
      });
    }
  }

  // --- Chronic conditions (via shared tag-picker) ---

  protected readonly chronicConditions = signal<CustomerChronicCondition[]>([]);
  protected readonly chronicConditionItems = computed(() =>
    this.chronicConditionCatalog().map((c) => ({ id: c.id, label: c.nameEn })),
  );
  protected readonly selectedChronicConditionIds = computed(() =>
    this.chronicConditions().map((c) => c.chronicConditionId),
  );

  private loadChronicConditions(): void {
    this.api.getChronicConditions(this.id).subscribe({
      next: (list) => this.chronicConditions.set(list),
      error: (err) => this.errorMsg.set(getErrorMessage(err, 'Could not load chronic conditions.')),
    });
  }

  onChronicConditionSelectionChange(newIds: string[]): void {
    const currentIds = this.selectedChronicConditionIds();
    const added = newIds.find((id) => !currentIds.includes(id));
    const removed = currentIds.find((id) => !newIds.includes(id));

    if (added) {
      this.api.assignChronicCondition(this.id, { chronicConditionId: added }).subscribe({
        next: () => this.loadChronicConditions(),
        error: (err) =>
          this.errorMsg.set(getErrorMessage(err, 'Could not assign chronic condition.')),
      });
    } else if (removed) {
      this.api.removeChronicCondition(this.id, removed).subscribe({
        next: () => this.loadChronicConditions(),
        error: (err) =>
          this.errorMsg.set(getErrorMessage(err, 'Could not remove chronic condition.')),
      });
    }
  }

  // --- Organ functions (assigning again for the same organ UPDATES its level) ---

  protected readonly organFunctions = signal<CustomerOrganFunction[]>([]);
  protected readonly organFunctionForm = this.fb.group({
    organId: this.fb.control(''),
    organImpairmentLevelId: this.fb.control(''),
  });
  protected readonly assigningOrganFunction = signal(false);

  private loadOrganFunctions(): void {
    this.api.getOrganFunctions(this.id).subscribe({
      next: (list) => this.organFunctions.set(list),
      error: (err) => this.errorMsg.set(getErrorMessage(err, 'Could not load organ functions.')),
    });
  }

  onAssignOrganFunction(): void {
    const raw = this.organFunctionForm.getRawValue();
    if (!raw.organId || !raw.organImpairmentLevelId) return;

    this.assigningOrganFunction.set(true);
    this.api
      .assignOrganFunction(this.id, {
        organId: raw.organId,
        organImpairmentLevelId: raw.organImpairmentLevelId,
      })
      .subscribe({
        next: () => {
          this.assigningOrganFunction.set(false);
          this.organFunctionForm.reset({ organId: '', organImpairmentLevelId: '' });
          this.loadOrganFunctions();
        },
        error: (err) => {
          this.assigningOrganFunction.set(false);
          this.errorMsg.set(getErrorMessage(err, 'Could not record organ function.'));
        },
      });
  }

  onRemoveOrganFunction(entry: CustomerOrganFunction): void {
    this.api.removeOrganFunction(this.id, entry.id).subscribe({
      next: () => this.loadOrganFunctions(),
      error: (err) => this.errorMsg.set(getErrorMessage(err, 'Could not remove organ function.')),
    });
  }

  // --- Relatives (a relative is just another Customer, linked via api/CustomerRelative) ---

  protected readonly relatives = signal<CustomerRelative[]>([]);
  protected readonly relativesErrorMsg = signal<string | null>(null);
  protected readonly addingRelative = signal(false);
  protected readonly pendingRelative = signal<CustomerPickResult | null>(null);

  // The current customer, plus anyone already linked, shouldn't show up as pickable.
  protected readonly relativeExcludeIds = computed(() => [
    this.id,
    ...this.relatives().map((r) => r.relativeId),
  ]);

  private loadRelatives(): void {
    this.api.getRelatives(this.id).subscribe({
      next: (list) => this.relatives.set(list),
      error: (err) => this.errorMsg.set(getErrorMessage(err, 'Could not load relatives.')),
    });
  }

  onRelativeSelectionChange(selection: CustomerPickResult | null): void {
    this.pendingRelative.set(selection);
    if (selection) {
      this.relativesErrorMsg.set(null);
    }
  }

  onAddRelative(): void {
    const selection = this.pendingRelative();
    if (!selection) {
      this.relativesErrorMsg.set('Search for and select a customer first.');
      return;
    }

    this.addingRelative.set(true);
    this.api
      .addRelative({
        customerId: this.id,
        relativeId: selection.customerId,
        hasAccessToRelative: true,
      })
      .subscribe({
        next: (res) => {
          this.addingRelative.set(false);
          if (!res.success) {
            this.relativesErrorMsg.set(res.message || 'Could not add relative.');
            return;
          }
          this.pendingRelative.set(null);
          this.loadRelatives();
          this.toast.show(`${selection.name} added as a relative.`, 'success');
        },
        error: (err) => {
          this.addingRelative.set(false);
          this.relativesErrorMsg.set(getErrorMessage(err, 'Could not add relative.'));
        },
      });
  }

  onRemoveRelative(entry: CustomerRelative): void {
    if (!confirm(`Remove ${entry.relativeName} as a relative?`)) return;

    this.api.removeRelative(entry.id).subscribe({
      next: () => this.loadRelatives(),
      error: (err) => this.errorMsg.set(getErrorMessage(err, 'Could not remove relative.')),
    });
  }
}
