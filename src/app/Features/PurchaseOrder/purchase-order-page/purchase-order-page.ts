import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { PurchaseOrderApiService } from '../Services/purchase-order-api';
import { ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Toast } from '../../../Shared/Toasts/toast';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-purchase-order-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './purchase-order-page.html',
  styleUrl: './purchase-order-page.css',
})
export class PurchaseOrderPage implements OnInit {
  purchaseOrders: any[] = [];

  showCreateModal = false;

  suppliers: any[] = [];

  Medicines: any[] = [];
  selectedMedicine: string = '';

  purchaseOrder = {
    orderDate: '',
    expectedDate: '',
    supplierId: '',
    items: [
      {
        pharmacyMedicineId: '',
        quantityOrdered: 1,
        unitPrice: 0,
        sellingPrice: 0,
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

  showReceiptHistoryModal = false;
  receiptHistory: any[] = [];
  selectedReceipt: any = null;
  showReceiptDetailsModal = false;

  constructor(
    private purchaseOrderService: PurchaseOrderApiService,
    private cdr: ChangeDetectorRef,
    private toast: Toast,
  ) {}

  ngOnInit(): void {
    this.loadPurchaseOrders();
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
        console.log('medddddddddddddddddddddd', res);
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
          pharmacyMedicineId: '',
          quantityOrdered: 1,
          unitPrice: 0,
          sellingPrice: 0,
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
      pharmacyMedicineId: '',
      quantityOrdered: 1,
      unitPrice: 0,
      sellingPrice: 0,
    });
  }
  removeLine(index: number) {
    this.purchaseOrder.items.splice(index, 1);
  }

  onMedicineChange(line: any) {
    const medicine = this.Medicines.find((m) => m.pharmacyMedicineId === line.pharmacyMedicineId);

    if (medicine) {
      line.unitPrice = medicine.purchasePrice;
      line.sellingPrice = medicine.sellingPrice;
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
      if (!item.pharmacyMedicineId) {
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
        this.toast.show('Order Created Successfully!', 'success');
        setTimeout(() => {
          this.resetForm();
          this.closeCreateModal();
          this.loadPurchaseOrders();
        });
      },
      error: (err) => {
        console.log(err);
        this.toast.show('Failed to create Purchase Order', 'error');
      },
    });
  }

  openReceiveModal(order: any) {
    this.selectedOrder = order;

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
        this.cdr.detectChanges();
      },

      error: (err) => {
        console.log(err);

        this.toast.show('Failed to receive goods', 'error');
      },
    });
  }
  openReceiptHistory() {
    this.showReceiptHistoryModal = true;
    this.loadReceiptHistory();
  }

  loadReceiptHistory() {
    this.purchaseOrderService.getReceiptHistory().subscribe({
      next: (res: any) => {
        this.receiptHistory = res.data ?? [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.log(err);
      },
    });
  }
  openReceiptDetails(receipt: any) {
    this.selectedReceipt = receipt;
    this.showReceiptDetailsModal = true;
  }
  saveReceiptPrices() {
    const requests = this.selectedReceipt.items.map((item: any) =>
      this.purchaseOrderService.updateReceiptItem(item.purchaseReceiptItemId, {
        unitPrice: item.unitPrice,
        sellingPrice: item.sellingPrice,
      }),
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.toast.show('Prices updated successfully', 'success');

        this.showReceiptDetailsModal = false;
        this.cdr.detectChanges();

        this.loadReceiptHistory();
      },

      error: (err) => {
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
}
