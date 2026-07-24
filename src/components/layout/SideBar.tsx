import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/AppIcon';
import { BrandMark } from '@/components/ui/BrandMark';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { adminNavFlat, adminNavigation, type AdminNavItem, type AdminSection } from '@/constants/adminNav';
import { DefaultTheme } from '@/constants/defaultTheme';

export const SIDEBAR_WIDTH_EXPANDED = 248;
export const SIDEBAR_WIDTH_COLLAPSED = 84;
export const SIDEBAR_MARGIN = 16;

type SideBarProps = {
  activeSection: AdminSection;
  onNavigate: (section: AdminSection) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export function SideBar({ activeSection, onNavigate, collapsed, onToggleCollapsed }: SideBarProps) {
  const { width } = useWindowDimensions();
  const { top: safeAreaTop, bottom: safeAreaBottom } = useSafeAreaInsets();
  const compact = width < DefaultTheme.layout.compactNavigation;
  const collapseProgress = useRef(new Animated.Value(collapsed ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(collapseProgress, {
      toValue: collapsed ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [collapsed, collapseProgress]);

  if (compact) {
    return (
      <GlassPanel
        variant="floating"
        reflection
        style={[styles.mobileShell, { bottom: Math.max(safeAreaBottom, 10) + 10 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mobileScrollContent}>
          {adminNavFlat.map((item) => (
            <MobileNavChip
              key={item.section}
              item={item}
              active={activeSection === item.section}
              onPress={() => onNavigate(item.section)}
            />
          ))}
        </ScrollView>
      </GlassPanel>
    );
  }

  const panelWidth = collapseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [SIDEBAR_WIDTH_EXPANDED, SIDEBAR_WIDTH_COLLAPSED],
  });
  const labelOpacity = collapseProgress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [1, 0, 0],
  });

  return (
    <GlassPanel
      variant="floating"
      style={[
        styles.desktopShell,
        {
          marginTop: safeAreaTop + SIDEBAR_MARGIN,
          marginBottom: safeAreaBottom + SIDEBAR_MARGIN,
          marginLeft: SIDEBAR_MARGIN,
          width: panelWidth,
        },
      ]}>
      <View style={styles.brandRow}>
        <View style={styles.brandMark}>
          <BrandMark size={30} />
        </View>
        <Animated.View style={[styles.brandText, { opacity: labelOpacity }]} pointerEvents="none">
          <Text style={styles.brandName} numberOfLines={1}>
            Davaine
          </Text>
          <Text style={styles.brandCaption} numberOfLines={1}>
            Boarding House System
          </Text>
        </Animated.View>
      </View>

      <ScrollView
        style={styles.nav}
        contentContainerStyle={styles.navContent}
        showsVerticalScrollIndicator={false}>
        {adminNavigation.map((group) => (
          <View key={group.label} style={styles.group}>
            <Animated.Text
              style={[styles.groupLabel, { opacity: labelOpacity }]}
              numberOfLines={1}
              pointerEvents="none">
              {group.label.toUpperCase()}
            </Animated.Text>
            {group.items.map((item) => (
              <SideNavItem
                key={item.section}
                item={item}
                active={activeSection === item.section}
                collapsed={collapsed}
                labelOpacity={labelOpacity}
                onPress={() => onNavigate(item.section)}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={styles.collapseButton}
        onPress={onToggleCollapsed}>
        <AppIcon
          name={collapsed ? 'chevronRight' : 'chevronLeft'}
          size={16}
          tintColor={DefaultTheme.colors.muted}
        />
        <Animated.Text style={[styles.collapseLabel, { opacity: labelOpacity }]} numberOfLines={1}>
          Collapse sidebar
        </Animated.Text>
      </Pressable>
    </GlassPanel>
  );
}

function SideNavItem({
  item,
  active,
  collapsed,
  labelOpacity,
  onPress,
}: {
  item: AdminNavItem;
  active: boolean;
  collapsed: boolean;
  labelOpacity: Animated.AnimatedInterpolation<number>;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.navItem,
        active && styles.navItemActive,
        pressed && !active && styles.navItemPressed,
        collapsed && styles.navItemCollapsed,
      ]}>
      <AppIcon
        name={item.icon}
        size={17}
        tintColor={active ? DefaultTheme.colors.white : DefaultTheme.colors.muted}
      />
      <Animated.Text
        style={[
          styles.navItemLabel,
          { opacity: labelOpacity, color: active ? DefaultTheme.colors.white : DefaultTheme.colors.muted },
        ]}
        numberOfLines={1}>
        {item.label}
      </Animated.Text>
      {active && !collapsed && <View style={styles.navItemDot} />}
    </Pressable>
  );
}

function MobileNavChip({
  item,
  active,
  onPress,
}: {
  item: AdminNavItem;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={styles.mobileChip}>
      <View style={[styles.mobileChipIcon, active && styles.mobileChipIconActive]}>
        <AppIcon
          name={item.icon}
          size={18}
          tintColor={active ? DefaultTheme.colors.white : DefaultTheme.colors.muted}
        />
      </View>
      <Text
        style={[styles.mobileChipLabel, active && styles.mobileChipLabelActive]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.1}>
        {item.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  desktopShell: {
    paddingVertical: 18,
    paddingHorizontal: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 6,
    paddingBottom: 16,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: DefaultTheme.colors.line,
  },
  brandMark: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    flex: 1,
  },
  brandName: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 15,
  },
  brandCaption: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 10.5,
  },
  nav: {
    flex: 1,
  },
  navContent: {
    paddingBottom: 8,
  },
  group: {
    marginBottom: 14,
  },
  groupLabel: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 10.5,
    letterSpacing: 0.6,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 42,
    borderRadius: DefaultTheme.radius.md,
    paddingHorizontal: 12,
    marginBottom: 3,
  },
  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  navItemActive: {
    backgroundColor: DefaultTheme.colors.primary,
  },
  navItemPressed: {
    backgroundColor: DefaultTheme.colors.softOlive,
  },
  navItemLabel: {
    flex: 1,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13.5,
  },
  navItemDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: DefaultTheme.colors.white,
  },
  collapseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 40,
    paddingHorizontal: 12,
    marginTop: 8,
    borderRadius: DefaultTheme.radius.md,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  collapseLabel: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 12.5,
  },
  mobileShell: {
    position: 'absolute',
    left: 12,
    right: 12,
    maxWidth: 560,
    alignSelf: 'center',
    paddingVertical: 8,
    borderRadius: 30,
    zIndex: 30,
  },
  mobileScrollContent: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    gap: 4,
  },
  mobileChip: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 4,
  },
  mobileChipIcon: {
    width: 36,
    height: 36,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileChipIconActive: {
    backgroundColor: DefaultTheme.colors.primary,
  },
  mobileChipLabel: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 9.5,
    textAlign: 'center',
  },
  mobileChipLabelActive: {
    color: DefaultTheme.colors.primary,
  },
});
