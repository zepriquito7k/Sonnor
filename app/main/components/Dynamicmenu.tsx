import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Dynamicmenu() {
  const [progress, setProgress] = useState(0.4);
  const [isPlaying, setIsPlaying] = useState(false);

  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* HANDLE */}
      <View style={styles.handleWrapper}>
        <TouchableOpacity onPress={() => router.push("/main/home")}>
          <View style={styles.handle} />
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      <View style={styles.island}>
        {/* ICONS */}
        <View style={styles.topIconsRow}>
          <TouchableOpacity onPress={() => router.push("/main/profile")}>
            <Ionicons name="person-outline" size={32} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/main/create")}>
            <Ionicons name="add-outline" size={42} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/main/search")}>
            <Ionicons name="search-outline" size={32} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* PLAYER */}
        <View style={styles.playerRow}>
          <Image
            source={{
              uri: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/30/66/90/306690d4-2a29-402e-e406-6b319ce7731a/886447227169.jpg/3000x3000bb.jpg",
            }}
            style={styles.cover}
          />

          <View style={styles.trackInfo}>
            <Text style={styles.trackTitle}>Goosebumps</Text>
            <Text style={styles.trackArtist}>Travis Scott</Text>

            <Slider
              style={{ width: "100%", height: 30 }}
              minimumValue={0}
              maximumValue={1}
              value={progress}
              minimumTrackTintColor="#fff"
              maximumTrackTintColor="#444"
              thumbTintColor="#fff"
              onValueChange={(value: number) => setProgress(value)}
            />

            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{Math.round(progress * 83)}s</Text>
              <Text style={styles.timeText}>1:23</Text>
            </View>
          </View>

          {/* PLAY / PAUSE */}
          <TouchableOpacity onPress={() => setIsPlaying(!isPlaying)}>
            <Ionicons
              name={isPlaying ? "pause-outline" : "play-outline"}
              size={36}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },

  handleWrapper: {
    position: "absolute",
    top: -5,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },

  handle: {
    width: 90,
    height: 10,
    backgroundColor: "#fff",
    borderRadius: 5,
  },

  island: {
    backgroundColor: "#000",
    height: 180,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 20,
    paddingHorizontal: 28,
  },

  topIconsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  cover: {
    width: 65,
    height: 65,
    borderRadius: 12,
  },

  trackInfo: {
    flex: 1,
  },

  trackTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },

  trackArtist: {
    color: "#aaa",
    fontSize: 14,
    marginBottom: 4,
  },

  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -6,
  },

  timeText: {
    color: "#aaa",
    fontSize: 11,
  },
});
