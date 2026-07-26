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

import { toPushPayload, type NotificationModel } from '@/models/notificationModel';
import { useAuth } from '@/providers/AuthProvider';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from '@/services/notificationService';
import {
  addSystemPushResponseListener,
  clearSystemPushTray,
  configureSystemPush,
  consumeInitialSystemPushResponse,
  ensureSystemPushPermission,
  getSystemPushPermission,
  isSystemPushSupported,
  presentSystemPush,
  refreshSystemPushPermission,
  type SystemPushPermission,
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
  systemPushPermission: SystemPushPermission;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const [notifications, setNotifications] = useState<NotificationModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [systemPushPermission, setSystemPushPermission] = useState<SystemPushPermission>(() =>
    getSystemPushPermission(),
  );
  const activeRef = useRef(true);
  const presentedRef = useRef(new Set<string>());
  const promptedRef = useRef(false);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  useEffect(() => {
    configureSystemPush()
      .then((permission) => {
        if (activeRef.current) {
          setSystemPushPermission(permission);
        }
      })
      .catch(() => undefined);
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

  const publishSystemPush = useCallback((notification: NotificationModel) => {
    if (notification.readAt || presentedRef.current.has(notification.id)) {
      return;
    }

    presentedRef.current.add(notification.id);
    presentSystemPush(toPushPayload(notification));
  }, []);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setError(null);
      setLoading(false);
      presentedRef.current.clear();
      promptedRef.current = false;
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
        publishSystemPush(notification);
      },
      onUpdate: (notification) => {
        setNotifications((current) =>
          current.map((item) => (item.id === notification.id ? notification : item)),
        );
      },
    });

    return unsubscribe;
  }, [userId, load, publishSystemPush]);

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
    void clearSystemPushTray();

    try {
      await markAllNotificationsRead(userId);
    } catch (updateError) {
      if (activeRef.current) {
        setError(updateError instanceof Error ? updateError.message : 'Unable to update notifications.');
      }
    }
  }, [userId]);

  const enableSystemPush = useCallback(async () => {
    const granted = await ensureSystemPushPermission();

    if (activeRef.current) {
      setSystemPushPermission(getSystemPushPermission());
    }

    return granted;
  }, []);

  useEffect(() => {
    if (!userId || promptedRef.current || systemPushPermission !== 'default') {
      return;
    }

    promptedRef.current = true;
    enableSystemPush().catch(() => undefined);
  }, [userId, systemPushPermission, enableSystemPush]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const handleResponse = (data: Record<string, unknown>) => {
      const notificationId = typeof data.notificationId === 'string' ? data.notificationId : null;

      if (notificationId) {
        void markRead(notificationId);
      }
    };

    consumeInitialSystemPushResponse()
      .then((data) => {
        if (data && activeRef.current) {
          handleResponse(data);
        }
      })
      .catch(() => undefined);

    return addSystemPushResponseListener(handleResponse);
  }, [userId, markRead]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    refreshSystemPushPermission()
      .then((permission) => {
        if (activeRef.current) {
          setSystemPushPermission(permission);
        }
      })
      .catch(() => undefined);
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
      enableSystemPush,
      systemPushSupported: isSystemPushSupported(),
      systemPushPermission,
    }),
    [
      notifications,
      loading,
      error,
      userId,
      load,
      markRead,
      markAllRead,
      enableSystemPush,
      systemPushPermission,
    ],
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
