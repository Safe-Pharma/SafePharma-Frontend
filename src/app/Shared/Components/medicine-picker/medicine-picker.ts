import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { MedicinesApiService } from '../../../Features/Medicine/Services/medicines-api.service';
import { GlobalMedicineSearchResult } from '../../../Features/Medicine/Models/medicine.model';
import { Spinner } from '../spinner/spinner';

// medicineId set   -> picked from the global catalog (label = trade name)
// medicineId null  -> typed manually, not found in the catalog
//                     (label = trade/common name, scientificName = its scientific name — both required)
export interface MedicineSelection {
  medicineId: string | null;
  label: string;
  scientificName?: string;
}

@Component({
  selector: 'app-medicine-picker',
  standalone: true,
  imports: [CommonModule, Spinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './medicine-picker.html',
})
export class MedicinePickerComponent {
  private readonly medicinesApi = inject(MedicinesApiService);

  // Emits the current selection (or null once cleared/still typing) — the consumer
  // just stores whatever comes out, same pattern as tag-picker's selectionChange.
  selectionChange = output<MedicineSelection | null>();

  protected readonly query = signal('');
  protected readonly showDropdown = signal(false);
  protected readonly searching = signal(false);
  protected readonly selected = signal<MedicineSelection | null>(null);
  protected readonly manualMode = signal(false);
  protected readonly manualTradeName = signal('');
  protected readonly manualScientificName = signal('');
  protected readonly manualTouched = signal(false);

  protected readonly manualValidationError = computed(() => {
    if (!this.manualMode() || !this.manualTouched()) return null;
    const name = this.manualTradeName().trim();
    const sci = this.manualScientificName().trim();
    if (!name || !sci) return 'Both the medicine name and scientific name are required.';
    return null;
  });

  private readonly query$ = toObservable(this.query).pipe(debounceTime(300), distinctUntilChanged());

  private readonly results$ = this.query$.pipe(
    switchMap((q) => {
      const trimmed = q.trim();
      if (trimmed.length < 2) return of<GlobalMedicineSearchResult[]>([]);

      this.searching.set(true);
      return this.medicinesApi.searchGlobal(trimmed).pipe(
        tap(() => this.searching.set(false)),
        catchError(() => {
          this.searching.set(false);
          return of<GlobalMedicineSearchResult[]>([]);
        }),
      );
    }),
  );
  protected readonly results = toSignal(this.results$, { initialValue: [] as GlobalMedicineSearchResult[] });

  protected readonly showNoResults = computed(
    () => !this.searching() && this.query().trim().length >= 2 && this.results().length === 0,
  );

  onQueryInput(value: string): void {
    this.query.set(value);
    this.showDropdown.set(true);
  }

  onFocus(): void {
    this.showDropdown.set(true);
  }

  onBlur(): void {
    setTimeout(() => this.showDropdown.set(false), 150);
  }

  onSelectResult(item: GlobalMedicineSearchResult): void {
    const selection: MedicineSelection = { medicineId: item.id, label: item.tradeNameEn };
    this.selected.set(selection);
    this.showDropdown.set(false);
    this.query.set('');
    this.selectionChange.emit(selection);
  }

  onEnableManual(): void {
    this.manualMode.set(true);
    this.showDropdown.set(false);
    this.query.set('');
  }

  onManualTradeNameInput(value: string): void {
    this.manualTradeName.set(value);
    this.manualTouched.set(true);
    this.emitManualSelection();
  }

  onManualScientificNameInput(value: string): void {
    this.manualScientificName.set(value);
    this.manualTouched.set(true);
    this.emitManualSelection();
  }

  // Both fields are required for a manual entry — only emit once both are filled,
  // so an incomplete manual entry can't be submitted by a consumer that just checks
  // "is there a selection".
  private emitManualSelection(): void {
    const name = this.manualTradeName().trim();
    const sci = this.manualScientificName().trim();
    this.selectionChange.emit(name && sci ? { medicineId: null, label: name, scientificName: sci } : null);
  }

  onSearchInstead(): void {
    this.manualMode.set(false);
    this.manualTradeName.set('');
    this.manualScientificName.set('');
    this.manualTouched.set(false);
    this.selected.set(null);
    this.selectionChange.emit(null);
  }

  onClearSelection(): void {
    this.selected.set(null);
    this.manualMode.set(false);
    this.manualTradeName.set('');
    this.manualScientificName.set('');
    this.manualTouched.set(false);
    this.selectionChange.emit(null);
  }

  // Called by a parent form on submit attempt — makes the inline error visible even
  // if the pharmacist clicked "Add" without ever touching the manual fields.
  markTouched(): void {
    if (this.manualMode()) {
      this.manualTouched.set(true);
    }
  }

  // True when manual mode is on but one of the two fields is still empty — a parent
  // form can check this before submitting to avoid silently dropping a half-typed entry.
  hasIncompleteManualEntry(): boolean {
    if (!this.manualMode()) return false;
    return !this.manualTradeName().trim() || !this.manualScientificName().trim();
  }
}
