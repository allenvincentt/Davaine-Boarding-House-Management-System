import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { MatchaButton } from '@/components/ui/buttons/MatchaButton';
import {
  createFieldEntry,
  fieldEntriesFrom,
  FormSection,
  FormSectionHeader,
  MAX_RENTER_FIELDS,
  RenterFieldList,
  validateRenterEntries,
  type FieldEntry,
} from '@/components/ui/forms/RenterFieldList';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/modals/Modal';
import { DefaultTheme } from '@/constants/defaultTheme';
import type { AppIconName } from '@/constants/icons';
import { buildingToneOf } from '@/constants/roomTheme';
import {
  buildingLabel,
  dueSummaryOf,
  formatPeso,
  parseRate,
  roomLabel,
  roomStatusOf,
  tenantCountLabel,
  type RoomModel,
} from '@/models/roomModel';
import type { RenterDraft } from '@/services/roomManagementService';

export type EditRoomSubmit = {
  roomId: string;
  rate: number;
  renters: RenterDraft[];
};

type EditRoomModalProps = {
  visible: boolean;
  room: RoomModel | null;
  onClose: () => void;
  onSubmit: (input: EditRoomSubmit) => Promise<void>;
};

type FormErrors = {
  rate?: string;
  general?: string;
  fields: Record<string, string>;
};

export function EditRoomModal({ visible, room, onClose, onSubmit }: EditRoomModalProps) {
  const [rate, setRate] = useState(room ? String(room.rate) : '');
  const [names, setNames] = useState(() =>
    fieldEntriesFrom(room?.tenants.map((tenant) => tenant.fullName)),
  );
  const [contacts, setContacts] = useState(() =>
    fieldEntriesFrom(room?.tenants.map((tenant) => tenant.contactNumber)),
  );
  const [links, setLinks] = useState(() =>
    fieldEntriesFrom(room?.tenants.map((tenant) => tenant.facebookLink)),
  );
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });
  const [submitting, setSubmitting] = useState(false);

  if (!room) {
    return null;
  }

  const tone = buildingToneOf(room.building);

  const clearFieldError = (id: string) => {
    setErrors((current) => {
      if (!current.fields[id]) {
        return current;
      }
      const fields = { ...current.fields };
      delete fields[id];
      return { ...current, fields };
    });
  };

  const changeEntry = (
    setter: (updater: (current: FieldEntry[]) => FieldEntry[]) => void,
    id: string,
    value: string,
  ) => {
    clearFieldError(id);
    setter((current) => current.map((entry) => (entry.id === id ? { ...entry, value } : entry)));
  };

  const appendEntry = (setter: (updater: (current: FieldEntry[]) => FieldEntry[]) => void) => {
    setter((current) =>
      current.length >= MAX_RENTER_FIELDS ? current : [...current, createFieldEntry()],
    );
  };

  const dropEntry = (
    setter: (updater: (current: FieldEntry[]) => FieldEntry[]) => void,
    id: string,
  ) => {
    clearFieldError(id);
    setter((current) => {
      const next = current.filter((entry) => entry.id !== id);
      return next.length > 0 ? next : [createFieldEntry()];
    });
  };

  const validate = (): FormErrors | null => {
    const fields = validateRenterEntries(names, contacts, links);
    const parsed = parseRate(rate);
    const rateError =
      !Number.isFinite(parsed) || parsed <= 0 ? 'Enter a valid room rate.' : undefined;

    return Object.keys(fields).length > 0 || rateError ? { fields, rate: rateError } : null;
  };

  const handleSave = async () => {
    if (submitting) {
      return;
    }

    const nextErrors = validate();
    if (nextErrors) {
      setErrors(nextErrors);
      return;
    }

    setErrors({ fields: {} });
    setSubmitting(true);

    const renters: RenterDraft[] = names
      .map((entry, index) => ({
        fullName: entry.value.trim(),
        contactNumber: contacts[index]?.value.trim() || null,
        facebookLink: links[index]?.value.trim() || null,
      }))
      .filter((renter) => renter.fullName.length > 0);

    try {
      await onSubmit({ roomId: room.id, rate: parseRate(rate), renters });
      onClose();
    } catch (error) {
      setErrors({
        fields: {},
        general: error instanceof Error ? error.message : 'The room could not be saved.',
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
          <View style={[styles.headerBadge, { backgroundColor: tone.background }]}>
            <AppIcon name="edit" size={20} tintColor={tone.color} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              Edit {roomLabel(room)}
            </Text>
            <Text style={styles.subtitle}>
              Update the tenants, contacts, and monthly rate of this room.
            </Text>
          </View>
        </View>

        <View style={styles.sections}>
          <RenterFieldList
            icon="users"
            title="Tenants"
            caption="Full name of every renter sharing this room."
            addLabel="Add Tenant"
            fieldLabel="Full Name"
            entries={names}
            errors={errors.fields}
            autoCapitalize="words"
            onChange={(id, value) => changeEntry(setNames, id, value)}
            onAdd={() => appendEntry(setNames)}
            onRemove={(id) => dropEntry(setNames, id)}
          />

          <RenterFieldList
            icon="phone"
            title="Contact Numbers"
            caption="Matched to the tenants above in the same order."
            addLabel="Add Contact"
            fieldLabel="Contact Number"
            entries={contacts}
            errors={errors.fields}
            keyboardType="phone-pad"
            onChange={(id, value) => changeEntry(setContacts, id, value)}
            onAdd={() => appendEntry(setContacts)}
            onRemove={(id) => dropEntry(setContacts, id)}
          />

          <RenterFieldList
            icon="link"
            title="Facebook Links"
            caption="Profile link or @username used for follow-ups."
            addLabel="Add Facebook Link"
            fieldLabel="Facebook Link"
            entries={links}
            errors={errors.fields}
            onChange={(id, value) => changeEntry(setLinks, id, value)}
            onAdd={() => appendEntry(setLinks)}
            onRemove={(id) => dropEntry(setLinks, id)}
          />

          <FormSection>
            <FormSectionHeader
              icon="rooms"
              title="Assigned Room"
              caption="Room assignment stays with this row."
              color={tone.color}
              background={tone.background}
            />
            <View style={styles.lockedRoom}>
              <View style={styles.lockedRoomBody}>
                <Text style={styles.lockedRoomLabel} numberOfLines={1}>
                  {roomLabel(room)}
                </Text>
                <Text style={styles.lockedRoomCaption} numberOfLines={1}>
                  {roomStatusOf(room)}
                </Text>
              </View>
              <View
                style={[
                  styles.buildingChip,
                  { backgroundColor: tone.background, borderColor: tone.border },
                ]}>
                <Text style={[styles.buildingChipText, { color: tone.color }]}>
                  {buildingLabel(room.building)}
                </Text>
              </View>
              <AppIcon name="lock" size={14} tintColor={DefaultTheme.colors.muted} />
            </View>
            <View style={styles.summaryRow}>
              <SummaryChip icon="money" label={`${formatPeso(room.rate)} / month`} />
              <SummaryChip icon="users" label={tenantCountLabel(room)} />
              <SummaryChip icon="calendar" label={dueSummaryOf(room)} />
            </View>
          </FormSection>

          <FormSection>
            <FormSectionHeader
              icon="money"
              title="Room Rates"
              caption="Monthly rate billed to this room."
            />
            <Input
              label="Room Rate (₱)"
              value={rate}
              onChangeText={(value) => {
                setRate(value);
                setErrors((current) => ({ ...current, rate: undefined }));
              }}
              error={errors.rate}
              icon="money"
              keyboardType="number-pad"
              maxLength={7}
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
            label={submitting ? 'Saving…' : 'Save Changes'}
            disabled={submitting}
            style={styles.action}
            onPress={handleSave}
          />
        </View>
      </View>
    </Modal>
  );
}

function SummaryChip({ icon, label }: { icon: AppIconName; label: string }) {
  return (
    <View style={styles.summaryChip}>
      <AppIcon name={icon} size={12} tintColor={DefaultTheme.colors.muted} />
      <Text style={styles.summaryChipText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    maxWidth: 520,
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
  lockedRoom: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: DefaultTheme.radius.md,
    borderWidth: 1.5,
    borderColor: DefaultTheme.colors.line,
    backgroundColor: DefaultTheme.colors.cool,
  },
  lockedRoomBody: {
    flex: 1,
    minWidth: 0,
  },
  lockedRoomLabel: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 14,
  },
  lockedRoomCaption: {
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
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: DefaultTheme.radius.pill,
    backgroundColor: DefaultTheme.colors.white,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  summaryChipText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 11,
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
