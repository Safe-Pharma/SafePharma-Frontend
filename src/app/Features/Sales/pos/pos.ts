import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, of, switchMap } from 'rxjs';
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
  BarcodeScanData,
  Customer,
  MedicineSearchResult,
  PaymentMethodChoice,
  PaySaleDto,
  RelativeListItem,
  Sale,
  SaleItem,
  SaleStatus,
  StockAvailability,
} from './Model/pos.models';
import { PatientSafetyResult, SafetyCheckedMedicine } from './Model/patient-safety.models';
import { ModalOverlayDirective } from '../../../Shared/Components/modal-overlay/modal-overlay';
import { EgpCurrencyPipe } from '../../../Shared/Pipes/egp-currency.pipe';

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
  activeItemId: string | null;
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

type PosSafetyState = 'walk-in' | 'pending' | 'checked' | 'stale' | 'running';

interface SafetySnapshot {
  tabId: string;
  key: string;
  customerId: string;
  items: SafetyCheckedMedicine[];
  results: PatientSafetyResult[];
  patientNames: Record<string, string>;
  stale: boolean;
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
    EgpCurrencyPipe,
    PaymentModalComponent,
    SafetyResultModalComponent,
    AddEditCustomerDialogComponent,
    ModalOverlayDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pos.html',
  styleUrl: './pos.css',
})
export class Pos implements OnInit, AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
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
  protected readonly roleLabel = (role: string | null | undefined) => this.i18n.roleLabel(role);
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
  protected readonly activeCartItemId = computed(
    () => this.activeTab()?.activeItemId ?? this.activeTab()?.items.at(-1)?.id ?? null,
  );
  protected readonly itemCheckStatus = computed(() => this.activeTab()?.itemCheckStatus ?? {});
  protected readonly safetyState = computed<PosSafetyState>(() => {
    if (!this.selectedCustomer()) return 'walk-in';
    const snapshot = this.currentSafetySnapshot();
    if (this.safetyLoading()) return 'running';
    if (snapshot?.stale) return 'stale';
    return this.activeTab()?.safetyChecked && snapshot && !snapshot.stale ? 'checked' : 'pending';
  });

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
  protected readonly safetyDetailsExpanded = signal(false);
  private readonly safetySnapshots = signal<Record<string, SafetySnapshot>>({});
  protected readonly currentSafetySnapshot = computed(
    () => this.safetySnapshots()[this.activeTabId()] ?? null,
  );
  protected readonly modalSafetyMedicines = computed(
    () => this.currentSafetySnapshot()?.items ?? [],
  );
  private safetyRequestId = 0;
  private safetyRequestKey: string | null = null;

  protected readonly safetySummary = computed(() => {
    const snapshot = this.currentSafetySnapshot();
    if (!snapshot || snapshot.stale) return null;
    if (snapshot.results.length === 0) {
      return { tone: 'warn', label: this.t('safety.noResult') } as const;
    }
    const tones = [
      ...snapshot.results.map((result) => this.toneFor(result)),
      ...this.inlineSafetyMedicines().map((medicine) => medicine.tone),
    ];
    const tone = tones.includes('danger') ? 'danger' : tones.includes('warn') ? 'warn' : 'ok';
    return {
      tone,
      label: tone === 'ok' ? this.t('safety.safe') : tone === 'warn' ? this.t('safety.warningsFound') : this.t('safety.highRiskIssue'),
    } as const;
  });

  protected readonly inlineSafetyMedicines = computed(() => {
    const snapshot = this.currentSafetySnapshot();
    if (!snapshot || snapshot.stale) return [];
    return snapshot.items.map((item) => {
      const result = snapshot.results.find((candidate) => candidate.patientRef === item.customerId) ?? snapshot.results[0];
      const issues = result?.issues.filter((issue) => issue.relatedDrugRefs?.includes(item.pharmacyMedicineId) || issue.relatedDrugRefs?.includes(item.id)) ?? [];
      const tone = result ? (issues.length ? this.toneForIssues(result, issues) : this.toneFor(result)) : 'warn';
      return {
        ...item,
        tone,
        label: tone === 'ok' ? this.t('safety.safe') : tone === 'warn' ? this.t('safety.warning') : this.t('safety.highRisk'),
        conclusion: issues[0]?.reason || this.t('safety.noIssues'),
      };
    });
  });

  /** Payment remains available; an unchecked selected customer gets a reminder. */
  protected readonly canPay = computed(() => {
    const currentSale = this.sale();
    return !!currentSale && currentSale.items.length > 0;
  });

  // ---- product search ----
  protected readonly query = signal('');
  protected readonly searchOpen = signal(false);
  protected readonly searching = signal(false);
  protected readonly searchError = signal<string | null>(null);
  protected readonly barcodeLoading = signal(false);
  protected readonly recentlyAddedItemId = signal<string | null>(null);
  protected readonly removingItemId = signal<string | null>(null);
  @ViewChild('scannerInput') private scannerInput?: ElementRef<HTMLInputElement>;
  private readonly barcodeQueue: string[] = [];
  private barcodeResolving = false;
  private scannerFocusSuspended = false;
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
  protected readonly customersLoading = signal(false);
  protected readonly showCustomerDropdown = signal(false);
  protected readonly showCustomerSearchModal = signal(false);
  protected readonly showCreateCustomerModal = signal(false);
  protected readonly customerSearchQuery = signal('');
  protected readonly customerSearchResults = signal<Customer[]>([]);
  protected readonly customerSearchLoading = signal(false);
  protected readonly customerSearchError = signal<string | null>(null);
  protected readonly excludedCustomerIds = signal<string[]>([]);
  @ViewChild('customerSearchInput') private customerSearchInput?: ElementRef<HTMLInputElement>;
  private customerSearchDebounce?: ReturnType<typeof setTimeout>;
  private customerSearchRequestId = 0;

  // ---- relatives of the sale's customer — power the per-row "Relative" dropdown ----
  protected readonly relatives = signal<RelativeListItem[]>([]);

  // ---- per-line customer picker ----
  protected readonly openItemCustomerPickerId = signal<string | null>(null);
  protected readonly openRowTaxId = signal<string | null>(null);

  // ---- payment modal ----
  protected readonly showPaymentModal = signal(false);
  protected readonly showSafetyReminder = signal(false);
  protected readonly pendingPaymentMethod = signal<PaymentMethodChoice>('Cash');
  protected readonly paymentMethodChoice = signal<PaymentMethodChoice>('Cash');
  protected readonly payingInProgress = signal(false);

  // ---- sale-level discount editor (amount or percent) ----
  protected readonly showDiscountEditor = signal(false);
  protected readonly discountMode = signal<DiscountMode>('amount');
  protected readonly discountInput = signal(0);
  protected readonly savingDiscount = signal(false);

  // ---- sale-level tax editor (pick a configured tax) ----
  protected readonly taxes = signal<Tax[]>([]);
  protected readonly taxesLoading = signal(true);
  protected readonly taxesError = signal<string | null>(null);
  protected readonly showTaxEditor = signal(false);
  protected readonly showSaleTaxMenu = signal(false);
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
    this.loadTaxes();
  }

  ngAfterViewInit(): void {
    this.restoreScannerFocus(true);
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    this.showCustomerDropdown.set(false);
    this.openItemCustomerPickerId.set(null);
    this.showDiscountEditor.set(false);
    this.showTaxEditor.set(false);
    this.showSaleTaxMenu.set(false);
    this.openRowTaxId.set(null);
    this.searchOpen.set(false);

    const target = event.target as HTMLElement | null;
    if (target && this.isInsidePos(target) && !this.isTextEntry(target) && !this.hasOpenOverlay()) {
      this.restoreScannerFocus();
    }
  }

  @HostListener('document:focusin', ['$event'])
  onDocumentFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target || !this.isInsidePos(target)) return;

    if (target === this.scannerInput?.nativeElement) {
      this.scannerFocusSuspended = false;
    } else if (this.isTextEntry(target)) {
      this.scannerFocusSuspended = true;
    }
  }

  @HostListener('document:focusout', ['$event'])
  onDocumentFocusOut(event: FocusEvent): void {
    const target = event.target as HTMLElement | null;
    const next = event.relatedTarget as HTMLElement | null;
    if (!target || !this.isInsidePos(target) || !this.isTextEntry(target)) return;
    if (this.hasOpenOverlay()) return;

    if (!next || !this.isInsidePos(next) || !this.isTextEntry(next)) {
      this.restoreScannerFocus();
    }
  }

  private isInsidePos(target: HTMLElement): boolean {
    return Boolean(target.closest('[data-pos-root]'));
  }

  private hasOpenOverlay(): boolean {
    return (
      this.showPaymentModal() ||
      this.showSafetyModal() ||
      this.showSafetyReminder() ||
      this.showCreateCustomerModal() ||
      this.showCustomerSearchModal()
    );
  }

  @HostListener('document:keydown', ['$event'])
  onPosKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target || !this.isInsidePos(target)) return;
    if (this.isTextEntry(target)) return;
    if (
      this.showCustomerDropdown() ||
      this.searchOpen() ||
      this.showDiscountEditor() ||
      this.showTaxEditor() ||
      this.showPaymentModal() ||
      this.showSafetyModal() ||
      this.showCreateCustomerModal() ||
      this.showCustomerSearchModal() ||
      this.openItemCustomerPickerId() ||
      this.openRowTaxId() ||
      this.showSaleTaxMenu()
    ) return;

    if (event.key !== 'Delete' && event.key !== 'Escape') return;
    const itemId = this.activeCartItemId();
    if (!itemId) return;
    event.preventDefault();
    this.removeItemById(itemId);
  }

  private isTextEntry(target: HTMLElement): boolean {
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target.isContentEditable
    );
  }

  /** Focus the scanner without stealing focus from an intentionally edited
   * control. Forced recovery is used only after a scan or a completed POS
   * action, when the workflow is explicitly returning to scanning. */
  private restoreScannerFocus(force = false): void {
    if (!force && this.scannerFocusSuspended) return;
    const input = this.scannerInput?.nativeElement;
    if (!input || document.activeElement === input) return;
    input.focus({ preventScroll: true });
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
      activeItemId: null,
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
    if (tabId !== this.activeTabId() && this.safetyLoading()) {
      this.safetyRequestId++;
      this.safetyRequestKey = null;
      this.safetyLoading.set(false);
      this.checkingAll.set(false);
      this.checkingItemId.set(null);
      this.showSafetyModal.set(false);
    }
    this.safetyDetailsExpanded.set(false);
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
      this.safetyDetailsExpanded.set(false);
      if (remaining.length > 0) {
        const next = remaining[remaining.length - 1];
        this.activeTabId.set(next.tabId);
        this.loadRelativesForCustomer(next.selectedCustomer?.id ?? null);
      } else {
        this.openNewTab();
      }
    }
  }

  /** Applies a local mutation to the active tab's cart. Medical changes make
   * the previous result stale; purely financial edits do not. */
  private updateActiveTab(patch: (tab: PosTab) => PosTab, safetyRelevant = true): void {
    if (safetyRelevant) this.invalidateSafetyState();
    const id = this.activeTabId();
    this.tabs.update((list) =>
      list.map((t) =>
        t.tabId === id ? { ...patch(t), safetyChecked: false, itemCheckStatus: {} } : t,
      ),
    );
  }

  private invalidateSafetyState(): void {
    const tabId = this.activeTabId();
    const snapshot = this.safetySnapshots()[tabId];
    if (snapshot && !snapshot.stale) {
      this.safetySnapshots.update((all) => ({
        ...all,
        [tabId]: { ...snapshot, stale: true },
      }));
    }
    this.safetyRequestId++;
    this.safetyRequestKey = null;
    this.safetyDetailsExpanded.set(false);
    this.safetyLoading.set(false);
    this.checkingAll.set(false);
    this.checkingItemId.set(null);
    this.showSafetyModal.set(false);
  }

  private loadCustomers(): void {
    this.customersLoading.set(true);
    this.service.getAllCustomers().subscribe({
      next: (res) => {
        const list = this.unwrapCustomers(res);
        this.customers.set(list);
        this.refreshCustomerSearchResults(list);
        this.customersLoading.set(false);
        if (this.showCustomerDropdown() && !this.customerSearchQuery().trim()) {
          this.customerSearchLoading.set(false);
        }
      },
      error: (err) => {
        this.customersLoading.set(false);
        this.customerSearchLoading.set(false);
        this.toast.show(getErrorMessage(err, this.t('toast.loadCustomersFailed')), 'error');
      },
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
    return list.filter((customer) => {
      const record = customer as Customer & { isActive?: boolean };
      return record.status !== 'Inactive' && record.isActive !== false && !excluded.has(customer.id);
    });
  }

  private unwrapCustomers(response: Customer[] | { data?: Customer[] } | null | undefined): Customer[] {
    return Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];
  }

  protected loadTaxes(): void {
    this.taxesLoading.set(true);
    this.taxesError.set(null);
    this.taxesApi.getAll().subscribe({
      next: (list) => {
        this.taxes.set(list.filter((tax) => tax.status === 'Active'));
        this.taxesLoading.set(false);
      },
      error: () => {
        this.taxes.set([]);
        this.taxesLoading.set(false);
        this.taxesError.set(this.t('editor.loadTaxesFailed'));
      },
    });
  }

  // ================= customer (sale-level) =================

  toggleCustomerDropdown(): void {
    const isOpen = this.showCustomerDropdown();
    this.showCustomerDropdown.set(!isOpen);

    if (!isOpen) {
      this.openItemCustomerPickerId.set(null);
      this.showCreateCustomerModal.set(false);
      this.customerSearchQuery.set('');
      this.customerSearchError.set(null);
      this.customerSearchLoading.set(this.customersLoading());
      this.refreshCustomerSearchResults(this.customers());
      setTimeout(() => this.customerSearchInput?.nativeElement.focus());
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
    this.restoreScannerFocus(true);
  }

  onCustomerSearchInput(value: string): void {
    this.customerSearchQuery.set(value);
    const term = value.trim();
    this.customerSearchError.set(null);
    clearTimeout(this.customerSearchDebounce);

    if (!term) {
      this.refreshCustomerSearchResults(this.customers());
      this.customerSearchLoading.set(this.customersLoading());
      return;
    }

    this.customerSearchLoading.set(true);
    const requestId = ++this.customerSearchRequestId;
    this.customerSearchDebounce = setTimeout(() => {
      this.service.getAllCustomers(term).subscribe({
        next: (res) => {
          if (requestId !== this.customerSearchRequestId) return;
          this.customerSearchResults.set(this.filterCustomerSearchResults(this.unwrapCustomers(res)));
          this.customerSearchLoading.set(false);
        },
        error: (err) => {
          if (requestId !== this.customerSearchRequestId) return;
          this.customerSearchLoading.set(false);
          this.customerSearchError.set(getErrorMessage(err, 'Could not search customers.'));
        },
      });
    }, 250);
  }

  clearCustomerSearch(): void {
    this.onCustomerSearchInput('');
    setTimeout(() => this.customerSearchInput?.nativeElement.focus());
  }

  openCreateCustomerModal(event?: Event): void {
    event?.stopPropagation();
    this.showCreateCustomerModal.set(true);
    this.showCustomerSearchModal.set(false);
  }

  closeCreateCustomerModal(): void {
    this.showCreateCustomerModal.set(false);
    this.restoreScannerFocus(true);
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
    this.scannerFocusSuspended = false;
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
        const itemId = existing?.id ?? crypto.randomUUID();

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
                  id: itemId,
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
          activeItemId: itemId,
        }));

        this.query.set('');
        this.searchOpen.set(false);
        this.recentlyAddedItemId.set(itemId);
        this.restoreScannerFocus();
      },
      error: (err) => this.toast.show(getErrorMessage(err, this.t('toast.addItemFailed')), 'error'),
    });
  }

  /** A scanner sends the complete value followed by Enter. Values are queued
   *  so rapid A → B → C scans are handled in order without overlapping cart
   *  mutations or dropping a barcode while the previous request resolves. */
  onSearchEnter(): void {
    const barcode = this.query().trim();
    if (!barcode) return;

    const results = this.searchResults();
    const exactBarcodeResult = results.some((item) => item.barcode?.trim() === barcode);
    if (!this.searching() && results.length === 1 && !exactBarcodeResult) {
      this.addToCart(results[0]);
      return;
    }

    this.query.set('');
    this.searchOpen.set(false);
    this.barcodeQueue.push(barcode);
    this.processNextBarcode();
  }

  private processNextBarcode(): void {
    if (this.barcodeResolving || this.barcodeQueue.length === 0) return;

    const barcode = this.barcodeQueue.shift()!;
    this.barcodeResolving = true;
    this.barcodeLoading.set(true);

    this.service
      .scanBarcode(barcode)
      .pipe(
        switchMap((res) => {
          if (!res.success || !res.data || !this.isValidBarcodeResult(res.data)) {
            return of({ res, availability: null as null | { success: boolean; data?: StockAvailability; message?: string } });
          }
          return this.service
            .getAvailability(res.data.pharmacyMedicineId)
            .pipe(map((availability) => ({ res, availability })));
        }),
        finalize(() => {
          this.barcodeResolving = false;
          this.barcodeLoading.set(false);
          this.restoreScannerFocus(true);
          this.processNextBarcode();
        }),
      )
      .subscribe({
        next: ({ res, availability }) => {
          const data = res.data;
          if (!res.success || !data || !this.isValidBarcodeResult(data)) {
            this.toast.show(res.message || this.t('toast.noMatchingProduct'), 'error');
            return;
          }
          if (!availability?.success || !availability.data) {
          this.toast.show(availability?.message || this.t('toast.availabilityFailed'), 'error');
            return;
          }
          const customerId = this.selectedCustomer()?.id ?? null;
          const existingQuantity = this.activeTab()?.items.find(
            (item) =>
              item.pharmacyMedicineId === data.pharmacyMedicineId && item.customerId === customerId,
          )?.quantity ?? 0;
          if (availability.data.availableQuantity <= existingQuantity) {
          this.toast.show(this.t('toast.onlyAvailable', { available: availability.data.availableQuantity }), 'error');
            return;
          }
          this.addScannedItem(data);
        },
        error: (err) => {
          this.toast.show(getErrorMessage(err, this.t('toast.availabilityFailed')), 'error');
        },
      });
  }

  private isValidBarcodeResult(data: BarcodeScanData): boolean {
    return Boolean(
      data.pharmacyMedicineId && data.medicineName && Number.isFinite(Number(data.price)),
    );
  }

  private addScannedItem(data: BarcodeScanData): void {
    const tab = this.activeTab();
    if (!tab) return;

    const customer = this.selectedCustomer();
    const customerId = customer?.id ?? null;
    const existing = tab.items.find(
      (i) => i.pharmacyMedicineId === data.pharmacyMedicineId && i.customerId === customerId,
    );
    const itemId = existing?.id ?? crypto.randomUUID();

    this.updateActiveTab((t) => ({
      ...t,
        items: existing
        ? t.items.map((i) => (i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i))
        : [
            ...t.items,
            {
              id: itemId,
              pharmacyMedicineId: data.pharmacyMedicineId,
              medicineName: data.medicineName,
              customerId,
              customerName: customer?.name ?? '',
              quantity: 1,
              unitPrice: Number(data.price),
              discount: 0,
              taxAmount: 0,
            },
        ],
        activeItemId: itemId,
      }));
    this.recentlyAddedItemId.set(itemId);
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
    }), changes.quantity !== undefined);
  }

  selectCartItem(item: SaleItem, event: MouseEvent): void {
    this.updateActiveTab((t) => ({ ...t, activeItemId: item.id }), false);
  }

  removeItem(item: SaleItem): void {
    this.removeItemById(item.id);
  }

  private removeItemById(itemId: string): void {
    if (this.removingItemId() === itemId) return;
    const tab = this.activeTab();
    if (!tab?.items.some((item) => item.id === itemId)) return;
    const index = tab.items.findIndex((item) => item.id === itemId);
    const nextActive = tab.items[index + 1] ?? tab.items[index - 1] ?? null;
    this.removingItemId.set(itemId);
    setTimeout(() => {
      this.updateActiveTab((t) => ({
        ...t,
        items: t.items.filter((i) => i.id !== itemId),
        activeItemId: nextActive?.id ?? null,
      }));
      this.removingItemId.set(null);
      this.restoreScannerFocus(true);
    }, 140);
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
    this.openRowTaxId.set(null);
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
    this.restoreScannerFocus(true);
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
    this.updateActiveTab((t) => ({ ...t, discountAmount: dollarAmount }), false);
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
    this.restoreScannerFocus(true);
  }

  /** Purely local — nothing to PATCH on a backend Sale that doesn't exist yet. */
  saveTax(): void {
    const currentSale = this.sale();
    const taxId = this.taxInput();
    if (!currentSale || !taxId) return;

    this.savingTax.set(true);
    this.updateActiveTab((t) => ({ ...t, taxId }), false);
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
    this.restoreScannerFocus(true);
  }

  clearCart(): void {
    const currentSale = this.sale();
    if (!currentSale || currentSale.items.length === 0) return;
    if (!confirm('Remove all items from this cart?')) return;

    this.updateActiveTab((t) => ({ ...t, items: [] }));
    this.toast.show(this.t('toast.cartCleared'), 'success');
    this.restoreScannerFocus(true);
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
    return this.toneForIssues(result, result.issues);
  }

  toggleRowTaxEditor(itemId: string): void {
    this.openRowTaxId.update((current) => (current === itemId ? null : itemId));
  }

  taxLabel(taxId: string): string {
    const tax = this.taxes().find((item) => item.id === taxId);
    return tax ? `${tax.name} (${tax.rate}%)` : this.t('editor.noTax');
  }

  toggleSaleTaxMenu(): void {
    this.showSaleTaxMenu.update((visible) => !visible);
  }

  private toneForIssues(
    result: PatientSafetyResult,
    issues: PatientSafetyResult['issues'],
  ): 'ok' | 'warn' | 'danger' {
    const weight = { Minor: 1, Moderate: 2, Major: 3 } as const;
    const worst = issues.reduce((max, i) => Math.max(max, weight[i.severity] ?? 0), 0);
    if (worst >= 3 || (result.riskScore ?? 0) >= 70) return 'danger';
    if (worst >= 1 || (result.riskScore ?? 0) >= 30) return 'warn';
    return 'ok';
  }

  private buildSafetyItems(items: SaleItem[]): SafetyCheckedMedicine[] {
    return items.map((item) => ({
      id: item.id,
      pharmacyMedicineId: item.pharmacyMedicineId,
      medicineName: item.medicineName,
      quantity: item.quantity,
      customerId: this.effectiveCustomerId(item),
    }));
  }

  private safetyKey(tabId: string, items: SafetyCheckedMedicine[]): string {
    return JSON.stringify({
      tabId,
      items: items.map((item) => ({
        id: item.id,
        pharmacyMedicineId: item.pharmacyMedicineId,
        quantity: item.quantity,
        customerId: item.customerId,
      })),
    });
  }

  private isCurrentSafetyRequest(requestId: number, key: string, tabId: string): boolean {
    return requestId === this.safetyRequestId &&
      key === this.safetyRequestKey &&
      tabId === this.activeTabId();
  }

  private saveSafetySnapshot(
    tabId: string,
    key: string,
    customerId: string,
    items: SafetyCheckedMedicine[],
    results: PatientSafetyResult[],
    patientNames: Record<string, string>,
  ): void {
    this.safetySnapshots.update((all) => ({
      ...all,
      [tabId]: { tabId, key, customerId, items, results, patientNames, stale: false },
    }));
    this.safetyResults.set(results);
    this.safetyPatientNames.set(patientNames);
    this.safetyError.set(null);
    this.safetyDetailsExpanded.set(false);
  }

  private openSafetyResults(results: PatientSafetyResult[], names: Record<string, string>): void {
    this.safetyResults.set(results);
    this.safetyPatientNames.set(names);
    this.safetyError.set(null);
    this.safetyLoading.set(false);
    // The modal is intentionally not reopened when a background request
    // completes. The inline Order Summary becomes the persistent result.
  }

  openSafetyModal(): void {
    this.showSafetyModal.set(true);
  }

  closeSafetyModal(): void {
    this.showSafetyModal.set(false);
    if (!this.safetyLoading()) this.restoreScannerFocus(true);
  }

  /** Per-line "Check" button — validates a single cart line against its own
   *  customer. `item.id` is just this line's local client id — the AI
   *  endpoint only uses it as an opaque correlation token, so this works
   *  identically whether or not the line has ever been persisted. */
  checkItem(item: SaleItem): void {
    if (this.safetyLoading()) {
      this.showSafetyModal.set(true);
      return;
    }
    const customerId = this.effectiveCustomerId(item);
    if (!customerId) {
      this.toast.show(this.t('toast.assignCustomerItem'), 'error');
      return;
    }

    const tabId = this.activeTabId();
    const checkedItems = this.buildSafetyItems([item]);
    const requestKey = this.safetyKey(tabId, checkedItems);
    const requestId = ++this.safetyRequestId;
    this.safetyRequestKey = requestKey;
    this.checkingItemId.set(item.id);
    this.safetyLoading.set(true);
    this.safetyError.set(null);
    this.showSafetyModal.set(true);

    this.safetyApi
      .check({
        patients: [
          {
            customerId,
            items: [{ pharmacyMedicineId: item.pharmacyMedicineId, saleItemId: item.id }],
          },
        ],
        language: this.i18n.lang(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (!this.isCurrentSafetyRequest(requestId, requestKey, tabId)) return;
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
            const names = { [customerId]: item.customerName || 'Customer' };
            this.saveSafetySnapshot(tabId, requestKey, customerId, checkedItems, res.data.results, names);
            this.openSafetyResults(res.data.results, names);
          } else {
            this.safetyLoading.set(false);
            this.safetyError.set(res.message || this.t('safety.couldNotComplete'));
          }
        },
        error: (err) => {
          if (!this.isCurrentSafetyRequest(requestId, requestKey, tabId)) return;
          this.checkingItemId.set(null);
          this.safetyLoading.set(false);
          this.safetyError.set(getErrorMessage(err, this.t('safety.couldNotComplete')));
        },
      });
  }

  /** "Check all" — one call to the AI agent for the whole cart, grouped by each
   *  line's own customer (falling back to the sale's customer). Unlocks Pay
   *  once it succeeds. */
  checkAll(): void {
    if (this.safetyLoading()) {
      this.showSafetyModal.set(true);
      return;
    }
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
      // Walk-in sales intentionally have no patient-specific check to run.
      return;
    }
    if (skipped > 0) {
      this.toast.show(this.t('toast.itemsSkipped', { count: skipped }), 'error');
    }

    const names: Record<string, string> = {};
    groups.forEach((g) => (names[g.customerId] = g.items[0].customerName || 'Customer'));

    const tabId = this.activeTabId();
    const checkedItems = this.buildSafetyItems(currentSale.items.filter((item) => this.effectiveCustomerId(item)));
    const requestKey = this.safetyKey(tabId, checkedItems);
    const requestId = ++this.safetyRequestId;
    this.safetyRequestKey = requestKey;

    this.checkingAll.set(true);
    this.safetyLoading.set(true);
    this.safetyError.set(null);
    this.showSafetyModal.set(true);

    this.safetyApi
      .check({
        patients: Array.from(groups.values()).map((g) => ({
          customerId: g.customerId,
          items: g.items.map((i) => ({ pharmacyMedicineId: i.pharmacyMedicineId, saleItemId: i.id })),
        })),
        language: this.i18n.lang(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (!this.isCurrentSafetyRequest(requestId, requestKey, tabId)) return;
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
            const customerId = this.selectedCustomer()?.id ?? Array.from(groups.keys())[0];
            this.saveSafetySnapshot(tabId, requestKey, customerId, checkedItems, res.data.results, names);
            this.openSafetyResults(res.data.results, names);
          } else {
            this.safetyLoading.set(false);
            this.safetyError.set(res.message || this.t('safety.couldNotComplete'));
          }
        },
        error: (err) => {
          if (!this.isCurrentSafetyRequest(requestId, requestKey, tabId)) return;
          this.checkingAll.set(false);
          this.safetyLoading.set(false);
          this.safetyError.set(getErrorMessage(err, this.t('safety.couldNotComplete')));
        },
      });
  }

  // ================= payment / checkout =================

  openPaymentModal(method: PaymentMethodChoice): void {
    const currentSale = this.sale();
    if (!currentSale || currentSale.items.length === 0) return;
    if (this.selectedCustomer() && !this.activeTab()?.safetyChecked) {
      this.pendingPaymentMethod.set(method);
      this.showSafetyReminder.set(true);
      return;
    }
    this.paymentMethodChoice.set(method);
    this.showPaymentModal.set(true);
  }

  closeSafetyReminder(): void {
    this.showSafetyReminder.set(false);
    this.restoreScannerFocus(true);
  }

  runSafetyCheckFromReminder(): void {
    this.showSafetyReminder.set(false);
    this.checkAll();
  }

  continueWithoutSafetyCheck(): void {
    this.showSafetyReminder.set(false);
    this.paymentMethodChoice.set(this.pendingPaymentMethod());
    this.showPaymentModal.set(true);
  }

  closePaymentModal(): void {
    if (this.payingInProgress()) return;
    this.showPaymentModal.set(false);
    this.restoreScannerFocus(true);
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
          this.restoreScannerFocus(true);
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
