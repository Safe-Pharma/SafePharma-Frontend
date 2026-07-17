import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { CustomersApiService } from '../../Services/customers-api.service';
import { Customer, CustomerStats } from '../../Models/customer.model';
import { getErrorMessage } from '../../../../Shared/utils/get-error-message';
import { AuthSessionService } from '../../../../Core/Services/auth-session.service';
import { AddEditCustomerDialogComponent } from '../add-edit-customer-dialog/add-edit-customer-dialog';

@Component({
  selector: 'app-customers-list',
  standalone: true,
  imports: [CommonModule, RouterLink, AddEditCustomerDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customers-list.html',
})
export class CustomersListComponent {
  private readonly api = inject(CustomersApiService);
  private readonly auth = inject(AuthSessionService);

  protected readonly isOwner = computed(() => this.auth.user()?.role === 'Owner');

  protected readonly search = signal('');
  protected readonly loading = signal(false);
  protected readonly errorMsg = signal<string | null>(null);
  private readonly refreshTick = signal(0);

  private readonly search$ = toObservable(this.search).pipe(debounceTime(300), distinctUntilChanged());
  private readonly refresh$ = toObservable(this.refreshTick);

  private readonly customers$ = combineLatest([this.search$, this.refresh$]).pipe(
    tap(() => {
      this.loading.set(true);
      this.errorMsg.set(null);
    }),
    switchMap(([search]) =>
      this.api.getAll(search || undefined).pipe(
        tap(() => this.loading.set(false)),
        catchError((err) => {
          this.loading.set(false);
          this.errorMsg.set(getErrorMessage(err, 'Could not load customers.'));
          return of<Customer[]>([]);
        }),
      ),
    ),
  );
  protected readonly customers = toSignal(this.customers$, { initialValue: [] as Customer[] });

  private readonly stats$ = this.refresh$.pipe(
    switchMap(() => this.api.getStats().pipe(catchError(() => of(null as CustomerStats | null)))),
  );
  protected readonly stats = toSignal(this.stats$, { initialValue: null as CustomerStats | null });

  onSearchInput(value: string): void {
    this.search.set(value);
  }

  onRefresh(): void {
    this.refreshTick.update((v) => v + 1);
  }

  statusBadge(status: Customer['status']): { label: string; classes: string } {
    return status === 'Active'
      ? { label: 'Active', classes: 'bg-success-soft text-success' }
      : { label: 'Inactive', classes: 'bg-muted text-muted-foreground' };
  }

  // --- Add / edit dialog (same component, different mode) ---

  protected readonly showAddDialog = signal(false);
  protected readonly editingCustomerId = signal<string | null>(null);

  protected readonly editingCustomer = computed(() => {
    const id = this.editingCustomerId();
    return id ? this.customers().find((c) => c.id === id) ?? null : null;
  });

  onOpenAddDialog(): void {
    this.showAddDialog.set(true);
  }

  onCloseAddDialog(): void {
    this.showAddDialog.set(false);
    this.editingCustomerId.set(null);
  }

  onCustomerCreated(): void {
    this.showAddDialog.set(false);
    this.editingCustomerId.set(null);
    this.onRefresh();
  }

  onOpenEditDialog(customer: Customer): void {
    this.openMenuId.set(null);
    this.editingCustomerId.set(customer.id);
    this.showAddDialog.set(true);
  }

  // --- Row actions menu ---

  protected readonly openMenuId = signal<string | null>(null);

  onToggleMenu(id: string): void {
    this.openMenuId.update((current) => (current === id ? null : id));
  }

  onToggleStatus(customer: Customer): void {
    this.openMenuId.set(null);
    this.api.toggleStatus(customer.id).subscribe({
      next: () => this.onRefresh(),
      error: (err) => this.errorMsg.set(getErrorMessage(err, 'Could not update status.')),
    });
  }

  onDelete(customer: Customer): void {
    this.openMenuId.set(null);
    if (!confirm(`Delete "${customer.name}"? This removes them and their full medicine history everywhere.`)) return;
    this.api.delete(customer.id).subscribe({
      next: () => this.onRefresh(),
      error: (err) => this.errorMsg.set(getErrorMessage(err, 'Could not delete customer.')),
    });
  }
}