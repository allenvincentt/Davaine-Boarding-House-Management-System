import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { MatchaButton } from '@/components/ui/buttons/MatchaButton';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/modals/Modal';
import { Select, type SelectAnchor, type SelectOption } from '@/components/ui/Select';
import { DefaultTheme } from '@/constants/defaultTheme';
import type { AppIconName } from '@/constants/icons';
import {
  buildingLabel,
  dueSummaryOf,
  formatPeso,
  parseRate,
  remainingCapacityOf,
  roomLabel,
  roomStatusOf,
  type RoomModel,
} from '@/models/roomModel';
import type { RenterDraft } from '@/services/roomManagementService';

export type RoomFormMode = 'create' | 'edit';

export type RoomFormSubmit = {
  roomId: string;
  rate: number;
  renters: RenterDraft[];
};

type CreateUpdateRoomModalProps = {
  visible: boolean;
  mode: RoomFormMode;
  room: RoomModel | null;
  rooms: RoomModel[];
  onClose: () => void;
  onSubmit: (input: RoomFormSubmit) => Promise<void>;
};

type FieldEntry = {
  id: string;
  value: string;
};

type FormErrors = {
  room?: string;
  rate?: string;
  general?: string;
  fields: Record<string, string>;
};

const MAX_FIELDS = 8;
const CONTACT_PATTERN = /^[0-9+()\-\s]{7,15}$/;
const FACEBOOK_PATTERN = /(facebook\.com|fb\.com|m\.me)/i;

let fieldSequence = 0;

function createEntry(value = ''): FieldEntry {
  fieldSequence += 1;
  return { id: `field-${fieldSequence}`, value };
}

function entriesFrom(values: (string | null)[] | undefined): FieldEntry[] {
  const list = (values ?? []).map((value) => createEntry(value ?? ''));
  return list.length > 0 ? list : [createEntry()];
}

function isFacebookValue(value: string) {
  return value.startsWith('@') || FACEBOOK_PATTERN.test(value);
}

export function CreateUpdateRoomModal({
  visible,
  mode,
  room,
  rooms,
  onClose,
  onSubmit,
}: CreateUpdateRoomModalProps) {
  const editing = mode === 'edit';

  const [roomId, setRoomId] = useState(room?.id ?? '');
  const [rate, setRate] = useState(room ? String(room.rate) : '');
  const [names, setNames] = useState(() =>
    entriesFrom(editing ? room?.tenants.map((tenant) => tenant.fullName) : undefined),
  );
  const [contacts, setContacts] = useState(() =>
    entriesFrom(editing ? room?.tenants.map((tenant) => tenant.contactNumber) : undefined),
  );
  const [links, setLinks] = useState(() =>
    entriesFrom(editing ? room?.tenants.map((tenant) => tenant.facebookLink) : undefined),
  );
  const [errors, setErrors] = useState<FormErrors>({ fields: {} });
  const [submitting, setSubmitting] = useState(false);

  const selectedRoom = useMemo(
    () => rooms.find((item) => item.id === roomId) ?? room ?? null,
    [rooms, roomId, room],
  );

  const tenantLimit = useMemo(() => {
    if (!selectedRoom) {
      return MAX_FIELDS;
    }
    const capacity = editing ? selectedRoom.capacity : remainingCapacityOf(selectedRoom);
    return Math.max(1, Math.min(capacity, MAX_FIELDS));
  }, [selectedRoom, editing]);

  const assignableRooms = useMemo(() => {
    if (editing) {
      return rooms;
    }
    return rooms.filter((item) => remainingCapacityOf(item) > 0);
  }, [rooms, editing]);

  const filledNames = names.filter((entry) => entry.value.trim().length > 0).length;

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
    setter((current) => (current.length >= tenantLimit ? current : [...current, createEntry()]));
  };

  const dropEntry = (
    setter: (updater: (current: FieldEntry[]) => FieldEntry[]) => void,
    id: string,
  ) => {
    clearFieldError(id);
    setter((current) => {
      const next = current.filter((entry) => entry.id !== id);
      return next.length > 0 ? next : [createEntry()];
    });
  };

  const validate = (): FormErrors | null => {
    const nextErrors: FormErrors = { fields: {} };
    const seenNames = new Set<string>();

    names.forEach((entry) => {
      const value = entry.value.trim();
      if (!value) {
        return;
      }
      const normalized = value.toLowerCase();
      if (seenNames.has(normalized)) {
        nextErrors.fields[entry.id] = 'This tenant is already listed.';
        return;
      }
      seenNames.add(normalized);
    });

    if (filledNames === 0) {
      nextErrors.fields[names[0].id] = 'At least one tenant name is required.';
    }

    contacts.forEach((entry, index) => {
      const value = entry.value.trim();
      if (!value) {
        return;
      }
      if (!CONTACT_PATTERN.test(value)) {
        nextErrors.fields[entry.id] = 'Enter a valid contact number.';
        return;
      }
      if (!names[index]?.value.trim()) {
        nextErrors.fields[entry.id] = 'Add a tenant name for this contact.';
      }
    });

    links.forEach((entry, index) => {
      const value = entry.value.trim();
      if (!value) {
        return;
      }
      if (!isFacebookValue(value)) {
        nextErrors.fields[entry.id] = 'Use a Facebook profile link or @username.';
        return;
      }
      if (!names[index]?.value.trim()) {
        nextErrors.fields[entry.id] = 'Add a tenant name for this link.';
      }
    });

    if (!selectedRoom) {
      nextErrors.room = 'Select the room these renters belong to.';
    } else {
      const capacity = editing ? selectedRoom.capacity : remainingCapacityOf(selectedRoom);
      if (filledNames > capacity) {
        nextErrors.room = editing
          ? `${roomLabel(selectedRoom)} only fits ${selectedRoom.capacity} tenants.`
          : `${roomLabel(selectedRoom)} has space for ${capacity} more tenant(s).`;
      }
    }

    if (editing) {
      const parsed = parseRate(rate);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        nextErrors.rate = 'Enter a valid room rate.';
      }
    }

    const hasFieldError = Object.keys(nextErrors.fields).length > 0;
    return hasFieldError || nextErrors.room || nextErrors.rate ? nextErrors : null;
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
      await onSubmit({
        roomId: selectedRoom?.id ?? '',
        rate: editing ? parseRate(rate) : (selectedRoom?.rate ?? 0),
        renters,
      });
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
          <View style={styles.headerBadge}>
            <AppIcon
              name={editing ? 'edit' : 'userPlus'}
              size={20}
              tintColor={DefaultTheme.colors.primary}
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {editing && room ? `Edit ${roomLabel(room)}` : 'Add New Renters'}
            </Text>
            <Text style={styles.subtitle}>
              {editing
                ? 'Update the tenants, contacts, and monthly rate of this room.'
                : 'Register the renters, then assign them to a room.'}
            </Text>
          </View>
        </View>

        <View style={styles.sections}>
          <FieldListSection
            icon="users"
            title="Tenants"
            caption="Full name of every renter sharing this room."
            addLabel="Add Tenant"
            fieldLabel="Full Name"
            entries={names}
            errors={errors.fields}
            limit={tenantLimit}
            autoCapitalize="words"
            onChange={(id, value) => changeEntry(setNames, id, value)}
            onAdd={() => appendEntry(setNames)}
            onRemove={(id) => dropEntry(setNames, id)}
          />

          <FieldListSection
            icon="phone"
            title="Contact Numbers"
            caption="Matched to the tenants above in the same order."
            addLabel="Add Contact"
            fieldLabel="Contact Number"
            entries={contacts}
            errors={errors.fields}
            limit={tenantLimit}
            keyboardType="phone-pad"
            onChange={(id, value) => changeEntry(setContacts, id, value)}
            onAdd={() => appendEntry(setContacts)}
            onRemove={(id) => dropEntry(setContacts, id)}
          />

          <FieldListSection
            icon="link"
            title="Facebook Links"
            caption="Profile link or @username used for follow-ups."
            addLabel="Add Facebook Link"
            fieldLabel="Facebook Link"
            entries={links}
            errors={errors.fields}
            limit={tenantLimit}
            onChange={(id, value) => changeEntry(setLinks, id, value)}
            onAdd={() => appendEntry(setLinks)}
            onRemove={(id) => dropEntry(setLinks, id)}
          />

          <View style={styles.section}>
            <SectionHeader
              icon="rooms"
              title="Assigned Room"
              caption={
                editing
                  ? 'Room assignment stays with this row.'
                  : 'Only rooms with free space are listed.'
              }
            />
            <RoomSelectField
              rooms={assignableRooms}
              value={selectedRoom}
              locked={editing}
              error={errors.room}
              onChange={(next) => {
                setRoomId(next.id);
                setErrors((current) => ({ ...current, room: undefined }));
              }}
            />
            {selectedRoom && (
              <View style={styles.summaryRow}>
                <SummaryChip icon="money" label={`${formatPeso(selectedRoom.rate)} / month`} />
                <SummaryChip
                  icon="users"
                  label={`${selectedRoom.tenants.length}/${selectedRoom.capacity} occupied`}
                />
                <SummaryChip icon="calendar" label={dueSummaryOf(selectedRoom)} />
              </View>
            )}
          </View>

          {editing && (
            <View style={styles.section}>
              <SectionHeader
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
            </View>
          )}

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
            label={submitting ? 'Saving…' : editing ? 'Save Changes' : 'Add Renters'}
            disabled={submitting}
            style={styles.action}
            onPress={handleSave}
          />
        </View>
      </View>
    </Modal>
  );
}

function SectionHeader({
  icon,
  title,
  caption,
  count,
}: {
  icon: AppIconName;
  title: string;
  caption: string;
  count?: number;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <AppIcon name={icon} size={15} tintColor={DefaultTheme.colors.primary} />
      </View>
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCaption}>{caption}</Text>
      </View>
      {count !== undefined && (
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

function FieldListSection({
  icon,
  title,
  caption,
  addLabel,
  fieldLabel,
  entries,
  errors,
  limit,
  keyboardType,
  autoCapitalize,
  onChange,
  onAdd,
  onRemove,
}: {
  icon: AppIconName;
  title: string;
  caption: string;
  addLabel: string;
  fieldLabel: string;
  entries: FieldEntry[];
  errors: Record<string, string>;
  limit: number;
  keyboardType?: 'phone-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'words';
  onChange: (id: string, value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const full = entries.length >= limit;

  return (
    <View style={styles.section}>
      <SectionHeader icon={icon} title={title} caption={caption} count={entries.length} />
      {entries.map((entry, index) => (
        <View key={entry.id} style={styles.fieldRow}>
          <Input
            label={`${fieldLabel} ${index + 1}`}
            value={entry.value}
            onChangeText={(value) => onChange(entry.id, value)}
            error={errors[entry.id]}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            style={styles.fieldInput}
          />
          {entries.length > 1 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${fieldLabel.toLowerCase()} ${index + 1}`}
              hitSlop={6}
              style={styles.removeButton}
              onPress={() => onRemove(entry.id)}>
              <AppIcon name="close" size={13} tintColor={DefaultTheme.colors.muted} />
            </Pressable>
          )}
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={addLabel}
        accessibilityState={{ disabled: full }}
        disabled={full}
        style={[styles.addField, full && styles.addFieldDisabled]}
        onPress={onAdd}>
        <AppIcon
          name="plus"
          size={13}
          tintColor={full ? DefaultTheme.colors.muted : DefaultTheme.colors.primary}
        />
        <Text style={[styles.addFieldLabel, full && styles.addFieldLabelDisabled]}>
          {full ? `Limit of ${limit} reached` : addLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function RoomSelectField({
  rooms,
  value,
  locked,
  error,
  onChange,
}: {
  rooms: RoomModel[];
  value: RoomModel | null;
  locked: boolean;
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
        label: `${roomLabel(item)} · ${item.tenants.length}/${item.capacity} · ${formatPeso(item.rate)}`,
        icon: item.id === value?.id ? 'check' : undefined,
        onSelect: () => onChange(item),
      })),
    [rooms, value?.id, onChange],
  );

  const handlePress = () => {
    if (locked) {
      return;
    }
    if (open) {
      setOpen(false);
      return;
    }
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  };

  return (
    <View>
      <Pressable
        ref={triggerRef}
        accessibilityRole="button"
        accessibilityLabel="Assigned room"
        accessibilityState={{ expanded: open, disabled: locked }}
        disabled={locked}
        style={[
          styles.roomTrigger,
          (hovered || open) && !locked && styles.roomTriggerActive,
          locked && styles.roomTriggerLocked,
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
            {value
              ? `${buildingLabel(value.building)} · ${roomStatusOf(value)}`
              : `${rooms.length} room(s) with free space`}
          </Text>
        </View>
        <AppIcon
          name={locked ? 'lock' : 'chevronDown'}
          size={14}
          tintColor={DefaultTheme.colors.muted}
          style={open && !locked ? styles.chevronOpen : undefined}
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
  section: {
    gap: 12,
    padding: 14,
    borderRadius: DefaultTheme.radius.md,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
    backgroundColor: DefaultTheme.colors.background,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: DefaultTheme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DefaultTheme.colors.softOlive,
  },
  sectionHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 13.5,
  },
  sectionCaption: {
    marginTop: 1,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11.5,
  },
  countPill: {
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    backgroundColor: DefaultTheme.colors.white,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  countPillText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 11,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  fieldInput: {
    flex: 1,
    minWidth: 0,
  },
  removeButton: {
    width: 34,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DefaultTheme.radius.sm,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
    backgroundColor: DefaultTheme.colors.white,
  },
  addField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    borderRadius: DefaultTheme.radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: DefaultTheme.colors.primary,
    backgroundColor: DefaultTheme.colors.white,
  },
  addFieldDisabled: {
    borderColor: DefaultTheme.colors.line,
    backgroundColor: DefaultTheme.colors.cool,
  },
  addFieldLabel: {
    color: DefaultTheme.colors.primary,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 12.5,
  },
  addFieldLabelDisabled: {
    color: DefaultTheme.colors.muted,
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
  roomTriggerLocked: {
    backgroundColor: DefaultTheme.colors.cool,
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
