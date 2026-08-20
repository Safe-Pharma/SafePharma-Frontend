import { NotificationType } from '../Models/notification.model';

/**
 * Maps a notification type to an application route for click-through
 * navigation.
 *
 * I could not confirm the real inventory/batch routes from the files
 * shared with me, and the spec says not to invent routes. Every entry
 * below is intentionally commented out — the bell will still mark the
 * notification as read and update state, it just won't navigate until
 * you fill in the real paths from your routing config.
 */
export const NOTIFICATION_ROUTE_MAP: Partial<Record<NotificationType, string>> = {
  // NotificationType.LowStock: '/app/inventory/medicines',
  // NotificationType.BatchExpiry90: '/app/inventory/batches',
  // NotificationType.BatchExpiry60: '/app/inventory/batches',
  // NotificationType.BatchExpiry30: '/app/inventory/batches',
  // NotificationType.BatchExpired: '/app/inventory/batches',
};