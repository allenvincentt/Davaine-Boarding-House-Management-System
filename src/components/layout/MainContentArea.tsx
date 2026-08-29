import type { ReactNode, RefObject } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  type ScrollViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePageRefresh } from '@/components/layout/PageRefreshContext';
import { DefaultTheme } from '@/constants/defaultTheme';

type MainContentAreaProps = {
  children: ReactNode;
  scrollRef?: RefObject<ScrollView | null>;
  scrollEventThrottle?: number;
  onScroll?: ScrollViewProps['onScroll'];
  onLayout?: ScrollViewProps['onLayout'];
  onContentSizeChange?: ScrollViewProps['onContentSizeChange'];
};

export function MainContentArea({
  children,
  scrollRef,
  scrollEventThrottle,
  onScroll,
  onLayout,
  onContentSizeChange,
}: MainContentAreaProps) {
  const { width } = useWindowDimensions();
  const { top: safeAreaTop } = useSafeAreaInsets();
  const compact = width < DefaultTheme.layout.compactNavigation;
  const { enabled, refreshing, onRefresh } = usePageRefresh();

  const topBarInset = compact ? safeAreaTop + 12 + 66 + 16 : 14 + 68 + 16;

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: topBarInset },
        compact && styles.scrollContentMobile,
      ]}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={scrollEventThrottle}
      onScroll={onScroll}
      onLayout={onLayout}
      onContentSizeChange={onContentSizeChange}
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
