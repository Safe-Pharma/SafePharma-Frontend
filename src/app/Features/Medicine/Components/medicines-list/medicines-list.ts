import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { MedicinesApiService } from '../../Services/medicines-api.service';
import { Medicine, MedicineStats } from '../../Models/medicine.model';
import { getErrorMessage } from '../../../../Shared/utils/get-error-message';
import { AddMedicineDialogComponent } from '../add-medicine-dialog/add-medicine-dialog';
import { EditPharmacyMedicineDialogComponent } from '../edit-pharmacy-medicine-dialog/edit-pharmacy-medicine-dialog';
import { EgpCurrencyPipe } from '../../../../Shared/Pipes/egp-currency.pipe';
import { I18nService } from '../../../../Core/Services/i18n.service';
import { PageHeaderComponent } from '../../../../Shared/Components/page-header/page-header';

@Component({
  selector: 'app-medicines-list',
  standalone: true,
  imports: [CommonModule, RouterLink, AddMedicineDialogComponent, EditPharmacyMedicineDialogComponent, EgpCurrencyPipe, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './medicines-list.html',
})
export class MedicinesListComponent implements AfterViewChecked {
  private readonly api = inject(MedicinesApiService);
  private readonly i18n = inject(I18nService);

  protected readonly search = signal('');
  protected readonly showInactive = signal(false);
  protected readonly loading = signal(true);
  protected readonly errorMsg = signal<string | null>(null);
  private readonly refreshTick = signal(0);

  private readonly search$ = toObservable(this.search).pipe(debounceTime(300), distinctUntilChanged());
  private readonly showInactive$ = toObservable(this.showInactive);
  private readonly refresh$ = toObservable(this.refreshTick);

  private readonly medicines$ = combineLatest([this.search$, this.showInactive$, this.refresh$]).pipe(
    tap(() => {
      this.loading.set(true);
      this.errorMsg.set(null);
    }),
    switchMap(([search, includeInactive]) =>
      this.api.getAll(search || undefined, undefined, includeInactive).pipe(
        tap(() => this.loading.set(false)),
        catchError((err) => {
          this.loading.set(false);
          this.errorMsg.set(getErrorMessage(err, this.text('medicine.errorLoad')));
          return of<Medicine[]>([]);
        }),
      ),
    ),
  );
  protected readonly medicines = toSignal(this.medicines$, { initialValue: [] as Medicine[] });

  displayName(medicine: Medicine): string {
    return this.i18n.lang() === 'ar' ? medicine.tradeNameAr || medicine.tradeNameEn : medicine.tradeNameEn || medicine.tradeNameAr;
  }

  private readonly stats$ = this.refresh$.pipe(
    switchMap(() => this.api.getStats().pipe(catchError(() => of(null as MedicineStats | null)))),
  );
  protected readonly stats = toSignal(this.stats$, { initialValue: null as MedicineStats | null });

  protected readonly editingMedicine = computed(() => {
    const id = this.editingMedicineId();
    return id ? this.medicines().find((m) => m.id === id) ?? null : null;
  });

  onSearchInput(value: string): void {
    this.search.set(value);
  }

  onToggleShowInactive(): void {
    this.showInactive.update((v) => !v);
  }

  onRefresh(): void {
    this.refreshTick.update((v) => v + 1);
  }

  statusBadge(status: Medicine['stockStatus']): { label: string; classes: string } {
    switch (status) {
      case 'Low':
        return { label: this.text('medicine.low'), classes: 'bg-warning-soft text-warning' };
      case 'Out':
        return { label: this.text('medicine.out'), classes: 'bg-destructive-soft text-destructive' };
      default:
        return { label: this.text('medicine.inStock'), classes: 'bg-success-soft text-success' };
    }
  }

  protected readonly showAddDialog = signal(false);

  onOpenAddDialog(): void {
    this.showAddDialog.set(true);
  }

  onCloseAddDialog(): void {
    this.showAddDialog.set(false);
  }

  onMedicineCreated(): void {
    this.onRefresh();
  }

  protected readonly openMenuId = signal<string | null>(null);
  protected readonly showEditDialog = signal(false);
  protected readonly editingMedicineId = signal<string | null>(null);

  onToggleStatus(med: Medicine): void {
    this.openMenuId.set(null);
    this.api.toggleStatus(med.id).subscribe({
      next: () => this.onRefresh(),
      error: (err) => this.errorMsg.set(getErrorMessage(err, this.text('medicine.updateStatusError'))),
    });
  }

  onDelete(med: Medicine): void {
    this.openMenuId.set(null);
    if (!confirm(this.text('medicine.deleteConfirm', { name: this.displayName(med) }))) return;
    this.api.delete(med.id).subscribe({
      next: () => this.onRefresh(),
      error: (err) => this.errorMsg.set(getErrorMessage(err, this.text('medicine.deleteError'))),
    });
  }

  // --- Menu positioning (measured, not guessed) ---

  @ViewChild('menuEl') menuEl?: ElementRef<HTMLDivElement>;
  private pendingBtnRect: DOMRect | null = null;

  menuPosition = signal<{ top: number; left: number } | null>(null);
  protected readonly menuVisible = signal(false);

  menuMedicine = computed(() => {
    const id = this.openMenuId();
    return id ? this.medicines().find((m) => m.id === id) ?? null : null;
  });

  onToggleMenu(id: string, event: MouseEvent): void {
    event.stopPropagation();
    if (this.openMenuId() === id) {
      this.closeMenu();
      return;
    }

    const btn = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.pendingBtnRect = btn;
    this.menuVisible.set(false);

    const menuWidth = 176; // w-44, used only for the provisional placement pre-measurement
    this.menuPosition.set({
      top: btn.bottom + 4,
      left: Math.max(8, Math.min(btn.right - menuWidth, window.innerWidth - menuWidth - 8)),
    });
    this.openMenuId.set(id);
  }

  ngAfterViewChecked(): void {
    if (this.openMenuId() && !this.menuVisible() && this.menuEl && this.pendingBtnRect) {
      const menuHeight = this.menuEl.nativeElement.offsetHeight;
      const menuWidth = this.menuEl.nativeElement.offsetWidth;
      const gap = 4;
      const btn = this.pendingBtnRect;

      const spaceBelow = window.innerHeight - btn.bottom;
      const openUpward = spaceBelow < menuHeight + gap;

      this.menuPosition.set({
        top: openUpward ? btn.top - menuHeight - gap : btn.bottom + gap,
        left: Math.max(8, Math.min(btn.right - menuWidth, window.innerWidth - menuWidth - 8)),
      });
      this.menuVisible.set(true);
    }
  }

  closeMenu(): void {
    this.openMenuId.set(null);
    this.menuPosition.set(null);
    this.menuVisible.set(false);
    this.pendingBtnRect = null;
  }

  // --- Edit dialog ---

  onEdit(med: Medicine): void {
    this.openMenuId.set(null);
    this.editingMedicineId.set(med.id);
    this.showEditDialog.set(true);
  }

  onEditDialogClosed(): void {
    this.showEditDialog.set(false);
    this.editingMedicineId.set(null);
  }

  onMedicineSaved(): void {
    this.showEditDialog.set(false);
    this.editingMedicineId.set(null);
    this.onRefresh();
  }

  text(key: string, params?: Record<string, string | number>): string {
    return this.i18n.text(key, params);
  }
}

export { MedicinesListComponent as MedicinesList };
