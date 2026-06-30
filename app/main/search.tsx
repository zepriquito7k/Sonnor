import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
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
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { buildReleaseRoute, findMusicMatch } from "../../constants/musicLibrary";
import { usePlayer, type Track } from "../../context/PlayerContext";
import { getHomeContent, getSearchableUsers } from "../../firebase/contentClient";
import { deletePost } from "../../firebase/contentMutations";
import { defaultUser } from "../../firebase/defaultContent";
import { db } from "../../firebase/dataClient";
import { updateSearchHistory } from "../../firebase/settingsClient";
import { createLike, createReport } from "../../firebase/socialClient";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useResponsive } from "../../utils/responsive";
import AnimatedSoundWave from "./components/AnimatedSoundWave";

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
  iconColor: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  isAll?: boolean;
};

type PostItem = {
  id: string;
  ownerId: string;
  artist: string;
  caption: string;
  image: string;
  mediaScale: number;
  mediaStageWidth: number;
  mediaStageHeight: number;
  category: string;
  likesLabel: string;
  linkedTrackAudioUrl?: string;
  linkedTrackClipEndSeconds?: number;
  linkedTrackClipStartSeconds?: number;
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
  mediaType: "image";
  x: number;
  y: number;
  scale: number;
  baseWidth: number;
  baseHeight: number;
  stageWidth: number;
  stageHeight: number;
};

const LEGACY_POST_STAGE_WIDTH = 482;
const LEGACY_POST_STAGE_HEIGHT = 1000;

function usePostClipAudio(post: PostItem, isActive: boolean) {
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stopTimer: ReturnType<typeof setTimeout> | null = null;
    const clipStart = post.linkedTrackClipStartSeconds ?? 0;
    const clipEnd = post.linkedTrackClipEndSeconds ?? 0;

    async function playLinkedClip() {
      if (!isActive || !post.linkedTrackAudioUrl || clipEnd - clipStart < 1) {
        return;
      }

      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: post.linkedTrackAudioUrl },
          {
            positionMillis: clipStart * 1000,
            progressUpdateIntervalMillis: 200,
            shouldPlay: true,
          },
        );

        if (cancelled) {
          await sound.unloadAsync().catch(() => null);
          return;
        }

        soundRef.current = sound;
        stopTimer = setTimeout(() => {
          void sound.pauseAsync().catch(() => null);
          void sound.setPositionAsync(clipStart * 1000).catch(() => null);
        }, (clipEnd - clipStart) * 1000);
        sound.setOnPlaybackStatusUpdate((nextStatus) => {
          if (nextStatus.isLoaded && nextStatus.positionMillis >= clipEnd * 1000) {
            void sound.pauseAsync().catch(() => null);
            void sound.setPositionAsync(clipStart * 1000).catch(() => null);
          }
        });
      } catch (error) {
        console.log("PLAY SEARCH POST CLIP ERROR:", error);
      }
    }

    void playLinkedClip();

    return () => {
      cancelled = true;
      if (stopTimer) {
        clearTimeout(stopTimer);
      }
      const sound = soundRef.current;
      soundRef.current = null;
      sound?.setOnPlaybackStatusUpdate(null);
      void sound?.unloadAsync().catch(() => null);
    };
  }, [
    isActive,
    post.id,
    post.linkedTrackAudioUrl,
    post.linkedTrackClipEndSeconds,
    post.linkedTrackClipStartSeconds,
  ]);
}

function hasConfirmedPostMusic(post: object) {
  const data = post as Record<string, unknown>;
  return (
    typeof data.linkedTrackId === "string" &&
    data.linkedTrackId.trim().length > 0 &&
    typeof data.linkedTrackClipStartSeconds === "number" &&
    typeof data.linkedTrackClipEndSeconds === "number" &&
    data.linkedTrackClipEndSeconds - data.linkedTrackClipStartSeconds >= 1
  );
}

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

function truncateSearchTitle(value: string) {
  return value.length > 15 ? `${value.slice(0, 15)}...` : value;
}

function formatLikesLabel(count?: number | null) {
  const safeCount = typeof count === "number" && count >= 0 ? count : 0;

  if (safeCount >= 1000000) {
    const value = safeCount / 1000000;
    return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}M likes`;
  }

  if (safeCount >= 1000) {
    const value = safeCount / 1000;
    return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}k likes`;
  }

  return `${safeCount} likes`;
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
  iconColor = "#777",
}: {
  uri: string;
  style: object;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}) {
  if (hasImage(uri)) {
    return <Image source={{ uri }} style={style} />;
  }

  return (
    <View style={[style, styles.mediaFallback]}>
      <Ionicons name={icon} size={22} color={iconColor} />
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
        resizeMode={contentFit}
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

function FullscreenPostComposition({
  isActive,
  post,
}: {
  isActive: boolean;
  post: PostItem;
}) {
  usePostClipAudio(post, isActive);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const sourceStageWidth =
    post.mediaStageWidth ||
    post.overlayMedia[0]?.stageWidth ||
    LEGACY_POST_STAGE_WIDTH;
  const sourceStageHeight =
    post.mediaStageHeight ||
    post.overlayMedia[0]?.stageHeight ||
    LEGACY_POST_STAGE_HEIGHT;
  const compositionScale = Math.max(
    stageSize.width / sourceStageWidth || 1,
    stageSize.height / sourceStageHeight || 1,
  );
  const compositionWidth = sourceStageWidth * compositionScale;
  const compositionHeight = sourceStageHeight * compositionScale;

  return (
    <View
      pointerEvents="none"
      style={styles.fullscreenPostStage}
      onLayout={(event) => setStageSize(event.nativeEvent.layout)}
    >
      <View
        style={[
          styles.fullscreenPostComposition,
          {
            width: compositionWidth,
            height: compositionHeight,
            left: (stageSize.width - compositionWidth) / 2,
            top: (stageSize.height - compositionHeight) / 2,
          },
        ]}
      >
        <PostMediaTile
          post={post}
          style={styles.reelMedia}
          contentFit="contain"
        />
        <SearchPostOverlayLayer post={post} />
      </View>
    </View>
  );
}

const CATEGORIES: CategoryItem[] = [
  {
    id: 1,
    title: "Show all",
    cover: "",
    icon: "grid-outline",
    iconColor: "#F2F2F2",
    isAll: true,
  },
  {
    id: 2,
    title: "Library",
    cover: "",
    icon: "library-outline",
    iconColor: "#C9E7FF",
    isAll: true,
  },
  {
    id: 3,
    title: "Pop",
    cover: "",
    icon: "star-outline",
    iconColor: "#FFE4A8",
  },
  {
    id: 4,
    title: "R&B",
    cover: "",
    icon: "heart-outline",
    iconColor: "#FFC7DD",
  },
  {
    id: 5,
    title: "Rock",
    cover: "",
    icon: "flash-outline",
    iconColor: "#FFD1B8",
  },
  {
    id: 6,
    title: "Eletronica",
    cover: "",
    icon: "pulse-outline",
    iconColor: "#BDEEFF",
  },
  {
    id: 7,
    title: "Jazz",
    cover: "",
    icon: "cafe-outline",
    iconColor: "#E8D0B8",
  },
  {
    id: 8,
    title: "Lo-fi",
    cover: "",
    icon: "moon-outline",
    iconColor: "#D9D0FF",
  },
  {
    id: 9,
    title: "Classica",
    cover: "",
    icon: "musical-notes-outline",
    iconColor: "#FFF0C7",
  },
];

const MORE_CATEGORIES: CategoryItem[] = [
  { id: 10, title: "Rap", cover: "", icon: "mic-outline", iconColor: "#D8D8D8" },
  { id: 11, title: "Afro", cover: "", icon: "earth-outline", iconColor: "#C8F0C9" },
  { id: 12, title: "Trap", cover: "", icon: "diamond-outline", iconColor: "#D8CCFF" },
  { id: 13, title: "Funk", cover: "", icon: "flame-outline", iconColor: "#FFD0A8" },
  { id: 14, title: "Soul", cover: "", icon: "heart-circle-outline", iconColor: "#FFC9E7" },
  { id: 15, title: "Indie", cover: "", icon: "leaf-outline", iconColor: "#D6F2C4" },
  { id: 16, title: "House", cover: "", icon: "home-outline", iconColor: "#C8E5FF" },
  { id: 17, title: "Techno", cover: "", icon: "hardware-chip-outline", iconColor: "#C9F4EF" },
  { id: 18, title: "Reggaeton", cover: "", icon: "sunny-outline", iconColor: "#FFE3A3" },
];

const POSTS: PostItem[] = [];

const RESULTS: ResultItem[] = [];

export default function SearchScreen() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { playQueue } = usePlayer();
  const { wp, hp, font } = useResponsive();
  const [query, setQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [firebaseResults, setFirebaseResults] = useState<ResultItem[] | null>(null);
  const [firebasePosts, setFirebasePosts] = useState<PostItem[] | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [postShuffleKey, setPostShuffleKey] = useState(0);
  const [activePostIndex, setActivePostIndex] = useState<number | null>(null);
  const [activePostSequence, setActivePostSequence] = useState<PostItem[]>([]);
  const reelsOpenRef = useRef(false);
  const [likedPostIds, setLikedPostIds] = useState(() => new Set<string>());
  const closeReelsPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 28 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dx) > 82) {
          closePostReels();
        }
      },
    }),
  ).current;

  useEffect(() => {
    let active = true;

    Promise.all([getHomeContent(), getSearchableUsers()])
      .then(([content, users]) => {
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
            : "Music",
        subtitle:
          "artist" in track && typeof track.artist === "string"
            ? `Music - ${track.artist}`
            : `Music - ${defaultUser.displayName}`,
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
        queueTracks: [
          {
            id: track.id,
            uri: track.audioUrl,
            title: track.title,
            artist: defaultUser.displayName,
            cover:
              "coverUrl" in track && typeof track.coverUrl === "string"
                ? track.coverUrl
                : defaultUser.bannerUrl,
            genre: track.genre,
            shortVideo: track.shortVideoUrl,
            lyrics: track.lyrics,
            albumId: track.albumId,
            source: "search" as const,
          },
        ],
      }));

      const albumResults = content.albums.map((album, index) => ({
        id: `album-${album.id ?? index}`,
        albumId: album.id,
        type: "music" as const,
        title:
          "title" in album && typeof album.title === "string"
            ? album.title
            : "Album",
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
            folderTitle: album.title,
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
        title: profile.displayName || profile.username || "Profile",
        subtitle: `Profile - ${profile.followersCount ?? 0} followers`,
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
            "Profile",
          caption:
            "caption" in post && typeof post.caption === "string"
              ? post.caption
              : "Content prepared for Firebase.",
          image:
            "mediaUrl" in post && typeof post.mediaUrl === "string"
              ? post.mediaUrl
              : defaultUser.bannerUrl,
          mediaScale:
            "mediaScale" in post && typeof post.mediaScale === "number"
              ? post.mediaScale
              : 1,
          mediaStageWidth:
            "mediaStageWidth" in post && typeof post.mediaStageWidth === "number"
              ? post.mediaStageWidth
              : 0,
          mediaStageHeight:
            "mediaStageHeight" in post && typeof post.mediaStageHeight === "number"
              ? post.mediaStageHeight
              : 0,
          category:
            "category" in post && typeof post.category === "string"
              ? post.category
              : "Pop",
          likesLabel:
            "likesCount" in post && typeof post.likesCount === "number"
              ? formatLikesLabel(post.likesCount)
              : formatLikesLabel(0),
          linkedTrackAudioUrl:
            "linkedTrackId" in post &&
            typeof post.linkedTrackId === "string" &&
            hasConfirmedPostMusic(post)
              ? tracksById.get(post.linkedTrackId)?.audioUrl || ""
              : "",
          linkedTrackClipEndSeconds:
            "linkedTrackClipEndSeconds" in post &&
            typeof post.linkedTrackClipEndSeconds === "number"
              ? post.linkedTrackClipEndSeconds
              : 0,
          linkedTrackClipStartSeconds:
            "linkedTrackClipStartSeconds" in post &&
            typeof post.linkedTrackClipStartSeconds === "number"
              ? post.linkedTrackClipStartSeconds
              : 0,
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
                    mediaType: "image" as const,
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
            hasConfirmedPostMusic(post)
              ? tracksById.get(post.linkedTrackId)?.title || ""
              : "",
          musicCover:
            "linkedTrackId" in post &&
            typeof post.linkedTrackId === "string" &&
            hasConfirmedPostMusic(post)
              ? tracksById.get(post.linkedTrackId)?.coverUrl || ""
              : "",
        })),
        );
      })
      .catch((error) => {
        console.log("LOAD SEARCH CONTENT ERROR:", error);
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

  function openDetail(_item: DetailState) {
    setDetail(null);
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

  async function handleResultPress(item: ResultItem) {
    saveRecent(item);

    if (item.type === "music" && item.audioUrl) {
      const queue = item.queueTracks?.length
        ? item.queueTracks
        : [
            {
              albumId: item.albumId,
              artist: item.subtitle.replace(/^Music\s*-\s*/i, "") || "Sonnor",
              cover: item.cover,
              id: item.trackId || String(item.id),
              lyrics: item.lyrics,
              source: "search" as const,
              title: item.title,
              uri: item.audioUrl,
            },
          ];

      await playQueue(queue, 0, { autoRecommendations: true });
      setIsSearchFocused(false);
      return;
    }

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

    setIsSearchFocused(false);
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
    if (category.title === "Show all") {
      setActiveCategory(null);
      setQuery("");
      setShowAllCategories((current) => !current);
      setIsSearchFocused(false);
      return;
    }

    if (category.title === "Biblioteca") {
      setShowAllCategories(false);
      router.push("/main/library");
      return;
    }

    setActiveCategory(category.title);
    setQuery("");
    setIsSearchFocused(false);
    setShowAllCategories(false);
  }

  function handleDeleteOwnPost(post: PostItem) {
    if (!user?.uid || post.ownerId !== user.uid) {
      return;
    }

    Alert.alert("Delete post?", "This removes the post and the media stored in it.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
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
            closePostReels();
          } catch (error) {
            console.log("DELETE SEARCH POST ERROR:", error);
            Alert.alert("Error", "Could not delete the post right now.");
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
    reelsOpenRef.current = true;
    setActivePostIndex(0);
  }

  function closePostReels() {
    reelsOpenRef.current = false;
    setActivePostIndex(null);
    setActivePostSequence([]);
  }

  async function handleLikePost(post: PostItem) {
    if (!user?.uid) {
      Alert.alert("Login required", "Sign in to like this post.");
      return;
    }

    const previousLiked = likedPostIds.has(post.id);
    setLikedPostIds((current) => {
      const next = new Set(current);
      if (previousLiked) {
        next.delete(post.id);
      } else {
        next.add(post.id);
      }
      return next;
    });

    try {
      const result = await createLike(user.uid, "post", post.id);
      const liked = (result.data as { liked?: boolean } | undefined)?.liked;

      if (typeof liked === "boolean") {
        setLikedPostIds((current) => {
          const next = new Set(current);
          if (liked) {
            next.add(post.id);
          } else {
            next.delete(post.id);
          }
          return next;
        });
      }
    } catch (error) {
      console.log("LIKE SEARCH POST ERROR:", error);
      setLikedPostIds((current) => {
        const next = new Set(current);
        if (previousLiked) {
          next.add(post.id);
        } else {
          next.delete(post.id);
        }
        return next;
      });
      Alert.alert("Error", "Could not like this post right now.");
    }
  }

  function handleReportPost(post: PostItem) {
    if (!user?.uid) {
      Alert.alert("Login required", "Sign in to report this post.");
      return;
    }

    Alert.prompt(
      "Report post",
      "Enter the report reason.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async (value?: string) => {
            const details = value?.trim();

            if (!details) {
              Alert.alert("Reason required", "Enter the report reason.");
              return;
            }

            try {
              await createReport({
                reporterId: user.uid,
                targetType: "post",
                targetId: post.id,
                reason: "Post report",
                details,
              });
              Alert.alert("Enviado", "Obrigado. Vamos analisar este post.");
            } catch (error) {
              console.log("REPORT SEARCH POST ERROR:", error);
              Alert.alert("Error", "Could not send the report right now.");
            }
          },
        },
      ],
      "plain-text",
    );
  }

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;
  const lowerQuery = normalizeSearch(trimmedQuery);

  const resultItems = firebaseResults ?? RESULTS;
  const postItems = useMemo(
    () => firebasePosts ?? shuffleItems(POSTS),
    [firebasePosts],
  );
  const categoryItems = CATEGORIES;
  const categoryListItems = [
    ...CATEGORIES.filter((category) => category.title !== "Show all"),
    ...MORE_CATEGORIES,
  ];

  const filteredResults = !hasQuery && !activeCategory
    ? []
    : resultItems.filter((item) => {
        if (activeCategory) {
          return Boolean(item.audioUrl) && item.type === "music" && item.genres?.some(
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

        if (item.albumId && !item.audioUrl) {
          return title.includes(lowerQuery);
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
        transparent
        visible={showAllCategories}
        animationType="fade"
        onRequestClose={() => setShowAllCategories(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.categorySheetBackdrop}
          onPress={() => setShowAllCategories(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.categorySheet}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.categorySheetHeader}>
              <View>
                <Text style={styles.categorySheetEyebrow}>Explorar</Text>
                <Text style={styles.categorySheetTitle}>Categorys</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.75}
                style={styles.categorySheetClose}
                onPress={() => setShowAllCategories(false)}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.categoryPillsWrap}
            >
              {categoryListItems.map((cat) => (
                <TouchableOpacity
                  key={`pill-${cat.id}`}
                  activeOpacity={0.78}
                  style={[
                    styles.categoryPill,
                    activeCategory === cat.title && styles.categoryPillActive,
                  ]}
                  onPress={() => handleCategoryPress(cat)}
                >
                  <Ionicons name={cat.icon} size={17} color={cat.iconColor} />
                  <Text
                    style={[
                      styles.categoryPillText,
                      activeCategory === cat.title && styles.categoryPillTextActive,
                    ]}
                  >
                    {cat.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={activePostIndex !== null && activePostSequence.length > 0}
        animationType="fade"
        transparent={false}
        onRequestClose={closePostReels}
      >
        <View style={styles.reelsModal} {...closeReelsPanResponder.panHandlers}>
          <ScrollView
            pagingEnabled
            showsVerticalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              if (!reelsOpenRef.current) {
                return;
              }

              setActivePostIndex(
                Math.round(event.nativeEvent.contentOffset.y / hp(100)),
              );
            }}
            contentOffset={{
              x: 0,
              y: activePostIndex === null ? 0 : activePostIndex * hp(100),
            }}
          >
            {activePostSequence.map((post, index) => {
              const isOwnPost = user?.uid === post.ownerId;

              return (
                <View
                  key={`reel-${post.id}`}
                  style={[styles.reelPage, { height: hp(100) }]}
                >
                  <FullscreenPostComposition
                    isActive={activePostIndex === index}
                    post={post}
                  />
                  <View style={styles.reelShade} />

                  <TouchableOpacity
                    style={styles.reelBackButton}
                    onPress={closePostReels}
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
                      <View style={styles.reelMusicIconBox}>
                        <AnimatedSoundWave />
                      </View>
                      <View style={styles.reelMusicTextBlock}>
                        <Text style={styles.reelMusicTitle} numberOfLines={1}>
                          {post.musicName}
                        </Text>
                        <Text style={styles.reelMusicSubtitle} numberOfLines={1}>
                          {post.artist}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.reelActionColumn}>
                    <TouchableOpacity
                      style={styles.reelRoundAction}
                      onPress={() => void handleLikePost(post)}
                      activeOpacity={0.82}
                    >
                      <Ionicons
                        name={likedPostIds.has(post.id) ? "heart" : "heart-outline"}
                        size={24}
                        color={likedPostIds.has(post.id) ? "#ff4f8b" : "#fff"}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.reelRoundAction}
                      onPress={() => handleReportPost(post)}
                      activeOpacity={0.82}
                    >
                      <Ionicons name="alert-circle-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>

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

      <Text style={[styles.pageTitle, { fontSize: font(34) }]}>Search</Text>

      <View
        style={[
          styles.searchBox,
          { paddingHorizontal: wp(4), paddingVertical: hp(1.5) },
        ]}
      >
        <TextInput
          style={[styles.searchInput, { fontSize: font(16) }]}
          placeholder="Artists, songs, or albums..."
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
        contentContainerStyle={styles.scrollContent}
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
                    onPress={() => void handleResultPress(item)}
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
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.resultTitleRow}>
                        <Text
                          numberOfLines={1}
                          style={[styles.resultTitle, { fontSize: font(16) }]}
                        >
                          {truncateSearchTitle(item.title)}
                        </Text>
                        {item.type === "artist" && item.verified ? (
                          <View style={styles.smallVerifyBadge}>
                            <Ionicons name="checkmark" size={9} color="#fff" />
                          </View>
                        ) : null}
                        {item.type === "music" ? (
                          <View style={styles.resultTypeBadge}>
                            <Ionicons
                              name={item.albumId ? "albums-outline" : "musical-note-outline"}
                              size={11}
                              color="#000"
                            />
                            <Text style={styles.resultTypeText}>
                              {item.albumId ? "Folder" : "Track"}
                            </Text>
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
                Recent
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={clearRecentSearches}
              >
                <Text style={[styles.actionText, { fontSize: font(13) }]}>
                  Clear
                </Text>
              </TouchableOpacity>
            </View>

            {recentSearches.length === 0 ? (
              <Text style={[styles.emptyText, { fontSize: font(14) }]}>
                You do not have recent searches yet.
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
                          numberOfLines={1}
                          style={[styles.resultTitle, { fontSize: font(16) }]}
                        >
                          {truncateSearchTitle(item.title)}
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
                  Categorys
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
                      icon={cat.icon}
                      iconColor={cat.iconColor}
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
                    <View style={styles.postLikesBadge}>
                      <Text style={styles.postLikesText}>{post.likesLabel}</Text>
                    </View>
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

        <View pointerEvents="none" style={[styles.endFadeFooter, { height: hp(9), marginHorizontal: -wp(5) }]}>
          <Svg height={hp(32)} style={styles.endFade} width="100%">
            <Defs>
              <LinearGradient id="searchEndFade" x1="0" x2="0" y1="0" y2="1">
                <Stop offset="0" stopColor="#ffffff" stopOpacity="0" />
                <Stop offset="0.52" stopColor="#ffffff" stopOpacity="0.03" />
                <Stop offset="0.78" stopColor="#ffffff" stopOpacity="0.15" />
                <Stop offset="1" stopColor="#ffffff" stopOpacity="0.5" />
              </LinearGradient>
            </Defs>
            <Rect fill="url(#searchEndFade)" height={hp(32)} width="100%" x="0" y="0" />
          </Svg>
        </View>
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
  endFade: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    transform: [{ translateY: 18 }],
  },
  endFadeFooter: {
    marginTop: "auto",
    overflow: "visible",
    position: "relative",
    width: "100%",
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 0,
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
  coverInside: {
    marginRight: 0,
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
  resultTypeBadge: {
    minHeight: 20,
    borderRadius: 999,
    paddingHorizontal: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#E6E6E6",
  },
  resultTypeText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
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
  categorySheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.78)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  categorySheet: {
    backgroundColor: "#090b0a",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 28,
    borderWidth: 1,
    maxHeight: "72%",
    padding: 18,
    width: "100%",
  },
  categorySheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  categorySheetEyebrow: {
    color: "#9cebd3",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  categorySheetTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 3,
  },
  categorySheetClose: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.09)",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  categoryPillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    paddingBottom: 4,
  },
  categoryPill: {
    alignItems: "center",
    backgroundColor: "#101412",
    borderColor: "#202622",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 42,
    paddingHorizontal: 13,
  },
  categoryPillActive: {
    backgroundColor: "#f1f4f1",
    borderColor: "#f1f4f1",
  },
  categoryPillText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  categoryPillTextActive: {
    color: "#06110d",
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
    backgroundColor: "#E6E6E6",
  },
  activeFilterChipText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "900",
  },
  activeFilterHint: {
    color: "#888",
    fontSize: 12,
    fontWeight: "800",
  },
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
  postLikesBadge: {
    position: "absolute",
    left: 6,
    bottom: 6,
    maxWidth: "88%",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.62)",
    zIndex: 12,
  },
  postLikesText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
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
  fullscreenPostStage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  fullscreenPostComposition: {
    position: "absolute",
    overflow: "hidden",
    backgroundColor: "#000",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    zIndex: 12,
  },
  reelMusicIconBox: {
    width: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  reelMusicTextBlock: {
    flexShrink: 1,
    alignItems: "center",
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
    marginTop: 3,
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
