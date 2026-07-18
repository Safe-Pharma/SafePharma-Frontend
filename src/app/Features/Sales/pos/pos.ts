import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { PosService } from './Services/pos-service';
import { PaymentModalComponent } from './Components/payment-modal/payment-modal';
import { Toast } from '../../../Shared/Toasts/toast';
import { getErrorMessage } from '../../../Shared/utils/get-error-message';
import { AuthSessionService } from '../../../Core/Services/auth-session.service';
import {
  Customer,
  EMPTY_GUID,
  MedicineSearchResult,
  PaymentMethodChoice,
  PaySaleDto,
  Sale,
  SaleItem,
} from './pos.models';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [FormsModule, CommonModule, PaymentModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pos.html',
})
export class Pos implements OnInit {
  private readonly service = inject(PosService);
  private readonly toast = inject(Toast);
  protected readonly auth = inject(AuthSessionService);

  // ---- sale state ----
  protected readonly sale = signal<Sale | null>(null);
  protected readonly loadingSale = signal(false);

  // ---- product search ----
  protected readonly query = signal('');
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
    () => this.query().trim().length >= 2 && !this.searching() && this.searchResults().length === 0 && !this.searchError(),
  );

  // ---- customer picker (sale-level) ----
  protected readonly customers = signal<Customer[]>([]);
  protected readonly selectedCustomer = signal<Customer | null>(null);
  protected readonly showCustomerDropdown = signal(false);

  // ---- per-line customer picker ----
  protected readonly openItemCustomerPickerId = signal<string | null>(null);

  // ---- payment modal ----
  protected readonly showPaymentModal = signal(false);
  protected readonly paymentMethodChoice = signal<PaymentMethodChoice>('Cash');
  protected readonly payingInProgress = signal(false);

  // ---- discount editor (sale-level) ----
  protected readonly showDiscountEditor = signal(false);
  protected readonly discountInput = signal(0);
  protected readonly savingDiscount = signal(false);

  ngOnInit(): void {
    this.createDraftSale();
    this.loadCustomers();
  }

  // ================= draft sale =================

  createDraftSale(): void {
    this.loadingSale.set(true);
    this.service.createDraftSale().subscribe({
      next: (res) => {
        this.loadingSale.set(false);
        if (res.success && res.data) {
          this.sale.set(res.data);
          this.selectedCustomer.set(null);
        } else {
          this.toast.show(res.message || 'Could not start a new sale.', 'error');
        }
      },
      error: (err) => {
        this.loadingSale.set(false);
        this.toast.show(getErrorMessage(err, 'Could not start a new sale.'), 'error');
      },
    });
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

    this.selectedCustomer.set(customer);
    this.service
      .setSaleCustomer(currentSale.id, { customerId: customer ? customer.id : EMPTY_GUID })
      .subscribe({
        next: (res) => {
          if (res.success && res.data) this.sale.set(res.data);
        },
        error: (err) => this.toast.show(getErrorMessage(err, 'Could not set customer.'), 'error'),
      });
  }

  // ================= product search =================

  onQueryInput(value: string): void {
    this.query.set(value);
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
            this.sale.set(res.data);
            this.query.set('');
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
    this.updateItemQuantity(item, item.quantity + 1);
  }

  decreaseQuantity(item: SaleItem): void {
    if (item.quantity <= 1) return;
    this.updateItemQuantity(item, item.quantity - 1);
  }

  private updateItemQuantity(item: SaleItem, newQuantity: number): void {
    const currentSale = this.sale();
    if (!currentSale) return;

    this.service
      .updateSaleItem(currentSale.id, item.id, {
        customerId: item.customerId ?? undefined,
        quantity: newQuantity,
        discount: item.discount,
        taxAmount: item.taxAmount,
      })
      .subscribe({
        next: (res) => {
          if (res.success && res.data) this.sale.set(res.data);
          else this.toast.show(res.message || 'Could not update quantity.', 'error');
        },
        error: (err) => this.toast.show(getErrorMessage(err, 'Could not update quantity.'), 'error'),
      });
  }

  removeItem(item: SaleItem): void {
    const currentSale = this.sale();
    if (!currentSale) return;

    this.service.removeSaleItem(currentSale.id, item.id).subscribe({
      next: (res) => {
        if (res.success && res.data) this.sale.set(res.data);
        else this.toast.show(res.message || 'Could not remove item.', 'error');
      },
      error: (err) => this.toast.show(getErrorMessage(err, 'Could not remove item.'), 'error'),
    });
  }

  toggleItemCustomerPicker(itemId: string): void {
    this.openItemCustomerPickerId.update((v) => (v === itemId ? null : itemId));
  }

  selectCartItemCustomer(item: SaleItem, customer: Customer | null): void {
    const currentSale = this.sale();
    if (!currentSale) return;

    this.openItemCustomerPickerId.set(null);
    this.service
      .updateSaleItem(currentSale.id, item.id, {
        customerId: customer ? customer.id : undefined,
        quantity: item.quantity,
        discount: item.discount,
        taxAmount: item.taxAmount,
      })
      .subscribe({
        next: (res) => {
          if (res.success && res.data) this.sale.set(res.data);
        },
        error: (err) => this.toast.show(getErrorMessage(err, 'Could not set customer.'), 'error'),
      });
  }

  // ================= sale-level discount =================

  openDiscountEditor(): void {
    const currentSale = this.sale();
    if (!currentSale) return;
    this.discountInput.set(currentSale.discount);
    this.showDiscountEditor.set(true);
  }

  closeDiscountEditor(): void {
    this.showDiscountEditor.set(false);
  }

  saveDiscount(): void {
    const currentSale = this.sale();
    if (!currentSale) return;

    this.savingDiscount.set(true);
    this.service
      .applyDiscount(currentSale.id, { discountAmount: this.discountInput() || 0 })
      .subscribe({
        next: (res) => {
          this.savingDiscount.set(false);
          if (res.success && res.data) {
            this.sale.set(res.data);
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

  // ================= cancel sale =================

  cancelSale(): void {
    const currentSale = this.sale();
    if (!currentSale) return;
    if (currentSale.items.length > 0 && !confirm('Cancel this sale and clear the cart?')) return;

    this.service.cancelSale(currentSale.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.show('Sale cancelled.', 'success');
          this.createDraftSale();
        } else {
          this.toast.show(res.message || 'Could not cancel sale.', 'error');
        }
      },
      error: (err) => this.toast.show(getErrorMessage(err, 'Could not cancel sale.'), 'error'),
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
          this.createDraftSale();
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
