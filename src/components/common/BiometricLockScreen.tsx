import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { BrandMark } from '@/components/ui/BrandMark';
import { GradientButton } from '@/components/ui/buttons/GradientButton';
import { DefaultTheme } from '@/constants/defaultTheme';
import { useAuth } from '@/providers/AuthProvider';

const label = 'Unlock with Fingerprint';

export function BiometricLockScreen() {
  const { unlockWithBiometrics, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const attemptedRef = useRef(false);

  const attemptUnlock = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      await unlockWithBiometrics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to unlock.');
    } finally {
      setBusy(false);
    }
  }, [unlockWithBiometrics]);

  useEffect(() => {
    if (attemptedRef.current) {
      return;
    }
    attemptedRef.current = true;
    attemptUnlock();
  }, [attemptUnlock]);

  return (
    <View style={styles.root}>
      <View style={styles.brand}>
        <View style={styles.mark}>
          <BrandMark size={40} />
        </View>
        <Text style={styles.brandName}>Davaine</Text>
      </View>

      <View style={styles.statusBlock}>
        <View style={styles.lockIcon}>
          <AppIcon name="lock" size={22} tintColor={DefaultTheme.colors.primary} />
        </View>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Confirm it&apos;s you to continue</Text>

        {error !== '' && <Text style={styles.error}>{error}</Text>}

        <GradientButton
          accessibilityLabel={label}
          onPress={attemptUnlock}
          disabled={busy}
          style={styles.unlockButton}>
          {busy ? (
            <ActivityIndicator color={DefaultTheme.colors.white} />
          ) : (
            <Text style={styles.unlockLabel}>{label}</Text>
          )}
        </GradientButton>

        <Pressable
          onPress={signOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={styles.signOutButton}
          hitSlop={8}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
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
  lockIcon: {
    width: 46,
    height: 46,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DefaultTheme.colors.softOlive,
  },
  title: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 16,
    textAlign: 'center',
  },
  subtitle: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 13,
    textAlign: 'center',
  },
  error: {
    color: '#D64545',
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
    textAlign: 'center',
  },
  unlockButton: {
    marginTop: 12,
    minWidth: 220,
    minHeight: 50,
  },
  unlockLabel: {
    color: DefaultTheme.colors.white,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  signOutButton: {
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  signOutText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13,
  },
});
