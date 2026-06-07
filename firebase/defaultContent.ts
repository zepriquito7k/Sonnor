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
  displayName: "Perfil",
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

export const defaultHomeBoxes: DefaultImageBox[] = [
  {
    id: "continue-listening",
    title: "Continuar",
    subtitle: "Historico",
    imageUrl: "",
    description: "Historico real das musicas reproduzidas.",
  },
  {
    id: "new-releases",
    title: "Lancamentos",
    subtitle: "Firebase tracks/albums",
    imageUrl: "",
    description: "Lancamentos reais publicados na app.",
  },
];

export const defaultLibrarySections = [
  {
    title: "Musicas guardadas",
    description: "Fallback ate existirem likes, playlists e historico no Firebase.",
    items: ["liked tracks", "liked albums", "playlists", "recent plays"],
  },
  {
    title: "Conteudo social",
    description: "Fallback ate existirem posts guardados e follows reais.",
    items: ["saved posts", "followed users", "shared content"],
  },
];

export const defaultAppContent = {
  user: defaultUser,
  tracks: defaultTracks,
  releases: defaultReleases,
  posts: defaultPosts,
  homeBoxes: defaultHomeBoxes,
  librarySections: defaultLibrarySections,
} as const;

