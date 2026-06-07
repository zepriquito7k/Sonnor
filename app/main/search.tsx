import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { doc, getDoc } from "firebase/firestore";

import { buildReleaseRoute, findMusicMatch } from "../../constants/musicLibrary";
import { usePlayer, type Track } from "../../context/PlayerContext";
import { getHomeContent, getSearchableUsers } from "../../firebase/contentClient";
import { deletePost } from "../../firebase/contentMutations";
import { defaultUser } from "../../firebase/defaultContent";
import { db } from "../../firebase/dataClient";
import { updateSearchHistory } from "../../firebase/settingsClient";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useResponsive } from "../../utils/responsive";

type ResultItem = {
  id: number | string;
  trackId?: string;
  type: "music" | "artist" | "brand";
  title: string;
  subtitle: string;
  cover: string;
  audioUrl?: string;
  albumId?: string;
  queueTracks?: Track[];
  lyrics?: string;
  profileUserId?: string;
  verified?: boolean;
  followersCount?: number;
  relatedTrackTitles?: string[];
  genres?: string[];
};

type CategoryItem = {
  id: number;
  title: string;
  cover: string;
  isAll?: boolean;
};

type PostItem = {
  id: string;
  ownerId: string;
  artist: string;
  caption: string;
  image: string;
  mediaScale: number;
  category: string;
  likesLabel: string;
  type?: "image" | "video";
  avatar?: string;
  mediaUrls: string[];
  overlayMedia: SearchOverlayItem[];
  musicName?: string;
  musicCover?: string;
};

type SearchOverlayItem = {
  id: string;
  mediaUrl: string;
  x: number;
  y: number;
  scale: number;
  baseWidth: number;
  baseHeight: number;
  stageWidth: number;
  stageHeight: number;
};

type RecentItem = {
  id: number | string;
  type: "music" | "artist" | "album" | "brand";
  title: string;
  subtitle: string;
  cover: string;
  profileUserId?: string;
  verified?: boolean;
  followersCount?: number;
};

type DetailState = {
  title: string;
  subtitle: string;
  image: string;
  description: string;
};

function hasImage(value: string | undefined | null) {
  return typeof value === "string" && value.trim().length > 0;
}

function shuffleItems<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function formatLikesLabel(count?: number | null) {
  const safeCount = typeof count === "number" && count >= 0 ? count : 0;

  if (safeCount >= 1000000) {
    const value = safeCount / 1000000;
    return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}M curtidas`;
  }

  if (safeCount >= 1000) {
    const value = safeCount / 1000;
    return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}k curtidas`;
  }

  return `${safeCount} curtidas`;
}

function buildRandomPostGrid(posts: PostItem[], seed: number) {
  if (posts.length === 0) {
    return [];
  }

  const shuffled = shuffleItems(posts);
  const startIndex = seed % shuffled.length;
  const rotated = [...shuffled.slice(startIndex), ...shuffled.slice(0, startIndex)];

  return rotated.slice(0, 9);
}

function MediaTile({
  uri,
  style,
  icon = "image-outline",
}: {
  uri: string;
  style: object;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  if (hasImage(uri)) {
    return <Image source={{ uri }} style={style} />;
  }

  return (
    <View style={[style, styles.mediaFallback]}>
      <Ionicons name={icon} size={22} color="#777" />
    </View>
  );
}

function SearchVideoPreview({
  uri,
  style,
  contentFit = "cover",
  scale = 1,
}: {
  uri: string;
  style: object;
  contentFit?: "cover" | "contain";
  scale?: number;
}) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.play();
  });

  return (
    <VideoView
      player={player}
      style={[style, { transform: [{ scale }] }]}
      contentFit={contentFit}
      nativeControls={false}
      allowsFullscreen={false}
      pointerEvents="none"
    />
  );
}

function PostMediaTile({
  post,
  style,
  contentFit = "cover",
}: {
  post: PostItem;
  style: object;
  contentFit?: "cover" | "contain";
}) {
  if (post.type === "video" && hasImage(post.image)) {
    return (
      <SearchVideoPreview
        uri={post.image}
        style={style}
        contentFit={contentFit}
        scale={post.mediaScale || 1}
      />
    );
  }

  if (hasImage(post.image)) {
    return (
      <Image
        source={{ uri: post.image }}
        style={[style, { transform: [{ scale: post.mediaScale || 1 }] }]}
      />
    );
  }

  return <MediaTile uri={post.image} style={style} />;
}

function SearchPostOverlayLayer({ post }: { post: PostItem }) {
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  if (post.overlayMedia.length === 0) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={styles.postOverlayLayer}
      onLayout={(event) => setStageSize(event.nativeEvent.layout)}
    >
      {post.overlayMedia.map((overlay) => {
        const sourceStageWidth = overlay.stageWidth || 1;
        const sourceStageHeight = overlay.stageHeight || 1;
        const scaleX = stageSize.width / sourceStageWidth;
        const scaleY = stageSize.height / sourceStageHeight;
        const scaledWidth = overlay.baseWidth * overlay.scale;
        const scaledHeight = overlay.baseHeight * overlay.scale;
        const offsetX = (scaledWidth - overlay.baseWidth) / 2;
        const offsetY = (scaledHeight - overlay.baseHeight) / 2;

        return (
          <Image
            key={overlay.id}
            source={{ uri: overlay.mediaUrl }}
            style={[
              styles.postOverlayMedia,
              {
                left: (overlay.x - offsetX) * scaleX,
                top: (overlay.y - offsetY) * scaleY,
                width: scaledWidth * scaleX,
                height: scaledHeight * scaleY,
              },
            ]}
            resizeMode="contain"
          />
        );
      })}
    </View>
  );
}

const CATEGORIES: CategoryItem[] = [
  {
    id: 1,
    title: "Ver todas",
    cover: "",
    isAll: true,
  },
  {
    id: 2,
    title: "Biblioteca",
    cover: "",
    isAll: true,
  },
  {
    id: 3,
    title: "Pop",
    cover: "",
  },
  {
    id: 4,
    title: "R&B",
    cover: "",
  },
  {
    id: 5,
    title: "Rock",
    cover: "",
  },
  {
    id: 6,
    title: "Eletronica",
    cover: "",
  },
  {
    id: 7,
    title: "Jazz",
    cover: "",
  },
  {
    id: 8,
    title: "Lo-fi",
    cover: "",
  },
  {
    id: 9,
    title: "Classica",
    cover: "",
  },
];

const MORE_CATEGORIES: CategoryItem[] = [
  { id: 10, title: "Rap", cover: "" },
  { id: 11, title: "Afro", cover: "" },
  { id: 12, title: "Trap", cover: "" },
  { id: 13, title: "Funk", cover: "" },
  { id: 14, title: "Soul", cover: "" },
  { id: 15, title: "Indie", cover: "" },
  { id: 16, title: "House", cover: "" },
  { id: 17, title: "Techno", cover: "" },
  { id: 18, title: "Reggaeton", cover: "" },
];

const POSTS: PostItem[] = [];

const RESULTS: ResultItem[] = [];

export default function SearchScreen() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { playQueue, playTrack, track: currentTrack, togglePlay: toggleCurrentTrack } = usePlayer();
  const { wp, hp, font } = useResponsive();
  const [query, setQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [playingItem, setPlayingItem] = useState<number | string | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [firebaseResults, setFirebaseResults] = useState<ResultItem[] | null>(null);
  const [firebasePosts, setFirebasePosts] = useState<PostItem[] | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [postShuffleKey, setPostShuffleKey] = useState(0);
  const [activePostIndex, setActivePostIndex] = useState<number | null>(null);
  const [activePostSequence, setActivePostSequence] = useState<PostItem[]>([]);
  const closeReelsPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 28 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dx) > 82) {
          setActivePostIndex(null);
        }
      },
    }),
  ).current;

  useEffect(() => {
    let active = true;

    Promise.all([getHomeContent(), getSearchableUsers()]).then(([content, users]) => {
      if (!active) {
        return;
      }

      const trackResults = content.tracks.map((track, index) => ({
        id: `track-${track.id ?? index}`,
        trackId:
          "id" in track && typeof track.id === "string"
            ? track.id
            : undefined,
        type: "music" as const,
        title:
          "title" in track && typeof track.title === "string"
            ? track.title
            : "Musica",
        subtitle:
          "artist" in track && typeof track.artist === "string"
            ? `Musica - ${track.artist}`
            : `Musica - ${defaultUser.displayName}`,
        cover:
          "coverUrl" in track && typeof track.coverUrl === "string"
            ? track.coverUrl
            : defaultUser.bannerUrl,
        audioUrl:
          "audioUrl" in track && typeof track.audioUrl === "string"
            ? track.audioUrl
            : "",
        lyrics:
          "lyrics" in track && typeof track.lyrics === "string"
            ? track.lyrics
            : "",
        genres: track.genre ? [track.genre] : [],
      }));

      const albumResults = content.albums.map((album, index) => ({
        id: `album-${album.id ?? index}`,
        albumId: album.id,
        type: "music" as const,
        title:
          "title" in album && typeof album.title === "string"
            ? album.title
            : "Lancamento",
        subtitle:
          "type" in album && typeof album.type === "string"
            ? `${album.type} - ${defaultUser.displayName}`
            : `Album - ${defaultUser.displayName}`,
        cover:
          "coverUrl" in album && typeof album.coverUrl === "string"
            ? album.coverUrl
            : defaultUser.bannerUrl,
        queueTracks: content.tracks
          .filter(
            (track) =>
              track.albumId === album.id ||
              ("trackIds" in album &&
                Array.isArray(album.trackIds) &&
                album.trackIds.includes(track.id)),
          )
          .sort((left, right) => {
            const ids =
              "trackIds" in album && Array.isArray(album.trackIds)
                ? album.trackIds
                : [];
            const leftIndex = ids.indexOf(left.id);
            const rightIndex = ids.indexOf(right.id);
            return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) -
              (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
          })
          .map((track) => ({
            id: track.id,
            uri: track.audioUrl,
            title: track.title,
            artist: defaultUser.displayName,
            cover: track.coverUrl || album.coverUrl,
            genre: track.genre,
            shortVideo: track.shortVideoUrl,
            lyrics: track.lyrics,
            albumId: album.id,
            source: "search" as const,
          })),
        genres:
          "genres" in album && Array.isArray(album.genres)
            ? album.genres
            : [],
      }));

      const userResults = users.map((profile, index) => ({
        id: `user-${profile.id ?? profile.uid ?? index}`,
        type: "artist" as const,
        title: profile.displayName || profile.username || "Perfil",
        subtitle: `Perfil - ${profile.followersCount ?? 0} seguidores`,
        cover: profile.avatarUrl || profile.bannerUrl || "",
        profileUserId: profile.uid || profile.id,
        verified: profile.verified === true,
        followersCount: profile.followersCount ?? 0,
        relatedTrackTitles: content.tracks
          .filter(
            (track) =>
              "userId" in track &&
              typeof track.userId === "string" &&
              track.userId === (profile.uid || profile.id),
          )
          .map((track) =>
            "title" in track && typeof track.title === "string"
              ? track.title
              : "",
          )
          .filter(Boolean),
      }));
      const profilesById = new Map(
        users.map((profile) => [profile.uid || profile.id, profile]),
      );
      const tracksById = new Map(content.tracks.map((track) => [track.id, track]));

      setFirebaseResults([...userResults, ...trackResults, ...albumResults]);
      setFirebasePosts(
        shuffleItems(content.posts).map((post, index) => ({
          id:
            "id" in post && typeof post.id === "string"
              ? post.id
              : `post-${index}`,
          ownerId: post.userId,
          artist:
            profilesById.get(post.userId)?.displayName ||
            profilesById.get(post.userId)?.username ||
            "Perfil",
          caption:
            "caption" in post && typeof post.caption === "string"
              ? post.caption
              : "Conteudo preparado para Firebase.",
          image:
            "mediaUrl" in post && typeof post.mediaUrl === "string"
              ? post.mediaUrl
              : defaultUser.bannerUrl,
          mediaScale:
            "mediaScale" in post && typeof post.mediaScale === "number"
              ? post.mediaScale
              : 1,
          category:
            "category" in post && typeof post.category === "string"
              ? post.category
              : "Pop",
          likesLabel:
            "likesCount" in post && typeof post.likesCount === "number"
              ? formatLikesLabel(post.likesCount)
              : formatLikesLabel(0),
          type:
            "mediaType" in post && post.mediaType === "video"
              ? "video" as const
              : "image" as const,
          avatar: profilesById.get(post.userId)?.avatarUrl || "",
          mediaUrls: [
            "mediaUrl" in post && typeof post.mediaUrl === "string" ? post.mediaUrl : "",
            "thumbnailUrl" in post && typeof post.thumbnailUrl === "string" ? post.thumbnailUrl : "",
            ...(
              "overlayMedia" in post && Array.isArray(post.overlayMedia)
                ? post.overlayMedia
                    .map((overlay) =>
                      overlay &&
                      typeof overlay === "object" &&
                      "mediaUrl" in overlay &&
                      typeof overlay.mediaUrl === "string"
                        ? overlay.mediaUrl
                        : "",
                    )
                : []
            ),
          ],
          overlayMedia:
            "overlayMedia" in post && Array.isArray(post.overlayMedia)
              ? post.overlayMedia
                  .filter(
                    (overlay): overlay is SearchOverlayItem =>
                      !!overlay &&
                      typeof overlay === "object" &&
                      "id" in overlay &&
                      typeof overlay.id === "string" &&
                      "mediaUrl" in overlay &&
                      typeof overlay.mediaUrl === "string",
                  )
                  .map((overlay) => ({
                    id: overlay.id,
                    mediaUrl: overlay.mediaUrl,
                    x: typeof overlay.x === "number" ? overlay.x : 0,
                    y: typeof overlay.y === "number" ? overlay.y : 0,
                    scale: typeof overlay.scale === "number" ? overlay.scale : 1,
                    baseWidth:
                      typeof overlay.baseWidth === "number"
                        ? overlay.baseWidth
                        : 168,
                    baseHeight:
                      typeof overlay.baseHeight === "number"
                        ? overlay.baseHeight
                        : 168,
                    stageWidth:
                      typeof overlay.stageWidth === "number"
                        ? overlay.stageWidth
                        : 1,
                    stageHeight:
                      typeof overlay.stageHeight === "number"
                        ? overlay.stageHeight
                        : 1,
                  }))
              : [],
          musicName:
            "linkedTrackId" in post &&
            typeof post.linkedTrackId === "string" &&
            post.linkedTrackId.trim()
              ? tracksById.get(post.linkedTrackId)?.title || ""
              : "",
          musicCover:
            "linkedTrackId" in post &&
            typeof post.linkedTrackId === "string" &&
            post.linkedTrackId.trim()
              ? tracksById.get(post.linkedTrackId)?.coverUrl || ""
              : "",
        })),
      );
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      if (!user) {
        setRecentSearches([]);
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, "users", user.uid));
        const history = snapshot.data()?.settings?.search?.history;

        if (active && Array.isArray(history)) {
          setRecentSearches(
            history
              .filter((item) => item && typeof item.title === "string")
              .map((item, index) => ({
                id: Date.now() + index,
                type:
                  item.type === "artist" ||
                  item.type === "brand" ||
                  item.type === "album"
                    ? item.type
                    : "music",
                title: item.title,
                subtitle:
                  typeof item.subtitle === "string" ? item.subtitle : "Sonnor",
                cover: typeof item.cover === "string" ? item.cover : "",
                profileUserId:
                  typeof item.profileUserId === "string"
                    ? item.profileUserId
                    : undefined,
                verified: item.verified === true,
                followersCount:
                  typeof item.followersCount === "number"
                    ? item.followersCount
                    : undefined,
              })),
          );
        }
      } catch (error) {
        console.log("LOAD SEARCH HISTORY ERROR:", error);
      }
    }

    loadHistory();

    return () => {
      active = false;
    };
  }, [user]);

  async function handlePlayResult(item: ResultItem) {
    if (item.albumId) {
      await playQueue(item.queueTracks ?? []);
      setPlayingItem(item.id);
      return;
    }

    if (!item.audioUrl) {
      togglePlayVisual(item.id);
      return;
    }

    if (currentTrack?.id === String(item.id)) {
      await toggleCurrentTrack();
      return;
    }

    await playTrack({
      id: item.trackId ?? String(item.id),
      uri: item.audioUrl,
      title: item.title,
      artist: item.subtitle.replace(/^.*?-\s*/, ""),
      cover: item.cover,
      genre: item.genres?.[0],
      lyrics: item.lyrics,
      source: "search",
    });
    setPlayingItem(item.id);
  }

  function togglePlayVisual(id: number | string) {
    setPlayingItem((current) => (current === id ? null : id));
  }

  function saveRecent(item: {
    type?: RecentItem["type"] | ResultItem["type"];
    title: string;
    subtitle: string;
    cover: string;
    profileUserId?: string;
    verified?: boolean;
    followersCount?: number;
  }) {
    setRecentSearches((current) => {
      const nextItem: RecentItem = {
        id: Date.now(),
        type:
          item.type === "artist" || item.type === "brand" || item.type === "album"
            ? item.type
            : "music",
        title: item.title,
        subtitle: item.subtitle,
        cover: item.cover,
        profileUserId: item.profileUserId,
        verified: item.verified,
        followersCount: item.followersCount,
      };

      const filtered = current.filter((entry) => entry.title !== item.title);

      const next = [nextItem, ...filtered].slice(0, 6);

      if (user) {
        updateSearchHistory(
          user.uid,
          next.map((entry) => ({
            cover: entry.cover,
            subtitle: entry.subtitle,
            title: entry.title,
            type: entry.type,
            profileUserId: entry.profileUserId,
            verified: entry.verified,
            followersCount: entry.followersCount,
          })),
        ).catch((error) => console.log("SAVE SEARCH HISTORY ERROR:", error));
      }

      return next;
    });
  }

  function clearRecentSearches() {
    setRecentSearches([]);

    if (user) {
      updateSearchHistory(user.uid, []).catch((error) =>
        console.log("CLEAR SEARCH HISTORY ERROR:", error),
      );
    }
  }

  function openDetail(item: DetailState) {
    setDetail(item);
  }

  function openMusicRelease(title: string, cover: string) {
    const match = findMusicMatch(title);

    if (!match) {
      return false;
    }

    router.push(
      buildReleaseRoute(match, {
        cover,
        heroImage: cover,
      }),
    );
    return true;
  }

  function handleResultPress(item: ResultItem) {
    saveRecent(item);

    if (item.albumId) {
      router.push({
        pathname: "/main/release/[slug]",
        params: {
          slug: item.albumId,
          albumId: item.albumId,
          cover: item.cover,
          title: item.title,
        },
      });
      return;
    }

    if (item.type === "music" && openMusicRelease(item.title, item.cover)) {
      return;
    }

    if (item.type === "artist" && item.profileUserId) {
      router.push({
        pathname: "/main/profile",
        params: { userId: item.profileUserId },
      });
      return;
    }

    openDetail({
      title: item.title,
      subtitle: item.subtitle,
      image: item.cover,
      description:
        item.type === "brand"
          ? "Marca aberta a colaboracao e a novos drops dentro da app."
          : item.type === "artist"
          ? "Perfil do artista com lancamentos, estatisticas e conteudos recentes."
          : "Faixa pronta para reproducao, partilha e exploracao visual.",
    });
  }

  function handleRecentPress(item: RecentItem) {
    if (
      (item.type === "music" || item.type === "album") &&
      openMusicRelease(item.title, item.cover)
    ) {
      saveRecent(item);
      setQuery(item.title);
      setIsSearchFocused(false);
      return;
    }

    setQuery(item.title);
    setIsSearchFocused(false);
    saveRecent(item);

    if (item.type === "artist" && item.profileUserId) {
      router.push({
        pathname: "/main/profile",
        params: { userId: item.profileUserId },
      });
    }
  }

  function handleCategoryPress(category: CategoryItem) {
    if (category.title === "Ver todas") {
      setActiveCategory(null);
      setQuery("");
      setShowAllCategories((current) => !current);
      setIsSearchFocused(false);
      return;
    }

    if (category.title === "Biblioteca") {
      router.push("/main/library");
      return;
    }

    setActiveCategory(category.title);
    setQuery("");
    setIsSearchFocused(false);
  }

  function handleDeleteOwnPost(post: PostItem) {
    if (!user?.uid || post.ownerId !== user.uid) {
      return;
    }

    Alert.alert("Apagar post?", "Isto remove o post e a midia guardada nele.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost({
              postId: post.id,
              mediaUrls: post.mediaUrls,
            });
            setFirebasePosts((current) =>
              current ? current.filter((item) => item.id !== post.id) : current,
            );
            setActivePostIndex(null);
            setActivePostSequence([]);
          } catch (error) {
            console.log("DELETE SEARCH POST ERROR:", error);
            Alert.alert("Erro", "Nao foi possivel apagar o post agora.");
          }
        },
      },
    ]);
  }

  function openRandomPosts() {
    const nextShuffleKey = postShuffleKey + 1;
    setPostShuffleKey(nextShuffleKey);
    const randomIndex = Math.floor(Math.random() * filteredPosts.length);

    if (filteredPosts[randomIndex]) {
      openPostSequence(randomIndex);
    }
  }

  function openPostSequence(startIndex: number) {
    const orderedGridPosts = filteredPosts.slice(startIndex);
    const usedIds = new Set(orderedGridPosts.map((post) => post.id));
    const randomTail = shuffleItems(
      postItems.filter((post) => !usedIds.has(post.id)),
    );

    setActivePostSequence([...orderedGridPosts, ...randomTail]);
    setActivePostIndex(0);
  }

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;
  const lowerQuery = normalizeSearch(trimmedQuery);

  const resultItems = firebaseResults ?? RESULTS;
  const postItems = useMemo(
    () => firebasePosts ?? shuffleItems(POSTS),
    [firebasePosts],
  );
  const categoryItems = showAllCategories
    ? [...CATEGORIES, ...MORE_CATEGORIES]
    : CATEGORIES;

  const filteredResults = !hasQuery && !activeCategory
    ? []
    : resultItems.filter((item) => {
        if (activeCategory) {
          return item.type === "music" && item.genres?.some(
            (genre) => normalizeSearch(genre) === normalizeSearch(activeCategory),
          );
        }

        const title = normalizeSearch(item.title);
        const subtitle = normalizeSearch(item.subtitle);

        if (item.type === "artist") {
          if (lowerQuery.length < 3) {
            return false;
          }

          const typedProfileName =
            title.startsWith(lowerQuery) || title === lowerQuery;
          const typedOneOfTheirSongs = item.relatedTrackTitles?.some((trackTitle) =>
            normalizeSearch(trackTitle).includes(lowerQuery),
          );

          return typedProfileName || typedOneOfTheirSongs;
        }

        return title.includes(lowerQuery) || subtitle.includes(lowerQuery);
      });

  const filteredPosts = useMemo(() => {
    const source = !activeCategory
      ? postItems
      : postItems.filter((post) => post.category === activeCategory);

    return buildRandomPostGrid(source, postShuffleKey);
  }, [activeCategory, postItems, postShuffleKey]);

  const hasVisiblePosts = filteredPosts.length > 0;

  const postGridTitle = activeCategory && !hasVisiblePosts
    ? `Posts de ${activeCategory}`
    : "Posts";

  const showResults = hasQuery || Boolean(activeCategory);
  const showRecents = !hasQuery && !activeCategory && isSearchFocused;
  const showExplore = !hasQuery && !activeCategory && !isSearchFocused;

  return (
    <View style={[styles.container, { paddingHorizontal: wp(5) }]}>
      <Modal transparent visible={detail !== null} animationType="fade">
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalBackdrop}
          onPress={() => setDetail(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.detailCard}
            onPress={(event) => event.stopPropagation()}
          >
            {detail && (
              <>
                <MediaTile uri={detail.image} style={styles.detailImage} />
                <Text style={styles.detailTitle}>{detail.title}</Text>
                <Text style={styles.detailSubtitle}>{detail.subtitle}</Text>
                <Text style={styles.detailDescription}>{detail.description}</Text>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={activePostIndex !== null}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setActivePostIndex(null)}
      >
        <View style={styles.reelsModal} {...closeReelsPanResponder.panHandlers}>
          <ScrollView
            pagingEnabled
            showsVerticalScrollIndicator={false}
            contentOffset={{
              x: 0,
              y: activePostIndex === null ? 0 : activePostIndex * hp(100),
            }}
          >
            {activePostSequence.map((post) => {
              const isOwnPost = user?.uid === post.ownerId;

              return (
                <View
                  key={`reel-${post.id}`}
                  style={[styles.reelPage, { height: hp(100) }]}
                >
                  <PostMediaTile
                    post={post}
                    style={styles.reelMedia}
                    contentFit="contain"
                  />
                  <SearchPostOverlayLayer post={post} />
                  <View style={styles.reelShade} />

                  <TouchableOpacity
                    style={styles.reelBackButton}
                    onPress={() => setActivePostIndex(null)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="chevron-back" size={28} color="#fff" />
                  </TouchableOpacity>

                  {isOwnPost ? (
                    <TouchableOpacity
                      style={styles.reelMenuButton}
                      onPress={() => handleDeleteOwnPost(post)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
                    </TouchableOpacity>
                  ) : null}

                  {post.musicName ? (
                    <View style={styles.reelMusicInside}>
                      <Text style={styles.reelMusicTitle} numberOfLines={1}>
                        {post.musicName}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.reelBottom}>
                    <View style={styles.reelProfileRow}>
                      {post.avatar ? (
                        <Image source={{ uri: post.avatar }} style={styles.reelAvatar} />
                      ) : (
                        <View style={[styles.reelAvatar, styles.reelAvatarFallback]}>
                          <Ionicons name="person-outline" size={20} color="#fff" />
                        </View>
                      )}

                      <View style={styles.reelTextBlock}>
                        <Text style={styles.reelArtist} numberOfLines={1}>
                          {post.artist}
                        </Text>
                        {post.caption ? (
                          <Text style={styles.reelCaption} numberOfLines={3}>
                            {post.caption}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.reelSongCoverBox}>
                      {post.musicCover ? (
                        <Image source={{ uri: post.musicCover }} style={styles.reelSongCover} />
                      ) : (
                        <Ionicons name="musical-notes-outline" size={22} color="#fff" />
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      <Text style={[styles.pageTitle, { fontSize: font(34) }]}>Pesquisar</Text>

      <View
        style={[
          styles.searchBox,
          { paddingHorizontal: wp(4), paddingVertical: hp(1.5) },
        ]}
      >
        <TextInput
          style={[styles.searchInput, { fontSize: font(16) }]}
          placeholder="Artistas, musicas ou albuns..."
          placeholderTextColor="#777"
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            setActiveCategory(null);
          }}
          onFocus={() => setIsSearchFocused(true)}
          returnKeyType="search"
        />
      </View>

      {activeCategory ? (
        <View style={styles.activeFilterRow}>
          <View style={styles.activeFilterChip}>
            <Text style={styles.activeFilterChipText}>{activeCategory}</Text>
            <TouchableOpacity onPress={() => setActiveCategory(null)}>
              <Ionicons name="close" size={17} color="#000" />
            </TouchableOpacity>
          </View>
          <Text style={styles.activeFilterHint}>Resultados desta categoria</Text>
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: hp(20) }}
      >
        {showResults && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: font(14) }]}>
              Resultados
            </Text>

            {filteredResults.length === 0 ? (
              <Text style={[styles.emptyText, { fontSize: font(14) }]}>
                Sem resultados para {activeCategory || trimmedQuery}.
              </Text>
            ) : (
              filteredResults.map((item) => (
                <View key={item.id} style={styles.resultWrapper}>
                  <TouchableOpacity
                    style={styles.resultItem}
                    activeOpacity={0.8}
                    onPress={() => handleResultPress(item)}
                  >
                    <View style={{ width: wp(14), height: wp(14), marginRight: 15 }}>
                      <MediaTile
                        uri={item.cover}
                        icon={item.type === "artist" ? "person-outline" : "musical-notes-outline"}
                        style={
                          item.type === "artist"
                            ? [styles.artistCover, { width: wp(14), height: wp(14), borderRadius: wp(7) }]
                            : [styles.cover, styles.coverInside, { width: wp(14), height: wp(14) }]
                        }
                      />
                      {item.type === "music" ? (
                        <TouchableOpacity
                          style={styles.coverPlayButton}
                          activeOpacity={0.42}
                          onPress={(event) => {
                            event.stopPropagation();
                            void handlePlayResult(item);
                          }}
                        >
                          <Ionicons name={playingItem === item.id ? "pause" : "play"} size={14} color="#06110d" />
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.resultTitleRow}>
                        <Text
                          style={[styles.resultTitle, { fontSize: font(16) }]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        {item.type === "artist" && item.verified ? (
                          <View style={styles.smallVerifyBadge}>
                            <Ionicons name="checkmark" size={9} color="#fff" />
                          </View>
                        ) : null}
                      </View>
                      <Text
                        style={[styles.resultSubtitle, { fontSize: font(13) }]}
                      >
                        {item.subtitle}
                      </Text>
                    </View>

                    {item.type === "brand" && (
                      <Ionicons
                        name="shirt-outline"
                        size={font(24)}
                        color="#aaa"
                        style={{ marginLeft: wp(3) }}
                      />
                    )}
                  </TouchableOpacity>

                  <View style={styles.divider} />
                </View>
              ))
            )}
          </View>
        )}

        {showRecents && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { fontSize: font(14) }]}>
                Recentes
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={clearRecentSearches}
              >
                <Text style={[styles.actionText, { fontSize: font(13) }]}>
                  Limpar
                </Text>
              </TouchableOpacity>
            </View>

            {recentSearches.length === 0 ? (
              <Text style={[styles.emptyText, { fontSize: font(14) }]}>
                Ainda nao tens pesquisas recentes.
              </Text>
            ) : (
              recentSearches.map((item) => (
                <View key={item.id} style={styles.resultWrapper}>
                  <TouchableOpacity
                    style={styles.resultItem}
                    activeOpacity={0.8}
                    onPress={() => handleRecentPress(item)}
                  >
                    <MediaTile
                      uri={item.cover}
                      icon={item.type === "artist" ? "person-outline" : "musical-notes-outline"}
                      style={
                        item.type === "artist"
                          ? [
                              styles.artistCover,
                              {
                                width: wp(14),
                                height: wp(14),
                                borderRadius: wp(7),
                              },
                            ]
                          : [styles.cover, { width: wp(14), height: wp(14) }]
                      }
                    />

                    <View style={{ flex: 1 }}>
                      <View style={styles.resultTitleRow}>
                        <Text
                          style={[styles.resultTitle, { fontSize: font(16) }]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        {item.type === "artist" && item.verified ? (
                          <View style={styles.smallVerifyBadge}>
                            <Ionicons name="checkmark" size={9} color="#fff" />
                          </View>
                        ) : null}
                      </View>
                      <Text
                        style={[styles.resultSubtitle, { fontSize: font(13) }]}
                      >
                        {item.subtitle}
                      </Text>
                    </View>

                    <Ionicons
                      name={item.type === "brand" ? "shirt-outline" : "time-outline"}
                      size={font(22)}
                      color="#888"
                      style={{ marginLeft: wp(3) }}
                    />
                  </TouchableOpacity>

                  <View style={styles.divider} />
                </View>
              ))
            )}
          </View>
        )}

        {showExplore && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { fontSize: font(14) }]}>
                  Categorias
                </Text>

                {activeCategory && (
                  <Text style={[styles.activeCategoryText, { fontSize: font(12) }]}>
                    Filtro: {activeCategory}
                  </Text>
                )}
              </View>

              <View style={styles.categoriesGrid}>
                {categoryItems.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.85}
                    style={[
                      styles.categoryCard,
                      cat.isAll ? styles.categoryCardAll : null,
                      activeCategory === cat.title && styles.categoryCardActive,
                      { width: wp(28.5) },
                    ]}
                    onPress={() => handleCategoryPress(cat)}
                  >
                    <MediaTile
                      uri={cat.cover}
                      style={styles.categoryImage}
                      icon={cat.title === "Biblioteca" ? "library-outline" : "musical-notes-outline"}
                    />
                    <View style={styles.categoryOverlay} />
                    <Text style={[styles.categoryTitle, { fontSize: font(13) }]}>
                      {cat.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View
              style={[styles.section, { marginTop: hp(2), paddingBottom: hp(4) }]}
            >
              <Text style={[styles.sectionTitle, { fontSize: font(14) }]}>
                {postGridTitle}
              </Text>

              <View style={styles.postsGrid}>
                {filteredPosts.map((post, index) => (
                  <TouchableOpacity
                    key={`${post.id}-${index}`}
                    activeOpacity={0.85}
                    style={styles.postGridItem}
                  >
                    <PostMediaTile post={post} style={styles.postGridImage} />
                    <SearchPostOverlayLayer post={post} />
                    <View style={styles.postOverlay} />
                    <Text
                      style={[styles.postArtistOverlay, { fontSize: font(12) }]}
                    >
                      {post.likesLabel}
                    </Text>
                    <TouchableOpacity
                      style={styles.postGridTapLayer}
                      activeOpacity={1}
                      onPress={() => openPostSequence(index)}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.morePostsButton}
                onPress={openRandomPosts}
                activeOpacity={0.88}
              >
                <Text style={styles.morePostsText}>Mais posts</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: 60,
  },
  pageTitle: {
    fontWeight: "700",
    color: "#fff",
    marginBottom: 25,
  },
  searchBox: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#242424",
  },
  searchInput: {
    color: "#fff",
  },
  section: {
    marginTop: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sectionTitle: {
    color: "#ccc",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  activeCategoryText: {
    color: "#fff",
    opacity: 0.7,
    marginBottom: 12,
  },
  actionText: {
    color: "#d64040",
    marginBottom: 12,
  },
  resultWrapper: {
    marginBottom: 3,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  cover: {
    borderRadius: 12,
    marginRight: 15,
  },
  coverInside: { marginRight: 0 },
  coverPlayButton: {
    position: "absolute",
    right: 3,
    bottom: 3,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6F8FAF",
  },
  artistCover: {
    marginRight: 15,
  },
  mediaFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
  },
  resultTitle: {
    color: "#fff",
    fontWeight: "600",
  },
  resultTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  smallVerifyBadge: {
    width: 15,
    height: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2d7dff",
  },
  resultSubtitle: {
    color: "#888",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#111",
    marginTop: 10,
  },
  emptyText: {
    color: "#777",
    marginTop: 8,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryCard: {
    aspectRatio: 1,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1b1b1b",
    backgroundColor: "#0f0f0f",
  },
  categoryCardAll: {
    borderColor: "#383838",
  },
  categoryCardActive: {
    borderColor: "#fff",
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  categoryTitle: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    color: "#fff",
    fontWeight: "700",
  },
  postsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  activeFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  activeFilterChip: {
    minHeight: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#6F8FAF",
  },
  activeFilterChipText: { color: "#000", fontSize: 14, fontWeight: "900" },
  activeFilterHint: { color: "#888", fontSize: 12, fontWeight: "800" },
  postGridItem: {
    width: "33.3333%",
    aspectRatio: 0.76,
    borderRadius: 0,
    overflow: "hidden",
    backgroundColor: "#0f0f0f",
    borderWidth: 1,
    borderColor: "#000",
  },
  postGridImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  postOverlayLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8,
  },
  postOverlayMedia: {
    position: "absolute",
  },
  postOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "40%",
  },
  postArtistOverlay: {
    position: "absolute",
    left: 4,
    bottom: 6,
    color: "#b9b9b9",
    fontWeight: "700",
  },
  postGridTapLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  morePostsButton: {
    marginTop: 14,
    minHeight: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f2f2f2",
  },
  morePostsText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  reelsModal: {
    flex: 1,
    backgroundColor: "#000",
  },
  reelPage: {
    width: "100%",
    backgroundColor: "#000",
    overflow: "hidden",
  },
  reelMedia: {
    ...StyleSheet.absoluteFillObject,
  },
  reelShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.28)",
    zIndex: 4,
  },
  reelMusicInside: {
    position: "absolute",
    top: 72,
    left: 72,
    right: 72,
    alignItems: "center",
    zIndex: 12,
  },
  reelMusicIconBox: {
    width: 0,
    height: 0,
  },
  reelMusicTextBlock: {
    flex: 1,
  },
  reelActionColumn: {
    position: "absolute",
    right: 18,
    bottom: 132,
    gap: 12,
    zIndex: 12,
  },
  reelBackButton: {
    position: "absolute",
    top: 58,
    left: 18,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 14,
  },
  reelMenuButton: {
    position: "absolute",
    top: 58,
    right: 18,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 14,
  },
  reelMusicTitle: {
    color: "#f3f3f3",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  reelMusicSubtitle: {
    color: "#d8d8d8",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  reelBottom: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  reelProfileRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  reelAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  reelAvatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  reelArtist: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4,
  },
  reelFollowButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  reelFollowingButton: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  reelFollowText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "800",
  },
  reelFollowingText: {
    color: "#fff",
  },
  reelCaption: {
    color: "#e5e5e5",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
  reelTextBlock: {
    flex: 1,
  },
  reelSongCoverBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  reelSongCover: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  reelCaptionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  reelCaptionToggle: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900",
  },
  reelLikes: {
    color: "#d8d8d8",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 8,
  },
  reelRoundAction: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.48)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  detailCard: {
    width: "100%",
    maxWidth: 380,
    alignSelf: "center",
    borderRadius: 24,
    padding: 16,
    backgroundColor: "rgba(12,12,12,0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  detailImage: {
    width: "100%",
    height: 260,
    borderRadius: 18,
    marginBottom: 14,
  },
  detailTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  detailSubtitle: {
    color: "#a7a7a7",
    fontSize: 13,
    marginTop: 4,
  },
  detailDescription: {
    color: "#ddd",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
});
