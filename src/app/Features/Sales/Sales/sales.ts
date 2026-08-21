import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Sale, SaleStats, SaleStatus } from '../pos/Model/pos.models';
import { SalesService } from './Services/sales';
import { LoadingOverlay } from '../../../Shared/Components/loading-overlay/loading-overlay';
import { EgpCurrencyPipe } from '../../../Shared/Pipes/egp-currency.pipe';
import { I18nService } from '../../../Core/Services/i18n.service';
import { PageHeaderComponent } from '../../../Shared/Components/page-header/page-header';


@Component({
  selector: 'app-sales-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingOverlay, EgpCurrencyPipe, PageHeaderComponent],
  templateUrl: './sales.html',
  styleUrl: './sales.css',
})
export class Sales implements OnInit {
  sales = signal<Sale[]>([]);
  stats = signal<SaleStats | null>(null);
  statsLoading = signal(true);
  loading = signal(false);
  errorMsg = signal<string | null>(null);

  searchTerm = signal('');
  statusFilter = signal<SaleStatus | null>(null);
  readonly saleStatuses = [SaleStatus.Open, SaleStatus.Completed, SaleStatus.Cancelled];
  expandedSaleId = signal<string | null>(null);

  private searchDebounce?: ReturnType<typeof setTimeout>;

  constructor(private salesService: SalesService, private router: Router, private i18n: I18nService) {}

  text(key: string): string { return this.i18n.text(key); }

  ngOnInit(): void {
    this.loadSales();
    this.loadStats();
  }

  loadSales(): void {
    this.loading.set(true);
    this.errorMsg.set(null);

    this.salesService.getAll(this.searchTerm() || undefined, this.statusFilter()).subscribe({
      next: (res) => {
        this.sales.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set(this.text('sales.loadingError'));
        this.loading.set(false);
      },
    });
  }

  loadStats(): void {
    this.statsLoading.set(true);
    this.salesService.getStats().subscribe({
      next: (res) => {
        this.stats.set(res.data ?? null);
        this.statsLoading.set(false);
      },
      error: () => {
        this.statsLoading.set(false);
      }, // KPI failure shouldn't block the whole page
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

  statusColor(status: SaleStatus | string | number): string {
    switch (this.normalizeStatus(status)) {
      case 'open':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  onStatusChange(value: string | number | null): void {
    this.statusFilter.set(value === null || value === '' ? null : Number(value) as SaleStatus);
    this.loadSales();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set(null);
    this.loadSales();
  }
  statusName(status: SaleStatus | string | number): string {
    const normalized = this.normalizeStatus(status);
    if (normalized === 'open') return this.text('sales.open');
    if (normalized === 'completed') return this.text('sales.completed');
    if (normalized === 'cancelled') return this.text('sales.cancelled');
    return typeof status === 'string' && status.trim() ? status : this.text('sales.unknownStatus');
  }

  private normalizeStatus(status: SaleStatus | string | number): string {
    if (typeof status === 'number') {
      return status === SaleStatus.Open
        ? 'open'
        : status === SaleStatus.Completed
          ? 'completed'
          : status === SaleStatus.Cancelled
            ? 'cancelled'
            : String(status);
    }
    const value = String(status).trim().toLowerCase();
    if (value === '0') return 'open';
    if (value === '1') return 'completed';
    if (value === '2') return 'cancelled';
    return value;
  }
}
