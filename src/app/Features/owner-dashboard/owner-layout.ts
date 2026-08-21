import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthSessionService } from '../../Core/Services/auth-session.service';
import { I18nService } from '../../Core/Services/i18n.service';
import { OwnerNavbar } from './owner-navbar';
import { OwnerSidebar } from './owner-sidebar';

@Component({
  selector: 'app-owner-layout',
  standalone: true,
  imports: [RouterOutlet, OwnerNavbar, OwnerSidebar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './owner-layout.html',
  styleUrl: './owner-layout.css',
})
export class OwnerLayout {
  protected readonly i18n = inject(I18nService);

  private readonly router = inject(Router);
  private readonly authSession = inject(AuthSessionService);

  /** The only responsive navigation state in the Owner portal. */
  readonly sidebarOpen = signal(false);

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  logout(): void {
    this.closeSidebar();
    this.authSession.clearToken();
    this.router.navigateByUrl('/owner-login');
  }
}
