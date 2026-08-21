import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, catchError, map, switchMap, tap, timer } from 'rxjs';
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
  private readonly apiRoot = environment.apiUrl.replace(/\/+$/, '');
  // The backend notification controller is exposed at /api/Notification.
  // Do not add /v1/notifications here: that route is not registered by the API.
  private readonly baseUrl = `${this.apiRoot}/Notification`;

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
        switchMap(() => this.getUnreadNotificationCount().pipe(catchError(() => EMPTY))),
        takeUntilDestroyed(),
      )
      .subscribe(count => this.unreadCountState.set(count));
  }

  getAllNotifications(): Observable<GeneralResult<Notification[]>> {
    this.loadingState.set(true);
    return this.getNotificationCollection().pipe(
      map(response => this.normalizeNotificationsResponse(response)),
      tap({
        next: response => {
          if (Array.isArray(response.data)) {
            this.notificationsState.set(response.data);
          }
          this.loadingState.set(false);
        },
        error: () => this.loadingState.set(false),
      })
    );
  }

  private getNotificationCollection(): Observable<unknown> {
    // The documented GET endpoint returns the notification collection and
    // applies the authenticated user's visibility rules server-side.
    return this.http.get<unknown>(this.baseUrl);
  }

  private getUnreadNotificationCount(): Observable<number> {
    return this.http
      .get<GeneralResult<NotificationCount>>(`${this.baseUrl}/unread-count`)
      .pipe(map(response => response?.data?.count ?? 0));
  }

  private normalizeNotificationsResponse(response: unknown): GeneralResult<Notification[]> {
    if (Array.isArray(response)) {
      return { success: true, message: '', errors: null, data: response as Notification[] };
    }

    const payload = (response ?? {}) as Partial<GeneralResult<unknown>> & {
      items?: Notification[];
      notifications?: Notification[];
    };
    const candidate = payload.data as unknown;
    const nestedData = (candidate as { data?: unknown } | null)?.data;
    const data = Array.isArray(candidate)
      ? candidate
      : Array.isArray(nestedData)
        ? nestedData
      : Array.isArray(payload.items)
        ? payload.items
        : Array.isArray(payload.notifications)
          ? payload.notifications
          : [];

    return {
      success: payload.success ?? true,
      message: payload.message ?? '',
      errors: payload.errors ?? null,
      data,
    };
  }

  getUnreadCount(): Observable<GeneralResult<NotificationCount>> {
    return this.getUnreadNotificationCount().pipe(
      map(count => {
        this.unreadCountState.set(count);
        return { success: true, message: '', errors: null, data: { count } };
      }),
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
