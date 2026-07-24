import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { DefaultTheme } from '@/constants/defaultTheme';

type LoadingScreenProps = {
  message?: string;
  style?: StyleProp<ViewStyle>;
};

export function LoadingScreen({ message = 'Loading…', style }: LoadingScreenProps) {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator color={DefaultTheme.colors.primary} size="large" />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 48,
  },
  message: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 13,
  },
});
