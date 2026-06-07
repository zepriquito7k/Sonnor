import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { usePlayer, type Track } from "../../context/PlayerContext";
import { getAlbumContent, getProfileContent } from "../../firebase/contentClient";
import { deletePost } from "../../firebase/contentMutations";
import type { PostDocument, UserDocument } from "../../firebase/schema";
import {
  countUserFollowers,
  createFollow,
  isFollowingUser,
  removeFollow,
} from "../../firebase/socialClient";
import {
  uploadUriToStorage,
  withCacheBust,
} from "../../firebase/storageClient";
import { updateUserProfile } from "../../firebase/userProfile";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { pickLibraryAsset } from "../../utils/mediaPicker";
import { useResponsive } from "../../utils/responsive";

type TrackItem = {
  id: string;
  albumId?: string;
  title: string;
  coverUrl: string;
  shortVideoUrl: string;
  genre: string;
  lyrics: string;
  audioUrl: string;
  likesCount: number;
  playsCount: number;
  releaseDate?: unknown;
};

type AlbumItem = {
  id: string;
  title: string;
  coverUrl: string;
  releaseDate?: unknown;
  preReleaseEnabled: boolean;
  preReleaseHighlightUntil?: unknown;
  status: string;
  trackIds: string[];
  type: "album" | "single" | "ep";
};

type PostItem = {
  id: string;
  ownerId: string;
  caption: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  thumbnailUrl: string;
  mediaScale: number;
  likesCount: number;
  linkedTrackId: string;
  linkedTrackTitle: string;
  linkedTrackCoverUrl: string;
  authorName: string;
  authorAvatarUrl: string;
  overlayMedia: NonNullable<PostDocument["overlayMedia"]>;
};

type MerchProduct = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  price?: string;
  currency?: string;
  description?: string;
};

type MerchGalleryItem = {
  id: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string;
};

type ProfileExtras = UserDocument & {
  spotifyUrl?: string;
  merchLogoUrl?: string;
  merchName?: string;
  shopUrl?: string;
  merchProducts?: MerchProduct[];
  merchGallery?: MerchGalleryItem[];
};

const PROFILE_FIELD_LABELS: Record<string, string> = {
  birthDate: "Nascimento",
  location: "Localizacao",
  interests: "Estilos",
};

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : fallback;
}

function relativeDate(value: unknown) {
  let date: Date | null = null;

  if (value instanceof Date) date = value;
  else if (value && typeof value === "object" && "toDate" in value) {
    date = (value as { toDate: () => Date }).toDate();
  } else if (value && typeof value === "object" && "seconds" in value) {
    date = new Date((value as { seconds: number }).seconds * 1000);
  }

  if (!date) return "Agora";

  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 7) return `${days} dias atras`;
  if (days < 60) {
    const weeks = Math.floor(days / 7);
    return `${weeks} ${weeks === 1 ? "semana" : "semanas"} atras`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} ${months === 1 ? "mes" : "meses"} atras`;
  }
  return String(date.getFullYear());
}

function dateMillis(value: unknown) {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  if (value && typeof value === "object" && "seconds" in value) {
    return (value as { seconds: number }).seconds * 1000;
  }
  return 0;
}

function countdownLabel(value: unknown, now: number) {
  const total = Math.max(0, Math.floor((dateMillis(value) - now) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function countdownParts(value: unknown, now: number) {
  return countdownLabel(value, now).split(":");
}

function openUrl(url?: string) {
  const cleanUrl = url?.trim();

  if (!cleanUrl) {
    return;
  }

  Linking.openURL(cleanUrl).catch((error) =>
    console.log("OPEN PROFILE URL ERROR:", error),
  );
}

function MediaBox({ uri, style }: { uri?: string; style: object }) {
  if (uri) {
    return <Image source={{ uri }} style={style} />;
  }

  return (
    <View style={[style, styles.mediaFallback]}>
      <Ionicons name="image-outline" size={24} color="#777" />
    </View>
  );
}

function ProfileVideoPreview({
  uri,
  style,
  contentFit = "contain",
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

function formatLikesLabel(count: number) {
  if (count >= 1000000) {
    const value = count / 1000000;
    return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}M curtidas`;
  }

  if (count >= 1000) {
    const value = count / 1000;
    return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}k curtidas`;
  }

  return `${count} curtidas`;
}

function PostGridTile({
  post,
  onPress,
}: {
  post: PostItem;
  onPress: () => void;
}) {
  const [tileSize, setTileSize] = useState({ width: 0, height: 0 });
  const imageUri = post.thumbnailUrl || post.mediaUrl;
  const isVideo = post.mediaType === "video";

  return (
    <TouchableOpacity
      style={styles.postGridTile}
      activeOpacity={0.88}
      onLayout={(event) => setTileSize(event.nativeEvent.layout)}
      onPress={onPress}
    >
      {imageUri && !isVideo ? (
        <Image source={{ uri: imageUri }} style={styles.postGridImage} />
      ) : imageUri && isVideo ? (
        <ProfileVideoPreview
          uri={imageUri}
          style={styles.postGridImage}
          contentFit="cover"
        />
      ) : (
        <View style={styles.postGridVideoFallback}>
          <Ionicons name="play" size={28} color="#fff" />
        </View>
      )}

      {post.overlayMedia.map((overlay) => {
        const stageWidth = overlay.stageWidth || 1;
        const stageHeight = overlay.stageHeight || 1;
        const scaleX = tileSize.width / stageWidth;
        const scaleY = tileSize.height / stageHeight;
        const scaledWidth = overlay.baseWidth * overlay.scale;
        const scaledHeight = overlay.baseHeight * overlay.scale;
        const offsetX = (scaledWidth - overlay.baseWidth) / 2;
        const offsetY = (scaledHeight - overlay.baseHeight) / 2;

        return (
          <Image
            key={overlay.id}
            source={{ uri: overlay.mediaUrl }}
            style={[
              styles.postOverlayImage,
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
          {formatLikesLabel(post.likesCount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function FullscreenPost({
  post,
  onClose,
  onDelete,
  canDelete,
}: {
  post: PostItem;
  onClose: () => void;
  onDelete: (post: PostItem) => void;
  canDelete: boolean;
}) {
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const imageUri = post.thumbnailUrl || post.mediaUrl;
  const isVideo = post.mediaType === "video";

  return (
    <View style={styles.fullPostRoot}>
      <View
        style={styles.fullPostStage}
        onLayout={(event) => setStageSize(event.nativeEvent.layout)}
      >
        {imageUri && !isVideo ? (
          <Image
            source={{ uri: imageUri }}
            style={[
              styles.fullPostMedia,
              { transform: [{ scale: post.mediaScale || 1 }] },
            ]}
          />
        ) : imageUri && isVideo ? (
          <ProfileVideoPreview
            uri={imageUri}
            style={styles.fullPostMedia}
            contentFit="contain"
            scale={post.mediaScale || 1}
          />
        ) : (
          <View style={styles.fullPostVideoFallback}>
            <Ionicons name="play" size={42} color="#fff" />
          </View>
        )}

        {post.overlayMedia.map((overlay) => {
          const stageWidth = overlay.stageWidth || 1;
          const stageHeight = overlay.stageHeight || 1;
          const scaleX = stageSize.width / stageWidth;
          const scaleY = stageSize.height / stageHeight;
          const scaledWidth = overlay.baseWidth * overlay.scale;
          const scaledHeight = overlay.baseHeight * overlay.scale;
          const offsetX = (scaledWidth - overlay.baseWidth) / 2;
          const offsetY = (scaledHeight - overlay.baseHeight) / 2;

          return (
            <Image
              key={overlay.id}
              source={{ uri: overlay.mediaUrl }}
              style={[
                styles.fullPostOverlayImage,
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

      <TouchableOpacity style={styles.fullPostClose} onPress={onClose}>
        <Ionicons name="chevron-back" size={28} color="#fff" />
      </TouchableOpacity>

      {canDelete ? (
        <TouchableOpacity
          style={styles.fullPostMenuButton}
          onPress={() => onDelete(post)}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
        </TouchableOpacity>
      ) : null}

      {post.linkedTrackTitle ? (
        <View style={styles.fullPostMusicInside}>
          <Text style={styles.fullPostMusicTitle} numberOfLines={1}>
            {post.linkedTrackTitle}
          </Text>
        </View>
      ) : null}

      <View style={styles.fullPostBottom}>
        <View style={styles.fullPostProfileRow}>
          {post.authorAvatarUrl ? (
            <Image
              source={{ uri: post.authorAvatarUrl }}
              style={styles.fullPostAvatar}
            />
          ) : (
            <View style={[styles.fullPostAvatar, styles.mediaFallback]}>
              <Ionicons name="person-outline" size={20} color="#fff" />
            </View>
          )}

          <View style={styles.fullPostTextBlock}>
            <Text style={styles.fullPostAuthor} numberOfLines={1}>
              {post.authorName || "Perfil"}
            </Text>
            {post.caption ? (
              <Text style={styles.fullPostCaption} numberOfLines={3}>
                {post.caption}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.fullPostSongCoverBox}>
          {post.linkedTrackCoverUrl ? (
            <Image
              source={{ uri: post.linkedTrackCoverUrl }}
              style={styles.fullPostSongCover}
            />
          ) : (
            <Ionicons name="musical-notes-outline" size={22} color="#fff" />
          )}
        </View>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string }>();
  const { user } = useCurrentUser();
  const { playQueue } = usePlayer();
  const { hp, font, wp } = useResponsive();
  const scrollY = useRef(new Animated.Value(0)).current;

  const viewedUserId = params.userId || user?.uid || null;
  const isOwnProfile = !params.userId || params.userId === user?.uid;

  const [profileUser, setProfileUser] = useState<ProfileExtras | null>(null);
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [editMenuVisible, setEditMenuVisible] = useState(false);
  const [avatarEditorVisible, setAvatarEditorVisible] = useState(false);
  const [merchEditorVisible, setMerchEditorVisible] = useState(false);
  const [connectEditorVisible, setConnectEditorVisible] = useState(false);
  const [activePostIndex, setActivePostIndex] = useState<number | null>(null);
  const [merchMode, setMerchMode] = useState<
    "home" | "logo" | "product" | "gallery"
  >("home");
  const [selectedProduct, setSelectedProduct] = useState<MerchProduct | null>(
    null,
  );

  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [merchLogoUrl, setMerchLogoUrl] = useState("");
  const [merchName, setMerchName] = useState("");
  const [shopUrl, setShopUrl] = useState("");
  const [merchProducts, setMerchProducts] = useState<MerchProduct[]>([]);
  const [merchGallery, setMerchGallery] = useState<MerchGalleryItem[]>([]);
  const [productTitle, setProductTitle] = useState("");
  const [productLink, setProductLink] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCurrency, setProductCurrency] = useState("EUR");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [countdownNow, setCountdownNow] = useState(Date.now());
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCountdownNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const content = await getProfileContent(viewedUserId);

      if (!active) {
        return;
      }

      const loadedUser = content.user as ProfileExtras;
      setProfileUser(loadedUser);
      setFollowersCount(asNumber(loadedUser.followersCount));
      setSpotifyUrl(asString(loadedUser.spotifyUrl));
      setMerchLogoUrl(asString(loadedUser.merchLogoUrl));
      setMerchName(asString(loadedUser.merchName, "Merchandise"));
      setShopUrl(asString(loadedUser.shopUrl));
      setMerchProducts(
        Array.isArray(loadedUser.merchProducts) ? loadedUser.merchProducts : [],
      );
      setMerchGallery(
        Array.isArray(loadedUser.merchGallery) ? loadedUser.merchGallery : [],
      );

      setTracks(
        content.tracks
          .map((track, index) => ({
            id: asString("id" in track ? track.id : "", `track-${index}`),
            albumId: asString("albumId" in track ? track.albumId : ""),
            title: asString("title" in track ? track.title : "", "Musica"),
            coverUrl: asString("coverUrl" in track ? track.coverUrl : ""),
            shortVideoUrl: asString(
              "shortVideoUrl" in track ? track.shortVideoUrl : "",
            ),
            genre: asString("genre" in track ? track.genre : ""),
            lyrics: asString("lyrics" in track ? track.lyrics : ""),
            audioUrl: asString("audioUrl" in track ? track.audioUrl : ""),
            likesCount: asNumber("likesCount" in track ? track.likesCount : 0),
            playsCount: asNumber("playsCount" in track ? track.playsCount : 0),
            releaseDate:
              ("releaseDate" in track ? track.releaseDate : undefined) ??
              ("createdAt" in track ? track.createdAt : undefined),
          }))
          .filter((track) => track.audioUrl),
      );

      setAlbums(
        content.albums.map((album, index) => ({
          id: asString("id" in album ? album.id : "", `album-${index}`),
          title: asString("title" in album ? album.title : "", "Album"),
          coverUrl: asString("coverUrl" in album ? album.coverUrl : ""),
          releaseDate:
            ("releaseDate" in album ? album.releaseDate : undefined) ??
            ("createdAt" in album ? album.createdAt : undefined),
          preReleaseEnabled:
            "preReleaseEnabled" in album && album.preReleaseEnabled === true,
          preReleaseHighlightUntil:
            "preReleaseHighlightUntil" in album
              ? album.preReleaseHighlightUntil
              : undefined,
          status: asString("status" in album ? album.status : "", "published"),
          type:
            asString("type" in album ? album.type : "album") === "ep"
              ? "ep"
              : asString("type" in album ? album.type : "album") === "single"
                ? "single"
                : "album",
          trackIds: Array.isArray("trackIds" in album ? album.trackIds : [])
            ? (("trackIds" in album ? album.trackIds : []) as string[])
            : [],
        })),
      );
      const tracksById = new Map(
        content.tracks.map((track) => [
          asString("id" in track ? track.id : ""),
          track,
        ]),
      );

      setPosts(
        content.posts.map((post, index) => {
          const linkedTrackId = asString(
            "linkedTrackId" in post ? post.linkedTrackId : "",
          );
          const linkedTrack = tracksById.get(linkedTrackId);

          return {
            id: asString("id" in post ? post.id : "", `post-${index}`),
            ownerId: asString("userId" in post ? post.userId : ""),
            caption: asString("caption" in post ? post.caption : ""),
            mediaType:
              asString("mediaType" in post ? post.mediaType : "image") ===
              "video"
                ? "video"
                : "image",
            mediaUrl: asString("mediaUrl" in post ? post.mediaUrl : ""),
            thumbnailUrl: asString(
              "thumbnailUrl" in post ? post.thumbnailUrl : "",
            ),
            mediaScale: asNumber("mediaScale" in post ? post.mediaScale : 1, 1),
            likesCount: asNumber("likesCount" in post ? post.likesCount : 0),
            linkedTrackId,
            linkedTrackTitle: asString(
              linkedTrack && "title" in linkedTrack ? linkedTrack.title : "",
            ),
            linkedTrackCoverUrl: asString(
              linkedTrack && "coverUrl" in linkedTrack
                ? linkedTrack.coverUrl
                : "",
            ),
            authorName:
              loadedUser.displayName || loadedUser.username || "Perfil",
            authorAvatarUrl: asString(loadedUser.avatarUrl),
            overlayMedia: Array.isArray(
              "overlayMedia" in post ? post.overlayMedia : [],
            )
              ? (("overlayMedia" in post
                  ? post.overlayMedia
                  : []) as NonNullable<PostDocument["overlayMedia"]>)
              : [],
          };
        }),
      );
    }

    loadProfile().catch((error) => console.log("LOAD PROFILE ERROR:", error));

    return () => {
      active = false;
    };
  }, [profileRefreshKey, viewedUserId]);

  useEffect(() => {
    let active = true;

    async function loadFollowState() {
      if (!user?.uid || !viewedUserId || isOwnProfile) {
        setIsFollowing(false);
        return;
      }

      const [nextIsFollowing, nextFollowersCount] = await Promise.all([
        isFollowingUser(user.uid, viewedUserId),
        countUserFollowers(viewedUserId),
      ]);

      if (active) {
        setIsFollowing(nextIsFollowing);
        setFollowersCount(nextFollowersCount);
      }
    }

    loadFollowState().catch((error) =>
      console.log("LOAD FOLLOW ERROR:", error),
    );

    return () => {
      active = false;
    };
  }, [isOwnProfile, user?.uid, viewedUserId]);

  const displayName =
    profileUser?.displayName ||
    profileUser?.username ||
    user?.displayName ||
    "Perfil";
  const avatarUrl = profileUser?.avatarUrl || "";
  const heroImageUrl = avatarUrl || profileUser?.bannerUrl || "";
  const profileLocation = [profileUser?.city, profileUser?.country]
    .map((item) => asString(item).trim())
    .filter(Boolean)
    .join(", ");
  const profileBirthDate = asString(profileUser?.birthDate).trim();
  const profileInterests = Array.isArray(profileUser?.interests)
    ? profileUser.interests.filter(Boolean).join(", ")
    : "";
  const profileHiddenFields = Array.isArray(profileUser?.profileHiddenFields)
    ? profileUser.profileHiddenFields
    : [];
  const showProfileLocation =
    profileLocation && !profileHiddenFields.includes("location");
  const showProfileBirthDate =
    profileBirthDate && !profileHiddenFields.includes("birthDate");
  const showProfileInterests =
    profileInterests && !profileHiddenFields.includes("interests");
  const publicInfoRows = [
    showProfileLocation
      ? {
          icon: "location-outline" as const,
          label: "Localizacao",
          value: profileLocation,
        }
      : null,
    showProfileBirthDate
      ? {
          icon: "calendar-outline" as const,
          label: "Nascimento",
          value: profileBirthDate,
        }
      : null,
    showProfileInterests
      ? {
          icon: "musical-notes-outline" as const,
          label: "Estilos",
          value: profileInterests,
        }
      : null,
  ].filter(Boolean) as {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    label: string;
    value: string;
  }[];
  const BANNER_HEIGHT = hp(43);
  const BANNER_MIN_HEIGHT = hp(15);
  const COLLAPSE_DISTANCE = BANNER_HEIGHT - BANNER_MIN_HEIGHT;
  const MAX_STRETCH = hp(25);

  const bannerHeight = scrollY.interpolate({
    inputRange: [-MAX_STRETCH, 0, COLLAPSE_DISTANCE],
    outputRange: [
      BANNER_HEIGHT + MAX_STRETCH,
      BANNER_HEIGHT,
      BANNER_MIN_HEIGHT,
    ],
    extrapolate: "clamp",
  });
  const imageScale = scrollY.interpolate({
    inputRange: [-MAX_STRETCH, 0, COLLAPSE_DISTANCE],
    outputRange: [1.35, 1.12, 1.22],
    extrapolate: "clamp",
  });
  const imageTranslateY = scrollY.interpolate({
    inputRange: [-MAX_STRETCH, 0, COLLAPSE_DISTANCE],
    outputRange: [-22, -12, -8],
    extrapolate: "clamp",
  });
  const bannerContentOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_DISTANCE * 0.6, COLLAPSE_DISTANCE],
    outputRange: [1, 0.35, 0],
    extrapolate: "clamp",
  });
  const compactContentOpacity = scrollY.interpolate({
    inputRange: [COLLAPSE_DISTANCE * 0.55, COLLAPSE_DISTANCE],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const compactContentTranslateY = scrollY.interpolate({
    inputRange: [COLLAPSE_DISTANCE * 0.55, COLLAPSE_DISTANCE],
    outputRange: [8, 0],
    extrapolate: "clamp",
  });

  const mostLikedTrack = useMemo(
    () => {
      const track = [...tracks].sort(
        (left, right) => right.likesCount - left.likesCount,
      )[0];
      return track && track.likesCount > 0 ? track : null;
    },
    [tracks],
  );
  const profilePreRelease = albums.find(
    (album) =>
      (album.preReleaseEnabled && album.status === "scheduled") ||
      (album.status === "published" &&
        dateMillis(album.preReleaseHighlightUntil) > countdownNow),
  );
  const profilePreReleaseCountdownTarget =
    profilePreRelease?.status === "published"
      ? profilePreRelease.preReleaseHighlightUntil
      : profilePreRelease?.releaseDate;
  const profilePreReleaseCountdownAt = dateMillis(profilePreReleaseCountdownTarget);
  const profilePreReleaseId = profilePreRelease?.id;
  const publishedAlbums = albums.filter((album) => album.status === "published");
  const albumReleases = publishedAlbums.filter((album) => album.type === "album");
  const singleAndEpReleases = publishedAlbums.filter((album) => album.type !== "album");

  useEffect(() => {
    if (!profilePreReleaseId || profilePreReleaseCountdownAt > Date.now()) {
      return;
    }

    const timer = setInterval(() => setProfileRefreshKey((current) => current + 1), 10000);
    return () => clearInterval(timer);
  }, [profilePreReleaseCountdownAt, profilePreReleaseId]);

  async function handleFollowPress() {
    if (!user?.uid || !viewedUserId || isOwnProfile || followLoading) {
      return;
    }

    try {
      setFollowLoading(true);

      if (isFollowing) {
        await removeFollow(user.uid, viewedUserId);
        setIsFollowing(false);
        setFollowersCount((current) => Math.max(0, current - 1));
      } else {
        await createFollow(user.uid, viewedUserId);
        setIsFollowing(true);
        setFollowersCount((current) => current + 1);
      }
    } catch (error) {
      console.log("FOLLOW PROFILE ERROR:", error);
      Alert.alert(
        "Nao foi possivel",
        "Tenta novamente dentro de alguns segundos.",
      );
    } finally {
      setFollowLoading(false);
    }
  }

  function getPostMediaUrls(post: PostItem) {
    return [
      post.mediaUrl,
      post.thumbnailUrl,
      ...post.overlayMedia.map((overlay) => overlay.mediaUrl),
    ];
  }

  function handleDeletePost(post: PostItem) {
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
              mediaUrls: getPostMediaUrls(post),
            });
            setPosts((current) =>
              current.filter((item) => item.id !== post.id),
            );
            setActivePostIndex(null);
          } catch (error) {
            console.log("DELETE PROFILE POST ERROR:", error);
            Alert.alert("Erro", "Nao foi possivel apagar o post agora.");
          }
        },
      },
    ]);
  }

  async function pickAndUpload(
    target: "avatar" | "logo" | "product" | "gallery",
  ) {
    if (!user?.uid) {
      return null;
    }

    const asset = await pickLibraryAsset({
      allowsEditing: target === "avatar",
      aspect: target === "avatar" ? [1, 1] : undefined,
      mediaTypes: target === "gallery" ? ["images", "videos"] : "images",
      quality: 0.9,
    });

    if (!asset) {
      return null;
    }

    const uploadTarget =
      target === "avatar"
        ? { kind: "avatar" as const, userId: user.uid }
        : {
            kind: "temp" as const,
            userId: user.uid,
            uploadId: `${target}-${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`,
          };

    const upload = await uploadUriToStorage(uploadTarget, asset.uri);

    return {
      url: withCacheBust(upload.downloadUrl),
      type: asset.type === "video" ? ("video" as const) : ("image" as const),
    };
  }

  async function handlePickAvatar() {
    try {
      const result = await pickAndUpload("avatar");

      if (!result || !user?.uid) {
        return;
      }

      await updateUserProfile(user.uid, {
        avatarUrl: result.url,
        bannerUrl: result.url,
      });
      setProfileUser((current) =>
        current
          ? { ...current, avatarUrl: result.url, bannerUrl: result.url }
          : current,
      );
      setAvatarEditorVisible(false);
    } catch (error) {
      console.log("PICK AVATAR ERROR:", error);
      Alert.alert(
        "Galeria indisponivel",
        "Nao foi possivel abrir a galeria. Confirma a permissao das Fotos para o Sonnor.",
      );
    }
  }

  async function handlePickLogo() {
    const result = await pickAndUpload("logo");

    if (!result || !user?.uid) {
      return;
    }

    setMerchLogoUrl(result.url);
    await updateUserProfile(user.uid, { merchLogoUrl: result.url });
  }

  async function handlePickProductImage() {
    const result = await pickAndUpload("product");

    if (result) {
      setProductImageUrl(result.url);
    }
  }

  async function handleAddGalleryItem() {
    const result = await pickAndUpload("gallery");

    if (!result || !user?.uid) {
      return;
    }

    const nextGallery = [
      {
        id: `gallery-${Date.now()}`,
        mediaUrl: result.url,
        mediaType: result.type,
      },
      ...merchGallery,
    ];

    setMerchGallery(nextGallery);
    await updateUserProfile(user.uid, { merchGallery: nextGallery });
    setMerchEditorVisible(false);
    setMerchMode("home");
  }

  function handleDeleteGalleryItem(itemId: string) {
    if (!user?.uid) {
      return;
    }

    Alert.alert(
      "Remover da galeria",
      "Queres remover esta foto ou video do merchandise?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            const nextGallery = merchGallery.filter(
              (item) => item.id !== itemId,
            );

            setMerchGallery(nextGallery);
            await updateUserProfile(user.uid, { merchGallery: nextGallery });
            setMerchEditorVisible(false);
            setMerchMode("home");
          },
        },
      ],
    );
  }

  async function handleSaveSpotify() {
    if (!user?.uid) {
      return;
    }

    await updateUserProfile(user.uid, {
      spotifyUrl: spotifyUrl.trim(),
    });
    setConnectEditorVisible(false);
    Alert.alert("Guardado", "Spotify conectado ao perfil.");
  }

  async function handleSaveMerchBrand() {
    if (!user?.uid) {
      return;
    }

    await updateUserProfile(user.uid, {
      merchLogoUrl,
      merchName: merchName.trim() || "Merchandise",
      shopUrl: shopUrl.trim(),
    });
    setMerchEditorVisible(false);
    setMerchMode("home");
    Alert.alert("Guardado", "Merchandise atualizado no perfil.");
  }

  async function handleSaveProduct() {
    if (!user?.uid || !productTitle.trim() || !productImageUrl) {
      Alert.alert("Produto incompleto", "Escreve o nome e escolhe uma imagem para a peca.");
      return;
    }

    const nextProduct: MerchProduct = {
      id: selectedProduct?.id ?? `product-${Date.now()}`,
      title: productTitle.trim(),
      imageUrl: productImageUrl,
      linkUrl: productLink.trim(),
      price: productPrice.trim(),
      currency: productCurrency,
    };

    const nextProducts = selectedProduct
      ? merchProducts.map((product) =>
          product.id === selectedProduct.id ? nextProduct : product,
        )
      : [nextProduct, ...merchProducts];

    setMerchProducts(nextProducts);
    await updateUserProfile(user.uid, { merchProducts: nextProducts });
    clearProductForm();
    setMerchEditorVisible(false);
    setMerchMode("home");
  }

  function handleDeleteProduct(productId: string) {
    if (!user?.uid) {
      return;
    }

    Alert.alert("Apagar peca", "Queres remover esta peca do merchandise?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          const nextProducts = merchProducts.filter(
            (product) => product.id !== productId,
          );

          setMerchProducts(nextProducts);
          await updateUserProfile(user.uid, { merchProducts: nextProducts });
          clearProductForm();
          setMerchMode("home");
          setMerchEditorVisible(false);
        },
      },
    ]);
  }

  function clearProductForm() {
    setSelectedProduct(null);
    setProductTitle("");
    setProductLink("");
    setProductPrice("");
    setProductCurrency("EUR");
    setProductImageUrl("");
  }

  function editProduct(product: MerchProduct) {
    setSelectedProduct(product);
    setProductTitle(product.title);
    setProductLink(product.linkUrl);
    setProductPrice(product.price ?? "");
    setProductCurrency(product.currency ?? "EUR");
    setProductImageUrl(product.imageUrl);
    setMerchMode("product");
    setMerchEditorVisible(true);
  }

  function openProfileAlbum(album: AlbumItem) {
    router.push({
      pathname: "/main/release/[slug]",
      params: {
        slug: album.id,
        albumId: album.id,
        artist: displayName,
        cover: album.coverUrl,
        title: album.title,
      },
    });
  }

  async function playProfileAlbum(album: AlbumItem) {
    const content = await getAlbumContent(album.id);
    if (!content) return;

    const queue: Track[] = content.tracks
      .map((track) => ({
        id: track.id,
        uri: track.audioUrl,
        title: track.title,
        artist: displayName,
        cover: track.coverUrl || album.coverUrl,
        genre: track.genre,
        shortVideo: track.shortVideoUrl,
        lyrics: track.lyrics,
        albumId: album.id,
        source: "profile" as const,
      }))
      .filter((track) => track.uri);

    await playQueue(queue, 0);
  }

  async function playProfileTrack(track: TrackItem) {
    if (!track.audioUrl) return;

    await playQueue(
      [
        {
          id: track.id,
          uri: track.audioUrl,
          title: track.title,
          artist: displayName,
          cover: track.coverUrl,
          genre: track.genre,
          shortVideo: track.shortVideoUrl,
          lyrics: track.lyrics,
          albumId: track.albumId,
          source: "profile",
        },
      ],
      0,
    );
  }

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.bannerFixed, { height: bannerHeight }]}>
        <Animated.View
          style={[
            styles.bannerBackground,
            {
              transform: [
                { scale: imageScale },
                { translateY: imageTranslateY },
              ],
            },
          ]}
        >
          <MediaBox uri={heroImageUrl} style={styles.bannerArtist} />
        </Animated.View>
        <View style={styles.bannerDarkOverlay} />
        <Animated.View
          style={[styles.bannerContent, { opacity: bannerContentOpacity }]}
        >
          <View style={styles.bannerLeft}>
            <View style={styles.artistNameRow}>
              <Text style={[styles.artistName, { fontSize: font(34) }]}>
                {displayName}
              </Text>
              {profileUser?.verified ? (
                <View style={styles.verifiedProfilePill}>
                  <View style={styles.verifyBadge}>
                    <Ionicons name="checkmark" size={13} color="#fff" />
                  </View>
                  <Text style={styles.verifiedProfileText}>Verificado pela Sonnor</Text>
                </View>
              ) : null}
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.followButton,
              !isOwnProfile && isFollowing ? styles.followingButton : null,
            ]}
            onPress={() =>
              isOwnProfile ? setEditMenuVisible(true) : handleFollowPress()
            }
          >
            <Text style={styles.followText}>
              {isOwnProfile
                ? "Editar"
                : followLoading
                  ? "..."
                  : isFollowing
                    ? "Seguindo"
                    : "Seguir"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.compactContent,
            {
              opacity: compactContentOpacity,
              transform: [{ translateY: compactContentTranslateY }],
            },
          ]}
        >
          <View style={styles.compactNameRow}>
            <Text
              style={[styles.artistName, { fontSize: font(18) }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            {profileUser?.verified ? (
              <View style={styles.smallVerifiedProfilePill}>
                <View style={styles.smallVerifyBadge}>
                  <Ionicons name="checkmark" size={9} color="#fff" />
                </View>
              </View>
            ) : null}
          </View>
          <Text style={styles.artistStudio} numberOfLines={1}>
            {followersCount} followers
          </Text>
        </Animated.View>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: BANNER_HEIGHT + 20 },
        ]}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
      >
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Followers</Text>
            <Text style={styles.statValue}>{followersCount}</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Lancamentos</Text>
            <Text style={styles.statValue}>{albums.length}</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Posts</Text>
            <Text style={styles.statValue}>{posts.length}</Text>
          </View>
        </View>

        {profileUser?.bio ||
        publicInfoRows.length > 0 ||
        spotifyUrl ||
        isOwnProfile ? (
          <View style={styles.section}>
            {profileUser?.bio ? (
              <Text style={styles.bioText}>{profileUser.bio}</Text>
            ) : isOwnProfile ? (
              <Text style={styles.emptyText}>
                Adiciona uma biografia ao teu perfil.
              </Text>
            ) : null}
            {publicInfoRows.length > 0 ? (
              <View style={styles.profileInfoGrid}>
                {publicInfoRows.map((row) => (
                  <View key={row.label} style={styles.profileInfoRow}>
                    <Ionicons name={row.icon} size={14} color="#777" />
                    <Text style={styles.profileInfoLabel}>{row.label}</Text>
                    <Text style={styles.profileInfoValue}>{row.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {isOwnProfile && profileHiddenFields.length > 0 ? (
              <Text style={styles.hiddenInfoText}>
                Oculto:{" "}
                {profileHiddenFields
                  .map((field) => PROFILE_FIELD_LABELS[field] ?? field)
                  .join(", ")}
              </Text>
            ) : null}
            {spotifyUrl ? (
              <TouchableOpacity
                style={styles.spotifyButton}
                onPress={() => openUrl(spotifyUrl)}
              >
                <Text style={styles.spotifyButtonText}>Spotify</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {profilePreRelease ? (
          <Pressable
            style={[styles.profilePreRelease, { width: wp(100) }]}
            onPress={() => openProfileAlbum(profilePreRelease)}
          >
            {profilePreRelease.coverUrl ? (
              <Image
                blurRadius={20}
                source={{ uri: profilePreRelease.coverUrl }}
                style={styles.profilePreReleaseColorSample}
              />
            ) : null}
            <Svg height={138} pointerEvents="none" style={styles.profilePreReleaseFade} width={wp(100)}>
              <Defs>
                <LinearGradient id="profilePreReleaseFade" x1="0" x2="1" y1="0" y2="0">
                  <Stop offset="0" stopColor="#000" stopOpacity="0.08" />
                  <Stop offset="0.38" stopColor="#000" stopOpacity="0.52" />
                  <Stop offset="0.64" stopColor="#000" stopOpacity="0.94" />
                  <Stop offset="0.8" stopColor="#000" />
                  <Stop offset="1" stopColor="#000" stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Rect fill="url(#profilePreReleaseFade)" height="100%" width="100%" />
            </Svg>
            <MediaBox uri={profilePreRelease.coverUrl} style={styles.profilePreReleaseCover} />
            <View style={styles.profilePreReleaseInfo}>
              <Text style={styles.profilePreReleaseEyebrow}>Pré-lançamento</Text>
              <Text numberOfLines={1} style={styles.profilePreReleaseTitle}>
                {profilePreRelease.title}
              </Text>
              <Text style={styles.profilePreReleaseMeta}>
                {profilePreRelease.type === "ep"
                  ? "EP"
                  : profilePreRelease.type === "album"
                    ? "Álbum"
                    : "Single"}{" "}
                · {profilePreRelease.trackIds.length} faixas
              </Text>
              <View style={styles.profilePreReleaseTime}>
                {countdownParts(profilePreReleaseCountdownTarget, countdownNow).map((part, index) => (
                  <React.Fragment key={index}>
                    {index > 0 ? <Text style={styles.profilePreReleaseTimeSeparator}>:</Text> : null}
                    <View style={styles.profilePreReleaseTimeBox}>
                      <Text style={styles.profilePreReleaseTimeLabel}>
                        {["Hora", "Min", "Seg"][index]}
                      </Text>
                      <Text style={styles.profilePreReleaseTimeText}>{part}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </View>
          </Pressable>
        ) : null}

        {mostLikedTrack ? (
          <Pressable
            style={styles.topTrackCard}
            onPress={() => {
              const release = albums.find(
                (album) =>
                  album.id === mostLikedTrack.albumId ||
                  album.trackIds.includes(mostLikedTrack.id),
              );
              if (release) openProfileAlbum(release);
            }}
          >
            <View style={styles.topTrackCoverWrap}>
              <MediaBox uri={mostLikedTrack.coverUrl} style={styles.topTrackCover} />
              <Pressable
                style={({ pressed }) => [
                  styles.coverPlayButton,
                  pressed ? styles.playButtonPressed : null,
                ]}
                onPress={(event) => {
                  event.stopPropagation();
                  void playProfileTrack(mostLikedTrack);
                }}
              >
                <Ionicons name="play" size={17} color="#06110d" />
              </Pressable>
            </View>
            <View style={styles.topTrackInfo}>
              <Text style={styles.topTrackEyebrow}>Mais curtida</Text>
              <Text style={styles.topTrackTitle} numberOfLines={2}>{mostLikedTrack.title}</Text>
              <Text style={styles.topTrackMeta}>
                {relativeDate(mostLikedTrack.releaseDate)} · {mostLikedTrack.likesCount} curtidas
              </Text>
            </View>
          </Pressable>
        ) : null}

        {albumReleases.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Albuns</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {albumReleases.map((album) => (
                <Pressable key={album.id} style={styles.albumCard} onPress={() => openProfileAlbum(album)}>
                  <View style={styles.albumCoverWrap}>
                    <MediaBox uri={album.coverUrl} style={styles.albumCover} />
                    <Pressable style={({ pressed }) => [styles.coverPlayButton, pressed ? styles.playButtonPressed : null]} onPress={(event) => { event.stopPropagation(); void playProfileAlbum(album); }}>
                      <Ionicons name="play" size={17} color="#06110d" />
                    </Pressable>
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {album.title}
                  </Text>
                  <Text style={styles.cardMeta}>{relativeDate(album.releaseDate)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {singleAndEpReleases.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Singles e EPs</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {singleAndEpReleases.map((album) => (
                <Pressable key={album.id} style={styles.albumCard} onPress={() => openProfileAlbum(album)}>
                  <View style={styles.albumCoverWrap}>
                    <MediaBox uri={album.coverUrl} style={styles.albumCover} />
                    <Pressable style={({ pressed }) => [styles.coverPlayButton, pressed ? styles.playButtonPressed : null]} onPress={(event) => { event.stopPropagation(); void playProfileAlbum(album); }}>
                      <Ionicons name="play" size={17} color="#06110d" />
                    </Pressable>
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={1}>{album.title}</Text>
                  <Text style={styles.cardMeta}>{relativeDate(album.releaseDate)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {albums.length === 0 ? (
          <View style={styles.section}>
            <Text style={styles.emptyText}>Ainda nao ha lancamentos publicados.</Text>
          </View>
        ) : null}

        {merchLogoUrl || merchProducts.length > 0 || merchGallery.length > 0 ? (
          <View style={[styles.section, styles.merchSection]}>
            <View style={styles.merchHeader}>
              {merchLogoUrl ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() =>
                    openUrl(profileUser?.shopUrl || merchProducts[0]?.linkUrl)
                  }
                >
                  <Image
                    source={{ uri: merchLogoUrl }}
                    style={styles.merchLogo}
                  />
                </TouchableOpacity>
              ) : null}
              <Text style={styles.merchTitle}>
                {merchName || "Merchandise"}
              </Text>
            </View>

            {merchProducts.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.productRail}
              >
                {merchProducts.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={styles.productCard}
                    onPress={() => openUrl(product.linkUrl)}
                  >
                    <MediaBox
                      uri={product.imageUrl}
                      style={styles.productImage}
                    />
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {product.title}
                    </Text>
                    {product.price ? (
                      <Text style={styles.cardMeta}>
                        {product.currency === "USD" ? "$" : product.currency === "GBP" ? "£" : product.currency === "EUR" ? "€" : ""}
                        {product.price}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}

            {merchGallery.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.galleryRail}
              >
                {merchGallery.map((item) => (
                  <View key={item.id} style={styles.galleryCard}>
                    <MediaBox uri={item.mediaUrl} style={styles.galleryImage} />
                    {item.mediaType === "video" ? (
                      <Text style={styles.cardMeta}>Video</Text>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Posts</Text>
            {isOwnProfile ? (
              <TouchableOpacity
                style={styles.sectionIconButton}
                onPress={() =>
                  router.push("/main/components/PopUpCreate/createPost")
                }
              >
                <Ionicons name="add" size={20} color="#000" />
              </TouchableOpacity>
            ) : null}
          </View>
          {posts.length === 0 ? (
            isOwnProfile ? (
              <TouchableOpacity
                style={styles.createMusicButton}
                onPress={() =>
                  router.push("/main/components/PopUpCreate/createPost")
                }
              >
                <Text style={styles.createMusicText}>Criar post</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.emptyText}>
                Ainda nao ha posts publicados.
              </Text>
            )
          ) : (
            <View style={styles.postsGrid}>
              {posts.map((post, index) => (
                <PostGridTile
                  key={post.id}
                  post={post}
                  onPress={() => setActivePostIndex(index)}
                />
              ))}
            </View>
          )}
        </View>
      </Animated.ScrollView>

      <Modal
        visible={activePostIndex !== null}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setActivePostIndex(null)}
      >
        <ScrollView
          pagingEnabled
          showsVerticalScrollIndicator={false}
          contentOffset={{
            x: 0,
            y: activePostIndex === null ? 0 : activePostIndex * hp(100),
          }}
        >
          {posts.map((post) => (
            <View key={`full-${post.id}`} style={{ height: hp(100) }}>
              <FullscreenPost
                post={post}
                onClose={() => setActivePostIndex(null)}
                onDelete={handleDeletePost}
                canDelete={user?.uid === post.ownerId}
              />
            </View>
          ))}
        </ScrollView>
      </Modal>

      <Modal transparent visible={editMenuVisible} animationType="fade">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setEditMenuVisible(false)}
        >
          <Pressable
            style={styles.menuCard}
            onPress={(event) => event.stopPropagation()}
          >
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                setEditMenuVisible(false);
                router.push("/main/settings/account");
              }}
            >
              <Ionicons name="person-circle-outline" size={20} color="#fff" />
              <Text style={styles.menuText}>Dados publicos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                setEditMenuVisible(false);
                router.push("/main/profile/edit-profile");
              }}
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text style={styles.menuText}>Perfil publico</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                setEditMenuVisible(false);
                setConnectEditorVisible(true);
              }}
            >
              <Ionicons name="link-outline" size={20} color="#fff" />
              <Text style={styles.menuText}>Conectar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                setEditMenuVisible(false);
                setAvatarEditorVisible(true);
              }}
            >
              <Ionicons name="image-outline" size={20} color="#fff" />
              <Text style={styles.menuText}>Avatar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => setEditMenuVisible(false)}
            >
              <Ionicons name="options-outline" size={20} color="#fff" />
              <Text style={styles.menuText}>Organizar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                setEditMenuVisible(false);
                setMerchMode("home");
                setMerchEditorVisible(true);
              }}
            >
              <Ionicons name="shirt-outline" size={20} color="#fff" />
              <Text style={styles.menuText}>Merchandise</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={connectEditorVisible} animationType="fade">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setConnectEditorVisible(false)}
        >
          <Pressable
            style={styles.editorCard}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={styles.editorTitle}>Conectar</Text>
            <TextInput
              value={spotifyUrl}
              onChangeText={setSpotifyUrl}
              placeholder="Link do perfil Spotify"
              placeholderTextColor="#777"
              autoCapitalize="none"
              style={styles.input}
            />
            <TouchableOpacity
              style={styles.greenButton}
              onPress={handleSaveSpotify}
            >
              <Text style={styles.greenButtonText}>Guardar Spotify</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={avatarEditorVisible} animationType="fade">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setAvatarEditorVisible(false)}
        >
          <Pressable
            style={styles.avatarStudioCard}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.merchStudioHeader}>
              <View style={styles.trackTextBlock}>
                <Text style={styles.merchEyebrow}>Sonnor</Text>
                <Text style={styles.merchStudioTitle}>Avatar</Text>
              </View>
            </View>
            <View style={styles.avatarPreviewFrame}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarPreviewImage}
                />
              ) : (
                <Ionicons name="person-outline" size={54} color="#777" />
              )}
            </View>
            <TouchableOpacity
              style={styles.greenButton}
              onPress={handlePickAvatar}
            >
              <Text style={styles.greenButtonText}>Escolher imagem</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setAvatarEditorVisible(false)}
            >
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={merchEditorVisible} animationType="fade">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setMerchEditorVisible(false)}
        >
          <Pressable
            style={styles.merchStudioCard}
            onPress={(event) => event.stopPropagation()}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.merchStudioHeader}>
                {merchMode !== "home" ? (
                  <TouchableOpacity
                    style={styles.merchBackButton}
                    onPress={() => setMerchMode("home")}
                  >
                    <Ionicons name="chevron-back" size={20} color="#fff" />
                  </TouchableOpacity>
                ) : null}
                <View style={styles.trackTextBlock}>
                  <Text style={styles.merchEyebrow}>Sonnor</Text>
                  <Text style={styles.merchStudioTitle}>Merchandise</Text>
                </View>
              </View>

              {merchMode === "home" ? (
                <View style={styles.merchActionStack}>
                  <TouchableOpacity
                    style={styles.merchActionCard}
                    onPress={() => setMerchMode("logo")}
                  >
                    <View style={styles.merchActionIcon}>
                      <Ionicons
                        name="storefront-outline"
                        size={24}
                        color="#6F8FAF"
                      />
                    </View>
                    <View style={styles.trackTextBlock}>
                      <Text style={styles.merchActionTitle}>Nome e logo</Text>
                      <Text style={styles.merchActionText}>
                        Nome da marca e imagem principal.
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#777" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.merchActionCard}
                    onPress={() => {
                      clearProductForm();
                      setMerchMode("product");
                    }}
                  >
                    <View style={styles.merchActionIcon}>
                      <Ionicons
                        name="shirt-outline"
                        size={24}
                        color="#6F8FAF"
                      />
                    </View>
                    <View style={styles.trackTextBlock}>
                      <Text style={styles.merchActionTitle}>
                        Adicionar peca
                      </Text>
                      <Text style={styles.merchActionText}>
                        Produto, foto, preco e link direto.
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#777" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.merchActionCard}
                    onPress={() => setMerchMode("gallery")}
                  >
                    <View style={styles.merchActionIcon}>
                      <Ionicons
                        name="images-outline"
                        size={24}
                        color="#6F8FAF"
                      />
                    </View>
                    <View style={styles.trackTextBlock}>
                      <Text style={styles.merchActionTitle}>Galeria</Text>
                      <Text style={styles.merchActionText}>
                        Fotos ou videos dos modelos.
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#777" />
                  </TouchableOpacity>
                </View>
              ) : null}

              {merchMode === "logo" ? (
                <View style={styles.merchPanel}>
                  <TextInput
                    value={merchName}
                    onChangeText={setMerchName}
                    placeholder="Nome do merchandise"
                    placeholderTextColor="#777"
                    style={styles.input}
                  />
                  <TextInput
                    value={shopUrl}
                    onChangeText={setShopUrl}
                    placeholder="Link da loja"
                    placeholderTextColor="#777"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                  <TouchableOpacity
                    style={styles.logoPicker}
                    onPress={handlePickLogo}
                  >
                    {merchLogoUrl ? (
                      <Image
                        source={{ uri: merchLogoUrl }}
                        style={styles.logoPreview}
                      />
                    ) : (
                      <Ionicons name="image-outline" size={28} color="#fff" />
                    )}
                    <Text style={styles.secondaryButtonText}>
                      {merchLogoUrl ? "Editar logo" : "Adicionar logo PNG/GIF"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.greenButton}
                    onPress={handleSaveMerchBrand}
                  >
                    <Text style={styles.greenButtonText}>
                      Guardar merchandise
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {merchMode === "product" ? (
                <View style={styles.merchPanel}>
                  <TextInput
                    value={productTitle}
                    onChangeText={setProductTitle}
                    placeholder="Nome da peca"
                    placeholderTextColor="#777"
                    style={styles.input}
                  />
                  <TextInput
                    value={productLink}
                    onChangeText={setProductLink}
                    placeholder="Link direto da compra"
                    placeholderTextColor="#777"
                    style={styles.input}
                  />
                  <View style={styles.priceRow}>
                    <TextInput
                      value={productPrice}
                      onChangeText={setProductPrice}
                      placeholder="Preco"
                      placeholderTextColor="#777"
                      keyboardType="decimal-pad"
                      style={[styles.input, styles.priceInput]}
                    />
                    <View style={styles.currencyGrid}>
                      {["EUR", "USD", "GBP"].map((currency) => (
                        <TouchableOpacity
                          key={currency}
                          style={[styles.currencyButton, productCurrency === currency ? styles.currencyButtonActive : null]}
                          onPress={() => setProductCurrency(currency)}
                        >
                          <Text style={[styles.currencyText, productCurrency === currency ? styles.currencyTextActive : null]}>
                            {currency === "EUR" ? "€" : currency === "USD" ? "$" : "£"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handlePickProductImage}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {productImageUrl
                        ? "Trocar foto da peca"
                        : "Adicionar foto da peca"}
                    </Text>
                  </TouchableOpacity>
                  {productImageUrl ? (
                    <MediaBox
                      uri={productImageUrl}
                      style={styles.productPreview}
                    />
                  ) : null}
                  <TouchableOpacity
                    style={styles.greenButton}
                    onPress={handleSaveProduct}
                  >
                    <Text style={styles.greenButtonText}>
                      {selectedProduct ? "Guardar peca" : "Adicionar peca"}
                    </Text>
                  </TouchableOpacity>
                  {selectedProduct ? (
                    <TouchableOpacity
                      style={styles.dangerButton}
                      onPress={() => handleDeleteProduct(selectedProduct.id)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#ff8a8a"
                      />
                      <Text style={styles.dangerButtonText}>Apagar peca</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}

              {merchMode === "gallery" ? (
                <View style={styles.merchPanel}>
                  <TouchableOpacity
                    style={styles.greenButton}
                    onPress={handleAddGalleryItem}
                  >
                    <Text style={styles.greenButtonText}>
                      Adicionar foto ou video
                    </Text>
                  </TouchableOpacity>
                  {merchGallery.map((item) => (
                    <View key={item.id} style={styles.editorListRow}>
                      <MediaBox
                        uri={item.mediaUrl}
                        style={styles.editorThumb}
                      />
                      <Text style={[styles.trackTitle, styles.editorListTitle]}>
                        {item.mediaType === "video" ? "Video" : "Foto"}
                      </Text>
                      <Pressable
                        style={styles.iconDangerButton}
                        onPress={() => handleDeleteGalleryItem(item.id)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#ff8a8a"
                        />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}

              {merchProducts.length > 0 && merchMode === "home" ? (
                <View style={styles.merchExistingBlock}>
                  <Text style={styles.editorSubtitle}>Pecas guardadas</Text>
                  {merchProducts.map((product) => (
                    <TouchableOpacity
                      key={product.id}
                      style={styles.editorListRow}
                      onPress={() => editProduct(product)}
                    >
                      <MediaBox
                        uri={product.imageUrl}
                        style={styles.editorThumb}
                      />
                      <View style={styles.trackTextBlock}>
                        <Text style={styles.trackTitle}>{product.title}</Text>
                        <Text style={styles.trackMeta}>
                          {product.price || "Sem preco"}
                        </Text>
                      </View>
                      <Pressable
                        style={styles.iconDangerButton}
                        onPress={(event) => {
                          event.stopPropagation();
                          handleDeleteProduct(product.id);
                        }}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#ff8a8a"
                        />
                      </Pressable>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  content: { paddingBottom: 180 },
  bannerFixed: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    zIndex: 10,
    backgroundColor: "#000",
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
  },
  bannerBackground: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  bannerArtist: { width: "100%", height: "100%", resizeMode: "cover" },
  bannerDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.28)",
    zIndex: 3,
  },
  bannerContent: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 14,
    zIndex: 6,
  },
  compactContent: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 8,
  },
  bannerLeft: { flex: 1 },
  artistName: { color: "#fff", fontWeight: "900" },
  artistNameRow: { flexDirection: "row", alignItems: "center", gap: 9, flexWrap: "wrap" },
  compactNameRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  verifiedProfilePill: { flexDirection: "row", alignItems: "center", gap: 6 },
  smallVerifiedProfilePill: { flexDirection: "row", alignItems: "center", gap: 5 },
  verifyBadge: { width: 23, height: 23, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#2d7dff" },
  smallVerifyBadge: { width: 15, height: 15, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#2d7dff" },
  verifiedProfileText: { color: "#eeeeee", fontSize: 12, fontWeight: "900" },
  artistStudio: { color: "#fff", opacity: 0.92, marginTop: 4 },
  hero: { width: "100%", justifyContent: "flex-end", backgroundColor: "#111" },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  avatarMenuButton: {
    position: "absolute",
    top: 52,
    left: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.38)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  avatarMenuImage: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
    resizeMode: "cover",
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  identityBlock: { flex: 1 },
  name: { color: "#fff", fontWeight: "900" },
  username: { color: "#ddd", marginTop: 4, fontSize: 14 },
  followButton: {
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  followingButton: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  followText: { color: "#000", fontWeight: "900" },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  statBlock: { alignItems: "center", gap: 4 },
  statLabel: { color: "#aaa", fontSize: 12, textTransform: "uppercase" },
  statValue: { color: "#fff", fontSize: 18, fontWeight: "800" },
  section: { paddingHorizontal: 20, paddingTop: 32 },
  sectionHeaderRow: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 14,
  },
  sectionIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  bioText: { color: "#ddd", fontSize: 14, lineHeight: 22 },
  bioMetaText: { color: "#aaa", fontSize: 13, lineHeight: 20, marginTop: 8 },
  profileInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  profileInfoRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  profileInfoLabel: { color: "#747474", fontSize: 12, fontWeight: "800" },
  profileInfoValue: { color: "#a6a6a6", fontSize: 13, fontWeight: "800" },
  hiddenInfoText: {
    color: "#5f5f5f",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 12,
  },
  spotifyButton: {
    alignSelf: "flex-start",
    marginTop: 14,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#6F8FAF",
    borderWidth: 1,
    borderColor: "#000",
  },
  spotifyButtonText: { color: "#000", fontWeight: "900" },
  emptyText: { color: "#888", fontSize: 14, lineHeight: 20 },
  topTrackCard: {
    marginHorizontal: 20,
    marginTop: 26,
    padding: 12,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    backgroundColor: "rgba(111,143,175,0.13)",
  },
  topTrackCoverWrap: { width: 104, height: 104 },
  topTrackCover: { width: 104, height: 104, borderRadius: 16, overflow: "hidden" },
  topTrackInfo: { flex: 1 },
  topTrackEyebrow: { color: "#6F8FAF", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  topTrackTitle: { color: "#fff", fontSize: 21, lineHeight: 25, fontWeight: "900", marginTop: 6 },
  topTrackMeta: { color: "#9eaaa6", fontSize: 12, fontWeight: "800", marginTop: 8 },
  profilePreRelease: {
    alignItems: "center",
    flexDirection: "row",
    height: 138,
    marginLeft: -22,
    marginTop: 28,
    overflow: "hidden",
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  profilePreReleaseColorSample: {
    height: 8,
    left: "50%",
    opacity: 1,
    position: "absolute",
    top: "50%",
    transform: [{ scale: 110 }],
    width: 8,
  },
  profilePreReleaseFade: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  profilePreReleaseCover: {
    borderRadius: 13,
    height: 104,
    marginLeft: 22,
    overflow: "hidden",
    width: 104,
  },
  profilePreReleaseInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profilePreReleaseEyebrow: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  profilePreReleaseTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 5,
  },
  profilePreReleaseMeta: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
  },
  profilePreReleaseTime: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    marginTop: 10,
  },
  profilePreReleaseTimeBox: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    minWidth: 42,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  profilePreReleaseTimeLabel: {
    color: "#777",
    fontSize: 7,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  profilePreReleaseTimeSeparator: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    marginHorizontal: 3,
  },
  profilePreReleaseTimeText: {
    color: "#000",
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
    marginTop: 1,
  },
  albumCard: { width: 138, marginRight: 16 },
  albumCoverWrap: { width: 138, height: 138 },
  albumCover: { width: 138, height: 138, borderRadius: 16, overflow: "hidden" },
  coverPlayButton: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6F8FAF",
  },
  playButtonPressed: { opacity: 0.42, transform: [{ scale: 0.9 }] },
  cardTitle: { color: "#fff", fontWeight: "800", marginTop: 8 },
  cardMeta: { color: "#999", fontSize: 12, marginTop: 3 },
  trackTextBlock: { flex: 1 },
  trackTitle: { color: "#fff", fontSize: 15, fontWeight: "800" },
  trackMeta: { color: "#aaa", fontSize: 12, marginTop: 3 },
  postsGrid: { flexDirection: "row", flexWrap: "wrap" },
  postGridTile: {
    width: "33.3333%",
    aspectRatio: 0.76,
    borderRadius: 0,
    overflow: "hidden",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#000",
  },
  postGridImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    backgroundColor: "#0f0f0f",
  },
  postOverlayImage: { position: "absolute", zIndex: 8 },
  postGridVideoFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#151515",
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
  postLikesText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  fullPostRoot: { flex: 1, backgroundColor: "#000" },
  fullPostStage: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000" },
  fullPostMedia: { width: "100%", height: "100%", resizeMode: "contain" },
  fullPostVideoFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
  },
  fullPostOverlayImage: { position: "absolute", zIndex: 8 },
  fullPostClose: {
    position: "absolute",
    top: 46,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 20,
  },
  fullPostMenuButton: {
    position: "absolute",
    top: 46,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 20,
  },
  fullPostMusicInside: {
    position: "absolute",
    top: 72,
    left: 72,
    right: 72,
    alignItems: "center",
    zIndex: 16,
  },
  fullPostMusicTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  fullPostBottom: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    zIndex: 16,
  },
  fullPostProfileRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  fullPostAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: "hidden",
  },
  fullPostTextBlock: { flex: 1 },
  fullPostAuthor: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4,
  },
  fullPostCaption: {
    color: "#e5e5e5",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
  fullPostSongCoverBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  fullPostSongCover: { width: "100%", height: "100%", resizeMode: "cover" },
  createMusicButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  createMusicText: { color: "#000", fontWeight: "900" },
  merchSection: { paddingTop: 44 },
  merchHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  merchTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 0,
  },
  merchLogo: {
    width: 68,
    height: 68,
    borderRadius: 16,
    backgroundColor: "#111",
  },
  productRail: { paddingBottom: 18 },
  productCard: { width: 160, marginRight: 18 },
  productImage: {
    width: 160,
    height: 210,
    borderRadius: 16,
    overflow: "hidden",
  },
  galleryRail: { paddingTop: 8 },
  galleryCard: { width: 150, marginRight: 14 },
  galleryImage: {
    width: 150,
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
  },
  mediaFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  sideBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  sidePanel: {
    width: "82%",
    maxWidth: 340,
    minHeight: "100%",
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 24,
    backgroundColor: "#090909",
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.1)",
  },
  sideHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    marginBottom: 12,
  },
  sideAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: "hidden",
    resizeMode: "cover",
  },
  sideName: { color: "#fff", fontSize: 17, fontWeight: "900" },
  sideRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  sideText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  logoutGrid: {
    marginTop: 42,
    minHeight: 82,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(218,52,52,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,90,90,0.34)",
  },
  logoutGridText: { color: "#ff7474", fontSize: 15, fontWeight: "900" },
  menuCard: {
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
    borderRadius: 22,
    paddingVertical: 8,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  menuText: { color: "#fff", fontSize: 18, fontWeight: "900" },
  editorCard: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "86%",
    alignSelf: "center",
    borderRadius: 24,
    padding: 18,
    backgroundColor: "#0c0c0c",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  editorTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 14,
  },
  editorSubtitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 16,
    marginBottom: 10,
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: "#fff",
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 10,
  },
  textArea: { minHeight: 92, textAlignVertical: "top" },
  primaryButton: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  primaryButtonText: { color: "#000", fontWeight: "900" },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    marginBottom: 10,
  },
  secondaryButtonText: { color: "#fff", fontWeight: "800" },
  dangerButton: {
    minHeight: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(218,52,52,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,90,90,0.32)",
    marginBottom: 10,
  },
  dangerButtonText: { color: "#ff8a8a", fontSize: 15, fontWeight: "900" },
  deniedBox: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 10,
  },
  deniedTitle: { color: "#fff", fontWeight: "900", marginBottom: 6 },
  deniedText: { color: "#ccc", lineHeight: 20 },
  simpleStatRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  simpleStatLabel: { color: "#ddd", fontWeight: "700" },
  simpleStatValue: { color: "#fff", fontSize: 18, fontWeight: "900" },
  popularLine: { color: "#ddd", fontSize: 14, lineHeight: 24 },
  logoPicker: {
    minHeight: 94,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginBottom: 10,
  },
  merchStudioCard: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "86%",
    alignSelf: "center",
    borderRadius: 28,
    padding: 18,
    backgroundColor: "#070707",
    borderWidth: 1,
    borderColor: "rgba(111,143,175,0.22)",
  },
  merchStudioHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  merchBackButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  merchEyebrow: {
    color: "#6F8FAF",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  merchStudioTitle: { color: "#fff", fontSize: 30, fontWeight: "900" },
  merchActionStack: { gap: 12 },
  merchActionCard: {
    minHeight: 86,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  merchActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(111,143,175,0.12)",
  },
  merchActionTitle: { color: "#fff", fontSize: 16, fontWeight: "900" },
  merchActionText: { color: "#aaa", fontSize: 12, marginTop: 4 },
  merchPanel: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  priceRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  priceInput: { flex: 1 },
  currencyGrid: { flexDirection: "row", gap: 6 },
  currencyButton: {
    width: 42,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  currencyButtonActive: { backgroundColor: "#6F8FAF", borderColor: "#6F8FAF" },
  currencyText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  currencyTextActive: { color: "#000" },
  merchExistingBlock: { marginTop: 18 },
  greenButton: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6F8FAF",
    marginBottom: 10,
  },
  greenButtonText: { color: "#000", fontSize: 15, fontWeight: "900" },
  avatarStudioCard: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    borderRadius: 28,
    padding: 18,
    backgroundColor: "#070707",
    borderWidth: 1,
    borderColor: "rgba(111,143,175,0.22)",
  },
  avatarPreviewFrame: {
    width: 190,
    height: 190,
    borderRadius: 95,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 20,
  },
  avatarPreviewImage: { width: "100%", height: "100%", resizeMode: "cover" },
  logoPreview: { width: 72, height: 72, borderRadius: 16 },
  productPreview: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    marginBottom: 10,
  },
  editorListRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.055)",
    marginBottom: 8,
  },
  editorListTitle: { flex: 1 },
  editorThumb: { width: 48, height: 48, borderRadius: 12 },
  iconDangerButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(218,52,52,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,90,90,0.25)",
  },
  productModal: {
    width: "100%",
    maxWidth: 380,
    alignSelf: "center",
    borderRadius: 24,
    padding: 16,
    backgroundColor: "#0c0c0c",
  },
  productModalImage: {
    width: "100%",
    height: 320,
    borderRadius: 18,
    marginBottom: 14,
  },
  productModalTitle: { color: "#fff", fontSize: 20, fontWeight: "900" },
  productModalMeta: { color: "#aaa", fontSize: 14, marginTop: 5 },
  productDescription: {
    color: "#ddd",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
    marginBottom: 14,
  },
});
