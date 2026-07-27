import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { GlassMaterial } from '@/components/ui/GlassPanel';
import { DefaultTheme } from '@/constants/defaultTheme';
import type { AppIconName } from '@/constants/icons';
import {
  relativeTimeFrom,
  reviewIdOf,
  type NotificationModel,
  type NotificationType,
} from '@/models/notificationModel';
import { useNotifications } from '@/providers/NotificationProvider';
import { appStorage } from '@/services/sessionStorage';

export type NotificationPanelAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type NotificationPanelProps = {
  visible: boolean;
  onClose: () => void;
  anchor: NotificationPanelAnchor | null;
};

type NotificationTab = 'all' | 'unread' | 'read';

const TABS: { key: NotificationTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
];

const TAB_STORAGE_KEY = 'davaine.notifications.tab';
const OPEN_DURATION = 220;
const CLOSE_DURATION = 150;
const ANCHOR_GAP = 12;
const SCREEN_MARGIN = 12;
const PANEL_WIDTH = 372;
const BLUR_ENABLED = Platform.OS !== 'android';

const typeIcons: Record<NotificationType, AppIconName> = {
  welcome: 'users',
  role_change: 'directory',
  password_change: 'key',
  review: 'feedback',
};

const typeTones: Record<NotificationType, { color: string; background: string }> = {
  welcome: { color: DefaultTheme.colors.primary, background: DefaultTheme.colors.softOlive },
  role_change: { color: '#7C5CD6', background: '#EDE7F6' },
  password_change: { color: '#C98A1E', background: DefaultTheme.colors.softGold },
  review: { color: '#C98A1E', background: DefaultTheme.colors.softGold },
};

export function NotificationPanel({ visible, onClose, anchor }: NotificationPanelProps) {
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const compact = windowWidth < DefaultTheme.layout.compactNavigation;
  const {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
    enableSystemPush,
    systemPushSupported,
    systemPushPermission,
  } = useNotifications();

  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<NotificationTab>('unread');
  const [tabsWidth, setTabsWidth] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const indicator = useRef(new Animated.Value(1)).current;
  const restoredTab = useRef(false);

  useEffect(() => {
    if (restoredTab.current) {
      return;
    }
    restoredTab.current = true;

    appStorage
      .getItem(TAB_STORAGE_KEY)
      .then((stored) => {
        if (stored === 'all' || stored === 'unread' || stored === 'read') {
          setTab(stored);
          indicator.setValue(TABS.findIndex((item) => item.key === stored));
        }
      })
      .catch(() => undefined);
  }, [indicator]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: OPEN_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      return;
    }

    if (!mounted) {
      return;
    }

    Animated.timing(progress, {
      toValue: 0,
      duration: CLOSE_DURATION,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [visible, mounted, progress]);

  const handleSelectTab = useCallback(
    (next: NotificationTab) => {
      setTab(next);
      appStorage.setItem(TAB_STORAGE_KEY, next).catch(() => undefined);
      Animated.timing(indicator, {
        toValue: TABS.findIndex((item) => item.key === next),
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    },
    [indicator],
  );

  const handleTabsLayout = useCallback((event: LayoutChangeEvent) => {
    const measured = Math.round(event.nativeEvent.layout.width);
    setTabsWidth((current) => (current === measured ? current : measured));
  }, []);

  const handleEnablePush = useCallback(() => {
    void enableSystemPush();
  }, [enableSystemPush]);

  const handleOpenNotification = useCallback(
    (notification: NotificationModel) => {
      if (!notification.readAt) {
        markRead(notification.id);
      }

      const reviewId = reviewIdOf(notification);
      if (!reviewId) {
        return;
      }

      onClose();
      router.push({
        pathname: '/admin-pages/FeedbackPage',
        params: { review: reviewId },
      });
    },
    [markRead, onClose, router],
  );

  const visibleNotifications = useMemo(() => {
    if (tab === 'unread') {
      return notifications.filter((item) => !item.readAt);
    }
    if (tab === 'read') {
      return notifications.filter((item) => Boolean(item.readAt));
    }
    return notifications;
  }, [notifications, tab]);

  if (!mounted) {
    return null;
  }

  const panelWidth = compact
    ? Math.min(windowWidth - SCREEN_MARGIN * 2, 420)
    : Math.min(PANEL_WIDTH, windowWidth - SCREEN_MARGIN * 2);
  const maxHeight = Math.min(windowHeight * 0.72, 560);
  const anchorTop = anchor ? anchor.y + anchor.height + ANCHOR_GAP : SCREEN_MARGIN;
  const top = Math.max(SCREEN_MARGIN, Math.min(anchorTop, windowHeight - 200));
  const right = anchor
    ? Math.max(windowWidth - (anchor.x + anchor.width), SCREEN_MARGIN)
    : SCREEN_MARGIN;
  const tabWidth = tabsWidth > 0 ? (tabsWidth - 8) / TABS.length : 0;

  return (
    <RNModal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close notifications"
      />
      <Animated.View
        accessibilityViewIsModal
        style={[
          styles.panel,
          {
            top,
            right: compact ? SCREEN_MARGIN : right,
            width: panelWidth,
            maxHeight,
            opacity: progress,
            transform: [
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) },
              { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
            ],
          },
        ]}>
        <GlassMaterial
          variant="control"
          backgroundHint={DefaultTheme.colors.background}
          radius={DefaultTheme.radius.md}
          blurEnabled={BLUR_ENABLED}
        />

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh notifications"
            hitSlop={8}
            style={styles.headerAction}
            onPress={() => refresh()}>
            <AppIcon name="refresh" size={15} tintColor={DefaultTheme.colors.muted} />
          </Pressable>
          {unreadCount > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mark all as read"
              hitSlop={8}
              style={styles.headerAction}
              onPress={() => markAllRead()}>
              <AppIcon name="check" size={15} tintColor={DefaultTheme.colors.primary} />
            </Pressable>
          )}
        </View>

        <View style={styles.tabs} onLayout={handleTabsLayout}>
          {tabWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.tabIndicator,
                {
                  width: tabWidth,
                  transform: [
                    {
                      translateX: indicator.interpolate({
                        inputRange: [0, TABS.length - 1],
                        outputRange: [0, tabWidth * (TABS.length - 1)],
                      }),
                    },
                  ],
                },
              ]}
            />
          )}
          {TABS.map((item) => {
            const active = item.key === tab;
            const count =
              item.key === 'unread'
                ? unreadCount
                : item.key === 'read'
                  ? notifications.length - unreadCount
                  : notifications.length;

            return (
              <Pressable
                key={item.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${item.label} notifications`}
                style={styles.tab}
                onPress={() => handleSelectTab(item.key)}>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>
                  {item.label}
                  {count > 0 ? ` (${count})` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}>
          {loading && notifications.length === 0 ? (
            <View style={styles.stateBlock}>
              <ActivityIndicator color={DefaultTheme.colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.stateBlock}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : visibleNotifications.length === 0 ? (
            <View style={styles.stateBlock}>
              <View style={styles.emptyBadge}>
                <AppIcon name="inbox" size={20} tintColor={DefaultTheme.colors.muted} />
              </View>
              <Text style={styles.emptyText}>
                {tab === 'unread'
                  ? 'No unread notifications.'
                  : tab === 'read'
                    ? 'Nothing has been read yet.'
                    : 'No notifications yet.'}
              </Text>
            </View>
          ) : (
            visibleNotifications.map((notification, index) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                index={index}
                onPress={() => handleOpenNotification(notification)}
              />
            ))
          )}
        </ScrollView>

        {systemPushSupported && systemPushPermission === 'default' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Turn on push alerts"
            style={styles.footer}
            onPress={handleEnablePush}>
            <AppIcon name="bell" size={14} tintColor={DefaultTheme.colors.primary} />
            <Text style={styles.footerText}>Turn on push alerts</Text>
          </Pressable>
        )}

        {systemPushSupported && systemPushPermission === 'denied' && (
          <View style={styles.footer}>
            <AppIcon name="bell" size={14} tintColor={DefaultTheme.colors.muted} />
            <Text style={[styles.footerText, styles.footerTextMuted]}>
              Push alerts are blocked in system settings
            </Text>
          </View>
        )}
      </Animated.View>
    </RNModal>
  );
}

function NotificationRow({
  notification,
  index,
  onPress,
}: {
  notification: NotificationModel;
  index: number;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const entrance = useRef(new Animated.Value(0)).current;
  const tone = typeTones[notification.type] ?? typeTones.welcome;
  const unread = !notification.readAt;

  useEffect(() => {
    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: 320,
      delay: Math.min(index, 8) * 45,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [entrance, index]);

  return (
    <Animated.View
      style={{
        opacity: entrance,
        transform: [
          { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
        ],
      }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={notification.title}
        style={[styles.row, unread && styles.rowUnread, hovered && styles.rowHovered]}
        onPress={onPress}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}>
        <View style={[styles.rowIcon, { backgroundColor: tone.background }]}>
          <AppIcon name={typeIcons[notification.type] ?? 'bell'} size={15} tintColor={tone.color} />
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowHeader}>
            <Text style={[styles.rowTitle, unread && styles.rowTitleUnread]} numberOfLines={1}>
              {notification.title}
            </Text>
            <Text style={styles.rowTime}>{relativeTimeFrom(notification.createdAt)}</Text>
          </View>
          <Text style={styles.rowText} numberOfLines={3}>
            {notification.body}
          </Text>
        </View>
        {unread && <View style={styles.unreadDot} />}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: DefaultTheme.radius.md,
    backgroundColor: 'rgba(249, 247, 240, 0.94)',
    shadowColor: '#69705A',
    shadowOpacity: 0.22,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 12,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 15,
  },
  subtitle: {
    marginTop: 2,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11.5,
  },
  headerAction: {
    width: 30,
    height: 30,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  tabs: {
    position: 'relative',
    flexDirection: 'row',
    marginHorizontal: 14,
    padding: 4,
    borderRadius: DefaultTheme.radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: DefaultTheme.radius.pill,
    backgroundColor: DefaultTheme.colors.white,
    shadowColor: '#4D4E47',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 11.5,
  },
  tabLabelActive: {
    color: DefaultTheme.colors.primary,
  },
  list: {
    marginTop: 6,
  },
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 12,
  },
  stateBlock: {
    paddingVertical: 34,
    alignItems: 'center',
    gap: 10,
  },
  emptyBadge: {
    width: 42,
    height: 42,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  emptyText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
  },
  errorText: {
    paddingHorizontal: 12,
    color: '#D64545',
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 11,
    borderRadius: DefaultTheme.radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowUnread: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  rowHovered: {
    borderColor: DefaultTheme.colors.line,
    backgroundColor: DefaultTheme.colors.white,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowTitle: {
    flex: 1,
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13,
  },
  rowTitleUnread: {
    fontFamily: DefaultTheme.fonts.bodyBold,
  },
  rowTime: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 10.5,
  },
  rowText: {
    marginTop: 3,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 17,
  },
  unreadDot: {
    width: 7,
    height: 7,
    marginTop: 12,
    borderRadius: 4,
    backgroundColor: DefaultTheme.colors.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: DefaultTheme.colors.line,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  footerText: {
    color: DefaultTheme.colors.primary,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 12,
  },
  footerTextMuted: {
    color: DefaultTheme.colors.muted,
  },
});
