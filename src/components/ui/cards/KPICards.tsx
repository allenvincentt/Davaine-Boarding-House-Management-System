import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { DefaultTheme } from '@/constants/defaultTheme';
import type { AppIconName } from '@/constants/icons';

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
  style,
}: KPICardProps) {
  const trendColor = trend?.direction === 'down' ? '#C4453B' : '#4C8A2E';

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.iconBadge, { backgroundColor: iconBackground }]}>
          <AppIcon name={icon} size={16} tintColor={iconColor} />
        </View>
      </View>
      <Text style={styles.value}>{value}</Text>
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
        <Text style={styles.caption} numberOfLines={1}>
          {caption}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.trackFill,
            { backgroundColor: accentColor, width: `${Math.round(progress * 100)}%` },
          ]}
        />
      </View>
    </View>
  );
}

type KPICardsRowProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function KPICardsRow({ children, style }: KPICardsRowProps) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
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
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: DefaultTheme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    marginTop: 10,
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 28,
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
  track: {
    marginTop: 12,
    height: 4,
    borderRadius: 2,
    backgroundColor: DefaultTheme.colors.line,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 2,
  },
});
