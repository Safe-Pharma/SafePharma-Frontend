import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { PurchaseOrderApiService } from '../Services/purchase-order-api';
import { ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Toast } from '../../../Shared/Toasts/toast';

@Component({
  selector: 'app-purchase-order-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './purchase-order-page.html',
  styleUrl: './purchase-order-page.css',
})
export class PurchaseOrderPage implements OnInit {

  activeTab: 'orders' | 'invoices' = 'orders';
 
  invoices: any[] = [];
  private invoicesLoaded = false;
 
  showCreateModal = false;
  purchaseOrders: any[] = [];

  suppliers: any[] = [];

  Medicines: any[] = [];
  selectedMedicine: string = '';

  purchaseOrder = {
    orderDate: '',
    expectedDate: '',
    supplierId: '',
    items: [
      {
        medicineId: '',
        quantityOrdered: 1,
        unitPrice: 0,
      },
    ],
  };

  showReceiveModal = false;

  selectedOrder: any = null;

  receipt = {
    invoiceNumber: '',
    invoiceDate: null,
    invoiceTotal: 0,
    items: [] as any[],
  };
expandedOrderNumber: string | null = null;
  expandedInvoiceId: string | null = null;
  constructor(
    private purchaseOrderService: PurchaseOrderApiService,
    private cdr: ChangeDetectorRef,
    private toast: Toast,
  ) {}

  ngOnInit(): void {
    this.loadPurchaseOrders();
  }

   switchTab(tab: 'orders' | 'invoices') {
    this.activeTab = tab;
    if (tab === 'invoices' && !this.invoicesLoaded) {
      this.loadInvoices();
    }
  }

  loadPurchaseOrders() {
    this.purchaseOrderService.getAll().subscribe({
      next: (res: any) => {
        this.purchaseOrders = res.data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
      },
    });
  }

  loadInvoices() {
    this.purchaseOrderService.getReceipts().subscribe({
      next: (res: any) => {
        this.invoices = res.data ?? res;
        this.invoicesLoaded = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.toast.show('Failed to load invoices', 'error');
      },
    });
  }

  loadSuppliers() {
    this.purchaseOrderService.getSuppliers().subscribe({
      next: (res: any) => {
        this.suppliers = res;
        console.log(res);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
      },
    });
  }
  loadMedicines() {
    this.purchaseOrderService.getMedicines().subscribe({
      next: (res: any) => {
        this.Medicines = res;
        console.log(res);
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
      items: [
        {
          medicineId: '',
          quantityOrdered: 1,
          unitPrice: 0,
        },
      ],
    };
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
  get totalPrice() {
    var total = 0;
    this.purchaseOrder.items.map((x) => (total += x.unitPrice * x.quantityOrdered));
    return total;
  }

  openCreateModal() {
    this.showCreateModal = true;
    this.loadSuppliers();
    this.loadMedicines();
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  addLine() {
    this.purchaseOrder.items.push({
      medicineId: '',
      quantityOrdered: 1,
      unitPrice: 0,
    });
  }
  removeLine(index: number) {
    this.purchaseOrder.items.splice(index, 1);
  }

  onMedicineChange(line: any) {
    const medicine = this.Medicines.find((m) => m.id === line.medicineId);

    if (medicine) {
      line.unitPrice = medicine.purchasePrice;
    }
  }

  createPurchaseOrder() {
    if (!this.purchaseOrder.supplierId) {
      this.toast.show('Please select a supplier', 'error');
      return;
    }

    if (!this.purchaseOrder.orderDate) {
      this.toast.show('Please select an order date', 'error');
      return;
    }
    if (!this.purchaseOrder.expectedDate) {
      this.toast.show('Please select an Expected Date', 'error');
      return;
    }

    if (this.purchaseOrder.items.length === 0) {
      this.toast.show('Please add at least one medicine', 'error');
      return;
    }

    for (const item of this.purchaseOrder.items) {
      if (!item.medicineId) {
        this.toast.show('Please select a medicine', 'error');
        return;
      }

      if (item.quantityOrdered <= 0) {
        this.toast.show('Quantity must be greater than 0', 'error');
        return;
      }

      if (item.unitPrice <= 0) {
        this.toast.show('Unit price must be greater than 0', 'error');
        return;
      }
    }
    console.log(this.purchaseOrder);

    this.purchaseOrderService.addPurchaseOrder(this.purchaseOrder).subscribe({
      next: (res) => {
        console.log(res);
        this.resetForm();
        this.closeCreateModal();
        this.loadPurchaseOrders();
        this.toast.show('Order Created Successfully!', 'success');
      },
      error: (err) => {
        console.log(err);
        this.toast.show('Failed to create Purchase Order', 'error');
      },
    });
  }

  openReceiveModal(order: any) {
    console.log(order.items);
    this.selectedOrder = order;
    console.log(this.selectedOrder);

    this.receipt = {
      invoiceNumber: '',
      invoiceDate: null,
      invoiceTotal: order.totalAmount,
      items: order.items.map((item: any) => ({
        purchaseOrderItemId: item.id,

        medicineName: item.medicineName,

        quantity: item.quantityOrdered,

        batchNumber: '',

        expiryDate: '',
      })),
    };

    this.showReceiveModal = true;
  }

  confirmReceipt() {
    if (!this.receipt.invoiceNumber || this.receipt.invoiceNumber.trim() === '') {
      this.toast.show('Invoice number is required', 'error');
      return;
    }

    if (!this.receipt.invoiceDate) {
      this.toast.show('Invoice date is required', 'error');
      return;
    }

    if (!this.receipt.invoiceTotal || this.receipt.invoiceTotal <= 0) {
      this.toast.show('Invoice total must be greater than 0', 'error');
      return;
    }

    if (!this.receipt.items || this.receipt.items.length === 0) {
      this.toast.show('Please add at least one item', 'error');
      return;
    }

    for (let item of this.receipt.items) {
      if (!item.batchNumber || item.batchNumber.trim() === '') {
        this.toast.show(`Batch number is required for ${item.medicineName}`, 'error');
        return;
      }

      if (!item.expiryDate) {
        this.toast.show(`Expiry date is required for ${item.medicineName}`, 'error');
        return;
      }

      const expiryDate = new Date(item.expiryDate);
      const today = new Date();

      today.setHours(0, 0, 0, 0);

      if (expiryDate < today) {
        this.toast.show(`Expiry date cannot be in the past for ${item.medicineName}`, 'error');
        return;
      }
    }

    console.log(this.receipt);

    this.purchaseOrderService.receivePurchaseOrder(this.selectedOrder.id, this.receipt).subscribe({
      next: (res) => {
        this.toast.show('Receipt created successfully', 'success');

        this.showReceiveModal = false;

        this.loadPurchaseOrders();
        this.invoicesLoaded = false;
        this.cdr.detectChanges();
      },

      error: (err) => {
        console.log(err);

        this.toast.show('Failed to receive goods', 'error');
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
   toggleOrderExpand(order: any): void {
    this.expandedOrderNumber = this.expandedOrderNumber === order.orderNumber ? null : order.orderNumber;
  }
 
  toggleInvoiceExpand(invoice: any): void {
    this.expandedInvoiceId = this.expandedInvoiceId === invoice.id ? null : invoice.id;
  }
 
  getOrderNumber(purchaseOrderId: string): string {
    const order = this.purchaseOrders.find((o) => o.id === purchaseOrderId);
    return order ? order.orderNumber : '—';
  }
 
  getSupplierName(purchaseOrderId: string): string {
    const order = this.purchaseOrders.find((o) => o.id === purchaseOrderId);
    return order ? order.supplierName : '—';
  }
 
  lineTotal(item: any): number {
    return (item.quantityOrdered ?? item.quantity ?? 0) * (item.unitPrice ?? 0);
  }
}
