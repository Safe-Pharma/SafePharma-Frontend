import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Sidebar } from './Sidebar/sidebar';
import { PrivateHeader } from './Private Header/private-header';
import { IdleTimerService } from '../../../../Core/Services/idle-timer.service';
import { IdleWarningModal } from "../../../../Core/Modal/idle-warning-modal/idle-warning-modal";
import { ToastComponent } from '../../../../Shared/Toasts/toast/toast';
import { AuthSessionService } from '../../../../Core/Services/auth-session.service';

@Component({
  selector: 'app-private-layout',
  standalone: true,
  imports: [RouterOutlet, Sidebar, PrivateHeader, IdleWarningModal, ToastComponent],
  templateUrl: './private-layout.html',
})
export class privatelayout implements OnInit, OnDestroy {
  private idleTimerService = inject(IdleTimerService);
  readonly authSession = inject(AuthSessionService);
  constructor(private router: Router) {}

  ngOnInit(): void {
    if (!this.authSession.ensureSession()) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.idleTimerService.start(() => this.onLogout());
  }

  ngOnDestroy(): void {
    this.idleTimerService.stop();
  }

  onLogout() {
    this.authSession.clearToken();
    this.router.navigateByUrl('/login');
  }
}
