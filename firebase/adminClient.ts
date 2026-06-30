import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { httpsCallable } from "firebase/functions";

import { auth, functions } from "./config";
import { db } from "./dataClient";
import { firestoreCollections } from "./paths";
import type {
  AlbumDocument,
  CommentDocument,
  PostDocument,
  ReportDocument,
  TrackDocument,
  UserDocument,
} from "./schema";

export type AdminUserListItem = {
  id: string;
  avatarUrl?: string;
  displayName: string;
  email?: string;
  followersCount: number;
  tracksCount: number;
  username: string;
  verified: boolean;
  verificationOverride: boolean;
  verifiedBy?: string;
};

export type AdminPostListItem = {
  id: string;
  userId: string;
  userDisplayName: string;
  username: string;
  userEmail: string;
  userAvatarUrl: string;
  caption: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl: string;
  linkedTrackId: string;
  linkedAlbumId: string;
  status: string;
  likesCount: number;
  commentsCount: number;
  reportsCount: number;
  createdAt?: PostDocument["createdAt"];
};

export type AdminReportListItem = {
  id: string;
  reporterId: string;
  reporterDisplayName: string;
  reporterUsername: string;
  reporterEmail: string;
  targetType: ReportDocument["targetType"] | "content";
  targetId: string;
  targetTitle: string;
  targetOwnerId: string;
  targetOwnerDisplayName: string;
  reason: string;
  details: string;
  status: string;
  adminResponse: string;
  createdAt?: ReportDocument["createdAt"];
  reviewedAt?: ReportDocument["reviewedAt"];
};

async function listCollection(collectionName: string, fallback: string[]) {
  try {
    const snapshot = await getDocs(query(collection(db, collectionName), limit(50)));

    if (snapshot.empty) {
      return fallback;
    }

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const title =
        typeof data.title === "string"
          ? data.title
          : typeof data.displayName === "string"
          ? data.displayName
          : typeof data.username === "string"
          ? data.username
          : docSnap.id;

      return `${title} (${docSnap.id})`;
    });
  } catch (error) {
    console.log(`ADMIN FALLBACK ${collectionName}:`, error);
    return fallback;
  }
}

export function listAdminUsers() {
  return listCollection(firestoreCollections.users, []);
}

export async function listAdminUserProfiles(): Promise<AdminUserListItem[]> {
  try {
    const snapshot = await getDocs(
      query(collection(db, firestoreCollections.users), orderBy("createdAt", "desc"), limit(120)),
    );

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as Partial<UserDocument>;

      return {
        id: docSnap.id,
        avatarUrl: data.avatarUrl || data.bannerUrl || "",
        displayName: data.displayName || data.username || data.email || "Unnamed user",
        email: data.email || "",
        followersCount: data.followersCount || 0,
        tracksCount: data.tracksCount || 0,
        username: data.username || "",
        verified: data.verified === true,
        verificationOverride: data.verificationOverride === true,
        verifiedBy: data.verifiedBy || "",
      };
    });
  } catch (error) {
    console.log("ADMIN USERS LIST ERROR:", error);
    return [];
  }
}

export async function setUserVerificationOverride(uid: string, verified: boolean) {
  const user = await waitForSignedInUser();
  const idToken = await user.getIdToken(true);
  const setUserVerifiedOverride = httpsCallable<
    { idToken: string; uid: string; verified: boolean },
    { success: boolean }
  >(functions, "setUserVerifiedOverride");

  return setUserVerifiedOverride({ idToken, uid, verified });
}

export async function adminDeleteUser(uid: string) {
  const user = await waitForSignedInUser();

  await addDoc(collection(db, firestoreCollections.adminDeletionRequests), {
    createdAt: serverTimestamp(),
    requestedBy: user.uid,
    selfDelete: user.uid === uid,
    status: "pending",
    targetUid: uid,
  });

  return { success: true };
}

function waitForSignedInUser() {
  return new Promise<User>((resolve, reject) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }

    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error("Session expired. Sign in again before using admin tools."));
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (!nextUser) {
        return;
      }

      clearTimeout(timeout);
      unsubscribe();
      resolve(nextUser);
    });
  });
}

export async function listAdminPosts(): Promise<AdminPostListItem[]> {
  try {
    const [postsSnapshot, usersSnapshot] = await Promise.all([
      getDocs(query(collection(db, firestoreCollections.posts), orderBy("createdAt", "desc"), limit(120))),
      getDocs(query(collection(db, firestoreCollections.users), limit(300))),
    ]);

    const usersById = new Map(
      usersSnapshot.docs.map((docSnap) => [docSnap.id, docSnap.data() as Partial<UserDocument>]),
    );

    return postsSnapshot.docs.map((docSnap) => {
      const data = docSnap.data() as Partial<PostDocument>;
      const owner = data.userId ? usersById.get(data.userId) : undefined;

      return {
        id: docSnap.id,
        userId: data.userId || "",
        userDisplayName:
          owner?.displayName || owner?.username || owner?.email || data.userId || "Unknown user",
        username: owner?.username || "",
        userEmail: owner?.email || "",
        userAvatarUrl: owner?.avatarUrl || owner?.bannerUrl || "",
        caption: data.caption || "",
        mediaType: data.mediaType || "post",
        mediaUrl: data.mediaUrl || "",
        thumbnailUrl: data.thumbnailUrl || "",
        linkedTrackId: data.linkedTrackId || "",
        linkedAlbumId: data.linkedAlbumId || "",
        status: data.status || "published",
        likesCount: data.likesCount || 0,
        commentsCount: data.commentsCount || 0,
        reportsCount: data.reportsCount || 0,
        createdAt: data.createdAt,
      };
    });
  } catch (error) {
    console.log("ADMIN POSTS LIST ERROR:", error);
    return [];
  }
}

export function listAdminReleases() {
  return listCollection(firestoreCollections.albums, []);
}

export function listAdminVerificationRequests() {
  return listCollection(firestoreCollections.verificationRequests, [
    "No verification requests",
  ]);
}

export async function listAdminReports(): Promise<AdminReportListItem[]> {
  try {
    const [reportsSnapshot, usersSnapshot, postsSnapshot, tracksSnapshot, albumsSnapshot, commentsSnapshot] = await Promise.all([
      query(collection(db, firestoreCollections.reports), orderBy("createdAt", "desc"), limit(80)),
      query(collection(db, firestoreCollections.users), limit(300)),
      query(collection(db, firestoreCollections.posts), limit(300)),
      query(collection(db, firestoreCollections.tracks), limit(300)),
      query(collection(db, firestoreCollections.albums), limit(300)),
      query(collection(db, firestoreCollections.comments), limit(300)),
    ].map((nextQuery) => getDocs(nextQuery)));

    const usersById = new Map(
      usersSnapshot.docs.map((docSnap) => [docSnap.id, docSnap.data() as Partial<UserDocument>]),
    );
    const postsById = new Map(
      postsSnapshot.docs.map((docSnap) => [docSnap.id, docSnap.data() as Partial<PostDocument>]),
    );
    const tracksById = new Map(
      tracksSnapshot.docs.map((docSnap) => [docSnap.id, docSnap.data() as Partial<TrackDocument>]),
    );
    const albumsById = new Map(
      albumsSnapshot.docs.map((docSnap) => [docSnap.id, docSnap.data() as Partial<AlbumDocument>]),
    );
    const commentsById = new Map(
      commentsSnapshot.docs.map((docSnap) => [docSnap.id, docSnap.data() as Partial<CommentDocument>]),
    );

    return reportsSnapshot.docs.map((docSnap) => {
      const data = docSnap.data() as Partial<ReportDocument>;
      const reporter = data.reporterId ? usersById.get(data.reporterId) : undefined;
      let targetTitle = "Unknown content";
      let targetOwnerId = "";

      if (data.targetType === "user") {
        const targetUser = data.targetId ? usersById.get(data.targetId) : undefined;
        targetTitle = targetUser?.displayName || targetUser?.username || targetUser?.email || "Unknown user";
        targetOwnerId = data.targetId || "";
      } else if (data.targetType === "post") {
        const post = data.targetId ? postsById.get(data.targetId) : undefined;
        targetTitle = post?.caption || post?.mediaType || "Post without caption";
        targetOwnerId = post?.userId || "";
      } else if (data.targetType === "track") {
        const track = data.targetId ? tracksById.get(data.targetId) : undefined;
        targetTitle = track?.title || "Unknown song";
        targetOwnerId = track?.userId || "";
      } else if (data.targetType === "album") {
        const album = data.targetId ? albumsById.get(data.targetId) : undefined;
        targetTitle = album?.title || "Unknown album";
        targetOwnerId = album?.userId || "";
      } else if (data.targetType === "comment") {
        const comment = data.targetId ? commentsById.get(data.targetId) : undefined;
        targetTitle = comment?.text || "Unknown comment";
        targetOwnerId = comment?.userId || "";
      }

      const targetOwner = targetOwnerId ? usersById.get(targetOwnerId) : undefined;

      return {
        id: docSnap.id,
        reporterId: data.reporterId || "",
        reporterDisplayName:
          reporter?.displayName || reporter?.username || reporter?.email || data.reporterId || "Unknown reporter",
        reporterUsername: reporter?.username || "",
        reporterEmail: reporter?.email || "",
        targetType: data.targetType || "content",
        targetId: data.targetId || "",
        targetTitle,
        targetOwnerId,
        targetOwnerDisplayName:
          targetOwner?.displayName || targetOwner?.username || targetOwner?.email || targetOwnerId || "Unknown owner",
        reason: data.reason || "No reason provided",
        details: data.details || "",
        status: data.status || "open",
        adminResponse: data.adminResponse || "",
        createdAt: data.createdAt,
        reviewedAt: data.reviewedAt,
      };
    });
  } catch (error) {
    console.log("ADMIN REPORTS FALLBACK:", error);
    return [];
  }
}

export async function isCurrentUserAdmin() {
  try {
    const user = auth.currentUser;

    if (!user) {
      return false;
    }

    const token = await user.getIdTokenResult();

    if (token.claims.admin === true) {
      return true;
    }

    const getCurrentAdminStatus = httpsCallable<
      { idToken: string },
      { admin: boolean; claimSynced?: boolean }
    >(functions, "getCurrentAdminStatus");
    const result = await getCurrentAdminStatus({ idToken: await user.getIdToken() });

    if (result.data.admin === true && result.data.claimSynced === true) {
      await user.getIdToken(true);
    }

    return result.data.admin === true;
  } catch (error) {
    console.log("ADMIN STATUS FALLBACK:", error);
    return false;
  }
}
