import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
} from '@angular/router';
import { filter } from 'rxjs/operators';
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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly pharmacyName =
    this.authSession.user()?.pharmacyName ?? 'Pharmacy Name';

  readonly lang: 'EN' | 'AR' = 'EN';
  readonly hasUnreadNotifications = true;
  readonly userMenuOpen = signal(false);
  readonly user = this.authSession.user;

  pageTitle = signal('Dashboard');

  searchTerm = '';

  readonly menuItems = [
    { label: 'Preferences', route: '/app/settings' },
    { label: 'Profile', route: '/app/profile' },
    { label: 'Change Password', route: '/app/change-password' },
  ];

  constructor() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        let current = this.route;

        while (current.firstChild) {
          current = current.firstChild;
        }

        this.pageTitle.set(current.snapshot.data['title'] ?? 'Dashboard');
      });
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update(value => !value);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }
}