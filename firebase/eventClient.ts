import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "./dataClient";
import { firestoreCollections, firestorePaths } from "./paths";
import type { EventBannerDocument, EventRequestDocument } from "./schema";
import { uploadUriToStorage } from "./storageClient";

export type EventRequest = EventRequestDocument & { id: string };
export type EventBanner = EventBannerDocument & { id: string };

const EVENT_BANNER_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export async function requestEventBanner(input: {
  userId: string;
  title: string;
  details: string;
  linkUrl: string;
  mediaType: "image" | "video";
  mediaUri: string;
}) {
  const requestRef = await addDoc(collection(db, firestoreCollections.eventRequests), {
    userId: input.userId,
    title: input.title.trim(),
    details: input.details.trim(),
    linkUrl: input.linkUrl.trim(),
    imageUrl: "",
    mediaType: input.mediaType,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const upload = await uploadUriToStorage(
    {
      kind: "eventBanner",
      eventId: requestRef.id,
      extension: input.mediaType === "video" ? "mp4" : "jpg",
    },
    input.mediaUri,
  );

  await updateDoc(requestRef, {
    imageUrl: upload.downloadUrl,
    updatedAt: serverTimestamp(),
  });

  return requestRef.id;
}

export async function listEventRequests() {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, firestoreCollections.eventRequests),
        orderBy("createdAt", "desc"),
        limit(120),
      ),
    );

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<EventRequest, "id">),
    }));
  } catch (error) {
    console.log("EVENT REQUESTS FALLBACK:", error);
    return [];
  }
}

export async function listPendingEventRequests() {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, firestoreCollections.eventRequests),
        where("status", "==", "pending"),
        limit(80),
      ),
    );

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<EventRequest, "id">),
    }));
  } catch (error) {
    console.log("PENDING EVENT REQUESTS FALLBACK:", error);
    return [];
  }
}

export async function listEventBanners() {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, firestoreCollections.eventBanners),
        orderBy("createdAt", "desc"),
        limit(80),
      ),
    );

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<EventBanner, "id">),
    }));
  } catch (error) {
    console.log("EVENT BANNERS FALLBACK:", error);
    return [];
  }
}

export async function approveEventRequest(
  request: EventRequest,
  adminName: string,
  visibility: "public" | "followers" = "public",
) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EVENT_BANNER_DURATION_MS);
  const bannerRef = await addDoc(collection(db, firestoreCollections.eventBanners), {
    requestId: request.id,
    userId: request.userId,
    title: request.title,
    subtitle: request.details,
    imageUrl: request.imageUrl,
    mediaType: request.mediaType || "image",
    linkUrl: request.linkUrl,
    visibility,
    status: "published",
    startsAt: now,
    expiresAt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, firestorePaths.eventRequest(request.id)), {
    status: "approved",
    adminName,
    approvedBannerId: bannerRef.id,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return bannerRef.id;
}

export async function rejectEventRequest(
  requestId: string,
  adminName: string,
  rejectionReason: string,
) {
  await updateDoc(doc(db, firestorePaths.eventRequest(requestId)), {
    status: "rejected",
    adminName,
    rejectionReason: rejectionReason.trim(),
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function removeEventBanner(bannerId: string) {
  await updateDoc(doc(db, firestorePaths.eventBanner(bannerId)), {
    status: "removed",
    updatedAt: serverTimestamp(),
  });
}
