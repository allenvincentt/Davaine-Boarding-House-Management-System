import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Platform,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type ScrollRevealProps = {
  children: ReactNode;
  scrollY: number;
  delay?: number;
  duration?: number;
  distance?: number;
  enabled?: boolean;
  threshold?: number;
  style?: StyleProp<ViewStyle>;
  onLayout?: (event: LayoutChangeEvent) => void;
};

export function ScrollReveal({
  children,
  scrollY,
  delay = 0,
  duration = 980,
  distance = 44,
  enabled = true,
  threshold = 0.88,
  style,
  onLayout,
}: ScrollRevealProps) {
  const { height } = useWindowDimensions();
  const viewRef = useRef<View | null>(null);
  const progress = useRef(new Animated.Value(enabled ? 0 : 1)).current;
  const opacityProgress = useRef(new Animated.Value(enabled ? 0 : 1)).current;
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [animating, setAnimating] = useState(false);
  const revealed = useRef(false);

  const handleLayout = (event: LayoutChangeEvent) => {
    setLayoutVersion((current) => current + 1);
    onLayout?.(event);
  };

  useEffect(() => {
    if (!enabled || revealed.current || layoutVersion === 0) {
      return;
    }

    viewRef.current?.measureInWindow((_x, y, _width, measuredHeight) => {
      if (revealed.current || measuredHeight <= 0 || y > height * threshold || y + measuredHeight < 0) {
        return;
      }

      revealed.current = true;
      setAnimating(true);
      Animated.parallel([
        Animated.timing(progress, {
          toValue: 1,
          duration,
          delay,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          isInteraction: false,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacityProgress, {
          toValue: 1,
          duration: Math.min(duration, 820),
          delay,
          easing: Easing.out(Easing.quad),
          isInteraction: false,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setAnimating(false);
        }
      });
    });
  }, [delay, duration, enabled, height, layoutVersion, opacityProgress, progress, scrollY, threshold]);

  useEffect(() => {
    return () => {
      opacityProgress.stopAnimation();
      progress.stopAnimation();
    };
  }, [opacityProgress, progress]);

  return (
    <Animated.View
      ref={viewRef}
      onLayout={handleLayout}
      needsOffscreenAlphaCompositing={Platform.OS === 'android' && animating}
      renderToHardwareTextureAndroid={Platform.OS === 'android' && animating}
      shouldRasterizeIOS={Platform.OS === 'ios' && animating}
      style={[
        style,
        enabled && {
          opacity:
            Platform.OS === 'web'
              ? opacityProgress
              : opacityProgress.interpolate({ inputRange: [0, 1], outputRange: [0.001, 1] }),
          transform: [
            {
              translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }),
            },
            {
              scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }),
            },
          ],
        },
      ]}>
      {children}
    </Animated.View>
  );
}
