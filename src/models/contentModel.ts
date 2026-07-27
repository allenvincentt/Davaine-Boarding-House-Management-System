import {
  formatPeso,
  roomLabel,
  roomStatusOf,
  type RoomModel,
  type RoomStatus,
} from '@/models/roomModel';

export type CarouselSlideModel = {
  id: string;
  uri: string;
  caption: string;
};

export type RoomPhotoModel = {
  id: string;
  uri: string;
};

export type RoomContentModel = {
  roomId: string;
  headline: string;
  description: string;
  capacity: number;
  amenities: string[];
  coverPhotoId: string | null;
  photos: RoomPhotoModel[];
};

export type ReviewStatus = 'Pending' | 'Approved' | 'Disapproved';

export type RoomReviewModel = {
  id: string;
  roomId: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  createdAt: string;
};

export type PublicRoomModel = {
  roomId: string;
  label: string;
  building: RoomModel['building'];
  number: number;
  rate: number;
  rateLabel: string;
  status: RoomStatus;
  available: boolean;
  capacity: number;
  capacityLabel: string;
  headline: string;
  description: string;
  amenities: string[];
  photos: RoomPhotoModel[];
  coverPhoto: RoomPhotoModel | null;
  rating: number;
  ratingLabel: string;
  reviewCount: number;
};

export const MAX_ROOM_PHOTOS = 8;
export const MAX_CAROUSEL_SLIDES = 12;
export const MAX_ROOM_CAPACITY = 12;
export const MAX_REVIEW_COMMENT = 400;

export const reviewStatuses: ReviewStatus[] = ['Pending', 'Approved', 'Disapproved'];

const REVIEW_MONTHS = [
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

export function capacityLabelOf(capacity: number) {
  return `Good for ${capacity} Pax`;
}

export function averageRatingOf(reviews: RoomReviewModel[]) {
  if (reviews.length === 0) {
    return 0;
  }
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Math.round((total / reviews.length) * 10) / 10;
}

export function ratingLabelOf(rating: number) {
  return rating > 0 ? rating.toFixed(1) : '—';
}

export function reviewSummaryOf(reviews: RoomReviewModel[]) {
  const positive = reviews.filter((review) => review.rating >= 4).length;
  const negative = reviews.filter((review) => review.rating <= 2).length;

  return {
    average: averageRatingOf(reviews),
    total: reviews.length,
    positive,
    negative,
  };
}

export function reviewDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return `${REVIEW_MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function starRow(rating: number) {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return `${'★'.repeat(filled)}${'☆'.repeat(5 - filled)}`;
}

export function coverPhotoOf(content: RoomContentModel): RoomPhotoModel | null {
  const selected = content.photos.find((photo) => photo.id === content.coverPhotoId);
  return selected ?? content.photos[0] ?? null;
}

export function defaultRoomContent(room: RoomModel): RoomContentModel {
  return {
    roomId: room.id,
    headline: roomLabel(room),
    description: '',
    capacity: 2,
    amenities: [],
    coverPhotoId: null,
    photos: [],
  };
}

export function toPublicRoom(
  room: RoomModel,
  content: RoomContentModel,
  reviews: RoomReviewModel[],
): PublicRoomModel {
  const status = roomStatusOf(room);
  const rating = averageRatingOf(reviews);

  return {
    roomId: room.id,
    label: roomLabel(room),
    building: room.building,
    number: room.number,
    rate: room.rate,
    rateLabel: formatPeso(room.rate),
    status,
    available: status === 'Available',
    capacity: content.capacity,
    capacityLabel: capacityLabelOf(content.capacity),
    headline: content.headline || roomLabel(room),
    description: content.description,
    amenities: content.amenities,
    photos: content.photos,
    coverPhoto: coverPhotoOf(content),
    rating,
    ratingLabel: ratingLabelOf(rating),
    reviewCount: reviews.length,
  };
}
