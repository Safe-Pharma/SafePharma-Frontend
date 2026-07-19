import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Sale, SaleStats } from '../pos/Model/pos.models';
import { SalesService } from './Services/sales';


@Component({
  selector: 'app-sales-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sales.html',
})
export class Sales implements OnInit {
  sales = signal<Sale[]>([]);
  stats = signal<SaleStats | null>(null);
  loading = signal(false);
  errorMsg = signal<string | null>(null);

  searchTerm = signal('');
  expandedSaleId = signal<string | null>(null);

  private searchDebounce?: ReturnType<typeof setTimeout>;

  constructor(private salesService: SalesService, private router: Router) {}

  ngOnInit(): void {
    this.loadSales();
    this.loadStats();
  }

  loadSales(): void {
    this.loading.set(true);
    this.errorMsg.set(null);

    this.salesService.getAll(this.searchTerm() || undefined).subscribe({
      next: (res) => {
        this.sales.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('An error occurred while loading sales.');
        this.loading.set(false);
      },
    });
  }

  loadStats(): void {
    this.salesService.getStats().subscribe({
      next: (res) => this.stats.set(res.data ?? null),
      error: () => {}, // KPI failure shouldn't block the whole page
    });
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.loadSales(), 300);
  }

  toggleExpand(sale: Sale): void {
    this.expandedSaleId.set(this.expandedSaleId() === sale.id ? null : sale.id);
  }

  goToNewSale(): void {
    this.router.navigateByUrl('/app/pos');
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-700';
      case 'Cancelled':
        return 'bg-red-100 text-red-700';
      case 'Open':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }
}