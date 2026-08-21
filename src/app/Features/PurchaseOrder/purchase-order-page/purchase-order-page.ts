import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { PurchaseOrderApiService } from '../Services/purchase-order-api';
import { ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Toast } from '../../../Shared/Toasts/toast';
import { forkJoin } from 'rxjs';
import { Spinner } from '../../../Shared/Components/spinner/spinner';
import { LoadingOverlay } from '../../../Shared/Components/loading-overlay/loading-overlay';
import { ModalShellComponent } from '../../users/components/modal-shell/modal-shell';
import { PosService } from '../../Sales/pos/Services/pos-service';
import { MedicineSearchResult } from '../../Sales/pos/Model/pos.models';
import { EgpCurrencyPipe } from '../../../Shared/Pipes/egp-currency.pipe';
import { I18nService } from '../../../Core/Services/i18n.service';
import { PageHeaderComponent } from '../../../Shared/Components/page-header/page-header';

interface PurchaseLineErrors {
  medicine?: string;
  quantity?: string;
  unitPrice?: string;
  lineDiscount?: string;
  taxAmount?: string;
}

type PurchaseLineField = keyof PurchaseLineErrors;

@Component({
  selector: 'app-purchase-order-page',
  standalone: true,
  imports: [CommonModule, FormsModule, Spinner, LoadingOverlay, ModalShellComponent, EgpCurrencyPipe, PageHeaderComponent],
  templateUrl: './purchase-order-page.html',
  styleUrl: './purchase-order-page.css',
})
export class PurchaseOrderPage implements OnInit {
  protected readonly i18n = inject(I18nService);
  text(key: string): string { return this.i18n.text(key); }

  medicineDisplayName(medicine: MedicineSearchResult): string {
    return this.i18n.lang() === 'ar' ? medicine.tradeNameAr || medicine.tradeNameEn : medicine.tradeNameEn || medicine.tradeNameAr;
  }

  medicineLineDisplayName(line: any): string {
    const medicine = this.Medicines.find((item) => item.pharmacyMedicineId === line?.pharmacyMedicineId);
    if (medicine) return this.medicineDisplayName(medicine);
    return line?.medicineName || line?.pharmacyMedicineId || this.text('purchase.chooseFromSearch');
  }
  purchaseOrders: any[] = [];
  loading = true;
  errorMessage: string | null = null;

  showCreateModal = false;

  suppliers: any[] = [];
  supplierQuery = '';
  supplierLoading = false;
  supplierError: string | null = null;
  showSupplierOptions = false;

  Medicines: any[] = [];
  medicineQuery = '';
  medicineSearchResults: MedicineSearchResult[] = [];
  medicineSearching = false;
  medicineSearchError: string | null = null;
  barcodeSearching = false;
  private medicineSearchDebounce?: ReturnType<typeof setTimeout>;
  formError: string | null = null;
  supplierFieldError: string | null = null;
  orderDateError: string | null = null;
  expectedDateError: string | null = null;
  discountError: string | null = null;
  lineErrors: Record<number, PurchaseLineErrors> = {};

  isCreatingOrder = false;
  isReceiving = false;
  receivingOrderLoading = false;
  isSavingPrices = false;

  purchaseOrder = {
    orderDate: '',
    expectedDate: '',
    supplierId: '',
    items: [
      {
        pharmacyMedicineId: '',
        medicineName: '',
        quantityOrdered: 1,
        unitPrice: 0,
        sellingPrice: 0,
        lineDiscount: 0,
        taxAmount: 0,
      },
    ],
    discountAmount: 0,
  };

  showReceiveModal = false;

  selectedOrder: any = null;

  receipt = {
    invoiceNumber: '',
    invoiceDate: null,
    invoiceTotal: 0,
    items: [] as any[],
  };

  showReceiptHistoryModal = false;
  receiptHistory: any[] = [];
  receiptHistoryLoading = false;
  receiptHistoryError: string | null = null;
  selectedReceipt: any = null;
  showReceiptDetailsModal = false;
  receiptError: string | null = null;
  receiptItemErrors: Record<number, string> = {};

  constructor(
    private purchaseOrderService: PurchaseOrderApiService,
    private cdr: ChangeDetectorRef,
    private toast: Toast,
    private posService: PosService,
  ) {}

  ngOnInit(): void {
    this.loadPurchaseOrders();
  }

  loadPurchaseOrders() {
    this.loading = true;
    this.errorMessage = null;
    this.purchaseOrderService.getAll().subscribe({
      next: (res: any) => {
        this.purchaseOrders = res.data ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.text('purchase.errorLoad');
        console.error(err);
      },
    });
  }

  loadSuppliers() {
    this.supplierLoading = true;
    this.supplierError = null;
    this.purchaseOrderService.getSuppliers().subscribe({
      next: (res: any) => {
        this.suppliers = res.data ?? res;
        this.supplierLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.supplierLoading = false;
        this.supplierError = this.text('purchase.errorSuppliers');
        console.error(err);
        this.cdr.detectChanges();
      },
    });
  }
  loadMedicines() {
    this.purchaseOrderService.getMedicines().subscribe({
      next: (res: any) => {
        this.Medicines = res.data ?? res;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
      },
    });
  }

  resetForm() {
    this.purchaseOrder = {
      orderDate: '',
      expectedDate: '',
      supplierId: '',
      discountAmount: 0,
      items: [
        {
          pharmacyMedicineId: '',
          medicineName: '',
          quantityOrdered: 1,
          unitPrice: 0,
          sellingPrice: 0,
          lineDiscount: 0,
          taxAmount: 0,
        },
      ],
    };
    this.supplierQuery = '';
    this.medicineQuery = '';
    this.medicineSearchResults = [];
    this.formError = null;
    this.supplierFieldError = null;
    this.orderDateError = null;
    this.expectedDateError = null;
    this.discountError = null;
    this.lineErrors = {};
  }

  get openOrders() {
    return this.purchaseOrders.filter((x) => x.status === 'Open').length;
  }

  get totalValue() {
    return this.purchaseOrders.reduce((sum, x) => sum + x.totalAmount, 0);
  }

  get suppliersCount() {
    return new Set(this.purchaseOrders.map((x) => x.supplierName)).size;
  }

  get totalLines() {
    return this.purchaseOrders.reduce((sum, x) => sum + x.lines, 0);
  }
  get filteredSuppliers(): any[] {
    const query = this.supplierQuery.trim().toLowerCase();
    return this.suppliers
      .filter((supplier) =>
        supplier.status === 'Active' &&
        [supplier.name, supplier.code, supplier.phone, supplier.taxNumber, supplier.vatNumber]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query)),
      )
      .slice(0, 30);
  }

  get selectedSupplier(): any | null {
    return this.suppliers.find((supplier) => supplier.id === this.purchaseOrder.supplierId) ?? null;
  }

  get subtotal(): number {
    return this.purchaseOrder.items.reduce(
      (sum, line) => sum + Number(line.quantityOrdered || 0) * Number(line.unitPrice || 0),
      0,
    );
  }

  get lineDiscountTotal(): number {
    return this.purchaseOrder.items.reduce((sum, line) => sum + Number(line.lineDiscount || 0), 0);
  }

  get taxTotal(): number {
    return this.purchaseOrder.items.reduce((sum, line) => sum + Number(line.taxAmount || 0), 0);
  }

  get totalPrice(): number {
    return Math.max(0, this.subtotal - this.lineDiscountTotal - Number(this.purchaseOrder.discountAmount || 0) + this.taxTotal);
  }

  openCreateModal() {
    this.showCreateModal = true;
    this.formError = null;
    this.loadSuppliers();
    this.loadMedicines();
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  @HostListener('document:click', ['$event'])
  closeSupplierOptionsOnOutsideClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('#po-supplier')) {
      this.showSupplierOptions = false;
    }
  }

  addLine() {
    this.purchaseOrder.items.push(this.emptyPurchaseLine());
  }

  private emptyPurchaseLine() {
    return {
      pharmacyMedicineId: '',
      medicineName: '',
      quantityOrdered: 1,
      unitPrice: 0,
      sellingPrice: 0,
      lineDiscount: 0,
      taxAmount: 0,
    };
  }
  removeLine(index: number) {
    if (index < 0 || index >= this.purchaseOrder.items.length) return;
    this.purchaseOrder.items.splice(index, 1);

    const shiftedErrors: Record<number, PurchaseLineErrors> = {};
    for (const [key, errors] of Object.entries(this.lineErrors)) {
      const errorIndex = Number(key);
      if (errorIndex < index) shiftedErrors[errorIndex] = errors;
      if (errorIndex > index) shiftedErrors[errorIndex - 1] = errors;
    }
    this.lineErrors = shiftedErrors;
  }

  onLineFieldChange(index: number, field: PurchaseLineField): void {
    const line = this.purchaseOrder.items[index];
    if (!line || !this.lineErrors[index]) return;

    if (this.isLineFieldValid(line, field)) {
      this.clearLineFieldError(index, field);
    }

    // A quantity or unit-cost change can make an existing discount error valid.
    if (
      (field === 'quantity' || field === 'unitPrice') &&
      this.lineErrors[index]?.lineDiscount &&
      this.isLineFieldValid(line, 'lineDiscount')
    ) {
      this.clearLineFieldError(index, 'lineDiscount');
    }
  }

  private isLineFieldValid(line: any, field: PurchaseLineField): boolean {
    switch (field) {
      case 'medicine':
        return !!line.pharmacyMedicineId;
      case 'quantity':
        return Number.isFinite(Number(line.quantityOrdered)) && Number(line.quantityOrdered) > 0;
      case 'unitPrice':
        return Number.isFinite(Number(line.unitPrice)) && Number(line.unitPrice) > 0;
      case 'lineDiscount': {
        const lineGross = Number(line.quantityOrdered || 0) * Number(line.unitPrice || 0);
        return (
          Number.isFinite(Number(line.lineDiscount)) &&
          Number(line.lineDiscount) >= 0 &&
          Number(line.lineDiscount) <= lineGross
        );
      }
      case 'taxAmount':
        return Number.isFinite(Number(line.taxAmount)) && Number(line.taxAmount) >= 0;
    }
  }

  private clearLineFieldError(index: number, field: PurchaseLineField): void {
    const errors = this.lineErrors[index];
    if (!errors) return;

    delete errors[field];
    if (Object.keys(errors).length === 0) delete this.lineErrors[index];
  }

  onMedicineChange(line: any) {
    const medicine = this.Medicines.find((m) => m.pharmacyMedicineId === line.pharmacyMedicineId);

    if (medicine) {
      line.medicineName = medicine.tradeNameEn;
      line.unitPrice = medicine.purchasePrice;
      line.sellingPrice = medicine.sellingPrice;
    }
  }

  onSupplierQuery(value: string): void {
    this.supplierQuery = value;
    this.showSupplierOptions = true;
  }

  selectSupplier(supplier: any): void {
    this.purchaseOrder.supplierId = supplier.id;
    this.supplierQuery = supplier.name ?? '';
    this.showSupplierOptions = false;
    this.supplierFieldError = null;
  }

  onOrderDateChange(): void {
    if (this.purchaseOrder.orderDate) this.orderDateError = null;
    this.clearValidExpectedDateError();
  }

  onExpectedDateChange(): void {
    if (
      this.purchaseOrder.expectedDate &&
      (!this.purchaseOrder.orderDate || this.purchaseOrder.expectedDate >= this.purchaseOrder.orderDate)
    ) {
      this.expectedDateError = null;
    }
  }

  private clearValidExpectedDateError(): void {
    if (
      this.purchaseOrder.expectedDate &&
      this.purchaseOrder.orderDate &&
      this.purchaseOrder.expectedDate >= this.purchaseOrder.orderDate
    ) {
      this.expectedDateError = null;
    }
  }

  onDiscountChange(): void {
    const discount = Number(this.purchaseOrder.discountAmount);
    const maximumDiscount = this.subtotal - this.lineDiscountTotal;
    if (Number.isFinite(discount) && discount >= 0 && discount <= maximumDiscount) {
      this.discountError = null;
    }
  }

  onMedicineQuery(value: string): void {
    this.medicineQuery = value;
    this.medicineSearchError = null;
    clearTimeout(this.medicineSearchDebounce);
    const query = value.trim();
    if (!query) {
      this.medicineSearchResults = [];
      this.medicineSearching = false;
      return;
    }

    this.medicineSearchDebounce = setTimeout(() => {
      this.medicineSearching = true;
      this.posService.searchMedicines(query).subscribe({
        next: (res) => {
          this.medicineSearchResults = res.data?.items ?? [];
          this.medicineSearching = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.medicineSearching = false;
          this.medicineSearchError = this.text('purchase.errorSearch');
          this.cdr.detectChanges();
        },
      });
    }, 180);
  }

  addMedicineResult(medicine: MedicineSearchResult): void {
    const medicineDetails = this.Medicines.find(
      (item) => item.pharmacyMedicineId === medicine.pharmacyMedicineId,
    );
    const purchasePrice = medicine.purchasePrice ?? medicineDetails?.purchasePrice ?? 0;
    const sellingPrice = medicine.sellingPrice ?? medicineDetails?.sellingPrice ?? 0;

    const existing = this.purchaseOrder.items.find(
      (line) => line.pharmacyMedicineId === medicine.pharmacyMedicineId,
    );
    if (existing) {
      existing.quantityOrdered += 1;
      existing.unitPrice = purchasePrice;
      existing.sellingPrice = sellingPrice;
    } else {
      const emptyLineIndex = this.purchaseOrder.items.findIndex((line) => !line.pharmacyMedicineId);
      const nextLine = {
        pharmacyMedicineId: medicine.pharmacyMedicineId,
        medicineName: medicine.tradeNameEn || medicine.tradeNameAr || medicineDetails?.tradeNameEn || '',
        quantityOrdered: 1,
        unitPrice: purchasePrice,
        sellingPrice,
        lineDiscount: 0,
        taxAmount: 0,
      };
      if (emptyLineIndex >= 0) {
        this.purchaseOrder.items[emptyLineIndex] = nextLine;
        delete this.lineErrors[emptyLineIndex];
      }
      else this.purchaseOrder.items.push(nextLine);
    }
    this.medicineQuery = '';
    this.medicineSearchResults = [];
    this.formError = null;
  }

  scanMedicineBarcode(): void {
    const barcode = this.medicineQuery.trim();
    if (!barcode || this.barcodeSearching) return;
    this.barcodeSearching = true;
    this.medicineSearchError = null;
    this.posService.scanBarcode(barcode).subscribe({
      next: (res) => {
        const data = res.data;
        if (!data?.pharmacyMedicineId) {
          this.medicineSearchError = this.text('purchase.barcodeNotFound');
        } else {
          this.addMedicineResult({
            pharmacyMedicineId: data.pharmacyMedicineId,
            tradeNameAr: '',
            tradeNameEn: data.medicineName,
            scientificName: '',
            barcode,
            sellingPrice: data.price,
            stockQuantity: 0,
          });
        }
        this.barcodeSearching = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.barcodeSearching = false;
        this.medicineSearchError = this.text('purchase.errorBarcode');
        this.cdr.detectChanges();
      },
    });
  }

  medicineSearchEnter(): void {
    const query = this.medicineQuery.trim();
    const exactBarcode = this.medicineSearchResults.some((item) => item.barcode?.trim() === query);
    if (!this.medicineSearching && this.medicineSearchResults.length === 1 && !exactBarcode) {
      this.addMedicineResult(this.medicineSearchResults[0]);
    } else if (query) {
      this.scanMedicineBarcode();
    }
  }

  createPurchaseOrder() {
    this.formError = null;
    this.supplierFieldError = null;
    this.orderDateError = null;
    this.expectedDateError = null;
    this.discountError = null;
    this.lineErrors = {};

    if (!this.purchaseOrder.supplierId) {
      this.supplierFieldError = this.text('purchase.selectSupplier');
    }

    if (!this.purchaseOrder.orderDate) {
      this.orderDateError = this.text('purchase.selectOrderDate');
    }
    if (!this.purchaseOrder.expectedDate) {
      this.expectedDateError = 'Select an expected date.';
    } else if (this.purchaseOrder.orderDate && this.purchaseOrder.expectedDate < this.purchaseOrder.orderDate) {
      this.expectedDateError = this.text('purchase.expectedBeforeOrder');
    }

    if (this.purchaseOrder.items.length === 0) {
      this.formError = this.text('purchase.addLine');
    }

    for (const [index, item] of this.purchaseOrder.items.entries()) {
      const errors: PurchaseLineErrors = {};
      if (!item.pharmacyMedicineId) {
        errors.medicine = this.text('purchase.selectMedicine');
      }

      if (!Number.isFinite(Number(item.quantityOrdered)) || Number(item.quantityOrdered) <= 0) {
        errors.quantity = this.text('purchase.quantityPositive');
      }

      if (!Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) <= 0) {
        errors.unitPrice = this.text('purchase.unitCostPositive');
      }

      const lineGross = Number(item.quantityOrdered || 0) * Number(item.unitPrice || 0);
      if (!Number.isFinite(Number(item.lineDiscount)) || Number(item.lineDiscount) < 0 || Number(item.lineDiscount) > lineGross) {
        errors.lineDiscount = this.text('purchase.discountRange');
      }

      if (!Number.isFinite(Number(item.taxAmount)) || Number(item.taxAmount) < 0) {
        errors.taxAmount = this.text('purchase.taxNegative');
      }

      if (Object.keys(errors).length > 0) {
        this.lineErrors[index] = errors;
      }
    }

    if (this.purchaseOrder.discountAmount < 0 || this.purchaseOrder.discountAmount > this.subtotal - this.lineDiscountTotal) {
      this.discountError = this.text('purchase.supplierDiscountLimit');
    }

    if (this.supplierFieldError || this.orderDateError || this.expectedDateError || this.discountError || Object.keys(this.lineErrors).length > 0) {
      return;
    }

    if (this.isCreatingOrder) {
      return;
    }

    this.isCreatingOrder = true;
    const payload = {
      ...this.purchaseOrder,
      items: this.purchaseOrder.items.map((item) => ({
        pharmacyMedicineId: item.pharmacyMedicineId,
        quantityOrdered: item.quantityOrdered,
        unitPrice: item.unitPrice,
        sellingPrice: item.sellingPrice,
        lineDiscount: item.lineDiscount,
        taxAmount: item.taxAmount,
      })),
    };

    this.purchaseOrderService.addPurchaseOrder(payload).subscribe({
      next: (res) => {
        this.isCreatingOrder = false;

        this.toast.show(this.text('purchase.success'), 'success');
        this.resetForm();
        this.closeCreateModal();
        this.loadPurchaseOrders();
      },
      error: (err) => {
        this.isCreatingOrder = false;

        this.toast.show(this.text('purchase.createError'), 'error');
      },
    });
  }

  openReceiveModal(order: any) {
    this.receivingOrderLoading = false;
    const prepareReceipt = (resolvedOrder: any) => {
      this.selectedOrder = resolvedOrder;
      this.receipt = {
        invoiceNumber: '',
        invoiceDate: null,
        invoiceTotal: resolvedOrder.totalAmount,
        items: (resolvedOrder.items ?? []).map((item: any) => ({
          purchaseOrderItemId: item.id ?? item.purchaseOrderItemId,
          medicineName: item.medicineName,
          quantity: item.quantityOrdered,
          batchNumber: '',
          expiryDate: '',
        })),
      };
      this.receiptError = null;
      this.receiptItemErrors = {};
      this.receivingOrderLoading = false;
      this.showReceiveModal = true;
      this.cdr.detectChanges();
    };

    const orderId = this.getPurchaseOrderId(order);
    if ((!order.items || order.items.length === 0) && orderId) {
      this.selectedOrder = order;
      this.receipt.items = [];
      this.receiptError = null;
      this.receivingOrderLoading = true;
      this.showReceiveModal = true;
      this.purchaseOrderService.getPurchaseOrderById(orderId).subscribe({
        next: (res: any) => prepareReceipt(res.data ?? res),
        error: () => {
          this.receivingOrderLoading = false;
          this.receiptError = this.text('purchase.errorReceiptLines');
          this.cdr.detectChanges();
        },
      });
    } else {
      prepareReceipt(order);
    }
  }

  confirmReceipt() {
    this.receiptError = null;
    this.receiptItemErrors = {};
    if (!this.receipt.invoiceNumber || this.receipt.invoiceNumber.trim() === '') {
      this.receiptError = this.text('purchase.invoiceNumberRequired');
      return;
    }

    if (!this.receipt.invoiceDate) {
      this.receiptError = this.text('purchase.invoiceDateRequired');
      return;
    }

    if (!this.receipt.invoiceTotal || this.receipt.invoiceTotal <= 0) {
      this.receiptError = this.text('purchase.invoiceTotalPositive');
      return;
    }

    if (!this.receipt.items || this.receipt.items.length === 0) {
      this.receiptError = this.text('purchase.receiptLineRequired');
      return;
    }

    for (const [index, item] of this.receipt.items.entries()) {
      if (!item.quantity || item.quantity <= 0) {
        this.receiptItemErrors[index] = this.text('purchase.receiptQuantityPositive');
        return;
      }
      if (!item.batchNumber || item.batchNumber.trim() === '') {
        this.receiptItemErrors[index] = this.text('purchase.batchRequired');
        return;
      }

      if (!item.expiryDate) {
        this.receiptItemErrors[index] = this.text('purchase.expiryRequired');
        return;
      }

      const expiryDate = new Date(item.expiryDate);
      const today = new Date();

      today.setHours(0, 0, 0, 0);

      if (expiryDate < today) {
        this.receiptItemErrors[index] = this.text('purchase.expiryPast');
        return;
      }
    }

    if (this.isReceiving) {
      return;
    }

    this.isReceiving = true;

    console.log(this.receipt);

    this.purchaseOrderService.receivePurchaseOrder(this.selectedOrder.id, this.receipt).subscribe({
      next: (res) => {
        this.isReceiving = false;

        this.toast.show(this.text('purchase.receiptCreated'), 'success');

        this.showReceiveModal = false;

        this.loadPurchaseOrders();
        this.cdr.detectChanges();
      },

      error: (err) => {
        this.isReceiving = false;

        console.log(err);

        this.toast.show(this.text('purchase.receiveError'), 'error');
      },
    });
  }
  openReceiptHistory() {
    this.showReceiptHistoryModal = true;
    this.receiptHistoryError = null;
    this.receiptHistoryLoading = true;
    this.loadReceiptHistory();
  }

  loadReceiptHistory() {
    this.receiptHistoryLoading = true;
    this.receiptHistoryError = null;
    this.purchaseOrderService.getReceiptHistory().subscribe({
      next: (res: any) => {
        this.receiptHistory = res.data ?? res ?? [];
        this.receiptHistoryLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.receiptHistoryLoading = false;
        this.receiptHistoryError = this.text('purchase.errorReceipts');
        console.log(err);
        this.cdr.detectChanges();
      },
    });
  }
  openReceiptDetails(receipt: any) {
    this.showReceiptHistoryModal = false;
    this.selectedReceipt = receipt;
    this.showReceiptDetailsModal = true;
  }
  saveReceiptPrices() {
    if (this.isSavingPrices) {
      return;
    }

    this.isSavingPrices = true;
    const requests = this.selectedReceipt.items.map((item: any) =>
      this.purchaseOrderService.updateReceiptItem(item.purchaseReceiptItemId, {
        unitPrice: item.unitPrice,
        sellingPrice: item.sellingPrice,
      }),
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.isSavingPrices = false;

        this.toast.show(this.text('purchase.pricesUpdated'), 'success');

        this.showReceiptDetailsModal = false;
        this.cdr.detectChanges();

        this.loadReceiptHistory();
      },

      error: (err) => {
        this.isSavingPrices = false;

        console.log(err);
        this.toast.show(this.text('purchase.pricesError'), 'error');
      },
    });
  }

  statusClass(status: string) {
    switch (status) {
      case 'Open':
        return 'bg-blue-100 text-blue-700';

      case 'Received':
        return 'bg-green-100 text-green-700';

      case 'Cancelled':
        return 'bg-red-100 text-red-700';

      default:
        return 'bg-yellow-100 text-yellow-700';
    }

  }

  private getPurchaseOrderId(order: any): string {
    return String(order?.id ?? order?.purchaseOrderId ?? order?.purchaseOrderID ?? order?.purchaseOrder?.id ?? '').trim();
  }

}
