import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { fromEvent, merge, Subject, takeUntil, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class IdleTimerService implements OnDestroy {
  private readonly idleTimeoutMs = 20*1000; // 8 hours8 * 60 * 60 * 1000

  private readonly destroy$ = new Subject<void>();
  private readonly activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

  private logoutTimer?: ReturnType<typeof setTimeout>;
  private loggedOutCallback: (() => void) | null = null;

  constructor(private zone: NgZone) {}

  start(onTimeout: () => void): void {
    this.loggedOutCallback = onTimeout;

    this.zone.runOutsideAngular(() => {
      const activity$ = merge(...this.activityEvents.map(evt => fromEvent(document, evt)));

      activity$
        .pipe(
          tap(() => this.resetTimer()),
          takeUntil(this.destroy$)
        )
        .subscribe();

      this.resetTimer();
    });
  }

  stop(): void {
    this.clearTimer();
    this.destroy$.next();
  }

  private resetTimer(): void {
    this.clearTimer();

    this.logoutTimer = setTimeout(() => {
      this.zone.run(() => this.loggedOutCallback?.());
    }, this.idleTimeoutMs);
  }

  private clearTimer(): void {
    if (this.logoutTimer) clearTimeout(this.logoutTimer);
  }

  ngOnDestroy(): void {
    this.stop();
  }
}