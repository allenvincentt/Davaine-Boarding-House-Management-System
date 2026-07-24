import { StyleSheet } from 'react-native';

export const GlassTheme = {
  colors: {
    surface: 'rgba(249, 247, 240, 0.86)',
    surfaceFloating: 'rgba(249, 247, 240, 0.84)',
    border: 'rgba(255, 255, 255, 0.84)',
    borderFloating: 'rgba(255, 255, 255, 0.82)',
    reflection: 'rgba(255, 255, 255, 0.96)',
    shadow: '#69705A',
  },
  shadow: {
    bar: {
      shadowColor: '#69705A',
      shadowOpacity: 0.16,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 7,
    },
    floating: {
      shadowColor: '#69705A',
      shadowOpacity: 0.2,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 9,
    },
  },
} as const;

export const glassStyles = StyleSheet.create({
  bar: {
    backgroundColor: GlassTheme.colors.surface,
    borderWidth: 1,
    borderColor: GlassTheme.colors.border,
    ...GlassTheme.shadow.bar,
  },
  floating: {
    backgroundColor: GlassTheme.colors.surfaceFloating,
    borderWidth: 1,
    borderColor: GlassTheme.colors.borderFloating,
    ...GlassTheme.shadow.floating,
  },
  reflection: {
    position: 'absolute',
    top: 1,
    left: 24,
    right: 24,
    height: 1,
    borderRadius: 1,
    backgroundColor: GlassTheme.colors.reflection,
  },
});
