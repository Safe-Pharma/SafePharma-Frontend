import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { I18nService } from '../../Core/Services/i18n.service';

interface OwnerNavItem {
  label: string;
  route: string;
  exact?: boolean;
  icon: 'dashboard' | 'payments';
}

@Component({
  selector: 'app-owner-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './owner-sidebar.html',
  styleUrl: './owner-sidebar.css',
})
export class OwnerSidebar {
  protected readonly i18n = inject(I18nService);

  @Input({ required: true }) open = false;
  @Output() readonly closed = new EventEmitter<void>();

  readonly navItems: OwnerNavItem[] = [
    { label: 'ownerDashboard.title', route: '/owner-dashboard', exact: true, icon: 'dashboard' },
    {
      label: 'ownerPaymentVerifications.title',
      route: '/owner-dashboard/payment-verifications',
      icon: 'payments',
    },
  ];

  text(key: string): string {
    return this.i18n.text(key);
  }

  close(): void {
    this.closed.emit();
  }
}
