import {
  MAX_REVIEW_COMMENT,
  type ReviewStatus,
  type RoomReviewModel,
} from '@/models/contentModel';
import { supabase } from '@/services/supabaseClient';

type RoomReviewRow = {
  id: string;
  room_id: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  created_at: string;
};

export type SubmitReviewInput = {
  roomId: string;
  rating: number;
  comment: string;
};

const reviewTable = () => supabase.from('room_reviews');

const REVIEW_COLUMNS = 'id, room_id, rating, comment, status, created_at';

function toReviewModel(row: RoomReviewRow): RoomReviewModel {
  return {
    id: row.id,
    roomId: row.room_id,
    rating: row.rating,
    comment: row.comment ?? '',
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function listRoomReviews(): Promise<RoomReviewModel[]> {
  const { data, error } = await reviewTable()
    .select(REVIEW_COLUMNS)
    .order('created_at', { ascending: false })
    .returns<RoomReviewRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(toReviewModel);
}

export async function listApprovedReviews(): Promise<RoomReviewModel[]> {
  const { data, error } = await reviewTable()
    .select(REVIEW_COLUMNS)
    .eq('status', 'Approved')
    .order('created_at', { ascending: false })
    .returns<RoomReviewRow[]>();

  if (error) {
    return [];
  }

  return (data ?? []).map(toReviewModel);
}

export async function listApprovedRoomReviews(roomId: string): Promise<RoomReviewModel[]> {
  const { data, error } = await reviewTable()
    .select(REVIEW_COLUMNS)
    .eq('room_id', roomId)
    .eq('status', 'Approved')
    .order('created_at', { ascending: false })
    .returns<RoomReviewRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(toReviewModel);
}

export async function submitRoomReview(input: SubmitReviewInput): Promise<RoomReviewModel> {
  const rating = Math.round(input.rating);
  const comment = input.comment.trim();

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error('Pick a rating from 1 to 5 stars.');
  }
  if (comment.length > MAX_REVIEW_COMMENT) {
    throw new Error(`Keep your comment under ${MAX_REVIEW_COMMENT} characters.`);
  }

  const { data, error } = await reviewTable()
    .insert({ room_id: input.roomId, rating, comment })
    .select(REVIEW_COLUMNS)
    .single<RoomReviewRow>();

  if (error) {
    throw new Error(
      error.message.toLowerCase().includes('row-level security')
        ? 'Reviews are not accepting submissions right now.'
        : error.message,
    );
  }

  return toReviewModel(data);
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await reviewTable().delete().eq('id', id);

  if (error) {
    throw new Error(
      error.message.toLowerCase().includes('row-level security')
        ? 'You are not allowed to delete reviews.'
        : error.message,
    );
  }
}

export async function updateReviewStatus(
  id: string,
  status: ReviewStatus,
): Promise<RoomReviewModel> {
  const { data, error } = await reviewTable()
    .update({ status })
    .eq('id', id)
    .select(REVIEW_COLUMNS)
    .single<RoomReviewRow>();

  if (error) {
    throw new Error(
      error.message.toLowerCase().includes('row-level security')
        ? 'You are not allowed to moderate reviews.'
        : error.message,
    );
  }

  return toReviewModel(data);
}
