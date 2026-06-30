import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { pressableFeedback } from "../../components/pressFeedback";
import {
  listAdminReports,
  type AdminReportListItem,
} from "../../firebase/adminClient";

function readDateMillis(value: AdminReportListItem["createdAt"]) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object" && "seconds" in value && typeof value.seconds === "number") {
    return value.seconds * 1000;
  }
  return 0;
}

function formatDate(value: AdminReportListItem["createdAt"]) {
  const millis = readDateMillis(value);

  if (!millis) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(millis));
}

function matchesReport(item: AdminReportListItem, query: string) {
  const text = query.trim().toLowerCase();

  if (!text) {
    return true;
  }

  return [
    item.id,
    item.reporterId,
    item.reporterDisplayName,
    item.reporterUsername,
    item.reporterEmail,
    item.targetType,
    item.targetId,
    item.targetTitle,
    item.targetOwnerId,
    item.targetOwnerDisplayName,
    item.reason,
    item.details,
    item.status,
  ].some((value) => value.toLowerCase().includes(text));
}

export default function ManageReportsScreen() {
  const [reports, setReports] = useState<AdminReportListItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadReports() {
    setLoading(true);

    try {
      setReports(await listAdminReports());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  const filteredReports = useMemo(
    () => reports.filter((item) => matchesReport(item, query)),
    [reports, query],
  );
  const openCount = reports.filter((item) => item.status === "open").length;

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Sonnor Admin</Text>
            <Text style={styles.title}>Reports</Text>
            <Text style={styles.subtitle}>
              Review who reported content, what was reported, and the message behind each report.
            </Text>
          </View>
          <Pressable style={pressableFeedback(styles.refreshButton)} onPress={loadReports}>
            <Ionicons name="refresh-outline" size={19} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{reports.length}</Text>
            <Text style={styles.summaryLabel}>Total reports</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{openCount}</Text>
            <Text style={styles.summaryLabel}>Open reports</Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={19} color="#777" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search reporter, owner, content, reason, message, status, or ID"
            placeholderTextColor="#777"
            style={styles.searchInput}
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.countText}>
          {loading ? "Loading reports..." : `${filteredReports.length} reports`}
        </Text>

        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 30 }} />
        ) : null}

        {!loading && filteredReports.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No reports found.</Text>
          </View>
        ) : null}

        {filteredReports.map((item) => (
          <View key={item.id} style={styles.reportCard}>
            <View style={styles.cardTop}>
              <View style={styles.typeIcon}>
                <Ionicons name="flag-outline" size={18} color="#000" />
              </View>
              <View style={styles.cardTitleBlock}>
                <Text style={styles.reportTitle} numberOfLines={2}>
                  {item.targetTitle}
                </Text>
                <Text style={styles.reportMeta}>
                  {item.targetType.toUpperCase()} · {formatDate(item.createdAt)}
                </Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Report reason</Text>
              <Text style={styles.infoText}>{item.reason}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Message from reporter</Text>
              <Text style={styles.infoText}>
                {item.details || "No extra message was provided."}
              </Text>
            </View>

            <View style={styles.peopleGrid}>
              <View style={styles.peopleCard}>
                <Text style={styles.peopleLabel}>Reporter</Text>
                <Text style={styles.peopleName} numberOfLines={1}>
                  {item.reporterDisplayName}
                </Text>
                <Text style={styles.peopleMeta} numberOfLines={1}>
                  {item.reporterUsername ? `@${item.reporterUsername}` : item.reporterEmail || item.reporterId}
                </Text>
              </View>
              <View style={styles.peopleCard}>
                <Text style={styles.peopleLabel}>Content owner</Text>
                <Text style={styles.peopleName} numberOfLines={1}>
                  {item.targetOwnerDisplayName}
                </Text>
                <Text style={styles.peopleMeta} numberOfLines={1}>
                  {item.targetOwnerId || "Owner not found"}
                </Text>
              </View>
            </View>

            {item.adminResponse ? (
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Admin response</Text>
                <Text style={styles.infoText}>{item.adminResponse}</Text>
              </View>
            ) : null}

            <View style={styles.idBlock}>
              <Text style={styles.idText}>Report ID {item.id}</Text>
              <Text style={styles.idText}>Target ID {item.targetId || "missing"}</Text>
              <Text style={styles.idText}>Reporter ID {item.reporterId || "missing"}</Text>
            </View>
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
    paddingHorizontal: 20,
    paddingTop: 62,
    paddingBottom: 180,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 22,
  },
  eyebrow: {
    color: "#E6E6E6",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 5,
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
  },
  subtitle: {
    color: "#8f8f8f",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 295,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  summaryValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
  },
  summaryLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  searchBox: {
    minHeight: 52,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
  },
  countText: {
    color: "#888",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 12,
  },
  emptyCard: {
    borderRadius: 20,
    padding: 22,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  emptyText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "800",
  },
  reportCard: {
    borderRadius: 24,
    padding: 14,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  typeIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ff9b9b",
  },
  cardTitleBlock: {
    flex: 1,
  },
  reportTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  reportMeta: {
    color: "#888",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  statusText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  infoBlock: {
    borderRadius: 18,
    padding: 12,
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.055)",
  },
  infoLabel: {
    color: "#888",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 5,
  },
  infoText: {
    color: "#f2f2f2",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  peopleGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  peopleCard: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  peopleLabel: {
    color: "#777",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  peopleName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  peopleMeta: {
    color: "#888",
    fontSize: 12,
    marginTop: 4,
  },
  idBlock: {
    gap: 5,
    marginTop: 12,
  },
  idText: {
    color: "#777",
    fontSize: 12,
    fontWeight: "700",
  },
});
