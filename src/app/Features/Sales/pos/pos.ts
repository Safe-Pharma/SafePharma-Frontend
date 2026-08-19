import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  catchError,
  concatMap,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  from,
  map,
  of,
  switchMap,
} from 'rxjs';
import { PosService } from './Services/pos-service';
import { PatientSafetyService } from './Services/patient-safety-service';
import { PaymentModalComponent } from './Components/payment-modal/payment-modal';
import { SafetyResultModalComponent } from './Components/safety-result-modal/safety-result-modal';
import { Toast } from '../../../Shared/Toasts/toast';
import { getErrorMessage } from '../../../Shared/utils/get-error-message';
import { AuthSessionService } from '../../../Core/Services/auth-session.service';
import { TaxesService } from '../../Tax/Services/tax';
import { AddEditCustomerDialogComponent } from '../../Customer/Components/add-edit-customer-dialog/add-edit-customer-dialog';
import { CustomersApiService } from '../../Customer/Services/customers-api.service';
import { Tax } from '../../Tax/Models/tax';
import {
  Customer,
  EMPTY_GUID,
  MedicineSearchResult,
  PaymentMethodChoice,
  PaySaleDto,
  Sale,
  SaleItem,
  SaleStatus,
} from './Model/pos.models';
import { PatientSafetyResult } from './Model/patient-safety.models';
import { RelativeDropDown } from './Components/relative-drop-down/relative-drop-down';

interface PosTab {
  tabId: string;
  sale: Sale;
  selectedCustomer: Customer | null;
  /** True once "Check all" has succeeded for the cart's current contents.
   *  Reset to false any time the cart/customer changes (see patchActiveSale). */
  safetyChecked: boolean;
  /** Per-line-item highest-severity outcome from the last check, for the small
   *  status dot on each row. Cleared together with safetyChecked. */
  itemCheckStatus: Record<string, 'ok' | 'warn' | 'danger'>;
}

type DiscountMode = 'amount' | 'percent';

/** localStorage key for restoring open POS tabs across page reloads. */
const POS_TABS_STORAGE_KEY = 'safepharma_pos_open_tabs';

interface StoredPosTabs {
  tabIds: string[];
  activeTabId: string;
}

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    PaymentModalComponent,
    SafetyResultModalComponent,
    RelativeDropDown,
    AddEditCustomerDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pos.html',
})
export class Pos implements OnInit {
  private readonly service = inject(PosService);
  private readonly taxesApi = inject(TaxesService);
  private readonly toast = inject(Toast);
  protected readonly auth = inject(AuthSessionService);
  private readonly customerApi = inject(CustomersApiService);
  private readonly safetyApi = inject(PatientSafetyService);

  // ---- tabs ----
  protected readonly tabs = signal<PosTab[]>([]);
  protected readonly activeTabId = signal<string>('');
  protected readonly activeTab = computed(
    () => this.tabs().find((t) => t.tabId === this.activeTabId()) ?? null,
  );
  protected readonly sale = computed(() => this.activeTab()?.sale ?? null);
  protected readonly selectedCustomer = computed(() => this.activeTab()?.selectedCustomer ?? null);
  protected readonly itemCheckStatus = computed(() => this.activeTab()?.itemCheckStatus ?? {});

  /** Keeps the tab bar in sync with localStorage so a page reload can restore it
   *  (requirement: tabs persist until the user explicitly closes them). */
  private readonly persistTabsEffect = effect(() => {
    const tabIds = this.tabs().map((t) => t.tabId);
    const active = this.activeTabId();
    if (tabIds.length === 0) {
      localStorage.removeItem(POS_TABS_STORAGE_KEY);
      return;
    }
    const payload: StoredPosTabs = { tabIds, activeTabId: active };
    localStorage.setItem(POS_TABS_STORAGE_KEY, JSON.stringify(payload));
  });

  // ---- AI patient safety check ----
  protected readonly showSafetyModal = signal(false);
  protected readonly safetyLoading = signal(false);
  protected readonly safetyError = signal<string | null>(null);
  protected readonly safetyResults = signal<PatientSafetyResult[]>([]);
  protected readonly safetyPatientNames = signal<Record<string, string>>({});
  protected readonly checkingAll = signal(false);
  protected readonly checkingItemId = signal<string | null>(null);

  /** Pay is blocked until "Check all" has run at least once for the current cart. */
  protected readonly canPay = computed(() => {
    const currentSale = this.sale();
    return !!currentSale && currentSale.items.length > 0 && !!this.activeTab()?.safetyChecked;
  });

  // ---- product search ----
  protected readonly query = signal('');
  protected readonly searchOpen = signal(false);
  protected readonly searching = signal(false);
  protected readonly searchError = signal<string | null>(null);
  private readonly query$ = toObservable(this.query).pipe(
    debounceTime(150),
    distinctUntilChanged(),
  );
  private readonly results$ = this.query$.pipe(
    switchMap((q) => {
      const trimmed = q.trim();
      if (trimmed.length < 1) {
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
      this.query().trim().length >= 1 &&
      !this.searching() &&
      this.searchResults().length === 0 &&
      !this.searchError(),
  );

  // ---- customer picker (sale-level) ----
  protected readonly customers = signal<Customer[]>([]);
  protected readonly showCustomerDropdown = signal(false);
  protected readonly showCustomerSearchModal = signal(false);
  protected readonly showCreateCustomerModal = signal(false);
  protected readonly customerSearchQuery = signal('');
  protected readonly customerSearchResults = signal<Customer[]>([]);
  protected readonly customerSearchLoading = signal(false);
  protected readonly relatives = signal<Array<{ relativeId: string; relativeName: string }>>([]);
  protected readonly excludedCustomerIds = signal<string[]>([]);

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
    this.restoreTabsOrOpenNew();
    this.loadCustomers();
    this.taxesApi.getAll().subscribe({
      next: (list) => this.taxes.set(list.filter((t) => t.status === 'Active')),
      error: () => {},
    });
  }

  /** Reopens whatever tabs were left open before the last reload (each tab is
   *  just a draft Sale id, so we re-fetch the live state from the backend).
   *  Falls back to a single new tab if nothing was stored or every stored
   *  sale turned out to be gone/finalized already. */
  private restoreTabsOrOpenNew(): void {
    const raw = localStorage.getItem(POS_TABS_STORAGE_KEY);
    const stored: StoredPosTabs | null = raw ? JSON.parse(raw) : null;

    if (!stored || stored.tabIds.length === 0) {
      this.openNewTab();
      return;
    }

    forkJoin(stored.tabIds.map((id) => this.service.getSaleById(id).pipe(catchError(() => of(null)))))
      .subscribe((responses) => {
        const restored: PosTab[] = [];
        responses.forEach((res) => {
          const openSale = res?.success && res.data && res.data.status === SaleStatus.Open ? res.data : null;
          if (!openSale) return;
          restored.push({
            tabId: openSale.id,
            sale: openSale,
            selectedCustomer: openSale.customerId
              ? { id: openSale.customerId, name: openSale.customerName, phone: '' }
              : null,
            safetyChecked: false,
            itemCheckStatus: {},
          });
        });

        if (restored.length === 0) {
          this.openNewTab();
          return;
        }

        this.tabs.set(restored);
        const stillActive = restored.find((t) => t.tabId === stored.activeTabId);
        this.activeTabId.set(stillActive ? stillActive.tabId : restored[0].tabId);
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
          const tab: PosTab = {
            tabId: res.data.id,
            sale: res.data,
            selectedCustomer: null,
            safetyChecked: false,
            itemCheckStatus: {},
          };
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
    this.syncExcludedCustomerIds(this.selectedCustomer());
  }

  closeTab(tabId: string, event: Event): void {
    event.stopPropagation();
    const tab = this.tabs().find((t) => t.tabId === tabId);
    if (!tab) return;

    if (tab.sale.status !== SaleStatus.Open) {
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

  /** Replace the active tab's sale snapshot with a fresh one from the API.
   *  Any cart-affecting change invalidates the previous safety check — the
   *  pharmacist must run "Check all" again before Pay unlocks. */
  private patchActiveSale(updated: Sale): void {
    const id = this.activeTabId();
    this.tabs.update((list) =>
      list.map((t) =>
        t.tabId === id
          ? { ...t, sale: updated, safetyChecked: false, itemCheckStatus: {} }
          : t,
      ),
    );
  }

  private patchActiveCustomer(customer: Customer | null): void {
    const id = this.activeTabId();
    this.tabs.update((list) =>
      list.map((t) => (t.tabId === id ? { ...t, selectedCustomer: customer } : t)),
    );
    this.updateExcludedCustomerIds(customer);
  }

  private updateExcludedCustomerIds(customer: Customer | null): void {
    this.syncExcludedCustomerIds(customer);
  }

  private syncExcludedCustomerIds(
    customer: Customer | null,
    relatives: Array<{ relativeId: string; relativeName?: string }> | null | undefined = [],
  ): void {
    const next = new Set<string>();

    if (customer?.id) {
      next.add(customer.id);
    }

    const relativeIds = (relatives ?? [])
      .map((relative) => relative.relativeId)
      .filter((id): id is string => Boolean(id));

    relativeIds.forEach((id) => next.add(id));

    this.excludedCustomerIds.set(Array.from(next));
    this.refreshCustomerSearchResults(this.customers());
  }

  private loadCustomers(): void {
    this.service.getAllCustomers().subscribe({
      next: (res) => {
        const list = res ?? [];
        this.customers.set(list);
        this.refreshCustomerSearchResults(list);
      },
      error: (err) => this.toast.show(getErrorMessage(err, 'Could not load customers.'), 'error'),
    });
  }

  private refreshCustomerSearchResults(source: Customer[]): void {
    const term = this.customerSearchQuery().trim().toLowerCase();
    const baseList = source.filter((customer) => Boolean(customer.id));
    const filteredByQuery = term
      ? baseList.filter((customer) => {
          const name = customer.name?.toLowerCase() ?? '';
          const phone = customer.phone?.toLowerCase() ?? '';
          return name.includes(term) || phone.includes(term);
        })
      : baseList;

    this.customerSearchResults.set(this.filterCustomerSearchResults(filteredByQuery));
  }

  private filterCustomerSearchResults(list: Customer[]): Customer[] {
    const excluded = new Set(this.excludedCustomerIds());
    return list.filter((customer) => !excluded.has(customer.id));
  }

  // ================= customer (sale-level) =================

  toggleCustomerDropdown(): void {
    const isOpen = this.showCustomerDropdown();
    this.showCustomerDropdown.set(!isOpen);

    if (!isOpen) {
      this.openItemCustomerPickerId.set(null);
      this.showCreateCustomerModal.set(false);
    }
  }

  openCustomerSearchModal(event?: Event): void {
    event?.stopPropagation();
    this.customerSearchQuery.set('');
    this.refreshCustomerSearchResults(this.customers());
    this.customerSearchLoading.set(false);
    this.showCustomerSearchModal.set(true);
  }

  closeCustomerSearchModal(): void {
    this.showCustomerSearchModal.set(false);
    this.customerSearchQuery.set('');
    this.customerSearchLoading.set(false);
  }

  onCustomerSearchInput(value: string): void {
    this.customerSearchQuery.set(value);
    const term = value.trim();

    if (!term) {
      this.refreshCustomerSearchResults(this.customers());
      this.customerSearchLoading.set(false);
      return;
    }

    this.customerSearchLoading.set(true);
    this.service.getAllCustomers(term).subscribe({
      next: (res) => {
        this.customerSearchResults.set(this.filterCustomerSearchResults(res ?? []));
        this.customerSearchLoading.set(false);
      },
      error: (err) => {
        this.customerSearchLoading.set(false);
        this.toast.show(getErrorMessage(err, 'Could not search customers.'), 'error');
      },
    });
  }

  openCreateCustomerModal(event?: Event): void {
    event?.stopPropagation();
    this.showCreateCustomerModal.set(true);
    this.showCustomerSearchModal.set(false);
  }

  closeCreateCustomerModal(): void {
    this.showCreateCustomerModal.set(false);
  }

  onCustomerCreated(): void {
    this.showCreateCustomerModal.set(false);
    this.showCustomerSearchModal.set(false);
    this.loadCustomers();
  }

  onRelativesLoaded(payload: {
    customerId: string;
    relatives: Array<{ relativeId: string; relativeName?: string }> | null | undefined;
  }): void {
    if (payload.customerId && this.selectedCustomer()?.id !== payload.customerId) {
      return;
    }

    this.relatives.set(
      (payload.relatives ?? [])
        .filter((relative) => Boolean(relative.relativeId))
        .map((relative) => ({
          relativeId: relative.relativeId,
          relativeName: relative.relativeName ?? 'Customer',
        })),
    );
    this.syncExcludedCustomerIds(this.selectedCustomer(), this.relatives());
  }

  selectCustomerFromModal(customer: Customer | null): void {
    this.closeCustomerSearchModal();

    if (!customer) {
      return;
    }

    const currentCustomer = this.selectedCustomer();
    const shouldAddRelative = Boolean(
      currentCustomer?.id && customer.id && currentCustomer.id !== customer.id,
    );

    if (!shouldAddRelative) {
      return;
    }

    this.customerApi
      .addRelative({
        customerId: currentCustomer!.id,
        relativeId: customer.id,
        hasAccessToRelative: true,
      })
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.relatives.update((current) => {
              if (current.some((relative) => relative.relativeId === customer.id)) {
                return current;
              }
              return [
                ...current,
                { relativeId: customer.id, relativeName: customer.name ?? 'Customer' },
              ];
            });
            this.syncExcludedCustomerIds(this.selectedCustomer(), this.relatives());
            this.toast.show(`${customer.name ?? 'Customer'} added as a relative.`, 'success');
          } else {
            this.toast.show(res.message || 'Could not add relative.', 'error');
          }
        },
        error: (err) => {
          this.toast.show(getErrorMessage(err, 'Could not add relative.'), 'error');
        },
      });
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
    if (this.query().trim().length >= 1) this.searchOpen.set(true);
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
        error: (err) =>
          this.toast.show(getErrorMessage(err, 'Could not add item to sale.'), 'error'),
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
    const dollarValue = mode === 'percent' ? Math.round(base * value) / 100 : value;
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
      this.discountMode() === 'percent' ? Math.round(currentSale.subTotal * raw) / 100 : raw;

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

  // ================= AI patient safety check =================

  /** Which customer a line item's safety check should run against: its own
   *  per-line customer if one was picked, otherwise the sale's customer. */
  private effectiveCustomerId(item: SaleItem): string | null {
    if (item.customerId && item.customerId !== EMPTY_GUID) return item.customerId;
    const saleCustomerId = this.sale()?.customerId;
    return saleCustomerId && saleCustomerId !== EMPTY_GUID ? saleCustomerId : null;
  }

  private toneFor(result: PatientSafetyResult): 'ok' | 'warn' | 'danger' {
    if (!result.checkSucceeded) return 'warn';
    if (result.overallDecision === 'Block') return 'danger';
    if (result.overallDecision === 'Warn') return 'warn';
    if (result.overallDecision === 'Approve') return 'ok';
    const weight = { Minor: 1, Moderate: 2, Major: 3 } as const;
    const worst = result.issues.reduce((max, i) => Math.max(max, weight[i.severity] ?? 0), 0);
    if (worst >= 3 || (result.riskScore ?? 0) >= 70) return 'danger';
    if (worst >= 1 || (result.riskScore ?? 0) >= 30) return 'warn';
    return 'ok';
  }

  private openSafetyResults(results: PatientSafetyResult[], names: Record<string, string>): void {
    this.safetyResults.set(results);
    this.safetyPatientNames.set(names);
    this.safetyError.set(null);
    this.safetyLoading.set(false);
    this.showSafetyModal.set(true);
  }

  closeSafetyModal(): void {
    if (this.safetyLoading()) return;
    this.showSafetyModal.set(false);
  }

  /** Per-line "Check" button — validates a single cart line against its own customer. */
  checkItem(item: SaleItem): void {
    const customerId = this.effectiveCustomerId(item);
    if (!customerId) {
      this.toast.show('Assign a customer to this item before checking it.', 'error');
      return;
    }

    this.checkingItemId.set(item.id);
    this.safetyLoading.set(true);
    this.showSafetyModal.set(true);

    this.safetyApi
      .check({
        patients: [
          {
            customerId,
            items: [{ pharmacyMedicineId: item.pharmacyMedicineId, saleItemId: item.id }],
          },
        ],
        language: 'en',
      })
      .subscribe({
        next: (res) => {
          this.checkingItemId.set(null);
          if (res.success && res.data) {
            const tone = res.data.results[0] ? this.toneFor(res.data.results[0]) : 'warn';
            const id = this.activeTabId();
            this.tabs.update((list) =>
              list.map((t) =>
                t.tabId === id
                  ? { ...t, itemCheckStatus: { ...t.itemCheckStatus, [item.id]: tone } }
                  : t,
              ),
            );
            this.openSafetyResults(res.data.results, { [customerId]: item.customerName || 'Customer' });
          } else {
            this.safetyLoading.set(false);
            this.safetyError.set(res.message || 'Could not complete the safety check.');
          }
        },
        error: (err) => {
          this.checkingItemId.set(null);
          this.safetyLoading.set(false);
          this.safetyError.set(getErrorMessage(err, 'Could not complete the safety check.'));
        },
      });
  }

  /** "Check all" — one call to the AI agent for the whole cart, grouped by each
   *  line's own customer (falling back to the sale's customer). Unlocks Pay
   *  once it succeeds. */
  checkAll(): void {
    const currentSale = this.sale();
    if (!currentSale || currentSale.items.length === 0) return;

    const groups = new Map<string, { customerId: string; items: SaleItem[] }>();
    let skipped = 0;
    for (const item of currentSale.items) {
      const customerId = this.effectiveCustomerId(item);
      if (!customerId) {
        skipped++;
        continue;
      }
      const group = groups.get(customerId) ?? { customerId, items: [] };
      group.items.push(item);
      groups.set(customerId, group);
    }

    if (groups.size === 0) {
      this.toast.show('Assign a customer before checking the cart.', 'error');
      return;
    }
    if (skipped > 0) {
      this.toast.show(`${skipped} item(s) without a customer were skipped.`, 'error');
    }

    const names: Record<string, string> = {};
    groups.forEach((g) => (names[g.customerId] = g.items[0].customerName || 'Customer'));

    this.checkingAll.set(true);
    this.safetyLoading.set(true);
    this.showSafetyModal.set(true);

    this.safetyApi
      .check({
        patients: Array.from(groups.values()).map((g) => ({
          customerId: g.customerId,
          items: g.items.map((i) => ({ pharmacyMedicineId: i.pharmacyMedicineId, saleItemId: i.id })),
        })),
        language: 'en',
      })
      .subscribe({
        next: (res) => {
          this.checkingAll.set(false);
          if (res.success && res.data) {
            const toneByCustomer = new Map<string, 'ok' | 'warn' | 'danger'>();
            res.data.results.forEach((r) => toneByCustomer.set(r.patientRef, this.toneFor(r)));

            const itemCheckStatus: Record<string, 'ok' | 'warn' | 'danger'> = {};
            groups.forEach((g) => {
              const tone = toneByCustomer.get(g.customerId) ?? 'warn';
              g.items.forEach((i) => (itemCheckStatus[i.id] = tone));
            });

            const id = this.activeTabId();
            this.tabs.update((list) =>
              list.map((t) =>
                t.tabId === id ? { ...t, safetyChecked: true, itemCheckStatus } : t,
              ),
            );
            this.openSafetyResults(res.data.results, names);
          } else {
            this.safetyLoading.set(false);
            this.safetyError.set(res.message || 'Could not complete the safety check.');
          }
        },
        error: (err) => {
          this.checkingAll.set(false);
          this.safetyLoading.set(false);
          this.safetyError.set(getErrorMessage(err, 'Could not complete the safety check.'));
        },
      });
  }

  // ================= payment =================

  openPaymentModal(method: PaymentMethodChoice): void {
    const currentSale = this.sale();
    if (!currentSale || currentSale.items.length === 0) return;
    if (!this.canPay()) {
      this.toast.show('Run "Check all" on the cart before taking payment.', 'error');
      return;
    }
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
  onRelativeSelected(relative: any) {
    console.log('Selected relative:', relative);
    // اعمل اللي انت عايزه بالبيانات دي
  }
}
