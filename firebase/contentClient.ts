import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  type QueryConstraint,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { db } from "./dataClient";
import { defaultAppContent } from "./defaultContent";
import { functions } from "./config";
import { firestoreCollections } from "./paths";
import type {
  AlbumDocument,
  PostDocument,
  RecentPlayDocument,
  TrackDocument,
  UserDocument,
} from "./schema";

type WithId<T> = T & { id: string };

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
    publishedOnly?: boolean;
    status?: string;
  } = {},
): Promise<WithId<T>[]> {
  try {
    const constraints: QueryConstraint[] = [];

    if (options.publishedOnly || options.status) {
      constraints.push(where("status", "==", options.status ?? "published"));
    }

    if (options.ownerId) {
      constraints.push(where("userId", "==", options.ownerId));
    }

    const snapshot = await getDocs(
      query(collection(db, collectionName), ...constraints),
    );

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
}

export async function getHomeContent(userId?: string | null) {
  if (userId) {
    await httpsCallable(functions, "publishDueReleasesNow")({}).catch(() => null);
  }

  const [
    baseTracks,
    albums,
    posts,
    users,
    recentPlays,
    follows,
    publicConfig,
    scheduledPreReleases,
    publishedPreReleases,
  ] = await Promise.all([
    readCollectionWithFallback<TrackDocument>(
      firestoreCollections.tracks,
      [],
      { limitCount: 12, orderField: "updatedAt", publishedOnly: true },
    ),
    readCollectionWithFallback(
      firestoreCollections.albums,
      defaultAppContent.releases,
      { limitCount: 12, orderField: "updatedAt", publishedOnly: true },
    ),
    readCollectionWithFallback(
      firestoreCollections.posts,
      defaultAppContent.posts,
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
          },
        )
      : Promise.resolve([]),
    getDoc(doc(db, firestoreCollections.appConfig, "public")).catch(() => null),
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
    readCollectionWithFallback<AlbumDocument>(
      firestoreCollections.albums,
      [],
      { limitCount: 20, orderField: "updatedAt", status: "published" },
    ).then((items) =>
      items.filter(
        (item) =>
          getSortableTime(item.preReleaseHighlightUntil) > Date.now(),
      ),
    ),
  ]);
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
      const snapshot = await getDoc(doc(db, firestoreCollections.tracks, trackId));

      if (snapshot.exists()) {
        const data = snapshot.data() as TrackDocument;

        trackMap.set(trackId, { ...data, id: snapshot.id });
      }
    }),
  );

  const followedIds = new Set(
    follows
      .filter((follow) => follow.followerId === userId)
      .map((follow) => follow.followingId),
  );
  const visiblePreReleases = [...scheduledPreReleases, ...publishedPreReleases].filter(
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
    publicConfig: publicConfig?.exists() ? publicConfig.data() : null,
    upcomingReleases: visiblePreReleases,
    boxes: defaultAppContent.homeBoxes,
  };
}

export async function getRecommendedTracks(
  preferredGenre?: string,
  excludedIds: string[] = [],
) {
  const tracks = await readCollectionWithFallback<TrackDocument>(
    firestoreCollections.tracks,
    [],
    { publishedOnly: true },
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
      const snapshot = await getDoc(doc(db, firestoreCollections.users, artistId)).catch(() => null);
      const data = snapshot?.exists() ? snapshot.data() as UserDocument : null;
      return [
        artistId,
        data?.displayName || data?.username || "Artista",
      ] as const;
    }),
  );
  const artistById = new Map(artistEntries);

  return recommendations.map((track) => ({
    ...track,
    artistName: artistById.get(track.userId) || "Artista",
  }));
}

export async function getAlbumContent(albumId: string) {
  const albumSnapshot = await getDoc(doc(db, firestoreCollections.albums, albumId));

  if (!albumSnapshot.exists()) {
    return null;
  }

  const album = { ...(albumSnapshot.data() as AlbumDocument), id: albumSnapshot.id };
  const trackIds = Array.isArray(album.trackIds) ? album.trackIds : [];
  const tracksByAlbum = await getDocs(
    query(collection(db, firestoreCollections.tracks), where("albumId", "==", albumId)),
  );
  const trackMap = new Map<string, WithId<TrackDocument>>();

  tracksByAlbum.docs.forEach((trackDoc) => {
    trackMap.set(trackDoc.id, {
      ...(trackDoc.data() as TrackDocument),
      id: trackDoc.id,
    });
  });

  await Promise.all(
    trackIds
      .filter((trackId) => !trackMap.has(trackId))
      .map(async (trackId) => {
        const trackSnapshot = await getDoc(doc(db, firestoreCollections.tracks, trackId));

        if (trackSnapshot.exists()) {
          trackMap.set(trackId, {
            ...(trackSnapshot.data() as TrackDocument),
            id: trackSnapshot.id,
          });
        }
      }),
  );

  const tracks = trackIds.length
    ? trackIds.map((trackId) => trackMap.get(trackId)).filter(Boolean)
    : Array.from(trackMap.values());
  const userSnapshot = album.userId
    ? await getDoc(doc(db, firestoreCollections.users, album.userId))
    : null;

  return {
    album,
    tracks: tracks as WithId<TrackDocument>[],
    user: userSnapshot?.exists()
      ? ({ ...(userSnapshot.data() as UserDocument), id: userSnapshot.id } as WithId<UserDocument>)
      : null,
  };
}

export async function getSearchableUsers() {
  try {
    const snapshot = await getDocs(
      query(collection(db, firestoreCollections.users), limit(50)),
    );

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as UserDocument),
    }));
  } catch (error) {
    console.log("FIREBASE FALLBACK users:", error);
    return [];
  }
}

export async function getLibraryContent(userId?: string | null) {
  if (!userId) {
    return {
      sections: defaultAppContent.librarySections,
      tracks: [] as WithId<TrackDocument>[],
      albums: [] as WithId<AlbumDocument>[],
      posts: [] as WithId<PostDocument>[],
      recentPlays: [],
      playlists: [],
    };
  }

  const [recentPlays, playlists, userSnapshot] = await Promise.all([
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
    getDoc(doc(db, firestoreCollections.users, userId)),
  ]);
  const userData = userSnapshot.exists() ? userSnapshot.data() : {};
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
        const snapshot = await getDoc(doc(db, firestoreCollections.albums, albumId));
        return snapshot.exists()
          ? ({ ...(snapshot.data() as AlbumDocument), id: snapshot.id } as WithId<AlbumDocument>)
          : null;
      }),
    )
  ).filter((item): item is WithId<AlbumDocument> => Boolean(item));
  const recentPlayItems = await Promise.all(
    recentPlays.slice(0, 10).map(async (play) => {
      const trackId =
        "trackId" in play && typeof play.trackId === "string"
          ? play.trackId
          : "";

      if (!trackId) {
        return null;
      }

      try {
        const trackSnapshot = await getDoc(
          doc(db, firestoreCollections.tracks, trackId),
        );

        if (!trackSnapshot.exists()) {
          return trackId;
        }

        const track = trackSnapshot.data();
        const title =
          "title" in track && typeof track.title === "string"
            ? track.title
            : trackId;

        return title;
      } catch (error) {
        console.log("FIREBASE RECENT TRACK FALLBACK:", error);
        return trackId;
      }
    }),
  );
  const historyItems = recentPlayItems.filter(
    (item: string | null): item is string =>
      typeof item === "string" && item.length > 0,
  );

  return {
    sections:
      historyItems.length > 0
        ? [
            {
              title: "Historico",
              description: "Musicas que reproduziste recentemente.",
              items: historyItems,
            },
            ...defaultAppContent.librarySections,
          ]
        : defaultAppContent.librarySections,
    tracks: [] as WithId<TrackDocument>[],
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

  if (userId) {
    await httpsCallable(functions, "publishDueReleasesNow")({}).catch(() => null);
  }

  const [userSnapshot, tracks, publishedAlbums, scheduledAlbums, posts] = await Promise.all([
    getDoc(doc(db, firestoreCollections.users, userId)),
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
    user: userSnapshot.exists()
      ? ({ id: userSnapshot.id, ...userSnapshot.data() } as WithId<UserDocument>)
      : defaultAppContent.user,
    tracks,
    albums: Array.from(
      new Map([...scheduledAlbums, ...publishedAlbums].map((album) => [album.id, album])).values(),
    ),
    posts,
  };
}
