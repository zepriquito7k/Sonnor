import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";

type PickMediaOptions = {
  allowsEditing?: boolean;
  allowsMultipleSelection?: boolean;
  mediaTypes?: ImagePicker.MediaTypeOptions;
  orderedSelection?: boolean;
  quality?: number;
  selectionLimit?: number;
};

async function ensureGalleryPermission() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (permission.granted) {
    return true;
  }

  Alert.alert(
    "Permissão necessária",
    "Precisamos de acesso à tua galeria para selecionar a mídia.",
  );

  return false;
}

export async function pickLibraryAsset(options?: PickMediaOptions) {
  const assets = await pickLibraryAssets(options);

  return assets[0] ?? null;
}

export async function pickLibraryAssets(options?: PickMediaOptions) {
  const hasPermission = await ensureGalleryPermission();

  if (!hasPermission) {
    return [];
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: options?.allowsEditing ?? false,
    allowsMultipleSelection: options?.allowsMultipleSelection ?? false,
    mediaTypes: options?.mediaTypes ?? ImagePicker.MediaTypeOptions.Images,
    orderedSelection: options?.orderedSelection ?? true,
    quality: options?.quality ?? 1,
    selectionLimit: options?.selectionLimit ?? 0,
  });

  if (result.canceled || result.assets.length === 0) {
    return [];
  }

  return result.assets;
}

export async function pickLibraryImage(options?: PickMediaOptions) {
  const asset = await pickLibraryAsset({
    ...options,
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
  });

  return asset?.uri ?? null;
}

export async function pickLibraryImages(options?: PickMediaOptions) {
  const assets = await pickLibraryAssets({
    ...options,
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
  });

  return assets.map((asset) => asset.uri);
}
