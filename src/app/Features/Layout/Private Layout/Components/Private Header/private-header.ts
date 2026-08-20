import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthSessionService } from '../../../../../Core/Services/auth-session.service';
import { PharmacySettings as PharmacySettingsService } from '../../../../settings/pharmacy-settings/Services/pharmacy-settings';
import { UserLanguage } from '../../../../settings/pharmacy-settings/Services/user-language';
// ASSUMPTION: Features/ sits at the same depth as Core/ from this file.
// Adjust the relative path if your actual folder layout differs.
// Import from the feature's barrel (index.ts), not its internal files.
import { NotificationBell } from '../../../../Notifications/Index';

export interface Breadcrumb {
  label: string;
  active?: boolean;
}

@Component({
  selector: 'app-Private-Header',
  standalone: true,
  imports: [CommonModule, RouterLink, NotificationBell],
  templateUrl: './private-header.html',
})
export class PrivateHeader {
  private readonly authSession = inject(AuthSessionService);
  private readonly pharmacySettings = inject(PharmacySettingsService);
  private readonly userLanguage = inject(UserLanguage);
  private readonly router = inject(Router);

  readonly pharmacyName = computed(() => {
    const settingsName = this.pharmacySettings.settings()?.name?.trim();
    if (settingsName) return settingsName;

    const tokenName = this.authSession.user()?.pharmacyName?.trim();
    return tokenName && !['Unknown Pharmacy', 'Pharmacy Name', 'PHARMACY ERP'].includes(tokenName)
      ? tokenName
      : null;
  });

  readonly lang = computed(() => this.userLanguage.language().toUpperCase());
  readonly userMenuOpen = signal(false);
  readonly user = this.authSession.user;
  private readonly failedLogoUrl = signal<string | null>(null);
  readonly pharmacyLogo = computed(() => {
    const previewUrl = this.pharmacySettings.logoPreview();
    if (previewUrl !== undefined) return previewUrl;

    const logoUrl = this.pharmacySettings.settings()?.logoUrl?.trim();
    return logoUrl && logoUrl !== 'null' && logoUrl !== this.failedLogoUrl() ? logoUrl : null;
  });

  @Output() readonly menuToggle = new EventEmitter<void>();

  pageTitle = signal('Dashboard');
  readonly breadcrumbs = signal<string[]>(['Dashboard']);

  searchTerm = '';

  readonly menuItems = [
    { label: 'Preferences', route: '/app/settings' },
    { label: 'Profile', route: '/app/profile' },
    { label: 'Change Password', route: '/app/change-password' },
  ];

  constructor() {
    this.pharmacySettings.ensureLoaded();
    this.updateRouteContext(this.router.url);
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(event => this.updateRouteContext(event.urlAfterRedirects));
  }

  private updateRouteContext(url: string): void {
    const routeSegments = url
      .split(/[?#]/, 1)[0]
      .split('/')
      .filter(Boolean);
    const appIndex = routeSegments.indexOf('app');
    const appSegments = appIndex >= 0 ? routeSegments.slice(appIndex + 1) : routeSegments;
    const labels = appSegments
      .map((segment, index) => this.resolveSegmentLabel(segment, index))
      .filter(Boolean);
    const resolved = labels.length ? labels : ['Dashboard'];

    this.breadcrumbs.set(resolved);
    this.pageTitle.set(resolved[resolved.length - 1]);
  }

  private resolveSegmentLabel(segment: string, index: number): string {
    const labels: Record<string, string> = {
      dashboard: 'Dashboard',
      purchases: 'Purchases',
      inventory: 'Inventory',
      products: 'Medicines',
      taxes: 'Taxes',
      suppliers: 'Suppliers',
      customers: 'Customers',
      reports: 'Reports',
      users: 'Users',
      profile: 'Profile',
      settings: 'Settings',
      'change-password': 'Change Password',
      audit: 'Audit History',
      pos: 'POS',
      sales: 'Sales',
      finance: 'Finance',
      ap: 'Accounts Payable',
      ar: 'Accounts Receivable',
      invoices: 'Invoices',
      items: 'Items',
    };

    if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment) || /^\d+$/.test(segment)) {
      return index > 0 ? 'Details' : 'Dashboard';
    }

    if (labels[segment]) return labels[segment];

    return segment
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, character => character.toUpperCase());
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update(value => !value);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  onLogoError(url: string): void {
    this.failedLogoUrl.set(url);
  }
}
