import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
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

export type ProfileRequestKind =
  | "display_name"
  | "delete_album"
  | "delete_track";

export type ProfileRequestStatus = "pending" | "approved" | "rejected";

export type ProfileRequest = {
  id: string;
  userId: string;
  kind: ProfileRequestKind;
  status: ProfileRequestStatus;
  title: string;
  targetId?: string;
  targetTitle?: string;
  requestedValue?: string;
  currentValue?: string;
  adminName?: string;
  rejectionReason?: string;
  createdAt?: unknown;
  reviewedAt?: unknown;
};

function startOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const start = new Date(now);

  start.setDate(now.getDate() - diff);
  start.setHours(0, 0, 0, 0);

  return start.getTime();
}

function getTime(value: unknown) {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (
    value &&
    typeof value === "object" &&
    "seconds" in value &&
    typeof value.seconds === "number"
  ) {
    return value.seconds * 1000;
  }

  return 0;
}

export async function requestDisplayNameChange(input: {
  userId: string;
  currentValue: string;
  requestedValue: string;
}) {
  await addDoc(collection(db, firestoreCollections.profileRequests), {
    userId: input.userId,
    kind: "display_name",
    status: "pending",
    title: "Request to change name",
    currentValue: input.currentValue,
    requestedValue: input.requestedValue,
    createdAt: serverTimestamp(),
  });
}

export async function requestContentDeletion(input: {
  userId: string;
  targetId: string;
  targetTitle: string;
  targetType: "album" | "track";
}) {
  await addDoc(collection(db, firestoreCollections.profileRequests), {
    userId: input.userId,
    kind: input.targetType === "album" ? "delete_album" : "delete_track",
    status: "pending",
    title:
      input.targetType === "album"
        ? "Request to delete album"
        : "Request to delete song",
    targetId: input.targetId,
    targetTitle: input.targetTitle,
    createdAt: serverTimestamp(),
  });
}

export async function sendProfileReport(input: {
  reporterId: string;
  targetUserId: string;
  details: string;
}) {
  await addDoc(collection(db, firestoreCollections.reports), {
    reporterId: input.reporterId,
    targetType: "user",
    targetId: input.targetUserId,
    reason: input.details,
    details: input.details,
    status: "open",
    createdAt: serverTimestamp(),
  });
}

export async function getWeeklyRejectedProfileRequests(userId: string) {
  const snapshot = await getDocs(
    query(
      collection(db, firestoreCollections.profileRequests),
      where("userId", "==", userId),
      where("status", "==", "rejected"),
    ),
  );
  const weekStart = startOfCurrentWeek();

  return snapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<ProfileRequest, "id">),
    }))
    .filter((request) => getTime(request.reviewedAt ?? request.createdAt) >= weekStart);
}

export async function getPendingProfileRequests() {
  const snapshot = await getDocs(
    query(
      collection(db, firestoreCollections.profileRequests),
      where("status", "==", "pending"),
    ),
  );

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<ProfileRequest, "id">),
  }));
}

export async function getAdminProfileRequests() {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, firestoreCollections.profileRequests),
        orderBy("createdAt", "desc"),
        limit(120),
      ),
    );

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<ProfileRequest, "id">),
    }));
  } catch (error) {
    console.log("ADMIN PROFILE REQUESTS FALLBACK:", error);
    return [];
  }
}

export async function approveProfileRequest(request: ProfileRequest, adminName: string) {
  if (request.kind === "display_name" && request.requestedValue) {
    await updateDoc(doc(db, firestorePaths.user(request.userId)), {
      displayName: request.requestedValue,
      updatedAt: serverTimestamp(),
    });
  }

  if (request.kind === "delete_track" && request.targetId) {
    const trackSnapshot = await getDoc(doc(db, firestorePaths.track(request.targetId)));
    const trackData = trackSnapshot.data();
    const albumId = typeof trackData?.albumId === "string" ? trackData.albumId : "";

    if (albumId) {
      const albumTracks = await getDocs(
        query(
          collection(db, firestoreCollections.tracks),
          where("albumId", "==", albumId),
        ),
      );
      const hasOtherTracks = albumTracks.docs.some(
        (trackDoc) => trackDoc.id !== request.targetId,
      );

      if (!hasOtherTracks) {
        await deleteDoc(doc(db, firestorePaths.album(albumId)));
      }
    }

    await deleteDoc(doc(db, firestorePaths.track(request.targetId)));
  }

  if (request.kind === "delete_album" && request.targetId) {
    const albumSnapshot = await getDoc(doc(db, firestorePaths.album(request.targetId)));
    const albumData = albumSnapshot.data();
    const trackIds = Array.isArray(albumData?.trackIds) ? albumData.trackIds : [];
    const albumTracks = await getDocs(
      query(
        collection(db, firestoreCollections.tracks),
        where("albumId", "==", request.targetId),
      ),
    );

    await Promise.all([
      ...trackIds
        .filter((trackId): trackId is string => typeof trackId === "string")
        .map((trackId) => deleteDoc(doc(db, firestorePaths.track(trackId)))),
      ...albumTracks.docs.map((trackDoc) => deleteDoc(trackDoc.ref)),
      deleteDoc(doc(db, firestorePaths.album(request.targetId))),
    ]);
  }

  await updateDoc(doc(db, firestorePaths.profileRequest(request.id)), {
    status: "approved",
    adminName,
    reviewedAt: serverTimestamp(),
  });
}

export async function rejectProfileRequest(
  requestId: string,
  adminName: string,
  rejectionReason: string,
) {
  await updateDoc(doc(db, firestorePaths.profileRequest(requestId)), {
    status: "rejected",
    adminName,
    rejectionReason,
    reviewedAt: serverTimestamp(),
  });
}
