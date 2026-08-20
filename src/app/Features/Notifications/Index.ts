/**
 * Public API of the notifications feature.
 */

export { NotificationBell } from './Components/notification-bell/notification-bell';
export { NotificationService } from './Services/notification.service';

export type {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationCount,
} from './Models/notification.model';