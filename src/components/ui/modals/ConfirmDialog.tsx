import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { MatchaButton } from '@/components/ui/buttons/MatchaButton';
import { Modal } from '@/components/ui/modals/Modal';
import { DefaultTheme } from '@/constants/defaultTheme';
import type { AppIconName } from '@/constants/icons';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  icon?: AppIconName;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'destructive';
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  icon = 'warning',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const destructive = tone === 'destructive';

  const handleConfirm = () => {
    onClose();
    onConfirm();
  };

  return (
    <Modal visible={visible} onClose={onClose} contentStyle={styles.shell}>
      <View style={styles.body}>
        <View
          style={[
            styles.iconBadge,
            { backgroundColor: destructive ? '#FBE7E5' : DefaultTheme.colors.softOlive },
          ]}>
          <AppIcon
            name={icon}
            size={22}
            tintColor={destructive ? '#C4453B' : DefaultTheme.colors.primary}
          />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          <MatchaButton
            label={cancelLabel}
            variant="outline"
            style={styles.action}
            onPress={onClose}
          />
          <MatchaButton label={confirmLabel} style={styles.action} onPress={handleConfirm} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: {
    maxWidth: 380,
  },
  body: {
    padding: DefaultTheme.spacing.lg,
    alignItems: 'center',
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 14,
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 18,
    textAlign: 'center',
  },
  message: {
    marginTop: 6,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
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
