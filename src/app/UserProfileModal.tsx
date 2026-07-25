import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { MatchaButton } from '@/components/ui/buttons/MatchaButton';
import { Card } from '@/components/ui/cards/Card';
import { Modal } from '@/components/ui/modals/Modal';
import { DefaultTheme } from '@/constants/defaultTheme';
import type { AppIconName } from '@/constants/icons';
import { AdminUserRole } from '@/enums/adminUserRoleEnum';
import { useAuth } from '@/providers/AuthProvider';
import type { BiometricKind } from '@/services/biometricAuthService';

type UserProfileModalProps = {
  visible: boolean;
  onClose: () => void;
};

const ROLE_LABELS: Record<AdminUserRole, string> = {
  [AdminUserRole.SuperAdmin]: 'Super Admin',
  [AdminUserRole.Admin]: 'Administrator',
};

export function UserProfileModal({ visible, onClose }: UserProfileModalProps) {
  const { profile, biometricKind, biometricSignInEnabled, enableBiometricSignIn, disableBiometricSignIn } =
    useAuth();

  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricError, setBiometricError] = useState('');

  const handleClose = useCallback(() => {
    if (biometricBusy) {
      return;
    }
    onClose();
  }, [biometricBusy, onClose]);

  const handleToggleBiometric = useCallback(async () => {
    setBiometricBusy(true);
    setBiometricError('');
    try {
      if (biometricSignInEnabled) {
        await disableBiometricSignIn();
      } else {
        await enableBiometricSignIn();
      }
    } catch (error) {
      setBiometricError(error instanceof Error ? error.message : 'Unable to update fingerprint sign-in.');
    } finally {
      setBiometricBusy(false);
    }
  }, [biometricSignInEnabled, enableBiometricSignIn, disableBiometricSignIn]);

  const roleLabel = profile ? ROLE_LABELS[profile.userRole] : '—';

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      dismissOnBackdropPress={!biometricBusy}
      contentStyle={styles.modalContent}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close profile"
          hitSlop={10}
          style={styles.closeButton}>
          <AppIcon name="close" size={16} tintColor={DefaultTheme.colors.muted} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Card title="Account Information" style={styles.card}>
          <InfoRow icon="user" label="Full Name" value={profile?.fullName ?? '—'} />
          <InfoRow icon="email" label="Email Address" value={profile?.email ?? '—'} />
          <InfoRow icon="phone" label="Contact Number" value={profile?.contactNumber ?? 'Not provided'} />
          <InfoRow icon="directory" label="User Role" value={roleLabel} isLast />
        </Card>

        <Card title="Fingerprint Sign-In" subtitle="Unlock the app with your fingerprint" style={styles.card}>
          <NativeBiometricSection
            kind={biometricKind}
            enabled={biometricSignInEnabled}
            busy={biometricBusy}
            error={biometricError}
            onToggle={handleToggleBiometric}
          />
        </Card>
      </View>
    </Modal>
  );
}

function InfoRow({
  icon,
  label,
  value,
  isLast = false,
}: {
  icon: AppIconName;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !isLast && styles.infoRowDivider]}>
      <View style={styles.infoIcon}>
        <AppIcon name={icon} size={16} tintColor={DefaultTheme.colors.primary} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function NativeBiometricSection({
  kind,
  enabled,
  busy,
  error,
  onToggle,
}: {
  kind: BiometricKind | null;
  enabled: boolean;
  busy: boolean;
  error: string;
  onToggle: () => void;
}) {
  if (kind == null) {
    return <Text style={styles.mutedNote}>Fingerprint sign-in isn&apos;t available on this device.</Text>;
  }

  return (
    <View>
      <View style={styles.statusRow}>
        <AppIcon name="fingerprint" size={18} tintColor={DefaultTheme.colors.primary} />
        <Text style={styles.statusText}>
          {enabled ? 'Fingerprint sign-in is enabled' : 'Fingerprint sign-in is off'}
        </Text>
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      <MatchaButton
        label={busy ? 'Please wait…' : enabled ? 'Disable Fingerprint' : 'Enable Fingerprint'}
        icon="fingerprint"
        variant={enabled ? 'outline' : 'solid'}
        disabled={busy}
        onPress={onToggle}
        style={styles.actionButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    maxWidth: 440,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  title: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.heading,
    fontSize: 24,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DefaultTheme.colors.cool,
  },
  body: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    gap: 16,
  },
  card: {
    padding: 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  infoRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: DefaultTheme.colors.line,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DefaultTheme.colors.softOlive,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11,
  },
  infoValue: {
    marginTop: 2,
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  statusText: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13.5,
  },
  mutedNote: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 19,
  },
  errorText: {
    marginTop: 4,
    marginBottom: 10,
    color: '#D64545',
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
  },
  actionButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
  },
});
