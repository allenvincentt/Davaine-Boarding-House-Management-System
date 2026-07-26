import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { MatchaButton } from '@/components/ui/buttons/MatchaButton';
import { Modal } from '@/components/ui/modals/Modal';
import { DefaultTheme } from '@/constants/defaultTheme';
import { useAuth } from '@/providers/AuthProvider';

type GuessModeModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function GuessModeModal({ visible, onClose }: GuessModeModalProps) {
  const { profile, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOut();
      onClose();
    } finally {
      setSigningOut(false);
    }
  }, [signOut, onClose]);

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      dismissOnBackdropPress={!signingOut}
      contentStyle={styles.shell}>
      <View style={styles.body}>
        <View style={styles.badge}>
          <AppIcon name="user" size={22} tintColor={DefaultTheme.colors.primary} />
        </View>

        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>GUEST MODE</Text>
        </View>

        <Text style={styles.title}>You are browsing as a Guest</Text>
        <Text style={styles.message}>
          Your account{profile?.email ? ` (${profile.email})` : ''} is signed in, but it has not been
          given an access level yet. Please wait for an administrator to assign you a role — you will
          get a notification the moment it changes.
        </Text>

        <View style={styles.noteRow}>
          <AppIcon name="warning" size={15} tintColor="#C98A1E" />
          <Text style={styles.noteText}>
            Admin pages stay locked while your role is Guest. You can keep browsing the landing page.
          </Text>
        </View>

        <View style={styles.actions}>
          <MatchaButton
            label={signingOut ? 'Signing out…' : 'Sign out'}
            variant="outline"
            disabled={signingOut}
            style={styles.action}
            onPress={handleSignOut}
          />
          <MatchaButton
            label="Continue browsing"
            disabled={signingOut}
            style={styles.action}
            onPress={onClose}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: {
    maxWidth: 420,
  },
  body: {
    padding: DefaultTheme.spacing.lg,
    alignItems: 'center',
  },
  badge: {
    width: 54,
    height: 54,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DefaultTheme.colors.softOlive,
  },
  rolePill: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: DefaultTheme.radius.pill,
    backgroundColor: DefaultTheme.colors.softGold,
  },
  rolePillText: {
    color: '#9B7941',
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  title: {
    marginTop: 12,
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.heading,
    fontSize: 24,
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  noteRow: {
    marginTop: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    borderRadius: DefaultTheme.radius.sm,
    backgroundColor: DefaultTheme.colors.cool,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  noteText: {
    flex: 1,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 18,
  },
  actions: {
    marginTop: 22,
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 12,
  },
});
