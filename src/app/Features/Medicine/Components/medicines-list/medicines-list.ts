import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { MedicinesApiService } from '../../Services/medicines-api.service';
import { Medicine, MedicineStats } from '../../Models/medicine.model';
import { getErrorMessage } from '../../../../Shared/utils/get-error-message';
import { AddMedicineDialogComponent } from '../add-medicine-dialog/add-medicine-dialog';


@Component({
  selector: 'app-medicines-list',
  standalone: true,
  imports: [CommonModule, RouterLink, AddMedicineDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './medicines-list.html',
})
export class MedicinesListComponent {
  private readonly api = inject(MedicinesApiService);

  protected readonly search = signal('');
  protected readonly showInactive = signal(false);
  protected readonly loading = signal(false);
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
          this.errorMsg.set(getErrorMessage(err, 'Could not load medicines.'));
          return of<Medicine[]>([]);
        }),
      ),
    ),
  );
  protected readonly medicines = toSignal(this.medicines$, { initialValue: [] as Medicine[] });

  private readonly stats$ = this.refresh$.pipe(
    switchMap(() => this.api.getStats().pipe(catchError(() => of(null as MedicineStats | null)))),
  );
  protected readonly stats = toSignal(this.stats$, { initialValue: null as MedicineStats | null });

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
        return { label: 'Low', classes: 'bg-warning-soft text-warning' };
      case 'Out':
        return { label: 'Out', classes: 'bg-destructive-soft text-destructive' };
      default:
        return { label: 'In Stock', classes: 'bg-success-soft text-success' };
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

onToggleMenu(id: string, event: Event): void {
  event.stopPropagation();
  this.openMenuId.update((current) => (current === id ? null : id));
}

@HostListener('document:click')
closeMenu(): void {
  this.openMenuId.set(null);
}

onEdit(med: Medicine): void {
  this.openMenuId.set(null);
  // TODO: open edit dialog/route — tell me how you want to handle this
}

onToggleStatus(med: Medicine): void {
  this.openMenuId.set(null);
  this.api.toggleStatus(med.id).subscribe({   // was med.pharmacyMedicineId — FIXED
    next: () => this.onRefresh(),
    error: (err) => this.errorMsg.set(getErrorMessage(err, 'Could not update status.')),
  });
}

onDelete(med: Medicine): void {
  this.openMenuId.set(null);
  if (!confirm(`Delete "${med.tradeNameEn}"?`)) return;
  this.api.delete(med.id).subscribe({   // was med.pharmacyMedicineId — FIXED
    next: () => this.onRefresh(),
    error: (err) => this.errorMsg.set(getErrorMessage(err, 'Could not delete medicine.')),
  });
}
}