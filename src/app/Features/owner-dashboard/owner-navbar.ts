import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { I18nService } from '../../Core/Services/i18n.service';
import { AuthSessionService } from '../../Core/Services/auth-session.service';
import { NotificationBell } from '../Notifications/Index';

@Component({
  selector: 'app-owner-navbar',
  standalone: true,
  imports: [NotificationBell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './owner-navbar.html',
})
export class OwnerNavbar {
  private readonly authSession = inject(AuthSessionService);
  protected readonly i18n = inject(I18nService);

  readonly user = this.authSession.user;
  readonly languageLabel = computed(() => this.i18n.lang().toUpperCase());
  readonly userMenuOpen = signal(false);

  @Output() readonly menuToggle = new EventEmitter<void>();
  @Output() readonly logout = new EventEmitter<void>();

  text(key: string): string {
    return this.i18n.text(key);
  }

  toggleLanguage(): void {
    this.i18n.toggle();
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  emitLogout(): void {
    this.closeUserMenu();
    this.logout.emit();
  }
}
