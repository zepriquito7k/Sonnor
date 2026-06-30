export type ContentStatus = "draft" | "scheduled" | "published" | "hidden" | "removed";
export type ReleaseType = "album" | "single" | "ep";
export type MediaType = "image" | "video";
export type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "new_release"
  | "mention"
  | "admin_update"
  | "system";
export type ReportStatus = "open" | "reviewed" | "dismissed" | "action_taken";
export type EventRequestStatus = "pending" | "approved" | "rejected";
export type VerificationStatus = "pending" | "approved" | "rejected";
export type MusicSubmissionStatus =
  | "uploaded"
  | "fingerprint_queued"
  | "manual_review"
  | "approved"
  | "rejected"
  | "completed"
  | "cancelled";
export type MusicRightsRisk = "unknown" | "low" | "medium" | "high";

export type FirestoreDate = Date | { seconds: number; nanoseconds: number };

export type UserDocument = {
  uid: string;
  email?: string;
  username: string;
  displayName: string;
  bio?: string;
    avatarUrl?: string;
    avatarFallbackColor?: string;
    bannerUrl?: string;
  backgroundUrl?: string;
  spotifyUrl?: string;
  shopUrl?: string;
  merchLogoUrl?: string;
  merchName?: string;
  merchProducts?: {
    id: string;
    title: string;
    imageUrl: string;
    linkUrl: string;
    price?: string;
    currency?: string;
    description?: string;
  }[];
  merchGallery?: {
    id: string;
    mediaUrl: string;
    mediaType: MediaType;
    caption?: string;
  }[];
  country?: string;
  city?: string;
  birthDate?: string;
  interests?: string[];
  profileHiddenFields?: string[];
  verificationOverride?: boolean;
  verifiedBy?: "automatic" | "admin" | "";
  verifiedReason?: string;
  verified: boolean;
  creatorEnabled: boolean;
  followersCount: number;
  followingCount: number;
  tracksCount: number;
  albumsCount: number;
  postsCount: number;
  likesCount: number;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
};

export type AlbumDocument = {
  id: string;
  userId: string;
  title: string;
  slug: string;
  type: ReleaseType;
  coverUrl?: string;
  backgroundUrl?: string;
  releaseDate?: FirestoreDate;
  preReleaseEnabled?: boolean;
  preReleaseHighlightUntil?: FirestoreDate;
  genres: string[];
  explicit: boolean;
  status: ContentStatus;
  trackIds: string[];
  likesCount: number;
  playsCount: number;
  commentsCount: number;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
};

export type TrackDocument = {
  id: string;
  userId: string;
  albumId?: string;
  sourceSubmissionId?: string;
  title: string;
  slug: string;
  coverUrl?: string;
  audioUrl: string;
  previewUrl?: string;
  shortVideoUrl?: string;
  durationSeconds?: number;
  featUserIds: string[];
  featNames: string[];
  genre?: string;
  explicit: boolean;
  lyrics?: string;
  status: ContentStatus;
  releaseDate?: FirestoreDate;
  likesCount: number;
  playsCount: number;
  commentsCount: number;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
};

export type MusicSubmissionDocument = {
  id: string;
  userId: string;
  originalFileName?: string;
  audioUrl: string;
  audioPath: string;
  mimeType: "audio/mpeg";
  fileExtension: "mp3";
  fileSizeBytes?: number;
  declaredTitle?: string;
  reviewBatchId?: string;
  reviewBatchTitle?: string;
  reviewBatchTrackCount?: number;
  reviewBatchIndex?: number;
  reviewBatchReleaseType?: ReleaseType;
  reviewBatchAllowed?: boolean;
  requestedPreReleaseEnabled?: boolean;
  requestedPreReleaseDelaySeconds?: number;
  ownershipStatement: string;
  contributorsText?: string;
  rightsNotes?: string;
  status: MusicSubmissionStatus;
  fingerprint: {
    provider: "pending" | "manual" | "acrcloud" | "audd" | "custom";
    status: "queued" | "matched" | "no_match" | "failed" | "not_configured";
    matchTitle?: string;
    matchArtist?: string;
    confidence?: number;
    checkedAt?: FirestoreDate;
  };
  rightsReview: {
    risk: MusicRightsRisk;
    reviewerId?: string;
    decision?: "approved" | "rejected";
    note?: string;
    reviewedAt?: FirestoreDate;
  };
  completionLinkId?: string;
  completedTrackId?: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
};


export type PostDocument = {
  id: string;
  userId: string;
  caption: string;
  mediaType: MediaType;
  mediaUrl: string;
  thumbnailUrl?: string;
  mediaScale?: number;
  mediaStageWidth?: number;
  mediaStageHeight?: number;
  overlayMedia?: {
    id: string;
    mediaUrl: string;
    mediaType: "image";
    x: number;
    y: number;
    scale: number;
    baseWidth: number;
    baseHeight: number;
    stageWidth: number;
    stageHeight: number;
  }[];
  linkedTrackId?: string;
  linkedTrackShortVideoUrl?: string;
  linkedTrackClipStartSeconds?: number;
  linkedTrackClipEndSeconds?: number;
  linkedAlbumId?: string;
  category?: string;
  status: ContentStatus;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  reportsCount: number;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
};

export type CommentDocument = {
  id: string;
  targetType: "post" | "track" | "album";
  targetId: string;
  userId: string;
  text: string;
  likesCount: number;
  createdAt: FirestoreDate;
  removedAt?: FirestoreDate;
};

export type LikeDocument = {
  id: string;
  userId: string;
  targetType: "post" | "track" | "album" | "comment";
  targetId: string;
  createdAt: FirestoreDate;
};

export type FollowDocument = {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: FirestoreDate;
};

export type PlaylistDocument = {
  id: string;
  userId: string;
  name: string;
  coverUrl?: string;
  isPublic: boolean;
  trackIds: string[];
  tracksCount: number;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
};

export type CollectionDocument = {
  id: string;
  userId: string;
  name: string;
  coverUrl?: string;
  description?: string;
  trackIds: string[];
  postIds: string[];
  albumIds: string[];
  isPublic: boolean;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
};

export type RecentPlayDocument = {
  id: string;
  userId: string;
  trackId: string;
  albumId?: string;
  listenedMs: number;
  completed: boolean;
  source: "home" | "search" | "profile" | "release" | "library";
  createdAt: FirestoreDate;
};

export type NotificationDocument = {
  id: string;
  userId: string;
  type: NotificationType;
  fromUserId?: string;
  targetType?: "post" | "track" | "album" | "comment" | "user";
  targetId?: string;
  title?: string;
  body?: string;
  read: boolean;
  createdAt: FirestoreDate;
};

export type MessageThreadDocument = {
  id: string;
  participantIds: string[];
  lastMessageText?: string;
  lastMessageAt?: FirestoreDate;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
};

export type MessageDocument = {
  id: string;
  threadId: string;
  senderId: string;
  text?: string;
  sharedTrackId?: string;
  sharedPostId?: string;
  mediaUrl?: string;
  readBy: string[];
  createdAt: FirestoreDate;
};

export type ReportDocument = {
  id: string;
  reporterId: string;
  targetType: "user" | "post" | "track" | "album" | "comment";
  targetId: string;
  reason: string;
  details?: string;
  adminResponse?: string;
  status: ReportStatus;
  createdAt: FirestoreDate;
  reviewedAt?: FirestoreDate;
  reviewedBy?: string;
};

export type EventRequestDocument = {
  id: string;
  userId: string;
  title: string;
  details: string;
  linkUrl: string;
  imageUrl: string;
  mediaType?: MediaType;
  status: EventRequestStatus;
  adminName?: string;
  rejectionReason?: string;
  approvedBannerId?: string;
  createdAt: FirestoreDate;
  reviewedAt?: FirestoreDate;
  updatedAt: FirestoreDate;
};

export type EventBannerDocument = {
  id: string;
  requestId?: string;
  userId?: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  mediaType?: MediaType;
  linkUrl: string;
  visibility?: "public" | "followers";
  status: "published" | "expired" | "removed";
  startsAt: FirestoreDate;
  expiresAt: FirestoreDate;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
};

export type VerificationRequestDocument = {
  id: string;
  userId: string;
  legalName?: string;
  proofLinks: string[];
  message?: string;
  status: VerificationStatus;
  createdAt: FirestoreDate;
  reviewedAt?: FirestoreDate;
  reviewedBy?: string;
};

export type AppConfigDocument = {
  maintenanceMode: boolean;
  featuredAlbumIds: string[];
  featuredTrackIds: string[];
  featuredPostIds: string[];
  featuredUserIds: string[];
  categories: string[];
  updatedAt: FirestoreDate;
};
