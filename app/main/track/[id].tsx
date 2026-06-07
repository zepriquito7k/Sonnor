import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { db } from "../../../firebase/dataClient";
import { firestoreCollections } from "../../../firebase/paths";

export default function TrackDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [message, setMessage] = useState("A abrir lançamento...");

  useEffect(() => {
    let active = true;

    async function openRelease() {
      if (!id) {
        router.back();
        return;
      }

      const snapshot = await getDoc(doc(db, firestoreCollections.tracks, id)).catch(() => null);
      const albumId = snapshot?.exists() ? snapshot.data().albumId : "";

      if (typeof albumId === "string" && albumId) {
        router.replace({
          pathname: "/main/release/[slug]",
          params: { slug: albumId, albumId },
        });
        return;
      }

      if (active) {
        setMessage("Este lançamento ainda não tem uma pasta disponível.");
      }
    }

    void openRelease();
    return () => {
      active = false;
    };
  }, [id, router]);

  return (
    <View style={styles.container}>
      <Ionicons name="disc-outline" size={38} color="#fff" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#000",
    flex: 1,
    gap: 14,
    justifyContent: "center",
    padding: 24,
  },
  message: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
});
