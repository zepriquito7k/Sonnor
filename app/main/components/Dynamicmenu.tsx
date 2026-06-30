import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { sendPasswordResetEmail } from "firebase/auth";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { usePlayer } from "../../../context/PlayerContext";
import LinearSeekBar from "../../../components/LinearSeekBar";
import MarqueeText from "../../../components/MarqueeText";
import { useSuccessFeedback } from "../../../components/SuccessFeedback";
import { isCurrentUserAdmin } from "../../../firebase/adminClient";
import {
  deleteAccountWithCode,
  logout,
  sendDeleteAccountCode,
} from "../../../firebase/auth";
import { auth } from "../../../firebase/config";
import {
  getHomeContent,
  getProfileContent,
  getReportableUsers,
} from "../../../firebase/contentClient";
import {
  getMyMusicSubmissions,
  markMusicOwnershipContactSeen,
} from "../../../firebase/musicReviewClient";
import {
  getWeeklyRejectedProfileRequests,
  requestDisplayNameChange,
} from "../../../firebase/profileRequests";
import { createReport } from "../../../firebase/socialClient";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { getAvatarFallbackColor } from "../../../utils/avatarFallback";
import { formatMediaTime } from "./SharedMediaProgress";

type ReportMode = "music" | "user" | "other";
type ReportOption = {
  id: string;
  type: "track" | "album" | "user";
  title: string;
  subtitle: string;
  ownerId?: string;
};
type RejectedListItem = {
  id: string;
  title: string;
  reason: string;
  reviewer: string;
};

export default function Dynamicmenu() {
  const router = useRouter();
  const { showSuccess } = useSuccessFeedback();
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
  const [reportMode, setReportMode] = useState<ReportMode>("music");
  const [reportQuery, setReportQuery] = useState("");
  const [reportOptions, setReportOptions] = useState<ReportOption[]>([]);
  const [selectedReportOption, setSelectedReportOption] = useState<ReportOption | null>(null);
  const [contactNotice, setContactNotice] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFallbackColor, setAvatarFallbackColor] = useState("");
  const [profileName, setProfileName] = useState("");
  const [username, setUsername] = useState("");
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [reportText, setReportText] = useState("");
  const [followersCount, setFollowersCount] = useState(0);
  const [tracks, setTracks] = useState<{ id: string; title: string; likesCount: number }[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<RejectedListItem[]>([]);

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
      setAvatarFallbackColor("");
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

        const userData = content.user as typeof content.user & {
          avatarFallbackColor?: string;
        };
        setAvatarUrl(content.user.avatarUrl || content.user.bannerUrl || "");
        setAvatarFallbackColor(getAvatarFallbackColor(userData.avatarFallbackColor));
        setProfileName(
          content.user.username ||
            user.displayName ||
            content.user.displayName ||
            "Profile",
        );
        setUsername(content.user.username ? `@${content.user.username}` : "");
        setDisplayNameDraft(content.user.displayName || content.user.username || "");
        setFollowersCount(content.user.followersCount || 0);
        setTracks(
          content.tracks.map((item) => ({
            id: item.id,
            title: typeof item.title === "string" ? item.title : "Music",
            likesCount: typeof item.likesCount === "number" ? item.likesCount : 0,
          })),
        );
      })
      .catch((error) => console.log("LOAD DYNAMIC AVATAR ERROR:", error));

    Promise.all([
      getWeeklyRejectedProfileRequests(user.uid),
      getMyMusicSubmissions(user.uid),
    ])
      .then(([requests, submissions]) => {
        if (!mounted) {
          return;
        }

        const deniedProfileRequests: RejectedListItem[] = requests.map((request) => ({
          id: `profile-${request.id}`,
          reason: request.rejectionReason || "No message.",
          reviewer: request.adminName || "Admin",
          title:
            request.kind === "display_name"
              ? "Name rejected"
              : request.kind === "delete_album"
                ? "Folder deletion request rejected"
                : "Song deletion request rejected",
        }));
        const deniedMusicSubmissions: RejectedListItem[] = submissions
          .filter((item) => item.status === "rejected")
          .map((item) => {
            const title =
              item.reviewBatchTitle ||
              item.declaredTitle ||
              item.originalFileName ||
              "Song submission";
            const note = item.rightsReview?.note?.trim();

            return {
              id: `music-${item.id}`,
              reason: note || "Sem mensagem.",
              reviewer: "Admin",
              title,
            };
          });

        setRejectedRequests([...deniedProfileRequests, ...deniedMusicSubmissions]);

        const pendingContact = submissions.find((item) => {
          const data = item as unknown as Record<string, unknown>;
          return data.adminContactRequested === true && data.adminContactSeen !== true;
        });

        if (pendingContact) {
          const data = pendingContact as unknown as Record<string, unknown>;
          setContactNotice({
            id: pendingContact.id,
            message:
              typeof data.adminContactMessage === "string"
                ? data.adminContactMessage
                : "You have a review contact available in your email.",
          });
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
      Alert.alert("Error", "Could not sign out right now.");
    } finally {
      setLogoutLoading(false);
    }
  }

  function handleOpenAdmin() {
    closeUserMenu();
    router.push("/admin");
  }

  const loadReportUsers = useCallback(async (searchText = "") => {
    const reportUsers = await getReportableUsers(searchText);

    setReportOptions((currentOptions) => {
      const unique = new Map<string, ReportOption>();

      currentOptions
        .filter((item) => item.type !== "user")
        .forEach((item) => {
          unique.set(`${item.type}-${item.id}`, item);
        });

      reportUsers
        .filter((item) => (item.uid || item.id) !== user?.uid)
        .forEach((item) => {
          const id = item.uid || item.id;

          if (!id) {
            return;
          }

          unique.set(`user-${id}`, {
            id,
            type: "user",
            title: item.displayName || "Profile",
            subtitle: "Artist",
          });
        });

      return Array.from(unique.values());
    });
  }, [user?.uid]);

  function handleHelp() {
    closeUserMenu();
    openUrl("https://sonnor.app/help");
  }

  async function openReport() {
    closeUserMenu();
    setReportVisible(true);
    setReportMode("music");
    setReportQuery("");
    setSelectedReportOption(null);

    if (!user?.uid) {
      return;
    }

    try {
      const [home, reportUsers] = await Promise.all([
        getHomeContent(user.uid),
        getReportableUsers(""),
      ]);
      const tracksById = new Map(home.tracks.map((item) => [item.id, item]));
      const recentTrackIds = home.recentPlays
        .map((play) => ("trackId" in play && typeof play.trackId === "string" ? play.trackId : ""))
        .filter(Boolean);
      const recentMusic = recentTrackIds
        .map((trackId) => tracksById.get(trackId))
        .filter(Boolean)
        .filter((item) => item!.userId !== user.uid)
        .map((item) => ({
          id: item!.id,
          type: "track" as const,
          title: item!.title || "Music",
          subtitle: "Recent track",
          ownerId: item!.userId,
        }));
      const allMusic = [
        ...recentMusic,
        ...home.tracks
          .filter((item) => item.userId !== user.uid)
          .map((item) => ({
            id: item.id,
            type: "track" as const,
            title: item.title || "Music",
            subtitle: "Track",
            ownerId: item.userId,
          })),
        ...home.albums
          .filter((item) => !("userId" in item) || item.userId !== user.uid)
          .map((item) => ({
            id: item.id,
            type: "album" as const,
            title: item.title || "Folder",
            subtitle: `${item.type || "album"} · Folder`,
            ownerId:
              "userId" in item && typeof item.userId === "string"
                ? item.userId
                : undefined,
          })),
      ];
      const usersForReport = reportUsers
        .filter((item) => (item.uid || item.id) !== user.uid)
        .map((item) => ({
          id: item.uid || item.id,
          type: "user" as const,
          title: item.displayName || "Profile",
          subtitle: "Artist",
        }))
        .filter((item) => Boolean(item.id));
      const unique = new Map<string, ReportOption>();
      [...allMusic, ...usersForReport].forEach((item) => {
        unique.set(`${item.type}-${item.id}`, item);
      });
      setReportOptions(Array.from(unique.values()));
    } catch (error) {
      console.log("LOAD REPORT OPTIONS ERROR:", error);
    }
  }

  useEffect(() => {
    if (!reportVisible || reportMode !== "user") {
      return;
    }

    const timeout = setTimeout(() => {
      loadReportUsers(reportQuery).catch((error) => {
        console.log("LOAD REPORT USERS ERROR:", error);
      });
    }, 220);

    return () => clearTimeout(timeout);
  }, [loadReportUsers, reportVisible, reportMode, reportQuery]);

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
    showSuccess({ message: "Request sent" });
  }

  async function handlePasswordReset() {
    if (!user?.email) {
      Alert.alert("Missing email", "Could not find an email to send the password reset.");
      return;
    }

    await sendPasswordResetEmail(auth, user.email);
    setPrivacyVisible(false);
    showSuccess({ message: "Email sent" });
  }

  async function handleSendReport() {
    if (!user?.uid) {
      return;
    }

    if (reportMode === "other" && !reportText.trim()) {
      Alert.alert("Enter the reason", "I need the report text before sending.");
      return;
    }

    if (reportMode !== "other" && !selectedReportOption) {
      Alert.alert("Choose an option", "Select the song, folder, or user.");
      return;
    }

    if (reportMode === "other") {
      await createReport({
        reporterId: user.uid,
        targetType: "comment",
        targetId: user.uid,
        reason: "Outro",
        details: reportText.trim(),
      });
    } else if (selectedReportOption) {
      await createReport({
        reporterId: user.uid,
        targetType: selectedReportOption.type,
        targetId: selectedReportOption.id,
        reason: reportMode === "user" ? "Denuncia de user" : "Denuncia de song/folder",
        details:
          reportText.trim() ||
          `${selectedReportOption.title} · ${selectedReportOption.subtitle}`,
      });
    }
    setReportText("");
    setReportQuery("");
    setSelectedReportOption(null);
    setReportVisible(false);
    showSuccess({ message: "Report sent" });
  }

  const visibleReportOptions = reportOptions.filter((item) => {
    if (reportMode === "user" && item.type !== "user") return false;
    if (reportMode === "music" && item.type === "user") return false;
    if (item.type === "user" && item.id === user?.uid) return false;
    if (item.ownerId && item.ownerId === user?.uid) return false;
    const query = reportQuery.trim().toLowerCase();
    return !query || `${item.title} ${item.subtitle}`.toLowerCase().includes(query);
  });
  const canSendReport =
    reportMode === "other" ? Boolean(reportText.trim()) : Boolean(selectedReportOption);

  async function handleStartDeleteAccount() {
    if (!user?.email || deleteLoading) {
      Alert.alert("Missing email", "Could not find an email to confirm this account.");
      return;
    }

    try {
      setDeleteLoading(true);
      await sendDeleteAccountCode(user.email);
      setDeleteAccountRequested(true);
      showSuccess({ message: "Code sent" });
    } catch (error) {
      console.log("SEND DELETE ACCOUNT CODE ERROR:", error);
      Alert.alert("Error", "Could not send the code right now.");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleConfirmDeleteAccount() {
    if (!user?.email || deleteLoading) {
      return;
    }

    const cleanDeleteCode = deleteCode.replace(/\D/g, "").slice(0, 4);

    if (cleanDeleteCode.length !== 4 || deleteConfirmation.trim().toLowerCase() !== "delete") {
      Alert.alert("Missing confirmation", "Enter the 4-digit code and the word delete.");
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
          ? "This code expired. Request another code."
          : error?.code === "functions/permission-denied"
            ? "The code is incorrect or there have been too many attempts."
            : error?.code === "functions/not-found"
              ? "Could not find esse code. Request another code."
              : error?.message || "Could not delete the account right now.";

      Alert.alert("Error", message);
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

  function handleContactNoticePress() {
    const notice = contactNotice;
    setContactNotice(null);
    if (notice) {
      markMusicOwnershipContactSeen(notice.id).catch((error) =>
        console.log("MARK CONTACT NOTICE SEEN ERROR:", error),
      );
    }
    Linking.openURL("googlegmail://").catch(() => null);
  }

  return (
    <View style={styles.container}>
      <BlurView intensity={70} tint="dark" style={styles.backgroundGlass} />

      {contactNotice ? (
        <TouchableOpacity
          style={styles.contactNotice}
          onPress={handleContactNoticePress}
          activeOpacity={0.88}
        >
          <View style={styles.contactNoticeDot} />
          <View style={styles.contactNoticeTextBlock}>
            <Text style={styles.contactNoticeTitle}>Chat online</Text>
            <Text style={styles.contactNoticeText} numberOfLines={1}>
              Tap here to open and reply
            </Text>
          </View>
          <Ionicons name="mail-outline" size={18} color="#000" />
        </TouchableOpacity>
      ) : null}

      <View style={styles.handleWrapper}>
        <TouchableOpacity
          onPress={() =>
            router.replace({
              pathname: "/main/home",
              params: { refresh: String(Date.now()) },
            })
          }
        >
          <View style={styles.handle} />
        </TouchableOpacity>
      </View>

      <Modal transparent visible={menuVisible} animationType="fade">
        <Pressable style={styles.overlay} onPress={closeCreateMenu}>
          <BlurView intensity={90} tint="dark" style={styles.popupGlass} />

          <View style={styles.popup}>
            <Text style={styles.popupTitle}>Create</Text>

            <TouchableOpacity
              style={styles.popupOption}
              activeOpacity={0.62}
              onPress={() => {
                closeCreateMenu();
                router.push("/main/create/track");
              }}
            >
              <Text style={styles.popupText}>Create release</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.popupOption}
              activeOpacity={0.62}
              onPress={() => {
                closeCreateMenu();
                router.push("/main/components/PopUpCreate/createPost");
              }}
            >
              <Text style={styles.popupText}>Create Post</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.popupCancel}
              activeOpacity={0.62}
              onPress={closeCreateMenu}
            >
              <Text style={styles.popupCancelText}>Cancel</Text>
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
                <View
                  style={[
                    styles.sideAvatar,
                    styles.avatarFallback,
                    { backgroundColor: avatarFallbackColor },
                  ]}
                >
                  <Ionicons name="person" size={24} color="#fff" />
                </View>
              )}
              <View style={styles.sideNameBlock}>
                <Text style={styles.sideName} numberOfLines={1}>{profileName || "Profile"}</Text>
                {username ? <Text style={styles.sideMeta} numberOfLines={1}>{username}</Text> : null}
              </View>
            </View>

            <TouchableOpacity style={styles.sideRow} activeOpacity={0.62} onPress={() => { closeUserMenu(); setPrivacyVisible(true); }}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#fff" />
              <Text style={styles.sideText}>Privacidade e Seguranca</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sideRow} activeOpacity={0.62} onPress={() => { closeUserMenu(); setStatsVisible(true); }}>
              <Ionicons name="stats-chart-outline" size={22} color="#fff" />
              <Text style={styles.sideText}>Stats</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sideRow} activeOpacity={0.62} onPress={openReport}>
              <Ionicons name="flag-outline" size={22} color="#fff" />
              <Text style={styles.sideText}>Report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sideRow} activeOpacity={0.62} onPress={handleHelp}>
              <Ionicons name="help-circle-outline" size={22} color="#fff" />
              <Text style={styles.sideText}>Ajuda</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sideRow}
              activeOpacity={0.62}
              onPress={() => {
                closeUserMenu();
                router.push("/main/events/request");
              }}
            >
              <Ionicons name="calendar-outline" size={22} color="#fff" />
              <Text style={styles.sideText}>Request event</Text>
            </TouchableOpacity>
            {isAdmin ? (
              <TouchableOpacity style={styles.sideRow} activeOpacity={0.62} onPress={handleOpenAdmin}>
                <Ionicons name="key-outline" size={22} color="#fff" />
                <Text style={styles.sideText}>Admin</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.logoutGrid} activeOpacity={0.62} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#ff7474" />
              <Text style={styles.logoutGridText}>{logoutLoading ? "A sair..." : "Logout"}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={privacyVisible} animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={18}
          style={styles.keyboardRoot}
        >
          <Pressable style={styles.panelModalBackdrop} onPress={() => setPrivacyVisible(false)}>
            <Pressable style={styles.panelCard} onPress={(event) => event.stopPropagation()}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.privacyScrollContent}
              >
              <Text style={styles.panelTitle}>Privacidade e Seguranca</Text>
              <TextInput
                value={displayNameDraft}
                onChangeText={setDisplayNameDraft}
                placeholder="Display name"
                placeholderTextColor="#777"
                style={styles.input}
              />
              <TouchableOpacity style={styles.primaryButton} activeOpacity={0.62} onPress={handleRequestDisplayName}>
                <Text style={styles.primaryButtonText}>Pedir mudanca do name</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryAction} activeOpacity={0.62} onPress={handlePasswordReset}>
                <Text style={styles.secondaryActionText}>Mudar senha</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteAccountBox} activeOpacity={0.62} onPress={handleStartDeleteAccount}>
                <Ionicons name="trash-outline" size={24} color="#fff" />
                <Text style={styles.deleteAccountText}>
                  {deleteLoading && !deleteAccountRequested ? "Sending code..." : "Delete account"}
                </Text>
              </TouchableOpacity>

              {deleteAccountRequested ? (
                <View style={styles.deleteConfirmPanel}>
                  <Text style={styles.deleteHelpText}>
                    Enter the 4-digit code sent to your email, then enter delete.
                  </Text>
                  <TextInput
                    value={deleteCode}
                    onChangeText={(value) => setDeleteCode(value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="4-digit code"
                    placeholderTextColor="#777"
                    keyboardType="number-pad"
                    maxLength={4}
                    style={[styles.input, styles.deleteInput]}
                  />
                  <TextInput
                    value={deleteConfirmation}
                    onChangeText={setDeleteConfirmation}
                    placeholder="Enter delete"
                    placeholderTextColor="#777"
                    autoCapitalize="none"
                    style={[styles.input, styles.deleteInput]}
                  />
                  <TouchableOpacity style={styles.deleteFinalButton} activeOpacity={0.62} onPress={handleConfirmDeleteAccount}>
                    <Text style={styles.deleteFinalText}>
                      {deleteLoading ? "Deleting..." : "Confirm account deletion"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <Text style={styles.panelSubtitle}>Rejected requests</Text>
              {rejectedRequests.length === 0 ? (
                <Text style={styles.emptyText}>There are no rejected requests this week.</Text>
              ) : (
                rejectedRequests.map((request) => (
                  <View key={request.id} style={styles.deniedBox}>
                    <Text style={styles.deniedTitle}>
                      {request.title} - Reason:
                    </Text>
                    <Text style={styles.deniedText}>
                      {request.reason}
                    </Text>
                  </View>
                ))
              )}
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal transparent visible={statsVisible} animationType="fade">
        <Pressable style={styles.panelModalBackdrop} onPress={() => setStatsVisible(false)}>
          <Pressable style={styles.panelCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.panelTitle}>Stats</Text>
            <View style={styles.simpleStatRow}>
              <Text style={styles.simpleStatLabel}>New followers</Text>
              <Text style={styles.simpleStatValue}>{followersCount}</Text>
            </View>
            <View style={styles.simpleStatRow}>
              <Text style={styles.simpleStatLabel}>Unfollowed</Text>
              <Text style={styles.simpleStatValue}>0</Text>
            </View>
            <Text style={styles.panelSubtitle}>Most popular music</Text>
            {topTracks.length === 0 ? (
              <Text style={styles.emptyText}>There are no songs with activity yet.</Text>
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
            <View style={styles.reportModeRow}>
              {(["music", "user", "other"] as ReportMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  activeOpacity={0.62}
                  style={[
                    styles.reportModeButton,
                    reportMode === mode ? styles.reportModeButtonActive : null,
                  ]}
                  onPress={() => {
                    setReportMode(mode);
                    setSelectedReportOption(null);
                    setReportQuery("");
                  }}
                >
                  <Text
                    style={[
                      styles.reportModeText,
                      reportMode === mode ? styles.reportModeTextActive : null,
                    ]}
                  >
                    {mode === "music" ? "Music" : mode === "user" ? "User" : "Other"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {reportMode === "other" ? (
              <TextInput
                value={reportText}
                onChangeText={setReportText}
                placeholder="Enter the reason"
                placeholderTextColor="#777"
                style={[styles.input, styles.textArea]}
                multiline
              />
            ) : (
              <>
                <TextInput
                  value={reportQuery}
                  onChangeText={setReportQuery}
                  placeholder={reportMode === "user" ? "Search any user" : "Search song or folder"}
                  placeholderTextColor="#777"
                  style={styles.input}
                />
                <ScrollView style={styles.reportList} keyboardShouldPersistTaps="handled">
                  {visibleReportOptions.map((item) => (
                    <TouchableOpacity
                      key={`${item.type}-${item.id}`}
                      activeOpacity={0.62}
                      style={[
                        styles.reportOption,
                        selectedReportOption?.id === item.id &&
                        selectedReportOption?.type === item.type
                          ? styles.reportOptionActive
                          : null,
                      ]}
                      onPress={() => setSelectedReportOption(item)}
                    >
                      <Ionicons
                        name={
                          item.type === "user"
                            ? "person-outline"
                            : item.type === "album"
                              ? "albums-outline"
                              : "musical-note-outline"
                        }
                        size={20}
                        color="#fff"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reportOptionTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.reportOptionSubtitle} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {visibleReportOptions.length === 0 ? (
                    <Text style={styles.emptyText}>
                      {reportMode === "user"
                        ? "Nenhum user encontrado."
                        : "Sem songs ou folders recentes."}
                    </Text>
                  ) : null}
                </ScrollView>
                <TextInput
                  value={reportText}
                  onChangeText={setReportText}
                  placeholder="Detalhe opcional"
                  placeholderTextColor="#777"
                  style={[styles.input, styles.textAreaSmall]}
                  multiline
                />
              </>
            )}
            <TouchableOpacity
              style={[styles.primaryButton, !canSendReport ? styles.primaryButtonDisabled : null]}
              activeOpacity={0.62}
              onPress={handleSendReport}
              disabled={!canSendReport}
            >
              <Text style={styles.primaryButtonText}>Send report</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
      <View style={styles.island}>
        <BlurView intensity={30} tint="dark" style={styles.islandGlass} />

        <View style={styles.headerRow}>
          <View style={styles.iconGroup}>
            <TouchableOpacity
              style={styles.avatarButton}
              activeOpacity={0.62}
              onPress={() => router.push("/main/profile")}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View
                  style={[
                    styles.avatarFallbackFill,
                    { backgroundColor: avatarFallbackColor },
                  ]}
                >
                  <Ionicons name="person" size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.62}
              onPress={() => router.push("/main/search")}
            >
              <Ionicons name="search-outline" size={18} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarButton}
              onPress={openUserMenu}
              activeOpacity={0.62}
            >
              <Ionicons name="settings-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.createButton}
            activeOpacity={0.62}
            onPress={openCreateMenu}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {hasTrack ? (
          <View style={styles.playerCard}>
            <TouchableOpacity activeOpacity={0.62} onPress={() => router.push("/main/components/fullmidia")}>
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
                  <MarqueeText style={styles.trackTitle}>
                    {track.title ?? "Music"}
                  </MarqueeText>
                  <Text style={styles.trackArtist} numberOfLines={1}>
                    {track.artist ?? "Artist"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.playButton}
                  activeOpacity={0.62}
                  onPress={togglePlay}
                >
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={18}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>

              <LinearSeekBar
                style={styles.slider}
                value={progress}
                maximumTrackColor="rgba(255,255,255,0.16)"
                onSlidingStart={() => setDragProgress(progress)}
                onValueChange={setDragProgress}
                onSlidingComplete={handleProgressComplete}
                trackHeight={5}
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
  contactNotice: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 116,
    minHeight: 54,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#E6E6E6",
    zIndex: 20,
  },
  contactNoticeDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#20e68a",
  },
  contactNoticeTextBlock: {
    flex: 1,
  },
  contactNoticeTitle: {
    color: "#000",
    fontSize: 13,
    fontWeight: "900",
  },
  contactNoticeText: {
    color: "#333",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
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
  avatarFallbackFill: {
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
    width: "100%",
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
    marginTop: 8,
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
  keyboardRoot: {
    flex: 1,
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
  privacyScrollContent: {
    paddingBottom: 34,
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
  textAreaSmall: {
    minHeight: 66,
    textAlignVertical: "top",
  },
  deleteInput: {
    backgroundColor: "#f2f2f2",
    borderColor: "#fff",
    color: "#000",
    fontWeight: "900",
  },
  reportModeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  reportModeButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  reportModeButtonActive: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  reportModeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  reportModeTextActive: {
    color: "#000",
  },
  reportList: {
    maxHeight: 220,
    marginBottom: 10,
  },
  reportOption: {
    minHeight: 58,
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 8,
  },
  reportOptionActive: {
    borderColor: "#fff",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  reportOptionTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  reportOptionSubtitle: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  primaryButtonDisabled: {
    opacity: 0.35,
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
