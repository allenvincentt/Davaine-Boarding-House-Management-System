import {
  MAX_CAROUSEL_SLIDES,
  MAX_ROOM_CAPACITY,
  MAX_ROOM_PHOTOS,
  defaultRoomContent,
  toPublicRoom,
  type CarouselSlideModel,
  type PublicRoomModel,
  type RoomContentModel,
  type RoomPhotoModel,
  type RoomReviewModel,
} from '@/models/contentModel';
import { sortRooms } from '@/models/roomModel';
import { listApprovedReviews } from '@/services/feedbackService';
import type { PickedPhoto } from '@/services/photoPickerService';
import { removeStoredPhotos, uploadPhoto } from '@/services/photoStorageService';
import { listRooms } from '@/services/roomManagementService';
import { supabase } from '@/services/supabaseClient';

type CarouselSlideRow = {
  id: string;
  storage_path: string;
  image_url: string;
  caption: string | null;
  position: number;
};

type RoomContentRow = {
  room_id: string;
  headline: string | null;
  description: string | null;
  capacity: number;
  amenities: string[] | null;
  cover_photo_id: string | null;
};

type RoomPhotoRow = {
  id: string;
  room_id: string;
  storage_path: string;
  image_url: string;
  position: number;
};

export type PhotoDraftItem = {
  key: string;
  existingId: string | null;
  photo: PickedPhoto | null;
};

export type RoomContentInput = {
  description: string;
  capacity: number;
  amenities: string[];
  photos: PhotoDraftItem[];
  coverKey: string | null;
};

const CAROUSEL_FOLDER = 'carousel';
const ROOM_FOLDER = 'rooms';

const carouselTable = () => supabase.from('carousel_slides');
const roomContentTable = () => supabase.from('room_content');
const roomPhotoTable = () => supabase.from('room_photos');

function failed(message: string, fallback: string) {
  if (message.toLowerCase().includes('row-level security')) {
    return new Error(fallback);
  }
  return new Error(message);
}

function toSlideModel(row: CarouselSlideRow): CarouselSlideModel {
  return { id: row.id, uri: row.image_url, caption: row.caption ?? '' };
}

function toPhotoModel(row: RoomPhotoRow): RoomPhotoModel {
  return { id: row.id, uri: row.image_url };
}

async function fetchCarouselRows(): Promise<CarouselSlideRow[]> {
  const { data, error } = await carouselTable()
    .select('id, storage_path, image_url, caption, position')
    .order('position', { ascending: true })
    .returns<CarouselSlideRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function fetchRoomPhotoRows(roomId?: string): Promise<RoomPhotoRow[]> {
  const query = roomPhotoTable().select('id, room_id, storage_path, image_url, position');
  const scoped = roomId ? query.eq('room_id', roomId) : query;

  const { data, error } = await scoped
    .order('position', { ascending: true })
    .returns<RoomPhotoRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function fetchRoomContentRows(): Promise<RoomContentRow[]> {
  const { data, error } = await roomContentTable()
    .select('room_id, headline, description, capacity, amenities, cover_photo_id')
    .returns<RoomContentRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

function buildContentMap(
  contentRows: RoomContentRow[],
  photoRows: RoomPhotoRow[],
): Record<string, RoomContentModel> {
  const photosByRoom = new Map<string, RoomPhotoModel[]>();

  photoRows.forEach((row) => {
    const list = photosByRoom.get(row.room_id) ?? [];
    list.push(toPhotoModel(row));
    photosByRoom.set(row.room_id, list);
  });

  return Object.fromEntries(
    contentRows.map((row) => [
      row.room_id,
      {
        roomId: row.room_id,
        headline: row.headline ?? '',
        description: row.description ?? '',
        capacity: row.capacity,
        amenities: row.amenities ?? [],
        coverPhotoId: row.cover_photo_id,
        photos: photosByRoom.get(row.room_id) ?? [],
      } satisfies RoomContentModel,
    ]),
  );
}

export async function listCarouselSlides(): Promise<CarouselSlideModel[]> {
  const rows = await fetchCarouselRows();
  return rows.map(toSlideModel);
}

export async function saveCarousel(items: PhotoDraftItem[]): Promise<CarouselSlideModel[]> {
  if (items.length > MAX_CAROUSEL_SLIDES) {
    throw new Error(`The carousel holds up to ${MAX_CAROUSEL_SLIDES} photos.`);
  }

  const existingRows = await fetchCarouselRows();
  const keptIds = new Set(items.map((item) => item.existingId).filter(Boolean) as string[]);
  const removed = existingRows.filter((row) => !keptIds.has(row.id));

  if (removed.length > 0) {
    const { error } = await carouselTable()
      .delete()
      .in(
        'id',
        removed.map((row) => row.id),
      );

    if (error) {
      throw failed(error.message, 'You are not allowed to change the landing carousel.');
    }

    await removeStoredPhotos(removed.map((row) => row.storage_path));
  }

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];

    if (item.existingId) {
      const { error } = await carouselTable()
        .update({ position: index })
        .eq('id', item.existingId);

      if (error) {
        throw failed(error.message, 'You are not allowed to change the landing carousel.');
      }
      continue;
    }

    if (!item.photo) {
      continue;
    }

    const stored = await uploadPhoto(CAROUSEL_FOLDER, item.photo);
    const { error } = await carouselTable().insert({
      storage_path: stored.path,
      image_url: stored.url,
      caption: '',
      position: index,
    });

    if (error) {
      await removeStoredPhotos([stored.path]);
      throw failed(error.message, 'You are not allowed to change the landing carousel.');
    }
  }

  return listCarouselSlides();
}

export async function listRoomContent(): Promise<RoomContentModel[]> {
  const [contentRows, photoRows] = await Promise.all([fetchRoomContentRows(), fetchRoomPhotoRows()]);
  return Object.values(buildContentMap(contentRows, photoRows));
}

export async function saveRoomContent(
  roomId: string,
  input: RoomContentInput,
): Promise<RoomContentModel> {
  if (!Number.isFinite(input.capacity) || input.capacity <= 0) {
    throw new Error('Enter how many people the room fits.');
  }
  if (input.capacity > MAX_ROOM_CAPACITY) {
    throw new Error(`A room can be listed for up to ${MAX_ROOM_CAPACITY} pax.`);
  }
  if (input.photos.length > MAX_ROOM_PHOTOS) {
    throw new Error(`Each room holds up to ${MAX_ROOM_PHOTOS} photos.`);
  }

  const existingRows = await fetchRoomPhotoRows(roomId);
  const keptIds = new Set(input.photos.map((item) => item.existingId).filter(Boolean) as string[]);
  const removed = existingRows.filter((row) => !keptIds.has(row.id));
  const idByKey = new Map<string, string>();

  if (removed.length > 0) {
    const { error } = await roomPhotoTable()
      .delete()
      .in(
        'id',
        removed.map((row) => row.id),
      );

    if (error) {
      throw failed(error.message, 'You are not allowed to change room photos.');
    }

    await removeStoredPhotos(removed.map((row) => row.storage_path));
  }

  for (let index = 0; index < input.photos.length; index += 1) {
    const item = input.photos[index];

    if (item.existingId) {
      idByKey.set(item.key, item.existingId);

      const { error } = await roomPhotoTable().update({ position: index }).eq('id', item.existingId);

      if (error) {
        throw failed(error.message, 'You are not allowed to change room photos.');
      }
      continue;
    }

    if (!item.photo) {
      continue;
    }

    const stored = await uploadPhoto(`${ROOM_FOLDER}/${roomId}`, item.photo);
    const { data, error } = await roomPhotoTable()
      .insert({
        room_id: roomId,
        storage_path: stored.path,
        image_url: stored.url,
        position: index,
      })
      .select('id')
      .single<{ id: string }>();

    if (error) {
      await removeStoredPhotos([stored.path]);
      throw failed(error.message, 'You are not allowed to change room photos.');
    }

    idByKey.set(item.key, data.id);
  }

  const coverPhotoId = input.coverKey ? (idByKey.get(input.coverKey) ?? null) : null;
  const rooms = await listRooms();
  const room = rooms.find((item) => item.id === roomId);

  const { error: upsertError } = await roomContentTable().upsert(
    {
      room_id: roomId,
      headline: room ? defaultRoomContent(room).headline : '',
      description: input.description.trim(),
      capacity: Math.round(input.capacity),
      amenities: input.amenities.map((item) => item.trim()).filter((item) => item.length > 0),
      cover_photo_id: coverPhotoId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'room_id' },
  );

  if (upsertError) {
    throw failed(upsertError.message, 'You are not allowed to change website content.');
  }

  const [contentRows, photoRows] = await Promise.all([
    fetchRoomContentRows(),
    fetchRoomPhotoRows(roomId),
  ]);

  const map = buildContentMap(
    contentRows.filter((row) => row.room_id === roomId),
    photoRows,
  );

  return (
    map[roomId] ?? {
      roomId,
      headline: '',
      description: input.description,
      capacity: input.capacity,
      amenities: input.amenities,
      coverPhotoId,
      photos: [],
    }
  );
}

export async function listPublicRooms(): Promise<PublicRoomModel[]> {
  const [rooms, contentRows, photoRows, reviews] = await Promise.all([
    listRooms(),
    fetchRoomContentRows(),
    fetchRoomPhotoRows(),
    listApprovedReviews(),
  ]);

  const contentMap = buildContentMap(contentRows, photoRows);
  const reviewsByRoom = new Map<string, RoomReviewModel[]>();

  reviews.forEach((review) => {
    const list = reviewsByRoom.get(review.roomId) ?? [];
    list.push(review);
    reviewsByRoom.set(review.roomId, list);
  });

  return sortRooms(rooms).map((room) =>
    toPublicRoom(
      room,
      contentMap[room.id] ?? defaultRoomContent(room),
      reviewsByRoom.get(room.id) ?? [],
    ),
  );
}
