import {
  roomBuildings,
  roomLabel,
  roomShortLabel,
  type RoomBuilding,
} from '@/models/roomModel';

export const DEFAULT_ELECTRIC_RATE = 13;
export const CR_MAINTENANCE_RATE = 30;
export const MAX_ELECTRIC_RATE = 100;

export type WaterMeterKey = RoomBuilding | 'CR';

export const waterMeterKeys: WaterMeterKey[] = [...roomBuildings, 'CR'];

export type PaymentMethod = 'Cash' | 'GCash' | 'Bank Transfer';

export const paymentMethods: PaymentMethod[] = ['Cash', 'GCash', 'Bank Transfer'];

export type BillStatus = 'Paid' | 'Partial' | 'Unpaid' | 'No Charge';

export type RoomReadingModel = {
  roomId: string;
  building: RoomBuilding;
  roomNumber: number;
  roomRate: number;
  tenantCount: number;
  numOfHeads: number;
  previousReading: number;
  currentReading: number;
  garbageFee: number;
  plasticFee: number;
};

export type PaymentModel = {
  id: string;
  roomId: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  note: string | null;
  receivedBy: string | null;
  paidAt: string;
};

export type BillingPeriodModel = {
  id: string;
  year: number;
  month: number;
  electricRate: number;
  crMaintenanceRate: number;
  davaoLightBill: number;
  waterBills: Record<WaterMeterKey, number>;
  readings: RoomReadingModel[];
  payments: PaymentModel[];
  generatedAt: string;
  updatedAt: string;
};

export type WaterRateModel = {
  headsByBuilding: Record<RoomBuilding, number>;
  totalHeads: number;
  perHeadRoomWater: Record<RoomBuilding, number>;
  perHeadCrWater: number;
};

export type RoomBillModel = {
  roomId: string;
  building: RoomBuilding;
  roomNumber: number;
  label: string;
  shortLabel: string;
  tenantCount: number;
  numOfHeads: number;
  roomRate: number;
  previousReading: number;
  currentReading: number;
  consumption: number;
  electricRate: number;
  electricBill: number;
  perHeadRoomWater: number;
  perHeadCrWater: number;
  roomWaterShare: number;
  crWaterShare: number;
  waterBill: number;
  crMaintenance: number;
  garbageFee: number;
  plasticFee: number;
  monthlyBill: number;
  totalDue: number;
  amountPaid: number;
  balance: number;
  status: BillStatus;
  payments: PaymentModel[];
};

export type BillingBreakdownModel = {
  period: BillingPeriodModel;
  rates: WaterRateModel;
  bills: RoomBillModel[];
  totalConsumption: number;
  totalElectric: number;
  totalWater: number;
  totalCrMaintenance: number;
  totalGarbage: number;
  totalPlastic: number;
  totalMonthlyBills: number;
  totalRent: number;
  totalDue: number;
  totalCollected: number;
  totalBalance: number;
  totalWaterBilled: number;
  electricVariance: number;
  waterVariance: number;
  billedRooms: number;
  paidRooms: number;
  unpaidRooms: number;
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const monthNames = MONTH_NAMES;

export function monthNameOf(month: number) {
  return MONTH_NAMES[month] ?? '—';
}

export function periodKeyOf(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export function periodLabelOf(period: { year: number; month: number }) {
  return `${MONTH_NAMES[period.month]} ${period.year}`;
}

export function periodShortLabelOf(period: { year: number; month: number }) {
  return `${MONTH_SHORT_NAMES[period.month]} ${period.year}`;
}

export function previousPeriodOf(period: { year: number; month: number }) {
  return period.month === 0
    ? { year: period.year - 1, month: 11 }
    : { year: period.year, month: period.month - 1 };
}

export function comparePeriods(
  left: { year: number; month: number },
  right: { year: number; month: number },
) {
  return left.year === right.year ? left.month - right.month : left.year - right.year;
}

function trimFloat(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function roundUpPeso(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.ceil(trimFloat(value));
}

export function formatDecimal(value: number, decimals = 2) {
  if (!Number.isFinite(value)) {
    return (0).toFixed(decimals);
  }
  const [whole, fraction] = value.toFixed(decimals).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${grouped}.${fraction}` : grouped;
}

export function formatPesoDecimal(value: number, decimals = 2) {
  return `₱ ${formatDecimal(value, decimals)}`;
}

export function formatKwh(value: number, decimals = 0) {
  return `${formatDecimal(value, decimals)} kWh`;
}

export function formatReading(value: number) {
  return formatDecimal(value, 0);
}

export function formatPaidAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return `${MONTH_SHORT_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function parseAmount(value: string) {
  const cleaned = value.replace(/[^\d.]/g, '');
  if (cleaned.length === 0) {
    return Number.NaN;
  }
  const [whole, ...rest] = cleaned.split('.');
  const normalized = rest.length > 0 ? `${whole}.${rest.join('')}` : whole;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function consumptionOf(reading: Pick<RoomReadingModel, 'previousReading' | 'currentReading'>) {
  return Math.max(0, trimFloat(reading.currentReading - reading.previousReading));
}

export function electricBillOf(consumption: number, electricRate: number) {
  return roundUpPeso(consumption * electricRate);
}

export function crMaintenanceOf(numOfHeads: number, rate = CR_MAINTENANCE_RATE) {
  return Math.max(0, Math.round(numOfHeads * rate));
}

export function waterRatesOf(
  readings: RoomReadingModel[],
  waterBills: Record<WaterMeterKey, number>,
): WaterRateModel {
  const headsByBuilding = roomBuildings.reduce(
    (totals, building) => {
      totals[building] = readings
        .filter((reading) => reading.building === building)
        .reduce((sum, reading) => sum + reading.numOfHeads, 0);
      return totals;
    },
    { A: 0, B: 0 } as Record<RoomBuilding, number>,
  );

  const totalHeads = roomBuildings.reduce((sum, building) => sum + headsByBuilding[building], 0);

  const perHeadRoomWater = roomBuildings.reduce(
    (rates, building) => {
      const heads = headsByBuilding[building];
      rates[building] = heads > 0 ? waterBills[building] / heads : 0;
      return rates;
    },
    { A: 0, B: 0 } as Record<RoomBuilding, number>,
  );

  const perHeadCrWater = totalHeads > 0 ? waterBills.CR / totalHeads : 0;

  return { headsByBuilding, totalHeads, perHeadRoomWater, perHeadCrWater };
}

export function waterBillOf(numOfHeads: number, perHeadRoomWater: number, perHeadCrWater: number) {
  return roundUpPeso(numOfHeads * (perHeadRoomWater + perHeadCrWater));
}

export function billStatusOf(totalDue: number, amountPaid: number): BillStatus {
  if (totalDue <= 0) {
    return 'No Charge';
  }
  if (amountPaid <= 0) {
    return 'Unpaid';
  }
  return amountPaid >= totalDue ? 'Paid' : 'Partial';
}

export function computeRoomBill(
  reading: RoomReadingModel,
  period: BillingPeriodModel,
  rates: WaterRateModel,
): RoomBillModel {
  const consumption = consumptionOf(reading);
  const electricBill = electricBillOf(consumption, period.electricRate);

  const perHeadRoomWater = rates.perHeadRoomWater[reading.building];
  const perHeadCrWater = rates.perHeadCrWater;
  const waterBill = waterBillOf(reading.numOfHeads, perHeadRoomWater, perHeadCrWater);
  const crMaintenance = crMaintenanceOf(reading.numOfHeads, period.crMaintenanceRate);

  const garbageFee = Math.max(0, Math.round(reading.garbageFee));
  const plasticFee = Math.max(0, Math.round(reading.plasticFee));
  const monthlyBill = electricBill + waterBill + crMaintenance + garbageFee + plasticFee;

  const roomRate = reading.tenantCount > 0 ? Math.max(0, Math.round(reading.roomRate)) : 0;
  const totalDue = monthlyBill + roomRate;

  const payments = period.payments
    .filter((payment) => payment.roomId === reading.roomId)
    .sort((left, right) => right.paidAt.localeCompare(left.paidAt));
  const amountPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return {
    roomId: reading.roomId,
    building: reading.building,
    roomNumber: reading.roomNumber,
    label: roomLabel({ building: reading.building, number: reading.roomNumber }),
    shortLabel: roomShortLabel({ building: reading.building, number: reading.roomNumber }),
    tenantCount: reading.tenantCount,
    numOfHeads: reading.numOfHeads,
    roomRate,
    previousReading: reading.previousReading,
    currentReading: reading.currentReading,
    consumption,
    electricRate: period.electricRate,
    electricBill,
    perHeadRoomWater,
    perHeadCrWater,
    roomWaterShare: reading.numOfHeads * perHeadRoomWater,
    crWaterShare: reading.numOfHeads * perHeadCrWater,
    waterBill,
    crMaintenance,
    garbageFee,
    plasticFee,
    monthlyBill,
    totalDue,
    amountPaid,
    balance: Math.max(0, totalDue - amountPaid),
    status: billStatusOf(totalDue, amountPaid),
    payments,
  };
}

export function computeBreakdown(period: BillingPeriodModel): BillingBreakdownModel {
  const rates = waterRatesOf(period.readings, period.waterBills);
  const bills = period.readings
    .map((reading) => computeRoomBill(reading, period, rates))
    .sort((left, right) =>
      left.building === right.building
        ? left.roomNumber - right.roomNumber
        : left.building.localeCompare(right.building),
    );

  const sum = (pick: (bill: RoomBillModel) => number) =>
    bills.reduce((total, bill) => total + pick(bill), 0);

  const totalElectric = sum((bill) => bill.electricBill);
  const totalWater = sum((bill) => bill.waterBill);
  const totalWaterBilled = waterMeterKeys.reduce((total, key) => total + period.waterBills[key], 0);

  return {
    period,
    rates,
    bills,
    totalConsumption: sum((bill) => bill.consumption),
    totalElectric,
    totalWater,
    totalCrMaintenance: sum((bill) => bill.crMaintenance),
    totalGarbage: sum((bill) => bill.garbageFee),
    totalPlastic: sum((bill) => bill.plasticFee),
    totalMonthlyBills: sum((bill) => bill.monthlyBill),
    totalRent: sum((bill) => bill.roomRate),
    totalDue: sum((bill) => bill.totalDue),
    totalCollected: sum((bill) => bill.amountPaid),
    totalBalance: sum((bill) => bill.balance),
    totalWaterBilled,
    electricVariance: totalElectric - period.davaoLightBill,
    waterVariance: totalWater - totalWaterBilled,
    billedRooms: bills.filter((bill) => bill.totalDue > 0).length,
    paidRooms: bills.filter((bill) => bill.status === 'Paid').length,
    unpaidRooms: bills.filter((bill) => bill.status === 'Unpaid' || bill.status === 'Partial')
      .length,
  };
}

export function waterMeterLabel(key: WaterMeterKey) {
  return key === 'CR' ? 'Comfort Rooms' : `Bldg. ${key}`;
}

export function receiptNumberOf(period: BillingPeriodModel, bill: RoomBillModel) {
  return `DV-${periodKeyOf(period.year, period.month).replace('-', '')}-${bill.shortLabel.replace(
    '-',
    '',
  )}`;
}
