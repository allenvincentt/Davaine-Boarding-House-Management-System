import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View, useWindowDimensions } from 'react-native';

import { DefaultTheme } from '@/constants/defaultTheme';
import { carouselImages } from '@/constants/landing';

const inputRange = [-3.6, -3, -2, -1, 0, 1, 2, 3, 3.6];
const horizontalCurve = [-4.25, -3.55, -2.28, -1.12, 0, 1.16, 2.48, 3.79, 4.48];

export function CurvedCarousel() {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(3);
  const cardWidth = Math.min(Math.max(width * 0.116, 74), 130);
  const cardHeight = Math.round(cardWidth * 1.52);
  const trackShift = width >= DefaultTheme.layout.desktop ? Math.min(10, width * 0.009) : 0;

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % carouselImages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.stage, { height: cardHeight * 1.28 + 40 }]}>
      {carouselImages.map((source, index) => (
        <CarouselCard
          key={source}
          source={source}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
          distance={circularDistance(index, activeIndex, carouselImages.length)}
          trackShift={trackShift}
        />
      ))}
    </View>
  );
}

function CarouselCard({
  source,
  cardWidth,
  cardHeight,
  distance,
  trackShift,
}: {
  source: string;
  cardWidth: number;
  cardHeight: number;
  distance: number;
  trackShift: number;
}) {
  const position = useRef(new Animated.Value(distance)).current;
  const previousDistance = useRef(distance);

  useEffect(() => {
    if (Math.abs(distance - previousDistance.current) > 3) {
      position.setValue(distance > 0 ? 3.6 : -3.6);
    }

    previousDistance.current = distance;
    Animated.spring(position, {
      toValue: distance,
      damping: 20,
      stiffness: 125,
      mass: 0.78,
      useNativeDriver: true,
    }).start();
  }, [distance, position]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          width: cardWidth,
          height: cardHeight,
          marginLeft: -cardWidth / 2,
          zIndex: 10 + Math.round(Math.abs(distance)),
          opacity: position.interpolate({
            inputRange,
            outputRange: [0, 0.98, 1, 1, 1, 1, 1, 0.98, 0],
            extrapolate: 'clamp',
          }),
          transform: [
            { perspective: 1150 },
            {
              translateX: position.interpolate({
                inputRange,
                outputRange: horizontalCurve.map((value) => value * cardWidth + trackShift),
                extrapolate: 'clamp',
              }),
            },
            {
              translateY: position.interpolate({
                inputRange,
                outputRange: [0, 3, 5, 6, 6, 6, 5, 3, 0],
                extrapolate: 'clamp',
              }),
            },
            {
              scaleX: position.interpolate({
                inputRange,
                outputRange: [1.35, 1.28, 1.17, 1.06, 1, 1.06, 1.17, 1.28, 1.35],
                extrapolate: 'clamp',
              }),
            },
            {
              scaleY: position.interpolate({
                inputRange,
                outputRange: [1.38, 1.31, 1.11, 1, 1, 1, 1.11, 1.31, 1.38],
                extrapolate: 'clamp',
              }),
            },
            {
              rotateY: position.interpolate({
                inputRange,
                outputRange: ['30deg', '23deg', '15deg', '7deg', '0deg', '-7deg', '-15deg', '-23deg', '-30deg'],
                extrapolate: 'clamp',
              }),
            },
            {
              rotateZ: position.interpolate({
                inputRange,
                outputRange: ['7deg', '5deg', '3deg', '1deg', '0deg', '-1deg', '-3deg', '-5deg', '-7deg'],
                extrapolate: 'clamp',
              }),
            },
          ],
        },
      ]}>
      <Image source={{ uri: source }} style={styles.image} resizeMode="cover" />
    </Animated.View>
  );
}

function circularDistance(index: number, activeIndex: number, count: number) {
  let distance = index - activeIndex;
  if (distance > count / 2) {
    distance -= count;
  }
  if (distance < -count / 2) {
    distance += count;
  }
  return distance;
}

const styles = StyleSheet.create({
  stage: {
    width: '100%',
    maxWidth: 1160,
    alignSelf: 'center',
    overflow: 'hidden',
    alignItems: 'center',
  },
  card: {
    position: 'absolute',
    top: 44,
    left: '50%',
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: '#E6E4DC',
    shadowColor: '#37372F',
    shadowOpacity: 0.12,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
