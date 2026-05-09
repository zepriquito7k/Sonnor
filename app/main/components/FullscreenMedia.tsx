import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { VideoView, useVideoPlayer } from "expo-video";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useResponsive } from "../../..//utils/responsive";
import {
  formatMediaTime,
  useSharedMediaProgress,
} from "./SharedMediaProgress";

type FullscreenMediaProps = {
  visible: boolean;
  onClose: () => void;
  post?: {
    artist: string;
    avatar: string;
    caption: string;
    musicName: string;
  };
  type: "image" | "video";
  source: string;
};

export default function FullscreenMedia({
  visible,
  onClose,
  type,
  source,
  post,
}: FullscreenMediaProps) {
  const { wp, hp } = useResponsive();
  const {
    progress,
    currentTime,
    duration,
    isPlaying,
    setProgress,
    togglePlayback,
  } = useSharedMediaProgress();
  const [liked, setLiked] = useState(false);

  const player = useVideoPlayer(source, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = false;
    videoPlayer.play();
  });

  useEffect(() => {
    if (type !== "video") {
      return;
    }

    if (isPlaying) {
      player.play();
      return;
    }

    player.pause();
  }, [isPlaying, player, type]);

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={styles.container}>
        {type === "image" && (
          <View style={styles.imageWrapper}>
            <Image
              resizeMode="cover"
              source={{ uri: source }}
              style={[styles.media, { width: wp(100), height: hp(100) }]}
            />

            <View style={styles.imageOverlay} />

            <View style={styles.imageContent}>
              <View style={styles.topRow}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  activeOpacity={0.85}
                >
                  <Ionicons name="chevron-back" size={20} color="#fff" />
                </TouchableOpacity>

                <View style={styles.musicInside}>
                  <Text style={styles.musicTitle}>
                    {post?.musicName ?? "Nome da música"}
                  </Text>
                </View>

                <View style={styles.topSpacer} />
              </View>

              <View style={styles.bottomInfo}>
                <View style={styles.captionTouch}>
                  <Image
                    source={{
                      uri:
                        post?.avatar ??
                        "https://i.pinimg.com/1200x/b9/e8/db/b9e8db33168a26c9ca697a05ddc80937.jpg",
                    }}
                    style={styles.avatar}
                  />

                  <View style={styles.captionTextBlock}>
                    <Text style={styles.username}>
                      {post?.artist ?? "Artist Name"}
                    </Text>
                    <Text style={styles.previewText}>
                      {post?.caption ?? "Bio do post"}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionColumn}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => setLiked((current) => !current)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={liked ? "heart" : "heart-outline"}
                      size={22}
                      color={liked ? "#ff4b6a" : "#fff"}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() =>
                      Alert.alert("Report", "A opção de report estará disponível em breve.")
                    }
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name="alert-circle-outline"
                      size={22}
                      color="#fff"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {type === "video" && (
          <View style={styles.videoWrapper}>
            <TouchableOpacity
              style={styles.videoCloseButton}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>

            <VideoView
              player={player}
              style={[styles.media, { width: wp(100), height: hp(100) }]}
              contentFit="contain"
              allowsFullscreen={false}
            />

            <Pressable
              style={styles.controlsOverlay}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={styles.controlsCard}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1}
                  value={progress}
                  onValueChange={setProgress}
                  minimumTrackTintColor="#fff"
                  maximumTrackTintColor="rgba(255,255,255,0.35)"
                  thumbTintColor="#fff"
                />

                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>
                    {formatMediaTime(currentTime)}
                  </Text>
                  <Text style={styles.timeText}>{formatMediaTime(duration)}</Text>
                </View>

                <Pressable style={styles.playButton} onPress={togglePlayback}>
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={26}
                    color="#fff"
                  />
                </Pressable>
              </View>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  media: {},
  imageWrapper: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  imageContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 58,
    paddingBottom: 18,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topSpacer: {
    width: 40,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  musicInside: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  musicTitle: {
    color: "#f3f3f3",
    fontSize: 16,
    fontStyle: "italic",
    textAlign: "center",
  },
  bottomInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
  },
  captionTouch: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-end",
  },
  captionTextBlock: {
    flex: 1,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  username: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
  },
  previewText: {
    color: "#ededed",
    fontSize: 13,
    lineHeight: 18,
  },
  actionColumn: {
    gap: 12,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoWrapper: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  videoCloseButton: {
    position: "absolute",
    top: 54,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 60,
  },
  controlsOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 36,
    paddingHorizontal: 20,
    zIndex: 50,
    elevation: 50,
  },
  controlsCard: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    zIndex: 51,
    elevation: 51,
  },
  slider: {
    width: "100%",
    height: 32,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -4,
  },
  timeText: {
    color: "#fff",
    fontSize: 12,
  },
  playButton: {
    alignSelf: "center",
    marginTop: 12,
  },
});
