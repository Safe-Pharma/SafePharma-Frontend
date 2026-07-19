import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, concatMap, debounceTime, distinctUntilChanged, from, map, of, switchMap } from 'rxjs';
import { PosService } from './Services/pos-service';
import { PaymentModalComponent } from './Components/payment-modal/payment-modal';
import { Toast } from '../../../Shared/Toasts/toast';
import { getErrorMessage } from '../../../Shared/utils/get-error-message';
import { AuthSessionService } from '../../../Core/Services/auth-session.service';
import { TaxesService } from '../../Tax/Services/tax';
import { Tax } from '../../Tax/Models/tax';
import {
  Customer,
  EMPTY_GUID,
  MedicineSearchResult,
  PaymentMethodChoice,
  PaySaleDto,
  Sale,
  SaleItem,
} from './pos.models';

interface PosTab {
  tabId: string;
  sale: Sale;
  selectedCustomer: Customer | null;
}

type DiscountMode = 'amount' | 'percent';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [FormsModule, CommonModule, PaymentModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pos.html',
})
export class Pos implements OnInit {
  private readonly service = inject(PosService);
  private readonly taxesApi = inject(TaxesService);
  private readonly toast = inject(Toast);
  protected readonly auth = inject(AuthSessionService);

  // ---- tabs ----
  protected readonly tabs = signal<PosTab[]>([]);
  protected readonly activeTabId = signal<string>('');
  protected readonly activeTab = computed(
    () => this.tabs().find((t) => t.tabId === this.activeTabId()) ?? null,
  );
  protected readonly sale = computed(() => this.activeTab()?.sale ?? null);
  protected readonly selectedCustomer = computed(() => this.activeTab()?.selectedCustomer ?? null);

  // ---- product search ----
  protected readonly query = signal('');
  protected readonly searchOpen = signal(false);
  protected readonly searching = signal(false);
  protected readonly searchError = signal<string | null>(null);
  private readonly query$ = toObservable(this.query).pipe(debounceTime(300), distinctUntilChanged());
  private readonly results$ = this.query$.pipe(
    switchMap((q) => {
      const trimmed = q.trim();
      if (trimmed.length < 2) {
        this.searchError.set(null);
        this.searching.set(false);
        return of<MedicineSearchResult[]>([]);
      }
      this.searching.set(true);
      return this.service.searchMedicines(trimmed).pipe(
        map((res) => {
          this.searching.set(false);
          this.searchError.set(null);
          return res.data?.items ?? [];
        }),
        catchError((err) => {
          this.searching.set(false);
          this.searchError.set(getErrorMessage(err, 'Could not search products.'));
          return of<MedicineSearchResult[]>([]);
        }),
      );
    }),
  );
  protected readonly searchResults = toSignal(this.results$, {
    initialValue: [] as MedicineSearchResult[],
  });
  protected readonly showNoResults = computed(
    () =>
      this.query().trim().length >= 2 &&
      !this.searching() &&
      this.searchResults().length === 0 &&
      !this.searchError(),
  );

  // ---- customer picker (sale-level) ----
  protected readonly customers = signal<Customer[]>([]);
  protected readonly showCustomerDropdown = signal(false);

  // ---- per-line customer picker ----
  protected readonly openItemCustomerPickerId = signal<string | null>(null);

  // ---- payment modal ----
  protected readonly showPaymentModal = signal(false);
  protected readonly paymentMethodChoice = signal<PaymentMethodChoice>('Cash');
  protected readonly payingInProgress = signal(false);

  // ---- sale-level discount editor (amount or percent) ----
  protected readonly showDiscountEditor = signal(false);
  protected readonly discountMode = signal<DiscountMode>('amount');
  protected readonly discountInput = signal(0);
  protected readonly savingDiscount = signal(false);

  // ---- sale-level tax editor (pick a configured tax) ----
  protected readonly taxes = signal<Tax[]>([]);
  protected readonly showTaxEditor = signal(false);
  protected readonly taxInput = signal('');
  protected readonly savingTax = signal(false);

  // ---- per-row discount mode + tax selection (UI-only state, backend just stores dollars) ----
  protected readonly rowDiscountMode = signal<Record<string, DiscountMode>>({});
  protected readonly rowTaxSelection = signal<Record<string, string>>({});

  ngOnInit(): void {
    this.openNewTab();
    this.loadCustomers();
    this.taxesApi.getAll().subscribe({
      next: (list) => this.taxes.set(list.filter((t) => t.status === 'Active')),
      error: () => {},
    });
  }

  // ================= click-outside-to-close =================

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showCustomerDropdown.set(false);
    this.openItemCustomerPickerId.set(null);
    this.showDiscountEditor.set(false);
    this.showTaxEditor.set(false);
    this.searchOpen.set(false);
  }

  /** Stops a click inside an open panel/dropdown from bubbling to the
   *  document listener above, which would otherwise close it immediately. */
  stop(event: Event): void {
    event.stopPropagation();
  }

  // ================= tabs =================

  openNewTab(): void {
    this.service.createDraftSale().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const tab: PosTab = { tabId: res.data.id, sale: res.data, selectedCustomer: null };
          this.tabs.update((list) => [...list, tab]);
          this.activeTabId.set(tab.tabId);
        } else {
          this.toast.show(res.message || 'Could not start a new sale.', 'error');
        }
      },
      error: (err) => this.toast.show(getErrorMessage(err, 'Could not start a new sale.'), 'error'),
    });
  }

  switchTab(tabId: string): void {
    this.activeTabId.set(tabId);
  }

  closeTab(tabId: string, event: Event): void {
    event.stopPropagation();
    const tab = this.tabs().find((t) => t.tabId === tabId);
    if (!tab) return;

    if (tab.sale.status !== 'Open') {
      this.removeTabLocally(tabId);
      return;
    }
    if (
      tab.sale.items.length > 0 &&
      !confirm(`Close ${tab.sale.invoiceNumber}? This will cancel the draft sale.`)
    ) {
      return;
    }

    this.service.cancelSale(tab.tabId).subscribe({
      next: () => this.removeTabLocally(tabId),
      error: (err) => this.toast.show(getErrorMessage(err, 'Could not close this tab.'), 'error'),
    });
  }

  /** Removes a tab from local state only (assumes the backend sale is already
   *  in its final state — cancelled or completed). Opens a fresh tab if none remain. */
  private removeTabLocally(tabId: string): void {
    const remaining = this.tabs().filter((t) => t.tabId !== tabId);
    this.tabs.set(remaining);
    if (this.activeTabId() === tabId) {
      if (remaining.length > 0) {
        this.activeTabId.set(remaining[remaining.length - 1].tabId);
      } else {
        this.openNewTab();
      }
    }
  }

  /** Replace the active tab's sale snapshot with a fresh one from the API. */
  private patchActiveSale(updated: Sale): void {
    const id = this.activeTabId();
    this.tabs.update((list) => list.map((t) => (t.tabId === id ? { ...t, sale: updated } : t)));
  }

  private patchActiveCustomer(customer: Customer | null): void {
    const id = this.activeTabId();
    this.tabs.update((list) =>
      list.map((t) => (t.tabId === id ? { ...t, selectedCustomer: customer } : t)),
    );
  }

  private loadCustomers(): void {
    this.service.getCustomers().subscribe({
      next: (res) => this.customers.set(res.data ?? []),
      error: (err) => this.toast.show(getErrorMessage(err, 'Could not load customers.'), 'error'),
    });
  }

  // ================= customer (sale-level) =================

  toggleCustomerDropdown(): void {
    this.showCustomerDropdown.update((v) => !v);
  }

  selectCustomer(customer: Customer | null): void {
    this.showCustomerDropdown.set(false);
    const currentSale = this.sale();
    if (!currentSale) return;

    this.patchActiveCustomer(customer);
    this.service
      .setSaleCustomer(currentSale.id, { customerId: customer ? customer.id : EMPTY_GUID })
      .subscribe({
        next: (res) => {
          if (res.success && res.data) this.patchActiveSale(res.data);
        },
        error: (err) => this.toast.show(getErrorMessage(err, 'Could not set customer.'), 'error'),
      });
  }

  // ================= product search =================

  onQueryInput(value: string): void {
    this.query.set(value);
    this.searchOpen.set(true);
  }

  onSearchFocus(): void {
    if (this.query().trim().length >= 2) this.searchOpen.set(true);
  }

  addToCart(item: MedicineSearchResult): void {
    const currentSale = this.sale();
    if (!currentSale) return;

    const customer = this.selectedCustomer();
    this.service
      .addItemToSale(currentSale.id, {
        pharmacyMedicineId: item.pharmacyMedicineId,
        customerId: customer ? customer.id : undefined,
        quantity: 1,
        discount: 0,
        taxAmount: 0,
      })
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.patchActiveSale(res.data);
            this.query.set('');
            this.searchOpen.set(false);
          } else {
            this.toast.show(res.message || 'Could not add item.', 'error');
          }
        },
        error: (err) => this.toast.show(getErrorMessage(err, 'Could not add item to sale.'), 'error'),
      });
  }

  /** Enter key in the search box = barcode scanner behavior: if there's exactly
   *  one match, add it straight to the cart without another click. */
  onSearchEnter(): void {
    const results = this.searchResults();
    if (results.length === 1) {
      this.addToCart(results[0]);
    } else if (results.length === 0) {
      this.toast.show('No matching product found.', 'error');
    }
  }

  // ================= cart line actions =================

  increaseQuantity(item: SaleItem): void {
    this.updateItem(item, { quantity: item.quantity + 1 });
  }

  decreaseQuantity(item: SaleItem): void {
    if (item.quantity <= 1) return;
    this.updateItem(item, { quantity: item.quantity - 1 });
  }

  private updateItem(
    item: SaleItem,
    changes: Partial<Pick<SaleItem, 'quantity' | 'discount' | 'taxAmount'>>,
  ): void {
    const currentSale = this.sale();
    if (!currentSale) return;

    this.service
      .updateSaleItem(currentSale.id, item.id, {
        customerId: item.customerId ?? undefined,
        quantity: changes.quantity ?? item.quantity,
        discount: changes.discount ?? item.discount,
        taxAmount: changes.taxAmount ?? item.taxAmount,
      })
      .subscribe({
        next: (res) => {
          if (res.success && res.data) this.patchActiveSale(res.data);
          else this.toast.show(res.message || 'Could not update item.', 'error');
        },
        error: (err) => this.toast.show(getErrorMessage(err, 'Could not update item.'), 'error'),
      });
  }

  removeItem(item: SaleItem): void {
    const currentSale = this.sale();
    if (!currentSale) return;

    this.service.removeSaleItem(currentSale.id, item.id).subscribe({
      next: (res) => {
        if (res.success && res.data) this.patchActiveSale(res.data);
        else this.toast.show(res.message || 'Could not remove item.', 'error');
      },
      error: (err) => this.toast.show(getErrorMessage(err, 'Could not remove item.'), 'error'),
    });
  }

  toggleItemCustomerPicker(itemId: string): void {
    this.openItemCustomerPickerId.update((v) => (v === itemId ? null : itemId));
  }

  selectCartItemCustomer(item: SaleItem, customer: Customer | null): void {
    this.openItemCustomerPickerId.set(null);
    const currentSale = this.sale();
    if (!currentSale) return;

    this.service
      .updateSaleItem(currentSale.id, item.id, {
        customerId: customer ? customer.id : undefined,
        quantity: item.quantity,
        discount: item.discount,
        taxAmount: item.taxAmount,
      })
      .subscribe({
        next: (res) => {
          if (res.success && res.data) this.patchActiveSale(res.data);
        },
        error: (err) => this.toast.show(getErrorMessage(err, 'Could not set customer.'), 'error'),
      });
  }

  // ================= per-row discount (amount or percent, always sent as $) =================

  getRowDiscountMode(itemId: string): DiscountMode {
    return this.rowDiscountMode()[itemId] ?? 'amount';
  }

  setRowDiscountMode(item: SaleItem, mode: DiscountMode): void {
    this.rowDiscountMode.update((m) => ({ ...m, [item.id]: mode }));
  }

  /** What to show in the row's discount input for its current mode. */
  getRowDiscountDisplay(item: SaleItem): number {
    const base = item.unitPrice * item.quantity;
    if (this.getRowDiscountMode(item.id) === 'percent') {
      return base > 0 ? Math.round((item.discount / base) * 10000) / 100 : 0;
    }
    return item.discount;
  }

  onRowDiscountInput(item: SaleItem, rawValue: number): void {
    const base = item.unitPrice * item.quantity;
    const mode = this.getRowDiscountMode(item.id);
    const value = Math.max(0, rawValue || 0);
    const dollarValue =
      mode === 'percent' ? Math.round(base * value) / 100 : value;
    this.updateItem(item, { discount: Math.min(dollarValue, base) });
  }

  // ================= per-row tax (select a configured tax) =================

  getRowTaxSelection(itemId: string): string {
    return this.rowTaxSelection()[itemId] ?? '';
  }

  onRowTaxSelect(item: SaleItem, taxId: string): void {
    this.rowTaxSelection.update((m) => ({ ...m, [item.id]: taxId }));
    const tax = this.taxes().find((t) => t.id === taxId);
    const base = item.unitPrice * item.quantity;
    const amount = tax ? Math.round(base * tax.rate) / 100 : 0;
    this.updateItem(item, { taxAmount: amount });
  }

  // ================= sale-level discount =================

  openDiscountEditor(): void {
    const currentSale = this.sale();
    if (!currentSale) return;
    this.discountMode.set('amount');
    this.discountInput.set(currentSale.discount);
    this.showTaxEditor.set(false);
    this.showDiscountEditor.set(true);
  }

  setDiscountMode(mode: DiscountMode): void {
    const currentSale = this.sale();
    if (!currentSale) return;
    // convert the currently displayed number so switching modes doesn't silently change the value
    const currentDollar =
      this.discountMode() === 'percent'
        ? Math.round(currentSale.subTotal * this.discountInput()) / 100
        : this.discountInput();
    this.discountMode.set(mode);
    this.discountInput.set(
      mode === 'percent'
        ? currentSale.subTotal > 0
          ? Math.round((currentDollar / currentSale.subTotal) * 10000) / 100
          : 0
        : currentDollar,
    );
  }

  closeDiscountEditor(): void {
    this.showDiscountEditor.set(false);
  }

  saveDiscount(): void {
    const currentSale = this.sale();
    if (!currentSale) return;

    const raw = this.discountInput() || 0;
    const dollarAmount =
      this.discountMode() === 'percent'
        ? Math.round(currentSale.subTotal * raw) / 100
        : raw;

    this.savingDiscount.set(true);
    this.service.applyDiscount(currentSale.id, { discountAmount: dollarAmount }).subscribe({
      next: (res) => {
        this.savingDiscount.set(false);
        if (res.success && res.data) {
          this.patchActiveSale(res.data);
          this.showDiscountEditor.set(false);
          this.toast.show('Discount applied.', 'success');
        } else {
          this.toast.show(res.message || 'Could not apply discount.', 'error');
        }
      },
      error: (err) => {
        this.savingDiscount.set(false);
        this.toast.show(getErrorMessage(err, 'Could not apply discount.'), 'error');
      },
    });
  }

  // ================= sale-level tax =================

  openTaxEditor(): void {
    if (!this.sale()) return;
    this.taxInput.set(this.taxes()[0]?.id ?? '');
    this.showDiscountEditor.set(false);
    this.showTaxEditor.set(true);
  }

  closeTaxEditor(): void {
    this.showTaxEditor.set(false);
  }

  saveTax(): void {
    const currentSale = this.sale();
    const taxId = this.taxInput();
    if (!currentSale || !taxId) return;

    this.savingTax.set(true);
    this.service.applyTax(currentSale.id, { taxId }).subscribe({
      next: (res) => {
        this.savingTax.set(false);
        if (res.success && res.data) {
          this.patchActiveSale(res.data);
          this.showTaxEditor.set(false);
          this.toast.show('Tax applied.', 'success');
        } else {
          this.toast.show(res.message || 'Could not apply tax.', 'error');
        }
      },
      error: (err) => {
        this.savingTax.set(false);
        this.toast.show(getErrorMessage(err, 'Could not apply tax.'), 'error');
      },
    });
  }

  // ================= cancel / clear =================

  cancelSale(): void {
    const currentSale = this.sale();
    if (!currentSale) return;
    if (currentSale.items.length > 0 && !confirm('Cancel this sale and clear the cart?')) return;

    this.service.cancelSale(currentSale.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.show('Sale cancelled.', 'success');
          this.removeTabLocally(this.activeTabId());
        } else {
          this.toast.show(res.message || 'Could not cancel sale.', 'error');
        }
      },
      error: (err) => this.toast.show(getErrorMessage(err, 'Could not cancel sale.'), 'error'),
    });
  }

  clearCart(): void {
    const currentSale = this.sale();
    if (!currentSale || currentSale.items.length === 0) return;
    if (!confirm('Remove all items from this cart?')) return;

    const itemIds = currentSale.items.map((i) => i.id);
    from(itemIds)
      .pipe(concatMap((itemId) => this.service.removeSaleItem(currentSale.id, itemId)))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) this.patchActiveSale(res.data);
        },
        error: (err) => this.toast.show(getErrorMessage(err, 'Could not clear the cart.'), 'error'),
        complete: () => this.toast.show('Cart cleared.', 'success'),
      });
  }

  // ================= payment =================

  openPaymentModal(method: PaymentMethodChoice): void {
    const currentSale = this.sale();
    if (!currentSale || currentSale.items.length === 0) return;
    this.paymentMethodChoice.set(method);
    this.showPaymentModal.set(true);
  }

  closePaymentModal(): void {
    if (this.payingInProgress()) return;
    this.showPaymentModal.set(false);
  }

  confirmPayment(dto: PaySaleDto): void {
    const currentSale = this.sale();
    if (!currentSale) return;

    this.payingInProgress.set(true);
    this.service.pay(currentSale.id, dto).subscribe({
      next: (res) => {
        this.payingInProgress.set(false);
        if (res.success && res.data) {
          this.showPaymentModal.set(false);
          this.toast.show(`Sale ${res.data.invoiceNumber} completed successfully.`, 'success');
          // Drop this finished tab and open a fresh draft in its place.
          const finishedTabId = this.activeTabId();
          this.tabs.update((list) => list.filter((t) => t.tabId !== finishedTabId));
          this.openNewTab();
        } else {
          this.toast.show(res.message || 'Payment could not be completed.', 'error');
        }
      },
      error: (err) => {
        this.payingInProgress.set(false);
        this.toast.show(getErrorMessage(err, 'Payment could not be completed.'), 'error');
      },
    });
  }
}