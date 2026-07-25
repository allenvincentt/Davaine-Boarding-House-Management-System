import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
} from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { GlassMaterial } from '@/components/ui/GlassPanel';
import { DefaultTheme } from '@/constants/defaultTheme';
import type { AppIconName } from '@/constants/icons';

export type SelectOption = {
  key: string;
  label: string;
  icon?: AppIconName;
  destructive?: boolean;
  onSelect: () => void;
};

export type SelectAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type SelectProps = {
  visible: boolean;
  onClose: () => void;
  options: SelectOption[];
  anchor: SelectAnchor | null;
  align?: 'left' | 'right';
  minWidth?: number;
};

const OPEN_DURATION = 160;
const CLOSE_DURATION = 120;
const ANCHOR_GAP = 10;
const ITEM_HEIGHT = 38;
const PANEL_PADDING = 12;
const SCREEN_MARGIN = 12;
const PANEL_RADIUS = DefaultTheme.radius.md;
const BLUR_ENABLED = Platform.OS !== 'android';

export function Select({ visible, onClose, options, anchor, align = 'right', minWidth = 170 }: SelectProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [mounted, setMounted] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

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
  }, [visible, progress, mounted]);

  if (!mounted || !anchor) {
    return null;
  }

  const panelHeight = options.length * ITEM_HEIGHT + PANEL_PADDING;
  const belowTop = anchor.y + anchor.height + ANCHOR_GAP;
  const flipAbove =
    belowTop + panelHeight > windowHeight - SCREEN_MARGIN &&
    anchor.y - ANCHOR_GAP - panelHeight > SCREEN_MARGIN;
  const top = flipAbove
    ? anchor.y - ANCHOR_GAP - panelHeight
    : Math.min(belowTop, Math.max(windowHeight - panelHeight - SCREEN_MARGIN, SCREEN_MARGIN));
  const horizontalStyle =
    align === 'left'
      ? { left: Math.max(anchor.x, SCREEN_MARGIN) }
      : { right: Math.max(windowWidth - (anchor.x + anchor.width), SCREEN_MARGIN) };

  return (
    <RNModal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close menu"
      />
      <Animated.View
        style={[
          styles.panel,
          { top, minWidth },
          horizontalStyle,
          {
            opacity: progress,
            transform: [
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) },
              { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
            ],
          },
        ]}>
        <GlassMaterial
          variant="control"
          backgroundHint={DefaultTheme.colors.background}
          radius={PANEL_RADIUS}
          blurEnabled={BLUR_ENABLED}
        />
        {options.map((option, index) => (
          <SelectItem
            key={option.key}
            option={option}
            onClose={onClose}
            isLast={index === options.length - 1}
          />
        ))}
      </Animated.View>
    </RNModal>
  );
}

function SelectItem({
  option,
  onClose,
  isLast,
}: {
  option: SelectOption;
  onClose: () => void;
  isLast: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const tintColor = option.destructive ? '#D64545' : DefaultTheme.colors.muted;

  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityLabel={option.label}
      style={[styles.item, !isLast && styles.itemDivider, hovered && styles.itemHovered]}
      onPress={() => {
        onClose();
        option.onSelect();
      }}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}>
      {option.icon && <AppIcon name={option.icon} size={16} tintColor={tintColor} />}
      <Text style={[styles.itemText, option.destructive && styles.itemTextDestructive]} numberOfLines={1}>
        {option.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    paddingVertical: 6,
    borderRadius: PANEL_RADIUS,
    backgroundColor: 'rgba(249, 247, 240, 0.72)',
    overflow: 'hidden',
    shadowColor: '#69705A',
    shadowOpacity: 0.2,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  itemHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.55)',
  },
  itemText: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13,
  },
  itemTextDestructive: {
    color: '#D64545',
  },
});
