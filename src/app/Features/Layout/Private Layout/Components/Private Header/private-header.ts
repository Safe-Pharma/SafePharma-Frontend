import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthSessionService } from '../../../../../Core/Services/auth-session.service';
import { PharmacySettings as PharmacySettingsService } from '../../../../settings/pharmacy-settings/Services/pharmacy-settings';
import { I18nService } from '../../../../../Core/Services/i18n.service';
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
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  readonly pharmacyName = computed(() => {
    const settingsName = this.pharmacySettings.settings()?.name?.trim();
    if (settingsName) return settingsName;

    const tokenName = this.authSession.user()?.pharmacyName?.trim();
    return tokenName && !['Unknown Pharmacy', 'Pharmacy Name', 'PHARMACY ERP'].includes(tokenName)
      ? tokenName
      : null;
  });

  readonly lang = computed(() => this.i18n.lang().toUpperCase());
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

  pageTitle = signal('nav.dashboard');
  readonly breadcrumbs = signal<string[]>(['nav.dashboard']);

  searchTerm = '';

  readonly menuItems = [
    { key: 'nav.settings', route: '/app/settings' },
    { key: 'nav.profile', route: '/app/profile' },
    { key: 'nav.changePassword', route: '/app/change-password' },
  ];

  text(key: string): string { return this.i18n.text(key); }

  toggleLanguage(): void { this.i18n.toggle(); }

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
    const resolved = labels.length ? labels : ['nav.dashboard'];

    this.breadcrumbs.set(resolved);
    this.pageTitle.set(resolved[resolved.length - 1]);
  }

  private resolveSegmentLabel(segment: string, index: number): string {
    const labels: Record<string, string> = {
      dashboard: 'nav.dashboard', purchases: 'nav.purchases', inventory: 'nav.inventory', products: 'nav.medicines',
      taxes: 'nav.taxes', suppliers: 'nav.suppliers', customers: 'nav.customers', reports: 'nav.reports',
      users: 'nav.users', profile: 'nav.profile', settings: 'nav.settings', 'change-password': 'nav.changePassword',
      audit: 'nav.audit', pos: 'nav.pos', sales: 'nav.sales', finance: 'nav.finance', ap: 'nav.accountsPayable',
      ar: 'nav.accountsReceivable', invoices: 'nav.invoices', items: 'nav.items',
    };

    if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment) || /^\d+$/.test(segment)) {
      return index > 0 ? 'nav.details' : 'nav.dashboard';
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
