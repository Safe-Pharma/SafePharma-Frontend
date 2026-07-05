import { Injectable, NgZone, OnDestroy, signal } from '@angular/core';
import { fromEvent, merge, Subject, timer } from 'rxjs';
import { switchMap, takeUntil, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class IdleTimerService implements OnDestroy {
  private readonly idleTimeoutMs = 20 * 1000;   // 15 minutes of inactivity15 * 60 * 1000;
  private readonly warningLeadMs = 10 * 1000;         // show warning 60s before logout60 * 1000

  private readonly destroy$ = new Subject<void>();
  private readonly activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

  private warningTimerSub?: ReturnType<typeof setTimeout>;
  private logoutTimerSub?: ReturnType<typeof setTimeout>;

  isWarningVisible = signal(false);
  private loggedOutCallback: (() => void) | null = null;

  constructor(private zone: NgZone) {}

  /**
   * Call this once, after the user logs in, to start watching for inactivity.
   * onTimeout: the function to call when the idle period is fully exhausted.
   */
  start(onTimeout: () => void): void {
    this.loggedOutCallback = onTimeout;

    // Run outside Angular's zone so mousemove/scroll don't trigger change detection on every pixel
    this.zone.runOutsideAngular(() => {
      const activity$ = merge(...this.activityEvents.map(evt => fromEvent(document, evt)));

      activity$
        .pipe(
          tap(() => this.resetTimers()),
          takeUntil(this.destroy$)
        )
        .subscribe();

      this.resetTimers();
    });
  }

  /** Call this when the person clicks "Stay logged in" on the warning modal. */
  extendSession(): void {
    this.isWarningVisible.set(false);
    this.resetTimers();
  }

  stop(): void {
    this.clearTimers();
    this.destroy$.next();
  }

  private resetTimers(): void {
    this.clearTimers();

    this.warningTimerSub = setTimeout(() => {
      this.zone.run(() => this.isWarningVisible.set(true));
    }, this.idleTimeoutMs - this.warningLeadMs);

    this.logoutTimerSub = setTimeout(() => {
      this.zone.run(() => {
        this.isWarningVisible.set(false);
        this.loggedOutCallback?.();
      });
    }, this.idleTimeoutMs);
  }

  private clearTimers(): void {
    if (this.warningTimerSub) clearTimeout(this.warningTimerSub);
    if (this.logoutTimerSub) clearTimeout(this.logoutTimerSub);
  }

  ngOnDestroy(): void {
    this.stop();
  }
}