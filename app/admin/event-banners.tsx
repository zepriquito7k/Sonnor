import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { pressableFeedback } from "../../components/pressFeedback";
import {
  approveEventRequest,
  listEventBanners,
  listEventRequests,
  removeEventBanner,
  rejectEventRequest,
  type EventBanner,
  type EventRequest,
} from "../../firebase/eventClient";
import { useCurrentUser } from "../../hooks/useCurrentUser";

function statusLabel(status: EventRequest["status"]) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Recusado";
  return "Pending";
}

export default function EventBannersAdminScreen() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [requests, setRequests] = useState<EventRequest[]>([]);
  const [banners, setBanners] = useState<EventBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [visibilityByRequest, setVisibilityByRequest] = useState<
    Record<string, "public" | "followers">
  >({});

  async function loadRequests() {
    setLoading(true);
    try {
      const [nextRequests, nextBanners] = await Promise.all([
        listEventRequests(),
        listEventBanners(),
      ]);
      setRequests(nextRequests);
      setBanners(nextBanners);
    } catch (error) {
      console.log("LOAD EVENT REQUESTS ERROR:", error);
      Alert.alert("Error", "Could not carregar os pedidos de eventos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === "pending").length,
    [requests],
  );

  async function handleApprove(request: EventRequest) {
    if (!request.imageUrl || !request.linkUrl) {
      Alert.alert("Incomplete request", "This request needs an image and link before it can be approved.");
      return;
    }

    try {
      setBusyId(request.id);
      await approveEventRequest(
        request,
        user?.displayName || user?.email || "Admin",
        visibilityByRequest[request.id] ?? "public",
      );
      await loadRequests();
    } catch (error) {
      console.log("APPROVE EVENT ERROR:", error);
      Alert.alert("Error", "Could not approve this event.");
    } finally {
      setBusyId("");
    }
  }

  async function handleReject(request: EventRequest) {
    const reason = reasons[request.id]?.trim();

    if (!reason) {
      Alert.alert("Reason required", "Enter a message so the person understands the rejection.");
      return;
    }

    try {
      setBusyId(request.id);
      await rejectEventRequest(
        request.id,
        user?.displayName || user?.email || "Admin",
        reason,
      );
      await loadRequests();
    } catch (error) {
      console.log("REJECT EVENT ERROR:", error);
      Alert.alert("Error", "Could not reject this event.");
    } finally {
      setBusyId("");
    }
  }

  async function handleRemoveBanner(bannerId: string) {
    try {
      setBusyId(bannerId);
      await removeEventBanner(bannerId);
      await loadRequests();
    } catch (error) {
      console.log("REMOVE EVENT BANNER ERROR:", error);
      Alert.alert("Error", "Could not remove this banner.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable style={pressableFeedback(styles.backButton)} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Pressable style={pressableFeedback(styles.refreshButton)} onPress={loadRequests}>
            <Ionicons name="refresh-outline" size={21} color="#fff" />
          </Pressable>
        </View>

        <Text style={styles.eyebrow}>Sonnor Admin</Text>
        <Text style={styles.title}>Events and banners</Text>
        <Text style={styles.subtitle}>
          Review the image, link, and description. When approved, the banner stays active for 1 week.
        </Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{pendingCount}</Text>
          <Text style={styles.summaryLabel}>pending requests</Text>
        </View>

        {banners.filter((banner) => banner.status === "published").length > 0 ? (
          <View style={styles.activeSection}>
            <Text style={styles.sectionTitle}>Active banners</Text>
            {banners
              .filter((banner) => banner.status === "published")
              .map((banner) => (
                <View key={banner.id} style={styles.activeBannerCard}>
                  {banner.mediaType === "video" ? (
                    <View style={[styles.activeBannerImage, styles.videoThumb]}>
                      <Ionicons name="videocam-outline" size={20} color="#fff" />
                    </View>
                  ) : (
                    <Image source={{ uri: banner.imageUrl }} style={styles.activeBannerImage} />
                  )}
                  <View style={styles.activeBannerInfo}>
                    <Text style={styles.activeBannerTitle} numberOfLines={1}>
                      {banner.title}
                    </Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {banner.visibility === "followers" ? "Followers" : "Public"} · expires in 1 week
                    </Text>
                  </View>
                  <Pressable
                    style={pressableFeedback(styles.removeBannerButton)}
                    onPress={() => handleRemoveBanner(banner.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                  </Pressable>
                </View>
              ))}
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 30 }} />
        ) : requests.length === 0 ? (
          <Text style={styles.emptyText}>There are no event requests yet.</Text>
        ) : (
          requests.map((request) => {
            const isPending = request.status === "pending";
            const isBusy = busyId === request.id;

            return (
              <View key={request.id} style={styles.card}>
                {request.imageUrl && request.mediaType === "video" ? (
                  <View style={[styles.bannerImage, styles.bannerFallback]}>
                    <Ionicons name="videocam-outline" size={34} color="#fff" />
                    <Text style={styles.videoLabel}>Event video</Text>
                  </View>
                ) : request.imageUrl ? (
                  <Image source={{ uri: request.imageUrl }} style={styles.bannerImage} />
                ) : (
                  <View style={[styles.bannerImage, styles.bannerFallback]}>
                    <Ionicons name="image-outline" size={30} color="#777" />
                  </View>
                )}

                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleBlock}>
                    <Text style={styles.cardTitle}>{request.title || "Untitled event"}</Text>
                    <Text style={styles.cardMeta}>User: {request.userId}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      request.status === "approved" ? styles.statusApproved : null,
                      request.status === "rejected" ? styles.statusRejected : null,
                    ]}
                  >
                    <Text style={styles.statusText}>{statusLabel(request.status)}</Text>
                  </View>
                </View>

                <Text style={styles.details}>{request.details}</Text>

                <Pressable
                  style={pressableFeedback(styles.linkButton)}
                  onPress={() => Linking.openURL(request.linkUrl).catch(() => null)}
                >
                  <Ionicons name="open-outline" size={18} color="#000" />
                  <Text style={styles.linkButtonText}>Open event link</Text>
                </Pressable>
                {request.imageUrl ? (
                  <Pressable
                    style={pressableFeedback(styles.mediaButton)}
                    onPress={() => Linking.openURL(request.imageUrl).catch(() => null)}
                  >
                    <Ionicons name="eye-outline" size={18} color="#fff" />
                    <Text style={styles.mediaButtonText}>View submitted media</Text>
                  </Pressable>
                ) : null}

                {request.rejectionReason ? (
                  <Text style={styles.reason}>Reason: {request.rejectionReason}</Text>
                ) : null}

                {isPending ? (
                  <View style={styles.actions}>
                    <View style={styles.visibilityRow}>
                      {(["public", "followers"] as const).map((visibility) => {
                        const selected =
                          (visibilityByRequest[request.id] ?? "public") === visibility;

                        return (
                          <Pressable
                            key={visibility}
                            style={[
                              styles.visibilityChip,
                              selected ? styles.visibilityChipActive : null,
                            ]}
                            onPress={() =>
                              setVisibilityByRequest((current) => ({
                                ...current,
                                [request.id]: visibility,
                              }))
                            }
                          >
                            <Text
                              style={[
                                styles.visibilityChipText,
                                selected ? styles.visibilityChipTextActive : null,
                              ]}
                            >
                              {visibility === "public" ? "Public" : "Followers"}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <Pressable
                      disabled={isBusy}
                      style={pressableFeedback(styles.approveButton)}
                      onPress={() => handleApprove(request)}
                    >
                      <Text style={styles.approveText}>{isBusy ? "Saving..." : "Approve for 1 week"}</Text>
                    </Pressable>
                    <TextInput
                      value={reasons[request.id] ?? ""}
                      onChangeText={(value) =>
                        setReasons((current) => ({ ...current, [request.id]: value }))
                      }
                      placeholder="Mensagem de recusa"
                      placeholderTextColor="#777"
                      style={styles.rejectInput}
                    />
                    <Pressable
                      disabled={isBusy}
                      style={pressableFeedback(styles.rejectButton)}
                      onPress={() => handleReject(request)}
                    >
                      <Text style={styles.rejectText}>Reject</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 58,
    paddingBottom: 140,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  eyebrow: {
    color: "#999",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.7,
    marginTop: 8,
  },
  subtitle: {
    color: "#aaa",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 8,
  },
  summaryCard: {
    marginTop: 22,
    marginBottom: 18,
    borderRadius: 22,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  summaryValue: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "900",
  },
  summaryLabel: {
    color: "#aaa",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 3,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10,
  },
  activeSection: {
    marginBottom: 18,
  },
  activeBannerCard: {
    minHeight: 74,
    borderRadius: 20,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    marginBottom: 8,
  },
  activeBannerImage: {
    width: 74,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#111",
  },
  activeBannerInfo: {
    flex: 1,
  },
  activeBannerTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  removeBannerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(210,62,62,0.12)",
  },
  videoThumb: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 24,
  },
  card: {
    borderRadius: 26,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 14,
  },
  bannerImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 18,
    backgroundColor: "#111",
  },
  bannerFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  videoLabel: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 12,
  },
  cardTitleBlock: {
    flex: 1,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  cardMeta: {
    color: "#777",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  statusApproved: {
    backgroundColor: "#20e68a",
  },
  statusRejected: {
    backgroundColor: "#ff8a8a",
  },
  statusText: {
    color: "#000",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  details: {
    color: "#d8d8d8",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 12,
  },
  linkButton: {
    minHeight: 44,
    borderRadius: 16,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#fff",
  },
  linkButtonText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "900",
  },
  mediaButton: {
    minHeight: 42,
    borderRadius: 16,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  mediaButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  reason: {
    color: "#ffb3b3",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 12,
  },
  actions: {
    marginTop: 14,
    gap: 10,
  },
  visibilityRow: {
    flexDirection: "row",
    gap: 8,
  },
  visibilityChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  visibilityChipActive: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  visibilityChipText: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "900",
  },
  visibilityChipTextActive: {
    color: "#000",
  },
  approveButton: {
    minHeight: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  approveText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "900",
  },
  rejectInput: {
    minHeight: 46,
    borderRadius: 16,
    paddingHorizontal: 14,
    color: "#fff",
    fontWeight: "800",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  rejectButton: {
    minHeight: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(210,62,62,0.14)",
    borderWidth: 1,
    borderColor: "rgba(210,62,62,0.35)",
  },
  rejectText: {
    color: "#ff8a8a",
    fontSize: 14,
    fontWeight: "900",
  },
});
