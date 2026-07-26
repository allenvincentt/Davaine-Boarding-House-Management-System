import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
import { Modal } from '@/components/ui/modals/Modal';
import { Select, type SelectAnchor, type SelectOption } from '@/components/ui/Select';
import { DefaultTheme } from '@/constants/defaultTheme';
import { buildingToneOf } from '@/constants/roomTheme';
import type { AppIconName } from '@/constants/icons';
import {
  buildingLabel,
  dueSummaryOf,
  formatPeso,
  roomLabel,
  roomStatusOf,
  tenantCountLabel,
  type RoomModel,
} from '@/models/roomModel';
import type { RenterDraft } from '@/services/roomManagementService';

export type AddRenterSubmit = {
  roomId: string;
  renters: RenterDraft[];
};

type AddNewRenterModalProps = {
  visible: boolean;
  rooms: RoomModel[];
  onClose: () => void;
  onSubmit: (input: AddRenterSubmit) => Promise<void>;
};

type FormErrors = {
  room?: string;
  general?: string;
  fields: Record<string, string>;
};

export function AddNewRenterModal({
  visible,
  rooms,
  onClose,
  onSubmit,
}: AddNewRenterModalProps) {
  const [roomId, setRoomId] = useState('');
  const [names, setNames] = useState(() => fieldEntriesFrom(undefined));
  const [contacts, setContacts] = useState(() => fieldEntriesFrom(undefined));
  const [links, setLinks] = useState(() => fieldEntriesFrom(undefined));
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });
  const [submitting, setSubmitting] = useState(false);

  const selectedRoom = useMemo(
    () => rooms.find((item) => item.id === roomId) ?? null,
    [rooms, roomId],
  );

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
    const room = selectedRoom ? undefined : 'Select the room these renters belong to.';

    return Object.keys(fields).length > 0 || room ? { fields, room } : null;
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
      await onSubmit({ roomId: selectedRoom?.id ?? '', renters });
      onClose();
    } catch (error) {
      setErrors({
        fields: {},
        general: error instanceof Error ? error.message : 'The renters could not be saved.',
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
            <AppIcon name="userPlus" size={20} tintColor={DefaultTheme.colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              Add New Renters
            </Text>
            <Text style={styles.subtitle}>
              Register the renters, then assign them to a room.
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
              caption="Rooms from Bldg. A and Bldg. B."
            />
            <RoomSelectField
              rooms={rooms}
              value={selectedRoom}
              error={errors.room}
              onChange={(next) => {
                setRoomId(next.id);
                setErrors((current) => ({ ...current, room: undefined }));
              }}
            />
            {selectedRoom && (
              <View style={styles.summaryRow}>
                <SummaryChip icon="money" label={`${formatPeso(selectedRoom.rate)} / month`} />
                <SummaryChip icon="users" label={tenantCountLabel(selectedRoom)} />
                <SummaryChip icon="calendar" label={dueSummaryOf(selectedRoom)} />
              </View>
            )}
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
            label={submitting ? 'Saving…' : 'Add Renters'}
            disabled={submitting}
            style={styles.action}
            onPress={handleSave}
          />
        </View>
      </View>
    </Modal>
  );
}

function RoomSelectField({
  rooms,
  value,
  error,
  onChange,
}: {
  rooms: RoomModel[];
  value: RoomModel | null;
  error?: string;
  onChange: (room: RoomModel) => void;
}) {
  const triggerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<SelectAnchor | null>(null);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const options = useMemo<SelectOption[]>(
    () =>
      rooms.map((item) => ({
        key: item.id,
        label: `${roomLabel(item)} · ${roomStatusOf(item)}`,
        icon: item.id === value?.id ? 'check' : undefined,
        onSelect: () => onChange(item),
      })),
    [rooms, value?.id, onChange],
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
    <View>
      <Pressable
        ref={triggerRef}
        accessibilityRole="button"
        accessibilityLabel="Assigned room"
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
            {value ? roomLabel(value) : 'Select a room'}
          </Text>
          <Text style={styles.roomTriggerCaption} numberOfLines={1}>
            {value ? roomStatusOf(value) : `${rooms.length} room(s) to choose from`}
          </Text>
        </View>
        {value && tone && (
          <View style={[styles.buildingChip, { backgroundColor: tone.background, borderColor: tone.border }]}>
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
        minWidth={240}
      />
    </View>
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
