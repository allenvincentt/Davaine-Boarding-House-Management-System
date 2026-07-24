import { useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, type LayoutChangeEvent } from 'react-native';

import { DefaultTheme } from '@/constants/defaultTheme';
import type { AppIconName } from '@/constants/icons';

import { AppIcon } from '../AppIcon';

type WaterPolicyCardProps = {
  icon: AppIconName;
  title: string;
  description: string;
};

export function WaterPolicyCard({ icon, title, description }: WaterPolicyCardProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const [cardWidth, setCardWidth] = useState(0);
  const hovered = useRef(false);
  const pressed = useRef(false);

  const animate = (toValue: number) => {
    Animated.timing(progress, {
      toValue,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const updateInteraction = () => animate(hovered.current || pressed.current ? 1 : 0);
  const handleLayout = (event: LayoutChangeEvent) => setCardWidth(event.nativeEvent.layout.width);
  const iconShift = Math.max(0, cardWidth / 2 - 48);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      style={styles.pressable}
      onLayout={handleLayout}
      onHoverIn={() => {
        hovered.current = true;
        updateInteraction();
      }}
      onHoverOut={() => {
        hovered.current = false;
        updateInteraction();
      }}
      onPressIn={() => {
        pressed.current = true;
        updateInteraction();
      }}
      onPressOut={() => {
        pressed.current = false;
        updateInteraction();
      }}>
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [DefaultTheme.colors.white, '#EAF7FF'],
            }),
            borderColor: progress.interpolate({
              inputRange: [0, 1],
              outputRange: ['rgba(78,164,229,0.24)', '#67BDF0'],
            }),
            shadowOpacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.25] }),
            transform: [
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
            ],
          },
        ]}>
        <Animated.View
          style={[
            styles.icon,
            {
              transform: [
                { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -iconShift] }) },
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -25] }) },
                { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.88] }) },
              ],
            },
          ]}>
          <AppIcon name={icon} size={21} tintColor={DefaultTheme.colors.blue} />
        </Animated.View>
        <Animated.Text
          numberOfLines={2}
          style={[
            styles.title,
            {
              transform: [
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -17] }) },
              ],
            },
          ]}>
          {title}
        </Animated.Text>
        <Animated.Text
          style={[
            styles.description,
            {
              opacity: progress,
              transform: [
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
              ],
            },
          ]}>
          {description}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
    minHeight: 184,
    borderRadius: 20,
    backgroundColor: DefaultTheme.colors.white,
  },
  card: {
    width: '100%',
    minHeight: 184,
    overflow: 'hidden',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 2,
    shadowColor: DefaultTheme.colors.blue,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 3,
  },
  icon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DefaultTheme.radius.pill,
    borderWidth: 3,
    borderColor: '#F8FAFC',
    backgroundColor: DefaultTheme.colors.softBlue,
  },
  title: {
    maxWidth: '92%',
    marginTop: 17,
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'center',
  },
  description: {
    position: 'absolute',
    right: 20,
    bottom: 18,
    left: 20,
    color: '#477A98',
    fontFamily: DefaultTheme.fonts.body,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});
