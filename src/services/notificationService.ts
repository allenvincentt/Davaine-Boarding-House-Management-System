import {
  toNotificationModel,
  type NotificationModel,
  type NotificationRow,
} from '@/models/notificationModel';
import { supabase } from '@/services/supabaseClient';

const NOTIFICATION_LIMIT = 60;

const notificationsTable = () => supabase.from('notifications');

export async function fetchNotifications(userId: string): Promise<NotificationModel[]> {
  const { data, error } = await notificationsTable()
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(NOTIFICATION_LIMIT)
    .returns<NotificationRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(toNotificationModel);
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await notificationsTable()
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null);

  if (error) {
    throw new Error(error.message);
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await notificationsTable()
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    throw new Error(error.message);
  }
}

export function subscribeToNotifications(
  userId: string,
  handlers: {
    onInsert: (notification: NotificationModel) => void;
    onUpdate: (notification: NotificationModel) => void;
  },
): () => void {
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => handlers.onInsert(toNotificationModel(payload.new as NotificationRow)),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => handlers.onUpdate(toNotificationModel(payload.new as NotificationRow)),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
