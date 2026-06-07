import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  adminDeleteUser,
  listAdminUserProfiles,
  setUserVerificationOverride,
  type AdminUserListItem,
} from "../../firebase/adminClient";
import { useCurrentUser } from "../../hooks/useCurrentUser";

export default function ManageUsersScreen() {
  const { user } = useCurrentUser();
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [verifyingId, setVerifyingId] = useState("");

  async function loadUsers() {
    setLoading(true);

    try {
      setUsers(await listAdminUserProfiles());
    } catch (error) {
      console.log("LOAD ADMIN USERS ERROR:", error);
      Alert.alert("Erro", "Nao foi possivel carregar utilizadores.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const text = query.trim().toLowerCase();

    if (!text) {
      return users;
    }

    return users.filter((item) =>
      [item.displayName, item.username, item.email, item.id]
        .filter((value): value is string => typeof value === "string" && value.length > 0)
        .some((value) => value.toLowerCase().includes(text)),
    );
  }, [query, users]);

  function confirmDelete(target: AdminUserListItem) {
    if (target.id === user?.uid) {
      Alert.alert("Bloqueado", "Nao podes apagar a tua propria conta por aqui.");
      return;
    }

    Alert.alert(
      "Apagar utilizador",
      `Apagar ${target.displayName}? Isto remove conta, musicas, posts, albuns, reports, requests, mensagens e ficheiros.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar",
          style: "destructive",
          onPress: () => handleDelete(target.id),
        },
      ],
    );
  }

  async function handleDelete(uid: string) {
    try {
      setDeletingId(uid);
      await adminDeleteUser(uid);
      setUsers((current) => current.filter((item) => item.id !== uid));
      Alert.alert("Apagado", "O utilizador e os dados ligados foram removidos.");
    } catch (error) {
      console.log("ADMIN DELETE USER ERROR:", error);
      const code = (error as { code?: string })?.code;
      const message = (error as { message?: string })?.message;

      if (code === "functions/permission-denied" || code === "permission-denied") {
        Alert.alert("Sem permissao", "A tua conta precisa de permissao admin no servidor.");
        return;
      }

      if (code === "functions/not-found") {
        Alert.alert("Funcao em falta", "A funcao adminDeleteUserAccount ainda nao esta publicada no Firebase.");
        return;
      }

      Alert.alert("Erro", message || "Nao foi possivel apagar este utilizador.");
    } finally {
      setDeletingId("");
    }
  }

  async function handleToggleVerified(target: AdminUserListItem) {
    try {
      setVerifyingId(target.id);
      const nextVerified = !target.verificationOverride;

      await setUserVerificationOverride(target.id, nextVerified);
      setUsers((current) =>
        current.map((item) =>
          item.id === target.id
            ? {
                ...item,
                verified: nextVerified,
                verificationOverride: nextVerified,
                verifiedBy: nextVerified ? "admin" : "",
              }
            : item,
        ),
      );
    } catch (error) {
      console.log("ADMIN VERIFY USER ERROR:", error);
      const code = (error as { code?: string })?.code;

      if (code === "functions/permission-denied" || code === "permission-denied") {
        Alert.alert("Sem permissao", "A tua conta precisa de permissao admin no servidor.");
        return;
      }

      Alert.alert("Erro", "Nao foi possivel alterar o verificado.");
    } finally {
      setVerifyingId("");
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Admin</Text>
            <Text style={styles.title}>Utilizadores</Text>
          </View>
          <Pressable style={styles.refreshButton} onPress={loadUsers}>
            <Ionicons name="refresh-outline" size={19} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={19} color="#777" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Pesquisar nome, email ou uid"
            placeholderTextColor="#777"
            style={styles.searchInput}
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.countText}>
          {loading ? "A carregar..." : `${filteredUsers.length} utilizadores`}
        </Text>

        {filteredUsers.map((item) => (
          <View key={item.id} style={styles.userCard}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person-outline" size={22} color="#fff" />
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>{item.displayName}</Text>
              {item.verified ? (
                <View style={styles.verifiedLine}>
                  <View style={styles.verifyBadge}>
                    <Ionicons name="checkmark" size={9} color="#fff" />
                  </View>
                  <Text style={styles.verifiedText}>
                    {item.verifiedBy === "admin" ? "Verificado Sonnor" : "Verificado automatico"}
                  </Text>
                </View>
              ) : null}
              <Text style={styles.userMeta} numberOfLines={1}>
                {item.username ? `@${item.username}` : item.email || item.id}
              </Text>
              <Text style={styles.userStats}>
                {item.followersCount} seguidores · {item.tracksCount} musicas
              </Text>
            </View>
            <View style={styles.actionStack}>
              <Pressable
                style={[styles.verifyButton, item.verificationOverride ? styles.verifyButtonActive : null]}
                onPress={() => handleToggleVerified(item)}
                disabled={verifyingId === item.id}
              >
                <Ionicons
                  name={item.verificationOverride ? "shield-checkmark" : "shield-checkmark-outline"}
                  size={18}
                  color="#fff"
                />
                <Text style={styles.verifyText}>
                  {verifyingId === item.id
                    ? "..."
                    : item.verificationOverride
                      ? "Remover"
                      : "Verificar"}
                </Text>
              </Pressable>
              <Pressable
                style={styles.deleteButton}
                onPress={() => confirmDelete(item)}
                disabled={deletingId === item.id}
              >
                <Ionicons name="trash-outline" size={19} color="#ff8a8a" />
                <Text style={styles.deleteText}>
                  {deletingId === item.id ? "..." : "Apagar"}
                </Text>
              </Pressable>
            </View>
          </View>
        ))}

        {!loading && filteredUsers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhum utilizador encontrado.</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  content: { paddingHorizontal: 20, paddingTop: 62, paddingBottom: 180 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
  eyebrow: { color: "#6F8FAF", fontSize: 12, fontWeight: "900", textTransform: "uppercase", marginBottom: 5 },
  title: { color: "#fff", fontSize: 32, fontWeight: "900" },
  refreshButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" },
  searchBox: { minHeight: 52, borderRadius: 18, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#111", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  searchInput: { flex: 1, color: "#fff", fontSize: 15 },
  countText: { color: "#888", fontSize: 13, fontWeight: "700", marginTop: 14, marginBottom: 12 },
  userCard: { minHeight: 86, borderRadius: 20, padding: 12, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.055)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginBottom: 10 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#111" },
  avatarFallback: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" },
  userInfo: { flex: 1 },
  userName: { color: "#fff", fontSize: 16, fontWeight: "900" },
  verifiedLine: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  verifyBadge: { width: 15, height: 15, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#2d7dff" },
  verifiedText: { color: "#888", fontSize: 11, fontWeight: "900" },
  userMeta: { color: "#aaa", fontSize: 12, marginTop: 3 },
  userStats: { color: "#777", fontSize: 12, marginTop: 5 },
  actionStack: { gap: 8 },
  verifyButton: { minHeight: 40, borderRadius: 14, paddingHorizontal: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(45,125,255,0.14)", borderWidth: 1, borderColor: "rgba(45,125,255,0.34)" },
  verifyButtonActive: { backgroundColor: "#2d7dff", borderColor: "#2d7dff" },
  verifyText: { color: "#fff", fontSize: 11, fontWeight: "900", marginTop: 2 },
  deleteButton: { minHeight: 42, borderRadius: 14, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(218,52,52,0.14)", borderWidth: 1, borderColor: "rgba(255,90,90,0.28)" },
  deleteText: { color: "#ff8a8a", fontSize: 12, fontWeight: "900", marginTop: 2 },
  emptyCard: { borderRadius: 18, padding: 16, backgroundColor: "rgba(255,255,255,0.055)" },
  emptyText: { color: "#999", fontSize: 14 },
});
