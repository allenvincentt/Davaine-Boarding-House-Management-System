import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  useWindowDimensions,
  type DimensionValue,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { DefaultTheme } from '@/constants/defaultTheme';

const SWEEP_DURATION = 1250;
const BASE_COLOR = '#ECEAE1';
const HIGHLIGHT_COLOR = 'rgba(255, 255, 255, 0.78)';

const sweep = new Animated.Value(0);
let sweepSubscribers = 0;
let sweepLoop: Animated.CompositeAnimation | null = null;

function useSweep() {
  useEffect(() => {
    sweepSubscribers += 1;

    if (!sweepLoop) {
      sweep.setValue(0);
      sweepLoop = Animated.loop(
        Animated.timing(sweep, {
          toValue: 1,
          duration: SWEEP_DURATION,
          easing: Easing.inOut(Easing.quad),
          isInteraction: false,
          useNativeDriver: true,
        }),
      );
      sweepLoop.start();
    }

    return () => {
      sweepSubscribers -= 1;
      if (sweepSubscribers <= 0) {
        sweepSubscribers = 0;
        sweepLoop?.stop();
        sweepLoop = null;
        sweep.setValue(0);
      }
    };
  }, []);

  return sweep;
}

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({ width = '100%', height = 12, radius = 8, style }: SkeletonProps) {
  const progress = useSweep();
  const [measured, setMeasured] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    setMeasured((current) => (current === next ? current : next));
  };

  const highlightWidth = Math.max(measured * 0.55, 72);
  const translateX = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [-highlightWidth, measured + highlightWidth],
      }),
    [progress, highlightWidth, measured],
  );

  return (
    <View
      onLayout={handleLayout}
      style={[styles.block, { width, height, borderRadius: radius }, style]}>
      {measured > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.highlight,
            { width: highlightWidth, transform: [{ translateX }, { skewX: '-16deg' }] },
          ]}
        />
      )}
    </View>
  );
}

export function SkeletonCircle({
  size = 40,
  style,
}: {
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <Skeleton width={size} height={size} radius={size / 2} style={style} />;
}

type SkeletonTextProps = {
  lines?: number;
  lineHeight?: number;
  gap?: number;
  lastLineWidth?: DimensionValue;
  style?: StyleProp<ViewStyle>;
};

export function SkeletonText({
  lines = 3,
  lineHeight = 11,
  gap = 8,
  lastLineWidth = '62%',
  style,
}: SkeletonTextProps) {
  return (
    <View style={[{ gap }, style]}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          height={lineHeight}
          radius={lineHeight / 2}
          width={index === lines - 1 && lines > 1 ? lastLineWidth : '100%'}
        />
      ))}
    </View>
  );
}

function SkeletonRegion({
  label,
  children,
  style,
}: {
  label: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={style}>
      {children}
    </View>
  );
}

export function SkeletonKPIRow({
  count = 4,
  label = 'Loading summary figures',
  style,
}: {
  count?: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { width } = useWindowDimensions();
  const compact = width < DefaultTheme.layout.tablet;
  const [rowWidth, setRowWidth] = useState(0);

  const gap = compact ? 12 : 16;
  const cardWidth = compact && rowWidth > 0 ? (rowWidth - gap) / 2 : undefined;

  return (
    <SkeletonRegion label={label}>
      <View
        onLayout={(event) => {
          const next = Math.round(event.nativeEvent.layout.width);
          setRowWidth((current) => (current === next ? current : next));
        }}
        style={[styles.kpiRow, { gap }, style]}>
        {Array.from({ length: count }, (_, index) => (
          <View
            key={index}
            style={[
              styles.kpiCard,
              compact && styles.kpiCardCompact,
              cardWidth ? { width: cardWidth, flexGrow: 0, flexBasis: 'auto' } : null,
            ]}>
            <View style={styles.kpiHeader}>
              <Skeleton width="58%" height={10} />
              <Skeleton
                width={compact ? 26 : 30}
                height={compact ? 26 : 30}
                radius={DefaultTheme.radius.sm}
              />
            </View>
            <Skeleton width="52%" height={compact ? 20 : 26} radius={8} style={styles.kpiValue} />
            <Skeleton width="76%" height={9} style={styles.kpiCaption} />
            <Skeleton height={4} radius={2} style={styles.kpiTrack} />
          </View>
        ))}
      </View>
    </SkeletonRegion>
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  label = 'Loading records',
  style,
}: {
  rows?: number;
  columns?: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { width } = useWindowDimensions();
  const stacked = width < DefaultTheme.layout.tablet;

  if (stacked) {
    return (
      <SkeletonRegion label={label} style={style}>
        <View style={styles.stack}>
          {Array.from({ length: rows }, (_, index) => (
            <View key={index} style={styles.stackedRow}>
              <View style={styles.stackedHeader}>
                <SkeletonCircle size={34} />
                <View style={styles.stackedHeaderText}>
                  <Skeleton width="64%" height={11} />
                  <Skeleton width="42%" height={9} style={styles.tightTop} />
                </View>
                <Skeleton width={62} height={20} radius={DefaultTheme.radius.pill} />
              </View>
              <SkeletonText
                lines={2}
                lineHeight={9}
                gap={7}
                lastLineWidth="48%"
                style={styles.stackedBody}
              />
            </View>
          ))}
        </View>
      </SkeletonRegion>
    );
  }

  return (
    <SkeletonRegion label={label} style={style}>
      <View style={styles.tableHeader}>
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton key={index} width={index === 0 ? '26%' : '16%'} height={9} />
        ))}
      </View>
      <View style={styles.stack}>
        {Array.from({ length: rows }, (_, rowIndex) => (
          <View key={rowIndex} style={styles.tableRow}>
            {Array.from({ length: columns }, (_, columnIndex) => (
              <View
                key={columnIndex}
                style={columnIndex === 0 ? styles.tableLeadCell : styles.tableCell}>
                {columnIndex === 0 ? (
                  <View style={styles.leadCellInner}>
                    <SkeletonCircle size={30} />
                    <View style={styles.leadCellText}>
                      <Skeleton width="72%" height={10} />
                      <Skeleton width="46%" height={8} style={styles.tightTop} />
                    </View>
                  </View>
                ) : (
                  <Skeleton
                    width={columnIndex === columns - 1 ? '54%' : '70%'}
                    height={10}
                  />
                )}
              </View>
            ))}
          </View>
        ))}
      </View>
    </SkeletonRegion>
  );
}

export function SkeletonCardGrid({
  count = 6,
  cardWidth = '100%',
  height = 250,
  label = 'Loading rooms',
  style,
}: {
  count?: number;
  cardWidth?: DimensionValue;
  height?: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SkeletonRegion label={label} style={style}>
      <View style={styles.grid}>
        {Array.from({ length: count }, (_, index) => (
          <View key={index} style={[styles.gridCard, { width: cardWidth }]}>
            <Skeleton height={Math.round(height * 0.52)} radius={DefaultTheme.radius.sm} />
            <View style={styles.gridCardBody}>
              <Skeleton width="58%" height={13} />
              <Skeleton width="38%" height={10} style={styles.tightTop} />
              <SkeletonText
                lines={2}
                lineHeight={9}
                gap={7}
                lastLineWidth="66%"
                style={styles.gridCardText}
              />
              <View style={styles.gridCardFooter}>
                <Skeleton width={84} height={26} radius={DefaultTheme.radius.pill} />
                <Skeleton width={64} height={12} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </SkeletonRegion>
  );
}

export function SkeletonList({
  rows = 4,
  showAvatar = true,
  label = 'Loading items',
  style,
}: {
  rows?: number;
  showAvatar?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SkeletonRegion label={label} style={style}>
      <View style={styles.stack}>
        {Array.from({ length: rows }, (_, index) => (
          <View key={index} style={styles.listRow}>
            {showAvatar && <SkeletonCircle size={38} />}
            <View style={styles.listRowBody}>
              <View style={styles.listRowHeader}>
                <Skeleton width="46%" height={11} />
                <Skeleton width={54} height={18} radius={DefaultTheme.radius.pill} />
              </View>
              <SkeletonText
                lines={2}
                lineHeight={9}
                gap={7}
                lastLineWidth="58%"
                style={styles.tightTop}
              />
            </View>
          </View>
        ))}
      </View>
    </SkeletonRegion>
  );
}

export function SkeletonGallery({
  count = 4,
  tileWidth = 160,
  tileHeight = 110,
  label = 'Loading photos',
  style,
}: {
  count?: number;
  tileWidth?: DimensionValue;
  tileHeight?: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SkeletonRegion label={label} style={style}>
      <View style={styles.gallery}>
        {Array.from({ length: count }, (_, index) => (
          <View key={index} style={[styles.galleryTile, { width: tileWidth }]}>
            <Skeleton height={tileHeight} radius={DefaultTheme.radius.sm} />
            <Skeleton width="64%" height={9} style={styles.tightTop} />
          </View>
        ))}
      </View>
    </SkeletonRegion>
  );
}

export function SkeletonChart({
  height = 190,
  label = 'Loading chart',
  style,
}: {
  height?: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const bars = [0.42, 0.68, 0.55, 0.86, 0.72, 0.94];

  return (
    <SkeletonRegion label={label} style={style}>
      <View style={styles.chartLegend}>
        <Skeleton width={72} height={9} />
        <Skeleton width={58} height={9} />
      </View>
      <View style={[styles.chartBars, { height }]}>
        {bars.map((ratio, index) => (
          <Skeleton
            key={index}
            width={`${Math.round(100 / bars.length) - 3}%`}
            height={Math.round(height * ratio)}
            radius={10}
          />
        ))}
      </View>
    </SkeletonRegion>
  );
}

const styles = StyleSheet.create({
  block: {
    overflow: 'hidden',
    backgroundColor: BASE_COLOR,
  },
  highlight: {
    position: 'absolute',
    top: -8,
    bottom: -8,
    backgroundColor: HIGHLIGHT_COLOR,
  },
  tightTop: {
    marginTop: 7,
  },
  stack: {
    gap: 12,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  kpiCard: {
    flexGrow: 1,
    flexBasis: 170,
    minWidth: 150,
    padding: 16,
    borderRadius: DefaultTheme.radius.md,
    backgroundColor: DefaultTheme.colors.white,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  kpiCardCompact: {
    padding: 12,
    minWidth: 0,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  kpiValue: {
    marginTop: 12,
  },
  kpiCaption: {
    marginTop: 10,
  },
  kpiTrack: {
    marginTop: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 14,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: DefaultTheme.colors.line,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  tableCell: {
    flex: 1,
    minWidth: 0,
  },
  tableLeadCell: {
    flex: 1.8,
    minWidth: 0,
  },
  leadCellInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  leadCellText: {
    flex: 1,
    minWidth: 0,
  },
  stackedRow: {
    padding: 14,
    borderRadius: DefaultTheme.radius.md,
    backgroundColor: DefaultTheme.colors.white,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  stackedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stackedHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  stackedBody: {
    marginTop: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  gridCard: {
    padding: 12,
    borderRadius: DefaultTheme.radius.md,
    backgroundColor: DefaultTheme.colors.white,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  gridCardBody: {
    marginTop: 14,
  },
  gridCardText: {
    marginTop: 10,
  },
  gridCardFooter: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  listRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: DefaultTheme.radius.md,
    backgroundColor: DefaultTheme.colors.white,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  listRowBody: {
    flex: 1,
    minWidth: 0,
  },
  listRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  galleryTile: {
    minWidth: 0,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
});
