/**
 * ASSUMPTION: numeric enum values match backend declaration order as
 * listed in the spec (LowStock, BatchExpiry90, BatchExpiry60,
 * BatchExpiry30, BatchExpired / Low, Medium, High, Critical).
 * Confirm against the .NET enum definitions and adjust if they differ.
 */
export enum NotificationType {
  LowStock = 0,
  BatchExpiry90 = 1,
  BatchExpiry60 = 2,
  BatchExpiry30 = 3,
  BatchExpired = 4,
}

export enum NotificationPriority {
  Low = 0,
  Medium = 1,
  High = 2,
  Critical = 3,
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationCount {
  count: number;
}