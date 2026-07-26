import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { MatchaButton } from '@/components/ui/buttons/MatchaButton';
import { FormSection, FormSectionHeader } from '@/components/ui/forms/RenterFieldList';
import { Modal } from '@/components/ui/modals/Modal';
import { Select, type SelectAnchor, type SelectOption } from '@/components/ui/Select';
import { DefaultTheme } from '@/constants/defaultTheme';
import { buildingToneOf } from '@/constants/roomTheme';
import {
  computeBreakdown,
  CR_MAINTENANCE_RATE,
  DEFAULT_ELECTRIC_RATE,
  formatKwh,
  formatPesoDecimal,
  monthNames,
  parseAmount,
  periodLabelOf,
  roundUpPeso,
  waterMeterKeys,
  waterMeterLabel,
  type BillingPeriodModel,
  type RoomReadingModel,
  type WaterMeterKey,
} from '@/models/billModel';
import { buildingLabel, formatPeso, roomBuildings, roomLabel } from '@/models/roomModel';
import type { RoomModel } from '@/models/roomModel';
import { prepareReadings, type GenerateBillsInput } from '@/services/billingService';

type GenerateBillsModalProps = {
  visible: boolean;
  rooms: RoomModel[];
  periods: BillingPeriodModel[];
  initialPeriod: { year: number; month: number };
  onClose: () => void;
  onSubmit: (input: GenerateBillsInput) => Promise<void>;
};

type ReadingForm = {
  roomId: string;
  building: RoomModel['building'];
  roomNumber: number;
  roomRate: number;
  tenantCount: number;
  previousReading: string;
  currentReading: string;
  numOfHeads: string;
  garbageFee: string;
  plasticFee: string;
};

type ReadingField = 'previousReading' | 'currentReading' | 'numOfHeads' | 'garbageFee' | 'plasticFee';

const YEAR_SPAN_BACK = 2;
const YEAR_SPAN_FORWARD = 1;

function toForm(reading: RoomReadingModel): ReadingForm {
  return {
    roomId: reading.roomId,
    building: reading.building,
    roomNumber: reading.roomNumber,
    roomRate: reading.roomRate,
    tenantCount: reading.tenantCount,
    previousReading: String(reading.previousReading),
    currentReading: String(reading.currentReading),
    numOfHeads: String(reading.numOfHeads),
    garbageFee: String(reading.garbageFee),
    plasticFee: String(reading.plasticFee),
  };
}

function numberOf(value: string) {
  const parsed = parseAmount(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fieldKey(roomId: string, field: ReadingField) {
  return `${roomId}:${field}`;
}

export function GenerateBillsModal({
  visible,
  rooms,
  periods,
  initialPeriod,
  onClose,
  onSubmit,
}: GenerateBillsModalProps) {
  const [year, setYear] = useState(initialPeriod.year);
  const [month, setMonth] = useState(initialPeriod.month);

  const existing = useMemo(
    () => periods.find((period) => period.year === year && period.month === month) ?? null,
    [periods, year, month],
  );

  const [electricRate, setElectricRate] = useState(
    String(existing?.electricRate ?? DEFAULT_ELECTRIC_RATE),
  );
  const [crRate, setCrRate] = useState(String(existing?.crMaintenanceRate ?? CR_MAINTENANCE_RATE));
  const [davaoLightBill, setDavaoLightBill] = useState(
    existing ? String(existing.davaoLightBill) : '',
  );
  const [waterBills, setWaterBills] = useState<Record<WaterMeterKey, string>>({
    A: existing ? String(existing.waterBills.A) : '',
    B: existing ? String(existing.waterBills.B) : '',
    CR: existing ? String(existing.waterBills.CR) : '',
  });
  const [forms, setForms] = useState<ReadingForm[]>(() =>
    prepareReadings(rooms, periods, initialPeriod.year, initialPeriod.month).map(toForm),
  );

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const applyPeriod = useCallback(
    (nextYear: number, nextMonth: number) => {
      const match =
        periods.find((period) => period.year === nextYear && period.month === nextMonth) ?? null;

      setYear(nextYear);
      setMonth(nextMonth);
      setForms(prepareReadings(rooms, periods, nextYear, nextMonth).map(toForm));
      setElectricRate(String(match?.electricRate ?? DEFAULT_ELECTRIC_RATE));
      setCrRate(String(match?.crMaintenanceRate ?? CR_MAINTENANCE_RATE));
      setDavaoLightBill(match ? String(match.davaoLightBill) : '');
      setWaterBills({
        A: match ? String(match.waterBills.A) : '',
        B: match ? String(match.waterBills.B) : '',
        CR: match ? String(match.waterBills.CR) : '',
      });
      setFieldErrors({});
      setGeneralError(null);
    },
    [periods, rooms],
  );

  const changeField = useCallback((roomId: string, field: ReadingField, value: string) => {
    setFieldErrors((current) => {
      const key = fieldKey(roomId, field);
      if (!current[key]) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
    setForms((current) =>
      current.map((form) => (form.roomId === roomId ? { ...form, [field]: value } : form)),
    );
  }, []);

  const readings = useMemo<RoomReadingModel[]>(
    () =>
      forms.map((form) => ({
        roomId: form.roomId,
        building: form.building,
        roomNumber: form.roomNumber,
        roomRate: form.roomRate,
        tenantCount: form.tenantCount,
        numOfHeads: Math.round(numberOf(form.numOfHeads)),
        previousReading: numberOf(form.previousReading),
        currentReading: numberOf(form.currentReading),
        garbageFee: numberOf(form.garbageFee),
        plasticFee: numberOf(form.plasticFee),
      })),
    [forms],
  );

  const preview = useMemo(
    () =>
      computeBreakdown({
        id: `${year}-${month}`,
        year,
        month,
        electricRate: numberOf(electricRate),
        crMaintenanceRate: numberOf(crRate),
        davaoLightBill: numberOf(davaoLightBill),
        waterBills: {
          A: numberOf(waterBills.A),
          B: numberOf(waterBills.B),
          CR: numberOf(waterBills.CR),
        },
        readings,
        payments: [],
        generatedAt: '',
        updatedAt: '',
      }),
    [year, month, electricRate, crRate, davaoLightBill, waterBills, readings],
  );

  const validate = () => {
    const errors: Record<string, string> = {};

    forms.forEach((form) => {
      const previous = parseAmount(form.previousReading);
      const current = parseAmount(form.currentReading);
      const heads = parseAmount(form.numOfHeads);
      const garbage = parseAmount(form.garbageFee);
      const plastic = parseAmount(form.plasticFee);

      if (!Number.isFinite(previous) || previous < 0) {
        errors[fieldKey(form.roomId, 'previousReading')] = 'Required';
      }
      if (!Number.isFinite(current) || current < 0) {
        errors[fieldKey(form.roomId, 'currentReading')] = 'Required';
      } else if (Number.isFinite(previous) && current < previous) {
        errors[fieldKey(form.roomId, 'currentReading')] = 'Below previous';
      }
      if (!Number.isFinite(heads) || heads < 0) {
        errors[fieldKey(form.roomId, 'numOfHeads')] = 'Required';
      }
      if (!Number.isFinite(garbage) || garbage < 0) {
        errors[fieldKey(form.roomId, 'garbageFee')] = 'Required';
      }
      if (!Number.isFinite(plastic) || plastic < 0) {
        errors[fieldKey(form.roomId, 'plasticFee')] = 'Required';
      }
    });

    const rate = parseAmount(electricRate);
    const cr = parseAmount(crRate);
    const light = parseAmount(davaoLightBill);
    const missingWater = waterMeterKeys.some((key) => {
      const value = parseAmount(waterBills[key]);
      return !Number.isFinite(value) || value < 0;
    });

    let general: string | null = null;
    if (!Number.isFinite(rate) || rate <= 0) {
      general = 'Enter a valid electric rate per kWh.';
    } else if (!Number.isFinite(cr) || cr < 0) {
      general = 'Enter a valid CR maintenance fee per head.';
    } else if (!Number.isFinite(light) || light < 0) {
      general = 'Enter the Davao Light bill for this month.';
    } else if (missingWater) {
      general = 'Enter every DCWD water bill for this month.';
    } else if (Object.keys(errors).length > 0) {
      general = 'Check the highlighted room readings.';
    }

    return { errors, general };
  };

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }

    const { errors, general } = validate();
    if (general) {
      setFieldErrors(errors);
      setGeneralError(general);
      return;
    }

    setFieldErrors({});
    setGeneralError(null);
    setSubmitting(true);

    try {
      await onSubmit({
        year,
        month,
        electricRate: parseAmount(electricRate),
        crMaintenanceRate: parseAmount(crRate),
        davaoLightBill: parseAmount(davaoLightBill),
        waterBills: {
          A: parseAmount(waterBills.A),
          B: parseAmount(waterBills.B),
          CR: parseAmount(waterBills.CR),
        },
        readings,
      });
      onClose();
    } catch (error) {
      setGeneralError(error instanceof Error ? error.message : 'The bills could not be generated.');
    } finally {
      setSubmitting(false);
    }
  };

  const monthOptions = useMemo(
    () => monthNames.map((name, index) => ({ key: String(index), label: name, value: index })),
    [],
  );

  const yearOptions = useMemo(() => {
    const base = new Date().getFullYear();
    const list: { key: string; label: string; value: number }[] = [];
    for (let value = base - YEAR_SPAN_BACK; value <= base + YEAR_SPAN_FORWARD; value += 1) {
      list.push({ key: String(value), label: String(value), value });
    }
    return list;
  }, []);

  return (
    <Modal
      visible={visible}
      onClose={submitting ? () => undefined : onClose}
      dismissOnBackdropPress={!submitting}
      contentStyle={styles.shell}>
      <View style={styles.body}>
        <View style={styles.header}>
          <View style={styles.headerBadge}>
            <AppIcon name="money" size={20} tintColor={DefaultTheme.colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              Generate Monthly Bills
            </Text>
            <Text style={styles.subtitle}>
              Tally the Davao Light and DCWD bills, then encode each room&apos;s readings and heads.
            </Text>
          </View>
        </View>

        <View style={styles.sections}>
          <FormSection>
            <FormSectionHeader
              icon="calendar"
              title="Billing Period"
              caption="The month these bills are computed for."
            />
            <View style={styles.periodRow}>
              <PickerField
                label="Month"
                value={monthNames[month]}
                options={monthOptions.map((option) => ({
                  key: option.key,
                  label: option.label,
                  icon: option.value === month ? 'check' : undefined,
                  onSelect: () => applyPeriod(year, option.value),
                }))}
                style={styles.periodField}
              />
              <PickerField
                label="Year"
                value={String(year)}
                options={yearOptions.map((option) => ({
                  key: option.key,
                  label: option.label,
                  icon: option.value === year ? 'check' : undefined,
                  onSelect: () => applyPeriod(option.value, month),
                }))}
                style={styles.periodFieldNarrow}
              />
            </View>
            {!!existing && (
              <View style={styles.infoNote}>
                <AppIcon name="warning" size={13} tintColor="#C98A1E" />
                <Text style={styles.infoNoteText}>
                  {periodLabelOf({ year, month })} was already generated. Saving will overwrite its
                  readings and fees.
                </Text>
              </View>
            )}
          </FormSection>

          <FormSection>
            <FormSectionHeader
              icon="electricity"
              title="Electric (Davao Light)"
              caption="Monthly bill from Davao Light and the rate charged per kWh."
            />
            <View style={styles.fieldRow}>
              <NumberField
                label="Davao Light Bill (₱)"
                value={davaoLightBill}
                onChangeText={(value) => {
                  setDavaoLightBill(value);
                  setGeneralError(null);
                }}
                placeholder="0"
                style={styles.flexField}
              />
              <NumberField
                label="Rate per kWh (₱)"
                value={electricRate}
                onChangeText={(value) => {
                  setElectricRate(value);
                  setGeneralError(null);
                }}
                placeholder={String(DEFAULT_ELECTRIC_RATE)}
                style={styles.flexField}
              />
            </View>
            <View style={styles.metricRow}>
              <MetricChip
                label="Total Consumption"
                value={formatKwh(preview.totalConsumption)}
                tone={DefaultTheme.colors.primary}
              />
              <MetricChip
                label="Billed Electric"
                value={formatPeso(preview.totalElectric)}
                tone="#C98A1E"
              />
            </View>
          </FormSection>

          <FormSection>
            <FormSectionHeader
              icon="water"
              title="Water (DCWD)"
              caption="Separate meters for Bldg. A, Bldg. B, and the comfort rooms."
            />
            <View style={styles.fieldRow}>
              {waterMeterKeys.map((key) => (
                <NumberField
                  key={key}
                  label={`${waterMeterLabel(key)} (₱)`}
                  value={waterBills[key]}
                  onChangeText={(value) => {
                    setWaterBills((current) => ({ ...current, [key]: value }));
                    setGeneralError(null);
                  }}
                  placeholder="0"
                  style={styles.flexFieldThird}
                />
              ))}
            </View>
            <View style={styles.metricRow}>
              {roomBuildings.map((building) => (
                <MetricChip
                  key={building}
                  label={`${buildingLabel(building)} per head`}
                  value={formatPesoDecimal(preview.rates.perHeadRoomWater[building])}
                  tone={buildingToneOf(building).color}
                />
              ))}
              <MetricChip
                label="CR per head"
                value={formatPesoDecimal(preview.rates.perHeadCrWater)}
                tone="#2F73B8"
              />
              <MetricChip
                label="Total Heads"
                value={String(preview.rates.totalHeads)}
                tone={DefaultTheme.colors.muted}
              />
            </View>
          </FormSection>

          <FormSection>
            <FormSectionHeader
              icon="security"
              title="CR Maintenance"
              caption="Charged per head on top of the room and CR water share."
            />
            <NumberField
              label="CR Maintenance per head (₱)"
              value={crRate}
              onChangeText={(value) => {
                setCrRate(value);
                setGeneralError(null);
              }}
              placeholder={String(CR_MAINTENANCE_RATE)}
            />
          </FormSection>

          {roomBuildings.map((building) => {
            const group = forms.filter((form) => form.building === building);
            if (group.length === 0) {
              return null;
            }
            const tone = buildingToneOf(building);

            return (
              <FormSection key={building}>
                <FormSectionHeader
                  icon="rooms"
                  title={`${buildingLabel(building)} Readings`}
                  caption="Previous and current meter readings, heads, and monthly fees."
                  count={group.length}
                  color={tone.color}
                  background={tone.background}
                />
                {group.map((form) => (
                  <ReadingRow
                    key={form.roomId}
                    form={form}
                    electricRate={numberOf(electricRate)}
                    errors={fieldErrors}
                    onChange={changeField}
                  />
                ))}
              </FormSection>
            );
          })}

          <View style={styles.totalsCard}>
            <Text style={styles.totalsTitle}>Preview for {periodLabelOf({ year, month })}</Text>
            <TotalRow label="Total Electric Bills" value={formatPeso(preview.totalElectric)} />
            <TotalRow label="Total Water Bills" value={formatPeso(preview.totalWater)} />
            <TotalRow label="Total CR Maintenance" value={formatPeso(preview.totalCrMaintenance)} />
            <TotalRow label="Total Garbage Fees" value={formatPeso(preview.totalGarbage)} />
            <TotalRow label="Total Plastic Fees" value={formatPeso(preview.totalPlastic)} />
            <TotalRow
              label="Total Monthly Bills"
              value={formatPeso(preview.totalMonthlyBills)}
              emphasis
            />
          </View>

          {!!generalError && <Text style={styles.formError}>{generalError}</Text>}
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
            label={submitting ? 'Generating…' : existing ? 'Update Bills' : 'Generate Bills'}
            disabled={submitting}
            style={styles.action}
            onPress={handleSubmit}
          />
        </View>
      </View>
    </Modal>
  );
}

function ReadingRow({
  form,
  electricRate,
  errors,
  onChange,
}: {
  form: ReadingForm;
  electricRate: number;
  errors: Record<string, string>;
  onChange: (roomId: string, field: ReadingField, value: string) => void;
}) {
  const previous = numberOf(form.previousReading);
  const current = numberOf(form.currentReading);
  const consumption = Math.max(0, current - previous);
  const tone = buildingToneOf(form.building);

  return (
    <View style={styles.readingRow}>
      <View style={styles.readingHeader}>
        <View style={[styles.readingBadge, { backgroundColor: tone.background }]}>
          <Text style={[styles.readingBadgeText, { color: tone.color }]}>
            {form.roomNumber}-{form.building}
          </Text>
        </View>
        <View style={styles.readingHeaderText}>
          <Text style={styles.readingLabel} numberOfLines={1}>
            {roomLabel({ building: form.building, number: form.roomNumber })}
          </Text>
          <Text style={styles.readingCaption} numberOfLines={1}>
            {form.tenantCount > 0
              ? `${form.tenantCount} tenant(s) · ${formatPeso(form.roomRate)} rent`
              : 'Vacant room'}
          </Text>
        </View>
        <View style={styles.readingTotals}>
          <Text style={styles.readingConsumption}>{formatKwh(consumption)}</Text>
          <Text style={styles.readingCaption}>
            {formatPeso(roundUpPeso(consumption * electricRate))}
          </Text>
        </View>
      </View>

      <View style={styles.readingFields}>
        <NumberField
          label="Previous"
          value={form.previousReading}
          error={errors[fieldKey(form.roomId, 'previousReading')]}
          onChangeText={(value) => onChange(form.roomId, 'previousReading', value)}
          style={styles.readingField}
        />
        <NumberField
          label="Current"
          value={form.currentReading}
          error={errors[fieldKey(form.roomId, 'currentReading')]}
          onChangeText={(value) => onChange(form.roomId, 'currentReading', value)}
          style={styles.readingField}
        />
        <NumberField
          label="Heads"
          value={form.numOfHeads}
          error={errors[fieldKey(form.roomId, 'numOfHeads')]}
          onChangeText={(value) => onChange(form.roomId, 'numOfHeads', value)}
          style={styles.readingField}
        />
        <NumberField
          label="Garbage ₱"
          value={form.garbageFee}
          error={errors[fieldKey(form.roomId, 'garbageFee')]}
          onChangeText={(value) => onChange(form.roomId, 'garbageFee', value)}
          style={styles.readingField}
        />
        <NumberField
          label="Plastic ₱"
          value={form.plasticFee}
          error={errors[fieldKey(form.roomId, 'plasticFee')]}
          onChangeText={(value) => onChange(form.roomId, 'plasticFee', value)}
          style={styles.readingField}
        />
      </View>
    </View>
  );
}

function NumberField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  style,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);

  return (
    <View style={style}>
      <Text style={[styles.numberLabel, hasError && styles.numberLabelError]} numberOfLines={1}>
        {hasError ? error : label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={DefaultTheme.colors.muted}
        keyboardType="numeric"
        accessibilityLabel={label}
        cursorColor={DefaultTheme.colors.primary}
        underlineColorAndroid="transparent"
        style={[
          styles.numberInput,
          focused && styles.numberInputFocused,
          hasError && styles.numberInputError,
        ]}
      />
    </View>
  );
}

function PickerField({
  label,
  value,
  options,
  style,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  style?: StyleProp<ViewStyle>;
}) {
  const triggerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<SelectAnchor | null>(null);
  const [open, setOpen] = useState(false);

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

  return (
    <View style={style}>
      <Text style={styles.numberLabel} numberOfLines={1}>
        {label}
      </Text>
      <Pressable
        ref={triggerRef}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        style={[styles.pickerTrigger, open && styles.pickerTriggerActive]}
        onPress={handlePress}>
        <Text style={styles.pickerValue} numberOfLines={1}>
          {value}
        </Text>
        <AppIcon
          name="chevronDown"
          size={13}
          tintColor={DefaultTheme.colors.muted}
          style={open ? styles.chevronOpen : undefined}
        />
      </Pressable>
      <Select
        visible={open}
        onClose={() => setOpen(false)}
        options={options}
        anchor={anchor}
        align="left"
        minWidth={160}
      />
    </View>
  );
}

function MetricChip({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View style={styles.metricChip}>
      <View style={[styles.metricDot, { backgroundColor: tone }]} />
      <Text style={styles.metricLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.metricValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function TotalRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <View style={[styles.totalRow, emphasis && styles.totalRowEmphasis]}>
      <Text style={[styles.totalLabel, emphasis && styles.totalLabelEmphasis]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.totalValue, emphasis && styles.totalValueEmphasis]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    maxWidth: 620,
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
  periodRow: {
    flexDirection: 'row',
    gap: 10,
  },
  periodField: {
    flex: 1.4,
    minWidth: 0,
  },
  periodFieldNarrow: {
    flex: 1,
    minWidth: 0,
  },
  fieldRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  flexField: {
    flexGrow: 1,
    flexBasis: 150,
    minWidth: 0,
  },
  flexFieldThird: {
    flexGrow: 1,
    flexBasis: 110,
    minWidth: 0,
  },
  numberLabel: {
    marginBottom: 5,
    marginLeft: 2,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 10.5,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  numberLabelError: {
    color: '#D64545',
  },
  numberInput: {
    height: 42,
    paddingHorizontal: 12,
    paddingVertical: 0,
    borderRadius: DefaultTheme.radius.sm,
    borderWidth: 1.5,
    borderColor: DefaultTheme.colors.line,
    backgroundColor: DefaultTheme.colors.white,
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13.5,
  },
  numberInputFocused: {
    borderColor: DefaultTheme.colors.primary,
  },
  numberInputError: {
    borderColor: '#D64545',
  },
  pickerTrigger: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: DefaultTheme.radius.sm,
    borderWidth: 1.5,
    borderColor: DefaultTheme.colors.line,
    backgroundColor: DefaultTheme.colors.white,
  },
  pickerTriggerActive: {
    borderColor: DefaultTheme.colors.primary,
  },
  pickerValue: {
    flex: 1,
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13.5,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: DefaultTheme.radius.sm,
    backgroundColor: DefaultTheme.colors.softGold,
    borderWidth: 1,
    borderColor: 'rgba(201, 138, 30, 0.28)',
  },
  infoNoteText: {
    flex: 1,
    color: '#8A5D12',
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11.5,
    lineHeight: 16,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: DefaultTheme.radius.pill,
    backgroundColor: DefaultTheme.colors.cool,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  metricDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metricLabel: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11,
  },
  metricValue: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 11.5,
  },
  readingRow: {
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: DefaultTheme.colors.line,
  },
  readingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  readingBadge: {
    width: 34,
    height: 34,
    borderRadius: DefaultTheme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readingBadgeText: {
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 11.5,
  },
  readingHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  readingLabel: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13,
  },
  readingCaption: {
    marginTop: 2,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11,
  },
  readingTotals: {
    alignItems: 'flex-end',
  },
  readingConsumption: {
    color: DefaultTheme.colors.primary,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 12.5,
  },
  readingFields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  readingField: {
    flexGrow: 1,
    flexBasis: 88,
    minWidth: 0,
  },
  totalsCard: {
    gap: 8,
    padding: 14,
    borderRadius: DefaultTheme.radius.md,
    backgroundColor: DefaultTheme.colors.softOlive,
    borderWidth: 1,
    borderColor: 'rgba(138, 153, 0, 0.28)',
  },
  totalsTitle: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 13.5,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  totalRowEmphasis: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(138, 153, 0, 0.28)',
  },
  totalLabel: {
    flexShrink: 1,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12,
  },
  totalLabelEmphasis: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 13,
  },
  totalValue: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 12.5,
  },
  totalValueEmphasis: {
    color: DefaultTheme.colors.primary,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 15,
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
