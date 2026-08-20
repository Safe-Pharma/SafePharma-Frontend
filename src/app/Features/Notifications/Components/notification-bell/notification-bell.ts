import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../../Services/notification.service';
import {
  Notification,
  NotificationPriority,
  NotificationType,
} from '../../Models/notification.model';
import { TimeAgoPipe } from '../../../../Shared/Pipes/Date/time-ago-pipe';
import { NOTIFICATION_ROUTE_MAP } from '../../Services/notification-route-map';

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

  // Reads straight from the shared service signals — the count here is
  // the same instance driving the poll, so no separate subscription is
  // created just by mounting this component.
  readonly notifications = this.notificationService.notifications;
  readonly unreadCount = this.notificationService.unreadCount;
  readonly loading = this.notificationService.loading;

  readonly isOpen = signal(false);
  private hasLoadedList = false;

  readonly NotificationType = NotificationType;
  readonly NotificationPriority = NotificationPriority;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.isOpen.set(false);
    }
  }

  toggle(): void {
    this.isOpen.update(open => !open);

    // Fetch the full list lazily, only the first time the panel opens —
    // the unread count itself is already kept live by the background poll.
    if (this.isOpen() && !this.hasLoadedList) {
      this.hasLoadedList = true;
      this.notificationService.getAllNotifications().subscribe();
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
        return 'Low Stock';
      case NotificationType.BatchExpiry90:
        return 'Expiring in 90 days';
      case NotificationType.BatchExpiry60:
        return 'Expiring in 60 days';
      case NotificationType.BatchExpiry30:
        return 'Expiring in 30 days';
      case NotificationType.BatchExpired:
        return 'Batch Expired';
      default:
        return 'Notification';
    }
  }
}