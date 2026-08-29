import { Children, cloneElement, isValidElement, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { DefaultTheme } from '@/constants/defaultTheme';
import type { AppIconName } from '@/constants/icons';
import { useCountUp, useEntranceProgress } from '@/hooks/useEntranceAnimation';

const ENTRANCE_DURATION = 720;
const COUNT_DURATION = 1100;
const TRACK_DURATION = 1000;
const HOVER_DURATION = 200;
const STAGGER = 90;
const GAP = 16;
const COMPACT_GAP = 12;
const COMPACT_BREAKPOINT = DefaultTheme.layout.tablet;

type KPITrend = {
  direction: 'up' | 'down';
  value: string;
};

type KPICardProps = {
  label: string;
  value: string | number;
  icon: AppIconName;
  iconColor: string;
  iconBackground: string;
  accentColor: string;
  caption: string;
  trend?: KPITrend;
  progress?: number;
  delay?: number;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function KPICard({
  label,
  value,
  icon,
  iconColor,
  iconBackground,
  accentColor,
  caption,
  trend,
  progress = 1,
  delay = 0,
  compact = false,
  style,
}: KPICardProps) {
  const trendColor = trend?.direction === 'down' ? '#C4453B' : '#4C8A2E';
  const numeric = typeof value === 'number';
  const fill = Math.round(Math.min(Math.max(progress, 0), 1) * 100);

  const entrance = useEntranceProgress(ENTRANCE_DURATION, delay);
  const trackProgress = useEntranceProgress(TRACK_DURATION, delay + 140);
  const counted = useCountUp(numeric ? (value as number) : 0, COUNT_DURATION, delay + 80, numeric);
  const hover = useRef(new Animated.Value(0)).current;

  const animateHover = (toValue: number) => {
    Animated.timing(hover, {
      toValue,
      duration: HOVER_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  return (
    <Animated.View
      onPointerEnter={() => animateHover(1)}
      onPointerLeave={() => animateHover(0)}
      style={[
        styles.card,
        compact && styles.cardCompact,
        style,
        {
          opacity: entrance,
          borderColor: hover.interpolate({
            inputRange: [0, 1],
            outputRange: [DefaultTheme.colors.line, accentColor],
          }),
          shadowColor: hover.interpolate({
            inputRange: [0, 1],
            outputRange: ['#4D4E47', accentColor],
          }),
          shadowOpacity: hover.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.24] }),
          shadowRadius: hover.interpolate({ inputRange: [0, 1], outputRange: [12, 20] }),
          elevation: hover.interpolate({ inputRange: [0, 1], outputRange: [2, 7] }),
          transform: [
            {
              translateY: Animated.add(
                entrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
                hover.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }),
              ),
            },
            { scale: hover.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] }) },
          ],
        },
      ]}>
      <View style={styles.header}>
        <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={compact ? 2 : undefined}>
          {label}
        </Text>
        <View
          style={[
            styles.iconBadge,
            compact && styles.iconBadgeCompact,
            { backgroundColor: iconBackground },
          ]}>
          <AppIcon name={icon} size={compact ? 14 : 16} tintColor={iconColor} />
        </View>
      </View>
      <Text style={[styles.value, compact && styles.valueCompact]} numberOfLines={1}>
        {numeric ? counted : value}
      </Text>
      <View style={styles.captionRow}>
        {trend && (
          <View style={styles.trend}>
            <AppIcon
              name={trend.direction === 'down' ? 'trendDown' : 'trendUp'}
              size={11}
              tintColor={trendColor}
            />
            <Text style={[styles.trendText, { color: trendColor }]}>{trend.value}</Text>
          </View>
        )}
        <Text style={[styles.caption, compact && styles.captionCompact]} numberOfLines={compact ? 2 : 1}>
          {caption}
        </Text>
      </View>
      <View style={[styles.track, compact && styles.trackCompact]}>
        <Animated.View
          style={[
            styles.trackFill,
            {
              backgroundColor: accentColor,
              width: trackProgress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', `${fill}%`],
              }),
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

type KPICardsRowProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function KPICardsRow({ children, style }: KPICardsRowProps) {
  const { width } = useWindowDimensions();
  const compact = width < COMPACT_BREAKPOINT;
  const [rowWidth, setRowWidth] = useState(0);

  const gap = compact ? COMPACT_GAP : GAP;
  const cardWidth = compact && rowWidth > 0 ? (rowWidth - gap) / 2 : null;

  return (
    <View
      onLayout={(event) => {
        const next = Math.round(event.nativeEvent.layout.width);
        setRowWidth((current) => (current === next ? current : next));
      }}
      style={[styles.row, { gap }, style]}>
      {Children.map(children, (child, index) => {
        if (!isValidElement<KPICardProps>(child)) {
          return child;
        }

        return cloneElement(child, {
          delay: child.props.delay ?? index * STAGGER,
          compact: child.props.compact ?? compact,
          style: cardWidth
            ? [child.props.style, { width: cardWidth, flexGrow: 0, flexBasis: 'auto' as const }]
            : child.props.style,
        });
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    flexGrow: 1,
    flexBasis: 170,
    minWidth: 150,
    padding: 16,
    borderRadius: DefaultTheme.radius.md,
    backgroundColor: DefaultTheme.colors.white,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
    shadowColor: '#4D4E47',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardCompact: {
    padding: 12,
    minWidth: 0,
    flexBasis: 'auto',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: {
    flex: 1,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
  },
  labelCompact: {
    fontSize: 11.5,
    lineHeight: 15,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: DefaultTheme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeCompact: {
    width: 26,
    height: 26,
  },
  value: {
    marginTop: 10,
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 28,
  },
  valueCompact: {
    marginTop: 8,
    fontSize: 22,
  },
  captionRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trendText: {
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 11.5,
  },
  caption: {
    flexShrink: 1,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11.5,
  },
  captionCompact: {
    fontSize: 10.5,
    lineHeight: 14,
  },
  track: {
    marginTop: 12,
    height: 4,
    borderRadius: 2,
    backgroundColor: DefaultTheme.colors.line,
    overflow: 'hidden',
  },
  trackCompact: {
    marginTop: 10,
  },
  trackFill: {
    height: '100%',
    borderRadius: 2,
  },
});
