import {
  addDoc,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { httpsCallable } from "firebase/functions";

import { auth, functions } from "./config";
import { db } from "./dataClient";
import { defaultAppContent } from "./defaultContent";
import { firestoreCollections } from "./paths";
import type { NotificationDocument } from "./schema";

function getFollowId(followerId: string, followingId: string) {
  return `${followerId}_${followingId}`;
}

async function waitForSignedUser(expectedUserId?: string) {
  const currentUser = auth.currentUser;

  if (currentUser && (!expectedUserId || currentUser.uid === expectedUserId)) {
    return currentUser;
  }

  return new Promise<User | null>((resolve) => {
    const timeoutId = setTimeout(() => {
      unsubscribe();
      resolve(null);
    }, 2500);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeoutId);
      unsubscribe();
      resolve(user && (!expectedUserId || user.uid === expectedUserId) ? user : null);
    });
  });
}

export async function getCallableIdToken(expectedUserId?: string) {
  const user = await waitForSignedUser(expectedUserId);

  if (!user) {
    throw new Error("Session required.");
  }

  return user.getIdToken(true);
}

export async function createLike(
  userId: string,
  targetType: "post" | "track" | "album" | "comment",
  targetId: string,
) {
  const idToken = await getCallableIdToken(userId);

  if (targetType === "post") {
    const response = await httpsCallable<
      { idToken: string; postId: string },
      { liked: boolean }
    >(functions, "togglePostLikeV2")({
      idToken,
      postId: targetId,
    });
    return { data: response.data };
  }

  return httpsCallable(functions, "toggleContentLike")({
    idToken,
    targetType,
    targetId,
  });
}

function getLikeId(userId: string, targetType: string, targetId: string) {
  return `${userId}_${targetType}_${targetId}`;
}

export async function isTrackLiked(userId: string, trackId: string) {
  const snapshot = await getDoc(
    doc(db, firestoreCollections.likes, getLikeId(userId, "track", trackId)),
  );
  return snapshot.exists();
}

export async function toggleTrackLike(userId: string, trackId: string) {
  const idToken = await getCallableIdToken(userId);

  const response = await httpsCallable<
    { idToken: string; trackId: string },
    { liked: boolean }
  >(functions, "toggleTrackLikeV2")({
    idToken,
    trackId,
  });
  return response.data.liked;
}

export async function createFollow(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new Error("An account cannot follow itself.");
  }

  const idToken = await getCallableIdToken(followerId);

  return httpsCallable(functions, "setUserFollow")({
    idToken,
    follow: true,
    followingId,
  });
}

export async function removeFollow(followerId: string, followingId: string) {
  const idToken = await getCallableIdToken(followerId);

  await httpsCallable(functions, "setUserFollow")({
    idToken,
    follow: false,
    followingId,
  });
}

export async function isFollowingUser(
  followerId?: string | null,
  followingId?: string | null,
) {
  if (!followerId || !followingId || followerId === followingId) {
    return false;
  }

  const [snapshot, globalSnapshot] = await Promise.all([
    getDoc(
      doc(
        db,
        firestoreCollections.users,
        followingId,
        "followers",
        followerId,
      ),
    ).catch(() => null),
    getDoc(
      doc(db, firestoreCollections.follows, getFollowId(followerId, followingId)),
    ).catch(() => null),
  ]);

  return Boolean(snapshot?.exists() || globalSnapshot?.exists());
}

export async function countUserFollowers(userId?: string | null) {
  if (!userId) {
    return 0;
  }

  const [nestedCount, globalCount] = await Promise.all([
    getCountFromServer(
      collection(db, firestoreCollections.users, userId, "followers"),
    ).catch(() => null),
    getCountFromServer(
      query(
        collection(db, firestoreCollections.follows),
        where("followingId", "==", userId),
      ),
    ).catch(() => null),
  ]);

  return Math.max(
    nestedCount?.data().count ?? 0,
    globalCount?.data().count ?? 0,
  );
}

export async function createComment(
  userId: string,
  targetType: "post" | "track" | "album",
  targetId: string,
  text: string,
) {
  return addDoc(collection(db, firestoreCollections.comments), {
    userId,
    targetType,
    targetId,
    text,
    likesCount: 0,
    createdAt: serverTimestamp(),
  });
}

export async function createReport(input: {
  reporterId: string;
  targetType: "user" | "post" | "track" | "album" | "comment";
  targetId: string;
  reason: string;
  details?: string;
}) {
  return addDoc(collection(db, firestoreCollections.reports), {
    ...input,
    status: "open",
    createdAt: serverTimestamp(),
  });
}

export async function createVerificationRequest(input: {
  userId: string;
  legalName: string;
  proofLinks: string[];
  message: string;
}) {
  return addDoc(collection(db, firestoreCollections.verificationRequests), {
    ...input,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export async function getNotifications(userId?: string | null) {
  if (!userId) {
    return [];
  }

  const snapshot = await getDocs(
    query(
      collection(db, firestoreCollections.notifications),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(50),
    ),
  );

  return snapshot.docs.map(
    (item) => ({ id: item.id, ...item.data() }) as NotificationDocument,
  );
}

export async function markNotificationRead(notificationId: string) {
  await updateDoc(doc(db, firestoreCollections.notifications, notificationId), {
    read: true,
  });
}

export async function getAdminOverview() {
  try {
    const [users, posts, tracks, albums, reports, verifications] = await Promise.all([
      getDocs(query(collection(db, firestoreCollections.users), limit(100))),
      getDocs(query(collection(db, firestoreCollections.posts), limit(100))),
      getDocs(query(collection(db, firestoreCollections.tracks), limit(100))),
      getDocs(query(collection(db, firestoreCollections.albums), limit(100))),
      getDocs(query(collection(db, firestoreCollections.reports), limit(100))),
      getDocs(query(collection(db, firestoreCollections.verificationRequests), limit(100))),
    ]);

    return {
      usersCount: users.size || 1,
      postsCount: posts.size || defaultAppContent.posts.length,
      tracksCount: tracks.size || defaultAppContent.tracks.length,
      albumsCount: albums.size || defaultAppContent.releases.length,
      reportsCount: reports.size,
      verificationRequestsCount: verifications.size,
    };
  } catch (error) {
    console.log("ADMIN OVERVIEW FALLBACK:", error);
    return {
      usersCount: 0,
      postsCount: 0,
      tracksCount: 0,
      albumsCount: 0,
      reportsCount: 0,
      verificationRequestsCount: 0,
    };
  }
}
