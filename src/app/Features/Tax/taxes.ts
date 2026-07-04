import { Component, computed, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { Tax, TaxCreateDto, TaxStatus, TaxUpdateDto } from './Models/tax';
import { TaxesService } from './Services/tax';

interface TaxFormModel {
  name: string;
  rate: number;
  status: TaxStatus;
}

@Component({
  selector: 'app-taxes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './taxes.html',
})
export class Taxes {
  search = signal('');
  private refreshTick = signal(0);

  loading = signal(false);
  errorMsg = signal<string | null>(null);

  private search$ = toObservable(this.search).pipe(
    debounceTime(300),
    distinctUntilChanged()
  );
  private refresh$ = toObservable(this.refreshTick);

  // ---- taxes list: "listens" to both search changes and refresh ticks ----
  private taxes$ = combineLatest([this.search$, this.refresh$]).pipe(
    tap(() => {
      this.loading.set(true);
      this.errorMsg.set(null);
    }),
    switchMap(([search]) =>
      this.taxesService.getAll(search || undefined).pipe(
        tap(() => this.loading.set(false)),
        catchError(() => {
          this.loading.set(false);
          this.errorMsg.set('An error occurred while loading taxes.');
          return of<Tax[]>([]);
        })
      )
    )
  );
  taxes = toSignal(this.taxes$, { initialValue: [] as Tax[] });

  // ---- stats: only needs to "listen" to refresh ticks ----
  private stats$ = this.refresh$.pipe(
    switchMap(() =>
      this.taxesService.getStats().pipe(catchError(() => of(null)))
    )
  );
  stats = toSignal(this.stats$, { initialValue: null });

  activeCount = computed(() => this.stats()?.active ?? 0);

  // ---- Dropdown menu (the "..." actions per row) ----
  openMenuId = signal<string | null>(null);

  // ---- Create / Edit modal ----
  showFormModal = signal(false);
  editingTax = signal<Tax | null>(null);
  submitting = signal(false);
  formError = signal<string | null>(null);
  formModel: TaxFormModel = { name: '', rate: 0, status: 'Active' };

  // ---- Delete confirm modal ----
  confirmDeleteTax = signal<Tax | null>(null);
  deleting = signal(false);

  constructor(private taxesService: TaxesService) {}

  /** Triggers taxes$/stats$ to re-run without any manual subscribe/set dance. */
  private refresh(): void {
    this.refreshTick.update((v) => v + 1);
  }

  onSearchInput(value: string): void {
    this.search.set(value);
  }

  // ---- Dropdown menu ----
  toggleMenu(id: string): void {
    this.openMenuId.set(this.openMenuId() === id ? null : id);
  }

  closeMenu(): void {
    this.openMenuId.set(null);
  }

  // ---- Create / Edit modal ----
  openCreateModal(): void {
    this.editingTax.set(null);
    this.formModel = { name: '', rate: 0, status: 'Active' };
    this.formError.set(null);
    this.showFormModal.set(true);
  }

  openEditModal(tax: Tax): void {
    this.closeMenu();
    this.editingTax.set(tax);
    this.formModel = { name: tax.name, rate: tax.rate, status: tax.status };
    this.formError.set(null);
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
  }

  submitForm(): void {
    const name = this.formModel.name.trim();
    const rate = Number(this.formModel.rate);

    if (!name || Number.isNaN(rate) || rate < 0 || rate > 100) {
      this.formError.set('Please enter a valid name and a tax rate between 0 and 100.');
      return;
    }

    this.submitting.set(true);
    this.formError.set(null);

    const editing = this.editingTax();
    const dto: TaxCreateDto | TaxUpdateDto = { name, rate, status: this.formModel.status };

    const request$ = editing
      ? this.taxesService.update(editing.id, dto)
      : this.taxesService.create(dto);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.showFormModal.set(false);
        this.refresh();
      },
      error: (err) => {
        this.submitting.set(false);
        this.formError.set(
          err?.status === 409
            ? 'A tax with this name already exists.'
      : 'An error occurred while saving. Please try again.'
        );
      },
    });
  }

  // ---- Activate / Deactivate ----
  toggleStatus(tax: Tax): void {
    this.closeMenu();
    this.taxesService.toggleStatus(tax.id).subscribe({
      next: () => this.refresh(),
      error: () => this.errorMsg.set('An error occurred while changing the tax status.'),
    });
  }

  // ---- Delete ----
  askDelete(tax: Tax): void {
    this.closeMenu();
    this.confirmDeleteTax.set(tax);
  }

  cancelDelete(): void {
    this.confirmDeleteTax.set(null);
  }

  confirmDelete(): void {
    const tax = this.confirmDeleteTax();
    if (!tax) return;

    this.deleting.set(true);
    this.taxesService.delete(tax.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmDeleteTax.set(null);
        this.refresh();
      },
      error: () => {
        this.deleting.set(false);
        this.errorMsg.set('An error occurred while deleting the tax.');
      },
    });
  }
}
