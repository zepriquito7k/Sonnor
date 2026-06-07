import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "./dataClient";
import { defaultAppContent } from "./defaultContent";
import { firestoreCollections } from "./paths";
import type { NotificationDocument } from "./schema";

function getFollowId(followerId: string, followingId: string) {
  return `${followerId}_${followingId}`;
}

export async function createLike(
  userId: string,
  targetType: "post" | "track" | "album" | "comment",
  targetId: string,
) {
  if (targetType === "track") {
    return toggleTrackLike(userId, targetId);
  }

  return addDoc(collection(db, firestoreCollections.likes), {
    userId,
    targetType,
    targetId,
    createdAt: serverTimestamp(),
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
  const likeRef = doc(
    db,
    firestoreCollections.likes,
    getLikeId(userId, "track", trackId),
  );
  const trackRef = doc(db, firestoreCollections.tracks, trackId);

  return runTransaction(db, async (transaction) => {
    const [likeSnapshot, trackSnapshot] = await Promise.all([
      transaction.get(likeRef),
      transaction.get(trackRef),
    ]);

    if (!trackSnapshot.exists()) {
      throw new Error("Track not found.");
    }

    const currentCount =
      typeof trackSnapshot.data().likesCount === "number"
        ? trackSnapshot.data().likesCount
        : 0;

    if (likeSnapshot.exists()) {
      transaction.delete(likeRef);
      transaction.update(trackRef, { likesCount: Math.max(0, currentCount - 1) });
      return false;
    }

    transaction.set(likeRef, {
      userId,
      targetType: "track",
      targetId: trackId,
      createdAt: serverTimestamp(),
    });
    transaction.update(trackRef, { likesCount: currentCount + 1 });
    return true;
  });
}

export async function createFollow(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new Error("A conta nao pode seguir a si propria.");
  }

  const followerRef = doc(
    db,
    firestoreCollections.users,
    followingId,
    "followers",
    followerId,
  );
  const followingRef = doc(
    db,
    firestoreCollections.users,
    followerId,
    "following",
    followingId,
  );
  const followRef = doc(
    db,
    firestoreCollections.follows,
    getFollowId(followerId, followingId),
  );
  const [existing, existingGlobal] = await Promise.all([
    getDoc(followerRef).catch(() => null),
    getDoc(followRef).catch(() => null),
  ]);

  if (existing?.exists() || existingGlobal?.exists()) {
    return followerRef;
  }

  const payload = {
    followerId,
    followingId,
    createdAt: serverTimestamp(),
  };

  await setDoc(followerRef, payload).catch(async (error) => {
    console.log("FOLLOWER SUBCOLLECTION ERROR:", error);
    await setDoc(followRef, payload);
  });

  await Promise.all([
    setDoc(followingRef, payload).catch((error) =>
      console.log("FOLLOWING SUBCOLLECTION ERROR:", error),
    ),
    setDoc(followRef, payload).catch((error) =>
      console.log("FOLLOW GLOBAL DOC ERROR:", error),
    ),
  ]);

  await updateDoc(doc(db, firestoreCollections.users, followerId), {
    followingCount: increment(1),
    updatedAt: serverTimestamp(),
  }).catch((error) => console.log("FOLLOWING COUNT ERROR:", error));

  await updateDoc(doc(db, firestoreCollections.users, followingId), {
    followersCount: increment(1),
    updatedAt: serverTimestamp(),
  }).catch((error) => console.log("FOLLOWERS COUNT ERROR:", error));

  return followerRef;
}

export async function removeFollow(followerId: string, followingId: string) {
  const followerRef = doc(
    db,
    firestoreCollections.users,
    followingId,
    "followers",
    followerId,
  );
  const followingRef = doc(
    db,
    firestoreCollections.users,
    followerId,
    "following",
    followingId,
  );
  const followRef = doc(
    db,
    firestoreCollections.follows,
    getFollowId(followerId, followingId),
  );
  const [existing, existingGlobal] = await Promise.all([
    getDoc(followerRef).catch(() => null),
    getDoc(followRef).catch(() => null),
  ]);

  if (!existing?.exists() && !existingGlobal?.exists()) {
    return;
  }

  await Promise.all([
    deleteDoc(followerRef).catch((error) =>
      console.log("FOLLOWER SUBCOLLECTION DELETE ERROR:", error),
    ),
    deleteDoc(followingRef).catch((error) =>
      console.log("FOLLOWING SUBCOLLECTION DELETE ERROR:", error),
    ),
    deleteDoc(followRef).catch((error) =>
      console.log("FOLLOW GLOBAL DOC DELETE ERROR:", error),
    ),
  ]);

  await updateDoc(doc(db, firestoreCollections.users, followerId), {
    followingCount: increment(-1),
    updatedAt: serverTimestamp(),
  }).catch((error) => console.log("FOLLOWING COUNT ERROR:", error));

  await updateDoc(doc(db, firestoreCollections.users, followingId), {
    followersCount: increment(-1),
    updatedAt: serverTimestamp(),
  }).catch((error) => console.log("FOLLOWERS COUNT ERROR:", error));
}

export async function isFollowingUser(
  followerId?: string | null,
  followingId?: string | null,
) {
  if (!followerId || !followingId || followerId === followingId) {
    return false;
  }

  const snapshot = await getDoc(
    doc(
      db,
      firestoreCollections.users,
      followingId,
      "followers",
      followerId,
    ),
  ).catch(() => null);

  if (snapshot?.exists()) {
    return true;
  }

  const globalSnapshot = await getDoc(
    doc(db, firestoreCollections.follows, getFollowId(followerId, followingId)),
  ).catch(() => null);

  return globalSnapshot?.exists() ?? false;
}

export async function countUserFollowers(userId?: string | null) {
  if (!userId) {
    return 0;
  }

  const snapshot = await getDocs(
    query(
      collection(db, firestoreCollections.users, userId, "followers"),
      limit(1000),
    ),
  ).catch(() => null);

  if (snapshot && !snapshot.empty) {
    return snapshot.size;
  }

  const globalSnapshot = await getDocs(
    query(
      collection(db, firestoreCollections.follows),
      where("followingId", "==", userId),
      limit(1000),
    ),
  ).catch(() => null);

  return globalSnapshot?.size ?? 0;
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
}
