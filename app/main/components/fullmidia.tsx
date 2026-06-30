import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video, type AVPlaybackStatus } from "expo-av";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import LinearSeekBar from "../../../components/LinearSeekBar";
import MarqueeText from "../../../components/MarqueeText";
import { useSuccessFeedback } from "../../../components/SuccessFeedback";
import { usePlayer } from "../../../context/PlayerContext";
import { getTrackContext } from "../../../firebase/contentClient";
import { createReport, isTrackLiked, toggleTrackLike } from "../../../firebase/socialClient";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { formatMediaTime } from "./SharedMediaProgress";

const { width, height } = Dimensions.get("window");
const ART_SIZE = width * 0.9;

export default function FullMidia() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { showSuccess } = useSuccessFeedback();
  const { playNext, playPrevious, seek, status, togglePlay, track } = usePlayer();
  const [expanded, setExpanded] = useState(true);
  const [liked, setLiked] = useState(false);
  const [lyricsVisible, setLyricsVisible] = useState(false);
  const [dragProgress, setDragProgress] = useState<number | null>(null);
  const [settledProgress, setSettledProgress] = useState<number | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const [trackContext, setTrackContext] = useState<
    Awaited<ReturnType<typeof getTrackContext>> | null
  >(null);
  const [artistPreviewVisible, setArtistPreviewVisible] = useState(false);

  const boxAnim = useRef(new Animated.Value(1)).current;
  const controlsAnim = useRef(new Animated.Value(0)).current;
  const blurAnim = useRef(new Animated.Value(0)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;
  const lyricsAnim = useRef(new Animated.Value(0)).current;
  const artistPreviewAnim = useRef(new Animated.Value(0)).current;
  const clipVideoRef = useRef<Video | null>(null);
  const artistPreviewPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -18) {
          setArtistPreviewVisible(true);
          Animated.spring(artistPreviewAnim, {
            damping: 18,
            stiffness: 220,
            toValue: 1,
            useNativeDriver: true,
          }).start();
        } else if (gesture.dy > 18) {
          Animated.spring(artistPreviewAnim, {
            damping: 18,
            stiffness: 220,
            toValue: 0,
            useNativeDriver: true,
          }).start(() => setArtistPreviewVisible(false));
        }
      },
      onStartShouldSetPanResponder: () => true,
    }),
  ).current;
  const loadedStatus = status?.isLoaded ? status : null;
  const currentTime = loadedStatus ? loadedStatus.positionMillis / 1000 : 0;
  const duration = loadedStatus?.durationMillis
    ? loadedStatus.durationMillis / 1000
    : 0;
  const liveProgress = duration > 0 ? currentTime / duration : 0;
  const progress = dragProgress ?? settledProgress ?? liveProgress;
  const visibleCurrentTime = dragProgress === null ? currentTime : dragProgress * duration;
  const isPlaying = loadedStatus?.isPlaying ?? false;
  const lyricsLines = useMemo(
    () =>
      (track?.lyrics ?? "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    [track?.lyrics],
  );
  const headerDisplayName =
    track?.folderTitle?.trim() ||
    trackContext?.album?.title?.trim() ||
    track?.artist ||
    "Sonnor";
  const collaboratorNames =
    trackContext?.track?.featNames?.filter((name) => name.trim()) ?? [];
  const collaboratorProfiles = trackContext?.collaborators ?? [];
  const collaboratorCreditItems = useMemo(() => {
    if (collaboratorProfiles.length > 0) {
      return collaboratorProfiles.map((artist) => ({
        avatarUrl: artist.avatarUrl || "",
        id: artist.uid || artist.id,
        name: artist.displayName || artist.username || "Colaborador",
        userId: artist.uid || artist.id,
      }));
    }

    return collaboratorNames.map((name, index) => ({
      avatarUrl: "",
      id: `name-${index}`,
      name,
      userId: "",
    }));
  }, [collaboratorNames, collaboratorProfiles]);

  function keepClipPlaying(nextStatus: AVPlaybackStatus) {
    if (!nextStatus.isLoaded || nextStatus.isPlaying) {
      return;
    }

    void clipVideoRef.current?.playAsync().catch(() => null);
  }

  useEffect(() => {
    let active = true;

    if (!user?.uid || !track?.id) {
      setLiked(false);
      return;
    }

    isTrackLiked(user.uid, track.id)
      .then((value) => {
        if (active) setLiked(value);
      })
      .catch((error) => console.log("LOAD TRACK LIKE ERROR:", error));

    return () => {
      active = false;
    };
  }, [track?.id, user?.uid]);

  useEffect(() => {
    setLyricsVisible(false);
    setMenuVisible(false);
    setTrackContext(null);
    lyricsAnim.setValue(0);
  }, [lyricsAnim, track?.id]);

  useEffect(() => {
    let active = true;

    if (!track?.id) {
      setTrackContext(null);
      return;
    }

    void getTrackContext(track.id, track.albumId)
      .then((context) => {
        if (active) {
          setTrackContext(context);
        }
      })
      .catch((error) => console.log("LOAD TRACK CONTEXT ERROR:", error));

    return () => {
      active = false;
    };
  }, [track?.albumId, track?.id]);

  useEffect(() => {
    if (settledProgress === null || dragProgress !== null) {
      return;
    }

    if (Math.abs(liveProgress - settledProgress) < 0.015) {
      setSettledProgress(null);
    }
  }, [dragProgress, liveProgress, settledProgress]);

  const toggleView = () => {
    blurAnim.setValue(1);

    Animated.parallel([
      Animated.timing(boxAnim, {
        toValue: expanded ? 0 : 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(controlsAnim, {
        toValue: expanded ? 1 : 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(bgAnim, {
        toValue: expanded ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.timing(blurAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });

    setExpanded(!expanded);
  };

  const panelTranslate = controlsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.min(Math.max(height * 0.2, 155), 185)],
  });

  const boxScale = boxAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });

  const blurOverlayOpacity = blurAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.18],
  });

  function seekToProgress(value: number) {
    setSettledProgress(value);
    setDragProgress(null);

    if (duration > 0) {
      void seek(value * duration * 1000);
    }
  }

  function openReport() {
    setReportVisible(true);
  }

  async function sendTrackReport() {
    if (!user?.uid || !track?.id || reportSending) {
      return;
    }

    const reason = reportReason.trim();

    if (!reason) {
      Alert.alert("Reason required", "Enter the report reason.");
      return;
    }

    try {
      setReportSending(true);
      await createReport({
        reporterId: user.uid,
        targetType: "track",
        targetId: track.id,
        reason: "Report de track",
        details: reason,
      });
      setReportReason("");
      setReportVisible(false);
      showSuccess({});
    } catch (error) {
      console.log("TRACK REPORT ERROR:", error);
      Alert.alert("Error", "Could not send the report right now.");
    } finally {
      setReportSending(false);
    }
  }

  function openTrackMenu() {
    setMenuVisible(true);

    if (track?.id) {
      void getTrackContext(track.id, track.albumId)
        .then(setTrackContext)
        .catch((error) => console.log("LOAD TRACK CONTEXT ERROR:", error));
    }
  }

  function openArtistPreview() {
    if (track?.id && !trackContext) {
      void getTrackContext(track.id, track.albumId)
        .then(setTrackContext)
        .catch((error) => console.log("LOAD TRACK CONTEXT ERROR:", error));
    }

    setArtistPreviewVisible(true);
    Animated.spring(artistPreviewAnim, {
      damping: 18,
      stiffness: 220,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }

  function closeArtistPreview() {
    Animated.spring(artistPreviewAnim, {
      damping: 18,
      stiffness: 220,
      toValue: 0,
      useNativeDriver: true,
    }).start(() => setArtistPreviewVisible(false));
  }

  function closeMenuAndNavigate(
    pathname:
      | "/main/profile"
      | "/main/release/[slug]",
    params?: Record<string, string>,
  ) {
    setMenuVisible(false);
    router.push((params ? { pathname, params } : pathname) as never);
  }

  function getCurrentAlbumRouteParams() {
    const albumId = trackContext?.album?.id || track?.albumId || "";

    if (!albumId) {
      return null;
    }

    return {
      albumId,
      slug: trackContext?.album?.slug || albumId,
      title: track?.folderTitle || trackContext?.album?.title || "",
    };
  }

  function openCurrentAlbumFromPreview() {
    const params = getCurrentAlbumRouteParams();

    if (!params) {
      return;
    }

    closeArtistPreview();
    router.push({
      pathname: "/main/release/[slug]",
      params,
    } as never);
  }

  function openCurrentAlbumFromMenu() {
    const params = getCurrentAlbumRouteParams();

    if (!params) {
      return;
    }

    closeMenuAndNavigate("/main/release/[slug]", params);
  }

  async function handleToggleLiked() {
    if (!user?.uid || !track?.id) {
      Alert.alert("Login required", "Sign in to save this song to your likes.");
      return;
    }

    const previous = liked;
    setLiked(!previous);

    try {
      setLiked(await toggleTrackLike(user.uid, track.id));
    } catch (error) {
      setLiked(previous);
      console.log("TOGGLE TRACK LIKE ERROR:", error);
    }
  }

  function toggleLyrics() {
    if (lyricsLines.length === 0) {
      Alert.alert("Lyrics", "This song does not have lyrics yet.");
      return;
    }

    const nextVisible = !lyricsVisible;
    setLyricsVisible(nextVisible);
    Animated.timing(lyricsAnim, {
      toValue: nextVisible ? 1 : 0,
      duration: nextVisible ? 320 : 220,
      easing: nextVisible ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  const lyricsOpacity = lyricsAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0, 1],
  });

  const lyricsTranslateY = lyricsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [34, 0],
  });

  const lyricsScale = lyricsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1],
  });

  return (
    <View style={styles.container}>
      {track?.cover ? (
        <Image
          blurRadius={28}
          resizeMode="cover"
          source={{ uri: track.cover }}
          style={styles.coverBackground}
        />
      ) : null}
      <Svg pointerEvents="none" style={styles.coverBackgroundShade}>
        <Defs>
          <LinearGradient id="fullMidiaAlbumFade" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity="0.08" />
            <Stop offset="0.22" stopColor="#000000" stopOpacity="0.24" />
            <Stop offset="0.4" stopColor="#000000" stopOpacity="0.56" />
            <Stop offset="0.56" stopColor="#000000" stopOpacity="0.82" />
            <Stop offset="0.68" stopColor="#000000" stopOpacity="0.96" />
            <Stop offset="0.76" stopColor="#000000" />
            <Stop offset="1" stopColor="#000000" />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#fullMidiaAlbumFade)" height="100%" width="100%" />
      </Svg>
      {!expanded ? (
        <Pressable style={styles.collapsedTapLayer} onPress={toggleView} />
      ) : null}

      <Animated.View
        style={{
          position: "absolute",
          width,
          height,
          opacity: bgAnim,
        }}
      >
        {track?.shortVideo ? (
          <Video
            ref={clipVideoRef}
            source={{ uri: track.shortVideo }}
            style={styles.fullscreenClip}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping
            isMuted
            onPlaybackStatusUpdate={keepClipPlaying}
          />
        ) : null}
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { opacity: blurOverlayOpacity }]}
      >
        <BlurView tint="dark" intensity={45} style={{ flex: 1 }} />
      </Animated.View>

      <Animated.View
        pointerEvents={lyricsVisible ? "auto" : "none"}
        style={[
          styles.lyricsLayer,
          {
            opacity: lyricsOpacity,
            transform: [
              { translateY: lyricsTranslateY },
              { scale: lyricsScale },
            ],
          },
        ]}
      >
        <BlurView
          pointerEvents="none"
          tint="dark"
          intensity={38}
          style={StyleSheet.absoluteFillObject}
        />
        <ScrollView
          alwaysBounceVertical
          bounces
          contentContainerStyle={styles.lyricsContent}
          nestedScrollEnabled
          overScrollMode="always"
          scrollEventThrottle={16}
          scrollEnabled
          showsVerticalScrollIndicator={false}
          style={styles.lyricsScroll}
        >
          <View style={styles.lyricsHeader}>
            <View style={styles.lyricsHeaderTitle}>
              <Ionicons name="mic" size={19} color="#fff" />
              <Text style={styles.lyricsTitle}>Lyrics</Text>
            </View>
            <Pressable onPress={toggleLyrics} hitSlop={12}>
              <Ionicons name="chevron-down" size={24} color="#fff" />
            </Pressable>
          </View>
          {lyricsLines.map((line, index) => (
            <Text
              key={`${line}-${index}`}
              style={[
                styles.lyricLine,
                index === 0 ? styles.lyricLineActive : null,
              ]}
            >
              {line}
            </Text>
          ))}
        </ScrollView>
      </Animated.View>

      <View style={styles.header}>
        <Pressable style={styles.headerBack} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={30} color="#fff" />
        </Pressable>
        <Pressable hitSlop={8} onPress={openTrackMenu} style={styles.headerTitleButton}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {headerDisplayName}
          </Text>
        </Pressable>
        <Pressable style={styles.headerMessage} onPress={openReport}>
          <Ionicons name="alert-circle-outline" size={25} color="#fff" />
        </Pressable>
      </View>

      <Animated.View
        style={[
          styles.artworkWrapper,
          {
            opacity: boxAnim,
            transform: [{ scale: boxScale }],
          },
        ]}
      >
        <Pressable onPress={toggleView}>
          {track?.cover ? (
            <Image source={{ uri: track.cover }} style={styles.artwork} />
          ) : (
            <View style={styles.artwork} />
          )}
        </Pressable>
      </Animated.View>

      <Animated.View
        style={[
          styles.mainContent,
          { transform: [{ translateY: panelTranslate }] },
        ]}
      >
        <View style={styles.info}>
          <View style={styles.trackInfo}>
            <MarqueeText style={styles.music}>{track?.title ?? "Song"}</MarqueeText>
            <Pressable
              hitSlop={8}
              onPress={openTrackMenu}
              style={styles.artistButton}
            >
              <Text style={styles.user}>{track?.artist ?? "Sonnor"}</Text>
            </Pressable>
          </View>
          <View style={styles.icons}>
            <Pressable onPress={toggleLyrics}>
              <Ionicons
                name={lyricsVisible ? "mic" : "mic-outline"}
                size={32}
                color={lyricsLines.length > 0 ? "#fff" : "rgba(255,255,255,0.42)"}
              />
            </Pressable>
            <Pressable onPress={handleToggleLiked}>
              <Ionicons
                name={liked ? "heart" : "heart-outline"}
                size={32}
                color={liked ? "#ff5774" : "#fff"}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.slider}>
          <LinearSeekBar
            onSlidingComplete={seekToProgress}
            onSlidingStart={() => setDragProgress(progress)}
            onValueChange={setDragProgress}
            trackHeight={6}
            value={progress}
          />
          <View style={styles.timeWrapper}>
            <Text style={styles.time}>{formatMediaTime(visibleCurrentTime)}</Text>
            <Text style={styles.time}>{formatMediaTime(duration)}</Text>
          </View>
        </View>

        {expanded && (
          <View>
            <View style={styles.controls}>
              <Pressable onPress={playPrevious}>
                <Ionicons name="play-back" size={60} color="#fff" />
              </Pressable>
              <Pressable onPress={togglePlay}>
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={60}
                  color="#fff"
                />
              </Pressable>
              <Pressable onPress={playNext}>
                <Ionicons name="play-forward" size={60} color="#fff" />
              </Pressable>
            </View>
            <View style={styles.artistPullArea} {...artistPreviewPan.panHandlers}>
              <Pressable onPress={openArtistPreview} style={styles.artistPullButton}>
                <View style={styles.artistPullHandle} />
                <Text style={styles.artistPullText}>Credits</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Animated.View>

      {artistPreviewVisible ? (
        <>
          <Pressable
            onPress={closeArtistPreview}
            style={styles.artistPreviewBackdrop}
          />
          <Animated.View
            style={[
              styles.artistPreview,
              {
                opacity: artistPreviewAnim,
                transform: [
                  {
                    translateY: artistPreviewAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [90, 0],
                    }),
                  },
                ],
              },
            ]}
            {...artistPreviewPan.panHandlers}
          >
            <Pressable onPress={closeArtistPreview} style={styles.artistPreviewClose}>
              <Ionicons name="chevron-down" size={22} color="#fff" />
            </Pressable>
            <Pressable
              disabled={!getCurrentAlbumRouteParams()}
              onPress={openCurrentAlbumFromPreview}
              style={styles.artistPreviewCoverButton}
            >
              {track?.cover ? (
                <Image
                  source={{ uri: track.cover }}
                  style={styles.artistPreviewAvatar}
                />
              ) : (
                <View style={styles.artistPreviewAvatar} />
              )}
            </Pressable>
            <View style={styles.artistPreviewText}>
              <MarqueeText style={styles.artistPreviewName}>
                {track?.title || "Track"}
              </MarqueeText>
              {trackContext?.artist ? (
                <Pressable
                  onPress={() =>
                    {
                      closeArtistPreview();
                      router.push({
                        pathname: "/main/profile",
                        params: {
                          userId: trackContext.artist?.uid || trackContext.artist?.id || "",
                        },
                      } as never);
                    }
                  }
                  style={styles.creditLine}
                >
                  {trackContext.artist.avatarUrl ? (
                    <Image
                      source={{ uri: trackContext.artist.avatarUrl }}
                      style={styles.creditAvatar}
                    />
                  ) : (
                    <View style={styles.creditAvatar} />
                  )}
                  <View style={styles.creditTextBlock}>
                    <Text style={styles.creditCategory}>Original</Text>
                    <Text numberOfLines={1} style={styles.creditName}>
                      {trackContext.artist.displayName || trackContext.artist.username || track?.artist || "Sonnor"}
                    </Text>
                  </View>
                </Pressable>
              ) : null}
              {collaboratorCreditItems.length > 0 ? (
                <View style={styles.collaboratorBlock}>
                  <Text style={styles.creditCategory}>Colaboradores</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.collaboratorCreditsRow}
                  >
                    {collaboratorCreditItems.map((artist) => (
                      <Pressable
                        key={artist.id}
                        disabled={!artist.userId}
                        onPress={() => {
                          closeArtistPreview();
                          router.push({
                            pathname: "/main/profile",
                            params: { userId: artist.userId },
                          } as never);
                        }}
                        style={styles.collaboratorCredit}
                      >
                        {artist.avatarUrl ? (
                          <Image source={{ uri: artist.avatarUrl }} style={styles.creditAvatar} />
                        ) : (
                          <View style={styles.creditAvatar} />
                        )}
                        <Text numberOfLines={1} style={styles.collaboratorCreditName}>
                          {artist.name}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          </Animated.View>
        </>
      ) : null}

      <Modal
        animationType="fade"
        onRequestClose={() => setReportVisible(false)}
        transparent
        visible={reportVisible}
      >
        <Pressable
          onPress={() => setReportVisible(false)}
          style={styles.reportBackdrop}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={styles.reportCard}
          >
            <Text style={styles.reportTitle}>Report track</Text>
            <Text style={styles.reportSubtitle}>
              Briefly explain the reason for the report.
            </Text>
            <TextInput
              multiline
              placeholder="Enter the reason"
              placeholderTextColor="#777"
              style={styles.reportInput}
              value={reportReason}
              onChangeText={setReportReason}
            />
            <View style={styles.reportActions}>
              <Pressable
                style={styles.reportCancelButton}
                onPress={() => setReportVisible(false)}
              >
                <Text style={styles.reportCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={reportSending}
                style={styles.reportSendButton}
                onPress={sendTrackReport}
              >
                <Text style={styles.reportSendText}>
                  {reportSending ? "Sending..." : "Send"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
        transparent
        visible={menuVisible}
      >
        <Pressable
          onPress={() => setMenuVisible(false)}
          style={styles.menuBackdrop}
        >
          <Pressable onPress={() => null} style={styles.menuSheet}>
            <View style={styles.menuHandle} />

            <View style={styles.menuTrackHeader}>
              <Pressable
                disabled={!getCurrentAlbumRouteParams()}
                onPress={openCurrentAlbumFromMenu}
              >
                {track?.cover ? (
                  <Image source={{ uri: track.cover }} style={styles.menuTrackCover} />
                ) : (
                  <View style={styles.menuTrackCover} />
                )}
              </Pressable>
              <View style={styles.menuTrackText}>
                <MarqueeText style={styles.menuTrackTitle}>
                  {track?.title ?? "Song"}
                </MarqueeText>
                <Text numberOfLines={1} style={styles.menuTrackArtist}>
                  {track?.artist ?? "Sonnor"}
                </Text>
              </View>
              <Pressable hitSlop={10} onPress={handleToggleLiked}>
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={27}
                  color={liked ? "#ff5774" : "#fff"}
                />
              </Pressable>
            </View>

            <View style={styles.menuDivider} />

            {trackContext?.artist ? (
              <Pressable
                onPress={() =>
                  closeMenuAndNavigate("/main/profile", {
                    userId: trackContext.artist?.uid || trackContext.artist?.id || "",
                  })
                }
                style={styles.featuredMenuRow}
              >
                {trackContext.artist.avatarUrl ? (
                  <Image
                    source={{ uri: trackContext.artist.avatarUrl }}
                    style={styles.artistAvatar}
                  />
                ) : (
                  <View style={styles.artistAvatar} />
                )}
                <View style={styles.menuRowText}>
                  <Text style={styles.menuRowLabel}>View artist profile</Text>
                  <Text numberOfLines={1} style={styles.menuRowValue}>
                    {trackContext.artist.displayName || trackContext.artist.username}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={19} color="#999" />
              </Pressable>
            ) : null}

            {trackContext?.album ? (
              <Pressable
                onPress={() =>
                  closeMenuAndNavigate("/main/release/[slug]", {
                    albumId: trackContext.album?.id || "",
                    slug: trackContext.album?.slug || trackContext.album?.id || "",
                  })
                }
                style={styles.featuredMenuRow}
              >
                {trackContext.album.coverUrl ? (
                  <Image
                    source={{ uri: trackContext.album.coverUrl }}
                    style={styles.albumThumb}
                  />
                ) : (
                  <View style={styles.albumThumb} />
                )}
                <View style={styles.menuRowText}>
                  <Text style={styles.menuRowLabel}>View album</Text>
                  <Text numberOfLines={1} style={styles.menuRowValue}>
                    {trackContext.album.title}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={19} color="#999" />
              </Pressable>
            ) : null}

          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    paddingTop: 60,
  },
  coverBackground: {
    height: 8,
    left: "50%",
    opacity: 1,
    position: "absolute",
    top: 116,
    transform: [{ scale: 120 }],
    width: 8,
  },
  coverBackgroundShade: {
    ...StyleSheet.absoluteFillObject,
  },
  collapsedTapLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  mainContent: {
    elevation: 4,
    marginTop: 8,
    paddingBottom: 122,
    zIndex: 4,
  },
  header: {
    alignItems: "center",
    elevation: 4,
    justifyContent: "center",
    marginBottom: 30,
    marginTop: 6,
    minHeight: 32,
    zIndex: 4,
  },
  headerBack: {
    left: 20,
    position: "absolute",
    transform: [{ translateY: -14 }],
  },
  headerMessage: {
    opacity: 0.92,
    position: "absolute",
    right: 20,
    transform: [{ translateY: -14 }],
  },
  headerTitleButton: {
    alignItems: "center",
    justifyContent: "center",
    left: 64,
    position: "absolute",
    right: 64,
    transform: [{ translateY: -2 }],
  },
  headerTitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.25,
    textAlign: "center",
  },
  artworkWrapper: {
    alignItems: "center",
    marginBottom: 26,
    marginTop: 30,
  },
  artwork: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: 18,
    backgroundColor: "#000",
  },
  info: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 27,
    marginBottom: 2,
  },
  trackInfo: {
    flex: 1,
    paddingRight: 12,
  },
  artistButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
  },
  music: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.35,
  },
  user: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
  },
  icons: {
    alignItems: "center",
    flexDirection: "row",
    gap: 18,
    opacity: 0.92,
  },
  lyricsLayer: {
    backgroundColor: "rgba(5,5,5,0.36)",
    borderRadius: 28,
    bottom: 245,
    left: 18,
    overflow: "hidden",
    position: "absolute",
    right: 18,
    top: 112,
    zIndex: 35,
  },
  lyricsContent: {
    flexGrow: 1,
    paddingBottom: 46,
    paddingHorizontal: 24,
    paddingTop: 26,
  },
  lyricsScroll: {
    flex: 1,
  },
  lyricsHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  lyricsHeaderTitle: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  lyricsTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  lyricLine: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 34,
    marginBottom: 15,
  },
  lyricLineActive: {
    color: "#fff",
    fontSize: 27,
    lineHeight: 38,
  },
  slider: {
    paddingHorizontal: 25,
    marginBottom: 40,
  },
  time: {
    color: "#fff",
    fontSize: 12,
    marginTop: -6,
    alignSelf: "flex-end",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 18,
  },
  artistPullArea: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    marginTop: 8,
  },
  artistPullButton: {
    alignItems: "center",
    alignSelf: "center",
    gap: 7,
    justifyContent: "center",
    minWidth: 110,
    paddingVertical: 7,
  },
  artistPullHandle: {
    backgroundColor: "rgba(255,255,255,0.58)",
    borderRadius: 2,
    height: 4,
    width: 42,
  },
  artistPullText: {
    color: "rgba(255,255,255,0.64)",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.8,
    textAlign: "center",
    textTransform: "uppercase",
  },
  artistPreview: {
    alignItems: "flex-start",
    backgroundColor: "rgba(20,20,20,0.96)",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    bottom: 0,
    flexDirection: "row",
    gap: 13,
    left: 0,
    minHeight: 190,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
    position: "absolute",
    right: 0,
    zIndex: 60,
  },
  artistPreviewBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 59,
  },
  artistPreviewClose: {
    alignItems: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 2,
  },
  artistPreviewAvatar: {
    backgroundColor: "#292929",
    borderRadius: 14,
    height: 70,
    width: 70,
  },
  artistPreviewCoverButton: {
    borderRadius: 14,
    marginTop: 12,
    overflow: "hidden",
  },
  artistPreviewText: {
    flex: 1,
    paddingTop: 12,
  },
  artistPreviewName: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
  },
  creditLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 13,
  },
  creditAvatar: {
    backgroundColor: "#292929",
    borderRadius: 18,
    height: 36,
    width: 36,
  },
  creditTextBlock: {
    flex: 1,
  },
  creditCategory: {
    color: "rgba(255,255,255,0.48)",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  creditName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  collaboratorBlock: {
    marginTop: 16,
  },
  collaboratorCreditsRow: {
    gap: 14,
    paddingRight: 20,
    paddingTop: 8,
  },
  collaboratorCredit: {
    alignItems: "center",
    maxWidth: 68,
  },
  collaboratorCreditName: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 6,
    textAlign: "center",
    width: 68,
  },
  artistPreviewBio: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  artistPreviewProfile: {
    borderColor: "rgba(255,255,255,0.34)",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  artistPreviewProfileText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  fullscreenClip: {
    height: height * 1.16,
    left: -width * 0.08,
    position: "absolute",
    top: -height * 0.08,
    width: width * 1.16,
  },
  timeWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 5,
  },
  reportBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.72)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  reportCard: {
    backgroundColor: "#121212",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
    width: "100%",
  },
  reportTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  reportSubtitle: {
    color: "rgba(255,255,255,0.56)",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 6,
  },
  reportInput: {
    backgroundColor: "#1b1b1b",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    borderWidth: 1,
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 16,
    minHeight: 120,
    paddingHorizontal: 14,
    paddingTop: 13,
    textAlignVertical: "top",
  },
  reportActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  reportCancelButton: {
    alignItems: "center",
    backgroundColor: "#1d1d1d",
    borderRadius: 20,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
  },
  reportCancelText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  reportSendButton: {
    alignItems: "center",
    backgroundColor: "#E6E6E6",
    borderRadius: 20,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
  },
  reportSendText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "900",
  },
  menuBackdrop: {
    backgroundColor: "rgba(0,0,0,0.58)",
    flex: 1,
    justifyContent: "flex-end",
  },
  menuSheet: {
    backgroundColor: "#171717",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 34,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  menuHandle: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.28)",
    borderRadius: 2,
    height: 4,
    marginBottom: 20,
    width: 38,
  },
  menuTrackHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 13,
  },
  menuTrackCover: {
    backgroundColor: "#292929",
    borderRadius: 8,
    height: 58,
    width: 58,
  },
  menuTrackText: {
    flex: 1,
  },
  menuTrackTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  menuTrackArtist: {
    color: "rgba(255,255,255,0.56)",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
  },
  menuDivider: {
    backgroundColor: "rgba(255,255,255,0.09)",
    height: 1,
    marginVertical: 17,
  },
  featuredMenuRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 13,
    minHeight: 62,
  },
  artistAvatar: {
    backgroundColor: "#292929",
    borderRadius: 25,
    height: 50,
    width: 50,
  },
  albumThumb: {
    backgroundColor: "#292929",
    borderRadius: 5,
    height: 50,
    width: 50,
  },
  menuRowText: {
    flex: 1,
  },
  menuRowLabel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  menuRowValue: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginTop: 3,
  },
});
