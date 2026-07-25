import type { PasskeyListItem } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

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

const BIOMETRIC_KIND_LABEL: Record<BiometricKind, string> = {
  facial: 'Face ID',
  fingerprint: 'Fingerprint',
  iris: 'Iris ID',
  generic: 'Biometrics',
};

const BIOMETRIC_KIND_ICON: Record<BiometricKind, AppIconName> = {
  facial: 'faceId',
  fingerprint: 'fingerprint',
  iris: 'fingerprint',
  generic: 'passkey',
};

export function UserProfileModal({ visible, onClose }: UserProfileModalProps) {
  const {
    profile,
    biometricKind,
    biometricSignInEnabled,
    passkeySupported,
    enableBiometricSignIn,
    disableBiometricSignIn,
    listPasskeys,
    registerPasskey,
    deletePasskey,
  } = useAuth();

  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricError, setBiometricError] = useState('');

  const [passkeys, setPasskeys] = useState<PasskeyListItem[]>([]);
  const [passkeysLoading, setPasskeysLoading] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyError, setPasskeyError] = useState('');

  const busy = biometricBusy || passkeyBusy;

  const refreshPasskeys = useCallback(async () => {
    setPasskeysLoading(true);
    setPasskeyError('');
    try {
      const items = await listPasskeys();
      setPasskeys(items);
    } catch (error) {
      setPasskeyError(error instanceof Error ? error.message : 'Unable to load passkeys.');
    } finally {
      setPasskeysLoading(false);
    }
  }, [listPasskeys]);

  useEffect(() => {
    if (visible && Platform.OS === 'web' && passkeySupported) {
      refreshPasskeys();
    }
  }, [visible, passkeySupported, refreshPasskeys]);

  const handleClose = useCallback(() => {
    if (busy) {
      return;
    }
    onClose();
  }, [busy, onClose]);

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
      setBiometricError(error instanceof Error ? error.message : 'Unable to update biometric sign-in.');
    } finally {
      setBiometricBusy(false);
    }
  }, [biometricSignInEnabled, enableBiometricSignIn, disableBiometricSignIn]);

  const handleAddPasskey = useCallback(async () => {
    setPasskeyBusy(true);
    setPasskeyError('');
    try {
      await registerPasskey();
      await refreshPasskeys();
    } catch (error) {
      setPasskeyError(error instanceof Error ? error.message : 'Unable to register a passkey.');
    } finally {
      setPasskeyBusy(false);
    }
  }, [registerPasskey, refreshPasskeys]);

  const handleRemovePasskey = useCallback(
    async (passkeyId: string) => {
      setPasskeyBusy(true);
      setPasskeyError('');
      try {
        await deletePasskey(passkeyId);
        await refreshPasskeys();
      } catch (error) {
        setPasskeyError(error instanceof Error ? error.message : 'Unable to remove that passkey.');
      } finally {
        setPasskeyBusy(false);
      }
    },
    [deletePasskey, refreshPasskeys],
  );

  const roleLabel = profile ? ROLE_LABELS[profile.userRole] : '—';

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      dismissOnBackdropPress={!busy}
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

        <Card
          title="Biometric Sign-In"
          subtitle={
            Platform.OS === 'web'
              ? 'Manage passkeys for this account'
              : 'Unlock the app with Face ID or your fingerprint'
          }
          style={styles.card}>
          {Platform.OS === 'web' ? (
            <WebPasskeySection
              supported={passkeySupported}
              loading={passkeysLoading}
              busy={passkeyBusy}
              passkeys={passkeys}
              error={passkeyError}
              onAdd={handleAddPasskey}
              onRemove={handleRemovePasskey}
            />
          ) : (
            <NativeBiometricSection
              kind={biometricKind}
              enabled={biometricSignInEnabled}
              busy={biometricBusy}
              error={biometricError}
              onToggle={handleToggleBiometric}
            />
          )}
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
    return <Text style={styles.mutedNote}>Biometric sign-in isn&apos;t available on this device.</Text>;
  }

  const kindLabel = BIOMETRIC_KIND_LABEL[kind];

  return (
    <View>
      <View style={styles.statusRow}>
        <AppIcon name={BIOMETRIC_KIND_ICON[kind]} size={18} tintColor={DefaultTheme.colors.primary} />
        <Text style={styles.statusText}>
          {enabled ? `${kindLabel} sign-in is enabled` : `${kindLabel} sign-in is off`}
        </Text>
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      <MatchaButton
        label={busy ? 'Please wait…' : enabled ? `Disable ${kindLabel}` : `Enable ${kindLabel}`}
        icon={BIOMETRIC_KIND_ICON[kind]}
        variant={enabled ? 'outline' : 'solid'}
        disabled={busy}
        onPress={onToggle}
        style={styles.actionButton}
      />
    </View>
  );
}

function WebPasskeySection({
  supported,
  loading,
  busy,
  passkeys,
  error,
  onAdd,
  onRemove,
}: {
  supported: boolean;
  loading: boolean;
  busy: boolean;
  passkeys: PasskeyListItem[];
  error: string;
  onAdd: () => void;
  onRemove: (passkeyId: string) => void;
}) {
  if (!supported) {
    return <Text style={styles.mutedNote}>This browser doesn&apos;t support passkeys on this device.</Text>;
  }

  return (
    <View>
      {loading ? (
        <ActivityIndicator color={DefaultTheme.colors.primary} />
      ) : passkeys.length === 0 ? (
        <Text style={styles.mutedNote}>No passkeys registered yet.</Text>
      ) : (
        passkeys.map((passkey, index) => (
          <View
            key={passkey.id}
            style={[styles.passkeyRow, index < passkeys.length - 1 && styles.infoRowDivider]}>
            <View style={styles.infoIcon}>
              <AppIcon name="passkey" size={16} tintColor={DefaultTheme.colors.primary} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoValue} numberOfLines={1}>
                {passkey.friendly_name || 'Passkey'}
              </Text>
              <Text style={styles.infoLabel}>Added {formatDate(passkey.created_at)}</Text>
            </View>
            <Pressable
              onPress={() => onRemove(passkey.id)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${passkey.friendly_name || 'passkey'}`}
              hitSlop={8}
              style={styles.removeButton}>
              <AppIcon name="close" size={14} tintColor="#D64545" />
            </Pressable>
          </View>
        ))
      )}
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      <MatchaButton
        label={busy ? 'Please wait…' : 'Add a Passkey'}
        icon="passkey"
        variant="outline"
        disabled={busy}
        onPress={onAdd}
        style={styles.actionButton}
      />
    </View>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
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
  passkeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  removeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
