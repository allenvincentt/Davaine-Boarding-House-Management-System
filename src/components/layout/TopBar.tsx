import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { SearchField } from '@/components/ui/SearchField';
import { Select, type SelectAnchor, type SelectOption } from '@/components/ui/Select';
import { DefaultTheme } from '@/constants/defaultTheme';

type TopBarProps = {
  searchValue: string;
  onSearchChange: (text: string) => void;
  notificationCount?: number;
  adminName?: string;
  adminRole?: string;
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
  onProfilePress,
  onSignOut,
  style,
}: TopBarProps) {
  const { width } = useWindowDimensions();
  const compact = width < DefaultTheme.layout.compactNavigation;

  return (
    <GlassPanel variant="bar" style={[styles.root, style]}>
      <SearchField
        value={searchValue}
        onChangeText={onSearchChange}
        placeholder={compact ? 'Search…' : 'Search rooms, tenants, bills…'}
        style={styles.search}
      />
      <View style={styles.actions}>
        <LiveClock showCaption={!compact} />
        <NotificationBell count={notificationCount} />
        <AdminMenu
          name={adminName}
          role={adminRole}
          showDetails={!compact}
          onProfilePress={onProfilePress}
          onSignOut={onSignOut}
        />
      </View>
    </GlassPanel>
  );
}

function LiveClock({ showCaption }: { showCaption: boolean }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const time = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <View style={styles.clock}>
      <Text style={styles.clockTime} numberOfLines={1}>
        {time}
      </Text>
      {showCaption && (
        <Text style={styles.clockCaption} numberOfLines={1}>
          LOCAL TIME
        </Text>
      )}
    </View>
  );
}

function NotificationBell({ count }: { count: number }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Notifications" style={styles.bell}>
      <AppIcon name="bell" size={19} tintColor={DefaultTheme.colors.muted} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1}>
            {count > 9 ? '9+' : count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function AdminMenu({
  name,
  role,
  showDetails,
  onProfilePress,
  onSignOut,
}: {
  name: string;
  role: string;
  showDetails: boolean;
  onProfilePress?: () => void;
  onSignOut?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<SelectAnchor | null>(null);
  const triggerRef = useRef<View>(null);
  const nameParts = name.split(' ').filter(Boolean);
  const initials = (nameParts.length > 1 ? nameParts.slice(0, 2).map((part) => part[0]).join('') : name.slice(0, 2))
    .toUpperCase();

  const handleTogglePress = () => {
    if (open) {
      setOpen(false);
      return;
    }
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
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
        style={styles.adminMenu}
        onPress={handleTogglePress}>
        <View style={styles.avatar}>
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
      </Pressable>
      <Select visible={open} onClose={() => setOpen(false)} options={menuOptions} anchor={anchor} align="right" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    height: 68,
    paddingHorizontal: 18,
    borderRadius: DefaultTheme.radius.lg,
    zIndex: 50,
  },
  search: {
    flex: 1,
    maxWidth: 420,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginLeft: 'auto',
  },
  clock: {
    minWidth: 96,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: DefaultTheme.radius.sm,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
    backgroundColor: DefaultTheme.colors.cool,
    alignItems: 'center',
  },
  clockTime: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 13.5,
  },
  clockCaption: {
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DefaultTheme.colors.cool,
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
    gap: 8,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
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
