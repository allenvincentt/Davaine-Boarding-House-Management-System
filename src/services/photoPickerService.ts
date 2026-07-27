import * as ImagePicker from 'expo-image-picker';

export type PickedPhoto = {
  uri: string;
  base64: string;
  mimeType: string;
  fileName: string | null;
};

export async function pickPhotoFromLibrary(): Promise<PickedPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error('Allow photo library access to upload images.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    allowsEditing: false,
    quality: 0.85,
    base64: true,
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];

  if (!asset?.base64) {
    throw new Error('That photo could not be read. Please pick another one.');
  }

  return {
    uri: asset.uri,
    base64: asset.base64,
    mimeType: asset.mimeType ?? 'image/jpeg',
    fileName: asset.fileName ?? null,
  };
}
