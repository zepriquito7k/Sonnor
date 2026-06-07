import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { ResizeMode, Video } from "expo-av";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { usePlayer } from "../../../context/PlayerContext";
import { isTrackLiked, toggleTrackLike } from "../../../firebase/socialClient";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { formatMediaTime } from "./SharedMediaProgress";

const { width, height } = Dimensions.get("window");
const ART_SIZE = width * 0.9;

export default function FullMidia() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { playNext, playPrevious, seek, status, togglePlay, track } = usePlayer();
  const [expanded, setExpanded] = useState(true);
  const [liked, setLiked] = useState(false);
  const [lyricsVisible, setLyricsVisible] = useState(false);
  const [dragProgress, setDragProgress] = useState<number | null>(null);
  const [settledProgress, setSettledProgress] = useState<number | null>(null);

  const boxAnim = useRef(new Animated.Value(1)).current;
  const controlsAnim = useRef(new Animated.Value(0)).current;
  const blurAnim = useRef(new Animated.Value(0)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;
  const lyricsAnim = useRef(new Animated.Value(0)).current;
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
    lyricsAnim.setValue(0);
  }, [lyricsAnim, track?.id]);

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
    outputRange: [0, 90],
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

  function openComments() {
    Alert.alert(
      "Comentários",
      "Aqui podes abrir a conversa do lançamento e responder ao público.",
    );
  }

  async function handleToggleLiked() {
    if (!user?.uid || !track?.id) {
      Alert.alert("Login necessario", "Entra para guardar esta musica nas curtidas.");
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
      Alert.alert("Lyrics", "Esta musica ainda nao tem lyrics.");
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
      <View pointerEvents="none" style={styles.coverBackgroundShade} />
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
            source={{ uri: track.shortVideo }}
            style={styles.fullscreenClip}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping
            isMuted
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {track?.artist ?? "Sonnor"}
        </Text>
        <Pressable style={styles.headerMessage} onPress={openComments}>
          <Ionicons name="chatbubble-outline" size={25} color="#fff" />
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
          <View>
            <Text style={styles.music}>{track?.title ?? "Sem musica"}</Text>
            <Text style={styles.user}>{track?.artist ?? "Sonnor"}</Text>
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
            <Ionicons name="reorder-four-outline" size={32} color="#fff" />
          </View>
        </View>

        <View style={styles.slider}>
          <Slider
            minimumValue={0}
            maximumValue={1}
            value={progress}
            onSlidingStart={() => setDragProgress(progress)}
            onValueChange={setDragProgress}
            onSlidingComplete={seekToProgress}
            minimumTrackTintColor="#fff"
            maximumTrackTintColor="rgba(255,255,255,0.3)"
            tapToSeek
          />
          <View style={styles.timeWrapper}>
            <Text style={styles.time}>{formatMediaTime(visibleCurrentTime)}</Text>
            <Text style={styles.time}>{formatMediaTime(duration)}</Text>
          </View>
        </View>

        {expanded && (
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
        )}
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
    paddingTop: 60,
  },
  coverBackground: {
    ...StyleSheet.absoluteFillObject,
    height: "112%",
    opacity: 0.9,
    transform: [{ scale: 1.18 }],
    width: "112%",
  },
  coverBackgroundShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.52)",
  },
  collapsedTapLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  mainContent: {
    elevation: 4,
    marginTop: 34,
    paddingBottom: 122,
    zIndex: 4,
  },
  header: {
    alignItems: "center",
    elevation: 4,
    justifyContent: "center",
    marginBottom: 34,
    marginTop: 22,
    minHeight: 32,
    paddingHorizontal: 58,
    zIndex: 4,
  },
  headerBack: {
    left: 20,
    position: "absolute",
  },
  headerMessage: {
    position: "absolute",
    right: 20,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "400",
    maxWidth: "62%",
    textAlign: "center",
    transform: [{ translateY: 8 }],
  },
  artworkWrapper: {
    alignItems: "center",
    marginBottom: 50,
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
    paddingHorizontal: 25,
    marginBottom: -5,
  },
  music: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  user: {
    color: "#aaa",
    fontSize: 15,
  },
  icons: {
    flexDirection: "row",
    gap: 16,
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
    marginBottom: 26,
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
});
