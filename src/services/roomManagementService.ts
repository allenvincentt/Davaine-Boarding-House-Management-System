import {
  defaultRateFor,
  sortRooms,
  type RoomBuilding,
  type RoomModel,
  type RoomTenantModel,
} from '@/models/roomModel';

export type RenterDraft = {
  fullName: string;
  contactNumber: string | null;
  facebookLink: string | null;
};

export type UpdateRoomInput = {
  rate: number;
  renters: RenterDraft[];
};

type SeedTenant = [fullName: string, contactNumber: string, facebookHandle: string];

type SeedRoom = {
  building: RoomBuilding;
  number: number;
  dueOffset: number;
  tenants: SeedTenant[];
};

const REQUEST_LATENCY = 260;

const seedRooms: SeedRoom[] = [
  {
    building: 'A',
    number: 1,
    dueOffset: 0,
    tenants: [
      ['Maria Santos', '0917 555 0142', 'maria.santos'],
      ['Liza Cordero', '0918 220 8834', 'liza.cordero'],
    ],
  },
  {
    building: 'A',
    number: 2,
    dueOffset: 0,
    tenants: [
      ['James Reyes', '0920 447 1290', 'james.reyes'],
      ['Noel Ferrer', '0995 118 7742', 'noel.ferrer'],
      ['Kevin Dela Cruz', '0977 340 5518', 'kevin.delacruz'],
    ],
  },
  { building: 'A', number: 3, dueOffset: 10, tenants: [] },
  {
    building: 'A',
    number: 4,
    dueOffset: 3,
    tenants: [
      ['Anna Bautista', '0916 771 3320', 'anna.bautista'],
      ['Grace Villanueva', '0939 662 4471', 'grace.villanueva'],
    ],
  },
  {
    building: 'A',
    number: 5,
    dueOffset: 5,
    tenants: [['Paolo Mendoza', '0908 245 9917', 'paolo.mendoza']],
  },
  {
    building: 'A',
    number: 6,
    dueOffset: 12,
    tenants: [
      ['Rico Alvarez', '0975 883 2214', 'rico.alvarez'],
      ['Jenny Lim', '0927 664 1180', 'jenny.lim'],
      ['Mark Aguilar', '0946 229 7735', 'mark.aguilar'],
      ['Trisha Ramos', '0912 508 6693', 'trisha.ramos'],
    ],
  },
  {
    building: 'A',
    number: 7,
    dueOffset: 6,
    tenants: [
      ['Carlo Domingo', '0956 771 2048', 'carlo.domingo'],
      ['Bea Salcedo', '0933 415 7729', 'bea.salcedo'],
    ],
  },
  {
    building: 'B',
    number: 1,
    dueOffset: 1,
    tenants: [
      ['Ellen Navarro', '0929 336 5514', 'ellen.navarro'],
      ['Ruel Gascon', '0949 227 8836', 'ruel.gascon'],
      ['Mika Tolentino', '0918 774 2205', 'mika.tolentino'],
    ],
  },
  { building: 'B', number: 2, dueOffset: 15, tenants: [] },
  {
    building: 'B',
    number: 3,
    dueOffset: 2,
    tenants: [
      ['Dennis Ocampo', '0965 118 3327', 'dennis.ocampo'],
      ['Faye Bactad', '0921 907 4416', 'faye.bactad'],
    ],
  },
  {
    building: 'B',
    number: 4,
    dueOffset: 9,
    tenants: [['Arvin Cutamora', '0907 553 8821', 'arvin.cutamora']],
  },
  {
    building: 'B',
    number: 5,
    dueOffset: 0,
    tenants: [
      ['Joy Panganiban', '0937 224 6690', 'joy.panganiban'],
      ['Ken Sarmiento', '0916 883 1147', 'ken.sarmiento'],
      ['Hazel Dizon', '0978 662 3319', 'hazel.dizon'],
    ],
  },
  { building: 'B', number: 6, dueOffset: 22, tenants: [] },
];

let tenantSequence = 0;

function nextTenantId() {
  tenantSequence += 1;
  return `tenant-${tenantSequence}`;
}

function dueDayFromOffset(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.getDate();
}

function buildStore(): RoomModel[] {
  return seedRooms.map((seed) => ({
    id: `room-${seed.building}${seed.number}`,
    building: seed.building,
    number: seed.number,
    rate: defaultRateFor(seed.building, seed.number),
    dueDay: dueDayFromOffset(seed.dueOffset),
    tenants: seed.tenants.map(([fullName, contactNumber, facebookHandle]) => ({
      id: nextTenantId(),
      fullName,
      contactNumber,
      facebookLink: `https://facebook.com/${facebookHandle}`,
    })),
  }));
}

let store: RoomModel[] = buildStore();

function cloneRoom(room: RoomModel): RoomModel {
  return { ...room, tenants: room.tenants.map((tenant) => ({ ...tenant })) };
}

function settle<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), REQUEST_LATENCY));
}

function requireRoom(roomId: string) {
  const room = store.find((item) => item.id === roomId);
  if (!room) {
    throw new Error('That room no longer exists.');
  }
  return room;
}

function toTenants(renters: RenterDraft[], existing: RoomTenantModel[]): RoomTenantModel[] {
  return renters
    .filter((renter) => renter.fullName.trim().length > 0)
    .map((renter, index) => ({
      id: existing[index]?.id ?? nextTenantId(),
      fullName: renter.fullName.trim(),
      contactNumber: renter.contactNumber?.trim() || null,
      facebookLink: renter.facebookLink?.trim() || null,
    }));
}

export async function listRooms(): Promise<RoomModel[]> {
  return settle(sortRooms(store).map(cloneRoom));
}

export async function addRenters(roomId: string, renters: RenterDraft[]): Promise<RoomModel> {
  const room = requireRoom(roomId);
  const incoming = toTenants(renters, []);

  if (incoming.length === 0) {
    throw new Error('Add at least one tenant name.');
  }

  room.tenants = [...room.tenants, ...incoming];
  return settle(cloneRoom(room));
}

export async function updateRoom(roomId: string, input: UpdateRoomInput): Promise<RoomModel> {
  const room = requireRoom(roomId);
  const tenants = toTenants(input.renters, room.tenants);

  if (!Number.isFinite(input.rate) || input.rate <= 0) {
    throw new Error('Enter a valid room rate.');
  }

  room.rate = Math.round(input.rate);
  room.tenants = tenants;
  return settle(cloneRoom(room));
}

export async function releaseRoom(roomId: string): Promise<RoomModel> {
  const room = requireRoom(roomId);
  room.tenants = [];
  return settle(cloneRoom(room));
}

export function resetRoomStore() {
  tenantSequence = 0;
  store = buildStore();
}
