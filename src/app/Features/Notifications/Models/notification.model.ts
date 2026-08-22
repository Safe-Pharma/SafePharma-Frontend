export enum NotificationType {
  LowStock = 5,
  BatchExpiry90 = 1,
  BatchExpiry60 = 2,
  BatchExpiry30 = 3,
  BatchExpired = 4,
}

export enum NotificationPriority {
  Low = 1,
  Medium = 2,
  High = 3,
  Critical = 4,
}

export interface Notification {
  id: string;
  titleEn: string;
  titleAr: string;
  messageEn: string;
  messageAr: string;
  type: NotificationType;
  priority: NotificationPriority;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationCount {
  count: number;
}
