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
  GlassMaterial,
  GlassPanel,
  GlassPressable,
  useGlassInteraction,
  useGlassLens,
  type GlassLensTarget,
} from '@/components/ui/GlassPanel';
import { adminNavFlat, adminNavigation, type AdminNavItem, type AdminSection } from '@/constants/adminNav';
import { DefaultTheme } from '@/constants/defaultTheme';
import { GlassMotion } from '@/constants/glassTheme';

type ItemLocalLayout = { x: number; y: number; width: number; height: number };
type RailLayout = { x: number; width: number };

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

const TAB_HEIGHT = 42;
const TAB_ICON_SIZE = 20;
const TAB_PADDING = 11;
const TAB_LABEL_GAP = 8;

const MATCHA_SHADOW = {
  shadowColor: DefaultTheme.colors.primary,
  shadowOpacity: 0.1,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 7,
};

const MATCHA_SHADOW_COMPACT = {
  shadowColor: DefaultTheme.colors.primary,
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

type SideBarProps = {
  activeSection: AdminSection;
  onNavigate: (section: AdminSection) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSignOut?: () => void;
};

export function SideBar({
  activeSection,
  onNavigate,
  collapsed,
  onToggleCollapsed,
  onSignOut,
}: SideBarProps) {
  const { width } = useWindowDimensions();
  const { top: safeAreaTop, bottom: safeAreaBottom } = useSafeAreaInsets();
  const compact = width < DefaultTheme.layout.compactNavigation;
  const collapseProgress = useRef(new Animated.Value(collapsed ? 1 : 0)).current;
  const shellInteraction = useGlassInteraction({ shimmerOnPress: false });
  const railInteraction = useGlassInteraction({ shimmerOnPress: false });

  const railScrollRef = useRef<ScrollView>(null);
  const railViewportWidth = useRef(0);
  const railLayouts = useRef<Partial<Record<AdminSection, RailLayout>>>({});

  const registerRailLayout = useCallback((section: AdminSection, event: LayoutChangeEvent) => {
    const { x, width: tabWidth } = event.nativeEvent.layout;
    railLayouts.current[section] = { x, width: tabWidth };
  }, []);

  const handleRailViewport = useCallback((event: LayoutChangeEvent) => {
    railViewportWidth.current = event.nativeEvent.layout.width;
  }, []);

  useEffect(() => {
    if (!compact) {
      return;
    }

    const timer = setTimeout(() => {
      const layout = railLayouts.current[activeSection];
      const viewport = railViewportWidth.current;
      if (!layout || viewport === 0) {
        return;
      }
      const offset = layout.x + layout.width / 2 - viewport / 2;
      railScrollRef.current?.scrollTo({ x: Math.max(offset, 0), animated: true });
    }, 80);

    return () => clearTimeout(timer);
  }, [activeSection, compact]);

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
        style={[styles.mobileShell, { bottom: Math.max(safeAreaBottom, 10) + 10 }, MATCHA_SHADOW_COMPACT]}>
        <ScrollView
          ref={railScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={handleRailViewport}
          contentContainerStyle={styles.mobileScrollContent}>
          {adminNavFlat.map((item) => (
            <MobileNavTab
              key={item.section}
              item={item}
              active={activeSection === item.section}
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

      {onSignOut && (
        <View style={styles.footer}>
          <GlowingButton
            variant="ghost"
            icon="signOut"
            label="Sign out"
            labelOpacity={labelOpacity}
            iconOffsetX={iconShift}
            accessibilityLabel="Sign out"
            style={styles.navItem}
            onPress={onSignOut}
          />
        </View>
      )}
    </GlassPanel>
  );
}

function MobileNavTab({
  item,
  active,
  onLayout,
  onPress,
}: {
  item: AdminNavItem;
  active: boolean;
  onLayout: (event: LayoutChangeEvent) => void;
  onPress: () => void;
}) {
  const interaction = useGlassInteraction();
  const activeProgress = useRef(new Animated.Value(active ? 1 : 0)).current;
  const [labelWidth, setLabelWidth] = useState(0);

  useEffect(() => {
    Animated.timing(activeProgress, {
      toValue: active ? 1 : 0,
      duration: GlassMotion.morph.duration,
      easing: GlassMotion.morph.easing,
      useNativeDriver: false,
    }).start();
  }, [active, activeProgress]);

  const measureLabel = useCallback((event: LayoutChangeEvent) => {
    const measured = Math.ceil(event.nativeEvent.layout.width);
    setLabelWidth((current) => (current === measured ? current : measured));
  }, []);

  const scale = interaction.press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.93] });

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      onLayout={onLayout}
      onPress={onPress}
      onHoverIn={interaction.handlers.onHoverIn}
      onHoverOut={interaction.handlers.onHoverOut}
      onPressIn={interaction.handlers.onPressIn}
      onPressOut={interaction.handlers.onPressOut}>
      <Animated.View
        style={[
          styles.mobileTab,
          {
            paddingHorizontal: activeProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [TAB_PADDING, TAB_PADDING + 3],
            }),
            transform: [{ scale }],
          },
        ]}>
        <Animated.View style={[styles.mobileTabPill, { opacity: activeProgress }]} pointerEvents="none">
          <View style={styles.mobileTabTint} />
          <GlassMaterial
            variant="chip"
            radius={DefaultTheme.radius.pill}
            blurEnabled={false}
            interaction={interaction}
            sheen
          />
        </Animated.View>

        <View style={styles.mobileTabIcon}>
          <Animated.View
            style={[
              styles.mobileTabIconLayer,
              { opacity: activeProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
            ]}>
            <AppIcon name={item.icon} size={TAB_ICON_SIZE} tintColor={DefaultTheme.colors.muted} />
          </Animated.View>
          <Animated.View style={[styles.mobileTabIconLayer, { opacity: activeProgress }]}>
            <AppIcon name={item.icon} size={TAB_ICON_SIZE} tintColor={DefaultTheme.colors.primary} />
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.mobileTabLabelClip,
            { width: Animated.multiply(activeProgress, labelWidth + TAB_LABEL_GAP) },
          ]}>
          <Animated.Text
            style={[styles.mobileTabLabel, { width: labelWidth, opacity: activeProgress }]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.1}>
            {item.label}
          </Animated.Text>
        </Animated.View>

        <View style={styles.mobileTabMeasure} pointerEvents="none">
          <Text style={styles.mobileTabLabel} numberOfLines={1} onLayout={measureLabel}>
            {item.label}
          </Text>
        </View>
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
  footer: {
    paddingTop: 10,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.55)',
  },
  mobileShell: {
    position: 'absolute',
    left: 12,
    right: 12,
    maxWidth: 560,
    alignSelf: 'center',
    paddingVertical: 7,
    borderRadius: 30,
    zIndex: 30,
  },
  mobileScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  mobileTab: {
    height: TAB_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DefaultTheme.radius.pill,
  },
  mobileTabPill: {
    ...StyleSheet.absoluteFill,
    borderRadius: DefaultTheme.radius.pill,
    overflow: 'hidden',
  },
  mobileTabTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(138, 153, 0, 0.13)',
  },
  mobileTabIcon: {
    width: TAB_ICON_SIZE + 4,
    height: TAB_ICON_SIZE + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileTabIconLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileTabLabelClip: {
    overflow: 'hidden',
    justifyContent: 'center',
    paddingLeft: TAB_LABEL_GAP,
  },
  mobileTabLabel: {
    color: DefaultTheme.colors.primary,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 12,
  },
  mobileTabMeasure: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 260,
    flexDirection: 'row',
    opacity: 0,
  },
});
