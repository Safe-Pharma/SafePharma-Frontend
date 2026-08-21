import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PortalApiService } from '../../Services/portal-api.service';
import { PortalAuthService } from '../../Services/portal-auth.service';
import { PortalI18nService } from '../../Services/portal-i18n.service';
import { Toast } from '../../../../Shared/Toasts/toast';
import { getErrorMessage } from '../../../../Shared/utils/get-error-message';
import { CustomerRelative } from '../../../Customer/Models/customer.model';
import { PortalSkeleton } from '../../Shared/skeleton';
import { PortalEmptyStateComponent } from '../../Shared/empty-state';
import { fadeSlideIn, staggerList, listItem } from '../../Shared/portal-animations';

@Component({
  selector: 'app-relatives',
  standalone: true,
  imports: [PortalSkeleton, PortalEmptyStateComponent],
  templateUrl: './relatives.html',
  animations: [fadeSlideIn, staggerList, listItem],
})
export class RelativesPage implements OnInit {
  private readonly api = inject(PortalApiService);
  private readonly portalAuth = inject(PortalAuthService);
  private readonly toast = inject(Toast);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly i18n = inject(PortalI18nService);

  readonly loading = signal(true);
  readonly relatives = signal<CustomerRelative[]>([]);
  readonly children = signal<CustomerRelative[]>([]);
  readonly childrenLoading = signal(false);

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.loadRelatives(params.get('customerId'));
    });
  }

  private loadRelatives(requestedCustomerId: string | null): void {
    const customerId = requestedCustomerId || this.portalAuth.session()?.customerId;
    if (!customerId) return;

    this.loading.set(true);

    const relativesRequest = requestedCustomerId
      ? this.api.getDependentRelatives(requestedCustomerId)
      : this.api.getRelatives();

    relativesRequest.subscribe({
      next: (relatives) => {
        this.relatives.set(relatives);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.show(getErrorMessage(err, this.i18n.t('toast.loadRelativesError')), 'error');
      },
    });

    this.loadChildren(customerId);
  }

  private loadChildren(customerId: string): void {
    this.childrenLoading.set(true);
    this.api.getChilds(customerId).subscribe({
      next: (children) => {
        this.children.set(children);
        this.childrenLoading.set(false);
      },
      error: () => {
        this.children.set([]);
        this.childrenLoading.set(false);
      },
    });
  }

  openChildProfile(childId: string): void {
    this.router.navigate(['/portal/profile'], { queryParams: { customerId: childId } });
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  // Stub: no pharmacy-locator feature exists yet. Swap this for real navigation
  // once that feature ships, e.g. this.router.navigate(['/portal/pharmacies']).
  // Toast.show() only supports 'success' | 'error' (no 'info' variant), so this
  // just omits the type and takes whatever the default styling is.
  findPharmacy(): void {
    this.toast.show(this.i18n.t('relatives.findPharmacyComingSoon'));
  }
}
