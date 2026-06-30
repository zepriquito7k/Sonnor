import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  ImageBackground,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { usePlayer, type Track } from "../../context/PlayerContext";
import {
  getHomeContent,
  publishDueReleasesAndRefreshCache,
} from "../../firebase/contentClient";
import { deletePost } from "../../firebase/contentMutations";
import { defaultUser } from "../../firebase/defaultContent";
import type { PostDocument } from "../../firebase/schema";
import { setReleaseReminder } from "../../firebase/releaseReminderClient";
import { createLike, createReport, getLikedPostIds } from "../../firebase/socialClient";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useResponsive } from "../../utils/responsive";
import MarqueeText from "../../components/MarqueeText";
import AnimatedSoundWave from "./components/AnimatedSoundWave";

type FeaturedPost = {
  artist: string;
  avatar: string;
  caption: string;
  id: string;
  image: string;
  likesCount: number;
  mediaUrls: string[];
  mediaScale: number;
  mediaStageHeight: number;
  mediaStageWidth: number;
  mediaType: "image" | "video";
  linkedTrackAudioUrl: string;
  linkedTrackClipEndSeconds: number;
  linkedTrackClipStartSeconds: number;
  musicCover: string;
  musicName: string;
  overlayMedia: NonNullable<PostDocument["overlayMedia"]>;
  ownerId: string;
  thumbnail: string;
};

const LEGACY_POST_STAGE_WIDTH = 482;
const LEGACY_POST_STAGE_HEIGHT = 1000;

function usePostClipAudio(post: FeaturedPost, isActive: boolean) {
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stopTimer: ReturnType<typeof setTimeout> | null = null;

    async function playLinkedClip() {
      if (
        !isActive ||
        !post.linkedTrackAudioUrl ||
        post.linkedTrackClipEndSeconds - post.linkedTrackClipStartSeconds < 1
      ) {
        return;
      }

      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: post.linkedTrackAudioUrl },
          {
            positionMillis: post.linkedTrackClipStartSeconds * 1000,
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
          void sound
            .setPositionAsync(post.linkedTrackClipStartSeconds * 1000)
            .catch(() => null);
        }, (post.linkedTrackClipEndSeconds - post.linkedTrackClipStartSeconds) * 1000);
        sound.setOnPlaybackStatusUpdate((nextStatus) => {
          if (
            nextStatus.isLoaded &&
            nextStatus.positionMillis >= post.linkedTrackClipEndSeconds * 1000
          ) {
            void sound.pauseAsync().catch(() => null);
            void sound
              .setPositionAsync(post.linkedTrackClipStartSeconds * 1000)
              .catch(() => null);
          }
        });
      } catch (error) {
        console.log("PLAY HOME POST CLIP ERROR:", error);
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

type MusicItem = {
  artist: string;
  id: string;
  image: string;
  meta: string;
  title: string;
  type: "album" | "track";
};

type MerchItem = {
  artist: string;
  id: string;
  image: string;
  linkUrl: string;
  price: string;
  currency: string;
  title: string;
};

type MerchBrand = {
  artist: string;
  id: string;
  linkUrl: string;
  logoUrl: string;
  name: string;
};

type HomeBanner = {
  buttonLabel: string;
  id: string;
  image: string;
  linkUrl: string;
  mediaType: "image" | "video";
  subtitle: string;
  targetId: string;
  targetType: "album" | "post" | "shop" | "track";
  title: string;
};

type DetailItem = {
  description: string;
  image: string;
  subtitle: string;
  title: string;
};

const EMPTY_COVERS = [
  "#2f6f73",
  "#8a3544",
  "#6b5a2f",
  "#365f91",
  "#6e4f8b",
  "#38724a",
];

const PLACEHOLDER_MUSIC: MusicItem[] = [];

const PLACEHOLDER_POSTS: FeaturedPost[] = [];

function hasImage(value: string | undefined | null) {
  return typeof value === "string" && value.trim().length > 0;
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

function getString(source: unknown, key: string, fallback = "") {
  if (!source || typeof source !== "object" || !(key in source)) {
    return fallback;
  }

  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" ? value : fallback;
}

function getNumber(source: unknown, key: string, fallback = 0) {
  if (!source || typeof source !== "object" || !(key in source)) {
    return fallback;
  }

  const value = (source as Record<string, unknown>)[key];
  return typeof value === "number" ? value : fallback;
}

function getPostOverlayMedia(
  source: unknown,
): NonNullable<PostDocument["overlayMedia"]> {
  if (!source || typeof source !== "object" || !("overlayMedia" in source)) {
    return [];
  }

  const value = (source as { overlayMedia?: unknown }).overlayMedia;
  return Array.isArray(value)
    ? (value as NonNullable<PostDocument["overlayMedia"]>)
    : [];
}

function formatPostLikesLabel(count: number) {
  if (count >= 1000000) {
    const value = count / 1000000;
    return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}M likes`;
  }

  if (count >= 1000) {
    const value = count / 1000;
    return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}k likes`;
  }

  return `${count} likes`;
}

function openExternalUrl(url: string) {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return;
  }

  const normalizedUrl = /^https?:\/\//i.test(trimmedUrl)
    ? trimmedUrl
    : `https://${trimmedUrl}`;

  Linking.openURL(normalizedUrl).catch(() => null);
}

function getSeedNumber(seed: string) {
  let value = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }

  return value >>> 0;
}

function shuffleItems<T>(items: T[], seed: string) {
  const shuffled = [...items];
  let random = getSeedNumber(seed);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    const target = random % (index + 1);
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }

  return shuffled;
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = getKey(item);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getMusicKey(item: MusicItem) {
  return `${item.type}-${item.id}`;
}

function getDateMillis(value: unknown) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" || typeof value === "number") {
    const millis = new Date(value).getTime();
    return Number.isNaN(millis) ? 0 : millis;
  }
  if (value && typeof value === "object" && "toMillis" in value) {
    const toMillis = (value as { toMillis?: unknown }).toMillis;
    return typeof toMillis === "function" ? toMillis.call(value) : 0;
  }
  return 0;
}

function getCountdownLabel(target: unknown, now: number) {
  const remainingSeconds = Math.max(0, Math.floor((getDateMillis(target) - now) / 1000));
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function getCountdownParts(target: unknown, now: number) {
  return getCountdownLabel(target, now).split(":");
}

function MediaBox({
  children,
  fallbackIndex = 0,
  imageStyle,
  resizeMode = "cover",
  style,
  uri,
}: {
  children?: React.ReactNode;
  fallbackIndex?: number;
  imageStyle?: object;
  resizeMode?: "contain" | "cover";
  style: object;
  uri: string;
}) {
  if (hasImage(uri)) {
    return (
      <ImageBackground
        resizeMode={resizeMode}
        source={{ uri }}
        style={style}
        imageStyle={[styles.mediaImage, imageStyle]}
      >
        {children}
      </ImageBackground>
    );
  }

  return (
    <View
      style={[
        style,
        styles.mediaFallback,
        { backgroundColor: EMPTY_COVERS[fallbackIndex % EMPTY_COVERS.length] },
      ]}
    >
      <Ionicons name="musical-notes" size={28} color="rgba(255,255,255,0.92)" />
      {children}
    </View>
  );
}

function HomePostVideoPreview({
  scale,
  uri,
}: {
  scale: number;
  uri: string;
}) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.play();
  });

  return (
    <VideoView
      player={player}
      style={[styles.gridPost, { transform: [{ scale }] }]}
      contentFit="cover"
      nativeControls={false}
      allowsFullscreen={false}
      pointerEvents="none"
    />
  );
}

function HomeBannerVideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.play();
  });

  return (
    <VideoView
      player={player}
      style={styles.heroVideo}
      contentFit="cover"
      nativeControls={false}
      allowsFullscreen={false}
      pointerEvents="none"
    />
  );
}

function HomePostGridTile({
  fallbackIndex,
  onPress,
  post,
}: {
  fallbackIndex: number;
  onPress: () => void;
  post: FeaturedPost;
}) {
  const [tileSize, setTileSize] = useState({ width: 0, height: 0 });
  const previewUri =
    post.mediaType === "video" ? post.thumbnail || post.image : post.image;

  return (
    <Pressable
      style={styles.homePostTile}
      onLayout={(event) => setTileSize(event.nativeEvent.layout)}
      onPress={onPress}
    >
      {hasImage(previewUri) && post.mediaType === "video" && !post.thumbnail ? (
        <HomePostVideoPreview uri={previewUri} scale={post.mediaScale || 1} />
      ) : hasImage(previewUri) ? (
        <Image
          source={{ uri: previewUri }}
          style={[
            styles.gridPost,
            { transform: [{ scale: post.mediaScale || 1 }] },
          ]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.gridPost,
            styles.mediaFallback,
            {
              backgroundColor:
                EMPTY_COVERS[fallbackIndex % EMPTY_COVERS.length],
            },
          ]}
        >
          <Ionicons
            name="musical-notes"
            size={28}
            color="rgba(255,255,255,0.92)"
          />
        </View>
      )}

      {post.overlayMedia.map((overlay) => {
        const scaleX = tileSize.width / (overlay.stageWidth || 1);
        const scaleY = tileSize.height / (overlay.stageHeight || 1);
        const scaledWidth = overlay.baseWidth * overlay.scale;
        const scaledHeight = overlay.baseHeight * overlay.scale;
        const offsetX = (scaledWidth - overlay.baseWidth) / 2;
        const offsetY = (scaledHeight - overlay.baseHeight) / 2;

        return (
          <Image
            key={overlay.id}
            source={{ uri: overlay.mediaUrl }}
            style={[
              styles.homePostOverlay,
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

      <View style={styles.postLikesBadge}>
        <Text style={styles.postLikesText}>
          {formatPostLikesLabel(post.likesCount)}
        </Text>
      </View>
    </Pressable>
  );
}

function FullscreenHomePostComposition({
  isActive,
  post,
}: {
  isActive: boolean;
  post: FeaturedPost;
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
        {post.mediaType === "video" ? (
          <HomePostVideoPreview uri={post.image} scale={post.mediaScale || 1} />
        ) : (
          <Image
            source={{ uri: post.image }}
            style={[
              styles.reelMedia,
              { transform: [{ scale: post.mediaScale || 1 }] },
            ]}
            resizeMode="contain"
          />
        )}

        {post.overlayMedia.map((overlay) => {
          const scaleX = compositionWidth / (overlay.stageWidth || 1);
          const scaleY = compositionHeight / (overlay.stageHeight || 1);
          const scaledWidth = overlay.baseWidth * overlay.scale;
          const scaledHeight = overlay.baseHeight * overlay.scale;
          const offsetX = (scaledWidth - overlay.baseWidth) / 2;
          const offsetY = (scaledHeight - overlay.baseHeight) / 2;

          return (
            <Image
              key={overlay.id}
              source={{ uri: overlay.mediaUrl }}
              style={[
                styles.fullscreenPostOverlay,
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
    </View>
  );
}

function SectionHeader({
  action,
  onPress,
  title,
}: {
  action?: string;
  onPress?: () => void;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onPress} style={styles.headerAction}>
          <Text style={styles.headerActionText}>{action}</Text>
          <Ionicons name="chevron-forward" size={16} color="#d9efe9" />
        </Pressable>
      ) : null}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ refresh?: string }>();
  const { playQueue } = usePlayer();
  const { user } = useCurrentUser();
  const { hp, wp } = useResponsive();
  const bannerWidth = wp(100);
  const [activePostIndex, setActivePostIndex] = useState<number | null>(null);
  const [activePostSequence, setActivePostSequence] = useState<FeaturedPost[]>([]);
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
  const [selectedDetail, setSelectedDetail] = useState<DetailItem | null>(null);
  const [homeData, setHomeData] = useState<Awaited<ReturnType<typeof getHomeContent>> | null>(null);
  const [releaseReminders, setReleaseReminders] = useState(() => new Set<string>());
  const [now, setNow] = useState(Date.now());
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const bannerScrollRef = useRef<ScrollView | null>(null);
  const homeShuffleSeed = useRef(`${Date.now()}-${Math.random()}`).current;
  const publishingReleaseIdRef = useRef("");

  const loadHomeContent = useCallback(() => {
    let active = true;

    getHomeContent(user?.uid)
      .then((content) => {
        if (active) {
          setHomeData(content);
        }
      })
      .catch((error) => {
        console.log("LOAD HOME CONTENT ERROR:", error);
      });

    return () => {
      active = false;
    };
  }, [user?.uid]);

  useEffect(() => loadHomeContent(), [loadHomeContent]);

  useEffect(() => {
    let active = true;

    getLikedPostIds(user?.uid)
      .then((ids) => {
        if (active) {
          setLikedPostIds(ids);
        }
      })
      .catch((error) => console.log("LOAD HOME LIKED POSTS ERROR:", error));

    return () => {
      active = false;
    };
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => loadHomeContent(), [loadHomeContent]),
  );

  useEffect(() => {
    if (params.refresh) {
      loadHomeContent();
    }
  }, [loadHomeContent, params.refresh]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const userById = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();

    homeData?.users.forEach((profile) => {
      map.set(profile.uid || profile.id, profile);
    });

    return map;
  }, [homeData?.users]);

  const followedIds = useMemo(
    () => new Set(homeData?.follows.map((follow) => follow.followingId) ?? []),
    [homeData?.follows],
  );

  const tracks = useMemo(() => homeData?.tracks ?? [], [homeData?.tracks]);
  const albums = useMemo(() => homeData?.albums ?? [], [homeData?.albums]);
  const posts = useMemo(() => homeData?.posts ?? [], [homeData?.posts]);
  const users = useMemo(() => homeData?.users ?? [], [homeData?.users]);
  const preferredGenres = useMemo(() => {
    const currentProfile = users.find(
      (profile) => (profile.uid || profile.id) === user?.uid,
    );
    return new Set(
      Array.isArray(currentProfile?.interests)
        ? currentProfile.interests.map((genre) => genre.toLowerCase())
        : [],
    );
  }, [user?.uid, users]);
  const publicConfig = homeData?.publicConfig as Record<string, unknown> | null;
  const bannerConfig =
    publicConfig && typeof publicConfig.homeBanner === "object"
      ? (publicConfig.homeBanner as Record<string, unknown>)
      : publicConfig;

  const eventBanners = useMemo<HomeBanner[]>(
    () =>
      (homeData?.eventBanners ?? []).map((item) => ({
        buttonLabel: "Abrir evento",
        id: item.id,
        image: getString(item, "imageUrl"),
        linkUrl: getString(item, "linkUrl"),
        mediaType: getString(item, "mediaType") === "video" ? "video" : "image",
        subtitle: getString(item, "subtitle", "Evento em destaque na Sonnor."),
        targetId: "",
        targetType: "shop" as const,
        title: getString(item, "title", "Evento Sonnor"),
      })),
    [homeData?.eventBanners],
  );

  const fallbackBanner: HomeBanner = {
    title: getString(bannerConfig, "title"),
    id: "default-home-banner",
    subtitle: getString(bannerConfig, "subtitle"),
    image:
      getString(bannerConfig, "imageUrl") ||
      getString(bannerConfig, "image") ||
      defaultUser.bannerUrl,
    mediaType: "image",
    buttonLabel: getString(bannerConfig, "buttonLabel", "Abrir destaque"),
    targetType:
      (getString(bannerConfig, "targetType", "shop") as HomeBanner["targetType"]) ||
      "shop",
    targetId: getString(bannerConfig, "targetId"),
    linkUrl: getString(bannerConfig, "linkUrl") || getString(bannerConfig, "url"),
  };
  const hasConfiguredBanner =
    Boolean(fallbackBanner.title.trim()) &&
    (Boolean(fallbackBanner.image.trim()) || Boolean(fallbackBanner.linkUrl.trim()));
  const banners =
    eventBanners.length > 0
      ? eventBanners
      : hasConfiguredBanner
      ? [fallbackBanner]
      : [];
  const showingEventBanners = eventBanners.length > 0;

  useEffect(() => {
    setActiveBannerIndex(0);
    bannerScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      setActiveBannerIndex((current) => {
        const next = (current + 1) % banners.length;
        bannerScrollRef.current?.scrollTo({ x: next * bannerWidth, animated: true });
        return next;
      });
    }, 4500);

    return () => clearInterval(timer);
  }, [bannerWidth, banners.length]);

  const allMusic = useMemo<MusicItem[]>(() => {
    const trackItems = tracks.map((track) => {
      const profile = userById.get(getString(track, "userId"));
      const artist = getString(profile, "displayName", defaultUser.displayName);

      return {
        artist,
        id: track.id,
        image: getString(track, "coverUrl"),
        meta: `${getString(track, "genre", "Music")} • ${track.playsCount ?? 0} plays`,
        title: getString(track, "title", "Music"),
        type: "track" as const,
      };
    });
    const albumItems = albums.map((album) => {
      const profile = userById.get(getString(album, "userId"));
      const artist = getString(profile, "displayName", defaultUser.displayName);

      return {
        artist,
        id: album.id,
        image: getString(album, "coverUrl"),
        meta: `${getString(album, "type", "album")} • ${getNumber(album, "playsCount")} plays`,
        title: getString(album, "title", "Album"),
        type: "album" as const,
      };
    });

    const items = [...trackItems, ...albumItems];

    return items.length > 0 ? uniqueBy(items, getMusicKey) : PLACEHOLDER_MUSIC;
  }, [albums, tracks, userById]);

  const continueItems = useMemo(() => {
    const recentTrackIds = homeData?.recentPlays
      .map((play) => getString(play, "trackId"))
      .filter(Boolean);
    const recent = recentTrackIds
      ?.map((trackId) => allMusic.find((item) => item.id === trackId && item.type === "track"))
      .filter((item): item is MusicItem => Boolean(item));

    return recent && recent.length > 0 ? uniqueBy(recent, getMusicKey).slice(0, 5) : [];
  }, [allMusic, homeData?.recentPlays]);

  const recommendedItems = useMemo(
    () =>
      shuffleItems(
        uniqueBy(
          [...allMusic].sort((left, right) => right.meta.localeCompare(left.meta)),
          getMusicKey,
        ),
        `${homeShuffleSeed}-recommended`,
      ).filter((item) => item.type === "track").slice(0, 5),
    [allMusic, homeShuffleSeed],
  );

  const tasteItems = useMemo(() => {
    if (preferredGenres.size === 0) return [];

    return shuffleItems(
      tracks
        .filter((track) => preferredGenres.has(getString(track, "genre").toLowerCase()))
        .map((track) => {
          const profile = userById.get(getString(track, "userId"));
          return {
            artist: getString(profile, "displayName", defaultUser.displayName),
            id: track.id,
            image: getString(track, "coverUrl"),
            meta: getString(track, "genre", "Music"),
            title: getString(track, "title", "Music"),
            type: "track" as const,
          };
        }),
      `${homeShuffleSeed}-taste`,
    ).slice(0, 10);
  }, [homeShuffleSeed, preferredGenres, tracks, userById]);

  const randomTrackItems = useMemo(() => {
    const items = tracks.map((track) => {
      const profile = userById.get(getString(track, "userId"));
      const artist = getString(profile, "displayName", defaultUser.displayName);

      return {
        artist,
        id: track.id,
        image: getString(track, "coverUrl"),
        meta: getString(track, "genre", "Music"),
        title: getString(track, "title", "Music"),
        type: "track" as const,
      };
    });

    return shuffleItems(
      uniqueBy(items, getMusicKey),
      `${homeShuffleSeed}-random-tracks`,
    ).slice(0, 10);
  }, [homeShuffleSeed, tracks, userById]);

  const upcomingRelease = useMemo(() => {
    const releases = homeData?.upcomingReleases ?? [];
    return releases.length > 0
      ? shuffleItems(releases, `${homeShuffleSeed}-upcoming`)[0]
      : undefined;
  }, [homeData?.upcomingReleases, homeShuffleSeed]);
  const upcomingReleaseArtist = upcomingRelease
    ? getString(
        userById.get(getString(upcomingRelease, "userId")),
        "displayName",
        defaultUser.displayName,
      )
    : "";
  const upcomingReleaseCountdownTarget =
    getString(upcomingRelease, "status") === "published"
      ? upcomingRelease?.preReleaseHighlightUntil
      : upcomingRelease?.releaseDate;
  const upcomingReleaseCountdownAt = getDateMillis(upcomingReleaseCountdownTarget);
  const upcomingReleaseId = upcomingRelease?.id;

  useEffect(() => {
    if (
      !upcomingReleaseId ||
      upcomingReleaseCountdownAt > now ||
      publishingReleaseIdRef.current === upcomingReleaseId
    ) {
      return;
    }

    publishingReleaseIdRef.current = upcomingReleaseId;
    setHomeData((current) => {
      if (!current) {
        return current;
      }

      const publishedRelease = {
        ...upcomingRelease,
        preReleaseEnabled: false,
        status: "published" as const,
      } as unknown as (typeof current.albums)[number];

      return {
        ...current,
        albums: [
          publishedRelease,
          ...current.albums.filter((album) => album.id !== upcomingReleaseId),
        ],
        upcomingReleases: current.upcomingReleases.filter(
          (release) => release.id !== upcomingReleaseId,
        ),
      };
    });
    void publishDueReleasesAndRefreshCache(upcomingReleaseId)
      .then(() => getHomeContent(user?.uid))
      .then(setHomeData)
      .catch((error) => {
        publishingReleaseIdRef.current = "";
        console.log("PUBLISH HOME PRE-RELEASE ERROR:", error);
      });
  }, [
    now,
    upcomingRelease,
    upcomingReleaseCountdownAt,
    upcomingReleaseId,
    user?.uid,
  ]);

  const followedMusic = useMemo(() => {
    const items = allMusic.filter((item) => {
      const source =
        tracks.find((track) => track.id === item.id) ??
        albums.find((album) => album.id === item.id);

      return item.type === "album" && source ? followedIds.has(getString(source, "userId")) : false;
    });

    return shuffleItems(
      uniqueBy(items, getMusicKey),
      `${homeShuffleSeed}-followed`,
    ).slice(0, 5);
  }, [albums, allMusic, followedIds, homeShuffleSeed, tracks]);

  const featuredPosts = useMemo<FeaturedPost[]>(() => {
    const items = posts.map((post) => {
      const postUserId = getString(post, "userId");
      const profile = userById.get(postUserId);
      const linkedTrackId = getString(post, "linkedTrackId");
      const linkedTrack = hasConfirmedPostMusic(post)
        ? tracks.find((track) => track.id === linkedTrackId)
        : undefined;

      return {
        artist: getString(profile, "displayName", getString(post, "artist", "Profile")),
        avatar: getString(profile, "avatarUrl", defaultUser.avatarUrl),
        caption: getString(post, "caption", "New content available on Sonnor."),
        id: post.id,
        image: getString(post, "mediaUrl") || getString(post, "thumbnailUrl"),
        likesCount: getNumber(post, "likesCount"),
        mediaUrls: [
          getString(post, "mediaUrl"),
          getString(post, "thumbnailUrl"),
          ...getPostOverlayMedia(post).map((overlay) => overlay.mediaUrl),
        ],
        mediaScale: getNumber(post, "mediaScale", 1),
        mediaStageHeight: getNumber(post, "mediaStageHeight"),
        mediaStageWidth: getNumber(post, "mediaStageWidth"),
        mediaType: (
          getString(post, "mediaType") === "video" ? "video" : "image"
        ) as FeaturedPost["mediaType"],
        linkedTrackAudioUrl: getString(linkedTrack, "audioUrl"),
        linkedTrackClipEndSeconds: getNumber(post, "linkedTrackClipEndSeconds"),
        linkedTrackClipStartSeconds: getNumber(post, "linkedTrackClipStartSeconds"),
        musicCover: getString(linkedTrack, "coverUrl"),
        musicName: getString(linkedTrack, "title"),
        overlayMedia: getPostOverlayMedia(post),
        ownerId: postUserId,
        thumbnail: getString(post, "thumbnailUrl"),
      };
    });

    return items.length > 0 ? uniqueBy(items, (post) => post.id) : PLACEHOLDER_POSTS;
  }, [posts, tracks, userById]);

  const featuredGridPosts = useMemo(
    () => shuffleItems(featuredPosts, `${homeShuffleSeed}-posts`).slice(0, 9),
    [featuredPosts, homeShuffleSeed],
  );

  const merchItems = useMemo<MerchItem[]>(() => {
    return shuffleItems(uniqueBy(users.filter((profile) => (profile.uid || profile.id) !== user?.uid).flatMap((profile) => {
      const products = Array.isArray(profile.merchProducts) ? profile.merchProducts : [];
      const artist = getString(profile, "displayName", "Artist");
      const shopUrl = getString(profile, "shopUrl");

      return products.map((product) => ({
        artist,
        id: `${profile.id}-${product.id}`,
        image: product.imageUrl,
        linkUrl: product.linkUrl || shopUrl,
        price: product.price ?? "",
        currency: "currency" in product && typeof product.currency === "string" ? product.currency : "",
        title: product.title,
      }));
    }), (item) => item.id), `${homeShuffleSeed}-merch-items`).slice(0, 10);
  }, [homeShuffleSeed, user?.uid, users]);

  const merchBrands = useMemo<MerchBrand[]>(() => {
    const items = users
      .filter((profile) => (profile.uid || profile.id) !== user?.uid)
      .filter((profile) => {
        const products = Array.isArray(profile.merchProducts) ? profile.merchProducts : [];

        return Boolean(
          getString(profile, "merchLogoUrl") ||
            getString(profile, "shopUrl") ||
            products.length > 0,
        );
      })
      .map((profile) => ({
        artist: getString(profile, "displayName", "Artist"),
        id: profile.uid || profile.id,
        linkUrl: getString(profile, "shopUrl"),
        logoUrl: getString(profile, "merchLogoUrl"),
        name:
          getString(profile, "merchName") ||
          `${getString(profile, "displayName", "Artist")} merch`,
      }));

    return shuffleItems(
      uniqueBy(items, (brand) => brand.id),
      `${homeShuffleSeed}-merch-brands`,
    ).slice(0, 10);
  }, [homeShuffleSeed, user?.uid, users]);

  function openMusic(item: MusicItem) {
    if (item.id.startsWith("placeholder")) {
      return;
    }

    if (item.type === "track") {
      const albumId = getString(tracks.find((track) => track.id === item.id), "albumId");

      if (albumId) {
        router.push({
          pathname: "/main/release/[slug]",
          params: { slug: albumId, albumId },
        });
        return;
      }

      router.push({ pathname: "/main/track/[id]", params: { id: item.id } });
      return;
    }

    router.push({
      pathname: "/main/release/[slug]",
      params: {
        slug: item.id,
        albumId: item.id,
        artist: item.artist,
        cover: item.image,
        title: item.title,
      },
    });
  }

  async function toggleReleaseReminder(albumId: string) {
    if (!user?.uid) {
      router.push("/auth/login");
      return;
    }

    const enabled = !releaseReminders.has(albumId);
    setReleaseReminders((current) => {
      const next = new Set(current);
      if (enabled) next.add(albumId);
      else next.delete(albumId);
      return next;
    });

    try {
      await setReleaseReminder(user.uid, albumId, enabled);
    } catch {
      setReleaseReminders((current) => {
        const next = new Set(current);
        if (enabled) next.delete(albumId);
        else next.add(albumId);
        return next;
      });
    }
  }

  async function playMusic(item: MusicItem) {
    function putTrackOnTop(trackId: string) {
      setHomeData((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          recentPlays: [
            {
              id: `local-${trackId}-${Date.now()}`,
              albumId: getString(
                tracks.find((entry) => entry.id === trackId),
                "albumId",
              ),
              completed: false,
              createdAt: new Date(),
              listenedMs: 0,
              source: "home" as const,
              trackId,
              userId: user?.uid || "",
            },
            ...current.recentPlays.filter(
              (play) => getString(play, "trackId") !== trackId,
            ),
          ],
        };
      });
    }

    if (item.type === "album") {
      const album = albums.find((entry) => entry.id === item.id);
      const albumTrackIds =
        album && "trackIds" in album && Array.isArray(album.trackIds)
          ? album.trackIds
          : [];
      const albumTracks = tracks
        .filter(
          (entry) =>
            getString(entry, "albumId") === item.id || albumTrackIds.includes(entry.id),
        )
        .sort((left, right) => {
          const leftIndex = albumTrackIds.indexOf(left.id);
          const rightIndex = albumTrackIds.indexOf(right.id);

          return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) -
            (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
        });
      const queue: Track[] = albumTracks
        .map((entry) => ({
          id: entry.id,
          uri: getString(entry, "audioUrl"),
          title: getString(entry, "title", "Music"),
          artist: item.artist,
          cover: getString(entry, "coverUrl") || item.image,
          folderTitle: item.title,
          genre: getString(entry, "genre"),
          shortVideo: getString(entry, "shortVideoUrl"),
          lyrics: getString(entry, "lyrics"),
          albumId: item.id,
          source: "home" as const,
        }))
        .filter((entry) => entry.uri);

      await playQueue(queue);
      if (queue[0]?.id) {
        putTrackOnTop(queue[0].id);
      }
      return;
    }

    const source = tracks.find((entry) => entry.id === item.id);
    const uri = getString(source, "audioUrl");

    if (source && uri) {
      const firstTrack: Track = {
        id: source.id,
        uri,
        title: item.title,
        artist: item.artist,
        cover: item.image,
        folderTitle:
          albums.find((entry) => entry.id === getString(source, "albumId"))?.title ||
          item.title,
        genre: getString(source, "genre"),
        shortVideo: getString(source, "shortVideoUrl"),
        lyrics: getString(source, "lyrics"),
        albumId: getString(source, "albumId"),
        source: "home",
      };
      const followingTracks: Track[] = tracks
        .filter((entry) => entry.id !== source.id && getString(entry, "audioUrl"))
        .map((entry) => {
          const profile = userById.get(getString(entry, "userId"));

          return {
            id: entry.id,
            uri: getString(entry, "audioUrl"),
            title: getString(entry, "title", "Music"),
            artist: getString(profile, "displayName", defaultUser.displayName),
            cover: getString(entry, "coverUrl"),
            folderTitle:
              albums.find((album) => album.id === getString(entry, "albumId"))?.title ||
              getString(entry, "title", "Music"),
            genre: getString(entry, "genre"),
            shortVideo: getString(entry, "shortVideoUrl"),
            lyrics: getString(entry, "lyrics"),
            albumId: getString(entry, "albumId"),
            source: "home" as const,
          };
        });

      await playQueue([firstTrack, ...followingTracks], 0, {
        autoRecommendations: true,
      });
      putTrackOnTop(source.id);
    }
  }

  function openPostSequence(startIndex: number) {
    const orderedGridPosts = featuredGridPosts.slice(startIndex);
    const usedIds = new Set(orderedGridPosts.map((post) => post.id));
    const randomTail = shuffleItems(
      featuredPosts.filter((post) => !usedIds.has(post.id)),
      `${homeShuffleSeed}-post-tail-${startIndex}`,
    );

    reelsOpenRef.current = true;
    setActivePostSequence([...orderedGridPosts, ...randomTail]);
    setActivePostIndex(0);
  }

  function closePostReels() {
    reelsOpenRef.current = false;
    setActivePostIndex(null);
    setActivePostSequence([]);
  }

  async function handleLikePost(post: FeaturedPost) {
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
      console.log("LIKE HOME POST ERROR:", error);
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

  function handleDeleteOwnPost(post: FeaturedPost) {
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
            setHomeData((current) =>
              current
                ? {
                    ...current,
                    posts: current.posts.filter((item) => item.id !== post.id),
                  }
                : current,
            );
            closePostReels();
          } catch (error) {
            console.log("DELETE HOME POST ERROR:", error);
            Alert.alert("Error", "Could not delete the post right now.");
          }
        },
      },
    ]);
  }

  function handleReportPost(post: FeaturedPost) {
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
              Alert.alert("Sent", "Thank you. We will review this post.");
            } catch (error) {
              console.log("REPORT HOME POST ERROR:", error);
              Alert.alert("Error", "Could not send the report right now.");
            }
          },
        },
      ],
      "plain-text",
    );
  }

  function openBanner(banner: HomeBanner) {
    if (banner.targetType === "shop" && banner.linkUrl) {
      Linking.openURL(banner.linkUrl).catch(() => null);
      return;
    }

    if (banner.targetType === "track" && banner.targetId) {
      router.push({ pathname: "/main/track/[id]", params: { id: banner.targetId } });
      return;
    }

    if (banner.targetType === "post" && banner.targetId) {
      router.push({ pathname: "/main/post/[id]", params: { id: banner.targetId } });
      return;
    }

    if (banner.targetType === "album" && banner.targetId) {
      const album = allMusic.find(
        (item) => item.type === "album" && item.id === banner.targetId,
      );

      if (album) {
        openMusic(album);
        return;
      }
    }

    if (banner.linkUrl) {
      Linking.openURL(banner.linkUrl).catch(() => null);
    }
  }

  const cardWidth = wp(42);
  const wideCardWidth = wp(52);

  return (
    <View style={styles.container}>
      <Modal transparent visible={selectedDetail !== null} animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedDetail(null)}>
          <Pressable style={styles.detailCard} onPress={(event) => event.stopPropagation()}>
            {selectedDetail ? (
              <>
                <MediaBox uri={selectedDetail.image} style={styles.detailImage} />
                <Text style={styles.detailTitle}>{selectedDetail.title}</Text>
                <Text style={styles.detailSubtitle}>{selectedDetail.subtitle}</Text>
                <Text style={styles.detailDescription}>{selectedDetail.description}</Text>
              </>
            ) : null}
          </Pressable>
        </Pressable>
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
                key={`home-reel-${post.id}`}
                style={[styles.reelPage, { height: hp(100) }]}
              >
                <FullscreenHomePostComposition
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
                    <Ionicons name="trash-outline" size={24} color="#fff" />
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 0, paddingTop: hp(7) }}
      >
        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>Home</Text>
        </View>

        {showingEventBanners ? (
          <Text style={styles.eventsSectionTitle}>Events</Text>
        ) : null}

        <View style={[styles.heroWrap, showingEventBanners ? styles.heroWrapWithTitle : null]}>
          <ScrollView
            ref={bannerScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              setActiveBannerIndex(
                Math.round(event.nativeEvent.contentOffset.x / bannerWidth),
              );
            }}
          >
            {banners.map((banner) => (
              <Pressable
                key={banner.id}
                style={{ width: bannerWidth }}
                onPress={() => openBanner(banner)}
              >
                <View style={[styles.heroBanner, { height: hp(29) }]}>
                  {banner.mediaType === "video" && banner.image ? (
                    <HomeBannerVideoPreview uri={banner.image} />
                  ) : (
                    <MediaBox
                      imageStyle={styles.heroImage}
                      uri={banner.image}
                      style={StyleSheet.absoluteFillObject}
                    />
                  )}
                  <View style={styles.heroShade} />
                  {showingEventBanners ? (
                    <View pointerEvents="none" style={styles.heroEventTitleLayer}>
                      <Text
                        style={[styles.heroTitle, styles.heroTitleCentered]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.62}
                      >
                        {banner.title}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.heroContent}>
                      <View>
                        <Text style={styles.heroTitle} numberOfLines={2}>
                          {banner.title}
                        </Text>
                        <Text style={styles.heroSubtitle} numberOfLines={2}>
                          {banner.subtitle}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </ScrollView>

          {banners.length > 1 ? (
            <View style={styles.bannerDots}>
              {banners.map((banner, index) => (
                <View
                  key={`dot-${banner.id}`}
                  style={[
                    styles.bannerDot,
                    index === activeBannerIndex ? styles.bannerDotActive : null,
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>

        {upcomingRelease ? (
          <View style={styles.preReleaseSection}>
            <SectionHeader title="Pre-release" />
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/main/release/[slug]",
                  params: { slug: upcomingRelease.id, albumId: upcomingRelease.id },
                })
              }
              style={styles.preReleaseCard}
            >
              {getString(upcomingRelease, "coverUrl") ? (
                <Image
                  blurRadius={20}
                  source={{ uri: getString(upcomingRelease, "coverUrl") }}
                  style={styles.preReleaseColorSample}
                />
              ) : null}
              <Svg height={132} pointerEvents="none" style={styles.preReleaseFade} width={wp(100)}>
                <Defs>
                  <LinearGradient id="homePreReleaseFade" x1="0" x2="1" y1="0" y2="0">
                    <Stop offset="0" stopColor="#000" stopOpacity="0.08" />
                    <Stop offset="0.38" stopColor="#000" stopOpacity="0.52" />
                    <Stop offset="0.64" stopColor="#000" stopOpacity="0.94" />
                    <Stop offset="0.8" stopColor="#000" />
                    <Stop offset="1" stopColor="#000" stopOpacity="1" />
                  </LinearGradient>
                </Defs>
                <Rect fill="url(#homePreReleaseFade)" height="100%" width="100%" />
              </Svg>
              <MediaBox
                uri={getString(upcomingRelease, "coverUrl")}
                style={styles.preReleaseCover}
              />
              <View style={styles.preReleaseInfo}>
                <Text numberOfLines={1} style={styles.preReleaseTitle}>
                  {getString(upcomingRelease, "title", "New release")}
                </Text>
                <Text numberOfLines={1} style={styles.preReleaseMeta}>
                  {upcomingReleaseArtist} • {getString(upcomingRelease, "type", "release")} •{" "}
                  {Array.isArray(upcomingRelease.trackIds) ? upcomingRelease.trackIds.length : 0} tracks
                </Text>
                <View style={styles.preReleaseActions}>
                  <View style={styles.preReleaseTime}>
                    {getCountdownParts(upcomingReleaseCountdownTarget, now).map((part, index) => (
                      <React.Fragment key={index}>
                        {index > 0 ? <Text style={styles.preReleaseTimeSeparator}>:</Text> : null}
                        <View style={styles.preReleaseTimeBox}>
                          <Text style={styles.preReleaseTimeBoxLabel}>
                            {["Hour", "Min", "Sec"][index]}
                          </Text>
                          <Text style={styles.preReleaseTimeText}>{part}</Text>
                        </View>
                      </React.Fragment>
                    ))}
                  </View>
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      void toggleReleaseReminder(upcomingRelease.id);
                    }}
                    style={({ pressed }) => [
                      styles.preReleaseBell,
                      pressed ? styles.playButtonPressed : null,
                    ]}
                  >
                    <Ionicons
                      name={releaseReminders.has(upcomingRelease.id) ? "notifications" : "notifications-outline"}
                      size={19}
                      color="#050505"
                    />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          </View>
        ) : null}

        {continueItems.length > 0 ? (
          <MusicRail
            animatedTitle
            items={continueItems}
            onPress={(item) => void playMusic(item)}
            title="Continue listening"
            width={wideCardWidth}
          />
        ) : null}

        <MusicRail
          items={recommendedItems}
          onPress={openMusic}
          title="Recommended"
          width={cardWidth}
        />

        {tasteItems.length > 0 ? (
          <MusicRail
            items={tasteItems}
            onPress={openMusic}
            title="For your taste"
            width={cardWidth}
          />
        ) : null}

        {randomTrackItems.length > 0 ? (
          <MusicRail
            items={randomTrackItems}
            onPress={openMusic}
            title="Music you might like"
            width={cardWidth}
          />
        ) : null}

        {followedMusic.length > 0 ? (
          <MusicRail
            items={followedMusic}
            onPress={openMusic}
            title="From artists you follow"
            width={cardWidth}
          />
        ) : null}

        {merchBrands.length > 0 || merchItems.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Artist merch" />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalContent}
          >
            <View style={styles.merchLogoRow}>
              {merchBrands.map((brand, index) => (
                <Pressable
                  key={brand.id}
                  style={styles.merchLogoCard}
                  hitSlop={8}
                  onPress={() => openExternalUrl(brand.linkUrl)}
                >
                  {hasImage(brand.logoUrl) ? (
                    <Image
                      resizeMode="contain"
                      source={{ uri: brand.logoUrl }}
                      style={styles.merchLogoImage}
                    />
                  ) : (
                    <View
                      style={[
                        styles.merchLogoFallback,
                        { backgroundColor: EMPTY_COVERS[index % EMPTY_COVERS.length] },
                      ]}
                    >
                      <Text numberOfLines={1} style={styles.merchLogoInitial}>
                        {brand.artist.slice(0, 1)}
                      </Text>
                    </View>
                  )}
                  <Text numberOfLines={1} style={styles.merchLogoName}>
                    {brand.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.merchProductsContent}
          >
            <View style={styles.railRow}>
              {merchItems.map((item, index) => (
                <Pressable
                  key={item.id}
                  style={styles.merchCard}
                  onPress={() => openExternalUrl(item.linkUrl)}
                >
                  {hasImage(item.image) ? (
                    <Image
                      resizeMode="contain"
                      source={{ uri: item.image }}
                      style={styles.merchImage}
                    />
                  ) : (
                    <MediaBox
                      fallbackIndex={index}
                      uri={item.image}
                      style={styles.merchImage}
                    />
                  )}
                  <Text numberOfLines={1} style={styles.cardTitle}>
                    {item.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.cardSubtitle}>
                    {item.artist} {item.price ? `• ${item.currency === "USD" ? "$" : item.currency === "GBP" ? "£" : item.currency === "EUR" ? "€" : ""}${item.price}` : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader
            action="See all"
            onPress={() => router.push("/main/search")}
            title="Posts"
          />
          <View style={styles.homePostsGrid}>
            {featuredGridPosts.map((post, index) => (
              <HomePostGridTile
                key={post.id}
                fallbackIndex={index}
                post={post}
                onPress={() => openPostSequence(index)}
              />
            ))}
          </View>
        </View>

        <View pointerEvents="none" style={[styles.endFadeFooter, { height: hp(9) }]}>
          <Svg height={hp(32)} style={styles.endFade} width="100%">
            <Defs>
              <LinearGradient id="homeEndFade" x1="0" x2="0" y1="0" y2="1">
                <Stop offset="0" stopColor="#ffffff" stopOpacity="0" />
                <Stop offset="0.52" stopColor="#ffffff" stopOpacity="0.03" />
                <Stop offset="0.78" stopColor="#ffffff" stopOpacity="0.15" />
                <Stop offset="1" stopColor="#ffffff" stopOpacity="0.5" />
              </LinearGradient>
            </Defs>
            <Rect fill="url(#homeEndFade)" height={hp(32)} width="100%" x="0" y="0" />
          </Svg>
        </View>
      </ScrollView>
    </View>
  );
}

function MusicRail({
  animatedTitle = false,
  items,
  onPress,
  title,
  width,
}: {
  animatedTitle?: boolean;
  items: MusicItem[];
  onPress: (item: MusicItem) => void;
  title: string;
  width: number;
}) {
  return (
    <View style={styles.section}>
      <SectionHeader title={title} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalContent}
      >
        <View style={styles.railRow}>
          {items.map((item, index) => (
            <Pressable key={`${item.type}-${item.id}`} style={{ width }} onPress={() => onPress(item)}>
              <MediaBox
                fallbackIndex={index}
                uri={item.image}
                style={[styles.coverCard, { width, height: width }]}
              />
              {animatedTitle ? (
                <MarqueeText style={styles.cardTitle}>
                  {item.title}
                </MarqueeText>
              ) : (
                <Text numberOfLines={1} style={styles.cardTitle}>
                  {item.title}
                </Text>
              )}
              <Text numberOfLines={1} style={styles.cardSubtitle}>
                {item.artist}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  artistBubble: {
    alignItems: "center",
    width: 92,
  },
  artistFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  artistName: {
    color: "#f7f7f7",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 10,
    textAlign: "center",
  },
  artistRow: {
    flexDirection: "row",
    gap: 18,
  },
  avatarImage: {
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 39,
    borderWidth: 1,
    height: 78,
    width: 78,
  },
  cardSubtitle: {
    color: "#93a19d",
    fontSize: 13,
    marginTop: 3,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 11,
  },
  container: {
    backgroundColor: "#000",
    flex: 1,
  },
  coverCard: {
    borderRadius: 18,
    overflow: "hidden",
  },
  detailCard: {
    alignSelf: "center",
    backgroundColor: "rgba(11,14,13,0.98)",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 22,
    borderWidth: 1,
    maxWidth: 380,
    padding: 16,
    width: "100%",
  },
  detailDescription: {
    color: "#d8dfdc",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  detailImage: {
    borderRadius: 16,
    height: 260,
    marginBottom: 14,
    overflow: "hidden",
    width: "100%",
  },
  detailSubtitle: {
    color: "#8fa09b",
    fontSize: 13,
    marginTop: 4,
  },
  detailTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  endFade: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    transform: [{ translateY: 18 }],
  },
  endFadeFooter: {
    overflow: "visible",
    position: "relative",
    width: "100%",
  },
  gridPost: {
    borderRadius: 0,
    height: "100%",
    width: "100%",
  },
  homePostsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -1,
  },
  homePostTile: {
    aspectRatio: 0.76,
    backgroundColor: "#0f0f0f",
    borderColor: "#000",
    borderWidth: 1,
    overflow: "hidden",
    width: "33.3333%",
  },
  homePostOverlay: {
    position: "absolute",
    zIndex: 8,
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
  fullscreenPostOverlay: {
    position: "absolute",
    zIndex: 8,
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
    right: 14,
    bottom: 88,
    gap: 12,
    zIndex: 13,
  },
  reelRoundAction: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.52)",
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
    zIndex: 12,
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
  reelTextBlock: {
    flex: 1,
  },
  reelArtist: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4,
  },
  reelCaption: {
    color: "#e5e5e5",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
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
  headerAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
  },
  headerActionText: {
    color: "#d9efe9",
    fontSize: 13,
    fontWeight: "800",
  },
  bannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.32)",
  },
  bannerDotActive: {
    width: 18,
    backgroundColor: "#fff",
  },
  bannerDots: {
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  eventsSectionTitle: {
    color: "#d9efe9",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 22,
    textTransform: "uppercase",
  },
  heroBanner: {
    justifyContent: "flex-end",
    overflow: "hidden",
    width: "100%",
  },
  heroImage: {
    borderRadius: 0,
  },
  heroVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  heroButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#d9efe9",
    borderRadius: 999,
    flexDirection: "row",
    gap: 7,
    marginTop: 18,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  heroButtonText: {
    color: "#06110d",
    fontSize: 13,
    fontWeight: "900",
  },
  heroContent: {
    bottom: 0,
    left: 0,
    padding: 22,
    position: "absolute",
    right: 0,
  },
  heroEyebrow: {
    color: "#d9efe9",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  heroEventTitleLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    zIndex: 2,
  },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.34)",
  },
  heroSubtitle: {
    color: "#e8eeee",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: "88%",
  },
  heroTextCentered: {
    alignItems: "center",
    bottom: "50%",
    left: 0,
    paddingHorizontal: 22,
    position: "absolute",
    right: 0,
    transform: [{ translateY: 20 }],
    width: "100%",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 0,
  },
  heroTitleCentered: {
    maxWidth: "92%",
    textAlign: "center",
  },
  heroWrap: {
    marginTop: 20,
    overflow: "hidden",
    position: "relative",
  },
  heroWrapWithTitle: {
    marginTop: 0,
  },
  horizontalContent: {
    paddingHorizontal: "5%",
  },
  kicker: {
    color: "#8fa09b",
    fontSize: 13,
    fontWeight: "700",
  },
  mediaFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  mediaImage: {
    borderRadius: 18,
  },
  merchCard: {
    marginRight: 18,
    width: 160,
    zIndex: 1,
  },
  merchImage: {
    borderRadius: 16,
    height: 210,
    overflow: "hidden",
    width: 160,
  },
  merchLogoCard: {
    alignItems: "center",
    backgroundColor: "transparent",
    height: 118,
    justifyContent: "center",
    width: 176,
    zIndex: 5,
  },
  merchLogoFallback: {
    alignItems: "center",
    borderRadius: 14,
    height: 74,
    justifyContent: "center",
    width: "100%",
  },
  merchLogoImage: {
    height: 78,
    width: "100%",
  },
  merchLogoInitial: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  merchLogoName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 12,
    textAlign: "center",
  },
  merchLogoRow: {
    flexDirection: "row",
    gap: 12,
    zIndex: 5,
  },
  merchProductsContent: {
    paddingHorizontal: "5%",
    paddingTop: 14,
    zIndex: 1,
  },
  modalBackdrop: {
    backgroundColor: "rgba(0,0,0,0.68)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  pageTitle: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 0,
  },
  playButtonPressed: {
    opacity: 0.42,
    transform: [{ scale: 0.9 }],
  },
  preReleaseActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  preReleaseBell: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    height: 38,
    justifyContent: "center",
    width: 42,
  },
  preReleaseCard: {
    alignItems: "center",
    flexDirection: "row",
    height: 132,
    overflow: "hidden",
    paddingHorizontal: "5%",
    paddingVertical: 14,
  },
  preReleaseColorSample: {
    height: 8,
    left: "50%",
    opacity: 1,
    position: "absolute",
    top: "50%",
    transform: [{ scale: 110 }],
    width: 8,
  },
  preReleaseFade: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  preReleaseCover: {
    borderRadius: 12,
    height: 98,
    overflow: "hidden",
    width: 98,
  },
  preReleaseInfo: {
    flex: 1,
    marginLeft: 14,
  },
  preReleaseMeta: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  preReleaseSection: {
    marginTop: 34,
    width: "100%",
  },
  preReleaseTime: {
    alignItems: "center",
    flexDirection: "row",
  },
  preReleaseTimeBox: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    minWidth: 42,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  preReleaseTimeBoxLabel: {
    color: "#777",
    fontSize: 7,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  preReleaseTimeSeparator: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    marginHorizontal: 3,
  },
  preReleaseTimeText: {
    color: "#050505",
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
    marginTop: 1,
  },
  preReleaseTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
  },
  railRow: {
    flexDirection: "row",
    gap: 16,
  },
  section: {
    marginTop: 34,
    width: "100%",
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    paddingHorizontal: "5%",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: "5%",
  },
});
