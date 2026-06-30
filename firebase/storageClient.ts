import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";

import { storage } from "./dataClient";
import { storagePaths } from "./paths";

export type UploadKind =
  | "avatar"
  | "banner"
  | "background"
  | "albumCover"
  | "albumBackground"
  | "trackCover"
  | "trackAudio"
  | "trackPreview"
  | "trackShortVideo"
  | "submissionAudio"
  | "eventBanner"
  | "postMedia"
  | "postOverlayMedia"
  | "postThumbnail"
  | "messageMedia"
  | "temp";

type UploadTarget =
  | { kind: "avatar"; userId: string; extension?: string }
  | { kind: "banner" | "background"; userId: string }
  | { kind: "albumCover" | "albumBackground"; albumId: string }
  | { kind: "trackCover" | "trackAudio" | "trackPreview" | "trackShortVideo"; trackId: string }
  | { kind: "submissionAudio"; submissionId: string }
  | { kind: "eventBanner"; eventId: string; extension?: string }
  | { kind: "postMedia"; postId: string; extension: string }
  | {
      kind: "postOverlayMedia";
      postId: string;
      overlayId: string;
      extension: string;
    }
  | { kind: "postThumbnail"; postId: string }
  | {
      kind: "messageMedia";
      threadId: string;
      messageId: string;
      extension: string;
    }
  | { kind: "temp"; userId: string; uploadId: string };

export function getStoragePath(target: UploadTarget) {
  switch (target.kind) {
    case "avatar":
      return storagePaths.userAvatar(target.userId, target.extension);
    case "banner":
      return storagePaths.userBanner(target.userId);
    case "background":
      return storagePaths.userBackground(target.userId);
    case "albumCover":
      return storagePaths.albumCover(target.albumId);
    case "albumBackground":
      return storagePaths.albumBackground(target.albumId);
    case "trackCover":
      return storagePaths.trackCover(target.trackId);
    case "trackAudio":
      return storagePaths.trackAudio(target.trackId);
    case "trackPreview":
      return storagePaths.trackPreview(target.trackId);
    case "trackShortVideo":
      return storagePaths.trackShortVideo(target.trackId);
    case "submissionAudio":
      return storagePaths.submissionAudio(target.submissionId);
    case "eventBanner":
      return storagePaths.eventBanner(target.eventId, target.extension);
    case "postMedia":
      return storagePaths.postMedia(target.postId, target.extension);
    case "postOverlayMedia":
      return storagePaths.postOverlayMedia(
        target.postId,
        target.overlayId,
        target.extension,
      );
    case "postThumbnail":
      return storagePaths.postThumbnail(target.postId);
    case "messageMedia":
      return storagePaths.messageMedia(
        target.threadId,
        target.messageId,
        target.extension,
      );
    case "temp":
      return storagePaths.tempUpload(target.userId, target.uploadId);
  }
}

function getContentTypeFromExtension(extension: string) {
  switch (extension.toLowerCase()) {
    case "gif":
      return "image/gif";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "mp4":
      return "video/mp4";
    default:
      return "image/jpeg";
  }
}

export async function uploadFileToStorage(
  target: UploadTarget,
  file: Blob,
  onProgress?: (progress: number) => void,
) {
  const path = getStoragePath(target);
  const uploadRef = ref(storage, path);
  const metadata =
    target.kind === "submissionAudio" || target.kind === "trackAudio"
      ? { contentType: "audio/mpeg" }
      : target.kind === "avatar"
        ? { contentType: getContentTypeFromExtension(target.extension ?? "jpg") }
      : target.kind === "trackCover"
        ? { contentType: "image/jpeg" }
        : target.kind === "trackShortVideo"
          ? { contentType: "video/mp4" }
          : target.kind === "postMedia" || target.kind === "postOverlayMedia"
            ? { contentType: getContentTypeFromExtension(target.extension) }
            : undefined;
  const task = uploadBytesResumable(uploadRef, file, metadata);

  return new Promise<{ downloadUrl: string; path: string }>((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot) => {
        if (!onProgress) {
          return;
        }

        onProgress(snapshot.bytesTransferred / snapshot.totalBytes);
      },
      reject,
      async () => {
        const downloadUrl = await getDownloadURL(task.snapshot.ref);

        resolve({ downloadUrl, path });
      },
    );
  });
}

export async function uploadUriToStorage(
  target: UploadTarget,
  uri: string,
  onProgress?: (progress: number) => void,
) {
  const blob = await uriToBlob(uri);

  return uploadFileToStorage(target, blob, onProgress);
}

export function withCacheBust(url: string) {
  const separator = url.includes("?") ? "&" : "?";

  return `${url}${separator}v=${Date.now()}`;
}

function uriToBlob(uri: string) {
  return new Promise<Blob>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.onload = () => resolve(request.response);
    request.onerror = () => reject(new Error("Could not read the selected file."));
    request.responseType = "blob";
    request.open("GET", uri, true);
    request.send(null);
  });
}
