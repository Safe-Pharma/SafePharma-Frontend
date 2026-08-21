import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, Subject, catchError, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificationService } from '../../Services/notification.service';
import {
  Notification,
  NotificationPriority,
  NotificationType,
} from '../../Models/notification.model';
import { TimeAgoPipe } from '../../../../Shared/Pipes/Date/time-ago-pipe';
import { NOTIFICATION_ROUTE_MAP } from '../../Services/notification-route-map';
import { I18nService } from '../../../../Core/Services/i18n.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, TimeAgoPipe],
  templateUrl: './notification-bell.html',
})
export class NotificationBell {
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  protected readonly i18n = inject(I18nService);

  // Reads straight from the shared service signals — the count here is
  // the same instance driving the poll, so no separate subscription is
  // created just by mounting this component.
  readonly notifications = this.notificationService.notifications;
  readonly unreadCount = this.notificationService.unreadCount;
  readonly loading = this.notificationService.loading;

  readonly isOpen = signal(false);
  private readonly refreshOnOpen$ = new Subject<void>();

  readonly NotificationType = NotificationType;
  readonly NotificationPriority = NotificationPriority;

  constructor() {
    this.refreshOnOpen$
      .pipe(
        // A quick close/reopen should only keep the latest refresh. This
        // avoids an older response replacing newer notification data.
        switchMap(() =>
          this.notificationService.getAllNotifications().pipe(catchError(() => EMPTY)),
        ),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.isOpen.set(false);
    }
  }

  toggle(): void {
    const shouldOpen = !this.isOpen();
    this.isOpen.set(shouldOpen);

    if (shouldOpen) {
      // Always fetch on open so changes made on the backend are visible
      // immediately, even when the panel was opened earlier.
      this.refreshOnOpen$.next();
    }
  }

  onNotificationClick(notification: Notification): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe();
    }

    const route = NOTIFICATION_ROUTE_MAP[notification.type];
    if (route) {
      this.isOpen.set(false);
      this.router.navigateByUrl(route);
    }
  }

  onMarkAllAsRead(event: MouseEvent): void {
    event.stopPropagation();
    this.notificationService.markAllAsRead().subscribe();
  }

  priorityDotClass(priority: NotificationPriority): string {
    switch (priority) {
      case NotificationPriority.Critical:
        return 'bg-destructive';
      case NotificationPriority.High:
        return 'bg-orange-500';
      case NotificationPriority.Medium:
        return 'bg-yellow-500';
      default:
        return 'bg-muted-foreground';
    }
  }

  typeLabel(type: NotificationType): string {
    switch (type) {
      case NotificationType.LowStock:
        return this.i18n.text('notification.lowStock');
      case NotificationType.BatchExpiry90:
        return this.i18n.text('notification.expiry90');
      case NotificationType.BatchExpiry60:
        return this.i18n.text('notification.expiry60');
      case NotificationType.BatchExpiry30:
        return this.i18n.text('notification.expiry30');
      case NotificationType.BatchExpired:
        return this.i18n.text('notification.expired');
      default:
        return this.i18n.text('notification.generic');
    }
  }

  localizedTitle(notification: Notification): string {
    return this.i18n.lang() === 'ar' ? notification.titleAr || notification.titleEn : notification.titleEn;
  }

  localizedMessage(notification: Notification): string {
    return this.i18n.lang() === 'ar' ? notification.messageAr || notification.messageEn : notification.messageEn;
  }
}
