import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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

import { logout } from "../../../firebase/auth";
import { formatMediaTime, useSharedMediaProgress } from "./SharedMediaProgress";

export default function Dynamicmenu() {
  const router = useRouter();
  const {
    progress,
    currentTime,
    duration,
    isPlaying,
    setProgress,
    togglePlayback,
  } = useSharedMediaProgress();

  const [menuVisible, setMenuVisible] = useState(false);
  const [userMenuVisible, setUserMenuVisible] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const openCreateMenu = () => setMenuVisible(true);
  const closeCreateMenu = () => setMenuVisible(false);
  const openUserMenu = () => setUserMenuVisible(true);
  const closeUserMenu = () => setUserMenuVisible(false);

  async function handleLogout() {
    if (logoutLoading) return;

    try {
      setLogoutLoading(true);
      closeUserMenu();
      await logout();
      router.replace("/auth/login");
    } catch (error) {
      console.log("LOGOUT ERROR:", error);
      Alert.alert("Erro", "Não foi possível terminar sessão agora.");
    } finally {
      setLogoutLoading(false);
    }
  }

  function handleOpenSettings() {
    closeUserMenu();
    router.push("/main/profile");
  }

  function handleHelp() {
    closeUserMenu();
    Alert.alert(
      "Ajuda rápida",
      "Usa o botão + para criar, a lupa para pesquisar, a capa da música para abrir o player completo e o perfil para editar banner, fundo, álbuns e posts.",
    );
  }

  function handleReport() {
    closeUserMenu();
    Alert.alert("Reportar conteúdo", "Escolhe um motivo.", [
      {
        text: "Spam",
        onPress: () => Alert.alert("Report enviado", "Marcado como spam."),
      },
      {
        text: "Conteúdo impróprio",
        onPress: () =>
          Alert.alert(
            "Report enviado",
            "O conteúdo foi sinalizado para revisão.",
          ),
      },
      {
        text: "Cancelar",
        style: "cancel",
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <BlurView intensity={70} tint="dark" style={styles.backgroundGlass} />

      <View style={styles.handleWrapper}>
        <TouchableOpacity onPress={() => router.push("/main/home")}>
          <View style={styles.handle} />
        </TouchableOpacity>
      </View>

      <Modal transparent visible={menuVisible} animationType="fade">
        <Pressable style={styles.overlay} onPress={closeCreateMenu}>
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
              <Text style={styles.popupText}>Publicar música</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.popupOption}
              onPress={() => {
                closeCreateMenu();
                router.push("/main/components/PopUpCreate/createPost");
              }}
            >
              <Text style={styles.popupText}>Publicar foto</Text>
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

      <Modal transparent visible={userMenuVisible} animationType="fade">
        <Pressable style={styles.userMenuOverlay} onPress={closeUserMenu}>
          <Pressable
            style={styles.userMenuCard}
            onPress={(event) => event.stopPropagation()}
          >
            <TouchableOpacity
              style={styles.userMenuOption}
              onPress={handleOpenSettings}
            >
              <Text style={styles.userMenuText}>Configurações</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.userMenuOption} onPress={handleHelp}>
              <Text style={styles.userMenuText}>Ajuda</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.userMenuOption}
              onPress={handleReport}
            >
              <Text style={styles.userMenuText}>Report</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.userMenuOption}
              onPress={handleLogout}
            >
              <Text style={[styles.userMenuText, styles.logoutText]}>
                {logoutLoading ? "A sair..." : "Logout"}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={styles.island}>
        <BlurView intensity={30} tint="dark" style={styles.islandGlass} />

        <View style={styles.headerRow}>
          <View style={styles.iconGroup}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push("/main/profile")}
            >
              <Ionicons name="person-outline" size={18} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push("/main/search")}
            >
              <Ionicons name="search-outline" size={18} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarButton}
              onPress={openUserMenu}
              activeOpacity={0.85}
            >
              <Image
                source={{
                  uri: "https://i.pinimg.com/1200x/b9/e8/db/b9e8db33168a26c9ca697a05ddc80937.jpg",
                }}
                style={styles.avatarImage}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.createButton}
            onPress={openCreateMenu}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.playerCard}>
          <TouchableOpacity
            onPress={() => router.push("/main/components/fullmidia")}
          >
            <Image
              source={{
                uri: "https://i.pinimg.com/736x/17/c5/01/17c5017285bc72806ff99176f8d1051b.jpg",
              }}
              style={styles.cover}
            />
          </TouchableOpacity>

          <View style={styles.trackInfo}>
            <View style={styles.trackRow}>
              <View style={styles.trackTextBlock}>
                <Text style={styles.trackTitle} numberOfLines={1}>
                  Music Name
                </Text>
                <Text style={styles.trackArtist} numberOfLines={1}>
                  Artist Name
                </Text>
              </View>

              <TouchableOpacity
                style={styles.playButton}
                onPress={togglePlayback}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={18}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>

            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={progress}
              minimumTrackTintColor="#fff"
              maximumTrackTintColor="rgba(255,255,255,0.16)"
              thumbTintColor="#fff"
              onValueChange={setProgress}
            />

            <View style={styles.timeRow}>
              <Text style={styles.timeText}>
                {formatMediaTime(currentTime)}
              </Text>
              <Text style={styles.timeText}>{formatMediaTime(duration)}</Text>
            </View>
          </View>
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
    minHeight: 148,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 16,
    overflow: "hidden",
  },
  islandGlass: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  iconGroup: {
    flexDirection: "row",
    gap: 10,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  avatarButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  createButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  cover: {
    width: 67,
    height: 67,
    borderRadius: 14,
  },
  trackInfo: {
    flex: 1,
  },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  trackTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  trackTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  trackArtist: {
    color: "rgba(255,255,255,0.56)",
    fontSize: 12,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  slider: {
    width: "100%",
    height: 22,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -4,
  },
  timeText: {
    color: "rgba(255,255,255,0.42)",
    fontSize: 10,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  userMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  userMenuCard: {
    position: "absolute",
    right: 18,
    bottom: 156,
    minWidth: 180,
    borderRadius: 18,
    paddingVertical: 8,
    backgroundColor: "rgba(15,15,15,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  userMenuOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userMenuText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  logoutText: {
    color: "#cf2f2f",
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
