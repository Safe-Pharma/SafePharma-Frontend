import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthSessionService } from '../../../../../Core/Services/auth-session.service';

export interface Breadcrumb {
  label: string;
  active?: boolean;
}

@Component({
  selector: 'app-Private-Header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './private-header.html',
})
export class PrivateHeader {
  private readonly authSession = inject(AuthSessionService);

  readonly pharmacyName = 'MediRx Pharmacy';
  readonly breadcrumbs: Breadcrumb[] = [{ label: 'Dashboard', active: true }];
  readonly lang: 'EN' | 'AR' = 'EN';
  readonly hasUnreadNotifications = true;
  readonly userMenuOpen = signal(false);
  readonly user = this.authSession.user;

  searchTerm = '';

  readonly menuItems = [
    { label: 'Preferences', route: '/app/settings' },
    { label: 'Profile', route: '/app/profile' },
    { label: 'Change Password', route: '/app/change-password' },
  ];

  toggleUserMenu(): void {
    this.userMenuOpen.update(value => !value);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }
}
