import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PortalApiService } from '../../Services/portal-api.service';
import { PortalAuthService } from '../../Services/portal-auth.service';
import { PortalI18nService } from '../../Services/portal-i18n.service';
import { Toast } from '../../../../Shared/Toasts/toast';
import { getErrorMessage } from '../../../../Shared/utils/get-error-message';
import { PortalReceiptListItem } from '../../Models/portal-sales.model';
import { PortalSkeleton } from '../../Shared/skeleton';
import { PortalEmptyStateComponent } from '../../Shared/empty-state';
import { fadeSlideIn, staggerList, listItem, dialogOverlay, dialogPanel, successPulse } from '../../Shared/portal-animations';
import {PortalSectionHeaderComponent  } from '../../Shared/portal-section-header.component';

import { PortalStatusBadge } from '../../Shared/status-badge';
import { receiptStatusLabel, receiptStatusTone } from '../../Shared/receipt-status';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-purchase-history',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, DecimalPipe, PortalSkeleton, PortalEmptyStateComponent, PortalStatusBadge, PortalSectionHeaderComponent],
  templateUrl: './purchase-history.html',
  animations: [fadeSlideIn, staggerList, listItem, dialogOverlay, dialogPanel, successPulse],
})
export class PurchaseHistoryPage implements OnInit {
  private readonly api = inject(PortalApiService);
  private readonly portalAuth = inject(PortalAuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(Toast);
  readonly i18n = inject(PortalI18nService);

  @Input() customerId = '';

  readonly loading = signal(true);
  readonly receipts = signal<PortalReceiptListItem[]>([]);

  readonly search = signal('');
  readonly pharmacyFilter = signal('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly page = signal(1);

  receiptStatusLabel = receiptStatusLabel;
  receiptStatusTone = receiptStatusTone;

  private searchDebounce: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const customerId = this.customerId || this.route.snapshot.queryParamMap.get('customerId') || this.portalAuth.session()?.customerId;

    this.loading.set(true);
    this.api.getPurchaseHistory(customerId || undefined).subscribe({
      next: (receipts) => {
        this.receipts.set([...receipts].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.show(getErrorMessage(err, 'Could not load your purchase history.'), 'error');
      },
    });
  }

  onSearchInput(value: string): void {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.search.set(value);
      this.page.set(1);
    }, 300);
  }

  pharmacies(): string[] {
    const names = new Set(this.receipts().map((r) => r.pharmacyName).filter(Boolean) as string[]);
    return [...names];
  }

  filtered(): PortalReceiptListItem[] {
    const q = this.search().trim().toLowerCase();
    const from = this.dateFrom();
    const to = this.dateTo();

    return this.receipts().filter((r) => {
      if (q && !r.invoiceNumber.toLowerCase().includes(q)) return false;
      if (this.pharmacyFilter() && r.pharmacyName !== this.pharmacyFilter()) return false;
      if (from && r.createdAt.slice(0, 10) < from) return false;
      if (to && r.createdAt.slice(0, 10) > to) return false;
      return true;
    });
  }

  paged(): PortalReceiptListItem[] {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE));
  }

  setPage(p: number): void {
    this.page.set(Math.min(Math.max(1, p), this.totalPages()));
  }

  resetFilters(): void {
    this.search.set('');
    this.pharmacyFilter.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.page.set(1);
  }
}