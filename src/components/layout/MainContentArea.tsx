import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';

import { DefaultTheme } from '@/constants/defaultTheme';

type MainContentAreaProps = {
  children: ReactNode;
};

export function MainContentArea({ children }: MainContentAreaProps) {
  const { width } = useWindowDimensions();
  const compact = width < DefaultTheme.layout.compactNavigation;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, compact && styles.scrollContentMobile]}
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 16,
    gap: 20,
  },
  scrollContentMobile: {
    paddingBottom: 120,
  },
});
