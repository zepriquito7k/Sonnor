export type DefaultImageBox = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  description: string;
};

export type DefaultTrack = {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
  durationSeconds: number;
  releaseDate: string;
};

export type DefaultRelease = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  type: "album" | "single" | "ep";
  coverUrl: string;
  heroImageUrl: string;
  releaseDate: string;
  year: number;
};

export type DefaultPost = {
  id: string;
  userId: string;
  artist: string;
  caption: string;
  mediaUrl: string;
  thumbnailUrl: string;
  category: string;
  createdLabel: string;
};

export type DefaultUser = {
  uid: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  backgroundUrl: string | null;
  verified: boolean;
  followersCount: number;
  followingCount: number;
  tracksCount: number;
  albumsCount: number;
  postsCount: number;
};

export const emptyBoxImage =
  "";

export const defaultUser: DefaultUser = {
  uid: "default-user",
  username: "",
  displayName: "Profile",
  bio: "",
  avatarUrl: "",
  bannerUrl: "",
  backgroundUrl: null,
  verified: false,
  followersCount: 0,
  followingCount: 0,
  tracksCount: 0,
  albumsCount: 0,
  postsCount: 0,
};

export const defaultTracks: DefaultTrack[] = [];

export const defaultReleases: DefaultRelease[] = [];

export const defaultPosts: DefaultPost[] = [];

export const defaultHomeBoxes: DefaultImageBox[] = [];

export const defaultLibrarySections = [];

export const defaultAppContent = {
  user: defaultUser,
  tracks: defaultTracks,
  releases: defaultReleases,
  posts: defaultPosts,
  homeBoxes: defaultHomeBoxes,
  librarySections: defaultLibrarySections,
} as const;

