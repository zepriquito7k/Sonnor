export const firestoreCollections = {
  users: "users",
  albums: "albums",
  tracks: "tracks",
  musicSubmissions: "musicSubmissions",
  posts: "posts",
  comments: "comments",
  likes: "likes",
  follows: "follows",
  playlists: "playlists",
  collections: "collections",
  recentPlays: "recentPlays",
  notifications: "notifications",
  releaseReminders: "releaseReminders",
  messageThreads: "messageThreads",
  messages: "messages",
  reports: "reports",
  adminDeletionRequests: "adminDeletionRequests",
  eventBanners: "eventBanners",
  eventRequests: "eventRequests",
  profileRequests: "profileRequests",
  verificationRequests: "verificationRequests",
  appConfig: "appConfig",
} as const;

export const firestorePaths = {
  user: (userId: string) => `users/${userId}`,
  album: (albumId: string) => `albums/${albumId}`,
  track: (trackId: string) => `tracks/${trackId}`,
  musicSubmission: (submissionId: string) => `musicSubmissions/${submissionId}`,
  post: (postId: string) => `posts/${postId}`,
  comment: (commentId: string) => `comments/${commentId}`,
  like: (likeId: string) => `likes/${likeId}`,
  follow: (followId: string) => `follows/${followId}`,
  playlist: (playlistId: string) => `playlists/${playlistId}`,
  collection: (collectionId: string) => `collections/${collectionId}`,
  recentPlay: (playId: string) => `recentPlays/${playId}`,
  notification: (notificationId: string) => `notifications/${notificationId}`,
  releaseReminder: (reminderId: string) => `releaseReminders/${reminderId}`,
  messageThread: (threadId: string) => `messageThreads/${threadId}`,
  message: (messageId: string) => `messages/${messageId}`,
  report: (reportId: string) => `reports/${reportId}`,
  eventBanner: (bannerId: string) => `eventBanners/${bannerId}`,
  eventRequest: (requestId: string) => `eventRequests/${requestId}`,
  profileRequest: (requestId: string) => `profileRequests/${requestId}`,
  verificationRequest: (requestId: string) =>
    `verificationRequests/${requestId}`,
  publicConfig: () => "appConfig/public",
} as const;

export const storagePaths = {
  userAvatar: (userId: string, extension = "jpg") =>
    `users/${userId}/avatar/avatar.${extension}`,
  userBanner: (userId: string) => `users/${userId}/banner/banner.jpg`,
  userBackground: (userId: string) =>
    `users/${userId}/background/background.jpg`,
  albumCover: (albumId: string) => `albums/${albumId}/cover.jpg`,
  albumBackground: (albumId: string) => `albums/${albumId}/background.jpg`,
  trackCover: (trackId: string) => `tracks/${trackId}/cover.jpg`,
  trackAudio: (trackId: string) => `tracks/${trackId}/audio.mp3`,
  trackPreview: (trackId: string) => `tracks/${trackId}/preview.mp3`,
  trackShortVideo: (trackId: string) => `tracks/${trackId}/short-video.mp4`,
  submissionAudio: (submissionId: string) =>
    `musicSubmissions/${submissionId}/source.mp3`,
  postMedia: (postId: string, extension: string) =>
    `posts/${postId}/media.${extension}`,
  postOverlayMedia: (postId: string, overlayId: string, extension: string) =>
    `posts/${postId}/overlays/${overlayId}.${extension}`,
  postThumbnail: (postId: string) => `posts/${postId}/thumbnail.jpg`,
  eventBanner: (eventId: string, extension = "jpg") =>
    `events/${eventId}/banner.${extension}`,
  collectionCover: (collectionId: string) =>
    `collections/${collectionId}/cover.jpg`,
  messageMedia: (threadId: string, messageId: string, extension: string) =>
    `messages/${threadId}/${messageId}/media.${extension}`,
  tempUpload: (userId: string, uploadId: string) =>
    `tempUploads/${userId}/${uploadId}`,
} as const;
