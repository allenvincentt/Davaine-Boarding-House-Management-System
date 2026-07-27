import {
  MAX_CAROUSEL_SLIDES,
  MAX_ROOM_CAPACITY,
  MAX_ROOM_PHOTOS,
  toPublicRoom,
  type CarouselSlideModel,
  type PublicRoomModel,
  type RoomContentModel,
  type RoomPhotoModel,
  type RoomReviewModel,
} from '@/models/contentModel';
import { roomLabel, sortRooms, type RoomModel } from '@/models/roomModel';
import { listRooms } from '@/services/roomManagementService';

const REQUEST_LATENCY = 220;

const seedCarousel: [uri: string, caption: string][] = [
  [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=85',
    'Toril shoreline',
  ],
  [
    'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=900&q=85',
    'Shared lounge',
  ],
  [
    'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=85',
    'Communal kitchen',
  ],
  [
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=85',
    'Twin bed room',
  ],
  [
    'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=900&q=85',
    'Study corner',
  ],
  [
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=85',
    'Living area',
  ],
  [
    'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=900&q=85',
    'Quiet hallway',
  ],
];

const seedRoomPhotos = [
  'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=85',
];

const seedAmenities = [
  ['Air-Conditioned', 'Own Comfort Room', 'Study Desk', 'Wi-Fi Ready'],
  ['Air-Conditioned', 'Shared Comfort Room', 'Built-in Cabinet'],
  ['Electric Fan', 'Shared Comfort Room', 'Wi-Fi Ready'],
  ['Air-Conditioned', 'Balcony Access', 'Study Desk'],
];

const seedDescriptions = [
  'A bright corner unit with wide windows, a built-in cabinet, and enough floor space for a study nook. Steps away from the lounge and the laundry area.',
  'A quiet room along the inner hallway, finished with a tiled floor and a private wash area. Ideal for students who keep late study hours.',
  'A roomy unit for barkada sharing, with two large windows and direct access to the shared kitchen on the same floor.',
  'A compact and tidy unit that fits a bed, a desk, and a cabinet comfortably. Closest to the main gate and the guard post.',
];

const seedReviewAuthors: [author: string, rating: number, comment: string][] = [
  ['Ella Marasigan', 5, 'Super linis and the landlady is very accommodating. Water pressure is strong even in the morning rush.'],
  ['Jomar Tabios', 4, 'Great value for the price. Wi-Fi is fast, though the hallway can get noisy on weekends.'],
  ['Rhea Bacani', 5, 'Been here two semesters now. Very safe, the gate is locked by 10 PM and the guard knows every boarder.'],
  ['Kim Alvarado', 4, 'Room is bigger than it looks in the photos. Aircon was serviced right after I moved in.'],
  ['Nico Ferrer', 5, 'Walking distance to the terminal. Billing is transparent, they post the meter reading every month.'],
  ['Trina Sablay', 3, 'Comfortable stay overall, but the shared CR gets busy in the morning.'],
  ['Ariel Mangubat', 5, 'Clean, quiet, and the electric bill is computed fairly per room. No hidden charges.'],
  ['Dana Villaruz', 4, 'Landlady replies fast to messages. Would recommend for working students.'],
];

let carouselSequence = 0;
let photoSequence = 0;
let reviewSequence = 0;

function nextCarouselId() {
  carouselSequence += 1;
  return `slide-${carouselSequence}`;
}

function nextPhotoId() {
  photoSequence += 1;
  return `photo-${photoSequence}`;
}

function nextReviewId() {
  reviewSequence += 1;
  return `review-${reviewSequence}`;
}

function buildCarousel(): CarouselSlideModel[] {
  return seedCarousel.map(([uri, caption]) => ({ id: nextCarouselId(), uri, caption }));
}

function buildRoomContent(room: RoomModel, index: number): RoomContentModel {
  const photos: RoomPhotoModel[] = [0, 1, 2, 3].map((offset) => ({
    id: nextPhotoId(),
    uri: seedRoomPhotos[(index + offset) % seedRoomPhotos.length],
  }));

  return {
    roomId: room.id,
    headline: roomLabel(room),
    description: seedDescriptions[index % seedDescriptions.length],
    capacity: room.rate >= 2200 ? 2 : index % 3 === 0 ? 4 : 3,
    amenities: seedAmenities[index % seedAmenities.length],
    coverPhotoId: photos[0].id,
    photos,
  };
}

function buildReviews(room: RoomModel, index: number): RoomReviewModel[] {
  const count = 2 + (index % 3);
  const now = Date.now();

  return Array.from({ length: count }, (_item, offset) => {
    const [author, rating, comment] = seedReviewAuthors[(index + offset) % seedReviewAuthors.length];
    return {
      id: nextReviewId(),
      roomId: room.id,
      author,
      rating,
      comment,
      createdAt: new Date(now - (offset + index) * 9 * 86_400_000).toISOString(),
    };
  });
}

let carouselStore: CarouselSlideModel[] = buildCarousel();
let contentStore: Record<string, RoomContentModel> = {};
let reviewStore: Record<string, RoomReviewModel[]> = {};
let seeded = false;

function settle<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), REQUEST_LATENCY));
}

function cloneContent(content: RoomContentModel): RoomContentModel {
  return {
    ...content,
    amenities: [...content.amenities],
    photos: content.photos.map((photo) => ({ ...photo })),
  };
}

async function ensureSeeded() {
  if (seeded) {
    return;
  }

  const rooms = sortRooms(await listRooms());
  rooms.forEach((room, index) => {
    contentStore[room.id] = buildRoomContent(room, index);
    reviewStore[room.id] = buildReviews(room, index);
  });
  seeded = true;
}

function requireContent(roomId: string) {
  const content = contentStore[roomId];
  if (!content) {
    throw new Error('That room no longer has a content entry.');
  }
  return content;
}

export async function listCarouselSlides(): Promise<CarouselSlideModel[]> {
  return settle(carouselStore.map((slide) => ({ ...slide })));
}

export async function addCarouselSlide(uri: string, caption = ''): Promise<CarouselSlideModel[]> {
  if (!uri.trim()) {
    throw new Error('Pick a photo before saving it to the carousel.');
  }
  if (carouselStore.length >= MAX_CAROUSEL_SLIDES) {
    throw new Error(`The carousel holds up to ${MAX_CAROUSEL_SLIDES} photos.`);
  }

  carouselStore = [...carouselStore, { id: nextCarouselId(), uri: uri.trim(), caption: caption.trim() }];
  return settle(carouselStore.map((slide) => ({ ...slide })));
}

export async function removeCarouselSlide(slideId: string): Promise<CarouselSlideModel[]> {
  carouselStore = carouselStore.filter((slide) => slide.id !== slideId);
  return settle(carouselStore.map((slide) => ({ ...slide })));
}

export async function moveCarouselSlide(
  slideId: string,
  direction: -1 | 1,
): Promise<CarouselSlideModel[]> {
  const index = carouselStore.findIndex((slide) => slide.id === slideId);
  const target = index + direction;

  if (index >= 0 && target >= 0 && target < carouselStore.length) {
    const next = [...carouselStore];
    [next[index], next[target]] = [next[target], next[index]];
    carouselStore = next;
  }

  return settle(carouselStore.map((slide) => ({ ...slide })));
}

export async function listRoomContent(): Promise<RoomContentModel[]> {
  await ensureSeeded();
  return settle(Object.values(contentStore).map(cloneContent));
}

export async function addRoomPhoto(roomId: string, uri: string): Promise<RoomContentModel> {
  await ensureSeeded();
  const content = requireContent(roomId);

  if (!uri.trim()) {
    throw new Error('Pick a photo before adding it to the room.');
  }
  if (content.photos.length >= MAX_ROOM_PHOTOS) {
    throw new Error(`Each room holds up to ${MAX_ROOM_PHOTOS} photos.`);
  }

  const photo: RoomPhotoModel = { id: nextPhotoId(), uri: uri.trim() };
  content.photos = [...content.photos, photo];
  content.coverPhotoId = content.coverPhotoId ?? photo.id;

  return settle(cloneContent(content));
}

export async function removeRoomPhoto(roomId: string, photoId: string): Promise<RoomContentModel> {
  await ensureSeeded();
  const content = requireContent(roomId);

  content.photos = content.photos.filter((photo) => photo.id !== photoId);
  if (content.coverPhotoId === photoId) {
    content.coverPhotoId = content.photos[0]?.id ?? null;
  }

  return settle(cloneContent(content));
}

export async function setRoomCoverPhoto(
  roomId: string,
  photoId: string,
): Promise<RoomContentModel> {
  await ensureSeeded();
  const content = requireContent(roomId);

  if (!content.photos.some((photo) => photo.id === photoId)) {
    throw new Error('That photo is no longer part of this room.');
  }

  content.coverPhotoId = photoId;
  return settle(cloneContent(content));
}

export type RoomDetailsInput = {
  description: string;
  capacity: number;
  amenities: string[];
};

export async function updateRoomDetails(
  roomId: string,
  input: RoomDetailsInput,
): Promise<RoomContentModel> {
  await ensureSeeded();
  const content = requireContent(roomId);

  if (!Number.isFinite(input.capacity) || input.capacity <= 0) {
    throw new Error('Enter how many people the room fits.');
  }
  if (input.capacity > MAX_ROOM_CAPACITY) {
    throw new Error(`A room can be listed for up to ${MAX_ROOM_CAPACITY} pax.`);
  }

  content.description = input.description.trim();
  content.capacity = Math.round(input.capacity);
  content.amenities = input.amenities.map((item) => item.trim()).filter((item) => item.length > 0);

  return settle(cloneContent(content));
}

export async function listPublicRooms(): Promise<PublicRoomModel[]> {
  await ensureSeeded();
  const rooms = sortRooms(await listRooms());

  return rooms
    .filter((room) => !!contentStore[room.id])
    .map((room) =>
      toPublicRoom(
        room,
        cloneContent(contentStore[room.id]),
        (reviewStore[room.id] ?? []).map((review) => ({ ...review })),
      ),
    );
}

export function resetContentStore() {
  carouselSequence = 0;
  photoSequence = 0;
  reviewSequence = 0;
  carouselStore = buildCarousel();
  contentStore = {};
  reviewStore = {};
  seeded = false;
}
