import type { ReactNode } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

import { glassStyles } from '@/constants/glassTheme';

type GlassPanelVariant = 'bar' | 'floating';

type GlassPanelProps = {
  children?: ReactNode;
  variant?: GlassPanelVariant;
  style?: StyleProp<ViewStyle>;
  reflection?: boolean;
  reflectionStyle?: StyleProp<ViewStyle>;
};

export function GlassPanel({
  children,
  variant = 'bar',
  style,
  reflection = false,
  reflectionStyle,
}: GlassPanelProps) {
  return (
    <Animated.View style={[glassStyles[variant], style]}>
      {reflection && (
        <Animated.View pointerEvents="none" style={[glassStyles.reflection, reflectionStyle]} />
      )}
      {children}
    </Animated.View>
  );
}
