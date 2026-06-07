import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { BlurView } from "expo-blur";
import { sendPasswordResetEmail } from "firebase/auth";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
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

import { usePlayer } from "../../../context/PlayerContext";
import { isCurrentUserAdmin } from "../../../firebase/adminClient";
import {
  deleteAccountWithCode,
  logout,
  sendDeleteAccountCode,
} from "../../../firebase/auth";
import { auth } from "../../../firebase/config";
import { getProfileContent } from "../../../firebase/contentClient";
import {
  getWeeklyRejectedProfileRequests,
  requestDisplayNameChange,
  sendProfileReport,
  type ProfileRequest,
} from "../../../firebase/profileRequests";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { formatMediaTime } from "./SharedMediaProgress";

export default function Dynamicmenu() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { track, status, togglePlay, seek } = usePlayer();

  const [menuVisible, setMenuVisible] = useState(false);
  const [userMenuVisible, setUserMenuVisible] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [deleteAccountRequested, setDeleteAccountRequested] = useState(false);
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [dragProgress, setDragProgress] = useState<number | null>(null);
  const [settledProgress, setSettledProgress] = useState<number | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileName, setProfileName] = useState("");
  const [username, setUsername] = useState("");
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [reportText, setReportText] = useState("");
  const [followersCount, setFollowersCount] = useState(0);
  const [tracks, setTracks] = useState<{ id: string; title: string; likesCount: number }[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<ProfileRequest[]>([]);

  const openCreateMenu = () => setMenuVisible(true);
  const closeCreateMenu = () => setMenuVisible(false);
  const openUserMenu = () => setUserMenuVisible(true);
  const closeUserMenu = () => setUserMenuVisible(false);
  const openUrl = (url: string) =>
    Linking.openURL(url).catch((error) => console.log("OPEN URL ERROR:", error));

  useEffect(() => {
    let mounted = true;

    async function loadAdminState() {
      try {
        const nextIsAdmin = await isCurrentUserAdmin();

        if (mounted) {
          setIsAdmin(nextIsAdmin);
        }
      } catch (error) {
        console.log("LOAD ADMIN STATE ERROR:", error);

        if (mounted) {
          setIsAdmin(false);
        }
      }
    }

    loadAdminState();

    return () => {
      mounted = false;
    };
  }, [user?.email, user?.uid]);

  useEffect(() => {
    let mounted = true;

    if (!user?.uid) {
      setAvatarUrl("");
      setProfileName("");
      setUsername("");
      setTracks([]);
      setRejectedRequests([]);
      return;
    }

    getProfileContent(user.uid)
      .then((content) => {
        if (!mounted) {
          return;
        }

        setAvatarUrl(content.user.avatarUrl || content.user.bannerUrl || "");
        setProfileName(
          content.user.username ||
            user.displayName ||
            content.user.displayName ||
            "Perfil",
        );
        setUsername(content.user.username ? `@${content.user.username}` : "");
        setDisplayNameDraft(content.user.displayName || content.user.username || "");
        setFollowersCount(content.user.followersCount || 0);
        setTracks(
          content.tracks.map((item) => ({
            id: item.id,
            title: typeof item.title === "string" ? item.title : "Musica",
            likesCount: typeof item.likesCount === "number" ? item.likesCount : 0,
          })),
        );
      })
      .catch((error) => console.log("LOAD DYNAMIC AVATAR ERROR:", error));

    getWeeklyRejectedProfileRequests(user.uid)
      .then((requests) => {
        if (mounted) {
          setRejectedRequests(requests);
        }
      })
      .catch((error) => console.log("LOAD DYNAMIC REQUESTS ERROR:", error));

    return () => {
      mounted = false;
    };
  }, [user?.displayName, user?.email, user?.uid]);

  async function handleLogout() {
    if (logoutLoading) return;

    try {
      setLogoutLoading(true);
      closeUserMenu();
      await logout();
      router.replace("/");
    } catch (error) {
      console.log("LOGOUT ERROR:", error);
      Alert.alert("Erro", "Não foi possível terminar sessão agora.");
    } finally {
      setLogoutLoading(false);
    }
  }

  function handleOpenAdmin() {
    closeUserMenu();
    router.push("/admin");
  }

  function handleHelp() {
    closeUserMenu();
    openUrl("https://sonnor.app/help");
  }

  function openReport() {
    closeUserMenu();
    setReportVisible(true);
  }

  async function handleRequestDisplayName() {
    if (!user?.uid || !displayNameDraft.trim()) {
      return;
    }

    await requestDisplayNameChange({
      userId: user.uid,
      currentValue: profileName,
      requestedValue: displayNameDraft.trim(),
    });
    setPrivacyVisible(false);
    Alert.alert("Pedido enviado", "O admin vai aprovar ou recusar a mudanca do nome.");
  }

  async function handlePasswordReset() {
    if (!user?.email) {
      Alert.alert("Email em falta", "Nao encontrei email para enviar a troca de senha.");
      return;
    }

    await sendPasswordResetEmail(auth, user.email);
    setPrivacyVisible(false);
    Alert.alert("Email enviado", "Abre o teu email para mudar a senha.");
  }

  async function handleSendReport() {
    if (!user?.uid || !reportText.trim()) {
      Alert.alert("Escreve o motivo", "Preciso do texto do report para enviar.");
      return;
    }

    await sendProfileReport({
      reporterId: user.uid,
      targetUserId: user.uid,
      details: reportText.trim(),
    });
    setReportText("");
    setReportVisible(false);
    Alert.alert("Report enviado", "O teu report ficou guardado para revisao.");
  }

  async function handleStartDeleteAccount() {
    if (!user?.email || deleteLoading) {
      Alert.alert("Email em falta", "Nao encontrei email para confirmar esta conta.");
      return;
    }

    try {
      setDeleteLoading(true);
      await sendDeleteAccountCode(user.email);
      setDeleteAccountRequested(true);
      Alert.alert("Codigo enviado", "Enviamos um codigo de 4 digitos para o teu email.");
    } catch (error) {
      console.log("SEND DELETE ACCOUNT CODE ERROR:", error);
      Alert.alert("Erro", "Nao foi possivel enviar o codigo agora.");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleConfirmDeleteAccount() {
    if (!user?.email || deleteLoading) {
      return;
    }

    const cleanDeleteCode = deleteCode.replace(/\D/g, "").slice(0, 4);

    if (cleanDeleteCode.length !== 4 || deleteConfirmation.trim().toLowerCase() !== "apagar") {
      Alert.alert("Confirmacao em falta", "Escreve o codigo de 4 digitos e a palavra apagar.");
      return;
    }

    try {
      setDeleteLoading(true);
      await deleteAccountWithCode({
        email: user.email,
        code: cleanDeleteCode,
        confirmation: deleteConfirmation,
      });
      await logout().catch((logoutError) =>
        console.log("LOGOUT AFTER DELETE ERROR:", logoutError),
      );
      setPrivacyVisible(false);
      router.replace("/");
    } catch (error: any) {
      console.log("DELETE ACCOUNT ERROR:", error);
      const message =
        error?.code === "functions/deadline-exceeded"
          ? "Este codigo expirou. Pede outro codigo."
          : error?.code === "functions/permission-denied"
            ? "O codigo esta incorreto ou ja houve tentativas demais."
            : error?.code === "functions/not-found"
              ? "Nao encontrei esse codigo. Pede outro codigo."
              : error?.message || "Nao foi possivel apagar a conta agora.";

      Alert.alert("Erro", message);
    } finally {
      setDeleteLoading(false);
    }
  }

  const loadedStatus = status?.isLoaded ? status : null;
  const currentTime = loadedStatus ? loadedStatus.positionMillis / 1000 : 0;
  const duration = loadedStatus?.durationMillis
    ? loadedStatus.durationMillis / 1000
    : 0;
  const liveProgress = duration > 0 ? currentTime / duration : 0;
  const progress = dragProgress ?? settledProgress ?? liveProgress;
  const isPlaying = loadedStatus?.isPlaying ?? false;
  const hasTrack = track !== null;
  const topTracks = [...tracks]
    .sort((left, right) => right.likesCount - left.likesCount)
    .slice(0, 3);

  useEffect(() => {
    if (settledProgress === null || dragProgress !== null) {
      return;
    }

    if (Math.abs(liveProgress - settledProgress) < 0.015) {
      setSettledProgress(null);
    }
  }, [dragProgress, liveProgress, settledProgress]);

  function handleProgressComplete(value: number) {
    setSettledProgress(value);
    setDragProgress(null);

    if (!duration) {
      return;
    }

    seek(value * duration * 1000).catch((error) =>
      console.log("DYNAMIC SEEK ERROR:", error),
    );
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
                router.push("/main/create/track");
              }}
            >
              <Text style={styles.popupText}>Criar lancamento</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.popupOption}
              onPress={() => {
                closeCreateMenu();
                router.push("/main/components/PopUpCreate/createPost");
              }}
            >
              <Text style={styles.popupText}>Criar Post</Text>
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
            style={styles.sidePanel}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.sideHeader}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.sideAvatar} />
              ) : (
                <View style={[styles.sideAvatar, styles.avatarFallback]}>
                  <Ionicons name="person-outline" size={22} color="#fff" />
                </View>
              )}
              <View style={styles.sideNameBlock}>
                <Text style={styles.sideName} numberOfLines={1}>{profileName || "Perfil"}</Text>
                {username ? <Text style={styles.sideMeta} numberOfLines={1}>{username}</Text> : null}
              </View>
            </View>

            <TouchableOpacity style={styles.sideRow} onPress={() => { closeUserMenu(); setPrivacyVisible(true); }}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#fff" />
              <Text style={styles.sideText}>Privacidade e Seguranca</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sideRow} onPress={() => { closeUserMenu(); setStatsVisible(true); }}>
              <Ionicons name="stats-chart-outline" size={22} color="#fff" />
              <Text style={styles.sideText}>Estatisticas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sideRow} onPress={openReport}>
              <Ionicons name="flag-outline" size={22} color="#fff" />
              <Text style={styles.sideText}>Report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sideRow} onPress={handleHelp}>
              <Ionicons name="help-circle-outline" size={22} color="#fff" />
              <Text style={styles.sideText}>Ajuda</Text>
            </TouchableOpacity>
            {isAdmin ? (
              <TouchableOpacity style={styles.sideRow} onPress={handleOpenAdmin}>
                <Ionicons name="key-outline" size={22} color="#fff" />
                <Text style={styles.sideText}>Admin</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.logoutGrid} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#ff7474" />
              <Text style={styles.logoutGridText}>{logoutLoading ? "A sair..." : "Logout"}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={privacyVisible} animationType="fade">
        <Pressable style={styles.panelModalBackdrop} onPress={() => setPrivacyVisible(false)}>
          <Pressable style={styles.panelCard} onPress={(event) => event.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.panelTitle}>Privacidade e Seguranca</Text>
              <TextInput
                value={displayNameDraft}
                onChangeText={setDisplayNameDraft}
                placeholder="Display name"
                placeholderTextColor="#777"
                style={styles.input}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleRequestDisplayName}>
                <Text style={styles.primaryButtonText}>Pedir mudanca do nome</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryAction} onPress={handlePasswordReset}>
                <Text style={styles.secondaryActionText}>Mudar senha</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteAccountBox} onPress={handleStartDeleteAccount}>
                <Ionicons name="trash-outline" size={24} color="#ff7474" />
                <Text style={styles.deleteAccountText}>
                  {deleteLoading && !deleteAccountRequested ? "A enviar codigo..." : "Apagar conta"}
                </Text>
              </TouchableOpacity>

              {deleteAccountRequested ? (
                <View style={styles.deleteConfirmPanel}>
                  <Text style={styles.deleteHelpText}>
                    Escreve o codigo de 4 digitos enviado para o teu email e depois escreve apagar.
                  </Text>
                  <TextInput
                    value={deleteCode}
                    onChangeText={(value) => setDeleteCode(value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="Codigo de 4 digitos"
                    placeholderTextColor="#777"
                    keyboardType="number-pad"
                    maxLength={4}
                    style={styles.input}
                  />
                  <TextInput
                    value={deleteConfirmation}
                    onChangeText={setDeleteConfirmation}
                    placeholder="Escreve apagar"
                    placeholderTextColor="#777"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                  <TouchableOpacity style={styles.deleteFinalButton} onPress={handleConfirmDeleteAccount}>
                    <Text style={styles.deleteFinalText}>
                      {deleteLoading ? "A apagar..." : "Confirmar apagar conta"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <Text style={styles.panelSubtitle}>Pedidos recusados</Text>
              {rejectedRequests.length === 0 ? (
                <Text style={styles.emptyText}>Nao ha pedidos recusados esta semana.</Text>
              ) : (
                rejectedRequests.map((request) => (
                  <View key={request.id} style={styles.deniedBox}>
                    <Text style={styles.deniedTitle}>
                      {request.kind === "display_name" ? "Nome Desaprovado" : "Musica Desaprovada"} - Motivo:
                    </Text>
                    <Text style={styles.deniedText}>
                      {request.adminName || "Admin"} - {request.rejectionReason || "Sem mensagem."}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={statsVisible} animationType="fade">
        <Pressable style={styles.panelModalBackdrop} onPress={() => setStatsVisible(false)}>
          <Pressable style={styles.panelCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.panelTitle}>Estatisticas</Text>
            <View style={styles.simpleStatRow}>
              <Text style={styles.simpleStatLabel}>Pessoas que seguiram</Text>
              <Text style={styles.simpleStatValue}>{followersCount}</Text>
            </View>
            <View style={styles.simpleStatRow}>
              <Text style={styles.simpleStatLabel}>Pessoas que deixaram de seguir</Text>
              <Text style={styles.simpleStatValue}>0</Text>
            </View>
            <Text style={styles.panelSubtitle}>Musicas mais populares</Text>
            {topTracks.length === 0 ? (
              <Text style={styles.emptyText}>Ainda nao ha musicas com atividade.</Text>
            ) : (
              topTracks.map((item, index) => (
                <Text key={item.id} style={styles.popularLine}>
                  {index + 1}. {item.title} - {item.likesCount} likes
                </Text>
              ))
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={reportVisible} animationType="fade">
        <Pressable style={styles.panelModalBackdrop} onPress={() => setReportVisible(false)}>
          <Pressable style={styles.panelCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.panelTitle}>Report</Text>
            <TextInput
              value={reportText}
              onChangeText={setReportText}
              placeholder="Escreve o motivo"
              placeholderTextColor="#777"
              style={[styles.input, styles.textArea]}
              multiline
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleSendReport}>
              <Text style={styles.primaryButtonText}>Enviar report</Text>
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
              <Ionicons name="person" size={18} color="#fff" />
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
              <Ionicons name="settings-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.createButton}
            onPress={openCreateMenu}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {hasTrack ? (
          <View style={styles.playerCard}>
            <TouchableOpacity onPress={() => router.push("/main/components/fullmidia")}>
              <View style={styles.cover}>
                {track.cover ? (
                  <Image source={{ uri: track.cover }} style={styles.coverImage} />
                ) : (
                  <Ionicons name="musical-notes-outline" size={24} color="#fff" />
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.trackInfo}>
              <View style={styles.trackRow}>
                <View style={styles.trackTextBlock}>
                  <Text style={styles.trackTitle} numberOfLines={1}>
                    {track.title ?? "Música"}
                  </Text>
                  <Text style={styles.trackArtist} numberOfLines={1}>
                    {track.artist ?? "Artista"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.playButton}
                  onPress={togglePlay}
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
                onSlidingStart={() => setDragProgress(progress)}
                onValueChange={setDragProgress}
                onSlidingComplete={handleProgressComplete}
                tapToSeek
              />

              <View style={styles.timeRow}>
                <Text style={styles.timeText}>
                  {formatMediaTime(currentTime)}
                </Text>
                <Text style={styles.timeText}>{formatMediaTime(duration)}</Text>
              </View>
            </View>
          </View>
        ) : null}
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
    minHeight: 72,
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
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    overflow: "hidden",
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  coverImage: {
    width: "100%",
    height: "100%",
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
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "flex-end",
  },
  sidePanel: {
    width: "82%",
    maxWidth: 340,
    minHeight: "100%",
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 24,
    backgroundColor: "#090909",
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.1)",
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
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  sideNameBlock: {
    flex: 1,
  },
  sideName: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
  },
  sideMeta: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 3,
  },
  sideRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  sideText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
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
  logoutGridText: {
    color: "#ff7474",
    fontSize: 15,
    fontWeight: "900",
  },
  panelModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  panelCard: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "84%",
    alignSelf: "center",
    borderRadius: 24,
    padding: 18,
    backgroundColor: "#0c0c0c",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  panelTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 14,
  },
  panelSubtitle: {
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
  textArea: {
    minHeight: 92,
    textAlignVertical: "top",
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  primaryButtonText: {
    color: "#000",
    fontWeight: "900",
  },
  secondaryAction: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    marginBottom: 10,
  },
  secondaryActionText: {
    color: "#fff",
    fontWeight: "800",
  },
  deleteAccountBox: {
    marginTop: 16,
    minHeight: 82,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(218,52,52,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,90,90,0.34)",
  },
  deleteAccountText: {
    color: "#ff7474",
    fontSize: 15,
    fontWeight: "900",
  },
  deleteConfirmPanel: {
    marginTop: 12,
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  deleteHelpText: {
    color: "#ccc",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  deleteFinalButton: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(218,52,52,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,90,90,0.45)",
  },
  deleteFinalText: {
    color: "#ff8a8a",
    fontWeight: "900",
  },
  emptyText: {
    color: "#888",
    fontSize: 14,
    lineHeight: 20,
  },
  deniedBox: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 10,
  },
  deniedTitle: {
    color: "#fff",
    fontWeight: "900",
    marginBottom: 6,
  },
  deniedText: {
    color: "#ccc",
    lineHeight: 20,
  },
  simpleStatRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  simpleStatLabel: {
    color: "#ddd",
    fontWeight: "700",
  },
  simpleStatValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  popularLine: {
    color: "#ddd",
    fontSize: 14,
    lineHeight: 24,
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
