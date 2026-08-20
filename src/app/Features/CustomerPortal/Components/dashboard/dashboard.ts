import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { EgpCurrencyPipe } from '../../../../Shared/Pipes/egp-currency.pipe';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PortalApiService } from '../../Services/portal-api.service';
import { PortalAuthService } from '../../Services/portal-auth.service';
import { PortalI18nService } from '../../Services/portal-i18n.service';
import { Toast } from '../../../../Shared/Toasts/toast';
import { getErrorMessage } from '../../../../Shared/utils/get-error-message';
import { PortalStatCard } from '../../Shared/stat-card';
import { PortalSkeleton } from '../../Shared/skeleton';
import { PortalEmptyStateComponent } from '../../Shared/empty-state';
import { PortalStatusBadge } from '../../Shared/status-badge';
import { Customer, CustomerAllergy, CustomerChronicCondition } from '../../../Customer/Models/customer.model';
import { PortalReceiptListItem } from '../../Models/portal-sales.model';
import { receiptStatusTone, receiptStatusLabel } from '../../Shared/receipt-status';
import { fadeSlideIn, staggerList, listItem, dialogOverlay, dialogPanel, successPulse } from '../../Shared/portal-animations';


const ICONS = {
  purchases: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`,
  receipts: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M14 2v6h6"></path><path d="M4 22h16a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"></path><path d="M2 15h10"></path><path d="m9 18 3-3-3-3"></path></svg>`,
  chronic: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42Z"></path></svg>`,
  allergies: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M12 22c6-4 8-8 8-12A8 8 0 0 0 4 10c0 4 2 8 8 12Z"></path></svg>`,
};

@Component({
  selector: 'app-portal-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, EgpCurrencyPipe, PortalStatCard, PortalSkeleton, PortalEmptyStateComponent, PortalStatusBadge],
  templateUrl: './dashboard.html',
    animations: [fadeSlideIn, staggerList, listItem, dialogOverlay, dialogPanel, successPulse],

})
export class PortalDashboard implements OnInit {
  private readonly api = inject(PortalApiService);
  private readonly portalAuth = inject(PortalAuthService);
  private readonly toast = inject(Toast);
  private readonly route = inject(ActivatedRoute);
  readonly i18n = inject(PortalI18nService);

  readonly icons = ICONS;
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly profile = signal<Customer | null>(null);
  readonly chronicConditions = signal<CustomerChronicCondition[]>([]);
  readonly allergies = signal<CustomerAllergy[]>([]);
  readonly receipts = signal<PortalReceiptListItem[]>([]);

  readonly recentReceipts = () => this.receipts().slice(0, 5);
  readonly recentMedicines = () =>
    [...this.receipts()]
      .flatMap((r) => r.items.map((item) => ({ ...item, purchasedAt: r.createdAt })))
      .slice(0, 5);

  receiptStatusTone = receiptStatusTone;
  receiptStatusLabel = receiptStatusLabel;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const sessionCustomerId = this.portalAuth.session()?.customerId;
    const requestedCustomerId = this.route.snapshot.queryParamMap.get('customerId');
    const customerId = requestedCustomerId || sessionCustomerId;
    if (!customerId) return;

    this.loading.set(true);
    this.error.set(false);

    const isDependentView = !!requestedCustomerId && requestedCustomerId !== sessionCustomerId;

    forkJoin({
      profile: isDependentView ? this.api.getDependentProfile(customerId) : this.api.getProfile(),
      chronicConditions: isDependentView
        ? this.api.getDependentChronicConditions(customerId)
        : this.api.getChronicConditions(),
      allergies: isDependentView ? this.api.getDependentAllergies(customerId) : this.api.getAllergies(),
      receipts: isDependentView ? this.api.getPurchaseHistory(customerId) : this.api.getPurchaseHistory(),
    }).subscribe({
      next: ({ profile, chronicConditions, allergies, receipts }) => {
        this.profile.set(profile);
        this.chronicConditions.set(chronicConditions);
        this.allergies.set(allergies);
        this.receipts.set([...receipts].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
        this.loading.set(false);
        if (profile.name) this.portalAuth.updateDisplayName(profile.name);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(true);
        this.toast.show(getErrorMessage(err, 'Could not load your dashboard.'), 'error');
      },
    });
  }

  totalReceiptsValue(): number {
    return this.receipts().reduce((sum, r) => sum + r.grandTotal, 0);
  }
}
