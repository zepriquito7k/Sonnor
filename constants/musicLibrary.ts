export type LibraryReleaseType = "Album" | "Single" | "EP";

export type LibraryTrack = {
  id: string;
  title: string;
  duration: string;
  note?: string;
};

export type LibraryRelease = {
  slug: string;
  title: string;
  artist: string;
  type: LibraryReleaseType;
  year: number;
  cover: string;
  heroImage: string;
  releaseDate: string;
  description: string;
  tracks: LibraryTrack[];
  aliases?: string[];
};

export type LibraryMatch = {
  release: LibraryRelease;
  trackId?: string;
};

type ReleaseOverrides = Partial<{
  title: string;
  artist: string;
  type: LibraryReleaseType;
  year: number;
  cover: string;
  heroImage: string;
  releaseDate: string;
}>;

type ReleaseRouteParams = {
  slug: string;
  trackId?: string;
  title?: string;
  artist?: string;
  type?: LibraryReleaseType;
  year?: string;
  cover?: string;
  heroImage?: string;
  releaseDate?: string;
};

export const MUSIC_LIBRARY: LibraryRelease[] = [];

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function findReleaseBySlug(slug: string | null | undefined) {
  if (!slug) {
    return null;
  }

  const normalizedSlug = normalizeKey(slug);

  return (
    MUSIC_LIBRARY.find((release) => normalizeKey(release.slug) === normalizedSlug) ??
    null
  );
}

export function findMusicMatch(query: string | null | undefined): LibraryMatch | null {
  if (!query) {
    return null;
  }

  const normalizedQuery = normalizeKey(query);

  for (const release of MUSIC_LIBRARY) {
    const releaseNames = [release.title, ...(release.aliases ?? [])];

    if (releaseNames.some((candidate) => normalizeKey(candidate) === normalizedQuery)) {
      return { release };
    }

    const matchedTrack = release.tracks.find(
      (track) => normalizeKey(track.title) === normalizedQuery,
    );

    if (matchedTrack) {
      return {
        release,
        trackId: matchedTrack.id,
      };
    }
  }

  return null;
}

export function buildReleaseRoute(
  match: LibraryMatch,
  overrides: ReleaseOverrides = {},
) {
  const params: ReleaseRouteParams = {
    slug: match.release.slug,
  };

  if (match.trackId) {
    params.trackId = match.trackId;
  }

  if (overrides.title) {
    params.title = overrides.title;
  }

  if (overrides.artist) {
    params.artist = overrides.artist;
  }

  if (overrides.type) {
    params.type = overrides.type;
  }

  if (typeof overrides.year === "number") {
    params.year = String(overrides.year);
  }

  if (overrides.cover) {
    params.cover = overrides.cover;
  }

  if (overrides.heroImage) {
    params.heroImage = overrides.heroImage;
  }

  if (overrides.releaseDate) {
    params.releaseDate = overrides.releaseDate;
  }

  return {
    pathname: "/main/release/[slug]" as const,
    params,
  };
}


