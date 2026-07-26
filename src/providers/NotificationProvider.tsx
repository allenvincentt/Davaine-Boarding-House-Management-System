import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { NotificationModel } from '@/models/notificationModel';
import { useAuth } from '@/providers/AuthProvider';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from '@/services/notificationService';
import {
  ensureSystemPushPermission,
  isSystemPushSupported,
  presentSystemPush,
} from '@/services/pushNotificationService';

type NotificationContextValue = {
  notifications: NotificationModel[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  enableSystemPush: () => Promise<boolean>;
  systemPushSupported: boolean;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const [notifications, setNotifications] = useState<NotificationModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  const load = useCallback(async (targetUserId: string) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchNotifications(targetUserId);
      if (activeRef.current) {
        setNotifications(rows);
      }
    } catch (loadError) {
      if (activeRef.current) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load notifications.');
      }
    } finally {
      if (activeRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setError(null);
      setLoading(false);
      return;
    }

    load(userId);

    const unsubscribe = subscribeToNotifications(userId, {
      onInsert: (notification) => {
        setNotifications((current) =>
          current.some((item) => item.id === notification.id)
            ? current
            : [notification, ...current],
        );
        presentSystemPush(notification.title, notification.body, notification.id);
      },
      onUpdate: (notification) => {
        setNotifications((current) =>
          current.map((item) => (item.id === notification.id ? notification : item)),
        );
      },
    });

    return unsubscribe;
  }, [userId, load]);

  const markRead = useCallback(async (id: string) => {
    const stamp = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) => (item.id === id && !item.readAt ? { ...item, readAt: stamp } : item)),
    );

    try {
      await markNotificationRead(id);
    } catch (updateError) {
      if (activeRef.current) {
        setError(updateError instanceof Error ? updateError.message : 'Unable to update notification.');
      }
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) {
      return;
    }

    const stamp = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) => (item.readAt ? item : { ...item, readAt: stamp })),
    );

    try {
      await markAllNotificationsRead(userId);
    } catch (updateError) {
      if (activeRef.current) {
        setError(updateError instanceof Error ? updateError.message : 'Unable to update notifications.');
      }
    }
  }, [userId]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount: notifications.filter((item) => !item.readAt).length,
      loading,
      error,
      refresh: async () => {
        if (userId) {
          await load(userId);
        }
      },
      markRead,
      markAllRead,
      enableSystemPush: ensureSystemPushPermission,
      systemPushSupported: isSystemPushSupported(),
    }),
    [notifications, loading, error, userId, load, markRead, markAllRead],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
