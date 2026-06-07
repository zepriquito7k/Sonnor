import {
  addDoc,
  doc,
  collection,
  getDoc,
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
import { defaultAppContent } from "./defaultContent";
import { firestoreCollections } from "./paths";
import type { UserDocument } from "./schema";

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
  return listCollection(firestoreCollections.users, [defaultAppContent.user.displayName]);
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
        displayName: data.displayName || data.username || data.email || "Sem nome",
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
      reject(new Error("Sessao expirada. Faz login outra vez antes de usar o admin."));
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

export function listAdminPosts() {
  return listCollection(
    firestoreCollections.posts,
    defaultAppContent.posts.map((post) => post.caption),
  );
}

export function listAdminReleases() {
  return listCollection(
    firestoreCollections.albums,
    defaultAppContent.releases.map((release) => release.title),
  );
}

export function listAdminVerificationRequests() {
  return listCollection(firestoreCollections.verificationRequests, [
    "No verification requests yet",
  ]);
}

export async function listAdminReports() {
  try {
    const snapshot = await getDocs(
      query(collection(db, firestoreCollections.reports), orderBy("createdAt", "desc"), limit(80)),
    );

    if (snapshot.empty) {
      return ["Sem reports por rever"];
    }

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const reason = typeof data.reason === "string" ? data.reason : "sem motivo";
      const targetType = typeof data.targetType === "string" ? data.targetType : "conteudo";
      const status = typeof data.status === "string" ? data.status : "open";

      return `${status.toUpperCase()} - ${targetType}: ${reason} (${docSnap.id})`;
    });
  } catch (error) {
    console.log("ADMIN REPORTS FALLBACK:", error);
    return ["Sem permissao para ler reports ou nenhuma regra publicada"];
  }
}

export async function isCurrentUserAdmin() {
  const user = auth.currentUser;

  if (!user) {
    return false;
  }

  const token = await user.getIdTokenResult();

  if (token.claims.admin === true) {
    return true;
  }

  const adminsSnapshot = await getDoc(doc(db, "appConfig", "admins"));
  const adminEmails = adminsSnapshot.data()?.adminEmails;

  if (typeof user.email !== "string") {
    return false;
  }

  const email = user.email.toLowerCase();

  return (
    Array.isArray(adminEmails) &&
    adminEmails.some(
      (adminEmail) =>
        typeof adminEmail === "string" &&
        adminEmail.trim().toLowerCase() === email,
    )
  );
}
