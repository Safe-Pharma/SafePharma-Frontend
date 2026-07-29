import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { PortalI18nService } from '../../Services/portal-i18n.service';
import { PortalAuthService } from '../../Services/portal-auth.service';
import { PortalApiService } from '../../Services/portal-api.service';

@Component({
  selector: 'portal-topbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './portal-topbar.html',
})
export class PortalTopbar {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(PortalApiService);
  readonly i18n = inject(PortalI18nService);
  readonly portalAuth = inject(PortalAuthService);

  @Input() title = '';
  @Output() openMobileNav = new EventEmitter<void>();

  readonly displayName = signal('');
  readonly displayInitials = signal('');

  constructor() {
    this.syncDisplayIdentity();

    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.syncDisplayIdentity();
    });
  }

  private syncDisplayIdentity(): void {
    const session = this.portalAuth.session();
    const customerId = this.readCustomerIdFromRoute();

    if (!customerId || customerId === session?.customerId) {
      this.displayName.set(session?.name ?? '');
      this.displayInitials.set(session?.initials ?? '');
      return;
    }

    this.api.getDependentProfile(customerId).subscribe({
      next: (customer) => {
        const name = customer?.name ?? session?.name ?? '';
        this.displayName.set(name);
        this.displayInitials.set(this.buildInitials(name));
      },
      error: () => {
        this.displayName.set(session?.name ?? '');
        this.displayInitials.set(session?.initials ?? '');
      },
    });
  }

  private readCustomerIdFromRoute(): string | null {
    let current: ActivatedRoute | null = this.route;

    while (current) {
      const customerId = current.snapshot?.queryParamMap?.get('customerId');
      if (customerId) {
        return customerId;
      }
      current = current.firstChild;
    }

    return null;
  }

  private buildInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
    return initials || 'P';
  }
}