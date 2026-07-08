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
        medicineId: '',
        quantityOrdered: 1,
        unitPrice: 0,
      },
    ],
  };

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
