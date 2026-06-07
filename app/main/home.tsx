import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  ImageBackground,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { usePlayer, type Track } from "../../context/PlayerContext";
import { getHomeContent } from "../../firebase/contentClient";
import { defaultUser } from "../../firebase/defaultContent";
import { setReleaseReminder } from "../../firebase/releaseReminderClient";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useResponsive } from "../../utils/responsive";
import FullscreenPostMedia from "./components/FullscreenMedia";

type FeaturedPost = {
  artist: string;
  avatar: string;
  caption: string;
  clipSource?: string;
  id: string;
  image: string;
  musicName: string;
};

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
  image: string;
  linkUrl: string;
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

const PLACEHOLDER_MUSIC: MusicItem[] = [
  {
    artist: "Sonnor",
    id: "placeholder-track-1",
    image: "",
    meta: "preview • 0 plays",
    title: "Nova energia",
    type: "track",
  },
  {
    artist: "Sonnor",
    id: "placeholder-track-2",
    image: "",
    meta: "preview • 0 plays",
    title: "Depois da meia-noite",
    type: "track",
  },
  {
    artist: "Sonnor",
    id: "placeholder-track-3",
    image: "",
    meta: "preview • 0 plays",
    title: "Studio take",
    type: "track",
  },
  {
    artist: "Sonnor",
    id: "placeholder-track-4",
    image: "",
    meta: "preview • 0 plays",
    title: "Em loop",
    type: "track",
  },
];

const PLACEHOLDER_POSTS: FeaturedPost[] = [
  {
    artist: "Sonnor",
    avatar: "",
    caption: "Quando houver posts publicados, eles entram aqui automaticamente.",
    id: "placeholder-post-1",
    image: "",
    musicName: "Post em destaque",
  },
  {
    artist: "Sonnor",
    avatar: "",
    caption: "Conteudo novo de quem segues e posts aleatorios para descoberta.",
    id: "placeholder-post-2",
    image: "",
    musicName: "Descoberta",
  },
  {
    artist: "Sonnor",
    avatar: "",
    caption: "Um espaco bonito para fotos, videos e clips ligados a musicas.",
    id: "placeholder-post-3",
    image: "",
    musicName: "Clip social",
  },
  {
    artist: "Sonnor",
    avatar: "",
    caption: "A grelha final mantem a home viva mesmo antes do Firebase estar cheio.",
    id: "placeholder-post-4",
    image: "",
    musicName: "Feed",
  },
];

function hasImage(value: string | undefined | null) {
  return typeof value === "string" && value.trim().length > 0;
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

function shuffleItems<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
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
  const { playQueue, playTrack } = usePlayer();
  const { user } = useCurrentUser();
  const { hp, wp } = useResponsive();
  const [showFull, setShowFull] = useState(false);
  const [fullType, setFullType] = useState<"image" | "video" | null>(null);
  const [fullSource, setFullSource] = useState<string | null>(null);
  const [fullPost, setFullPost] = useState<FeaturedPost | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<DetailItem | null>(null);
  const [homeData, setHomeData] = useState<Awaited<ReturnType<typeof getHomeContent>> | null>(null);
  const [releaseReminders, setReleaseReminders] = useState(() => new Set<string>());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let active = true;

    getHomeContent(user?.uid).then((content) => {
      if (active) {
        setHomeData(content);
      }
    });

    return () => {
      active = false;
    };
  }, [user?.uid]);

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

  const banner: HomeBanner = {
    title: getString(bannerConfig, "title", "Sonnor Radio"),
    subtitle: getString(
      bannerConfig,
      "subtitle",
      "Um destaque novo, pronto para trocares no Firebase quando quiseres.",
    ),
    image:
      getString(bannerConfig, "imageUrl") ||
      getString(bannerConfig, "image") ||
      defaultUser.bannerUrl,
    buttonLabel: getString(bannerConfig, "buttonLabel", "Abrir destaque"),
    targetType:
      (getString(bannerConfig, "targetType", "shop") as HomeBanner["targetType"]) ||
      "shop",
    targetId: getString(bannerConfig, "targetId"),
    linkUrl: getString(bannerConfig, "linkUrl") || getString(bannerConfig, "url"),
  };

  const allMusic = useMemo<MusicItem[]>(() => {
    const trackItems = tracks.map((track) => {
      const profile = userById.get(getString(track, "userId"));
      const artist = getString(profile, "displayName", defaultUser.displayName);

      return {
        artist,
        id: track.id,
        image: getString(track, "coverUrl"),
        meta: `${getString(track, "genre", "Musica")} • ${track.playsCount ?? 0} plays`,
        title: getString(track, "title", "Musica"),
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
        title: getString(album, "title", "Lancamento"),
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

    return recent && recent.length > 0
      ? uniqueBy(recent, getMusicKey).slice(0, 5)
      : shuffleItems(allMusic).slice(0, 5);
  }, [allMusic, homeData?.recentPlays]);

  const recommendedItems = useMemo(
    () =>
      shuffleItems(
        uniqueBy(
          [...allMusic].sort((left, right) => right.meta.localeCompare(left.meta)),
          getMusicKey,
        ),
      ).filter((item) => item.type === "track").slice(0, 5),
    [allMusic],
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
            meta: getString(track, "genre", "Musica"),
            title: getString(track, "title", "Musica"),
            type: "track" as const,
          };
        }),
    ).slice(0, 10);
  }, [preferredGenres, tracks, userById]);

  const randomTrackItems = useMemo(() => {
    const items = tracks.map((track) => {
      const profile = userById.get(getString(track, "userId"));
      const artist = getString(profile, "displayName", defaultUser.displayName);

      return {
        artist,
        id: track.id,
        image: getString(track, "coverUrl"),
        meta: getString(track, "genre", "Musica"),
        title: getString(track, "title", "Musica"),
        type: "track" as const,
      };
    });

    return shuffleItems(uniqueBy(items, getMusicKey)).slice(0, 10);
  }, [tracks, userById]);

  const upcomingRelease = useMemo(() => {
    const releases = homeData?.upcomingReleases ?? [];
    return releases.length > 0
      ? releases[Math.floor(Math.random() * releases.length)]
      : undefined;
  }, [homeData?.upcomingReleases]);
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
    if (!upcomingReleaseId || upcomingReleaseCountdownAt > Date.now()) {
      return;
    }

    const refresh = () => {
      getHomeContent(user?.uid).then(setHomeData).catch(() => null);
    };
    refresh();
    const timer = setInterval(refresh, 10000);
    return () => clearInterval(timer);
  }, [upcomingReleaseCountdownAt, upcomingReleaseId, user?.uid]);

  const followedMusic = useMemo(() => {
    const items = allMusic.filter((item) => {
      const source =
        tracks.find((track) => track.id === item.id) ??
        albums.find((album) => album.id === item.id);

      return item.type === "album" && source ? followedIds.has(getString(source, "userId")) : false;
    });

    const fallback = allMusic.filter((item) => item.type === "album");
    return shuffleItems(items.length > 0 ? uniqueBy(items, getMusicKey) : fallback).slice(0, 5);
  }, [albums, allMusic, followedIds, tracks]);

  const featuredPosts = useMemo<FeaturedPost[]>(() => {
    const firstTrackWithClip = tracks.find((track) => hasImage(getString(track, "shortVideoUrl")));

    const items = posts.map((post) => {
      const postUserId = getString(post, "userId");
      const profile = userById.get(postUserId);
      const linkedTrackId = getString(post, "linkedTrackId");
      const linkedTrack = tracks.find((track) => track.id === linkedTrackId);
      const userTrackWithClip = tracks.find(
        (track) =>
          getString(track, "userId") === postUserId &&
          hasImage(getString(track, "shortVideoUrl")),
      );
      const userTrack = tracks.find((track) => getString(track, "userId") === postUserId);
      const displayTrack = linkedTrack ?? userTrackWithClip ?? userTrack ?? firstTrackWithClip;

      return {
        artist: getString(profile, "displayName", getString(post, "artist", "Perfil")),
        avatar: getString(profile, "avatarUrl", defaultUser.avatarUrl),
        caption: getString(post, "caption", "Novo conteudo disponivel na Sonnor."),
        clipSource:
          getString(post, "linkedTrackShortVideoUrl") ||
          getString(linkedTrack, "shortVideoUrl") ||
          getString(userTrackWithClip, "shortVideoUrl") ||
          getString(firstTrackWithClip, "shortVideoUrl"),
        id: post.id,
        image: getString(post, "mediaUrl") || getString(post, "thumbnailUrl"),
        musicName: getString(displayTrack, "title") || getString(post, "title"),
      };
    });

    return items.length > 0 ? uniqueBy(items, (post) => post.id) : PLACEHOLDER_POSTS;
  }, [posts, tracks, userById]);

  const merchItems = useMemo<MerchItem[]>(() => {
    return shuffleItems(uniqueBy(users.filter((profile) => (profile.uid || profile.id) !== user?.uid).flatMap((profile) => {
      const products = Array.isArray(profile.merchProducts) ? profile.merchProducts : [];
      const artist = getString(profile, "displayName", "Artista");
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
    }), (item) => item.id)).slice(0, 10);
  }, [user?.uid, users]);

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
        artist: getString(profile, "displayName", "Artista"),
        id: profile.uid || profile.id,
        linkUrl: getString(profile, "shopUrl"),
        logoUrl: getString(profile, "merchLogoUrl"),
        name:
          getString(profile, "merchName") ||
          `${getString(profile, "displayName", "Artista")} merch`,
      }));

    return shuffleItems(uniqueBy(items, (brand) => brand.id)).slice(0, 10);
  }, [user?.uid, users]);

  function openMusic(item: MusicItem) {
    if (item.id.startsWith("placeholder")) {
      setSelectedDetail({
        description: "Assim que publicares musicas no Firebase, este bloco abre a musica real.",
        image: item.image,
        subtitle: item.artist,
        title: item.title,
      });
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
          title: getString(entry, "title", "Musica"),
          artist: item.artist,
          cover: getString(entry, "coverUrl") || item.image,
          genre: getString(entry, "genre"),
          shortVideo: getString(entry, "shortVideoUrl"),
          lyrics: getString(entry, "lyrics"),
          albumId: item.id,
          source: "home" as const,
        }))
        .filter((entry) => entry.uri);

      await playQueue(queue);
      return;
    }

    const source = tracks.find((entry) => entry.id === item.id);
    const uri = getString(source, "audioUrl");

    if (source && uri) {
      await playTrack({
        id: source.id,
        uri,
        title: item.title,
        artist: item.artist,
        cover: item.image,
        genre: getString(source, "genre"),
        shortVideo: getString(source, "shortVideoUrl"),
        lyrics: getString(source, "lyrics"),
        albumId: getString(source, "albumId"),
        source: "home",
      });
    }
  }

  function openPost(post: FeaturedPost) {
    if (!hasImage(post.image) && !hasImage(post.clipSource)) {
      setSelectedDetail({
        description: post.caption,
        image: post.image,
        subtitle: post.musicName,
        title: post.artist,
      });
      return;
    }

    setFullPost(post);
    setFullType(post.clipSource ? "video" : "image");
    setFullSource(post.clipSource || post.image);
    setShowFull(true);
  }

  function openBanner() {
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 230, paddingTop: hp(7) }}
      >
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.kicker}>Boa escuta</Text>
            <Text style={styles.pageTitle}>Inicio</Text>
          </View>
          <Pressable style={styles.searchButton} onPress={() => router.push("/main/search")}>
            <Ionicons name="search" size={20} color="#fff" />
          </Pressable>
        </View>

        <Pressable style={styles.heroWrap} onPress={openBanner}>
          <MediaBox
            imageStyle={styles.heroImage}
            uri={banner.image}
            style={[styles.heroBanner, { height: hp(29) }]}
          >
            <View style={styles.heroShade} />
            <View style={styles.heroContent}>
              <View>
                <Text style={styles.heroEyebrow}>Destaque Firebase</Text>
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {banner.title}
                </Text>
                <Text style={styles.heroSubtitle} numberOfLines={2}>
                  {banner.subtitle}
                </Text>
              </View>
              <View style={styles.heroButton}>
                <Ionicons name="play" size={16} color="#06110d" />
                <Text style={styles.heroButtonText}>{banner.buttonLabel}</Text>
              </View>
            </View>
          </MediaBox>
        </Pressable>

        {upcomingRelease ? (
          <View style={styles.preReleaseSection}>
            <SectionHeader title="Pré-lançamento" />
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
                  {getString(upcomingRelease, "title", "Novo lançamento")}
                </Text>
                <Text numberOfLines={1} style={styles.preReleaseMeta}>
                  {upcomingReleaseArtist} • {getString(upcomingRelease, "type", "lançamento")} •{" "}
                  {Array.isArray(upcomingRelease.trackIds) ? upcomingRelease.trackIds.length : 0} faixas
                </Text>
                <View style={styles.preReleaseActions}>
                  <View style={styles.preReleaseTime}>
                    {getCountdownParts(upcomingReleaseCountdownTarget, now).map((part, index) => (
                      <React.Fragment key={index}>
                        {index > 0 ? <Text style={styles.preReleaseTimeSeparator}>:</Text> : null}
                        <View style={styles.preReleaseTimeBox}>
                          <Text style={styles.preReleaseTimeBoxLabel}>
                            {["Hora", "Min", "Seg"][index]}
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

        <MusicRail
          items={continueItems}
          onPress={openMusic}
          onPlay={playMusic}
          title="Continuar a escutar"
          width={wideCardWidth}
        />

        <MusicRail
          items={recommendedItems}
          onPress={openMusic}
          onPlay={playMusic}
          title="Recomendados"
          width={cardWidth}
        />

        {tasteItems.length > 0 ? (
          <MusicRail
            items={tasteItems}
            onPress={openMusic}
            onPlay={playMusic}
            title="Para o teu gosto"
            width={cardWidth}
          />
        ) : null}

        {randomTrackItems.length > 0 ? (
          <MusicRail
            items={randomTrackItems}
            onPress={openMusic}
            onPlay={playMusic}
            title="Músicas que talvez gostes"
            width={cardWidth}
          />
        ) : null}

        <MusicRail
          items={followedMusic}
          onPress={openMusic}
          onPlay={playMusic}
          title="De quem segues"
          width={cardWidth}
        />

        {merchBrands.length > 0 || merchItems.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Merch dos artistas" />

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
                  onPress={() =>
                    brand.linkUrl
                      ? Linking.openURL(brand.linkUrl).catch(() => null)
                      : setSelectedDetail({
                          description:
                            "Adiciona merchLogoUrl e shopUrl no perfil do artista para este logo abrir a loja.",
                          image: brand.logoUrl,
                          subtitle: brand.artist,
                          title: brand.name,
                        })
                  }
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
                  onPress={() =>
                    item.linkUrl
                      ? Linking.openURL(item.linkUrl).catch(() => null)
                      : setSelectedDetail({
                          description: "Quando adicionares o link da loja no Firebase, este bloco abre a loja diretamente.",
                          image: item.image,
                          subtitle: item.artist,
                          title: item.title,
                        })
                  }
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
            action="Ver todos"
            onPress={() => router.push("/main/search")}
            title="Posts"
          />
          <View style={styles.homePostsGrid}>
            {shuffleItems(featuredPosts).slice(0, 9).map((post, index) => (
              <Pressable
                key={post.id}
                style={styles.homePostTile}
                onPress={() => openPost(post)}
              >
                <MediaBox
                  fallbackIndex={index}
                  uri={post.image}
                  style={styles.gridPost}
                >
                  <View style={styles.postShade} />
                  <Text numberOfLines={2} style={styles.gridPostText}>
                    {post.artist}
                  </Text>
                </MediaBox>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.finalBand}>
          <View style={styles.finalIcon}>
            <Ionicons name="sparkles" size={20} color="#06110d" />
          </View>
          <View style={styles.finalCopy}>
            <Text style={styles.finalTitle}>O teu som, sempre vivo</Text>
            <Text style={styles.finalText}>
              A home mistura musica, posts, artistas e loja para ficares sempre a um toque do que importa.
            </Text>
          </View>
        </View>
      </ScrollView>

      {showFull && fullType && fullSource && (
        <FullscreenPostMedia
          visible={showFull}
          onClose={() => {
            setShowFull(false);
            setFullPost(null);
          }}
          post={fullPost ?? undefined}
          type={fullType}
          source={fullSource}
        />
      )}
    </View>
  );
}

function MusicRail({
  items,
  onPress,
  onPlay,
  title,
  width,
}: {
  items: MusicItem[];
  onPress: (item: MusicItem) => void;
  onPlay: (item: MusicItem) => void;
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
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.playChip,
                    pressed ? styles.playButtonPressed : null,
                  ]}
                  onPress={(event) => {
                    event.stopPropagation();
                    void onPlay(item);
                  }}
                >
                  <Ionicons name="play" size={16} color="#06110d" />
                </Pressable>
              </MediaBox>
              <Text numberOfLines={1} style={styles.cardTitle}>
                {item.title}
              </Text>
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
  finalBand: {
    alignItems: "center",
    backgroundColor: "#d9efe9",
    borderRadius: 26,
    flexDirection: "row",
    gap: 14,
    marginHorizontal: "5%",
    marginTop: 34,
    padding: 18,
  },
  finalCopy: {
    flex: 1,
  },
  finalIcon: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  finalText: {
    color: "#29413a",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  finalTitle: {
    color: "#06110d",
    fontSize: 16,
    fontWeight: "900",
  },
  gridPost: {
    borderRadius: 0,
    justifyContent: "flex-end",
    overflow: "hidden",
    padding: 6,
    height: "100%",
    width: "100%",
  },
  gridPostText: {
    color: "#b9b9b9",
    fontSize: 12,
    fontWeight: "700",
  },
  homePostsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  homePostTile: {
    aspectRatio: 0.76,
    backgroundColor: "#0f0f0f",
    borderColor: "#000",
    borderWidth: 1,
    overflow: "hidden",
    width: "33.3333%",
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
  heroBanner: {
    justifyContent: "flex-end",
    overflow: "hidden",
    width: "100%",
  },
  heroImage: { borderRadius: 0 },
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
  heroTitle: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 0,
  },
  heroWrap: {
    marginTop: 20,
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
  },
  merchProductsContent: {
    paddingHorizontal: "5%",
    paddingTop: 14,
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
  playChip: {
    alignItems: "center",
    backgroundColor: "#d9efe9",
    borderRadius: 17,
    bottom: 12,
    height: 34,
    justifyContent: "center",
    position: "absolute",
    right: 12,
    width: 34,
  },
  playButtonPressed: { opacity: 0.42, transform: [{ scale: 0.9 }] },
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
  postShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  railRow: {
    flexDirection: "row",
    gap: 16,
  },
  searchButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
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
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: "5%",
  },
});
