import {
  comparePeriods,
  computeBreakdown,
  CR_MAINTENANCE_RATE,
  DEFAULT_ELECTRIC_RATE,
  MAX_ELECTRIC_RATE,
  periodKeyOf,
  periodLabelOf,
  waterMeterKeys,
  type BillingPeriodModel,
  type PaymentMethod,
  type PaymentModel,
  type RoomReadingModel,
  type WaterMeterKey,
} from '@/models/billModel';
import { sortRooms, type RoomModel } from '@/models/roomModel';
import { listRooms } from '@/services/roomManagementService';

export const DEFAULT_GARBAGE_FEE = 50;
export const DEFAULT_PLASTIC_FEE = 30;

export type GenerateBillsInput = {
  year: number;
  month: number;
  electricRate: number;
  crMaintenanceRate: number;
  davaoLightBill: number;
  waterBills: Record<WaterMeterKey, number>;
  readings: RoomReadingModel[];
};

export type PaymentDraft = {
  roomId: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  note: string | null;
  receivedBy: string | null;
};

const REQUEST_LATENCY = 260;
const SEED_PERIOD_COUNT = 2;
const SEED_BASE_READING = 1180;
const SEED_READING_STEP = 165;

let store: BillingPeriodModel[] = [];
let seedPromise: Promise<void> | null = null;
let paymentSequence = 0;

function nextPaymentId() {
  paymentSequence += 1;
  return `payment-${paymentSequence}`;
}

function settle<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), REQUEST_LATENCY));
}

function clonePeriod(period: BillingPeriodModel): BillingPeriodModel {
  return {
    ...period,
    waterBills: { ...period.waterBills },
    readings: period.readings.map((reading) => ({ ...reading })),
    payments: period.payments.map((payment) => ({ ...payment })),
  };
}

function sortPeriods(periods: BillingPeriodModel[]) {
  return [...periods].sort((left, right) => comparePeriods(right, left));
}

function seedConsumptionOf(room: RoomModel, offset: number) {
  const heads = room.tenants.length;
  if (heads === 0) {
    return (room.number * 3 + offset) % 5;
  }
  return 26 + heads * 21 + ((room.number * 7 + offset * 13) % 17);
}

function seedWaterBills(offset: number): Record<WaterMeterKey, number> {
  return {
    A: 2380 + offset * 95,
    B: 1960 + offset * 70,
    CR: 1420 + offset * 55,
  };
}

function buildSeedPeriods(rooms: RoomModel[]): BillingPeriodModel[] {
  const ordered = sortRooms(rooms);
  const today = new Date();
  const readingCursor = new Map<string, number>();

  ordered.forEach((room, index) => {
    readingCursor.set(room.id, SEED_BASE_READING + index * SEED_READING_STEP);
  });

  const periods: BillingPeriodModel[] = [];

  for (let step = SEED_PERIOD_COUNT; step >= 1; step -= 1) {
    const cursor = new Date(today.getFullYear(), today.getMonth() - step, 1);
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const offset = SEED_PERIOD_COUNT - step;

    const readings: RoomReadingModel[] = ordered.map((room) => {
      const previousReading = readingCursor.get(room.id) ?? SEED_BASE_READING;
      const currentReading = previousReading + seedConsumptionOf(room, offset);
      readingCursor.set(room.id, currentReading);
      const occupied = room.tenants.length > 0;

      return {
        roomId: room.id,
        building: room.building,
        roomNumber: room.number,
        roomRate: room.rate,
        tenantCount: room.tenants.length,
        numOfHeads: room.tenants.length,
        previousReading,
        currentReading,
        garbageFee: occupied ? DEFAULT_GARBAGE_FEE : 0,
        plasticFee: occupied ? DEFAULT_PLASTIC_FEE : 0,
      };
    });

    const totalConsumption = readings.reduce(
      (sum, reading) => sum + (reading.currentReading - reading.previousReading),
      0,
    );
    const generatedAt = new Date(year, month + 1, 2).toISOString();

    const period: BillingPeriodModel = {
      id: periodKeyOf(year, month),
      year,
      month,
      electricRate: DEFAULT_ELECTRIC_RATE,
      crMaintenanceRate: CR_MAINTENANCE_RATE,
      davaoLightBill: Math.round(totalConsumption * DEFAULT_ELECTRIC_RATE * 0.96),
      waterBills: seedWaterBills(offset),
      readings,
      payments: [],
      generatedAt,
      updatedAt: generatedAt,
    };

    period.payments = buildSeedPayments(period, step === SEED_PERIOD_COUNT);
    periods.push(period);
  }

  return periods;
}

function buildSeedPayments(period: BillingPeriodModel, settled: boolean): PaymentModel[] {
  const { bills } = computeBreakdown(period);
  const payments: PaymentModel[] = [];

  bills.forEach((bill, index) => {
    if (bill.totalDue <= 0) {
      return;
    }
    if (!settled && index % 2 === 1) {
      return;
    }

    const partial = !settled && index === 0;
    const amount = partial ? Math.round(bill.totalDue * 0.5) : bill.totalDue;

    payments.push({
      id: nextPaymentId(),
      roomId: bill.roomId,
      amount,
      method: index % 3 === 0 ? 'GCash' : 'Cash',
      reference: index % 3 === 0 ? `GC-${period.year}${period.month + 1}${bill.roomNumber}` : null,
      note: partial ? 'Partial payment, balance promised next week.' : null,
      receivedBy: 'Front Desk',
      paidAt: new Date(period.year, period.month + 1, 3 + (index % 6)).toISOString(),
    });
  });

  return payments;
}

function ensureSeeded() {
  if (!seedPromise) {
    seedPromise = listRooms().then((rooms) => {
      store = buildSeedPeriods(rooms);
    });
  }
  return seedPromise;
}

function requirePeriod(periodId: string) {
  const period = store.find((item) => item.id === periodId);
  if (!period) {
    throw new Error('That billing period no longer exists.');
  }
  return period;
}

function validateInput(input: GenerateBillsInput) {
  if (!Number.isInteger(input.year) || input.year < 2000 || input.year > 2999) {
    throw new Error('Select a valid billing year.');
  }

  if (!Number.isInteger(input.month) || input.month < 0 || input.month > 11) {
    throw new Error('Select a valid billing month.');
  }

  if (!Number.isFinite(input.electricRate) || input.electricRate <= 0) {
    throw new Error('Enter a valid electric rate per kWh.');
  }

  if (input.electricRate > MAX_ELECTRIC_RATE) {
    throw new Error(`The electric rate cannot be higher than ₱${MAX_ELECTRIC_RATE} per kWh.`);
  }

  if (!Number.isFinite(input.crMaintenanceRate) || input.crMaintenanceRate < 0) {
    throw new Error('Enter a valid CR maintenance fee per head.');
  }

  if (!Number.isFinite(input.davaoLightBill) || input.davaoLightBill < 0) {
    throw new Error('Enter the Davao Light bill for this month.');
  }

  waterMeterKeys.forEach((key) => {
    const value = input.waterBills[key];
    if (!Number.isFinite(value) || value < 0) {
      throw new Error('Enter every DCWD water bill for this month.');
    }
  });

  if (input.readings.length === 0) {
    throw new Error('There are no rooms to bill for this month.');
  }

  input.readings.forEach((reading) => {
    if (!Number.isFinite(reading.previousReading) || reading.previousReading < 0) {
      throw new Error('Enter a valid previous reading for every room.');
    }
    if (!Number.isFinite(reading.currentReading) || reading.currentReading < 0) {
      throw new Error('Enter a valid current reading for every room.');
    }
    if (reading.currentReading < reading.previousReading) {
      throw new Error('A current reading cannot be lower than the previous reading.');
    }
    if (!Number.isInteger(reading.numOfHeads) || reading.numOfHeads < 0) {
      throw new Error('Enter a valid number of heads for every room.');
    }
    if (!Number.isFinite(reading.garbageFee) || reading.garbageFee < 0) {
      throw new Error('Enter a valid garbage fee for every room.');
    }
    if (!Number.isFinite(reading.plasticFee) || reading.plasticFee < 0) {
      throw new Error('Enter a valid plastic fee for every room.');
    }
  });
}

export async function listBillingPeriods(): Promise<BillingPeriodModel[]> {
  await ensureSeeded();
  return settle(sortPeriods(store).map(clonePeriod));
}

export function prepareReadings(
  rooms: RoomModel[],
  periods: BillingPeriodModel[],
  year: number,
  month: number,
): RoomReadingModel[] {
  const target = { year, month };
  const existing = periods.find((period) => period.id === periodKeyOf(year, month)) ?? null;
  const earlier = sortPeriods(periods.filter((period) => comparePeriods(period, target) < 0));

  return sortRooms(rooms).map((room) => {
    const previousEntry = earlier
      .map((period) => period.readings.find((reading) => reading.roomId === room.id))
      .find((reading) => reading !== undefined);
    const currentEntry = existing?.readings.find((reading) => reading.roomId === room.id);
    const previousReading = currentEntry?.previousReading ?? previousEntry?.currentReading ?? 0;
    const occupied = room.tenants.length > 0;

    return {
      roomId: room.id,
      building: room.building,
      roomNumber: room.number,
      roomRate: room.rate,
      tenantCount: room.tenants.length,
      numOfHeads: currentEntry?.numOfHeads ?? room.tenants.length,
      previousReading,
      currentReading: currentEntry?.currentReading ?? previousReading,
      garbageFee:
        currentEntry?.garbageFee ??
        previousEntry?.garbageFee ??
        (occupied ? DEFAULT_GARBAGE_FEE : 0),
      plasticFee:
        currentEntry?.plasticFee ??
        previousEntry?.plasticFee ??
        (occupied ? DEFAULT_PLASTIC_FEE : 0),
    };
  });
}

export function suggestNextPeriod(periods: BillingPeriodModel[]) {
  const today = new Date();
  const latest = sortPeriods(periods)[0];

  if (!latest) {
    return { year: today.getFullYear(), month: today.getMonth() };
  }

  const cursor = new Date(latest.year, latest.month + 1, 1);
  return { year: cursor.getFullYear(), month: cursor.getMonth() };
}

export function findPeriod(periods: BillingPeriodModel[], year: number, month: number) {
  return periods.find((period) => period.id === periodKeyOf(year, month)) ?? null;
}

export async function generateBills(input: GenerateBillsInput): Promise<BillingPeriodModel> {
  await ensureSeeded();
  validateInput(input);

  const id = periodKeyOf(input.year, input.month);
  const existing = store.find((period) => period.id === id) ?? null;
  const now = new Date().toISOString();

  const period: BillingPeriodModel = {
    id,
    year: input.year,
    month: input.month,
    electricRate: input.electricRate,
    crMaintenanceRate: input.crMaintenanceRate,
    davaoLightBill: input.davaoLightBill,
    waterBills: { ...input.waterBills },
    readings: input.readings.map((reading) => ({ ...reading })),
    payments: existing
      ? existing.payments.filter((payment) =>
          input.readings.some((reading) => reading.roomId === payment.roomId),
        )
      : [],
    generatedAt: existing?.generatedAt ?? now,
    updatedAt: now,
  };

  store = existing
    ? store.map((item) => (item.id === id ? period : item))
    : [...store, period];

  return settle(clonePeriod(period));
}

export async function deleteBillingPeriod(periodId: string): Promise<void> {
  await ensureSeeded();
  const period = requirePeriod(periodId);

  if (period.payments.length > 0) {
    throw new Error(
      `${periodLabelOf(period)} already has recorded payments and can no longer be deleted.`,
    );
  }

  store = store.filter((item) => item.id !== periodId);
  return settle(undefined);
}

export async function recordPayment(
  periodId: string,
  draft: PaymentDraft,
): Promise<BillingPeriodModel> {
  await ensureSeeded();
  const period = requirePeriod(periodId);

  const bill = computeBreakdown(period).bills.find((item) => item.roomId === draft.roomId);
  if (!bill) {
    throw new Error('That room has no bill for this period.');
  }

  if (!Number.isFinite(draft.amount) || draft.amount <= 0) {
    throw new Error('Enter a payment amount greater than zero.');
  }

  if (bill.balance <= 0) {
    throw new Error(`${bill.label} is already fully paid for this period.`);
  }

  if (draft.amount > bill.balance) {
    throw new Error(`The payment cannot be higher than the ₱${bill.balance} remaining balance.`);
  }

  period.payments = [
    ...period.payments,
    {
      id: nextPaymentId(),
      roomId: draft.roomId,
      amount: Math.round(draft.amount),
      method: draft.method,
      reference: draft.reference?.trim() || null,
      note: draft.note?.trim() || null,
      receivedBy: draft.receivedBy?.trim() || null,
      paidAt: new Date().toISOString(),
    },
  ];
  period.updatedAt = new Date().toISOString();

  return settle(clonePeriod(period));
}

export async function deletePayment(
  periodId: string,
  paymentId: string,
): Promise<BillingPeriodModel> {
  await ensureSeeded();
  const period = requirePeriod(periodId);

  if (!period.payments.some((payment) => payment.id === paymentId)) {
    throw new Error('That payment record no longer exists.');
  }

  period.payments = period.payments.filter((payment) => payment.id !== paymentId);
  period.updatedAt = new Date().toISOString();

  return settle(clonePeriod(period));
}

export function resetBillingStore() {
  store = [];
  paymentSequence = 0;
  seedPromise = null;
}
