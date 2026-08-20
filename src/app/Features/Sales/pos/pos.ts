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
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { PosService } from './Services/pos-service';
import { PatientSafetyService } from './Services/patient-safety-service';
import { RelativesService } from './Services/relatives';
import { PaymentModalComponent } from './Components/payment-modal/payment-modal';
import { SafetyResultModalComponent } from './Components/safety-result-modal/safety-result-modal';
import { Toast } from '../../../Shared/Toasts/toast';
import { getErrorMessage } from '../../../Shared/utils/get-error-message';
import { AuthSessionService } from '../../../Core/Services/auth-session.service';
import { I18nService } from '../../../Core/Services/i18n.service';
import { POS_DICT } from './pos.i18n';
import { TaxesService } from '../../Tax/Services/tax';
import { AddEditCustomerDialogComponent } from '../../Customer/Components/add-edit-customer-dialog/add-edit-customer-dialog';
import { CustomersApiService } from '../../Customer/Services/customers-api.service';
import { Tax } from '../../Tax/Models/tax';
import {
  CheckoutDto,
  Customer,
  MedicineSearchResult,
  PaymentMethodChoice,
  PaySaleDto,
  RelativeListItem,
  Sale,
  SaleItem,
  SaleStatus,
} from './Model/pos.models';
import { PatientSafetyResult } from './Model/patient-safety.models';

/** One line of a cart that only exists in the browser — no PharmacyMedicine
 *  batch/price is "locked in" server-side until checkout; `unitPrice` here is
 *  just the last price we previewed via getAvailability(). */
interface LocalCartItem {
  /** Client-generated — used purely as a correlation id for the AI safety
   *  check (relatedDrugRefs) and for row identity in the UI. Means nothing
   *  to the backend, since this line has never been persisted. */
  id: string;
  pharmacyMedicineId: string;
  medicineName: string;
  customerId: string | null;
  customerName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxAmount: number;
}

interface PosTab {
  tabId: string;
  items: LocalCartItem[];
  selectedCustomer: Customer | null;
  discountAmount: number;
  taxId: string | null;
  /** True once "Check all" has succeeded for the cart's current contents.
   *  Reset to false any time the cart/customer changes (see updateActiveTab). */
  safetyChecked: boolean;
  /** Per-line-item highest-severity outcome from the last check, for the small
   *  status dot on each row. Cleared together with safetyChecked. */
  itemCheckStatus: Record<string, 'ok' | 'warn' | 'danger'>;
}

type DiscountMode = 'amount' | 'percent';

/** localStorage key the whole local cart lives under — the source of truth
 *  is the browser, not the database, until the pharmacist actually pays. */
const POS_TABS_STORAGE_KEY = 'safepharma_pos_local_tabs';

interface StoredPosTabs {
  tabs: PosTab[];
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
  private readonly relativesApi = inject(RelativesService);
  private readonly i18n = inject(I18nService);

  // ---- i18n (see Core/Services/i18n.service.ts + pos.i18n.ts) ----
  protected readonly lang = this.i18n.lang;
  protected readonly dir = this.i18n.dir;
  protected readonly t = (key: string, params?: Record<string, string | number>) =>
    this.i18n.t(POS_DICT, key, params);
  protected toggleLanguage(): void {
    this.i18n.toggle();
  }

  // ---- tabs (each one is a purely local cart until checkout) ----
  protected readonly tabs = signal<PosTab[]>([]);
  protected readonly activeTabId = signal<string>('');
  protected readonly activeTab = computed(
    () => this.tabs().find((t) => t.tabId === this.activeTabId()) ?? null,
  );

  /** A Sale-shaped read model built from the active tab's local cart, purely
   *  so the rest of this component/template can keep reading `sale()` like
   *  it always has. `id`/`invoiceNumber` are placeholders — nothing real
   *  exists until checkout() succeeds. */
  protected readonly sale = computed<Sale | null>(() => {
    const tab = this.activeTab();
    if (!tab) return null;
    return this.buildVirtualSale(tab);
  });
  protected readonly selectedCustomer = computed(() => this.activeTab()?.selectedCustomer ?? null);
  protected readonly itemCheckStatus = computed(() => this.activeTab()?.itemCheckStatus ?? {});

  /** Persists the whole cart (not just an id) to localStorage — a reload
   *  restores tabs directly from here, with no backend round trip, since
   *  nothing about an in-progress cart exists in the database yet. */
  private readonly persistTabsEffect = effect(() => {
    const tabs = this.tabs();
    if (tabs.length === 0) {
      localStorage.removeItem(POS_TABS_STORAGE_KEY);
      return;
    }
    const payload: StoredPosTabs = { tabs, activeTabId: this.activeTabId() };
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
  protected readonly excludedCustomerIds = signal<string[]>([]);

  // ---- relatives of the sale's customer — power the per-row "Relative" dropdown ----
  protected readonly relatives = signal<RelativeListItem[]>([]);

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
    this.i18n.loadFromServer();
    this.restoreTabsOrOpenNew();
    this.loadCustomers();
    this.loadRelativesForCustomer(this.selectedCustomer()?.id ?? null);
    this.taxesApi.getAll().subscribe({
      next: (list) => this.taxes.set(list.filter((t) => t.status === 'Active')),
      error: () => {},
    });
  }

  /** Reopens whatever tabs were left open before the last reload. Everything
   *  needed is already in localStorage — there is nothing to fetch from the
   *  backend, since an in-progress cart was never sent there in the first
   *  place. Falls back to a single new tab if nothing was stored. */
  private restoreTabsOrOpenNew(): void {
    const raw = localStorage.getItem(POS_TABS_STORAGE_KEY);
    const stored: StoredPosTabs | null = raw ? JSON.parse(raw) : null;

    if (!stored || stored.tabs.length === 0) {
      this.openNewTab();
      return;
    }

    this.tabs.set(stored.tabs);
    const stillActive = stored.tabs.find((t) => t.tabId === stored.activeTabId);
    this.activeTabId.set(stillActive ? stillActive.tabId : stored.tabs[0].tabId);
  }

  /** Builds the read-only Sale-shaped view the rest of the component/template
   *  works off of, from the active tab's local cart. */
  private buildVirtualSale(tab: PosTab): Sale {
    const items: SaleItem[] = tab.items.map((i) => ({
      id: i.id,
      pharmacyMedicineId: i.pharmacyMedicineId,
      medicineName: i.medicineName,
      customerId: i.customerId,
      customerName: i.customerName,
      batchId: '',
      batchNumber: '',
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount: i.discount,
      taxAmount: i.taxAmount,
      lineTotal: i.unitPrice * i.quantity - i.discount + i.taxAmount,
    }));

    const subTotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
    const taxRate = tab.taxId ? (this.taxes().find((t) => t.id === tab.taxId)?.rate ?? 0) : 0;
    const taxAmount = Math.round(subTotal * (taxRate / 100) * 100) / 100;
    const grandTotal = subTotal - tab.discountAmount + taxAmount;

    return {
      id: '',
      invoiceNumber: 'Draft',
      customerId: tab.selectedCustomer?.id ?? null,
      customerName: tab.selectedCustomer?.name ?? '',
      paymentMethod: 'Cash',
      subTotal,
      discount: tab.discountAmount,
      tax: taxAmount,
      grandTotal,
      amountPaidByCash: 0,
      amountPaidByCard: 0,
      amountPaid: 0,
      change: 0,
      status: SaleStatus.Open,
      items,
      createdAt: '',
    };
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

  /** Opens a purely local, empty cart. Nothing is created on the backend —
   *  a tab only ever touches the database once, at checkout. */
  openNewTab(): void {
    const tab: PosTab = {
      tabId: crypto.randomUUID(),
      items: [],
      selectedCustomer: null,
      discountAmount: 0,
      taxId: null,
      safetyChecked: false,
      itemCheckStatus: {},
    };
    this.tabs.update((list) => [...list, tab]);
    this.activeTabId.set(tab.tabId);
    this.loadRelativesForCustomer(null);
  }

  switchTab(tabId: string): void {
    this.activeTabId.set(tabId);
    const tab = this.tabs().find((t) => t.tabId === tabId);
    this.loadRelativesForCustomer(tab?.selectedCustomer?.id ?? null);
  }

  /** The X button on a tab. Since nothing about an in-progress cart is ever
   *  persisted, there's nothing to cancel/delete on the backend — closing a
   *  tab just discards the local cart. */
  closeTab(tabId: string, event: Event): void {
    event.stopPropagation();
    const tab = this.tabs().find((t) => t.tabId === tabId);
    if (!tab) return;

    if (tab.items.length > 0 && !confirm('Close this tab? The cart will be discarded.')) {
      return;
    }

    this.removeTabLocally(tabId);
  }

  /** Removes a tab from local state. Opens a fresh tab if none remain. */
  private removeTabLocally(tabId: string): void {
    const remaining = this.tabs().filter((t) => t.tabId !== tabId);
    this.tabs.set(remaining);
    if (this.activeTabId() === tabId) {
      if (remaining.length > 0) {
        const next = remaining[remaining.length - 1];
        this.activeTabId.set(next.tabId);
        this.loadRelativesForCustomer(next.selectedCustomer?.id ?? null);
      } else {
        this.openNewTab();
      }
    }
  }

  /** Applies a local mutation to the active tab's cart. Any cart-affecting
   *  change invalidates the previous safety check — the pharmacist must run
   *  "Check all" again before Pay unlocks. */
  private updateActiveTab(patch: (tab: PosTab) => PosTab): void {
    const id = this.activeTabId();
    this.tabs.update((list) =>
      list.map((t) =>
        t.tabId === id ? { ...patch(t), safetyChecked: false, itemCheckStatus: {} } : t,
      ),
    );
  }

  private loadCustomers(): void {
    this.service.getAllCustomers().subscribe({
      next: (res) => {
        const list = res ?? [];
        this.customers.set(list);
        this.refreshCustomerSearchResults(list);
      },
      error: (err) => this.toast.show(getErrorMessage(err, this.t('toast.loadCustomersFailed')), 'error'),
    });
  }

  /** Loads the relatives of the given customer for the per-row "Relative"
   *  dropdown. Clears the list when there's no sale-level customer yet. */
  private loadRelativesForCustomer(customerId: string | null): void {
    if (!customerId) {
      this.relatives.set([]);
      this.excludedCustomerIds.set([]);
      return;
    }

    this.relativesApi.getAllRelatives(customerId).subscribe({
      next: (list) => {
        this.relatives.set(list ?? []);
        this.excludedCustomerIds.set([
          customerId,
          ...(list ?? []).map((r) => r.relativeId).filter(Boolean),
        ]);
        this.refreshCustomerSearchResults(this.customers());
      },
      error: (err) => this.toast.show(getErrorMessage(err, this.t('toast.loadRelativesFailed')), 'error'),
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
        this.toast.show(getErrorMessage(err, this.t('toast.searchCustomersFailed')), 'error');
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
            this.toast.show(this.t('toast.relativeAdded', { name: customer.name ?? this.t('toast.customerFallback') }), 'success');
            this.loadRelativesForCustomer(currentCustomer!.id);
          } else {
            this.toast.show(res.message || this.t('toast.relativeAddFailed'), 'error');
          }
        },
        error: (err) => {
          this.toast.show(getErrorMessage(err, this.t('toast.relativeAddFailed')), 'error');
        },
      });
  }

  /** Purely local — there's no backend Sale to sync a customer onto until
   *  checkout, so this just updates the active tab's cart state. */
  selectCustomer(customer: Customer | null): void {
    this.showCustomerDropdown.set(false);
    this.updateActiveTab((t) => ({ ...t, selectedCustomer: customer }));
    this.loadRelativesForCustomer(customer?.id ?? null);
  }

  // ================= product search =================

  onQueryInput(value: string): void {
    this.query.set(value);
    this.searchOpen.set(true);
  }

  onSearchFocus(): void {
    if (this.query().trim().length >= 1) this.searchOpen.set(true);
  }

  /** Search-result display name in whichever language is active — the item
   *  itself always carries both (tradeNameEn/tradeNameAr) from the backend. */
  protected medicineDisplayName(item: MedicineSearchResult): string {
    return this.i18n.localizedName({ nameEn: item.tradeNameEn, nameAr: item.tradeNameAr });
  }

  /** Adding an item only ever does a read-only availability/price check
   *  against the backend (see PosService.getAvailability) — the line itself
   *  stays purely local until checkout. */
  addToCart(item: MedicineSearchResult): void {
    const tab = this.activeTab();
    if (!tab) return;

    this.service.getAvailability(item.pharmacyMedicineId).subscribe({
      next: (res) => {
        if (!res.success || !res.data) {
          this.toast.show(res.message || this.t('toast.availabilityFailed'), 'error');
          return;
        }

        const available = res.data.availableQuantity;
        if (available <= 0) {
          this.toast.show(this.t('toast.noStock'), 'error');
          return;
        }

        const customer = this.selectedCustomer();
        const customerId = customer?.id ?? null;
        const existing = tab.items.find(
          (i) => i.pharmacyMedicineId === item.pharmacyMedicineId && i.customerId === customerId,
        );
        const nextQuantity = (existing?.quantity ?? 0) + 1;

        if (nextQuantity > available) {
          this.toast.show(this.t('toast.onlyAvailable', { available }), 'error');
          return;
        }

        const unitPrice = res.data.unitPrice;
        this.updateActiveTab((t) => ({
          ...t,
          items: existing
            ? t.items.map((i) => (i.id === existing.id ? { ...i, quantity: nextQuantity } : i))
            : [
                ...t.items,
                {
                  id: crypto.randomUUID(),
                  pharmacyMedicineId: item.pharmacyMedicineId,
                  medicineName: this.i18n.localizedName({
                    nameEn: item.tradeNameEn,
                    nameAr: item.tradeNameAr,
                  }),
                  customerId,
                  customerName: customer?.name ?? '',
                  quantity: 1,
                  unitPrice,
                  discount: 0,
                  taxAmount: 0,
                },
              ],
        }));

        this.query.set('');
        this.searchOpen.set(false);
      },
      error: (err) => this.toast.show(getErrorMessage(err, this.t('toast.addItemFailed')), 'error'),
    });
  }

  /** Enter key in the search box = barcode scanner behavior: if there's exactly
   *  one match, add it straight to the cart without another click. */
  onSearchEnter(): void {
    const results = this.searchResults();
    if (results.length === 1) {
      this.addToCart(results[0]);
    } else if (results.length === 0) {
      this.toast.show(this.t('toast.noMatchingProduct'), 'error');
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
    if (changes.quantity !== undefined && changes.quantity <= 0) return;

    this.updateActiveTab((t) => ({
      ...t,
      items: t.items.map((i) =>
        i.id === item.id
          ? {
              ...i,
              quantity: changes.quantity ?? i.quantity,
              discount: changes.discount ?? i.discount,
              taxAmount: changes.taxAmount ?? i.taxAmount,
            }
          : i,
      ),
    }));
  }

  removeItem(item: SaleItem): void {
    this.updateActiveTab((t) => ({ ...t, items: t.items.filter((i) => i.id !== item.id) }));
  }

  toggleItemCustomerPicker(itemId: string): void {
    this.openItemCustomerPickerId.update((v) => (v === itemId ? null : itemId));
  }

  /** Per-row "Relative" dropdown — assigns one of the sale customer's relatives
   *  (or clears back to no relative) to this specific cart line. */
  selectCartItemRelative(item: SaleItem, relative: RelativeListItem | null): void {
    this.openItemCustomerPickerId.set(null);
    this.updateActiveTab((t) => ({
      ...t,
      items: t.items.map((i) =>
        i.id === item.id
          ? { ...i, customerId: relative?.relativeId ?? null, customerName: relative?.relativeName ?? '' }
          : i,
      ),
    }));
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

  /** Purely local — nothing to PATCH on a backend Sale that doesn't exist yet. */
  saveDiscount(): void {
    const currentSale = this.sale();
    if (!currentSale) return;

    const raw = this.discountInput() || 0;
    const dollarAmount =
      this.discountMode() === 'percent' ? Math.round(currentSale.subTotal * raw) / 100 : raw;

    if (dollarAmount < 0) {
      this.toast.show(this.t('toast.discountNegative'), 'error');
      return;
    }
    if (dollarAmount > currentSale.subTotal) {
      this.toast.show(this.t('toast.discountExceeds'), 'error');
      return;
    }

    this.savingDiscount.set(true);
    this.updateActiveTab((t) => ({ ...t, discountAmount: dollarAmount }));
    this.savingDiscount.set(false);
    this.showDiscountEditor.set(false);
    this.toast.show(this.t('toast.discountApplied'), 'success');
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

  /** Purely local — nothing to PATCH on a backend Sale that doesn't exist yet. */
  saveTax(): void {
    const currentSale = this.sale();
    const taxId = this.taxInput();
    if (!currentSale || !taxId) return;

    this.savingTax.set(true);
    this.updateActiveTab((t) => ({ ...t, taxId }));
    this.savingTax.set(false);
    this.showTaxEditor.set(false);
    this.toast.show(this.t('toast.taxApplied'), 'success');
  }

  // ================= cancel / clear =================

  /** Nothing exists server-side to cancel yet — this just discards the local
   *  cart and drops the tab (same end state as before, no API call needed). */
  cancelSale(): void {
    const currentSale = this.sale();
    if (!currentSale || currentSale.items.length === 0) return;
    if (!confirm('Cancel this sale and clear the cart?')) return;

    this.toast.show(this.t('toast.saleCancelled'), 'success');
    this.removeTabLocally(this.activeTabId());
  }

  clearCart(): void {
    const currentSale = this.sale();
    if (!currentSale || currentSale.items.length === 0) return;
    if (!confirm('Remove all items from this cart?')) return;

    this.updateActiveTab((t) => ({ ...t, items: [] }));
    this.toast.show(this.t('toast.cartCleared'), 'success');
  }

  // ================= AI patient safety check =================

  /** Which customer a line item's safety check should run against: its own
   *  per-line customer if one was picked, otherwise the sale's customer. */
  private effectiveCustomerId(item: SaleItem): string | null {
    return item.customerId || this.sale()?.customerId || null;
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

  /** Per-line "Check" button — validates a single cart line against its own
   *  customer. `item.id` is just this line's local client id — the AI
   *  endpoint only uses it as an opaque correlation token, so this works
   *  identically whether or not the line has ever been persisted. */
  checkItem(item: SaleItem): void {
    const customerId = this.effectiveCustomerId(item);
    if (!customerId) {
      this.toast.show(this.t('toast.assignCustomerItem'), 'error');
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
      this.toast.show(this.t('toast.assignCustomerCart'), 'error');
      return;
    }
    if (skipped > 0) {
      this.toast.show(this.t('toast.itemsSkipped', { count: skipped }), 'error');
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

  // ================= payment / checkout =================

  openPaymentModal(method: PaymentMethodChoice): void {
    const currentSale = this.sale();
    if (!currentSale || currentSale.items.length === 0) return;
    if (!this.canPay()) {
      this.toast.show(this.t('toast.checkAllFirst'), 'error');
      return;
    }
    this.paymentMethodChoice.set(method);
    this.showPaymentModal.set(true);
  }

  closePaymentModal(): void {
    if (this.payingInProgress()) return;
    this.showPaymentModal.set(false);
  }

  /** The only moment the cart ever touches the database: everything the
   *  pharmacist built up locally is sent in one call, which creates the Sale,
   *  adds every item, applies discount/tax, and records payment atomically. */
  confirmPayment(dto: PaySaleDto): void {
    const tab = this.activeTab();
    const currentSale = this.sale();
    if (!tab || !currentSale || currentSale.items.length === 0) return;

    const checkoutDto: CheckoutDto = {
      customerId: tab.selectedCustomer?.id,
      items: tab.items.map((i) => ({
        pharmacyMedicineId: i.pharmacyMedicineId,
        customerId: i.customerId ?? undefined,
        quantity: i.quantity,
        discount: i.discount,
        taxAmount: i.taxAmount,
      })),
      discountAmount: tab.discountAmount,
      taxId: tab.taxId ?? undefined,
      amountPaidByCash: dto.amountPaidByCash,
      amountPaidByCard: dto.amountPaidByCard,
    };

    this.payingInProgress.set(true);
    this.service.checkout(checkoutDto).subscribe({
      next: (res) => {
        this.payingInProgress.set(false);
        if (res.success && res.data) {
          this.showPaymentModal.set(false);
          this.toast.show(this.t('toast.saleCompleted', { invoiceNumber: res.data.invoiceNumber }), 'success');
          // Drop this finished tab and open a fresh empty one in its place.
          const finishedTabId = this.activeTabId();
          this.tabs.update((list) => list.filter((t) => t.tabId !== finishedTabId));
          this.openNewTab();
        } else {
          this.toast.show(res.message || this.t('toast.paymentFailed'), 'error');
        }
      },
      error: (err) => {
        this.payingInProgress.set(false);
        this.toast.show(getErrorMessage(err, this.t('toast.paymentFailed')), 'error');
      },
    });
  }
}