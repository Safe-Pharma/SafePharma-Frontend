import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PortalApiService } from '../../Services/portal-api.service';
import { PortalAuthService } from '../../Services/portal-auth.service';
import { Toast } from '../../../../Shared/Toasts/toast';
import { getErrorMessage } from '../../../../Shared/utils/get-error-message';
import { PortalReceiptDetail, PortalReceiptListItem } from '../../Models/portal-sales.model';
import { PortalSkeleton } from '../../Shared/skeleton';
import { PortalEmptyStateComponent } from '../../Shared/empty-state';
import { PortalStatusBadge } from '../../Shared/status-badge';
import { receiptStatusLabel, receiptStatusTone } from '../../Shared/receipt-status';
import { fadeSlideIn, staggerList, listItem, dialogOverlay, dialogPanel, successPulse } from '../../Shared/portal-animations';
import {PortalSectionHeaderComponent  } from '../../Shared/portal-section-header.component';
import { PortalI18nService } from '../../Services/portal-i18n.service';

@Component({
  selector: 'app-receipt-details',
  standalone: true,
  imports: [DatePipe, DecimalPipe, PortalSkeleton, PortalEmptyStateComponent, PortalStatusBadge, PortalSectionHeaderComponent],
  templateUrl: './receipt-details.html',
    animations: [fadeSlideIn, staggerList, listItem, dialogOverlay, dialogPanel, successPulse],
})
export class ReceiptDetailsPage implements OnInit {
  private readonly api = inject(PortalApiService);
  private readonly portalAuth = inject(PortalAuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(Toast);
  readonly location = inject(Location);
    readonly i18n = inject(PortalI18nService);

  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly receipt = signal<PortalReceiptListItem | null>(null);
  receiptStatusLabel = receiptStatusLabel;
  receiptStatusTone = receiptStatusTone;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const customerId = this.portalAuth.session()?.customerId;
    if (!id || !customerId) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }

    // The portal spec doesn't define a dedicated GET /sales/{id}, so the detail is looked
    // up from the same aggregated list the Purchase History page fetches.
    this.loading.set(true);
    this.api.getPurchaseHistory().subscribe({
      next: (receipts) => {
        const found = receipts.find((r) => r.id === id) ?? null;
        this.receipt.set(found);
        this.notFound.set(!found);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notFound.set(true);
        this.toast.show(getErrorMessage(err, 'Could not load this receipt.'), 'error');
      },
    });
  }

  itemsSubtotal(): number {
    const r = this.receipt();
    if (!r) return 0;
    return r.items.reduce((sum, i) => sum + i.total, 0);
  }

  // The documented sales-list endpoint only guarantees grandTotal + items; these read the
  // richer PortalReceiptDetail fields if the backend happens to include them, and fall back
  // to a reasonable derived value otherwise so the screen never shows blank money fields.
  private asDetail(): Partial<PortalReceiptDetail> {
    return (this.receipt() as Partial<PortalReceiptDetail>) ?? {};
  }

  tax(): number {
    return this.asDetail().tax ?? 0;
  }

  discount(): number {
    return this.asDetail().discount ?? 0;
  }

  subtotal(): number {
    return this.asDetail().subtotal ?? this.itemsSubtotal();
  }

  paidAmount(): number {
    return this.asDetail().paidAmount ?? this.receipt()?.grandTotal ?? 0;
  }

  paymentMethod(): string {
    return this.asDetail().paymentMethod ?? '—';
  }
}