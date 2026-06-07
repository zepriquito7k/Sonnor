import { arrayRemove, arrayUnion, doc, serverTimestamp, updateDoc } from "firebase/firestore";

import { db } from "./dataClient";
import { firestorePaths } from "./paths";

export async function updateUserSettings(
  userId: string,
  group: string,
  values: Record<string, unknown>,
) {
  await updateDoc(doc(db, firestorePaths.user(userId)), {
    [`settings.${group}`]: values,
    updatedAt: serverTimestamp(),
  });
}

export async function updateSearchHistory(
  userId: string,
  entries: {
    cover: string;
    subtitle: string;
    title: string;
    type: string;
  }[],
) {
  await updateUserSettings(userId, "search", {
    history: entries,
  });
}

export async function blockUser(userId: string, blockedUserId: string) {
  await updateUserSettings(userId, "blockedUsers", {
    [blockedUserId]: true,
  });
}

export async function unblockUser(userId: string, blockedUserId: string) {
  await updateUserSettings(userId, "blockedUsers", {
    [blockedUserId]: false,
  });
}

export async function saveAlbumToLibrary(userId: string, albumId: string) {
  await updateDoc(doc(db, firestorePaths.user(userId)), {
    "settings.library.savedAlbumIds": arrayUnion(albumId),
    updatedAt: serverTimestamp(),
  });
}

export async function removeAlbumFromLibrary(userId: string, albumId: string) {
  await updateDoc(doc(db, firestorePaths.user(userId)), {
    "settings.library.savedAlbumIds": arrayRemove(albumId),
    updatedAt: serverTimestamp(),
  });
}
