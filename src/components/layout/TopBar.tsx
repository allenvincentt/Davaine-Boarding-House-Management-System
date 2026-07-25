import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import {
  GlassMaterial,
  GlassPanel,
  GlassPressable,
  useGlassInteraction,
} from '@/components/ui/GlassPanel';
import { SearchField } from '@/components/ui/SearchField';
import { Select, type SelectAnchor, type SelectOption } from '@/components/ui/Select';
import { DefaultTheme } from '@/constants/defaultTheme';
import { GlassMotion } from '@/constants/glassTheme';

const NEUTRAL_SHADOW = {
  shadowColor: '#4D4E47',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
};

type TopBarProps = {
  searchValue: string;
  onSearchChange: (text: string) => void;
  notificationCount?: number;
  adminName?: string;
  adminRole?: string;
  scrollY?: number;
  onProfilePress?: () => void;
  onSignOut?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function TopBar({
  searchValue,
  onSearchChange,
  notificationCount = 0,
  adminName = 'Admin',
  adminRole = 'Administrator',
  scrollY = 0,
  onProfilePress,
  onSignOut,
  style,
}: TopBarProps) {
  const { width } = useWindowDimensions();
  const compact = width < DefaultTheme.layout.compactNavigation;
  const [menuOpen, setMenuOpen] = useState(false);
  const interaction = useGlassInteraction({ shimmerOnPress: false });

  const condenseProgress = useRef(new Animated.Value(0)).current;
  const compactProgress = useRef(new Animated.Value(compact ? 1 : 0)).current;
  const condenseState = useRef(0);

  useEffect(() => {
    const nextState = scrollY > 12 || menuOpen ? 1 : 0;
    if (nextState === condenseState.current) {
      return;
    }

    condenseState.current = nextState;
    Animated.timing(condenseProgress, {
      toValue: nextState,
      duration: GlassMotion.morph.duration,
      easing: GlassMotion.morph.easing,
      useNativeDriver: false,
    }).start();
    interaction.triggerShimmer();
  }, [scrollY, menuOpen, condenseProgress, interaction]);

  useEffect(() => {
    Animated.timing(compactProgress, {
      toValue: compact ? 1 : 0,
      duration: GlassMotion.morph.duration,
      easing: GlassMotion.morph.easing,
      useNativeDriver: false,
    }).start();
  }, [compact, compactProgress]);

  const density = useMemo(
    () => Animated.add(condenseProgress, compactProgress),
    [condenseProgress, compactProgress],
  );

  const shape = compact
    ? {
        height: condenseProgress.interpolate({ inputRange: [0, 1], outputRange: [66, 54] }),
        paddingHorizontal: condenseProgress.interpolate({ inputRange: [0, 1], outputRange: [14, 10] }),
        borderRadius: condenseProgress.interpolate({ inputRange: [0, 1], outputRange: [34, 27] }),
      }
    : {
        height: density.interpolate({ inputRange: [0, 1, 2], outputRange: [68, 61, 56] }),
        paddingHorizontal: density.interpolate({ inputRange: [0, 1, 2], outputRange: [18, 15, 12] }),
        borderRadius: condenseProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [DefaultTheme.radius.lg, 34],
        }),
      };

  return (
    <GlassPanel
      variant="bar"
      backgroundHint={DefaultTheme.colors.background}
      reflection
      sheen
      wash={compact}
      interaction={interaction}
      reflectionStyle={styles.reflection}
      style={[styles.root, shape, !compact && NEUTRAL_SHADOW, style]}>
      <Animated.View
        style={[
          styles.search,
          { maxWidth: density.interpolate({ inputRange: [0, 1, 2], outputRange: [420, 372, 320] }) },
        ]}>
        <SearchField
          value={searchValue}
          onChangeText={onSearchChange}
          placeholder={compact ? 'Search…' : 'Search rooms, tenants, bills…'}
        />
      </Animated.View>
      <View style={styles.actions}>
        {!compact && (
          <>
            <LiveDate />
            <LiveClock />
          </>
        )}
        <NotificationBell count={notificationCount} />
        <AdminMenu
          name={adminName}
          role={adminRole}
          showDetails={!compact}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          onProfilePress={onProfilePress}
          onSignOut={onSignOut}
        />
      </View>
    </GlassPanel>
  );
}

function useMinuteTick() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const untilNextMinute = (from: Date) => 60000 - (from.getSeconds() * 1000 + from.getMilliseconds());

    const tick = () => {
      const current = new Date();
      setNow(current);
      timer = setTimeout(tick, untilNextMinute(current));
    };

    timer = setTimeout(tick, untilNextMinute(new Date()));
    return () => clearTimeout(timer);
  }, []);

  return now;
}

function useSecondTick() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const untilNextSecond = (from: Date) => 1000 - from.getMilliseconds();

    const tick = () => {
      const current = new Date();
      setNow(current);
      timer = setTimeout(tick, untilNextSecond(current));
    };

    timer = setTimeout(tick, untilNextSecond(new Date()));
    return () => clearTimeout(timer);
  }, []);

  return now;
}

function LiveDate() {
  const now = useMinuteTick();

  const date = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <View style={styles.date}>
      <GlassMaterial variant="chip" radius={DefaultTheme.radius.sm} blurEnabled={false} wash={false} />
      <Text style={styles.dateValue} numberOfLines={1}>
        {date}
      </Text>
      <Text style={styles.dateCaption} numberOfLines={1}>
        {weekday.toUpperCase()}
      </Text>
    </View>
  );
}

function LiveClock() {
  const now = useSecondTick();

  const hours = now.getHours();
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const time = `${hours % 12 === 0 ? 12 : hours % 12}:${minutes}:${seconds} ${meridiem}`;

  return (
    <View style={styles.clock}>
      <GlassMaterial variant="chip" radius={DefaultTheme.radius.sm} blurEnabled={false} wash={false} />
      <Text style={styles.clockValue} numberOfLines={1}>
        {time}
      </Text>
    </View>
  );
}

function NotificationBell({ count }: { count: number }) {
  return (
    <GlassPressable
      accessibilityLabel="Notifications"
      variant="chip"
      radius={DefaultTheme.radius.pill}
      wash={false}
      lift={1}
      flex={0.08}
      style={styles.bell}
      contentStyle={styles.bellContent}>
      <AppIcon name="bell" size={19} tintColor={DefaultTheme.colors.muted} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1}>
            {count > 9 ? '9+' : count}
          </Text>
        </View>
      )}
    </GlassPressable>
  );
}

function AdminMenu({
  name,
  role,
  showDetails,
  open,
  onOpenChange,
  onProfilePress,
  onSignOut,
}: {
  name: string;
  role: string;
  showDetails: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfilePress?: () => void;
  onSignOut?: () => void;
}) {
  const [anchor, setAnchor] = useState<SelectAnchor | null>(null);
  const triggerRef = useRef<View>(null);
  const interaction = useGlassInteraction();
  const nameParts = name.split(' ').filter(Boolean);
  const initials = (nameParts.length > 1 ? nameParts.slice(0, 2).map((part) => part[0]).join('') : name.slice(0, 2))
    .toUpperCase();

  const handleTogglePress = () => {
    if (open) {
      onOpenChange(false);
      return;
    }
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      onOpenChange(true);
    });
  };

  const menuOptions: SelectOption[] = [
    { key: 'profile', label: 'Profile', icon: 'user', onSelect: () => onProfilePress?.() },
    { key: 'signOut', label: 'Sign out', icon: 'signOut', destructive: true, onSelect: () => onSignOut?.() },
  ];

  return (
    <View style={styles.adminMenuWrap}>
      <Pressable
        ref={triggerRef}
        accessibilityRole="button"
        accessibilityLabel="Account menu"
        accessibilityState={{ expanded: open }}
        style={styles.adminMenu}
        onPress={handleTogglePress}
        onHoverIn={interaction.handlers.onHoverIn}
        onHoverOut={interaction.handlers.onHoverOut}
        onPressIn={interaction.handlers.onPressIn}
        onPressOut={interaction.handlers.onPressOut}>
        <Animated.View
          style={[
            styles.adminMenuContent,
            {
              transform: [
                {
                  scale: interaction.press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] }),
                },
              ],
            },
          ]}>
          <View style={styles.avatar}>
            <GlassMaterial
              variant="chip"
              radius={DefaultTheme.radius.pill}
              blurEnabled={false}
              interaction={interaction}
              sheen
              bordered={false}
            />
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          {showDetails && (
            <View style={styles.adminText}>
              <Text style={styles.adminName} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.adminRole} numberOfLines={1}>
                {role}
              </Text>
            </View>
          )}
          {showDetails && (
            <AppIcon
              name="chevronDown"
              size={14}
              tintColor={DefaultTheme.colors.muted}
              style={open && styles.chevronOpen}
            />
          )}
        </Animated.View>
      </Pressable>
      <Select
        visible={open}
        onClose={() => onOpenChange(false)}
        options={menuOptions}
        anchor={anchor}
        align="right"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 18,
    borderRadius: DefaultTheme.radius.lg,
    zIndex: 50,
  },
  reflection: {
    left: 30,
    right: 30,
  },
  search: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginLeft: 'auto',
  },
  date: {
    minWidth: 116,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: DefaultTheme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clock: {
    minWidth: 118,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: DefaultTheme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateValue: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 13.5,
  },
  clockValue: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 13.5,
    fontVariant: ['tabular-nums'],
  },
  dateCaption: {
    marginTop: 1,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  bell: {
    width: 38,
    height: 38,
    borderRadius: DefaultTheme.radius.pill,
  },
  bellContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: '#D64545',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: DefaultTheme.colors.white,
  },
  badgeText: {
    color: DefaultTheme.colors.white,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 9,
  },
  adminMenuWrap: {
    position: 'relative',
  },
  adminMenu: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminMenuContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: DefaultTheme.colors.primary,
  },
  avatarText: {
    color: DefaultTheme.colors.white,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 13,
  },
  adminText: {
    maxWidth: 120,
  },
  adminName: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 13,
  },
  adminRole: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 10.5,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
});
