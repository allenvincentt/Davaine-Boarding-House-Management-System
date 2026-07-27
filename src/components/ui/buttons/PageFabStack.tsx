import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/AppIcon';
import { GradientButton } from '@/components/ui/buttons/GradientButton';
import { DefaultTheme } from '@/constants/defaultTheme';
import type { AppIconName } from '@/constants/icons';

export type ScrollDirection = 'down' | 'up';

export type PageScrollNavigator = {
  scrollProps: {
    scrollRef: RefObject<ScrollView | null>;
    scrollEventThrottle: number;
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    onLayout: (event: LayoutChangeEvent) => void;
    onContentSizeChange: (width: number, height: number) => void;
  };
  targetProps: {
    onLayout: (event: LayoutChangeEvent) => void;
  };
  direction: ScrollDirection | null;
  scrolling: boolean;
  scrollTo: (direction: ScrollDirection) => void;
};

const SCROLL_EVENT_THROTTLE = 16;
const MIN_SCROLLABLE = 80;
const TARGET_OFFSET = 12;
const MIN_REACH = 48;
const REACH_SLACK = 40;
const RETURN_SLACK = 96;
const IDLE_DELAY = 260;
const SETTLE_DELAY = 240;
const REVEAL_DURATION = 220;
const FLIP_DURATION = 260;
const LABEL_DURATION = 220;
const FAB_SIZE = 48;
const FAB_ICON = 20;
const LABEL_GAP = 10;

export function usePageScrollNavigator(): PageScrollNavigator {
  const scrollRef = useRef<ScrollView>(null);
  const metrics = useRef({ offset: 0, viewport: 0, content: 0, targetY: 0 });
  const anchorRef = useRef(0);
  const directionRef = useRef<ScrollDirection | null>(null);
  const scrollingRef = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [direction, setDirection] = useState<ScrollDirection | null>(null);
  const [scrolling, setScrolling] = useState(false);

  const sync = useCallback(() => {
    const { offset, viewport, content, targetY } = metrics.current;
    const maxOffset = Math.max(content - viewport, 0);
    const desired = targetY > TARGET_OFFSET ? targetY - TARGET_OFFSET : maxOffset;
    const anchor = Math.min(Math.max(desired, 0), maxOffset);
    anchorRef.current = anchor;

    const reachPoint = Math.max(anchor - REACH_SLACK, MIN_REACH);
    const returnPoint = Math.max(reachPoint - RETURN_SLACK, 0);

    const next: ScrollDirection | null =
      viewport <= 0 || maxOffset <= MIN_SCROLLABLE || anchor <= 0
        ? null
        : offset >= reachPoint
          ? 'up'
          : offset <= returnPoint
            ? 'down'
            : (directionRef.current ?? 'down');

    if (next !== directionRef.current) {
      directionRef.current = next;
      setDirection(next);
    }
  }, []);

  const markActivity = useCallback(() => {
    if (!scrollingRef.current) {
      scrollingRef.current = true;
      setScrolling(true);
    }

    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
    }

    idleTimer.current = setTimeout(() => {
      idleTimer.current = null;
      scrollingRef.current = false;
      setScrolling(false);
    }, IDLE_DELAY);
  }, []);

  useEffect(
    () => () => {
      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
      }
    },
    [],
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      metrics.current.offset = Math.max(event.nativeEvent.contentOffset.y, 0);
      markActivity();
      sync();
    },
    [markActivity, sync],
  );

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      metrics.current.viewport = Math.round(event.nativeEvent.layout.height);
      sync();
    },
    [sync],
  );

  const onContentSizeChange = useCallback(
    (_width: number, height: number) => {
      metrics.current.content = Math.round(height);
      sync();
    },
    [sync],
  );

  const onTargetLayout = useCallback(
    (event: LayoutChangeEvent) => {
      metrics.current.targetY = Math.round(event.nativeEvent.layout.y);
      sync();
    },
    [sync],
  );

  const scrollTo = useCallback(
    (next: ScrollDirection) => {
      const y = next === 'down' ? anchorRef.current : 0;
      scrollRef.current?.scrollTo({ y, animated: true });
      metrics.current.offset = y;
      markActivity();
      sync();
    },
    [markActivity, sync],
  );

  return useMemo(
    () => ({
      scrollProps: {
        scrollRef,
        scrollEventThrottle: SCROLL_EVENT_THROTTLE,
        onScroll,
        onLayout,
        onContentSizeChange,
      },
      targetProps: { onLayout: onTargetLayout },
      direction,
      scrolling,
      scrollTo,
    }),
    [onScroll, onLayout, onContentSizeChange, onTargetLayout, direction, scrolling, scrollTo],
  );
}

type PageFabStackProps = {
  navigator?: PageScrollNavigator;
  primaryIcon?: AppIconName;
  primaryLabel?: string;
  onPrimaryPress?: () => void;
  downLabel?: string;
  upLabel?: string;
};

export function PageFabStack({
  navigator,
  primaryIcon,
  primaryLabel,
  onPrimaryPress,
  downLabel = 'To Table',
  upLabel = 'Back to Top',
}: PageFabStackProps) {
  const { bottom } = useSafeAreaInsets();
  const showPrimary = !!primaryIcon && !!onPrimaryPress;

  if (!navigator && !showPrimary) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={[styles.stack, { bottom: Math.max(bottom, 10) + 82 }]}>
      {!!navigator && (
        <ScrollNavigationFab navigator={navigator} downLabel={downLabel} upLabel={upLabel} />
      )}
      {showPrimary && (
        <GradientButton
          variant="fab"
          accessibilityLabel={primaryLabel}
          style={styles.fab}
          onPress={onPrimaryPress}>
          <AppIcon name={primaryIcon} size={FAB_ICON} tintColor={DefaultTheme.colors.white} />
        </GradientButton>
      )}
    </View>
  );
}

function ScrollNavigationFab({
  navigator,
  downLabel,
  upLabel,
}: {
  navigator: PageScrollNavigator;
  downLabel: string;
  upLabel: string;
}) {
  const { direction, scrolling, scrollTo } = navigator;
  const visible = direction !== null;

  const reveal = useRef(new Animated.Value(0)).current;
  const flip = useRef(new Animated.Value(0)).current;
  const expand = useRef(new Animated.Value(0)).current;
  const [resting, setResting] = useState<ScrollDirection>('down');
  const [labelWidth, setLabelWidth] = useState(0);
  const [travelling, setTravelling] = useState(false);

  if (direction && direction !== resting) {
    setResting(direction);
  }

  const label = resting === 'up' ? upLabel : downLabel;
  const expanded = visible && travelling && labelWidth > 0;

  useEffect(() => {
    if (!travelling || scrolling) {
      return;
    }

    const timer = setTimeout(() => setTravelling(false), SETTLE_DELAY);
    return () => clearTimeout(timer);
  }, [travelling, scrolling]);

  useEffect(() => {
    Animated.timing(reveal, {
      toValue: visible ? 1 : 0,
      duration: REVEAL_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [visible, reveal]);

  useEffect(() => {
    Animated.timing(flip, {
      toValue: resting === 'up' ? 1 : 0,
      duration: FLIP_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [resting, flip]);

  useEffect(() => {
    Animated.timing(expand, {
      toValue: expanded ? 1 : 0,
      duration: LABEL_DURATION,
      easing: expanded ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [expanded, expand]);

  const grow = labelWidth + LABEL_GAP;

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[
        styles.scrollFab,
        {
          opacity: reveal,
          transform: [
            { scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) },
            { translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
          ],
        },
      ]}>
      <GradientButton
        variant="fab"
        accessibilityLabel={label}
        style={[
          styles.fab,
          {
            width: expand.interpolate({
              inputRange: [0, 1],
              outputRange: [FAB_SIZE, FAB_SIZE + grow],
            }),
          },
        ]}
        onPress={() => {
          if (!direction) {
            return;
          }
          setTravelling(true);
          scrollTo(direction);
        }}>
        <View style={styles.fabContent}>
          <Animated.View
            style={[
              styles.labelClip,
              {
                width: expand.interpolate({ inputRange: [0, 1], outputRange: [0, grow] }),
                opacity: expand,
              },
            ]}>
            <Text style={[styles.label, labelWidth > 0 && { width: labelWidth }]} numberOfLines={1}>
              {label}
            </Text>
          </Animated.View>
          <Animated.View
            style={{
              transform: [
                {
                  rotate: flip.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '180deg'],
                  }),
                },
              ],
            }}>
            <AppIcon name="arrowDown" size={FAB_ICON} tintColor={DefaultTheme.colors.white} />
          </Animated.View>
        </View>
      </GradientButton>

      <View pointerEvents="none" style={styles.measureLayer}>
        <Text
          style={styles.label}
          numberOfLines={1}
          onLayout={(event) => {
            const next = Math.ceil(event.nativeEvent.layout.width);
            setLabelWidth((current) => (current === next ? current : next));
          }}>
          {label}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    right: 20,
    alignItems: 'flex-end',
    gap: 12,
    zIndex: 20,
  },
  fab: {
    position: 'relative',
    right: 0,
    bottom: 0,
    width: FAB_SIZE,
    height: FAB_SIZE,
    minHeight: FAB_SIZE,
  },
  scrollFab: {
    alignSelf: 'flex-end',
  },
  fabContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelClip: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  label: {
    color: DefaultTheme.colors.white,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 13.5,
  },
  measureLayer: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 220,
    opacity: 0,
    alignItems: 'flex-end',
  },
});
