import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";

import { db } from "./dataClient";
import { defaultUser } from "./defaultContent";
import { firestorePaths } from "./paths";

function buildPrivateUsername(uid: string) {
  const suffix = uid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toLowerCase();

  return suffix ? `user_${suffix}` : defaultUser.username;
}

export async function ensureUserProfile(user: User) {
  const userRef = doc(db, firestorePaths.user(user.uid));
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    return;
  }

  await setDoc(userRef, {
    uid: user.uid,
    email: user.email ?? "",
    username: buildPrivateUsername(user.uid),
    displayName: user.displayName ?? defaultUser.displayName,
    bio: "",
    avatarUrl: "",
    bannerUrl: "",
    backgroundUrl: "",
    country: "",
    city: "",
    birthDate: "",
    interests: [],
    profileHiddenFields: [],
    verificationOverride: false,
    verifiedBy: "",
    verifiedReason: "",
    verified: false,
    creatorEnabled: true,
    followersCount: 0,
    followingCount: 0,
    tracksCount: 0,
    albumsCount: 0,
    postsCount: 0,
    likesCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserProfile(
  userId: string,
  values: Partial<{
    username: string;
    displayName: string;
    bio: string;
    avatarUrl: string;
    bannerUrl: string;
    backgroundUrl: string;
    spotifyUrl: string;
    shopUrl: string;
    merchLogoUrl: string;
    merchName: string;
    merchProducts: {
      id: string;
      title: string;
      imageUrl: string;
      linkUrl: string;
      price?: string;
      currency?: string;
      description?: string;
    }[];
    merchGallery: {
      id: string;
      mediaUrl: string;
      mediaType: "image" | "video";
      caption?: string;
    }[];
    country: string;
    city: string;
    birthDate: string;
    interests: string[];
    profileHiddenFields: string[];
  }>,
) {
  await setDoc(doc(db, firestorePaths.user(userId)), {
    ...values,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
