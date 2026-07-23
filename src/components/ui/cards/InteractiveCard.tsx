import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { DefaultTheme } from '@/constants/DefaultTheme';

type BorderEffect = 'solid' | 'pulse' | 'race';

type InteractiveCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  glowColor?: string;
  hoverBackgroundColor?: string;
  liftDistance?: number;
  borderEffect?: BorderEffect;
};

export function InteractiveCard({
  children,
  style,
  glowColor = DefaultTheme.colors.primary,
  hoverBackgroundColor = DefaultTheme.colors.hover,
  liftDistance = 8,
  borderEffect = 'solid',
}: InteractiveCardProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const race = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const raceLoop = useRef<Animated.CompositeAnimation | null>(null);
  const hovered = useRef(false);
  const pressed = useRef(false);
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });

  const animate = (toValue: number) => {
    Animated.timing(progress, {
      toValue,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const startPulse = () => {
    if (pulseLoop.current) {
      return;
    }

    pulse.setValue(0);
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    pulseLoop.current.start();
  };

  const startRace = () => {
    if (raceLoop.current) {
      return;
    }

    race.setValue(0);
    raceLoop.current = Animated.loop(
      Animated.timing(race, {
        toValue: 4,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    raceLoop.current.start();
  };

  const stopMotion = () => {
    pulseLoop.current?.stop();
    raceLoop.current?.stop();
    pulseLoop.current = null;
    raceLoop.current = null;
    pulse.setValue(0);
    race.setValue(0);
  };

  const updateInteraction = () => {
    const active = hovered.current || pressed.current;
    animate(active ? 1 : 0);

    if (!active) {
      stopMotion();
      return;
    }

    if (borderEffect === 'pulse') {
      startPulse();
    }
    if (borderEffect === 'race') {
      startRace();
    }
  };

  useEffect(
    () => () => {
      pulseLoop.current?.stop();
      raceLoop.current?.stop();
    },
    [],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCardSize((current) => (current.width === width && current.height === height ? current : { width, height }));
  };

  const pulseOpacity = Animated.multiply(
    progress,
    pulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.82] }),
  );
  const shadowOpacity =
    borderEffect === 'pulse'
      ? Animated.add(
          0.1,
          Animated.multiply(
            progress,
            pulse.interpolate({ inputRange: [0, 1], outputRange: [0.03, 0.17] }),
          ),
        )
      : progress.interpolate({ inputRange: [0, 1], outputRange: [0.11, 0.24] });
  const horizontalLine = Math.max(82, Math.min(cardSize.width * 0.42, 176));
  const verticalLine = Math.max(72, Math.min(cardSize.height * 0.36, 148));
  const oppositeRace = Animated.modulo(Animated.add(race, 2), 4);
  const trackColor = borderEffect === 'solid' ? glowColor : 'rgba(138,153,0,0.22)';

  return (
    <Pressable
      style={styles.pressable}
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
        onLayout={handleLayout}
        style={[
          styles.card,
          style,
          {
            backgroundColor: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [DefaultTheme.colors.white, hoverBackgroundColor],
            }),
            borderColor: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [DefaultTheme.colors.line, trackColor],
            }),
            shadowColor: glowColor,
            shadowOpacity,
            transform: [
              {
                translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -liftDistance] }),
              },
            ],
          },
        ]}>
        {children}
        {borderEffect === 'pulse' && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glowBorder,
              {
                borderColor: glowColor,
                opacity: pulseOpacity,
                shadowColor: glowColor,
              },
            ]}
          />
        )}
        {borderEffect === 'race' && cardSize.width > 0 && cardSize.height > 0 && (
          <Animated.View pointerEvents="none" style={[styles.raceTrack, { opacity: progress }]}>
            {[race, oppositeRace].map((position, index) => (
              <Animated.View key={index} style={styles.raceLineSet}>
                <Animated.View
                  style={[
                    styles.raceLineHorizontal,
                    {
                      top: 0,
                      width: horizontalLine,
                      backgroundColor: glowColor,
                      shadowColor: glowColor,
                      opacity: position.interpolate({
                        inputRange: [0, 0.06, 0.94, 1, 4],
                        outputRange: [0, 1, 1, 0, 0],
                      }),
                      transform: [
                        {
                          translateX: position.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-horizontalLine, cardSize.width],
                            extrapolate: 'clamp',
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.raceLineVertical,
                    {
                      right: 0,
                      height: verticalLine,
                      backgroundColor: glowColor,
                      shadowColor: glowColor,
                      opacity: position.interpolate({
                        inputRange: [0, 0.98, 1.06, 1.94, 2.02, 4],
                        outputRange: [0, 0, 1, 1, 0, 0],
                      }),
                      transform: [
                        {
                          translateY: position.interpolate({
                            inputRange: [1, 2],
                            outputRange: [-verticalLine, cardSize.height],
                            extrapolate: 'clamp',
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.raceLineHorizontal,
                    {
                      bottom: 0,
                      width: horizontalLine,
                      backgroundColor: glowColor,
                      shadowColor: glowColor,
                      opacity: position.interpolate({
                        inputRange: [0, 1.98, 2.06, 2.94, 3.02, 4],
                        outputRange: [0, 0, 1, 1, 0, 0],
                      }),
                      transform: [
                        {
                          translateX: position.interpolate({
                            inputRange: [2, 3],
                            outputRange: [cardSize.width, -horizontalLine],
                            extrapolate: 'clamp',
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.raceLineVertical,
                    {
                      left: 0,
                      height: verticalLine,
                      backgroundColor: glowColor,
                      shadowColor: glowColor,
                      opacity: position.interpolate({
                        inputRange: [0, 2.98, 3.06, 3.94, 4],
                        outputRange: [0, 0, 1, 1, 0],
                      }),
                      transform: [
                        {
                          translateY: position.interpolate({
                            inputRange: [3, 4],
                            outputRange: [cardSize.height, -verticalLine],
                            extrapolate: 'clamp',
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </Animated.View>
            ))}
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
  },
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: DefaultTheme.colors.white,
    shadowColor: '#4D4E47',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 3,
  },
  glowBorder: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 2,
    borderRadius: DefaultTheme.radius.md,
    shadowOpacity: 0.45,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 0 },
  },
  raceTrack: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    borderRadius: DefaultTheme.radius.md,
  },
  raceLineSet: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  raceLineHorizontal: {
    position: 'absolute',
    left: 0,
    height: 3,
    borderRadius: 3,
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  raceLineVertical: {
    position: 'absolute',
    top: 0,
    width: 3,
    borderRadius: 3,
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});
