import { useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { DefaultTheme } from '@/constants/defaultTheme';
import type { AppIconName } from '@/constants/icons';

type MatchaButtonProps = {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  suffix?: string;
  icon?: AppIconName;
  variant?: 'solid' | 'outline';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function MatchaButton({
  label,
  onPress,
  suffix,
  icon,
  variant = 'solid',
  disabled = false,
  style,
  textStyle,
}: MatchaButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const hoverProgress = useRef(new Animated.Value(0)).current;
  const hovered = useRef(false);

  const animateScale = (toValue: number) => {
    Animated.timing(scale, {
      toValue,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const animateHover = (toValue: number) => {
    Animated.timing(hoverProgress, {
      toValue,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.button,
        variant === 'outline' && styles.outlineButton,
        disabled && styles.disabledButton,
        style,
        {
          backgroundColor: hoverProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [
              variant === 'outline' ? 'transparent' : DefaultTheme.colors.primary,
              variant === 'outline' ? DefaultTheme.colors.softOlive : DefaultTheme.colors.buttonHover,
            ],
          }),
          shadowOpacity: hoverProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [variant === 'outline' ? 0 : 0.16, variant === 'outline' ? 0.08 : 0.24],
          }),
          transform: [
            {
              translateY: hoverProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }),
            },
            { scale },
          ],
        },
      ]}>
      {icon && (
        <AppIcon
          name={icon}
          size={16}
          tintColor={variant === 'outline' ? DefaultTheme.colors.primary : DefaultTheme.colors.white}
        />
      )}
      <Animated.Text
        accessible={false}
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
        style={[
          styles.label,
          variant === 'outline' && styles.outlineLabel,
          {
            color: variant === 'outline' ? DefaultTheme.colors.primary : DefaultTheme.colors.white,
          },
          textStyle,
        ]}>
        {label}
      </Animated.Text>
      {suffix && (
        <Animated.Text
          accessible={false}
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
          style={[
            styles.suffix,
            variant === 'outline' && styles.outlineLabel,
            {
              color: variant === 'outline' ? DefaultTheme.colors.primary : DefaultTheme.colors.white,
            },
          ]}>
          {suffix}
        </Animated.Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        style={styles.pressable}
        onPress={onPress}
        onHoverIn={() => {
          hovered.current = true;
          animateHover(1);
        }}
        onHoverOut={() => {
          hovered.current = false;
          animateHover(0);
        }}
        onPressIn={() => {
          animateScale(0.96);
          animateHover(1);
        }}
        onPressOut={() => {
          animateScale(1);
          animateHover(hovered.current ? 1 : 0);
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    paddingHorizontal: 24,
    borderRadius: DefaultTheme.radius.pill,
    backgroundColor: DefaultTheme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: DefaultTheme.colors.primary,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  outlineButton: {
    minHeight: 42,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: DefaultTheme.colors.primary,
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledButton: {
    opacity: 0.5,
  },
  pressable: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 14,
  },
  suffix: {
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 19,
    lineHeight: 19,
  },
  outlineLabel: {
    color: DefaultTheme.colors.primary,
  },
});
