import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SafeHtmlPipe } from '../../../../Shared/Pipes/safe-html.pipe';
import { PortalAuthService } from '../../Services/portal-auth.service';
import { PortalI18nService } from '../../Services/portal-i18n.service';

const ICONS = {
  dashboard: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4.5 w-4.5"><rect width="7" height="9" x="3" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="12" rx="1"></rect><rect width="7" height="5" x="3" y="16" rx="1"></rect></svg>`,
  profile: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4.5 w-4.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
  purchases: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4.5 w-4.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`,
  relatives: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4.5 w-4.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
};

@Component({
  selector: 'portal-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, SafeHtmlPipe],
  templateUrl: './portal-sidebar.html',
})
export class PortalSidebar implements OnInit {
  readonly i18n = inject(PortalI18nService);
  readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  readonly portalAuth = inject(PortalAuthService);
  readonly icons = ICONS;
  readonly isChildView = signal(false);

  @Input() mobileOpen = false;
  @Output() closeMobile = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const requestedCustomerId = params.get('customerId');
      const parentCustomerId = this.portalAuth.session()?.customerId;
      this.isChildView.set(
        Boolean(
          requestedCustomerId && parentCustomerId && requestedCustomerId !== parentCustomerId,
        ),
      );
    });
  }

  get navItems() {
    const childId = this.isChildView()
      ? this.route.snapshot.queryParamMap.get('customerId')
      : undefined;
    const queryParams = childId ? { customerId: childId } : undefined;

    return [
      {
        label: 'nav.dashboard',
        route: '/portal/dashboard',
        queryParams,
        icon: ICONS.dashboard,
        exact: true,
      },
      { label: 'nav.profile', route: '/portal/profile', queryParams, icon: ICONS.profile },
      { label: 'nav.purchases', route: '/portal/purchases', queryParams, icon: ICONS.purchases },
      { label: 'nav.relatives', route: '/portal/relatives', queryParams, icon: ICONS.relatives },
    ];
  }

  handleBottomAction(): void {
    if (this.isChildView()) {
      this.router.navigate(['/portal/profile']);
      return;
    }

    this.logout.emit();
  }
}
