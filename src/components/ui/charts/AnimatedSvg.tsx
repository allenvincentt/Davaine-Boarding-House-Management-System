import { forwardRef } from 'react';
import { Animated, Platform } from 'react-native';
import { Circle, Path, type CircleProps, type PathProps } from 'react-native-svg';

type CollapsableProp = { collapsable?: boolean };

function withoutCollapsable<P extends object>(props: P & CollapsableProp): P {
  const next = { ...props };
  delete (next as CollapsableProp).collapsable;
  return next;
}

const DomSafeCircle = forwardRef<Circle, CircleProps & CollapsableProp>((props, ref) => (
  <Circle ref={ref} {...withoutCollapsable(props)} />
));
DomSafeCircle.displayName = 'DomSafeCircle';

const DomSafePath = forwardRef<Path, PathProps & CollapsableProp>((props, ref) => (
  <Path ref={ref} {...withoutCollapsable(props)} />
));
DomSafePath.displayName = 'DomSafePath';

const CircleBase = (Platform.OS === 'web' ? DomSafeCircle : Circle) as unknown as typeof Circle;
const PathBase = (Platform.OS === 'web' ? DomSafePath : Path) as unknown as typeof Path;

export const AnimatedCircle = Animated.createAnimatedComponent(CircleBase);
export const AnimatedPath = Animated.createAnimatedComponent(PathBase);
