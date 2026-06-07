import { firestoreCollections, storagePaths } from "./paths";

export const firestoreBlueprint = {
  auth: {
    owner: "Firebase Authentication",
    fields: ["uid", "email", "emailVerified", "provider", "createdAt", "lastLoginAt"],
    note: "Passwords stay managed by Firebase Auth and are never stored in Firestore.",
  },
  collections: firestoreCollections,
  requiredCounters: [
    "users.followersCount",
    "users.followingCount",
    "users.tracksCount",
    "users.albumsCount",
    "users.postsCount",
    "albums.likesCount",
    "albums.playsCount",
    "tracks.likesCount",
    "tracks.playsCount",
    "posts.likesCount",
    "posts.commentsCount",
  ],
  cloudFunctionsLater: [
    "onUserCreated",
    "onLikeCreated",
    "onLikeDeleted",
    "onFollowCreated",
    "onFollowDeleted",
    "onTrackCreated",
    "onAlbumCreated",
    "onPostCreated",
    "onReportCreated",
    "runMusicFingerprintCheck",
    "processUploadedAudio",
    "processUploadedVideo",
  ],
} as const;

export const storageBlueprint = {
  roots: ["users", "albums", "tracks", "posts", "collections", "messages", "tempUploads"],
  paths: storagePaths,
} as const;
