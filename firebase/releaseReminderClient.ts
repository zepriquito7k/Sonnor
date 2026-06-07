import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "./dataClient";
import { firestoreCollections } from "./paths";

function reminderId(userId: string, albumId: string) {
  return `${userId}_${albumId}`;
}

export async function setReleaseReminder(
  userId: string,
  albumId: string,
  enabled: boolean,
) {
  const ref = doc(db, firestoreCollections.releaseReminders, reminderId(userId, albumId));

  if (!enabled) {
    await deleteDoc(ref);
    return false;
  }

  await setDoc(ref, {
    albumId,
    userId,
    createdAt: serverTimestamp(),
  });
  return true;
}
