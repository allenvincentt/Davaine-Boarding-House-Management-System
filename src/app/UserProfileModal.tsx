import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { MatchaButton } from '@/components/ui/buttons/MatchaButton';
import { Card } from '@/components/ui/cards/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/modals/Modal';
import { DefaultTheme } from '@/constants/defaultTheme';
import type { AppIconName } from '@/constants/icons';
import { useAuth } from '@/providers/AuthProvider';
import { roleLabel } from '@/services/accessControl';
import type { BiometricKind } from '@/services/biometricAuthService';
import { changeOwnPassword, updateOwnProfile } from '@/services/userManagementService';

type UserProfileModalProps = {
  visible: boolean;
  onClose: () => void;
};

const PASSWORD_MASK = '●●●●●●●●●●●●';

export function UserProfileModal({ visible, onClose }: UserProfileModalProps) {
  const {
    profile,
    applyProfile,
    biometricKind,
    biometricSignInEnabled,
    enableBiometricSignIn,
    disableBiometricSignIn,
  } = useAuth();

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [contactNumber, setContactNumber] = useState(profile?.contactNumber ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileNotice, setProfileNotice] = useState('');

  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');

  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricError, setBiometricError] = useState('');

  const busy = savingProfile || savingPassword || biometricBusy;

  const handleClose = useCallback(() => {
    if (busy) {
      return;
    }
    onClose();
  }, [busy, onClose]);

  const handleSaveProfile = useCallback(async () => {
    if (!fullName.trim()) {
      setProfileError('Full name is required.');
      return;
    }

    setSavingProfile(true);
    setProfileError('');
    setProfileNotice('');
    try {
      const nextProfile = await updateOwnProfile({ fullName: fullName.trim(), contactNumber });
      applyProfile(nextProfile);
      setEditing(false);
      setProfileNotice('Your profile has been updated.');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Your profile could not be updated.');
    } finally {
      setSavingProfile(false);
    }
  }, [fullName, contactNumber, applyProfile]);

  const handleCancelEdit = useCallback(() => {
    setEditing(false);
    setFullName(profile?.fullName ?? '');
    setContactNumber(profile?.contactNumber ?? '');
    setProfileError('');
  }, [profile]);

  const handleChangePassword = useCallback(async () => {
    if (!currentPassword) {
      setPasswordError('Enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('The new password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('The new passwords do not match.');
      return;
    }

    setSavingPassword(true);
    setPasswordError('');
    setPasswordNotice('');
    try {
      await changeOwnPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangingPassword(false);
      setPasswordNotice('Your password has been changed.');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Your password could not be changed.');
    } finally {
      setSavingPassword(false);
    }
  }, [currentPassword, newPassword, confirmPassword]);

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
        <Card
          title="Account Information"
          subtitle={editing ? 'Email address and user role are locked' : undefined}
          action={
            editing ? undefined : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit profile"
                hitSlop={8}
                style={styles.cardAction}
                onPress={() => {
                  setProfileNotice('');
                  setEditing(true);
                }}>
                <AppIcon name="edit" size={14} tintColor={DefaultTheme.colors.primary} />
                <Text style={styles.cardActionText}>Edit</Text>
              </Pressable>
            )
          }
          style={styles.card}>
          {editing ? (
            <View style={styles.editFields}>
              <Input
                label="Full Name"
                value={fullName}
                onChangeText={setFullName}
                icon="user"
                autoCapitalize="words"
              />
              <Input
                label="Contact Number"
                value={contactNumber}
                onChangeText={setContactNumber}
                icon="phone"
                keyboardType="phone-pad"
              />
              <LockedRow icon="email" label="Email Address" value={profile?.email ?? '—'} />
              <LockedRow icon="directory" label="User Role" value={roleLabel(profile?.userRole)} />
              {!!profileError && <Text style={styles.errorText}>{profileError}</Text>}
              <View style={styles.inlineActions}>
                <MatchaButton
                  label="Cancel"
                  variant="outline"
                  disabled={savingProfile}
                  style={styles.inlineAction}
                  onPress={handleCancelEdit}
                />
                <MatchaButton
                  label={savingProfile ? 'Saving…' : 'Save Changes'}
                  disabled={savingProfile}
                  style={styles.inlineAction}
                  onPress={handleSaveProfile}
                />
              </View>
            </View>
          ) : (
            <>
              <InfoRow icon="user" label="Full Name" value={profile?.fullName ?? '—'} />
              <InfoRow icon="email" label="Email Address" value={profile?.email ?? '—'} locked />
              <InfoRow
                icon="phone"
                label="Contact Number"
                value={profile?.contactNumber ?? 'Not provided'}
              />
              <InfoRow
                icon="directory"
                label="User Role"
                value={roleLabel(profile?.userRole)}
                locked
                isLast
              />
              {!!profileNotice && <Text style={styles.noticeText}>{profileNotice}</Text>}
            </>
          )}
        </Card>

        <Card
          title="Password"
          subtitle="Stored as a one-way hash — never in plain text"
          action={
            changingPassword ? undefined : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change password"
                hitSlop={8}
                style={styles.cardAction}
                onPress={() => {
                  setPasswordNotice('');
                  setChangingPassword(true);
                }}>
                <AppIcon name="key" size={14} tintColor={DefaultTheme.colors.primary} />
                <Text style={styles.cardActionText}>Change</Text>
              </Pressable>
            )
          }
          style={styles.card}>
          <View style={styles.hashRow}>
            <View style={styles.infoIcon}>
              <AppIcon name="lock" size={16} tintColor={DefaultTheme.colors.primary} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Password</Text>
              <Text style={styles.hashValue} numberOfLines={1}>
                {PASSWORD_MASK}
              </Text>
              <Text style={styles.hashCaption}>Hidden for your security</Text>
            </View>
          </View>

          {changingPassword && (
            <View style={styles.editFields}>
              <Input
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                icon="lock"
                secureTextEntry
              />
              <Input
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                icon="key"
                secureTextEntry
              />
              <Input
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                icon="key"
                secureTextEntry
              />
              {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
              <View style={styles.inlineActions}>
                <MatchaButton
                  label="Cancel"
                  variant="outline"
                  disabled={savingPassword}
                  style={styles.inlineAction}
                  onPress={() => {
                    setChangingPassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                  }}
                />
                <MatchaButton
                  label={savingPassword ? 'Saving…' : 'Update Password'}
                  disabled={savingPassword}
                  style={styles.inlineAction}
                  onPress={handleChangePassword}
                />
              </View>
            </View>
          )}

          {!!passwordNotice && <Text style={styles.noticeText}>{passwordNotice}</Text>}
        </Card>

        {Platform.OS !== 'web' && (
          <Card title="Fingerprint Sign-In" subtitle="Unlock the app with your fingerprint" style={styles.card}>
            <NativeBiometricSection
              kind={biometricKind}
              enabled={biometricSignInEnabled}
              busy={biometricBusy}
              error={biometricError}
              onToggle={handleToggleBiometric}
            />
          </Card>
        )}
      </View>
    </Modal>
  );
}

function InfoRow({
  icon,
  label,
  value,
  locked = false,
  isLast = false,
}: {
  icon: AppIconName;
  label: string;
  value: string;
  locked?: boolean;
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
      {locked && <AppIcon name="lock" size={13} tintColor={DefaultTheme.colors.muted} />}
    </View>
  );
}

function LockedRow({ icon, label, value }: { icon: AppIconName; label: string; value: string }) {
  return (
    <View style={styles.lockedRow}>
      <View style={styles.infoIcon}>
        <AppIcon name={icon} size={16} tintColor={DefaultTheme.colors.muted} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.lockedValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <AppIcon name="lock" size={13} tintColor={DefaultTheme.colors.muted} />
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
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: DefaultTheme.radius.pill,
    backgroundColor: DefaultTheme.colors.softOlive,
  },
  cardActionText: {
    color: DefaultTheme.colors.primary,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 11.5,
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
    minWidth: 0,
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
  editFields: {
    marginTop: 14,
    gap: 16,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: DefaultTheme.radius.sm,
    backgroundColor: DefaultTheme.colors.cool,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  lockedValue: {
    marginTop: 2,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13.5,
  },
  hashRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 4,
  },
  hashValue: {
    marginTop: 5,
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13,
    letterSpacing: 2,
    lineHeight: 17,
  },
  hashCaption: {
    marginTop: 5,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 10.5,
  },
  inlineActions: {
    flexDirection: 'row',
    gap: 10,
  },
  inlineAction: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
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
    color: '#D64545',
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
  },
  noticeText: {
    marginTop: 12,
    color: DefaultTheme.colors.primary,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 12.5,
  },
  actionButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
  },
});
