export type NotificationType = 'welcome' | 'role_change' | 'password_change';

export type NotificationModel = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

export function toNotificationModel(row: NotificationRow): NotificationModel {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    metadata: row.metadata ?? {},
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export type NotificationPushPayload = {
  title: string;
  body: string;
  tag: string;
  data: { notificationId: string; type: NotificationType };
};

export function toPushPayload(notification: NotificationModel): NotificationPushPayload {
  return {
    title: notification.title,
    body: notification.body,
    tag: notification.id,
    data: { notificationId: notification.id, type: notification.type },
  };
}

export function relativeTimeFrom(iso: string, now: number = Date.now()): string {
  const elapsed = now - new Date(iso).getTime();

  if (Number.isNaN(elapsed) || elapsed < 0) {
    return 'Just now';
  }

  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) {
    return 'Just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
