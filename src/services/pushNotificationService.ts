import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

type BrowserNotification = {
  permission: 'default' | 'granted' | 'denied';
  requestPermission: () => Promise<'default' | 'granted' | 'denied'>;
  new (title: string, options?: { body?: string; tag?: string; icon?: string }): unknown;
};

export type SystemPushPermission = 'unsupported' | 'default' | 'granted' | 'denied';

export type SystemPushPayload = {
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, unknown>;
};

export const ANDROID_CHANNEL_ID = 'davaine-alerts-v2';

const LEGACY_ANDROID_CHANNEL_IDS = ['davaine-alerts'];

const ACCENT_COLOR = '#8A9900';
const isNative = Platform.OS === 'android' || Platform.OS === 'ios';

let cachedPermission: SystemPushPermission = isNative ? 'default' : 'unsupported';
let handlerConfigured = false;
let channelSetup: Promise<void> | null = null;

function browserNotification(): BrowserNotification | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  const candidate = (window as unknown as { Notification?: BrowserNotification }).Notification;
  return candidate ?? null;
}

function toPermission(status: Notifications.NotificationPermissionsStatus): SystemPushPermission {
  if (status.granted || status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return 'granted';
  }
  return status.canAskAgain ? 'default' : 'denied';
}

function configureHandler(): void {
  if (handlerConfigured || !isNative) {
    return;
  }
  handlerConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return Promise.resolve();
  }

  channelSetup ??= Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Davaine alerts',
    description: 'Account, role, and security updates from Davaine.',
    importance: Notifications.AndroidImportance.HIGH,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    vibrationPattern: [0, 200, 120, 200],
    lightColor: ACCENT_COLOR,
    enableVibrate: true,
  })
    .then(() =>
      Promise.all(
        LEGACY_ANDROID_CHANNEL_IDS.map((id) =>
          Notifications.deleteNotificationChannelAsync(id).catch(() => undefined),
        ),
      ),
    )
    .then(() => undefined)
    .catch(() => undefined);

  return channelSetup;
}

export function isSystemPushSupported(): boolean {
  return isNative || browserNotification() != null;
}

export function getSystemPushPermission(): SystemPushPermission {
  if (isNative) {
    return cachedPermission;
  }

  const notification = browserNotification();
  return notification ? notification.permission : 'unsupported';
}

export async function configureSystemPush(): Promise<SystemPushPermission> {
  if (!isNative) {
    return getSystemPushPermission();
  }

  configureHandler();
  await ensureAndroidChannel();
  return refreshSystemPushPermission();
}

export async function refreshSystemPushPermission(): Promise<SystemPushPermission> {
  if (!isNative) {
    return getSystemPushPermission();
  }

  try {
    cachedPermission = toPermission(await Notifications.getPermissionsAsync());
  } catch {
    cachedPermission = 'unsupported';
  }

  return cachedPermission;
}

export async function ensureSystemPushPermission(): Promise<boolean> {
  if (isNative) {
    configureHandler();
    await ensureAndroidChannel();

    try {
      const current = await Notifications.getPermissionsAsync();

      if (current.granted) {
        cachedPermission = 'granted';
        return true;
      }

      if (!current.canAskAgain) {
        cachedPermission = 'denied';
        return false;
      }

      cachedPermission = toPermission(
        await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowBadge: true, allowSound: true },
        }),
      );
    } catch {
      cachedPermission = 'unsupported';
    }

    return cachedPermission === 'granted';
  }

  const notification = browserNotification();

  if (!notification) {
    return false;
  }

  if (notification.permission === 'granted') {
    return true;
  }

  if (notification.permission === 'denied') {
    return false;
  }

  try {
    const result = await notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

export function presentSystemPush(payload: SystemPushPayload): void {
  if (isNative) {
    void (async () => {
      try {
        configureHandler();
        await ensureAndroidChannel();

        if ((await refreshSystemPushPermission()) !== 'granted') {
          return;
        }

        await Notifications.scheduleNotificationAsync({
          identifier: payload.tag,
          content: {
            title: payload.title,
            body: payload.body,
            data: payload.data ?? {},
            sound: 'default',
            color: ACCENT_COLOR,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : null,
        });
      } catch {
        return;
      }
    })();
    return;
  }

  const notification = browserNotification();

  if (!notification || notification.permission !== 'granted') {
    return;
  }

  try {
    void new notification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: '/favicon.ico',
    });
  } catch {
    return;
  }
}

export function addSystemPushResponseListener(
  handler: (data: Record<string, unknown>) => void,
): () => void {
  if (!isNative) {
    return () => undefined;
  }

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    handler((response.notification.request.content.data ?? {}) as Record<string, unknown>);
  });

  return () => subscription.remove();
}

export async function consumeInitialSystemPushResponse(): Promise<Record<string, unknown> | null> {
  if (!isNative) {
    return null;
  }

  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    return response
      ? ((response.notification.request.content.data ?? {}) as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export async function clearSystemPushTray(): Promise<void> {
  if (!isNative) {
    return;
  }

  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    return;
  }
}
