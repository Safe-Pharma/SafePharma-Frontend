import { AfterViewChecked, ChangeDetectionStrategy, Component, computed, ElementRef, inject, OnDestroy, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { CustomersApiService } from '../../Services/customers-api.service';
import { Customer, CustomerStats } from '../../Models/customer.model';
import { getErrorMessage } from '../../../../Shared/utils/get-error-message';
import { AuthSessionService } from '../../../../Core/Services/auth-session.service';
import { AddEditCustomerDialogComponent } from '../add-edit-customer-dialog/add-edit-customer-dialog';
import { EgpCurrencyPipe } from '../../../../Shared/Pipes/egp-currency.pipe';
import { I18nService } from '../../../../Core/Services/i18n.service';
import { PageHeaderComponent } from '../../../../Shared/Components/page-header/page-header';

@Component({
  selector: 'app-customers-list',
  standalone: true,
  imports: [CommonModule, RouterLink, AddEditCustomerDialogComponent, EgpCurrencyPipe, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customers-list.html',
})
export class CustomersListComponent implements AfterViewChecked, OnDestroy {
  private readonly api = inject(CustomersApiService);
  private readonly auth = inject(AuthSessionService);
  private readonly i18n = inject(I18nService);

  text(key: string, params?: Record<string, string | number>): string { return this.i18n.text(key, params); }

  protected readonly isOwner = computed(() => this.auth.user()?.role === 'Owner');

  protected readonly search = signal('');
  protected readonly loading = signal(true);
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
          this.errorMsg.set(getErrorMessage(err, this.text('customer.loadingError')));
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
      ? { label: this.text('customer.active'), classes: 'bg-success-soft text-success' }
      : { label: this.text('customer.inactive'), classes: 'bg-muted text-muted-foreground' };
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
    this.closeMenu();
    this.editingCustomerId.set(customer.id);
    this.showAddDialog.set(true);
  }

  // --- Row actions menu ---

  protected readonly openMenuId = signal<string | null>(null);
  protected readonly menuPosition = signal<{ top: number; left: number } | null>(null);
  protected readonly menuVisible = signal(false);
  protected readonly menuCustomer = computed(() => {
    const id = this.openMenuId();
    return id ? this.customers().find((customer) => customer.id === id) ?? null : null;
  });

  @ViewChild('menuEl') private menuEl?: ElementRef<HTMLDivElement>;
  private pendingButtonRect: DOMRect | null = null;
  private readonly closeMenuOnScroll = () => this.closeMenu();

  constructor() {
    document.addEventListener('scroll', this.closeMenuOnScroll, true);
  }

  ngOnDestroy(): void {
    document.removeEventListener('scroll', this.closeMenuOnScroll, true);
  }

  onToggleMenu(id: string, event: MouseEvent): void {
    event.stopPropagation();

    if (this.openMenuId() === id) {
      this.closeMenu();
      return;
    }

    this.pendingButtonRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.menuVisible.set(false);
    this.menuPosition.set({
      top: this.pendingButtonRect.bottom + 4,
      left: Math.max(8, Math.min(this.pendingButtonRect.right - 176, window.innerWidth - 176 - 8)),
    });
    this.openMenuId.set(id);
  }

  ngAfterViewChecked(): void {
    if (!this.openMenuId() || this.menuVisible() || !this.menuEl || !this.pendingButtonRect) return;

    const menuHeight = this.menuEl.nativeElement.offsetHeight;
    const menuWidth = this.menuEl.nativeElement.offsetWidth;
    const gap = 4;
    const button = this.pendingButtonRect;
    const openUpward = window.innerHeight - button.bottom < menuHeight + gap;

    this.menuPosition.set({
      top: openUpward
        ? Math.max(8, button.top - menuHeight - gap)
        : Math.min(button.bottom + gap, window.innerHeight - menuHeight - 8),
      left: Math.max(8, Math.min(button.right - menuWidth, window.innerWidth - menuWidth - 8)),
    });
    this.menuVisible.set(true);
  }

  closeMenu(): void {
    this.openMenuId.set(null);
    this.menuPosition.set(null);
    this.menuVisible.set(false);
    this.pendingButtonRect = null;
  }

  onToggleStatus(customer: Customer): void {
    this.openMenuId.set(null);
    this.api.toggleStatus(customer.id).subscribe({
      next: () => this.onRefresh(),
      error: (err) => this.errorMsg.set(getErrorMessage(err, this.text('customer.statusError'))),
    });
  }

  onDelete(customer: Customer): void {
    this.openMenuId.set(null);
    if (!confirm(this.text('customer.deleteConfirm', { name: customer.name }))) return;
    this.api.delete(customer.id).subscribe({
      next: () => this.onRefresh(),
      error: (err) => this.errorMsg.set(getErrorMessage(err, this.text('customer.deleteError'))),
    });
  }
}

export { CustomersListComponent as CustomersList };
