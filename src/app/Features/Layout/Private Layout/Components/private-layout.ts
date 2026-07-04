import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Sidebar } from './Sidebar/sidebar';
import { PrivateHeader } from './Private Header/private-header';
import { IdleTimerService } from '../../../../Core/Services/idle-timer.service';
import { IdleWarningModal } from "../../../../Core/Modal/idle-warning-modal/idle-warning-modal";
import { ToastComponent } from '../../../../Shared/Toasts/toast/toast';

@Component({
  selector: 'app-private-layout',
  standalone: true,
  imports: [RouterOutlet, Sidebar, PrivateHeader, IdleWarningModal, ToastComponent],
  templateUrl: './private-layout.html',
})
export class privatelayout implements OnInit, OnDestroy {
   private idleTimerService = inject(IdleTimerService);
  constructor(private router: Router) {}

    ngOnInit(): void {
    this.idleTimerService.start(() => this.onLogout());
  }

  ngOnDestroy(): void {
    this.idleTimerService.stop();
  }

  onLogout() {
    this.router.navigateByUrl('/login');
  }
}
