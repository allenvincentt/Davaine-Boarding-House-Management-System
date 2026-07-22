import { StyleSheet, View } from 'react-native';

import { DefaultTheme } from '@/constants/DefaultTheme';

export function MapEmbed() {
  return <View style={styles.frame} />;
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    minHeight: 300,
    backgroundColor: DefaultTheme.colors.softBlue,
  },
});
