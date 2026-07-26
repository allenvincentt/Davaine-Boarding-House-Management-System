import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { Input } from '@/components/ui/Input';
import { DefaultTheme } from '@/constants/defaultTheme';
import type { AppIconName } from '@/constants/icons';

export type FieldEntry = {
  id: string;
  value: string;
};

export const MAX_RENTER_FIELDS = 8;

const CONTACT_PATTERN = /^[0-9+()\-\s]{7,15}$/;
const FACEBOOK_PATTERN = /(facebook\.com|fb\.com|m\.me)/i;

let fieldSequence = 0;

export function createFieldEntry(value = ''): FieldEntry {
  fieldSequence += 1;
  return { id: `field-${fieldSequence}`, value };
}

export function fieldEntriesFrom(values: (string | null)[] | undefined): FieldEntry[] {
  const list = (values ?? []).map((value) => createFieldEntry(value ?? ''));
  return list.length > 0 ? list : [createFieldEntry()];
}

function isFacebookValue(value: string) {
  return value.startsWith('@') || FACEBOOK_PATTERN.test(value);
}

export function validateRenterEntries(
  names: FieldEntry[],
  contacts: FieldEntry[],
  links: FieldEntry[],
): Record<string, string> {
  const fields: Record<string, string> = {};
  const seenNames = new Set<string>();
  let filledNames = 0;

  names.forEach((entry) => {
    const value = entry.value.trim();
    if (!value) {
      return;
    }
    filledNames += 1;
    const normalized = value.toLowerCase();
    if (seenNames.has(normalized)) {
      fields[entry.id] = 'This tenant is already listed.';
      return;
    }
    seenNames.add(normalized);
  });

  if (filledNames === 0) {
    fields[names[0].id] = 'At least one tenant name is required.';
  }

  contacts.forEach((entry, index) => {
    const value = entry.value.trim();
    if (!value) {
      return;
    }
    if (!CONTACT_PATTERN.test(value)) {
      fields[entry.id] = 'Enter a valid contact number.';
      return;
    }
    if (!names[index]?.value.trim()) {
      fields[entry.id] = 'Add a tenant name for this contact.';
    }
  });

  links.forEach((entry, index) => {
    const value = entry.value.trim();
    if (!value) {
      return;
    }
    if (!isFacebookValue(value)) {
      fields[entry.id] = 'Use a Facebook profile link or @username.';
      return;
    }
    if (!names[index]?.value.trim()) {
      fields[entry.id] = 'Add a tenant name for this link.';
    }
  });

  return fields;
}

export function FormSection({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.section, style]}>{children}</View>;
}

export function FormSectionHeader({
  icon,
  title,
  caption,
  count,
  color = DefaultTheme.colors.primary,
  background = DefaultTheme.colors.softOlive,
}: {
  icon: AppIconName;
  title: string;
  caption: string;
  count?: number;
  color?: string;
  background?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: background }]}>
        <AppIcon name={icon} size={15} tintColor={color} />
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

export function RenterFieldList({
  icon,
  title,
  caption,
  addLabel,
  fieldLabel,
  entries,
  errors,
  limit = MAX_RENTER_FIELDS,
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
  limit?: number;
  keyboardType?: 'phone-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'words';
  onChange: (id: string, value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const full = entries.length >= limit;

  return (
    <FormSection>
      <FormSectionHeader icon={icon} title={title} caption={caption} count={entries.length} />
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
    </FormSection>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    padding: 14,
    borderRadius: DefaultTheme.radius.md,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
    backgroundColor: DefaultTheme.colors.white,
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
});
