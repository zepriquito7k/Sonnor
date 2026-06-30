import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { pressableFeedback } from "../../components/pressFeedback";
import { listAdminReleases } from "../../firebase/adminClient";

export default function ManageReleasesScreen() {
  const [releases, setReleases] = useState<string[]>(["Loading releases..."]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      setReleases(await listAdminReleases());
    } catch (error) {
      console.log("LOAD ADMIN RELEASES ERROR:", error);
      Alert.alert("Error", "Could not load the albums.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Albums</Text>
        <Text style={styles.subtitle}>Albums e songs publicados na app.</Text>

        <Pressable style={pressableFeedback(styles.refreshButton)} onPress={loadData}>
          <Ionicons name="refresh-outline" size={18} color="#fff" />
          <Text style={styles.refreshText}>{loading ? "Loading..." : "Refresh"}</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Releases</Text>
        {releases.map((release) => (
          <View key={release} style={styles.card}>
            <Text style={styles.cardTitle}>{release}</Text>
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
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
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
    marginBottom: 18,
  },
  refreshText: {
    color: "#fff",
    fontWeight: "700",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 10,
    marginBottom: 12,
  },
  card: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 14,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  meta: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 3,
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
