import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { useSnackbar } from '@/components/common/Snackbar';

export type ConnectionStatus = 'online' | 'unstable' | 'reconnecting' | 'offline';

const SNACKBAR_ID = 'connection-status';

const HEALTHY_INTERVAL = 25_000;
const DEGRADED_INTERVAL = 5_000;
const SLOW_THRESHOLD = 2_200;
const PROBE_TIMEOUT = 8_000;
const SLOW_STRIKES = 2;

const PROBE_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''}/auth/v1/health`;
const PROBE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

type ProbeResult = { reachable: boolean; latency: number };

async function probe(): Promise<ProbeResult> {
  if (!PROBE_URL.startsWith('http')) {
    return { reachable: true, latency: 0 };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT);
  const startedAt = Date.now();

  try {
    await fetch(`${PROBE_URL}?t=${startedAt}`, {
      method: 'GET',
      cache: 'no-store',
      headers: PROBE_KEY ? { apikey: PROBE_KEY } : undefined,
      signal: controller.signal,
    });
    return { reachable: true, latency: Date.now() - startedAt };
  } catch {
    return { reachable: false, latency: Date.now() - startedAt };
  } finally {
    clearTimeout(timeout);
  }
}

function browserOnline() {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') {
    return true;
  }
  return navigator.onLine !== false;
}

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>('online');
  const statusRef = useRef<ConnectionStatus>('online');
  const slowStrikes = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const running = useRef(false);

  const apply = useCallback((next: ConnectionStatus) => {
    if (!mounted.current || statusRef.current === next) {
      return;
    }
    statusRef.current = next;
    setStatus(next);
  }, []);

  const check = useCallback(async () => {
    if (running.current) {
      return;
    }
    running.current = true;

    try {
      if (!browserOnline()) {
        slowStrikes.current = 0;
        apply('offline');
        return;
      }

      if (statusRef.current === 'offline') {
        apply('reconnecting');
      }

      const { reachable, latency } = await probe();

      if (!reachable) {
        slowStrikes.current = 0;
        apply('offline');
        return;
      }

      if (latency > SLOW_THRESHOLD) {
        slowStrikes.current += 1;
        apply(slowStrikes.current >= SLOW_STRIKES ? 'unstable' : statusRef.current);
        return;
      }

      slowStrikes.current = 0;
      apply('online');
    } finally {
      running.current = false;
    }
  }, [apply]);

  useEffect(() => {
    mounted.current = true;

    const schedule = () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      const delay = statusRef.current === 'online' ? HEALTHY_INTERVAL : DEGRADED_INTERVAL;
      timer.current = setTimeout(async () => {
        await check();
        if (mounted.current) {
          schedule();
        }
      }, delay);
    };

    check().finally(() => {
      if (mounted.current) {
        schedule();
      }
    });

    return () => {
      mounted.current = false;
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [check]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') {
        return;
      }

      const handleOffline = () => {
        slowStrikes.current = 0;
        apply('offline');
      };
      const handleOnline = () => {
        apply('reconnecting');
        void check();
      };

      window.addEventListener('offline', handleOffline);
      window.addEventListener('online', handleOnline);
      return () => {
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('online', handleOnline);
      };
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void check();
      }
    });

    return () => subscription.remove();
  }, [apply, check]);

  return { status, recheck: check };
}

export function ConnectionSnackbar() {
  const snackbar = useSnackbar();
  const { status, recheck } = useConnectionStatus();
  const previous = useRef<ConnectionStatus>('online');

  useEffect(() => {
    const wasDegraded = previous.current !== 'online';
    previous.current = status;

    if (status === 'offline') {
      snackbar.show({
        id: SNACKBAR_ID,
        tone: 'error',
        title: 'No internet connection',
        message: 'Davaine cannot reach the server. Changes will not be saved until you are back online.',
        duration: null,
        dismissible: false,
        actionLabel: 'Retry',
        onAction: () => void recheck(),
      });
      return;
    }

    if (status === 'reconnecting') {
      snackbar.show({
        id: SNACKBAR_ID,
        tone: 'loading',
        message: 'Reconnecting…',
        duration: null,
        dismissible: false,
      });
      return;
    }

    if (status === 'unstable') {
      snackbar.show({
        id: SNACKBAR_ID,
        tone: 'warning',
        title: 'Unstable connection',
        message: 'The network is responding slowly. Some actions may take longer than usual.',
        duration: null,
        dismissible: true,
      });
      return;
    }

    if (wasDegraded) {
      snackbar.show({
        id: SNACKBAR_ID,
        tone: 'success',
        message: 'Connection restored. You are back online.',
        duration: 2800,
      });
      return;
    }

    snackbar.dismiss(SNACKBAR_ID);
  }, [status, snackbar, recheck]);

  return null;
}
