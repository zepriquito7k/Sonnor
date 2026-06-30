import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { pressableFeedback } from "../../components/pressFeedback";
import {
  approveProfileRequest,
  getAdminProfileRequests,
  rejectProfileRequest,
  type ProfileRequest,
  type ProfileRequestKind,
} from "../../firebase/profileRequests";
import { useCurrentUser } from "../../hooks/useCurrentUser";

const sections: { kind: ProfileRequestKind; title: string; empty: string }[] = [
  {
    kind: "display_name",
    title: "Mudanca de name",
    empty: "Sem pedidos de name.",
  },
  {
    kind: "delete_album",
    title: "Delete albums",
    empty: "No album deletion requests.",
  },
  {
    kind: "delete_track",
    title: "Delete songs",
    empty: "No song deletion requests.",
  },
];

function requestTitle(request: ProfileRequest) {
  if (request.kind === "display_name") {
    return `${request.currentValue || "Name atual"} -> ${request.requestedValue || "Novo name"}`;
  }

  if (request.kind === "delete_album") {
    return request.targetTitle || request.targetId || "Untitled album";
  }

  return request.targetTitle || request.targetId || "Untitled song";
}

function statusLabel(status: ProfileRequest["status"]) {
  if (status === "approved") {
    return "Approved";
  }

  if (status === "rejected") {
    return "Denied";
  }

  return "Pending";
}

export default function UserRequestsScreen() {
  const { user } = useCurrentUser();
  const [requests, setRequests] = useState<ProfileRequest[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  async function loadRequests() {
    setLoading(true);
    try {
      setRequests(await getAdminProfileRequests());
    } catch (error) {
      console.log("LOAD USER REQUESTS ERROR:", error);
      Alert.alert("Error", "Could not carregar os pedidos dos users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const groupedRequests = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        data: requests.filter((request) => request.kind === section.kind),
      })),
    [requests],
  );

  async function handleApprove(request: ProfileRequest) {
    try {
      await approveProfileRequest(request, user?.displayName || user?.email || "Admin");
      await loadRequests();
      Alert.alert("Approved", "The request was completed.");
    } catch (error) {
      console.log("APPROVE USER REQUEST ERROR:", error);
      Alert.alert("Error", "Could not approve this request.");
    }
  }

  async function handleReject(request: ProfileRequest) {
    const reason = reasons[request.id]?.trim();

    if (!reason) {
      Alert.alert("Reason required", "Enter the rejection reason.");
      return;
    }

    try {
      await rejectProfileRequest(
        request.id,
        user?.displayName || user?.email || "Admin",
        reason,
      );
      await loadRequests();
      Alert.alert("Denied", "The user will see the reason in rejected requests.");
    } catch (error) {
      console.log("REJECT USER REQUEST ERROR:", error);
      Alert.alert("Error", "Could not deny this request.");
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Admin</Text>
        <Text style={styles.title}>Pedidos</Text>
        <Text style={styles.subtitle}>
          Pedidos dos users separados por tipo. A revisao de criacao de songs continua
          fora desta lista.
        </Text>

        <Pressable style={pressableFeedback(styles.refreshButton)} onPress={loadRequests}>
          <Ionicons name="refresh-outline" size={18} color="#fff" />
          <Text style={styles.refreshText}>{loading ? "Loading..." : "Refresh"}</Text>
        </Pressable>

        {groupedRequests.map((section) => (
          <View key={section.kind} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.data.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>{section.empty}</Text>
              </View>
            ) : (
              section.data.map((request) => {
                const isPending = request.status === "pending";

                return (
                  <View key={request.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{requestTitle(request)}</Text>
                      <Text
                        style={[
                          styles.statusPill,
                          request.status === "approved" && styles.statusApproved,
                          request.status === "rejected" && styles.statusRejected,
                        ]}
                      >
                        {statusLabel(request.status)}
                      </Text>
                    </View>
                    <Text style={styles.meta}>Utilizador: {request.userId}</Text>
                    <Text style={styles.meta}>Request: {request.title || section.title}</Text>
                    {request.adminName ? (
                      <Text style={styles.meta}>Admin: {request.adminName}</Text>
                    ) : null}
                    {request.rejectionReason ? (
                      <Text style={styles.reason}>Reason: {request.rejectionReason}</Text>
                    ) : null}

                    {isPending ? (
                      <>
                        <Pressable
                          style={pressableFeedback(styles.approveButton)}
                          onPress={() => handleApprove(request)}
                        >
                          <Ionicons name="checkmark-circle-outline" size={18} color="#000" />
                          <Text style={styles.approveText}>Approve</Text>
                        </Pressable>

                        <TextInput
                          value={reasons[request.id] ?? ""}
                          onChangeText={(value) =>
                            setReasons((current) => ({ ...current, [request.id]: value }))
                          }
                          placeholder="Rejection reason"
                          placeholderTextColor="#777"
                          style={styles.input}
                        />
                        <Pressable
                          style={pressableFeedback(styles.rejectButton)}
                          onPress={() => handleReject(request)}
                        >
                          <Text style={styles.rejectText}>Negar</Text>
                        </Pressable>
                      </>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        ))}
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
    paddingHorizontal: 22,
    paddingTop: 62,
    paddingBottom: 180,
  },
  eyebrow: {
    color: "#20e68a",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 6,
  },
  subtitle: {
    color: "#aaa",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    marginBottom: 18,
  },
  refreshButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 8,
    minHeight: 42,
    borderRadius: 16,
    paddingHorizontal: 14,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 20,
  },
  refreshText: {
    color: "#fff",
    fontWeight: "800",
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 12,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 14,
  },
  emptyCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: {
    color: "#fff",
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
  },
  statusPill: {
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: "#101010",
    backgroundColor: "#fff",
    fontSize: 11,
    fontWeight: "900",
  },
  statusApproved: {
    backgroundColor: "#20e68a",
    color: "#00180b",
  },
  statusRejected: {
    backgroundColor: "#ff8a8a",
    color: "#200",
  },
  meta: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 5,
  },
  reason: {
    color: "#ffb7b7",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  input: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginTop: 10,
    marginBottom: 10,
  },
  approveButton: {
    minHeight: 46,
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    marginTop: 14,
  },
  approveText: {
    color: "#000",
    fontWeight: "900",
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
    color: "#ff9c9c",
    fontWeight: "900",
  },
  emptyText: {
    color: "#999",
    fontSize: 14,
  },
});
