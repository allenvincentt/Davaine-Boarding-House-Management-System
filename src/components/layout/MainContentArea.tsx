import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';

import { usePageRefresh } from '@/components/layout/PageRefreshContext';
import { DefaultTheme } from '@/constants/defaultTheme';

type MainContentAreaProps = {
  children: ReactNode;
};

export function MainContentArea({ children }: MainContentAreaProps) {
  const { width } = useWindowDimensions();
  const compact = width < DefaultTheme.layout.compactNavigation;
  const { enabled, refreshing, onRefresh } = usePageRefresh();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, compact && styles.scrollContentMobile]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        enabled ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={DefaultTheme.colors.primary}
            colors={[DefaultTheme.colors.primary]}
            progressBackgroundColor={DefaultTheme.colors.white}
          />
        ) : undefined
      }>
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
