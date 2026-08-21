import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Sidebar } from './Sidebar/sidebar';
import { PrivateHeader } from './Private Header/private-header';
import { IdleTimerService } from '../../../../Core/Services/idle-timer.service';
import { IdleWarningModal } from "../../../../Core/Modal/idle-warning-modal/idle-warning-modal";
import { ToastComponent } from '../../../../Shared/Toasts/toast/toast';
import { AuthSessionService } from '../../../../Core/Services/auth-session.service';
import { I18nService } from '../../../../Core/Services/i18n.service';

@Component({
  selector: 'app-private-layout',
  standalone: true,
  imports: [RouterOutlet, Sidebar, PrivateHeader, IdleWarningModal, ToastComponent],
  templateUrl: './private-layout.html',
})
export class privatelayout implements OnInit, OnDestroy {
  private idleTimerService = inject(IdleTimerService);
  readonly authSession = inject(AuthSessionService);
  readonly mobileSidebarOpen = signal(false);
  private desktopMediaQuery?: MediaQueryList;
  private readonly onDesktopBreakpointChange = (event: MediaQueryListEvent): void => {
    if (event.matches) this.closeMobileSidebar();
  };
  constructor(private router: Router, private i18n: I18nService) {}

  ngOnInit(): void {
    if (!this.authSession.ensureSession()) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.i18n.initializeForCurrentSession();

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this.desktopMediaQuery = window.matchMedia('(min-width: 1024px)');
      this.desktopMediaQuery.addEventListener('change', this.onDesktopBreakpointChange);
    }

    this.idleTimerService.start(() => this.onLogout());
  }

  ngOnDestroy(): void {
    this.desktopMediaQuery?.removeEventListener('change', this.onDesktopBreakpointChange);
    this.idleTimerService.stop();
  }

  onLogout() {
    this.closeMobileSidebar();
    this.authSession.clearToken();
    this.i18n.clearSession();
    this.router.navigateByUrl('/login');
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen.update((open) => !open);
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen.set(false);
  }
}
