import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { MatchaButton } from '@/components/ui/buttons/MatchaButton';
import { Modal } from '@/components/ui/modals/Modal';
import { DefaultTheme } from '@/constants/defaultTheme';
import { buildingToneOf } from '@/constants/roomTheme';
import {
  formatKwh,
  formatPaidAt,
  formatPesoDecimal,
  formatReading,
  periodLabelOf,
  receiptNumberOf,
  type BillingPeriodModel,
  type BillStatus,
  type RoomBillModel,
} from '@/models/billModel';
import { buildingLabel, formatPeso, type RoomModel } from '@/models/roomModel';

export const billStatusTone: Record<BillStatus, { color: string; background: string }> = {
  Paid: { color: '#2E8A57', background: '#E4F5EA' },
  Partial: { color: '#C98A1E', background: DefaultTheme.colors.softGold },
  Unpaid: { color: '#C4453B', background: '#FBE7E5' },
  'No Charge': { color: DefaultTheme.colors.muted, background: DefaultTheme.colors.cool },
};

type BillReceiptModalProps = {
  visible: boolean;
  period: BillingPeriodModel | null;
  bill: RoomBillModel | null;
  room: RoomModel | null;
  canRecordPayment: boolean;
  onRecordPayment: (bill: RoomBillModel) => void;
  onClose: () => void;
};

export function BillReceiptModal({
  visible,
  period,
  bill,
  room,
  canRecordPayment,
  onRecordPayment,
  onClose,
}: BillReceiptModalProps) {
  if (!period || !bill) {
    return null;
  }

  const tone = buildingToneOf(bill.building);
  const statusTone = billStatusTone[bill.status];
  const perHeadTotal = bill.perHeadRoomWater + bill.perHeadCrWater;

  return (
    <Modal visible={visible} onClose={onClose} contentStyle={styles.shell}>
      <View style={styles.body}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <AppIcon name="rooms" size={18} tintColor={DefaultTheme.colors.white} />
          </View>
          <View style={styles.brandText}>
            <Text style={styles.brandName}>Davaine Boarding House</Text>
            <Text style={styles.brandCaption}>Monthly Billing Receipt</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: statusTone.background }]}>
            <Text style={[styles.statusChipText, { color: statusTone.color }]}>{bill.status}</Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <MetaBlock label="Receipt No." value={receiptNumberOf(period, bill)} />
          <MetaBlock label="Billing Period" value={periodLabelOf(period)} />
          <MetaBlock label="Issued" value={formatPaidAt(period.generatedAt)} />
        </View>

        <View style={[styles.roomBlock, { borderColor: tone.border }]}>
          <View style={[styles.roomBadge, { backgroundColor: tone.background }]}>
            <Text style={[styles.roomBadgeText, { color: tone.color }]}>{bill.shortLabel}</Text>
          </View>
          <View style={styles.roomBlockText}>
            <Text style={styles.roomLabel} numberOfLines={1}>
              {bill.label}
            </Text>
            <Text style={styles.roomCaption} numberOfLines={2}>
              {room && room.tenants.length > 0
                ? room.tenants.map((tenant) => tenant.fullName).join(', ')
                : 'No tenants on record'}
            </Text>
          </View>
          <View style={styles.roomStats}>
            <Text style={styles.roomStatValue}>{bill.numOfHeads}</Text>
            <Text style={styles.roomCaption}>heads</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Charges</Text>

        <View style={styles.lineItems}>
          <LineItem
            icon="electricity"
            label="Electric Bill"
            formula={`(${formatReading(bill.currentReading)} − ${formatReading(
              bill.previousReading,
            )}) = ${formatKwh(bill.consumption)} × ${formatPesoDecimal(bill.electricRate)}/kWh`}
            value={formatPeso(bill.electricBill)}
          />
          <LineItem
            icon="water"
            label="Water Bill"
            formula={`${bill.numOfHeads} head(s) × (${formatPesoDecimal(
              bill.perHeadRoomWater,
            )} room + ${formatPesoDecimal(bill.perHeadCrWater)} CR) = ${formatPesoDecimal(
              bill.numOfHeads * perHeadTotal,
            )}`}
            value={formatPeso(bill.waterBill)}
          />
          <LineItem
            icon="security"
            label="CR Maintenance"
            formula={`${bill.numOfHeads} head(s) × ${formatPeso(period.crMaintenanceRate)}`}
            value={formatPeso(bill.crMaintenance)}
          />
          <LineItem
            icon="inbox"
            label="Garbage Fee"
            formula="Encoded by the admin for this month"
            value={formatPeso(bill.garbageFee)}
          />
          <LineItem
            icon="inbox"
            label="Plastic Fee"
            formula="Encoded by the admin for this month"
            value={formatPeso(bill.plasticFee)}
          />
        </View>

        <View style={styles.subtotalRow}>
          <Text style={styles.subtotalLabel}>Monthly Bills</Text>
          <Text style={styles.subtotalValue}>{formatPeso(bill.monthlyBill)}</Text>
        </View>

        <View style={styles.subtotalRow}>
          <Text style={styles.subtotalLabel}>Room Rent</Text>
          <Text style={styles.subtotalValue}>{formatPeso(bill.roomRate)}</Text>
        </View>

        <View style={styles.grandTotalRow}>
          <View style={styles.grandTotalText}>
            <Text style={styles.grandTotalLabel}>Total Amount Due</Text>
            <Text style={styles.grandTotalCaption}>Monthly bills plus room rent</Text>
          </View>
          <Text style={styles.grandTotalValue}>{formatPeso(bill.totalDue)}</Text>
        </View>

        <Text style={styles.sectionTitle}>Payments</Text>

        {bill.payments.length === 0 ? (
          <View style={styles.emptyBlock}>
            <AppIcon name="inbox" size={18} tintColor={DefaultTheme.colors.muted} />
            <Text style={styles.emptyText}>No rental payment recorded yet.</Text>
          </View>
        ) : (
          <View style={styles.paymentList}>
            {bill.payments.map((payment, index) => (
              <View
                key={payment.id}
                style={[styles.paymentRow, index === bill.payments.length - 1 && styles.paymentRowLast]}>
                <View style={styles.paymentIcon}>
                  <AppIcon name="payment" size={14} tintColor={DefaultTheme.colors.primary} />
                </View>
                <View style={styles.paymentBody}>
                  <Text style={styles.paymentTitle} numberOfLines={1}>
                    {payment.method}
                    {payment.reference ? ` · ${payment.reference}` : ''}
                  </Text>
                  <Text style={styles.paymentCaption} numberOfLines={1}>
                    {formatPaidAt(payment.paidAt)}
                    {payment.receivedBy ? ` · received by ${payment.receivedBy}` : ''}
                  </Text>
                </View>
                <Text style={styles.paymentAmount}>{formatPeso(payment.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Amount Paid</Text>
            <Text style={styles.balanceValue}>{formatPeso(bill.amountPaid)}</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabelStrong}>Remaining Balance</Text>
            <Text style={styles.balanceValueStrong}>{formatPeso(bill.balance)}</Text>
          </View>
        </View>

        <Text style={styles.footerNote}>
          {buildingLabel(bill.building)} · Electric rate {formatPesoDecimal(bill.electricRate)} per
          kWh · Bills are rounded up to the nearest peso.
        </Text>

        <View style={styles.actions}>
          <MatchaButton label="Close" variant="outline" style={styles.action} onPress={onClose} />
          {canRecordPayment && bill.balance > 0 && (
            <MatchaButton
              label="Record Payment"
              icon="payment"
              style={styles.action}
              onPress={() => onRecordPayment(bill)}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaBlock}>
      <Text style={styles.metaLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.metaValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function LineItem({
  icon,
  label,
  formula,
  value,
}: {
  icon: 'electricity' | 'water' | 'security' | 'inbox';
  label: string;
  formula: string;
  value: string;
}) {
  return (
    <View style={styles.lineItem}>
      <View style={styles.lineIcon}>
        <AppIcon name={icon} size={14} tintColor={DefaultTheme.colors.muted} />
      </View>
      <View style={styles.lineBody}>
        <Text style={styles.lineLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.lineFormula}>{formula}</Text>
      </View>
      <Text style={styles.lineValue} numberOfLines={1}>
        {value}
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandBadge: {
    width: 38,
    height: 38,
    borderRadius: DefaultTheme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DefaultTheme.colors.primary,
  },
  brandText: {
    flex: 1,
    minWidth: 0,
  },
  brandName: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 15,
  },
  brandCaption: {
    marginTop: 2,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11.5,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: DefaultTheme.radius.pill,
  },
  statusChipText: {
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 10.5,
  },
  metaGrid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaBlock: {
    flexGrow: 1,
    flexBasis: 130,
    minWidth: 0,
    padding: 10,
    borderRadius: DefaultTheme.radius.sm,
    backgroundColor: DefaultTheme.colors.cool,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  metaLabel: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metaValue: {
    marginTop: 4,
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 12.5,
  },
  roomBlock: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: DefaultTheme.radius.md,
    borderWidth: 1,
    backgroundColor: DefaultTheme.colors.white,
  },
  roomBadge: {
    width: 42,
    height: 42,
    borderRadius: DefaultTheme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomBadgeText: {
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 13,
  },
  roomBlockText: {
    flex: 1,
    minWidth: 0,
  },
  roomLabel: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 14,
  },
  roomCaption: {
    marginTop: 2,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11.5,
    lineHeight: 16,
  },
  roomStats: {
    alignItems: 'center',
  },
  roomStatValue: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 17,
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 8,
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 13.5,
  },
  lineItems: {
    borderRadius: DefaultTheme.radius.md,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
    backgroundColor: DefaultTheme.colors.white,
    paddingHorizontal: 12,
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: DefaultTheme.colors.line,
  },
  lineIcon: {
    width: 26,
    height: 26,
    borderRadius: DefaultTheme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DefaultTheme.colors.cool,
  },
  lineBody: {
    flex: 1,
    minWidth: 0,
  },
  lineLabel: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 12.5,
  },
  lineFormula: {
    marginTop: 2,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 10.5,
    lineHeight: 15,
  },
  lineValue: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 13,
  },
  subtotalRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  subtotalLabel: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 12.5,
  },
  subtotalValue: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 13.5,
  },
  grandTotalRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    borderRadius: DefaultTheme.radius.md,
    backgroundColor: DefaultTheme.colors.softOlive,
    borderWidth: 1,
    borderColor: 'rgba(138, 153, 0, 0.28)',
  },
  grandTotalText: {
    flex: 1,
    minWidth: 0,
  },
  grandTotalLabel: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 13.5,
  },
  grandTotalCaption: {
    marginTop: 2,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11,
  },
  grandTotalValue: {
    color: DefaultTheme.colors.primary,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 20,
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
  paymentList: {
    borderRadius: DefaultTheme.radius.md,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
    backgroundColor: DefaultTheme.colors.white,
    paddingHorizontal: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: DefaultTheme.colors.line,
  },
  paymentRowLast: {
    borderBottomWidth: 0,
  },
  paymentIcon: {
    width: 26,
    height: 26,
    borderRadius: DefaultTheme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DefaultTheme.colors.softOlive,
  },
  paymentBody: {
    flex: 1,
    minWidth: 0,
  },
  paymentTitle: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 12.5,
  },
  paymentCaption: {
    marginTop: 2,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 10.5,
  },
  paymentAmount: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 13,
  },
  balanceCard: {
    marginTop: 12,
    gap: 8,
    padding: 14,
    borderRadius: DefaultTheme.radius.md,
    backgroundColor: DefaultTheme.colors.cool,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  balanceLabel: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
  },
  balanceValue: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13,
  },
  balanceLabelStrong: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 13,
  },
  balanceValueStrong: {
    color: '#C4453B',
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 15,
  },
  footerNote: {
    marginTop: 14,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 10.5,
    lineHeight: 15,
    textAlign: 'center',
  },
  actions: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 12,
  },
});
