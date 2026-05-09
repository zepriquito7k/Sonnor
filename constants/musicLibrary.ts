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

export const MUSIC_LIBRARY: LibraryRelease[] = [
  {
    slug: "neon-dreams",
    title: "Neon Dreams",
    artist: "Artist Name",
    type: "Album",
    year: 2026,
    cover:
      "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
    heroImage:
      "https://i.pinimg.com/1200x/f4/2f/59/f42f595b9b6b0b9cc8269e4a84364707.jpg",
    releaseDate: "16/04/2026",
    description:
      "Projeto com energia noturna, synth pop cinematografico e uma sequencia de faixas pensada para ouvir do inicio ao fim.",
    tracks: [
      {
        id: "noites-de-neon",
        title: "Noites de Neon",
        duration: "3:24",
        note: "Single principal do projeto",
      },
      {
        id: "velvet-city",
        title: "Velvet City",
        duration: "2:58",
        note: "Faixa com refrrao mais direto",
      },
      {
        id: "afterlight",
        title: "Afterlight",
        duration: "3:11",
        note: "Midtempo com clima mais emotivo",
      },
      {
        id: "midnight-echo",
        title: "Midnight Echo",
        duration: "3:46",
        note: "Ponte mais escura do album",
      },
      {
        id: "chrome-hearts",
        title: "Chrome Hearts",
        duration: "3:05",
        note: "Groove mais club",
      },
      {
        id: "city-bloom",
        title: "City Bloom",
        duration: "2:49",
        note: "Fecho leve e atmosferico",
      },
    ],
  },
  {
    slug: "midnight-avenue",
    title: "Midnight Avenue",
    artist: "Artist Name",
    type: "Album",
    year: 2025,
    cover:
      "https://i.pinimg.com/1200x/6b/87/62/6b8762d66ffc9220294524e16485b4e0.jpg",
    heroImage:
      "https://i.pinimg.com/1200x/8d/dc/29/8ddc29e3bbdadf33fc22ca5ffa23d59d.jpg",
    releaseDate: "08/11/2025",
    description:
      "Album urbano e elegante, com foco em melodias noturnas, baixos limpos e refrões pensados para repeticao.",
    tracks: [
      {
        id: "late-hours",
        title: "Late Hours",
        duration: "3:18",
        note: "Entrada direta e radio friendly",
      },
      {
        id: "electric-sleep",
        title: "Electric Sleep",
        duration: "3:02",
        note: "Faixa com sintetizadores mais frios",
      },
      {
        id: "slow-motion",
        title: "Slow Motion",
        duration: "3:37",
        note: "Clima mais sensual e arrastado",
      },
      {
        id: "street-echo",
        title: "Street Echo",
        duration: "2:54",
        note: "Percussao seca e hook curto",
      },
      {
        id: "night-signal",
        title: "Night Signal",
        duration: "3:21",
        note: "Camadas vocais mais amplas",
      },
      {
        id: "mirror-lane",
        title: "Mirror Lane",
        duration: "4:01",
        note: "Fecho mais aberto e atmosferico",
      },
    ],
  },
  {
    slug: "blue-motel",
    title: "Blue Motel",
    artist: "Artist Name",
    type: "Single",
    year: 2024,
    cover:
      "https://i.pinimg.com/1200x/8f/2a/0b/8f2a0b7b1f8a4d7f1b3c2d9e0f1a2b3c.jpg",
    heroImage:
      "https://i.pinimg.com/1200x/1a/6c/3d/1a6c3d7b8c9d0e1f2a3b4c5d6e7f8a9b.jpg",
    releaseDate: "03/06/2024",
    description:
      "Single de atmosfera fria e imagem limpa, construido para funcionar tanto em playlist quanto em video curto.",
    tracks: [
      {
        id: "blue-motel-track",
        title: "Blue Motel",
        duration: "3:09",
        note: "Versao original",
      },
    ],
  },
  {
    slug: "after-hours-tape",
    title: "After Hours Tape",
    artist: "Artist Name",
    type: "Album",
    year: 2023,
    cover:
      "https://i.pinimg.com/1200x/2f/6b/4c/2f6b4c0e5b92c4f1b85c9b7d1f3c1a0e.jpg",
    heroImage:
      "https://i.pinimg.com/1200x/4e/5f/6a/4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b.jpg",
    releaseDate: "27/10/2023",
    description:
      "Mixtape com textura mais crua, transicoes curtas e um lado mais intimista do artista.",
    tracks: [
      {
        id: "after-hours-intro",
        title: "After Hours Intro",
        duration: "1:28",
        note: "Intro ambiental",
      },
      {
        id: "motel-sign",
        title: "Motel Sign",
        duration: "3:12",
        note: "Faixa com riff repetitivo e marcante",
      },
      {
        id: "neon-drive",
        title: "Neon Drive",
        duration: "2:56",
        note: "Faixa mais veloz do projeto",
      },
      {
        id: "last-call",
        title: "Last Call",
        duration: "3:34",
        note: "Hook mais melancolico",
      },
      {
        id: "empty-boulevard",
        title: "Empty Boulevard",
        duration: "4:02",
        note: "Encerramento mais cinematografico",
      },
    ],
  },
  {
    slug: "velvet-echo",
    title: "Velvet Echo",
    artist: "Artist Name",
    type: "Single",
    year: 2022,
    cover:
      "https://i.pinimg.com/1200x/7c/1f/2d/7c1f2d8b8b4f5d91f0c7c0a9a2b6d7e1.jpg",
    heroImage:
      "https://i.pinimg.com/1200x/7a/5d/2d/7a5d2db7c7a21c7e0f7b41a2d9f0a1b2.jpg",
    releaseDate: "05/01/2022",
    description:
      "Single curto, direto e visualmente forte, pensado para um consumo rapido e repeticao alta.",
    tracks: [
      {
        id: "velvet-echo-track",
        title: "Velvet Echo",
        duration: "2:44",
        note: "Versao original",
      },
    ],
  },
];

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
