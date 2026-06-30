import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { useSuccessFeedback } from "../../../components/SuccessFeedback";
import { usePlayer, type Track } from "../../../context/PlayerContext";
import { deleteOwnedAlbum } from "../../../firebase/albumDeletionClient";
import { getAlbumContent, getLibraryContent } from "../../../firebase/contentClient";
import {
  removeAlbumFromLibrary,
  saveAlbumToLibrary,
} from "../../../firebase/settingsClient";
import { createReport, toggleTrackLike } from "../../../firebase/socialClient";
import { useAsyncData } from "../../../hooks/useAsyncData";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import MarqueeText from "../../../components/MarqueeText";
import AnimatedSoundWave from "../components/AnimatedSoundWave";

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const TRACK_TITLE_VISIBLE_CHARS = 16;
const TRACK_TITLE_CHAR_WIDTH = 10.6;
const TRACK_TITLE_PADDING = 8;

function getTrackTitleWindowStyle(title: string) {
  const visibleChars = Math.min(title.length, TRACK_TITLE_VISIBLE_CHARS);
  const width = Math.max(24, visibleChars * TRACK_TITLE_CHAR_WIDTH + TRACK_TITLE_PADDING);

  return { width };
}

function yearOf(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().getFullYear();
  }
  return new Date().getFullYear();
}

function dateOf(value: unknown) {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (value && typeof value === "object" && "seconds" in value) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  return null;
}

function relativeReleaseDate(value: unknown) {
  const date = dateOf(value);
  if (!date) return String(yearOf(value));

  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} ${months === 1 ? "month" : "months"} ago`;
  }
  return String(date.getFullYear());
}

function CoverAccent({
  cover,
  style,
}: {
  cover: string;
  style: object;
}) {
  return (
    <View style={[styles.coverAccent, style]}>
      {cover ? (
        <Image
          blurRadius={18}
          resizeMode="cover"
          source={{ uri: cover }}
          style={styles.coverAccentImage}
        />
      ) : null}
      <View style={styles.coverAccentShade} />
    </View>
  );
}

function AccentText({
  children,
  cover,
  numberOfLines,
  style,
}: {
  children: React.ReactNode;
  cover: string;
  numberOfLines?: number;
  style: object;
}) {
  return (
    <View style={styles.accentTextWrap}>
      <CoverAccent cover={cover} style={StyleSheet.absoluteFillObject} />
      <Text numberOfLines={numberOfLines} style={[style, styles.accentText]}>
        {children}
      </Text>
    </View>
  );
}

function LikedCover({ style, iconSize = 92 }: { style: object; iconSize?: number }) {
  return (
    <View style={[style, styles.likedCover]}>
      <Ionicons name="heart" size={iconSize} color="#fff" />
    </View>
  );
}

export default function ReleaseScreen() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { showSuccess } = useSuccessFeedback();
  const params = useLocalSearchParams<{
    albumId?: string | string[];
    artist?: string | string[];
    cover?: string | string[];
    liked?: string | string[];
    slug?: string | string[];
    title?: string | string[];
  }>();
  const albumId = valueOf(params.albumId) ?? valueOf(params.slug) ?? "";
  const isLikedFolder = valueOf(params.liked) === "1";
  const loadAlbum = useCallback(async () => {
    if (isLikedFolder) {
      const library = await getLibraryContent(user?.uid);
      return {
        album: {
          id: "liked-tracks",
          userId: user?.uid || "",
          title: "Liked",
          slug: "liked-tracks",
          type: "album" as const,
          coverUrl: "",
          backgroundUrl: "",
          genres: [],
          explicit: false,
          status: "published" as const,
          trackIds: library.tracks.map((track) => track.id),
          likesCount: 0,
          playsCount: 0,
          commentsCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        tracks: library.tracks,
        user: null,
      };
    }

    return getAlbumContent(albumId);
  }, [albumId, isLikedFolder, user?.uid]);
  const { data, loading } = useAsyncData(loadAlbum, null);
  const {
    autoRecommendations,
    playQueue,
    setAutoRecommendations,
    status,
    togglePlay,
    track: currentTrack,
  } = usePlayer();
  const [saved, setSaved] = useState(false);

  const album = data?.album;
  const artist =
    isLikedFolder
      ? "Liked"
      : data?.user?.displayName ||
        data?.user?.username ||
        valueOf(params.artist) ||
        "Sonnor";
  const avatar = isLikedFolder ? "" : data?.user?.avatarUrl || "";
  const title = album?.title || valueOf(params.title) || "Album";
  const cover = album?.coverUrl || valueOf(params.cover) || "";
  const isPreRelease =
    album?.status === "scheduled" &&
    (dateOf(album.releaseDate)?.getTime() ?? Number.POSITIVE_INFINITY) >
      Date.now();
  const queue: Track[] =
    data?.tracks.map((item) => ({
      albumId,
      artist:
        isLikedFolder && "artistName" in item && typeof item.artistName === "string"
          ? item.artistName
          : artist,
      folderTitle: title,
      cover: isLikedFolder ? item.coverUrl : item.coverUrl || cover,
      genre: item.genre,
      id: item.id,
      lyrics: item.lyrics,
      shortVideo: item.shortVideoUrl,
      source: "release",
      title: item.title,
      uri: item.audioUrl,
    })) ?? [];
  const isPlaying = status?.isLoaded && status.isPlaying;
  const isAlbumOwner = !isLikedFolder && Boolean(user?.uid && album?.userId === user.uid);
  const isCurrentAlbumTrack =
    Boolean(currentTrack?.id) && queue.some((item) => item.id === currentTrack?.id);
  const [randomModeEnabled, setRandomModeEnabled] = useState(false);
  useEffect(() => {
    if (isCurrentAlbumTrack) {
      setRandomModeEnabled(autoRecommendations);
    }
  }, [autoRecommendations, isCurrentAlbumTrack]);
  useEffect(() => {
    let active = true;
    if (!user?.uid) return;

    getLibraryContent(user.uid).then((library) => {
      if (active) setSaved(library.albums.some((item) => item.id === albumId));
    });

    return () => {
      active = false;
    };
  }, [albumId, user?.uid]);

  async function playFrom(index: number) {
    if (isPreRelease) {
      return;
    }

    await playQueue(queue, index, { autoRecommendations: randomModeEnabled });
  }

  async function handleMainPlay() {
    if (isPreRelease) {
      return;
    }

    if (isCurrentAlbumTrack) {
      await togglePlay();
      return;
    }

    await playFrom(0);
  }

  async function toggleSaved() {
    if (!user?.uid) return;
    const next = !saved;
    setSaved(next);

    try {
      if (next) await saveAlbumToLibrary(user.uid, albumId);
      else await removeAlbumFromLibrary(user.uid, albumId);
    } catch {
      setSaved(!next);
    }
  }

  function toggleRandomAfterFolder() {
    const nextMode = !randomModeEnabled;
    setRandomModeEnabled(nextMode);

    if (isCurrentAlbumTrack) {
      setAutoRecommendations(nextMode);
    }
  }

  function openArtistProfile() {
    if (!album?.userId) return;
    router.push({ pathname: "/main/profile", params: { userId: album.userId } });
  }

  function confirmDeleteAlbum() {
    if (isLikedFolder || !isAlbumOwner || !albumId) {
      return;
    }

    Alert.alert(
      "Delete folder?",
      "This deletes the folder, all tracks, linked posts, likes, saves, and files stored in it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteOwnedAlbum(albumId);
              router.replace("/main/profile");
            } catch (error) {
              console.log("DELETE ALBUM ERROR:", error);
              Alert.alert("Error", "Could not delete the folder right now.");
            }
          },
        },
      ],
    );
  }

  async function handleLikeTrack(trackId: string) {
    if (!user?.uid) {
      Alert.alert("Login required", "Sign in to like this track.");
      return;
    }

    try {
      await toggleTrackLike(user.uid, trackId);
      showSuccess({});
    } catch (error) {
      console.log("LIKE RELEASE TRACK ERROR:", error);
      Alert.alert("Error", "Could not like this track right now.");
    }
  }

  function promptTrackReport(item: { id: string; title: string }) {
    if (!user?.uid) {
      Alert.alert("Login required", "Sign in to report this track.");
      return;
    }

    Alert.prompt(
      "Report track",
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
                targetType: "track",
                targetId: item.id,
                reason: "Report de track",
                details: `${item.title}: ${details}`,
              });
              showSuccess({});
            } catch (error) {
              console.log("REPORT RELEASE TRACK ERROR:", error);
              Alert.alert("Error", "Could not send the report right now.");
            }
          },
        },
      ],
      "plain-text",
    );
  }

  function openTrackOptions(item: { id: string; title: string }) {
    if (isPreRelease) {
      return;
    }

    Alert.alert(item.title, "Choose an option for this track.", [
      { text: "Like", onPress: () => void handleLikeTrack(item.id) },
      { text: "Report", onPress: () => promptTrackReport(item) },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  if (loading) {
    return <View style={styles.center}><Text style={styles.muted}>Loading album...</Text></View>;
  }

  if (!album) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Album not found</Text>
        <Pressable onPress={() => router.back()}><Text style={styles.backText}>Back</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.heroGradient}>
          {!isLikedFolder && cover ? (
            <Image
              blurRadius={20}
              resizeMode="cover"
              source={{ uri: cover }}
              style={styles.heroColorSample}
            />
          ) : null}
          <Svg height="100%" width="100%">
            <Defs>
              <LinearGradient id="albumFade" x1="0" x2="0" y1="0" y2="1">
                <Stop
                  offset="0"
                  stopColor={isLikedFolder ? "#ff5b97" : "#000000"}
                  stopOpacity={isLikedFolder ? "0.92" : "0.08"}
                />
                <Stop
                  offset="0.34"
                  stopColor={isLikedFolder ? "#8d274d" : "#000000"}
                  stopOpacity={isLikedFolder ? "0.76" : "0.52"}
                />
                <Stop
                  offset="0.58"
                  stopColor={isLikedFolder ? "#1a050d" : "#000000"}
                  stopOpacity={isLikedFolder ? "0.96" : "0.94"}
                />
                <Stop offset="0.8" stopColor="#000000" />
                <Stop offset="1" stopColor="#000000" />
              </LinearGradient>
            </Defs>
            <Rect fill="url(#albumFade)" height="100%" width="100%" />
          </Svg>
        </View>

        <View style={styles.topRow}>
          <Pressable style={styles.topButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={27} color="#fff" />
          </Pressable>
          {isLikedFolder ? (
            <View style={styles.topButton} />
          ) : (
            <Pressable style={styles.topButton} onPress={isAlbumOwner ? confirmDeleteAlbum : undefined}>
              <Ionicons
                name={isAlbumOwner ? "trash-outline" : "ellipsis-horizontal"}
                size={24}
                color="#fff"
              />
            </Pressable>
          )}
        </View>

        <View style={styles.heroContent}>
          {isLikedFolder ? (
            <LikedCover style={styles.cover} />
          ) : cover ? (
            <Image source={{ uri: cover }} style={styles.cover} />
          ) : (
            <View style={styles.cover} />
          )}

          <Text style={styles.title}>{title}</Text>
          {isLikedFolder ? null : (
            <Pressable
              style={styles.artistRow}
              onPress={openArtistProfile}
            >
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.artistAvatar} />
              ) : (
                <View style={styles.artistAvatarFallback}>
                  <Ionicons name="person" size={15} color="#fff" />
                </View>
              )}
              <Text style={styles.artist}>{artist}</Text>
            </Pressable>
          )}
          <Text style={styles.meta}>
            {isLikedFolder
              ? `${data.tracks.length} ${data.tracks.length === 1 ? "track" : "tracks"}`
              : `${(album.type || "album").replace(/^./, (letter) => letter.toUpperCase())} · ${relativeReleaseDate(album.releaseDate ?? album.createdAt)} · ${data.tracks.length} tracks`}
          </Text>
        </View>

        <View style={styles.actions}>
          {isLikedFolder ? null : (
            <Pressable style={styles.actionButton} onPress={toggleSaved}>
              <Ionicons
                name={saved ? "checkmark-circle" : "add-circle-outline"}
                size={30}
                color="#fff"
              />
            </Pressable>
          )}
          <View style={styles.actionSpacer} />
          {!isPreRelease ? (
            <>
              <Pressable
                style={[
                  styles.actionButton,
                  randomModeEnabled ? styles.actionButtonActive : null,
                ]}
                onPress={toggleRandomAfterFolder}
              >
                <Ionicons
                  name={randomModeEnabled ? "shuffle" : "repeat"}
                  size={28}
                  color={randomModeEnabled ? (isLikedFolder ? "#ff5b97" : "#fff") : "#c1cbc8"}
                />
              </Pressable>
              <Pressable style={({ pressed }) => [styles.playButton, pressed ? styles.playButtonPressed : null]} onPress={handleMainPlay}>
                {isLikedFolder ? (
                  <View style={[StyleSheet.absoluteFillObject, styles.likedPlayAccent]} />
                ) : (
                  <CoverAccent cover={cover} style={StyleSheet.absoluteFillObject} />
                )}
                <Ionicons
                  name={isCurrentAlbumTrack && isPlaying ? "pause" : "play"}
                  size={30}
                  color="#fff"
                />
              </Pressable>
            </>
          ) : null}
        </View>

        <View style={styles.trackList}>
          {data.tracks.map((item, index) => {
            const active = currentTrack?.id === item.id;
            const trackTitleWindowStyle = getTrackTitleWindowStyle(item.title);

            return (
              <Pressable
                disabled={isPreRelease}
                key={item.id}
                style={styles.trackRow}
                onPress={() => playFrom(index)}
              >
                <View style={styles.trackText}>
                  {active ? (
                    <View style={styles.activeTitleRow}>
                      {isLikedFolder ? (
                        <View style={[styles.trackTitleWindow, trackTitleWindowStyle]}>
                          <MarqueeText style={[styles.trackTitle, styles.likedActiveText]}>
                            {item.title}
                          </MarqueeText>
                        </View>
                      ) : (
                        <View style={[styles.accentTextWrap, styles.trackTitleWindow, trackTitleWindowStyle]}>
                          <CoverAccent cover={cover} style={StyleSheet.absoluteFillObject} />
                          <MarqueeText style={[styles.trackTitle, styles.accentText]}>
                            {item.title}
                          </MarqueeText>
                        </View>
                      )}
                      {isPlaying ? <AnimatedSoundWave /> : null}
                    </View>
                  ) : (
                    <View style={[styles.trackTitleWindow, trackTitleWindowStyle]}>
                      <MarqueeText style={styles.trackTitle}>
                        {item.title}
                      </MarqueeText>
                    </View>
                  )}
                  <View style={styles.trackMetaRow}>
                    {item.explicit ? <View style={styles.explicitBadge}><Text style={styles.explicitText}>E</Text></View> : null}
                    {active && !isLikedFolder ? (
                      <AccentText cover={cover} numberOfLines={1} style={styles.trackArtist}>
                        {artist}
                      </AccentText>
                    ) : (
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.trackArtist,
                          active && isLikedFolder ? styles.likedActiveText : null,
                        ]}
                      >
                        {isLikedFolder && "artistName" in item && typeof item.artistName === "string"
                          ? item.artistName
                          : artist}
                      </Text>
                    )}
                  </View>
                </View>
                {isLikedFolder ? null : (
                  <Pressable
                    hitSlop={12}
                    onPress={(event) => {
                      event.stopPropagation();
                      openTrackOptions(item);
                    }}
                    style={styles.trackOptionsButton}
                  >
                    <Ionicons
                      name={isPreRelease ? "lock-closed-outline" : "ellipsis-horizontal"}
                      size={isPreRelease ? 18 : 21}
                      color="#858b89"
                    />
                  </Pressable>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#000000",
    flex: 1,
  },
  content: {
    paddingBottom: 300,
    paddingHorizontal: 22,
    paddingTop: 54,
  },
  heroGradient: {
    height: 660,
    left: -22,
    position: "absolute",
    right: -22,
    top: 0,
  },
  heroColorSample: {
    height: 8,
    left: "50%",
    opacity: 1,
    position: "absolute",
    top: 120,
    transform: [{ scale: 110 }],
    width: 8,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  topButton: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  heroContent: {
    minHeight: 418,
  },
  cover: {
    alignSelf: "center",
    backgroundColor: "#17201d",
    borderRadius: 18,
    height: 250,
    marginTop: 14,
    width: 250,
  },
  likedCover: {
    alignItems: "center",
    backgroundColor: "#ff4f8b",
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.7,
    marginTop: 25,
  },
  artistRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    marginTop: 14,
  },
  artistAvatar: {
    borderRadius: 14,
    height: 28,
    width: 28,
  },
  artistAvatarFallback: {
    alignItems: "center",
    backgroundColor: "#18372f",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  artist: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  meta: {
    color: "rgba(255,255,255,0.66)",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 9,
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    marginTop: 4,
  },
  actionButton: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 36,
  },
  actionButtonActive: {
    opacity: 1,
    transform: [{ scale: 1.06 }],
  },
  actionSpacer: {
    flex: 1,
  },
  playButton: {
    alignItems: "center",
    backgroundColor: "#171717",
    borderRadius: 29,
    height: 58,
    justifyContent: "center",
    overflow: "hidden",
    width: 58,
  },
  playButtonPressed: {
    opacity: 0.46,
    transform: [{ scale: 0.92 }],
  },
  likedPlayAccent: {
    backgroundColor: "#ff4f8b",
  },
  coverAccent: {
    overflow: "hidden",
  },
  coverAccentImage: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ scale: 2.8 }],
  },
  coverAccentShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  accentTextWrap: {
    alignSelf: "flex-start",
    overflow: "hidden",
  },
  accentText: {
    color: "#fff",
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  trackList: {
    marginTop: 18,
  },
  trackRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    minHeight: 68,
    paddingVertical: 7,
  },
  trackText: {
    flex: 1,
  },
  activeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  trackTitle: {
    color: "#f3f5f4",
    fontSize: 17,
    fontWeight: "700",
  },
  trackTitleWindow: {
    maxWidth: 178,
  },
  likedActiveText: {
    color: "#ff5b97",
  },
  trackMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    marginTop: 7,
  },
  trackArtist: {
    color: "#9da5a2",
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  trackOptionsButton: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 36,
  },
  explicitBadge: {
    alignItems: "center",
    backgroundColor: "#a5aaa8",
    borderRadius: 3,
    height: 15,
    justifyContent: "center",
    width: 15,
  },
  explicitText: {
    color: "#111",
    fontSize: 10,
    fontWeight: "900",
  },
  center: {
    alignItems: "center",
    backgroundColor: "#080a09",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  muted: {
    color: "#9da5a2",
  },
  backText: {
    color: "#fff",
    marginTop: 18,
  },
});
