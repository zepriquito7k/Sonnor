type UploadAssetLike = {
  fileName?: string | null;
  mimeType?: string | null;
  uri: string;
};

export const MAX_AVATAR_GIF_DURATION_SECONDS = 6;

export function getImageUploadExtension(asset: UploadAssetLike) {
  const mimeType = asset.mimeType?.toLowerCase() ?? "";
  const name = asset.fileName?.toLowerCase() ?? asset.uri.toLowerCase();

  if (mimeType.includes("gif") || name.includes(".gif")) {
    return "gif";
  }

  if (mimeType.includes("png") || name.includes(".png")) {
    return "png";
  }

  if (mimeType.includes("webp") || name.includes(".webp")) {
    return "webp";
  }

  return "jpg";
}

export async function getGifDurationSeconds(uri: string) {
  const response = await fetch(uri);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let durationMs = 0;

  for (let index = 0; index < bytes.length - 9; index += 1) {
    const isGraphicControlExtension =
      bytes[index] === 0x21 &&
      bytes[index + 1] === 0xf9 &&
      bytes[index + 2] === 0x04;

    if (!isGraphicControlExtension) {
      continue;
    }

    const delayHundredths = bytes[index + 4] | (bytes[index + 5] << 8);
    durationMs += (delayHundredths || 10) * 10;
  }

  return durationMs / 1000;
}

export async function isAvatarGifDurationAllowed(uri: string) {
  const duration = await getGifDurationSeconds(uri);
  return duration <= MAX_AVATAR_GIF_DURATION_SECONDS;
}
