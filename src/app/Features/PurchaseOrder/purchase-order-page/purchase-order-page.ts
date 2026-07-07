import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { PurchaseOrderApiService } from '../Services/purchase-order-api';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-purchase-order-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './purchase-order-page.html',
  styleUrl: './purchase-order-page.css',
})
export class PurchaseOrderPage implements OnInit {
  purchaseOrders: any[] = [];

  constructor(
    private purchaseOrderService: PurchaseOrderApiService,
    private cdr: ChangeDetectorRef,
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
