import { useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Stop } from 'react-native-svg';

import { AnimatedCircle, AnimatedPath } from '@/components/ui/charts/AnimatedSvg';
import { DefaultTheme } from '@/constants/defaultTheme';
import { useEntranceProgress } from '@/hooks/useEntranceAnimation';

export type LineSeries = {
  key: string;
  color: string;
  values: number[];
  fill?: boolean;
};

type LineAreaChartProps = {
  labels: string[];
  series: LineSeries[];
  height?: number;
  maxValue?: number;
};

const Y_AXIS_WIDTH = 26;
const PADDING_TOP = 10;
const TICK_COUNT = 4;
const DRAW_DURATION = 1250;
const DRAW_DELAY = 120;
const DOT_WINDOW = 0.12;

export function LineAreaChart({ labels, series, height = 210, maxValue }: LineAreaChartProps) {
  const [width, setWidth] = useState(0);
  const draw = useEntranceProgress(DRAW_DURATION, DRAW_DELAY, width > 0);

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const topTick = useMemo(() => {
    const highest = maxValue ?? Math.max(1, ...series.flatMap((entry) => entry.values));
    const step = Math.ceil(highest / TICK_COUNT / 6) * 6 || 6;
    return step * TICK_COUNT;
  }, [maxValue, series]);

  const ticks = useMemo(() => {
    const values: number[] = [];
    for (let i = TICK_COUNT; i >= 0; i -= 1) {
      values.push(Math.round((topTick / TICK_COUNT) * i));
    }
    return values;
  }, [topTick]);

  const plotHeight = height - PADDING_TOP;
  const xStep = labels.length > 1 ? width / (labels.length - 1) : 0;

  const toPoint = (index: number, value: number) => ({
    x: xStep * index,
    y: PADDING_TOP + plotHeight - (value / topTick) * plotHeight,
  });

  const lines = useMemo(() => {
    if (width === 0) {
      return [];
    }
    return series.map((entry) => {
      const points = entry.values.map((value, index) => toPoint(index, value));
      const d = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
      const areaD = entry.fill
        ? `${d} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`
        : null;
      const length = points.reduce((sum, point, index) => {
        if (index === 0) {
          return sum;
        }
        const previous = points[index - 1];
        return sum + Math.hypot(point.x - previous.x, point.y - previous.y);
      }, 0);
      return { key: entry.key, color: entry.color, d, areaD, points, length: Math.max(length, 1) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, width, height, labels.length]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.plotRow}>
        <View style={styles.yAxis}>
          {ticks.map((tick) => (
            <Text key={tick} style={styles.axisLabel}>
              {tick}
            </Text>
          ))}
        </View>
        <View style={{ flex: 1, height }} onLayout={handleLayout}>
          {width > 0 && (
            <Svg width={width} height={height}>
              <Defs>
                {lines.map((line) =>
                  line.areaD ? (
                    <LinearGradient
                      key={`grad-${line.key}`}
                      id={`grad-${line.key}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1">
                      <Stop offset="0" stopColor={line.color} stopOpacity={0.24} />
                      <Stop offset="1" stopColor={line.color} stopOpacity={0} />
                    </LinearGradient>
                  ) : null,
                )}
              </Defs>
              {ticks.map((tick) => {
                const y = PADDING_TOP + plotHeight - (tick / topTick) * plotHeight;
                return (
                  <Line
                    key={tick}
                    x1={0}
                    y1={y}
                    x2={width}
                    y2={y}
                    stroke={DefaultTheme.colors.line}
                    strokeWidth={1}
                  />
                );
              })}
              {lines.map((line) =>
                line.areaD ? (
                  <AnimatedPath
                    key={`area-${line.key}`}
                    d={line.areaD}
                    fill={`url(#grad-${line.key})`}
                    stroke="none"
                    opacity={draw}
                  />
                ) : null,
              )}
              {lines.map((line) => (
                <AnimatedPath
                  key={`line-${line.key}`}
                  d={line.d}
                  stroke={line.color}
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={`${line.length} ${line.length}`}
                  strokeDashoffset={draw.interpolate({
                    inputRange: [0, 1],
                    outputRange: [line.length, 0],
                  })}
                />
              ))}
              {lines.map((line) =>
                line.points.map((point, index) => {
                  const reached =
                    line.points.length > 1
                      ? (index / (line.points.length - 1)) * (1 - DOT_WINDOW)
                      : 0;
                  const appear = draw.interpolate({
                    inputRange: [reached, reached + DOT_WINDOW],
                    outputRange: [0, 1],
                    extrapolate: 'clamp',
                  });
                  return (
                    <AnimatedCircle
                      key={`dot-${line.key}-${index}`}
                      cx={point.x}
                      cy={point.y}
                      r={appear.interpolate({ inputRange: [0, 1], outputRange: [0, 3.5] })}
                      opacity={appear}
                      fill={line.color}
                    />
                  );
                }),
              )}
            </Svg>
          )}
        </View>
      </View>
      <View style={[styles.xAxis, { paddingLeft: Y_AXIS_WIDTH }]}>
        {labels.map((label) => (
          <Text key={label} style={styles.axisLabel}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  plotRow: {
    flexDirection: 'row',
  },
  yAxis: {
    width: Y_AXIS_WIDTH,
    justifyContent: 'space-between',
    paddingTop: PADDING_TOP,
    paddingBottom: 4,
  },
  xAxis: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisLabel: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11,
  },
});
