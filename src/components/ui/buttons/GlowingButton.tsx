import { useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type PointerEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { DefaultTheme } from '@/constants/defaultTheme';

type GlowingButtonProps = {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const glowSize = 132;
const webGlowStyle: ViewStyle & { backgroundImage: string } = {
  backgroundImage:
    'radial-gradient(circle, rgba(250,255,204,0.98) 0%, rgba(206,217,104,0.58) 24%, rgba(138,153,0,0.22) 48%, rgba(138,153,0,0) 72%)',
};

export function GlowingButton({ label, onPress, style, textStyle }: GlowingButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const hoverProgress = useRef(new Animated.Value(0)).current;
  const pointerX = useRef(new Animated.Value(-glowSize)).current;
  const pointerY = useRef(new Animated.Value(-glowSize)).current;
  const hovered = useRef(false);
  const focused = useRef(false);
  const pressing = useRef(false);

  const animateHover = (toValue: number, duration = toValue === 1 ? 180 : 360) => {
    hoverProgress.stopAnimation();
    Animated.timing(hoverProgress, {
      toValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const positionGlow = (x: number, y: number) => {
    pointerX.setValue(x - glowSize / 2);
    pointerY.setValue(y - glowSize / 2);
  };

  const releaseGlow = () => {
    if (hovered.current || focused.current) {
      animateHover(1);
      return;
    }

    hoverProgress.stopAnimation();
    Animated.sequence([
      Animated.delay(140),
      Animated.timing(hoverProgress, {
        toValue: 0,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  };

  const animateScale = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      damping: 17,
      stiffness: 240,
      mass: 0.7,
      useNativeDriver: false,
    }).start();
  };

  const centerGlow = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    pointerX.setValue(width / 2 - glowSize / 2);
    pointerY.setValue(height / 2 - glowSize / 2);
  };

  const followPointer = (event: PointerEvent) => {
    positionGlow(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
  };

  return (
    <Animated.View
      style={[
        styles.shell,
        style,
        {
          shadowOpacity: hoverProgress.interpolate({ inputRange: [0, 1], outputRange: [0.13, 0.25] }),
          transform: [
            {
              translateY: hoverProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }),
            },
            { scale },
          ],
        },
      ]}>
      <View style={styles.surface} onLayout={centerGlow}>
        <Animated.View
          style={[
            styles.glow,
            Platform.OS === 'web' && webGlowStyle,
            {
              opacity: hoverProgress,
              transform: [{ translateX: pointerX }, { translateY: pointerY }],
            },
          ]}
        />
        <View style={styles.reflection} />
        <View style={styles.labelWrap}>
          <Animated.Text
            accessible={false}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            maxFontSizeMultiplier={1.2}
            style={[
              styles.label,
              {
                color: hoverProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [DefaultTheme.colors.primary, '#5F6C00'],
                }),
                textShadowColor: hoverProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['rgba(138,153,0,0)', 'rgba(138,153,0,0.28)'],
                }),
                textShadowRadius: hoverProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 6] }),
                transform: [
                  {
                    scale: hoverProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }),
                  },
                ],
              },
              textStyle,
            ]}>
            {label}
          </Animated.Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={onPress}
          onPointerMove={followPointer}
          onPointerEnter={() => {
            hovered.current = true;
            animateHover(1);
          }}
          onPointerLeave={() => {
            hovered.current = false;
            if (!pressing.current && !focused.current) {
              animateHover(0);
            }
          }}
          onFocus={() => {
            focused.current = true;
            animateHover(1);
          }}
          onBlur={() => {
            focused.current = false;
            if (!hovered.current && !pressing.current) {
              animateHover(0);
            }
          }}
          onPressIn={(event) => {
            pressing.current = true;
            positionGlow(event.nativeEvent.locationX, event.nativeEvent.locationY);
            animateScale(0.97);
            animateHover(1, 110);
          }}
          onPressOut={() => {
            pressing.current = false;
            animateScale(1);
            releaseGlow();
          }}
          style={styles.pressable}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: 54,
    borderRadius: DefaultTheme.radius.md,
    shadowColor: DefaultTheme.colors.primary,
    shadowOpacity: 0.13,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  surface: {
    flex: 1,
    minHeight: 54,
    overflow: 'hidden',
    borderRadius: DefaultTheme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(138,153,0,0.38)',
    backgroundColor: DefaultTheme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: glowSize,
    height: glowSize,
    borderRadius: glowSize / 2,
    pointerEvents: 'none',
    experimental_backgroundImage:
      'radial-gradient(circle, rgba(250,255,204,0.98) 0%, rgba(206,217,104,0.58) 24%, rgba(138,153,0,0.22) 48%, rgba(138,153,0,0) 72%)',
  },
  reflection: {
    position: 'absolute',
    top: 2,
    right: 18,
    left: 18,
    height: 1,
    borderRadius: DefaultTheme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
    pointerEvents: 'none',
  },
  labelWrap: {
    zIndex: 1,
    pointerEvents: 'none',
  },
  label: {
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 14,
    letterSpacing: 0.1,
    textShadowOffset: { width: 0, height: 2 },
  },
  pressable: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2,
    borderRadius: DefaultTheme.radius.md,
    cursor: 'pointer',
  },
});
