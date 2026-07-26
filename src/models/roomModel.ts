export type RoomBuilding = 'A' | 'B';

export type RoomStatus = 'Occupied' | 'Available';

export type RoomTenantModel = {
  id: string;
  fullName: string;
  contactNumber: string | null;
  facebookLink: string | null;
};

export type RoomModel = {
  id: string;
  building: RoomBuilding;
  number: number;
  rate: number;
  dueDay: number;
  tenants: RoomTenantModel[];
};

export const roomBuildings: RoomBuilding[] = ['A', 'B'];

export const PREMIUM_ROOM_RATE = 2200;
export const STANDARD_ROOM_RATE = 1800;

const buildingRoomCount: Record<RoomBuilding, number> = { A: 7, B: 6 };
const premiumRoomNumbers: Record<RoomBuilding, number[]> = { A: [1, 7], B: [] };

const MONTH_LABELS = [
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

const DAY_IN_MS = 86_400_000;
const DUE_THIS_WEEK_DAYS = 7;

export function roomCountOf(building: RoomBuilding) {
  return buildingRoomCount[building];
}

export function defaultRateFor(building: RoomBuilding, number: number) {
  return premiumRoomNumbers[building].includes(number) ? PREMIUM_ROOM_RATE : STANDARD_ROOM_RATE;
}

export type RoomIdentity = Pick<RoomModel, 'building' | 'number'>;

export function roomLabel(room: RoomIdentity) {
  return `Room ${room.number}-${room.building}`;
}

export function roomShortLabel(room: RoomIdentity) {
  return `${room.number}-${room.building}`;
}

export function buildingLabel(building: RoomBuilding) {
  return `Bldg. ${building}`;
}

export function roomStatusOf(room: RoomModel): RoomStatus {
  return room.tenants.length > 0 ? 'Occupied' : 'Available';
}

export function tenantCountLabel(room: RoomModel) {
  const count = room.tenants.length;
  return `${count} ${count === 1 ? 'tenant' : 'tenants'}`;
}

export function sortRooms(rooms: RoomModel[]) {
  return [...rooms].sort((left, right) =>
    left.building === right.building
      ? left.number - right.number
      : left.building.localeCompare(right.building),
  );
}

export function formatPeso(value: number) {
  return `₱ ${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function parseRate(value: string) {
  const digits = value.replace(/[^\d]/g, '');
  return digits.length === 0 ? Number.NaN : Number(digits);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dueDateWithin(year: number, month: number, day: number) {
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDayOfMonth));
}

export function nextDueDate(room: RoomModel, from: Date = new Date()) {
  const today = startOfDay(from);
  const thisMonth = dueDateWithin(today.getFullYear(), today.getMonth(), room.dueDay);
  if (thisMonth.getTime() >= today.getTime()) {
    return thisMonth;
  }
  return dueDateWithin(today.getFullYear(), today.getMonth() + 1, room.dueDay);
}

export function daysUntilDue(room: RoomModel, from: Date = new Date()) {
  return Math.round((nextDueDate(room, from).getTime() - startOfDay(from).getTime()) / DAY_IN_MS);
}

export function isDueToday(room: RoomModel, from: Date = new Date()) {
  return roomStatusOf(room) === 'Occupied' && daysUntilDue(room, from) === 0;
}

export function isDueThisWeek(room: RoomModel, from: Date = new Date()) {
  if (roomStatusOf(room) !== 'Occupied') {
    return false;
  }
  const days = daysUntilDue(room, from);
  return days >= 0 && days <= DUE_THIS_WEEK_DAYS;
}

export function formatShortDate(date: Date) {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}`;
}

export function dueSummaryOf(room: RoomModel, from: Date = new Date()) {
  if (roomStatusOf(room) === 'Available') {
    return 'No active billing';
  }
  const days = daysUntilDue(room, from);
  if (days === 0) {
    return 'Due today';
  }
  if (days === 1) {
    return 'Due tomorrow';
  }
  if (days <= DUE_THIS_WEEK_DAYS) {
    return `Due in ${days} days`;
  }
  return `Due ${formatShortDate(nextDueDate(room, from))}`;
}
