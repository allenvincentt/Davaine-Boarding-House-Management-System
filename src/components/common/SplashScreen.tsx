import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { BrandMark } from '@/components/ui/BrandMark';
import { DefaultTheme } from '@/constants/defaultTheme';

type SplashScreenStatus = 'loading' | 'error';

type SplashScreenProps = {
  status?: SplashScreenStatus;
  loadingMessage?: string;
  errorTitle?: string;
  errorMessage?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  dismissLabel?: string;
};

export function SplashScreen({
  status = 'loading',
  loadingMessage = 'Loading…',
  errorTitle = 'Something went wrong',
  errorMessage = 'Please check your connection and try again.',
  onRetry,
  onDismiss,
  dismissLabel = 'Go back',
}: SplashScreenProps) {
  return (
    <View style={styles.root}>
      <View style={styles.brand}>
        <View style={styles.mark}>
          <BrandMark size={40} />
        </View>
        <Text style={styles.brandName}>Davaine</Text>
      </View>

      {status === 'loading' ? (
        <View style={styles.statusBlock}>
          <ActivityIndicator color={DefaultTheme.colors.primary} size="large" />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
        </View>
      ) : (
        <View style={styles.statusBlock}>
          <View style={styles.errorIcon}>
            <AppIcon name="warning" size={22} tintColor="#D64545" />
          </View>
          <Text style={styles.errorTitle}>{errorTitle}</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          <View style={styles.actions}>
            {onRetry && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry"
                onPress={onRetry}
                style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            )}
            {onDismiss && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={dismissLabel}
                onPress={onDismiss}
                style={styles.dismissButton}>
                <Text style={styles.dismissText}>{dismissLabel}</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DefaultTheme.colors.background,
    paddingHorizontal: DefaultTheme.spacing.xl,
    gap: 32,
  },
  brand: {
    alignItems: 'center',
    gap: 12,
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DefaultTheme.colors.white,
    shadowColor: '#69705A',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  brandName: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.heading,
    fontSize: 24,
  },
  statusBlock: {
    alignItems: 'center',
    gap: 12,
    maxWidth: 320,
  },
  loadingText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 14,
  },
  errorIcon: {
    width: 46,
    height: 46,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FBE7E5',
  },
  errorTitle: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 16,
    textAlign: 'center',
  },
  errorMessage: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  retryButton: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: DefaultTheme.radius.pill,
    backgroundColor: DefaultTheme.colors.primary,
  },
  retryText: {
    color: DefaultTheme.colors.white,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 13,
  },
  dismissButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  dismissText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13,
  },
});
