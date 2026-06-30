import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";

import type {
  AlbumDocument,
  CollectionDocument,
  PostDocument,
  TrackDocument,
} from "./schema";
import { db, storage } from "./dataClient";
import { firestoreCollections, firestorePaths } from "./paths";

type CreateTrackInput = Pick<
  TrackDocument,
  | "userId"
  | "sourceSubmissionId"
  | "title"
  | "slug"
  | "audioUrl"
  | "coverUrl"
  | "previewUrl"
  | "shortVideoUrl"
  | "durationSeconds"
  | "featUserIds"
  | "featNames"
  | "genre"
  | "explicit"
  | "lyrics"
  | "releaseDate"
> & {
  albumId?: string;
  status?: TrackDocument["status"];
};

type CreateAlbumInput = Pick<
  AlbumDocument,
  | "userId"
  | "title"
  | "slug"
  | "type"
  | "coverUrl"
  | "backgroundUrl"
  | "releaseDate"
  | "preReleaseEnabled"
  | "preReleaseHighlightUntil"
  | "genres"
  | "explicit"
  | "trackIds"
> & {
  status?: AlbumDocument["status"];
};

type CreatePostInput = Pick<
  PostDocument,
  | "userId"
  | "caption"
  | "mediaType"
  | "mediaUrl"
  | "thumbnailUrl"
  | "linkedTrackId"
  | "linkedTrackShortVideoUrl"
  | "linkedTrackClipStartSeconds"
  | "linkedTrackClipEndSeconds"
  | "linkedAlbumId"
  | "category"
> & {
  status?: PostDocument["status"];
};

type CreateCollectionInput = Pick<
  CollectionDocument,
  "userId" | "name" | "coverUrl" | "description" | "trackIds" | "postIds" | "albumIds" | "isPublic"
>;

export async function createTrack(input: CreateTrackInput) {
  const cleanInput = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );

  const docRef = await addDoc(collection(db, firestoreCollections.tracks), {
    ...cleanInput,
    albumId: input.albumId ?? "",
    sourceSubmissionId: input.sourceSubmissionId ?? "",
    status: input.status ?? "draft",
    featUserIds: input.featUserIds ?? [],
    featNames: input.featNames ?? [],
    likesCount: 0,
    playsCount: 0,
    commentsCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, firestorePaths.track(docRef.id)), { id: docRef.id });

  return docRef.id;
}

export async function updateTrackMedia(
  trackId: string,
  input: Partial<Pick<TrackDocument, "coverUrl" | "shortVideoUrl">>,
) {
  await updateDoc(doc(db, firestorePaths.track(trackId)), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function updateTrackDetails(
  trackId: string,
  input: Partial<Pick<TrackDocument, "explicit" | "featNames" | "featUserIds" | "genre" | "lyrics" | "shortVideoUrl" | "title">>,
) {
  await updateDoc(doc(db, firestorePaths.track(trackId)), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function createAlbum(input: CreateAlbumInput) {
  const docRef = await addDoc(collection(db, firestoreCollections.albums), {
    ...input,
    status: input.status ?? "draft",
    trackIds: input.trackIds ?? [],
    likesCount: 0,
    playsCount: 0,
    commentsCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, firestorePaths.album(docRef.id)), { id: docRef.id });

  return docRef.id;
}

export async function updateAlbumMedia(
  albumId: string,
  input: Partial<Pick<AlbumDocument, "coverUrl" | "backgroundUrl">>,
) {
  await updateDoc(doc(db, firestorePaths.album(albumId)), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function updateAlbumDetails(
  albumId: string,
  input: Partial<Pick<AlbumDocument, "backgroundUrl" | "coverUrl" | "status" | "title" | "trackIds" | "releaseDate" | "preReleaseEnabled" | "preReleaseHighlightUntil">>,
) {
  await updateDoc(doc(db, firestorePaths.album(albumId)), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function createPost(input: CreatePostInput) {
  const docRef = await addDoc(collection(db, firestoreCollections.posts), {
    ...input,
    status: input.status ?? "draft",
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    reportsCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, firestorePaths.post(docRef.id)), { id: docRef.id });

  return docRef.id;
}

export async function updatePostMedia(
  postId: string,
  input: Partial<Pick<PostDocument, "mediaUrl" | "thumbnailUrl" | "mediaScale" | "mediaStageWidth" | "mediaStageHeight" | "overlayMedia" | "linkedTrackId" | "linkedTrackShortVideoUrl" | "linkedTrackClipStartSeconds" | "linkedTrackClipEndSeconds" | "linkedAlbumId">>,
) {
  await updateDoc(doc(db, firestorePaths.post(postId)), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function updatePostDetails(
  postId: string,
  input: Partial<Pick<PostDocument, "caption" | "mediaUrl" | "status">>,
) {
  await updateDoc(doc(db, firestorePaths.post(postId)), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePost(input: {
  postId: string;
  mediaUrls?: string[];
}) {
  const batch = writeBatch(db);
  const [commentsSnapshot, likesSnapshot] = await Promise.all([
    getDocs(
      query(
        collection(db, firestoreCollections.comments),
        where("targetType", "==", "post"),
        where("targetId", "==", input.postId),
      ),
    ),
    getDocs(
      query(
        collection(db, firestoreCollections.likes),
        where("targetType", "==", "post"),
        where("targetId", "==", input.postId),
      ),
    ),
  ]);

  const uniqueUrls = Array.from(
    new Set((input.mediaUrls ?? []).filter((url) => url.trim().length > 0)),
  );

  await Promise.all(
    uniqueUrls.map((url) =>
      deleteObject(ref(storage, url)).catch((error) =>
        console.log("DELETE POST MEDIA ERROR:", error),
      ),
    ),
  );

  commentsSnapshot.docs.forEach((item) => batch.delete(item.ref));
  likesSnapshot.docs.forEach((item) => batch.delete(item.ref));
  batch.delete(doc(db, firestorePaths.post(input.postId)));

  await batch.commit();
}

export async function createCollection(input: CreateCollectionInput) {
  const docRef = await addDoc(collection(db, firestoreCollections.collections), {
    ...input,
    trackIds: input.trackIds ?? [],
    postIds: input.postIds ?? [],
    albumIds: input.albumIds ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, firestorePaths.collection(docRef.id)), {
    id: docRef.id,
  });

  return docRef.id;
}

export async function updateCollectionCover(
  collectionId: string,
  coverUrl: string,
) {
  await updateDoc(doc(db, firestorePaths.collection(collectionId)), {
    coverUrl,
    updatedAt: serverTimestamp(),
  });
}

export async function createRecentPlay(input: {
  userId: string;
  trackId: string;
  albumId?: string;
  listenedMs?: number;
  completed?: boolean;
  source?: "home" | "search" | "profile" | "release" | "library";
}) {
  await addDoc(collection(db, firestoreCollections.recentPlays), {
    userId: input.userId,
    trackId: input.trackId,
    albumId: input.albumId ?? "",
    listenedMs: input.listenedMs ?? 0,
    completed: input.completed ?? false,
    source: input.source ?? "search",
    createdAt: serverTimestamp(),
  });
}
