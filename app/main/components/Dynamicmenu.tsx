import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useState } from "react";

import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Dynamicmenu() {
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const router = useRouter();

  const [menuVisible, setMenuVisible] = useState(false);

  const openCreateMenu = () => setMenuVisible(true);
  const closeCreateMenu = () => setMenuVisible(false);

  return (
    <View style={styles.container}>
      {/* ========================== */}
      {/*     VIDRO NO FUNDO         */}
      {/* ========================== */}
      <BlurView intensity={70} tint="dark" style={styles.backgroundGlass} />

      {/* HANDLE */}
      <View style={styles.handleWrapper}>
        <TouchableOpacity onPress={() => router.push("/main/home")}>
          <View style={styles.handle} />
        </TouchableOpacity>
      </View>

      {/* MENU POPUP (estrutura ORIGINAL) */}
      <Modal transparent visible={menuVisible} animationType="fade">
        <Pressable style={styles.overlay} onPress={closeCreateMenu}>
          {/* VIDRO ESCURO por trás do POPUP */}
          <BlurView intensity={90} tint="dark" style={styles.popupGlass} />

          <View style={styles.popup}>
            <Text style={styles.popupTitle}>Criar</Text>

            <TouchableOpacity
              style={styles.popupOption}
              onPress={() => {
                closeCreateMenu();
                router.push("/main/components/PopUpCreate/create");
              }}
            >
              <Text style={styles.popupText}>Publicar Música</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.popupOption}
              onPress={() => {
                closeCreateMenu();
                router.push("/main/components/PopUpCreate/createPost");
              }}
            >
              <Text style={styles.popupText}>Publicar Foto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.popupCancel}
              onPress={closeCreateMenu}
            >
              <Text style={styles.popupCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* CONTENT */}
      <View style={styles.island}>
        {/* VIDRO ESCURO dentro da ILHA */}
        <BlurView intensity={30} tint="dark" style={styles.islandGlass} />

        {/* ICONS */}
        <View style={styles.topIconsRow}>
          <TouchableOpacity onPress={() => router.push("/main/profile")}>
            <Ionicons name="person-outline" size={32} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={openCreateMenu}>
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
              uri: "https://i.pinimg.com/736x/a9/d3/0d/a9d30dd1f3a897edb7821cf275ea08ab.jpg",
            }}
            style={styles.cover}
          />

          <View style={styles.trackInfo}>
            <Text style={styles.trackTitle}>Music Name</Text>
            <Text style={styles.trackArtist}>Artist Name</Text>

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
              <Text style={styles.timeText}>x:x</Text>
            </View>
          </View>

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

/* ============================= */
/*            STYLES            */
/* ============================= */

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },

  /* VIDRO GERAL */
  backgroundGlass: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },

  handleWrapper: {
    position: "absolute",
    top: -6,
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
    backgroundColor: "transparent",
    height: 180,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 20,
    paddingHorizontal: 28,
    overflow: "hidden",
  },

  islandGlass: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
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

  /* POPUP */
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  popupGlass: {
    ...StyleSheet.absoluteFillObject,
  },

  popup: {
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: 22,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
  },

  popupTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 14,
  },

  popupOption: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    marginBottom: 10,
  },

  popupText: {
    color: "#fff",
    fontSize: 15,
    textAlign: "center",
  },

  popupCancel: {
    paddingVertical: 12,
  },

  popupCancelText: {
    color: "#777",
    fontSize: 14,
    textAlign: "center",
  },
});
