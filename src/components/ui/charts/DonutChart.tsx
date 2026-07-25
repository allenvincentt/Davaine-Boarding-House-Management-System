import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AnimatedCircle } from '@/components/ui/charts/AnimatedSvg';
import { DefaultTheme } from '@/constants/defaultTheme';
import { useCountUp, useEntranceProgress } from '@/hooks/useEntranceAnimation';

const SWEEP_DURATION = 1150;
const SWEEP_DELAY = 140;

export type DonutSegment = {
  value: number;
  color: string;
};

type DonutChartProps = {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  centerLabel?: string;
  centerValue?: number;
  centerSuffix?: string;
  centerCaption?: string;
};

export function DonutChart({
  segments,
  size = 168,
  strokeWidth = 20,
  trackColor = DefaultTheme.colors.line,
  centerLabel,
  centerValue,
  centerSuffix = '',
  centerCaption,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  const sweep = useEntranceProgress(SWEEP_DURATION, SWEEP_DELAY);
  const counted = useCountUp(centerValue ?? 0, SWEEP_DURATION, SWEEP_DELAY, centerValue !== undefined);

  const arcs = useMemo(() => {
    let cumulative = 0;
    return segments
      .map((segment) => {
        const fraction = total > 0 ? segment.value / total : 0;
        const start = cumulative;
        cumulative += fraction;
        return {
          color: segment.color,
          length: fraction * circumference,
          rotation: -90 + start * 360,
          start,
          end: cumulative,
        };
      })
      .filter((arc) => arc.length > 0);
  }, [segments, total, circumference]);

  const centerText = centerValue !== undefined ? `${counted}${centerSuffix}` : centerLabel;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {arcs.map((arc, index) => (
          <AnimatedCircle
            key={index}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arc.length} ${circumference}`}
            strokeDashoffset={sweep.interpolate({
              inputRange: [arc.start, arc.end],
              outputRange: [arc.length, 0],
              extrapolate: 'clamp',
            })}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(${arc.rotation} ${size / 2} ${size / 2})`}
          />
        ))}
      </Svg>
      {(centerText || centerCaption) && (
        <View style={styles.center} pointerEvents="none">
          {centerText && <Text style={styles.centerLabel}>{centerText}</Text>}
          {centerCaption && <Text style={styles.centerCaption}>{centerCaption}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 30,
  },
  centerCaption: {
    marginTop: 2,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
  },
});
