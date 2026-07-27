import type { PickedPhoto } from '@/services/photoPickerService';
import { supabase } from '@/services/supabaseClient';

export const PHOTO_BUCKET = 'site-photos';

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const EXTENSION_PATTERN = /^[a-z0-9]{2,5}$/;

export type StoredPhoto = {
  path: string;
  url: string;
};

function decodeBase64(value: string): Uint8Array {
  const clean = value.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));

  let buffer = 0;
  let bits = 0;
  let index = 0;

  for (let position = 0; position < clean.length; position += 1) {
    buffer = (buffer << 6) | BASE64_ALPHABET.indexOf(clean[position]);
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      bytes[index] = (buffer >> bits) & 0xff;
      index += 1;
    }
  }

  return bytes;
}

function extensionOf(photo: PickedPhoto) {
  const fromName = photo.fileName?.split('.').pop()?.toLowerCase();
  if (fromName && EXTENSION_PATTERN.test(fromName)) {
    return fromName;
  }

  const fromMime = photo.mimeType.split('/')[1]?.toLowerCase();
  return fromMime && EXTENSION_PATTERN.test(fromMime) ? fromMime : 'jpg';
}

function uniqueName(photo: PickedPhoto) {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${suffix}.${extensionOf(photo)}`;
}

export async function uploadPhoto(folder: string, photo: PickedPhoto): Promise<StoredPhoto> {
  const path = `${folder}/${uniqueName(photo)}`;

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, decodeBase64(photo.base64), {
      contentType: photo.mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(
      error.message.toLowerCase().includes('bucket')
        ? `The "${PHOTO_BUCKET}" storage bucket is missing. Create it in Supabase Storage first.`
        : error.message,
    );
  }

  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);

  return { path, url: data.publicUrl };
}

export async function removeStoredPhotos(paths: string[]): Promise<void> {
  const targets = paths.filter((path) => path.trim().length > 0);

  if (targets.length === 0) {
    return;
  }

  await supabase.storage.from(PHOTO_BUCKET).remove(targets);
}
