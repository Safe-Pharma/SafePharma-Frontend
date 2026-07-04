import { Component, inject } from '@angular/core';
import { IdleTimerService } from '../../Services/idle-timer.service';

@Component({
  selector: 'app-idle-warning-modal',
  standalone: true,
  templateUrl: './idle-warning-modal.html',
})
export class IdleWarningModal {
  idleTimerService = inject(IdleTimerService);
}