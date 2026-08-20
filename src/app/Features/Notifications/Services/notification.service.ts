import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { EMPTY, Observable, catchError, switchMap, tap, timer } from 'rxjs';
import { environment } from '../../../../environments/environment';
// ASSUMPTION: GeneralResult lives at Core/Models/general-result.model.ts —
// point this at wherever it actually is in your project.
import { GeneralResult } from '../../../Core/Models/general-result.model';
import { Notification, NotificationCount } from '../Models/notification.model';

const POLL_INTERVAL_MS = 30000;

/**
 * ASSUMPTION: environment.apiUrl exists (e.g. environments/environment.ts
 * exporting `apiUrl: 'https://.../api'`). Point this at whatever your
 * existing API services actually import.
 *
 * ASSUMPTION: the existing HttpClient is already wired to an auth
 * interceptor that attaches the JWT, so no auth header handling happens
 * here — this mirrors what every other API service in the project should
 * already be doing.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/Notification`;

  private readonly notificationsState = signal<Notification[]>([]);
  private readonly unreadCountState = signal<number>(0);
  private readonly loadingState = signal<boolean>(false);

  readonly notifications = this.notificationsState.asReadonly();
  readonly unreadCount = this.unreadCountState.asReadonly();
  readonly loading = this.loadingState.asReadonly();

  private pollingStarted = false;

  constructor() {
    // NotificationService is `providedIn: 'root'`, so Angular creates
    // exactly one instance for the whole app lifetime. Starting the poll
    // here — rather than from a component's ngOnInit — means it fires
    // once no matter how many times the bell (or anything else) injects
    // this service or gets destroyed/recreated.
    this.startPolling();
  }

  private startPolling(): void {
    if (this.pollingStarted) {
      return;
    }
    this.pollingStarted = true;

    timer(0, POLL_INTERVAL_MS)
      .pipe(
        // switchMap cancels any in-flight request before starting the
        // next tick, so slow responses can never overlap with the next
        // poll and pile up concurrent HTTP calls.
        switchMap(() =>
          this.http
            .get<GeneralResult<NotificationCount>>(`${this.baseUrl}/unread-count`)
            .pipe(
              // Swallow errors into EMPTY (not re-thrown) so a single
              // failed request doesn't kill the timer — polling keeps
              // going on the next tick.
              catchError(() => EMPTY)
            )
        )
      )
      .subscribe(response => {
        if (response?.success && response.data) {
          this.unreadCountState.set(response.data.count);
        }
      });
  }

  getAllNotifications(): Observable<GeneralResult<Notification[]>> {
    this.loadingState.set(true);
    return this.http.get<GeneralResult<Notification[]>>(this.baseUrl).pipe(
      tap({
        next: response => {
          if (response?.success && response.data) {
            this.notificationsState.set(response.data);
          }
          this.loadingState.set(false);
        },
        error: () => this.loadingState.set(false),
      })
    );
  }

  getUnreadCount(): Observable<GeneralResult<NotificationCount>> {
    return this.http
      .get<GeneralResult<NotificationCount>>(`${this.baseUrl}/unread-count`)
      .pipe(
        tap(response => {
          if (response?.success && response.data) {
            this.unreadCountState.set(response.data.count);
          }
        })
      );
  }

  markAsRead(notificationId: string): Observable<GeneralResult<null>> {
    return this.http
      .patch<GeneralResult<null>>(`${this.baseUrl}/${notificationId}/read`, {})
      .pipe(
        tap(response => {
          if (response?.success) {
            this.applyMarkAsReadLocally(notificationId);
          }
        })
      );
  }

  markAllAsRead(): Observable<GeneralResult<null>> {
    return this.http
      .patch<GeneralResult<null>>(`${this.baseUrl}/read-all`, {})
      .pipe(
        tap(response => {
          if (response?.success) {
            this.applyMarkAllAsReadLocally();
          }
        })
      );
  }

  private applyMarkAsReadLocally(notificationId: string): void {
    let wasUnread = false;

    this.notificationsState.update(list =>
      list.map(notification => {
        if (notification.id === notificationId && !notification.isRead) {
          wasUnread = true;
          return { ...notification, isRead: true };
        }
        return notification;
      })
    );

    if (wasUnread) {
      this.unreadCountState.update(count => Math.max(0, count - 1));
    }
  }

  private applyMarkAllAsReadLocally(): void {
    this.notificationsState.update(list =>
      list.map(notification => ({ ...notification, isRead: true }))
    );
    this.unreadCountState.set(0);
  }
}