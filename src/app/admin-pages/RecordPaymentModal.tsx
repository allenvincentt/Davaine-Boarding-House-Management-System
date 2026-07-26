import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { MatchaButton } from '@/components/ui/buttons/MatchaButton';
import { FormSection, FormSectionHeader } from '@/components/ui/forms/RenterFieldList';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/modals/Modal';
import { Select, type SelectAnchor, type SelectOption } from '@/components/ui/Select';
import { DefaultTheme } from '@/constants/defaultTheme';
import { buildingToneOf } from '@/constants/roomTheme';
import {
  parseAmount,
  paymentMethods,
  periodLabelOf,
  type BillingPeriodModel,
  type PaymentMethod,
  type RoomBillModel,
} from '@/models/billModel';
import { buildingLabel, formatPeso } from '@/models/roomModel';
import type { PaymentDraft } from '@/services/billingService';

type RecordPaymentModalProps = {
  visible: boolean;
  period: BillingPeriodModel | null;
  bills: RoomBillModel[];
  initialBill: RoomBillModel | null;
  receivedBy: string | null;
  onClose: () => void;
  onSubmit: (draft: PaymentDraft) => Promise<void>;
};

type FormErrors = {
  room?: string;
  amount?: string;
  general?: string;
};

export function RecordPaymentModal({
  visible,
  period,
  bills,
  initialBill,
  receivedBy,
  onClose,
  onSubmit,
}: RecordPaymentModalProps) {
  const payable = useMemo(() => bills.filter((bill) => bill.balance > 0), [bills]);

  const [roomId, setRoomId] = useState(initialBill?.roomId ?? payable[0]?.roomId ?? '');
  const [amount, setAmount] = useState(
    initialBill ? String(initialBill.balance) : payable[0] ? String(payable[0].balance) : '',
  );
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const selected = useMemo(
    () => bills.find((bill) => bill.roomId === roomId) ?? null,
    [bills, roomId],
  );

  if (!period) {
    return null;
  }

  const selectRoom = (bill: RoomBillModel) => {
    setRoomId(bill.roomId);
    setAmount(String(bill.balance));
    setErrors((current) => ({ ...current, room: undefined, amount: undefined }));
  };

  const validate = (): FormErrors | null => {
    const next: FormErrors = {};

    if (!selected) {
      next.room = 'Select the room paying for this period.';
    }

    const parsed = parseAmount(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      next.amount = 'Enter a payment amount greater than zero.';
    } else if (selected && parsed > selected.balance) {
      next.amount = `The balance of ${selected.label} is only ${formatPeso(selected.balance)}.`;
    }

    return next.room || next.amount ? next : null;
  };

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }

    const nextErrors = validate();
    if (nextErrors) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      await onSubmit({
        roomId,
        amount: parseAmount(amount),
        method,
        reference: reference.trim() || null,
        note: note.trim() || null,
        receivedBy,
      });
      onClose();
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'The payment could not be recorded.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={submitting ? () => undefined : onClose}
      dismissOnBackdropPress={!submitting}
      contentStyle={styles.shell}>
      <View style={styles.body}>
        <View style={styles.header}>
          <View style={styles.headerBadge}>
            <AppIcon name="payment" size={20} tintColor={DefaultTheme.colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              Record Rental Payment
            </Text>
            <Text style={styles.subtitle}>
              Collections for {periodLabelOf(period)} are applied to the room&apos;s outstanding
              balance.
            </Text>
          </View>
        </View>

        <View style={styles.sections}>
          <FormSection>
            <FormSectionHeader
              icon="rooms"
              title="Paying Room"
              caption="Only rooms with a remaining balance are listed."
              count={payable.length}
            />
            {payable.length === 0 ? (
              <View style={styles.emptyBlock}>
                <AppIcon name="check" size={18} tintColor={DefaultTheme.colors.primary} />
                <Text style={styles.emptyText}>
                  Every room has fully settled {periodLabelOf(period)}.
                </Text>
              </View>
            ) : (
              <RoomPicker
                bills={payable}
                value={selected}
                error={errors.room}
                onChange={selectRoom}
              />
            )}
            {selected && (
              <View style={styles.summaryRow}>
                <SummaryChip label="Total Due" value={formatPeso(selected.totalDue)} />
                <SummaryChip label="Paid" value={formatPeso(selected.amountPaid)} />
                <SummaryChip label="Balance" value={formatPeso(selected.balance)} strong />
              </View>
            )}
          </FormSection>

          <FormSection>
            <FormSectionHeader
              icon="money"
              title="Payment Details"
              caption="Amount collected and how it was received."
            />
            <Input
              label="Amount (₱)"
              value={amount}
              onChangeText={(value) => {
                setAmount(value);
                setErrors((current) => ({ ...current, amount: undefined }));
              }}
              error={errors.amount}
              icon="money"
              keyboardType="number-pad"
              maxLength={9}
            />
            <View style={styles.methodRow}>
              {paymentMethods.map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityLabel={`Pay through ${option}`}
                  accessibilityState={{ selected: method === option }}
                  style={[styles.methodChip, method === option && styles.methodChipActive]}
                  onPress={() => setMethod(option)}>
                  <Text
                    style={[
                      styles.methodChipText,
                      method === option && styles.methodChipTextActive,
                    ]}
                    numberOfLines={1}>
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Input
              label="Reference No. (optional)"
              value={reference}
              onChangeText={setReference}
              icon="document"
              autoCapitalize="characters"
              maxLength={32}
            />
            <Input
              label="Note (optional)"
              value={note}
              onChangeText={setNote}
              icon="feedback"
              autoCapitalize="sentences"
              maxLength={120}
            />
          </FormSection>

          {!!errors.general && <Text style={styles.formError}>{errors.general}</Text>}
        </View>

        <View style={styles.actions}>
          <MatchaButton
            label="Cancel"
            variant="outline"
            disabled={submitting}
            style={styles.action}
            onPress={onClose}
          />
          <MatchaButton
            label={submitting ? 'Recording…' : 'Record Payment'}
            disabled={submitting || payable.length === 0}
            style={styles.action}
            onPress={handleSubmit}
          />
        </View>
      </View>
    </Modal>
  );
}

function RoomPicker({
  bills,
  value,
  error,
  onChange,
  style,
}: {
  bills: RoomBillModel[];
  value: RoomBillModel | null;
  error?: string;
  onChange: (bill: RoomBillModel) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const triggerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<SelectAnchor | null>(null);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const options = useMemo<SelectOption[]>(
    () =>
      bills.map((bill) => ({
        key: bill.roomId,
        label: `${bill.label} · ${formatPeso(bill.balance)}`,
        icon: bill.roomId === value?.roomId ? 'check' : undefined,
        onSelect: () => onChange(bill),
      })),
    [bills, value?.roomId, onChange],
  );

  const handlePress = () => {
    if (open) {
      setOpen(false);
      return;
    }
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  };

  const tone = value ? buildingToneOf(value.building) : null;

  return (
    <View style={style}>
      <Pressable
        ref={triggerRef}
        accessibilityRole="button"
        accessibilityLabel="Paying room"
        accessibilityState={{ expanded: open }}
        style={[
          styles.roomTrigger,
          (hovered || open) && styles.roomTriggerActive,
          !!error && styles.roomTriggerError,
        ]}
        onPress={handlePress}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}>
        <View style={styles.roomTriggerBody}>
          <Text style={styles.roomTriggerLabel} numberOfLines={1}>
            {value ? value.label : 'Select a room'}
          </Text>
          <Text style={styles.roomTriggerCaption} numberOfLines={1}>
            {value
              ? `${value.numOfHeads} head(s) · ${value.status}`
              : `${bills.length} room(s) with balance`}
          </Text>
        </View>
        {value && tone && (
          <View
            style={[
              styles.buildingChip,
              { backgroundColor: tone.background, borderColor: tone.border },
            ]}>
            <Text style={[styles.buildingChipText, { color: tone.color }]}>
              {buildingLabel(value.building)}
            </Text>
          </View>
        )}
        <AppIcon
          name="chevronDown"
          size={14}
          tintColor={DefaultTheme.colors.muted}
          style={open ? styles.chevronOpen : undefined}
        />
      </Pressable>
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
      <Select
        visible={open}
        onClose={() => setOpen(false)}
        options={options}
        anchor={anchor}
        align="left"
        minWidth={250}
      />
    </View>
  );
}

function SummaryChip({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={[styles.summaryChip, strong && styles.summaryChipStrong]}>
      <Text style={styles.summaryChipLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[styles.summaryChipValue, strong && styles.summaryChipValueStrong]}
        numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    maxWidth: 480,
  },
  body: {
    padding: DefaultTheme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBadge: {
    width: 44,
    height: 44,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DefaultTheme.colors.softOlive,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 17,
  },
  subtitle: {
    marginTop: 3,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
    lineHeight: 17,
  },
  sections: {
    marginTop: 20,
    gap: 18,
  },
  roomTrigger: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: DefaultTheme.radius.md,
    borderWidth: 1.5,
    borderColor: DefaultTheme.colors.line,
    backgroundColor: DefaultTheme.colors.white,
  },
  roomTriggerActive: {
    borderColor: DefaultTheme.colors.primary,
  },
  roomTriggerError: {
    borderColor: '#D64545',
  },
  roomTriggerBody: {
    flex: 1,
    minWidth: 0,
  },
  roomTriggerLabel: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 14,
  },
  roomTriggerCaption: {
    marginTop: 2,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11.5,
  },
  buildingChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: DefaultTheme.radius.pill,
    borderWidth: 1,
  },
  buildingChipText: {
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 10.5,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryChip: {
    flexGrow: 1,
    flexBasis: 96,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: DefaultTheme.radius.sm,
    backgroundColor: DefaultTheme.colors.cool,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  summaryChipStrong: {
    backgroundColor: DefaultTheme.colors.softOlive,
    borderColor: 'rgba(138, 153, 0, 0.28)',
  },
  summaryChipLabel: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 10.5,
  },
  summaryChipValue: {
    marginTop: 3,
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 13,
  },
  summaryChipValueStrong: {
    color: DefaultTheme.colors.primary,
  },
  methodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodChip: {
    flexGrow: 1,
    flexBasis: 90,
    minWidth: 0,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: DefaultTheme.radius.sm,
    borderWidth: 1.5,
    borderColor: DefaultTheme.colors.line,
    backgroundColor: DefaultTheme.colors.white,
  },
  methodChipActive: {
    borderColor: DefaultTheme.colors.primary,
    backgroundColor: DefaultTheme.colors.softOlive,
  },
  methodChipText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 12,
  },
  methodChipTextActive: {
    color: DefaultTheme.colors.primary,
    fontFamily: DefaultTheme.fonts.bodyBold,
  },
  emptyBlock: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
    borderRadius: DefaultTheme.radius.md,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
    backgroundColor: DefaultTheme.colors.white,
  },
  emptyText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
  },
  fieldError: {
    marginTop: 6,
    marginLeft: 4,
    color: '#D64545',
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12,
  },
  formError: {
    color: '#D64545',
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
  },
  actions: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 12,
  },
});
