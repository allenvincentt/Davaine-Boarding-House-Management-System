import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/AppIcon';
import { BrandMark } from '@/components/ui/BrandMark';
import { GlowingButton, GlowingButtonGhostMetrics } from '@/components/ui/buttons/GlowingButton';
import {
  GlassLensView,
  GlassPanel,
  GlassPressable,
  useGlassInteraction,
  useGlassLens,
  useLensMagnify,
  type GlassLensController,
  type GlassLensTarget,
} from '@/components/ui/GlassPanel';
import { adminNavFlat, adminNavigation, type AdminNavItem, type AdminSection } from '@/constants/adminNav';
import { DefaultTheme } from '@/constants/defaultTheme';
import { GlassMotion } from '@/constants/glassTheme';

type ItemLocalLayout = { x: number; y: number; width: number; height: number };

export const SIDEBAR_WIDTH_EXPANDED = 248;
export const SIDEBAR_WIDTH_COLLAPSED = 84;
export const SIDEBAR_MARGIN = 16;

const SHELL_PADDING_EXPANDED = 14;
const SHELL_PADDING_COLLAPSED = 10;
const BRAND_MARK_SIZE = 28;
const NAV_ICON_CENTER_SHIFT = Math.max(
  (SIDEBAR_WIDTH_COLLAPSED -
    SHELL_PADDING_COLLAPSED * 2 -
    GlowingButtonGhostMetrics.paddingHorizontal * 2 -
    GlowingButtonGhostMetrics.iconSlot) /
    2,
  0,
);

const MATCHA_SHADOW = {
  shadowColor: DefaultTheme.colors.primary,
  shadowOpacity: 0.1,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 7,
};

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
  const shellInteraction = useGlassInteraction({ shimmerOnPress: false });
  const railInteraction = useGlassInteraction({ shimmerOnPress: false });
  const railLens = useGlassLens('x');
  const [railLayouts, setRailLayouts] = useState<Partial<Record<AdminSection, GlassLensTarget>>>({});

  const registerRailLayout = useCallback((section: AdminSection, event: LayoutChangeEvent) => {
    const { x, y, width: cellWidth, height } = event.nativeEvent.layout;
    const next: GlassLensTarget = {
      x: x + 2,
      y: y + 1,
      width: Math.max(cellWidth - 4, 24),
      height: Math.max(height - 2, 24),
    };

    setRailLayouts((current) => {
      const previous = current[section];
      if (
        previous &&
        previous.x === next.x &&
        previous.y === next.y &&
        previous.width === next.width &&
        previous.height === next.height
      ) {
        return current;
      }
      return { ...current, [section]: next };
    });
  }, []);

  useEffect(() => {
    const target = railLayouts[activeSection];
    if (target) {
      railLens.moveTo(target);
    }
  }, [activeSection, railLayouts, railLens]);

  const navLens = useGlassLens('y');
  const [groupOffsets, setGroupOffsets] = useState<Record<string, number>>({});
  const [navItemLayouts, setNavItemLayouts] = useState<Partial<Record<AdminSection, ItemLocalLayout>>>({});
  const previousActiveSection = useRef<AdminSection | null>(null);

  const sectionGroupLabel = useMemo(() => {
    const map: Partial<Record<AdminSection, string>> = {};
    for (const group of adminNavigation) {
      for (const item of group.items) {
        map[item.section] = group.label;
      }
    }
    return map;
  }, []);

  const registerGroupLayout = useCallback((label: string, event: LayoutChangeEvent) => {
    const { y } = event.nativeEvent.layout;
    setGroupOffsets((current) => (current[label] === y ? current : { ...current, [label]: y }));
  }, []);

  const registerNavItemLayout = useCallback((section: AdminSection, event: LayoutChangeEvent) => {
    const { x, y, width: itemWidth, height } = event.nativeEvent.layout;
    setNavItemLayouts((current) => {
      const previous = current[section];
      if (
        previous &&
        previous.x === x &&
        previous.y === y &&
        previous.width === itemWidth &&
        previous.height === height
      ) {
        return current;
      }
      return { ...current, [section]: { x, y, width: itemWidth, height } };
    });
  }, []);

  useEffect(() => {
    const groupLabel = sectionGroupLabel[activeSection];
    const itemLayout = navItemLayouts[activeSection];
    if (!groupLabel || !itemLayout) {
      return;
    }
    const groupY = groupOffsets[groupLabel];
    if (groupY === undefined) {
      return;
    }

    const target: GlassLensTarget = {
      x: itemLayout.x,
      y: groupY + itemLayout.y,
      width: Math.max(itemLayout.width, 24),
      height: Math.max(itemLayout.height, 30),
    };

    if (previousActiveSection.current !== activeSection) {
      previousActiveSection.current = activeSection;
      navLens.moveTo(target);
    } else {
      navLens.resize(target);
    }
  }, [activeSection, sectionGroupLabel, navItemLayouts, groupOffsets, navLens]);

  useEffect(() => {
    Animated.timing(collapseProgress, {
      toValue: collapsed ? 1 : 0,
      duration: GlassMotion.morph.duration,
      easing: GlassMotion.morph.easing,
      useNativeDriver: false,
    }).start();
  }, [collapsed, collapseProgress]);

  const handleToggleCollapsed = useCallback(() => {
    shellInteraction.triggerShimmer();
    onToggleCollapsed();
  }, [onToggleCollapsed, shellInteraction]);

  useEffect(() => {
    if (compact) {
      railInteraction.triggerShimmer();
    }
  }, [activeSection, compact, railInteraction]);

  if (compact) {
    return (
      <GlassPanel
        variant="floating"
        backgroundHint={DefaultTheme.colors.background}
        reflection
        sheen
        interaction={railInteraction}
        style={[styles.mobileShell, { bottom: Math.max(safeAreaBottom, 10) + 10 }, MATCHA_SHADOW]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mobileScrollContent}>
          <GlassLensView lens={railLens} radius={22} backgroundHint={DefaultTheme.colors.background} />
          {adminNavFlat.map((item) => (
            <MobileNavChip
              key={item.section}
              item={item}
              active={activeSection === item.section}
              lens={railLens}
              layout={railLayouts[item.section]}
              onLayout={(event) => registerRailLayout(item.section, event)}
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
  const groupLabelSpace = labelOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, 6] });
  const iconShift = collapseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, NAV_ICON_CENTER_SHIFT],
  });
  const chevronRotate = collapseProgress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <GlassPanel
      variant="floating"
      backgroundHint={DefaultTheme.colors.background}
      reflection
      sheen
      interaction={shellInteraction}
      reflectionStyle={styles.shellReflection}
      style={[
        styles.desktopShell,
        {
          marginTop: safeAreaTop + SIDEBAR_MARGIN,
          marginBottom: safeAreaBottom + SIDEBAR_MARGIN,
          marginLeft: SIDEBAR_MARGIN,
          width: panelWidth,
          borderRadius: collapseProgress.interpolate({ inputRange: [0, 1], outputRange: [32, 40] }),
          paddingHorizontal: collapseProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [SHELL_PADDING_EXPANDED, SHELL_PADDING_COLLAPSED],
          }),
        },
        MATCHA_SHADOW,
      ]}>
      <View style={styles.brandRow}>
        <Animated.View style={[styles.brandMark, { transform: [{ translateX: iconShift }] }]}>
          <BrandMark size={BRAND_MARK_SIZE} />
        </Animated.View>
        <Animated.View style={[styles.brandText, { opacity: labelOpacity }]} pointerEvents="none">
          <Text style={styles.brandName} numberOfLines={1}>
            Davaine
          </Text>
          <Text style={styles.brandCaption} numberOfLines={1}>
            Boarding House System
          </Text>
        </Animated.View>
      </View>

      <GlassPressable
        accessibilityLabel={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        variant="control"
        radius={16}
        lift={1}
        flex={0.08}
        style={styles.collapseBump}
        onPress={handleToggleCollapsed}>
        <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
          <AppIcon name="chevronLeft" size={14} tintColor={DefaultTheme.colors.muted} />
        </Animated.View>
      </GlassPressable>

      <ScrollView
        style={styles.nav}
        contentContainerStyle={styles.navContent}
        showsVerticalScrollIndicator={false}>
        <GlassLensView
          lens={navLens}
          radius={DefaultTheme.radius.md}
          backgroundHint={DefaultTheme.colors.background}
        />
        {adminNavigation.map((group) => (
          <View key={group.label} style={styles.group} onLayout={(event) => registerGroupLayout(group.label, event)}>
            <Animated.Text
              style={[styles.groupLabel, { opacity: labelOpacity, marginBottom: groupLabelSpace }]}
              numberOfLines={1}
              pointerEvents="none">
              {group.label.toUpperCase()}
            </Animated.Text>
            {group.items.map((item) => (
              <GlowingButton
                key={item.section}
                variant="ghost"
                icon={item.icon}
                label={item.label}
                active={activeSection === item.section}
                labelOpacity={labelOpacity}
                iconOffsetX={iconShift}
                accessibilityLabel={item.label}
                accessibilityState={{ selected: activeSection === item.section }}
                style={styles.navItem}
                onLayout={(event) => registerNavItemLayout(item.section, event)}
                onPress={() => onNavigate(item.section)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </GlassPanel>
  );
}

function MobileNavChip({
  item,
  active,
  lens,
  layout,
  onLayout,
  onPress,
}: {
  item: AdminNavItem;
  active: boolean;
  lens: GlassLensController;
  layout?: GlassLensTarget;
  onLayout: (event: LayoutChangeEvent) => void;
  onPress: () => void;
}) {
  const interaction = useGlassInteraction();
  const magnify = useLensMagnify(lens, layout, 'x');
  const activeProgress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(activeProgress, {
      toValue: active ? 1 : 0,
      duration: GlassMotion.travel.duration,
      easing: GlassMotion.travel.easing,
      useNativeDriver: false,
    }).start();
  }, [active, activeProgress]);

  const scale = useMemo(
    () =>
      Animated.multiply(
        interaction.press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.93] }),
        magnify ?? 1,
      ),
    [interaction.press, magnify],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      onLayout={onLayout}
      onPress={onPress}
      onHoverIn={interaction.handlers.onHoverIn}
      onHoverOut={interaction.handlers.onHoverOut}
      onPressIn={interaction.handlers.onPressIn}
      onPressOut={interaction.handlers.onPressOut}
      style={styles.mobileChip}>
      <Animated.View style={[styles.mobileChipContent, { transform: [{ scale }] }]}>
        <View style={styles.mobileChipIcon}>
          <Animated.View
            style={[
              styles.mobileChipIconLayer,
              { opacity: activeProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
            ]}>
            <AppIcon name={item.icon} size={18} tintColor={DefaultTheme.colors.muted} />
          </Animated.View>
          <Animated.View style={[styles.mobileChipIconLayer, { opacity: activeProgress }]}>
            <AppIcon name={item.icon} size={18} tintColor={DefaultTheme.colors.primary} />
          </Animated.View>
        </View>
        <Animated.Text
          style={[
            styles.mobileChipLabel,
            {
              color: activeProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [DefaultTheme.colors.muted, DefaultTheme.colors.primary],
              }),
            },
          ]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.1}>
          {item.label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  desktopShell: {
    paddingVertical: 18,
  },
  shellReflection: {
    left: 30,
    right: 30,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GlowingButtonGhostMetrics.gap,
    paddingHorizontal: GlowingButtonGhostMetrics.paddingHorizontal,
    paddingBottom: 16,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.55)',
  },
  brandMark: {
    width: GlowingButtonGhostMetrics.iconSlot,
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
  collapseBump: {
    position: 'absolute',
    top: 2,
    right: -12,
    width: 30,
    height: 30,
    zIndex: 5,
  },
  nav: {
    flex: 1,
  },
  navContent: {
    position: 'relative',
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
    paddingHorizontal: GlowingButtonGhostMetrics.paddingHorizontal,
  },
  navItem: {
    width: '100%',
    marginBottom: GlowingButtonGhostMetrics.spacing,
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
    position: 'relative',
    flexDirection: 'row',
    paddingHorizontal: 8,
    gap: 4,
  },
  mobileChip: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  mobileChipContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  mobileChipIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileChipIconLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileChipLabel: {
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 9.5,
    textAlign: 'center',
  },
});
