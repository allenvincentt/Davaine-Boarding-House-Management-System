import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { DefaultTheme } from '@/constants/defaultTheme';

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
  centerCaption?: string;
};

export function DonutChart({
  segments,
  size = 168,
  strokeWidth = 20,
  trackColor = DefaultTheme.colors.line,
  centerLabel,
  centerCaption,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  const arcs = useMemo(() => {
    let cumulative = 0;
    return segments.map((segment) => {
      const fraction = total > 0 ? segment.value / total : 0;
      const dashArray = `${Math.max(fraction * circumference, 0)} ${circumference}`;
      const dashOffset = -cumulative * circumference;
      cumulative += fraction;
      return { color: segment.color, dashArray, dashOffset };
    });
  }, [segments, total, circumference]);

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
          <Circle
            key={index}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeDasharray={arc.dashArray}
            strokeDashoffset={arc.dashOffset}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ))}
      </Svg>
      {(centerLabel || centerCaption) && (
        <View style={styles.center} pointerEvents="none">
          {centerLabel && <Text style={styles.centerLabel}>{centerLabel}</Text>}
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
