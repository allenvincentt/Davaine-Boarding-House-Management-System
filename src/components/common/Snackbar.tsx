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
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/AppIcon';
import { DefaultTheme } from '@/constants/defaultTheme';
import type { AppIconName } from '@/constants/icons';

export type SnackbarTone = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'neutral';

export type SnackbarOptions = {
  message: string;
  title?: string;
  tone?: SnackbarTone;
  duration?: number | null;
  actionLabel?: string;
  onAction?: () => void;
  dismissible?: boolean;
  id?: string;
};

type SnackbarItem = Required<Pick<SnackbarOptions, 'message'>> &
  Omit<SnackbarOptions, 'message' | 'id'> & {
    id: string;
    tone: SnackbarTone;
    duration: number | null;
    dismissible: boolean;
  };

export type SnackbarApi = {
  show: (options: SnackbarOptions) => string;
  success: (message: string, options?: Omit<SnackbarOptions, 'message' | 'tone'>) => string;
  error: (message: string, options?: Omit<SnackbarOptions, 'message' | 'tone'>) => string;
  warning: (message: string, options?: Omit<SnackbarOptions, 'message' | 'tone'>) => string;
  info: (message: string, options?: Omit<SnackbarOptions, 'message' | 'tone'>) => string;
  loading: (message: string, options?: Omit<SnackbarOptions, 'message' | 'tone'>) => string;
  update: (id: string, options: Partial<SnackbarOptions>) => void;
  dismiss: (id?: string) => void;
};

const MAX_VISIBLE = 3;
const ENTER_DURATION = 260;
const EXIT_DURATION = 180;

const DEFAULT_DURATION: Record<SnackbarTone, number | null> = {
  success: 3200,
  info: 3400,
  neutral: 3400,
  warning: 4600,
  error: 5600,
  loading: null,
};

const TONES: Record<
  SnackbarTone,
  { icon: AppIconName | null; accent: string; tint: string; label: string }
> = {
  success: {
    icon: 'check',
    accent: '#2E8A57',
    tint: '#E4F5EA',
    label: 'Success',
  },
  error: {
    icon: 'warning',
    accent: '#C4453B',
    tint: '#FBE7E5',
    label: 'Error',
  },
  warning: {
    icon: 'warning',
    accent: '#C98A1E',
    tint: DefaultTheme.colors.softGold,
    label: 'Warning',
  },
  info: {
    icon: 'about',
    accent: DefaultTheme.colors.blue,
    tint: DefaultTheme.colors.softBlue,
    label: 'Information',
  },
  loading: {
    icon: null,
    accent: DefaultTheme.colors.primary,
    tint: DefaultTheme.colors.softOlive,
    label: 'In progress',
  },
  neutral: {
    icon: 'about',
    accent: DefaultTheme.colors.muted,
    tint: DefaultTheme.colors.cool,
    label: 'Notice',
  },
};

const SnackbarContext = createContext<SnackbarApi | null>(null);

let counter = 0;
function nextId() {
  counter += 1;
  return `snackbar-${counter}`;
}

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<SnackbarItem[]>([]);

  const dismiss = useCallback((id?: string) => {
    setItems((current) => (id ? current.filter((item) => item.id !== id) : []));
  }, []);

  const show = useCallback((options: SnackbarOptions) => {
    const tone = options.tone ?? 'neutral';
    const id = options.id ?? nextId();

    const item: SnackbarItem = {
      id,
      message: options.message,
      title: options.title,
      tone,
      duration: options.duration === undefined ? DEFAULT_DURATION[tone] : options.duration,
      actionLabel: options.actionLabel,
      onAction: options.onAction,
      dismissible: options.dismissible ?? true,
    };

    setItems((current) => {
      const existing = current.findIndex((entry) => entry.id === id);
      if (existing >= 0) {
        const next = [...current];
        next[existing] = item;
        return next;
      }
      return [...current, item].slice(-MAX_VISIBLE);
    });

    return id;
  }, []);

  const update = useCallback(
    (id: string, options: Partial<SnackbarOptions>) => {
      setItems((current) => {
        const existing = current.find((entry) => entry.id === id);
        if (!existing) {
          return current;
        }

        const tone = options.tone ?? existing.tone;
        const next: SnackbarItem = {
          ...existing,
          ...options,
          id,
          tone,
          message: options.message ?? existing.message,
          duration:
            options.duration !== undefined
              ? options.duration
              : options.tone
                ? DEFAULT_DURATION[tone]
                : existing.duration,
          dismissible: options.dismissible ?? existing.dismissible,
        };

        return current.map((entry) => (entry.id === id ? next : entry));
      });
    },
    [],
  );

  const api = useMemo<SnackbarApi>(() => {
    const withTone =
      (tone: SnackbarTone) =>
      (message: string, options?: Omit<SnackbarOptions, 'message' | 'tone'>) =>
        show({ ...options, message, tone });

    return {
      show,
      update,
      dismiss,
      success: withTone('success'),
      error: withTone('error'),
      warning: withTone('warning'),
      info: withTone('info'),
      loading: withTone('loading'),
    };
  }, [show, update, dismiss]);

  return (
    <SnackbarContext.Provider value={api}>
      {children}
      <SnackbarHost items={items} onDismiss={dismiss} />
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarApi {
  const context = useContext(SnackbarContext);
  const fallback = useMemo<SnackbarApi>(() => {
    const noop = () => '';
    return {
      show: noop,
      success: noop,
      error: noop,
      warning: noop,
      info: noop,
      loading: noop,
      update: () => undefined,
      dismiss: () => undefined,
    };
  }, []);

  return context ?? fallback;
}

function SnackbarHost({
  items,
  onDismiss,
}: {
  items: SnackbarItem[];
  onDismiss: (id: string) => void;
}) {
  const { width } = useWindowDimensions();
  const { bottom, left, right } = useSafeAreaInsets();
  const compact = width < DefaultTheme.layout.compactNavigation;

  if (items.length === 0) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.host,
        compact ? styles.hostCompact : styles.hostWide,
        {
          paddingBottom: bottom + (compact ? 96 : 24),
          paddingLeft: left + 16,
          paddingRight: right + 16,
        },
      ]}>
      {items.map((item) => (
        <Snackbar key={item.id} {...item} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

type SnackbarProps = SnackbarItem & {
  onDismiss: (id: string) => void;
};

export function Snackbar({
  id,
  message,
  title,
  tone,
  duration,
  actionLabel,
  onAction,
  dismissible,
  onDismiss,
}: SnackbarProps) {
  const palette = TONES[tone];
  const enter = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const animation = Animated.timing(enter, {
      toValue: 1,
      duration: ENTER_DURATION,
      easing: Easing.out(Easing.cubic),
      isInteraction: false,
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [enter]);

  const close = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }

    Animated.timing(enter, {
      toValue: 0,
      duration: EXIT_DURATION,
      easing: Easing.in(Easing.cubic),
      isInteraction: false,
      useNativeDriver: true,
    }).start(() => onDismiss(id));
  }, [enter, id, onDismiss]);

  useEffect(() => {
    if (duration == null) {
      return;
    }

    timer.current = setTimeout(close, duration);
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [duration, message, tone, close]);

  return (
    <Animated.View
      accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}
      accessibilityRole="alert"
      accessibilityLabel={`${palette.label}. ${title ? `${title}. ` : ''}${message}`}
      style={[
        styles.card,
        {
          opacity: enter,
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) },
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
          ],
        },
      ]}>
      <View style={[styles.rail, { backgroundColor: palette.accent }]} />
      <View style={[styles.badge, { backgroundColor: palette.tint }]}>
        {palette.icon ? (
          <AppIcon name={palette.icon} size={15} tintColor={palette.accent} />
        ) : (
          <ActivityIndicator size="small" color={palette.accent} />
        )}
      </View>

      <View style={styles.body}>
        {!!title && <Text style={styles.title}>{title}</Text>}
        <Text style={[styles.message, !!title && styles.messageWithTitle]}>{message}</Text>
      </View>

      {!!actionLabel && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={6}
          onPress={() => {
            onAction?.();
            close();
          }}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
          <Text style={[styles.actionText, { color: palette.accent }]}>{actionLabel}</Text>
        </Pressable>
      )}

      {dismissible && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          hitSlop={10}
          onPress={close}
          style={({ pressed }) => [styles.close, pressed && styles.closePressed]}>
          <AppIcon name="close" size={12} tintColor={DefaultTheme.colors.muted} />
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: 10,
    zIndex: 900,
    ...Platform.select({ android: { elevation: 24 }, default: {} }),
  },
  hostCompact: {
    alignItems: 'stretch',
  },
  hostWide: {
    alignItems: 'flex-end',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 12,
    overflow: 'hidden',
    borderRadius: DefaultTheme.radius.md,
    backgroundColor: DefaultTheme.colors.white,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
    shadowColor: '#20201F',
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 13,
  },
  message: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
    lineHeight: 17,
  },
  messageWithTitle: {
    marginTop: 2,
    color: DefaultTheme.colors.muted,
  },
  action: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: DefaultTheme.radius.sm,
  },
  actionPressed: {
    backgroundColor: DefaultTheme.colors.cool,
  },
  actionText: {
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 12.5,
  },
  close: {
    width: 26,
    height: 26,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePressed: {
    backgroundColor: DefaultTheme.colors.cool,
  },
});
