import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { db } from "./dataClient";
import { firestoreCollections } from "./paths";

export async function getMessageThreads(userId?: string | null) {
  if (!userId) {
    return [];
  }

  const snapshot = await getDocs(
    query(
      collection(db, firestoreCollections.messageThreads),
      where("participantIds", "array-contains", userId),
      orderBy("updatedAt", "desc"),
      limit(50),
    ),
  );

  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function createMessageThread(participantIds: string[]) {
  const docRef = await addDoc(collection(db, firestoreCollections.messageThreads), {
    participantIds,
    lastMessageText: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function sendMessage(input: {
  threadId: string;
  senderId: string;
  text: string;
  sharedTrackId?: string;
  sharedPostId?: string;
  mediaUrl?: string;
}) {
  return addDoc(collection(db, firestoreCollections.messages), {
    ...input,
    readBy: [input.senderId],
    createdAt: serverTimestamp(),
  });
}
