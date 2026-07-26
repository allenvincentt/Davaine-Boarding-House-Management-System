import { Platform } from 'react-native';

type BrowserNotification = {
  permission: 'default' | 'granted' | 'denied';
  requestPermission: () => Promise<'default' | 'granted' | 'denied'>;
  new (title: string, options?: { body?: string; tag?: string; icon?: string }): unknown;
};

function browserNotification(): BrowserNotification | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  const candidate = (window as unknown as { Notification?: BrowserNotification }).Notification;
  return candidate ?? null;
}

export type SystemPushPermission = 'unsupported' | 'default' | 'granted' | 'denied';

export function isSystemPushSupported(): boolean {
  return browserNotification() != null;
}

export function getSystemPushPermission(): SystemPushPermission {
  const notification = browserNotification();
  return notification ? notification.permission : 'unsupported';
}

export async function ensureSystemPushPermission(): Promise<boolean> {
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

export function presentSystemPush(title: string, body: string, tag?: string): void {
  const notification = browserNotification();

  if (!notification || notification.permission !== 'granted') {
    return;
  }

  try {
    void new notification(title, { body, tag, icon: '/favicon.ico' });
  } catch {
    return;
  }
}
