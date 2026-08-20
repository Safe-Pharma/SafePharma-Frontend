import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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

interface PurchaseLineErrors {
  medicine?: string;
  quantity?: string;
  unitPrice?: string;
  lineDiscount?: string;
  taxAmount?: string;
}

@Component({
  selector: 'app-purchase-order-page',
  standalone: true,
  imports: [CommonModule, FormsModule, Spinner, LoadingOverlay, ModalShellComponent, EgpCurrencyPipe],
  templateUrl: './purchase-order-page.html',
  styleUrl: './purchase-order-page.css',
})
export class PurchaseOrderPage implements OnInit {
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
        this.errorMessage = 'Could not load purchase orders.';
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
        this.supplierError = 'Could not load suppliers.';
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
    this.purchaseOrder.items[index] = this.emptyPurchaseLine();
    delete this.lineErrors[index];
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
          this.medicineSearchError = 'Could not search medicines.';
          this.cdr.detectChanges();
        },
      });
    }, 180);
  }

  addMedicineResult(medicine: MedicineSearchResult): void {
    const existing = this.purchaseOrder.items.find(
      (line) => line.pharmacyMedicineId === medicine.pharmacyMedicineId,
    );
    if (existing) {
      existing.quantityOrdered += 1;
    } else {
      const emptyLineIndex = this.purchaseOrder.items.findIndex((line) => !line.pharmacyMedicineId);
      const nextLine = {
        pharmacyMedicineId: medicine.pharmacyMedicineId,
        medicineName: medicine.tradeNameEn,
        quantityOrdered: 1,
        unitPrice: 0,
        sellingPrice: medicine.sellingPrice ?? 0,
        lineDiscount: 0,
        taxAmount: 0,
      };
      if (emptyLineIndex >= 0) this.purchaseOrder.items[emptyLineIndex] = nextLine;
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
          this.medicineSearchError = 'Barcode did not resolve to a purchasable medicine.';
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
        this.medicineSearchError = 'Could not resolve this barcode.';
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
      this.supplierFieldError = 'Select a supplier before creating the order.';
    }

    if (!this.purchaseOrder.orderDate) {
      this.orderDateError = 'Select an order date.';
    }
    if (!this.purchaseOrder.expectedDate) {
      this.expectedDateError = 'Select an expected date.';
    } else if (this.purchaseOrder.orderDate && this.purchaseOrder.expectedDate < this.purchaseOrder.orderDate) {
      this.expectedDateError = 'Expected date cannot be before the order date.';
    }

    if (this.purchaseOrder.items.length === 0) {
      this.formError = 'Add at least one medicine line.';
    }

    for (const [index, item] of this.purchaseOrder.items.entries()) {
      const errors: PurchaseLineErrors = {};
      if (!item.pharmacyMedicineId) {
        errors.medicine = 'Select a medicine.';
      }

      if (!Number.isFinite(Number(item.quantityOrdered)) || Number(item.quantityOrdered) <= 0) {
        errors.quantity = 'Quantity must be greater than 0.';
      }

      if (!Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) <= 0) {
        errors.unitPrice = 'Unit cost must be greater than 0.';
      }

      const lineGross = Number(item.quantityOrdered || 0) * Number(item.unitPrice || 0);
      if (!Number.isFinite(Number(item.lineDiscount)) || Number(item.lineDiscount) < 0 || Number(item.lineDiscount) > lineGross) {
        errors.lineDiscount = 'Discount must be between 0 and the line amount.';
      }

      if (!Number.isFinite(Number(item.taxAmount)) || Number(item.taxAmount) < 0) {
        errors.taxAmount = 'Tax cannot be negative.';
      }

      if (Object.keys(errors).length > 0) {
        this.lineErrors[index] = errors;
      }
    }

    if (this.purchaseOrder.discountAmount < 0 || this.purchaseOrder.discountAmount > this.subtotal - this.lineDiscountTotal) {
      this.discountError = 'Supplier discount cannot exceed the order amount.';
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

        this.toast.show('Order Created Successfully!', 'success');
        this.resetForm();
        this.closeCreateModal();
        this.loadPurchaseOrders();
      },
      error: (err) => {
        this.isCreatingOrder = false;

        this.toast.show('Failed to create Purchase Order', 'error');
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
          this.receiptError = 'Could not load purchase order lines. Close and try again.';
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
      this.receiptError = 'Invoice number is required.';
      return;
    }

    if (!this.receipt.invoiceDate) {
      this.receiptError = 'Invoice date is required.';
      return;
    }

    if (!this.receipt.invoiceTotal || this.receipt.invoiceTotal <= 0) {
      this.receiptError = 'Invoice total must be greater than 0.';
      return;
    }

    if (!this.receipt.items || this.receipt.items.length === 0) {
      this.receiptError = 'At least one receipt line is required.';
      return;
    }

    for (const [index, item] of this.receipt.items.entries()) {
      if (!item.quantity || item.quantity <= 0) {
        this.receiptItemErrors[index] = 'Enter a quantity greater than 0.';
        return;
      }
      if (!item.batchNumber || item.batchNumber.trim() === '') {
        this.receiptItemErrors[index] = 'Batch number is required.';
        return;
      }

      if (!item.expiryDate) {
        this.receiptItemErrors[index] = 'Expiry date is required.';
        return;
      }

      const expiryDate = new Date(item.expiryDate);
      const today = new Date();

      today.setHours(0, 0, 0, 0);

      if (expiryDate < today) {
        this.receiptItemErrors[index] = 'Expiry date cannot be in the past.';
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

        this.toast.show('Receipt created successfully', 'success');

        this.showReceiveModal = false;

        this.loadPurchaseOrders();
        this.cdr.detectChanges();
      },

      error: (err) => {
        this.isReceiving = false;

        console.log(err);

        this.toast.show('Failed to receive goods', 'error');
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
        this.receiptHistoryError = 'Could not load receipt history.';
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

        this.toast.show('Prices updated successfully', 'success');

        this.showReceiptDetailsModal = false;
        this.cdr.detectChanges();

        this.loadReceiptHistory();
      },

      error: (err) => {
        this.isSavingPrices = false;

        console.log(err);
        this.toast.show('Failed to update prices', 'error');
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
