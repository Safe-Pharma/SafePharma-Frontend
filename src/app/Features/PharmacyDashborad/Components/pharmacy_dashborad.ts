import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import {
  AuditEntry,
  CategoryMix,
  PharmacyMedicineRow,
  SalesTrendPoint,
  SaleStats,
} from '../Models/pharmacy_dashboard';
import { DashboardApiService } from '../Services/pharmacy_dashboard';
import { Toast } from '../../../Shared/Toasts/toast';
import { getErrorMessage } from '../../../Shared/utils/get-error-message';
import { EgpCurrencyPipe } from '../../../Shared/Pipes/egp-currency.pipe';

const CATEGORY_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#e11d48', '#0891b2'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, EgpCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pharmacy_dashborad.html',
})
export class DashboardPage implements OnInit {
  private readonly api = inject(DashboardApiService);
  private readonly toast = inject(Toast);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly statsLoading = signal(true);
  protected readonly trendLoading = signal(true);
  protected readonly categoryMixLoading = signal(true);

  protected readonly stats = signal<SaleStats | null>(null);
  protected readonly trend = signal<SalesTrendPoint[]>([]);
  protected readonly categoryMix = signal<CategoryMix[]>([]);
  protected readonly activity = signal<AuditEntry[]>([]);
  protected readonly medicines = signal<PharmacyMedicineRow[]>([]);

  protected readonly lowStockItems = computed(() =>
    this.medicines().filter((m) => m.stockStatus !== 'InStock'),
  );

  protected readonly topProductsByStock = computed(() =>
    [...this.medicines()]
      .sort((a, b) => b.availableQuantity - a.availableQuantity)
      .slice(0, 6),
  );

  protected readonly maxTopProductStock = computed(() =>
    Math.max(1, ...this.topProductsByStock().map((m) => m.availableQuantity)),
  );

  protected readonly trendMax = computed(() => Math.max(1, ...this.trend().map((p) => p.total)));

  protected readonly trendTotal = computed(() => this.trend().reduce((s, p) => s + p.total, 0));

  protected readonly trendAreaPath = computed(() => this.buildAreaPath());
  protected readonly trendLinePath = computed(() => this.buildLinePath());

  protected readonly categoryMixWithColor = computed(() =>
    this.categoryMix().map((c, i) => ({ ...c, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] })),
  );

  protected readonly categoryMixGradient = computed(() => {
    const items = this.categoryMixWithColor();
    if (items.length === 0) return 'conic-gradient(#e2e8f0 0deg 360deg)';
    let acc = 0;
    const stops = items.map((c) => {
      const start = acc;
      acc += (c.percentage / 100) * 360;
      return `${c.color} ${start}deg ${acc}deg`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  });

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    this.statsLoading.set(true);
    this.trendLoading.set(true);
    this.categoryMixLoading.set(true);

    this.api.getStats().subscribe({
      next: (res) => {
        if (res.success && res.data) this.stats.set(res.data);
        this.statsLoading.set(false);
      },
      error: (err) => {
        this.statsLoading.set(false);
        this.toast.show(getErrorMessage(err, 'Could not load KPIs.'), 'error');
      },
    });

    this.api.getTrend(7).subscribe({
      next: (res) => {
        if (res.success && res.data) this.trend.set(res.data);
        this.trendLoading.set(false);
      },
      error: (err) => {
        this.trendLoading.set(false);
        this.toast.show(getErrorMessage(err, 'Could not load the sales trend.'), 'error');
      },
    });

    this.api.getCategoryMix().subscribe({
      next: (res) => {
        if (res.success && res.data) this.categoryMix.set(res.data);
        this.categoryMixLoading.set(false);
      },
      error: (err) => {
        this.categoryMixLoading.set(false);
        this.toast.show(getErrorMessage(err, 'Could not load category mix.'), 'error');
      },
    });

    this.api.getRecentActivity(6).subscribe({
      next: (res) => {
        if (res.success && res.data) this.activity.set(res.data);
      },
      error: (err) => this.toast.show(getErrorMessage(err, 'Could not load recent activity.'), 'error'),
    });

    this.api.getMedicines().subscribe({
      next: (res) => {
        this.medicines.set(res ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.show(getErrorMessage(err, 'Could not load inventory data.'), 'error');
      },
    });
  }

  goToNewSale(): void {
    this.router.navigateByUrl('/app/pos');
  }

  exportReport(): void {
    this.toast.show('Export isn\u2019t available yet.', 'error');
  }

  relativeTime(dateStr: string): string {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  private buildAreaPath(): string {
    const points = this.trend();
    if (points.length === 0) return '';
    const w = 700;
    const h = 200;
    const max = this.trendMax();
    const stepX = points.length > 1 ? w / (points.length - 1) : 0;
    const coords = points.map((p, i) => {
      const x = i * stepX;
      const y = h - (p.total / max) * (h - 20) - 10;
      return [x, y];
    });
    const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
    const last = coords[coords.length - 1];
    return `${line} L ${last[0]} ${h} L 0 ${h} Z`;
  }

  private buildLinePath(): string {
    const points = this.trend();
    if (points.length === 0) return '';
    const w = 700;
    const h = 200;
    const max = this.trendMax();
    const stepX = points.length > 1 ? w / (points.length - 1) : 0;
    return points
      .map((p, i) => {
        const x = i * stepX;
        const y = h - (p.total / max) * (h - 20) - 10;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }
}
