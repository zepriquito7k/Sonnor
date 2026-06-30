import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  type QueryConstraint,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { db } from "./dataClient";
import { defaultAppContent } from "./defaultContent";
import { functions } from "./config";
import { firestoreCollections } from "./paths";
import { getCallableIdToken } from "./socialClient";
import type {
  AlbumDocument,
  EventBannerDocument,
  LikeDocument,
  PostDocument,
  RecentPlayDocument,
  TrackDocument,
  UserDocument,
} from "./schema";

type WithId<T> = T & { id: string };

type CacheEntry = {
  expiresAt: number;
  promise?: Promise<unknown>;
  value?: unknown;
};

const requestCache = new Map<string, CacheEntry>();
const CONTENT_CACHE_TTL_MS = 30_000;
const DOCUMENT_CACHE_TTL_MS = 60_000;

export async function publishDueReleasesAndRefreshCache(albumId: string) {
  const idToken = await getCallableIdToken();

  await httpsCallable(functions, "publishDueReleasesNow")({ albumId, idToken });
  requestCache.clear();
}

export function clearContentCache() {
  requestCache.clear();
}

export async function getReportableUsers(searchText = "") {
  const users = await readCollectionWithFallback<UserDocument>(
    firestoreCollections.users,
    [],
    {
      limitCount: 240,
      orderField: "updatedAt",
    },
  );
  const queryText = searchText.trim().toLowerCase();

  return users.filter((item) => {
    if (!queryText) {
      return true;
    }

    return `${item.displayName} ${item.username}`
      .toLowerCase()
      .includes(queryText);
  });
}

async function withRequestCache<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs = CONTENT_CACHE_TTL_MS,
): Promise<T> {
  const now = Date.now();
  const cached = requestCache.get(key);

  if (cached?.value !== undefined && cached.expiresAt > now) {
    return cached.value as T;
  }

  if (cached?.promise) {
    return cached.promise as Promise<T>;
  }

  const promise = loader()
    .then((value) => {
      requestCache.set(key, { expiresAt: Date.now() + ttlMs, value });
      return value;
    })
    .catch((error) => {
      requestCache.delete(key);
      throw error;
    });

  requestCache.set(key, { expiresAt: now + ttlMs, promise });
  return promise;
}

async function readDocumentWithCache<T>(collectionName: string, id: string) {
  return withRequestCache(
    `document:${collectionName}:${id}`,
    async () => {
      const snapshot = await getDoc(doc(db, collectionName, id));
      return snapshot.exists()
        ? ({ id: snapshot.id, ...(snapshot.data() as T) } as WithId<T>)
        : null;
    },
    DOCUMENT_CACHE_TTL_MS,
  );
}

function getSortableTime(value: unknown) {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (
    value &&
    typeof value === "object" &&
    "seconds" in value &&
    typeof value.seconds === "number"
  ) {
    return value.seconds * 1000;
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

async function readCollectionWithFallback<T>(
  collectionName: string,
  fallback: WithId<T>[],
  options: {
    limitCount?: number;
    orderField?: string;
    ownerId?: string;
    ownerField?: string;
    publishedOnly?: boolean;
    status?: string;
  } = {},
): Promise<WithId<T>[]> {
  const cacheKey = `collection:${collectionName}:${JSON.stringify(options)}`;

  return withRequestCache(cacheKey, async () => {
    try {
      const constraints: QueryConstraint[] = [];

      if (options.publishedOnly || options.status) {
        constraints.push(where("status", "==", options.status ?? "published"));
      }

      if (options.ownerId) {
        constraints.push(where(options.ownerField ?? "userId", "==", options.ownerId));
      }

      let snapshot;

      if (options.limitCount) {
        try {
          const optimizedConstraints = [...constraints];

          if (options.orderField) {
            optimizedConstraints.push(orderBy(options.orderField, "desc"));
          }
          optimizedConstraints.push(limit(options.limitCount));
          snapshot = await getDocs(
            query(collection(db, collectionName), ...optimizedConstraints),
          );
        } catch {
          snapshot = await getDocs(
            query(collection(db, collectionName), ...constraints),
          );
        }
      } else {
        snapshot = await getDocs(
          query(collection(db, collectionName), ...constraints),
        );
      }

      if (snapshot.empty) {
        return fallback;
      }

      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as T),
      }));

      const sortedDocs = options.orderField
        ? [...docs].sort(
            (left, right) =>
              getSortableTime(right[options.orderField as keyof typeof right]) -
              getSortableTime(left[options.orderField as keyof typeof left]),
          )
        : docs;

      return options.limitCount
        ? sortedDocs.slice(0, options.limitCount)
        : sortedDocs;
    } catch (error) {
      console.log(`FIREBASE FALLBACK ${collectionName}:`, error);
      return fallback;
    }
  });
}

export async function getHomeContent(userId?: string | null) {
  const [
    baseTracks,
    albums,
    posts,
    users,
    recentPlays,
    follows,
    publicConfig,
    eventBanners,
    scheduledPreReleases,
  ] = await Promise.all([
    readCollectionWithFallback<TrackDocument>(
      firestoreCollections.tracks,
      [],
      { limitCount: 12, orderField: "updatedAt", publishedOnly: true },
    ),
    readCollectionWithFallback<AlbumDocument>(
      firestoreCollections.albums,
      [],
      { limitCount: 12, orderField: "updatedAt", publishedOnly: true },
    ),
    readCollectionWithFallback<PostDocument>(
      firestoreCollections.posts,
      [],
      { limitCount: 18, orderField: "createdAt", publishedOnly: true },
    ),
    readCollectionWithFallback<UserDocument>(firestoreCollections.users, [], {
      limitCount: 40,
      orderField: "updatedAt",
    }),
    userId
      ? readCollectionWithFallback<RecentPlayDocument>(
          firestoreCollections.recentPlays,
          [],
          {
            limitCount: 16,
            orderField: "createdAt",
            ownerId: userId,
          },
        )
      : Promise.resolve([]),
    userId
      ? readCollectionWithFallback<{ followerId: string; followingId: string }>(
          firestoreCollections.follows,
          [],
          {
            limitCount: 80,
            orderField: "createdAt",
            ownerField: "followerId",
            ownerId: userId,
          },
        )
      : Promise.resolve([]),
    readDocumentWithCache<Record<string, unknown>>(
      firestoreCollections.appConfig,
      "public",
    ).catch(() => null),
    readCollectionWithFallback<EventBannerDocument>(
      firestoreCollections.eventBanners,
      [],
      { limitCount: 12, orderField: "createdAt", status: "published" },
    ),
    readCollectionWithFallback<AlbumDocument>(
      firestoreCollections.albums,
      [],
      { limitCount: 8, orderField: "releaseDate", status: "scheduled" },
    ).then((items) =>
      items.filter(
        (item) =>
          item.status === "scheduled" &&
          item.preReleaseEnabled === true,
      ),
    ),
  ]);
  const now = Date.now();
  const trackMap = new Map(baseTracks.map((track) => [track.id, track]));
  const linkedTrackIds = posts
    .map((post) =>
      "linkedTrackId" in post && typeof post.linkedTrackId === "string"
        ? post.linkedTrackId
        : "",
    )
    .filter((trackId) => trackId && !trackMap.has(trackId));

  await Promise.all(
    linkedTrackIds.map(async (trackId) => {
      const track = await readDocumentWithCache<TrackDocument>(
        firestoreCollections.tracks,
        trackId,
      );

      if (track) {
        trackMap.set(trackId, track);
      }
    }),
  );

  const followedIds = new Set(
    follows
      .filter((follow) => follow.followerId === userId)
      .map((follow) => follow.followingId),
  );
  const activeEventBanners = eventBanners.filter((banner) => {
    if (banner.status !== "published" || getSortableTime(banner.expiresAt) <= now) {
      return false;
    }

    if (banner.visibility !== "followers") {
      return true;
    }

    return Boolean(userId) && (banner.userId === userId || followedIds.has(banner.userId || ""));
  });
  const visiblePreReleases = scheduledPreReleases.filter(
    (release) =>
      Boolean(userId) &&
      (release.userId === userId || followedIds.has(release.userId)),
  );

  return {
    tracks: Array.from(trackMap.values()),
    albums,
    posts,
    users,
    recentPlays,
    follows: follows.filter((follow) => follow.followerId === userId),
    publicConfig,
    eventBanners: activeEventBanners,
    upcomingReleases: visiblePreReleases,
    boxes: [],
  };
}

export async function getRecommendedTracks(
  preferredGenre?: string,
  excludedIds: string[] = [],
) {
  const tracks = await readCollectionWithFallback<TrackDocument>(
    firestoreCollections.tracks,
    [],
    { limitCount: 60, orderField: "updatedAt", publishedOnly: true },
  );
  const excluded = new Set(excludedIds);
  const available = tracks.filter(
    (track) => Boolean(track.audioUrl?.trim()) && !excluded.has(track.id),
  );
  const shuffle = <T,>(items: T[]) =>
    [...items].sort(() => Math.random() - 0.5);
  const normalizedGenre = preferredGenre?.trim().toLowerCase();
  const preferred = normalizedGenre
    ? shuffle(
        available.filter(
          (track) => track.genre?.trim().toLowerCase() === normalizedGenre,
        ),
      )
    : [];
  const preferredIds = new Set(preferred.map((track) => track.id));
  const others = shuffle(
    available.filter((track) => !preferredIds.has(track.id)),
  );

  const recommendations = [...preferred.slice(0, 7), ...others.slice(0, 3)];
  const artistIds = Array.from(new Set(recommendations.map((track) => track.userId).filter(Boolean)));
  const artistEntries = await Promise.all(
    artistIds.map(async (artistId) => {
      const data = await readDocumentWithCache<UserDocument>(
        firestoreCollections.users,
        artistId,
      ).catch(() => null);
      return [
        artistId,
        data?.displayName || data?.username || "Artist",
      ] as const;
    }),
  );
  const artistById = new Map(artistEntries);

  return recommendations.map((track) => ({
    ...track,
    artistName: artistById.get(track.userId) || "Artist",
  }));
}

export async function getAlbumContent(albumId: string) {
  const cachedAlbum = await readDocumentWithCache<AlbumDocument>(
    firestoreCollections.albums,
    albumId,
  );

  if (!cachedAlbum) {
    return null;
  }

  const album = cachedAlbum;
  const trackIds = Array.isArray(album.trackIds) ? album.trackIds : [];
  const tracksByAlbum = await readCollectionWithFallback<TrackDocument>(
    firestoreCollections.tracks,
    [],
    { ownerField: "albumId", ownerId: albumId },
  );
  const trackMap = new Map<string, WithId<TrackDocument>>();

  tracksByAlbum.forEach((trackDoc) => {
    trackMap.set(trackDoc.id, trackDoc);
  });

  await Promise.all(
    trackIds
      .filter((trackId) => !trackMap.has(trackId))
      .map(async (trackId) => {
        const track = await readDocumentWithCache<TrackDocument>(
          firestoreCollections.tracks,
          trackId,
        );

        if (track) {
          trackMap.set(trackId, track);
        }
      }),
  );

  const tracks = trackIds.length
    ? trackIds.map((trackId) => trackMap.get(trackId)).filter(Boolean)
    : Array.from(trackMap.values());
  const user = album.userId
    ? await readDocumentWithCache<UserDocument>(firestoreCollections.users, album.userId)
    : null;

  return {
    album,
    tracks: tracks as WithId<TrackDocument>[],
    user,
  };
}

export async function getTrackContext(trackId: string, albumId?: string) {
  const track = await readDocumentWithCache<TrackDocument>(
    firestoreCollections.tracks,
    trackId,
  );
  const resolvedAlbumId = albumId || track?.albumId;
  const album = resolvedAlbumId
    ? await readDocumentWithCache<AlbumDocument>(
        firestoreCollections.albums,
        resolvedAlbumId,
      )
    : null;
  const artistId = track?.userId || album?.userId;
  const artist = artistId
    ? await readDocumentWithCache<UserDocument>(
        firestoreCollections.users,
        artistId,
      )
    : null;
  const collaboratorIds = Array.isArray(track?.featUserIds)
    ? track.featUserIds.filter(Boolean)
    : [];
  const collaborators = collaboratorIds.length
    ? (
        await Promise.all(
          collaboratorIds.map((userId) =>
            readDocumentWithCache<UserDocument>(
              firestoreCollections.users,
              userId,
            ).catch(() => null),
          ),
        )
      ).filter((item): item is WithId<UserDocument> => Boolean(item))
    : [];

  return { album, artist, collaborators, track };
}

export async function canPlayAlbumTrack(albumId?: string) {
  if (!albumId) {
    return true;
  }

  const album = await readDocumentWithCache<AlbumDocument>(
    firestoreCollections.albums,
    albumId,
  );

  if (!album || album.status !== "scheduled") {
    return true;
  }

  return getSortableTime(album.releaseDate) <= Date.now();
}

export async function getSearchableUsers() {
  return readCollectionWithFallback<UserDocument>(
    firestoreCollections.users,
    [],
    { limitCount: 50 },
  );
}

export async function getLibraryContent(userId?: string | null) {
  if (!userId) {
    return {
      sections: [],
      tracks: [] as WithId<TrackDocument>[],
      albums: [] as WithId<AlbumDocument>[],
      posts: [] as WithId<PostDocument>[],
      recentPlays: [],
      playlists: [],
    };
  }

  const [recentPlays, playlists, userSnapshot, likedTrackRefs] = await Promise.all([
    readCollectionWithFallback<{ trackId?: string }>(
      firestoreCollections.recentPlays,
      [],
      {
        limitCount: 20,
        orderField: "createdAt",
        ownerId: userId,
      },
    ),
    readCollectionWithFallback(firestoreCollections.playlists, [], {
      limitCount: 20,
      orderField: "updatedAt",
      ownerId: userId,
    }),
    readDocumentWithCache<UserDocument>(firestoreCollections.users, userId),
    readCollectionWithFallback<LikeDocument>(
      firestoreCollections.likes,
      [],
      {
        limitCount: 80,
        orderField: "createdAt",
        ownerId: userId,
      },
    ),
  ]);
  const userData = (userSnapshot ?? {}) as UserDocument & {
    settings?: Record<string, unknown>;
  };
  const settings =
    userData.settings && typeof userData.settings === "object"
      ? (userData.settings as Record<string, unknown>)
      : {};
  const library =
    settings.library && typeof settings.library === "object"
      ? (settings.library as Record<string, unknown>)
      : {};
  const savedAlbumIds = Array.isArray(library.savedAlbumIds)
    ? library.savedAlbumIds.filter((item): item is string => typeof item === "string")
    : [];
  const savedAlbums = (
    await Promise.all(
      savedAlbumIds.map(async (albumId) => {
        return readDocumentWithCache<AlbumDocument>(
          firestoreCollections.albums,
          albumId,
        );
      }),
    )
  ).filter((item): item is WithId<AlbumDocument> => Boolean(item));
  const likedTrackIds = likedTrackRefs
    .filter((like) => like.targetType === "track" && typeof like.targetId === "string")
    .map((like) => like.targetId);
  const likedTracks = (
    await Promise.all(
      Array.from(new Set(likedTrackIds)).map(async (trackId) =>
        readDocumentWithCache<TrackDocument>(
          firestoreCollections.tracks,
          trackId,
        ),
      ),
    )
  ).filter((item): item is WithId<TrackDocument> => Boolean(item));
  const likedArtistIds = Array.from(
    new Set(likedTracks.map((track) => track.userId).filter(Boolean)),
  );
  const likedArtistEntries = await Promise.all(
    likedArtistIds.map(async (artistId) => {
      const artistProfile = await readDocumentWithCache<UserDocument>(
        firestoreCollections.users,
        artistId,
      ).catch(() => null);

      return [
        artistId,
        artistProfile?.displayName || artistProfile?.username || "Artist",
      ] as const;
    }),
  );
  const likedArtistById = new Map(likedArtistEntries);
  const likedTracksWithArtists = likedTracks.map((track) => ({
    ...track,
    artistName: likedArtistById.get(track.userId) || "Artist",
  }));

  return {
    sections: [],
    tracks: likedTracksWithArtists,
    albums: savedAlbums,
    posts: [] as WithId<PostDocument>[],
    recentPlays,
    playlists,
  };
}

export async function getProfileContent(userId?: string | null) {
  if (!userId) {
    return {
      user: defaultAppContent.user,
      tracks: [],
      albums: [],
      posts: [],
    };
  }

  const [userSnapshot, tracks, publishedAlbums, scheduledAlbums, posts] = await Promise.all([
    readDocumentWithCache<UserDocument>(firestoreCollections.users, userId),
    readCollectionWithFallback<TrackDocument>(firestoreCollections.tracks, [], {
      limitCount: 30,
      orderField: "createdAt",
      ownerId: userId,
      publishedOnly: true,
    }),
    readCollectionWithFallback<AlbumDocument>(firestoreCollections.albums, [], {
      limitCount: 30,
      orderField: "createdAt",
      ownerId: userId,
      publishedOnly: true,
    }),
    readCollectionWithFallback<AlbumDocument>(firestoreCollections.albums, [], {
      limitCount: 10,
      orderField: "releaseDate",
      ownerId: userId,
      status: "scheduled",
    }),
    readCollectionWithFallback<PostDocument>(firestoreCollections.posts, [], {
      limitCount: 30,
      orderField: "createdAt",
      ownerId: userId,
      publishedOnly: true,
    }),
  ]);

  return {
    user: userSnapshot ?? defaultAppContent.user,
    tracks,
    albums: Array.from(
      new Map([...scheduledAlbums, ...publishedAlbums].map((album) => [album.id, album])).values(),
    ),
    posts,
  };
}
