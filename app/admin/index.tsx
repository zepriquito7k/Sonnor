import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { pressableFeedback } from "../../components/pressFeedback";
import {
  listAdminPosts,
  listAdminReleases,
  listAdminReports,
  listAdminUserProfiles,
  listAdminVerificationRequests,
} from "../../firebase/adminClient";
import { listPendingEventRequests } from "../../firebase/eventClient";
import { getPendingMusicSubmissions } from "../../firebase/musicReviewClient";
import { getAdminProfileRequests } from "../../firebase/profileRequests";
import { getAdminOverview } from "../../firebase/socialClient";

type AdminRoute = {
  title: string;
  description: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  count: number;
  countLabel: string;
  priority?: boolean;
};

type AdminOverviewState = {
  usersCount: number;
  postsCount: number;
  tracksCount: number;
  albumsCount: number;
  reportsCount: number;
  verificationRequestsCount: number;
};

const emptyOverview: AdminOverviewState = {
  usersCount: 0,
  postsCount: 0,
  tracksCount: 0,
  albumsCount: 0,
  reportsCount: 0,
  verificationRequestsCount: 0,
};

function countUsefulRows(rows: string[]) {
  return rows.filter((item) => {
    const value = item.toLowerCase();
    return !value.includes("sem ") && !value.includes("no ");
  }).length;
}

export default function AdminIndexScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AdminOverviewState>(emptyOverview);
  const [musicReviewCount, setMusicReviewCount] = useState(0);
  const [profileRequestCount, setProfileRequestCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [releaseCount, setReleaseCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [verificationCount, setVerificationCount] = useState(0);
  const [eventRequestCount, setEventRequestCount] = useState(0);

  async function loadAdminPanel() {
    setLoading(true);

    try {
      const [
        nextOverview,
        musicReviews,
        profileRequests,
        reports,
        users,
        releases,
        posts,
        verifications,
        eventRequests,
      ] = await Promise.all([
        getAdminOverview(),
        getPendingMusicSubmissions(),
        getAdminProfileRequests(),
        listAdminReports(),
        listAdminUserProfiles(),
        listAdminReleases(),
        listAdminPosts(),
        listAdminVerificationRequests(),
        listPendingEventRequests(),
      ]);

      setOverview(nextOverview);
      setMusicReviewCount(musicReviews.length);
      setProfileRequestCount(
        profileRequests.filter((request) => request.status === "pending").length,
      );
      setReportsCount(Math.max(nextOverview.reportsCount, countUsefulRows(reports)));
      setUserCount(users.length || nextOverview.usersCount);
      setReleaseCount(countUsefulRows(releases) || nextOverview.albumsCount);
      setPostCount(countUsefulRows(posts) || nextOverview.postsCount);
      setVerificationCount(
        countUsefulRows(verifications) || nextOverview.verificationRequestsCount,
      );
      setEventRequestCount(eventRequests.length);
    } catch (error) {
      console.log("LOAD ADMIN PANEL ERROR:", error);
      setOverview(emptyOverview);
      setMusicReviewCount(0);
      setProfileRequestCount(0);
      setReportsCount(0);
      setUserCount(0);
      setReleaseCount(0);
      setPostCount(0);
      setVerificationCount(0);
      setEventRequestCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminPanel();
  }, []);

  const routes = useMemo<AdminRoute[]>(
    () => [
      {
        title: "Revisao de songs",
        description: "Approve, reject, listen to files, and request contact by email.",
        route: "/admin/music-reviews",
        icon: "musical-notes-outline",
        accent: "#f5d47a",
        count: musicReviewCount,
        countLabel: "por rever",
        priority: musicReviewCount > 0,
      },
      {
        title: "Reports",
        description: "Review reports for users, songs, albums, posts, and other cases.",
        route: "/admin/manage-reports",
        icon: "flag-outline",
        accent: "#ff9b9b",
        count: reportsCount,
        countLabel: "reports",
        priority: reportsCount > 0,
      },
      {
        title: "Pedidos de profile",
        description: "Approve names and requests to delete songs or folders.",
        route: "/admin/user-requests",
        icon: "file-tray-full-outline",
        accent: "#a8c7ff",
        count: profileRequestCount,
        countLabel: "pendentes",
        priority: profileRequestCount > 0,
      },
      {
        title: "Utilizadores",
        description: "Search accounts, verify artists, and request account removal.",
        route: "/admin/manage-users",
        icon: "people-outline",
        accent: "#b7f7cf",
        count: userCount,
        countLabel: "users",
      },
      {
        title: "Albums",
        description: "Review albums, EPs, singles, and published content.",
        route: "/admin/manage-releases",
        icon: "albums-outline",
        accent: "#d9c4ff",
        count: releaseCount,
        countLabel: "folders",
      },
      {
        title: "Posts",
        description: "Ver posts publicados e material sinalizado para revisao.",
        route: "/admin/manage-posts",
        icon: "images-outline",
        accent: "#b9ecff",
        count: postCount,
        countLabel: "posts",
      },
      {
        title: "Events and banners",
        description: "Approve event and partnership banners for 1 week.",
        route: "/admin/event-banners",
        icon: "calendar-outline",
        accent: "#c7f0ff",
        count: eventRequestCount,
        countLabel: "pedidos",
        priority: eventRequestCount > 0,
      },
      {
        title: "Verificacoes",
        description: "Consultar pedidos de badge e provas enviadas.",
        route: "/admin/verification-requests",
        icon: "shield-checkmark-outline",
        accent: "#e7e7e7",
        count: verificationCount,
        countLabel: "pedidos",
      },
    ],
    [
      eventRequestCount,
      musicReviewCount,
      postCount,
      profileRequestCount,
      releaseCount,
      reportsCount,
      userCount,
      verificationCount,
    ],
  );

  const priorityRoutes = routes.filter((route) => route.priority);
  const calmText = loading
    ? "A sincronizar painel..."
    : priorityRoutes.length > 0
      ? `${priorityRoutes.length} area${priorityRoutes.length > 1 ? "s" : ""} precisa${priorityRoutes.length > 1 ? "m" : ""} de atencao`
      : "Tudo limpo right now";

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable style={pressableFeedback(styles.backButton)} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <Pressable style={pressableFeedback(styles.refreshButton)} onPress={loadAdminPanel}>
            <Ionicons name="refresh-outline" size={20} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTopLine}>
            <Text style={styles.eyebrow}>Sonnor Admin</Text>
            <View style={styles.statusPill}>
              <View style={[styles.statusDot, loading ? styles.statusDotLoading : null]} />
              <Text style={styles.statusText}>{calmText}</Text>
            </View>
          </View>
          <Text style={styles.title}>Centro de controlo</Text>
          <Text style={styles.subtitle}>
            Moderacao, seguranca e publicacao num painel limpo, com apenas ferramentas reais.
          </Text>

          <View style={styles.metricGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{overview.usersCount}</Text>
              <Text style={styles.metricLabel}>Users</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{overview.tracksCount}</Text>
              <Text style={styles.metricLabel}>Music</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{overview.albumsCount}</Text>
              <Text style={styles.metricLabel}>Folders</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{overview.postsCount}</Text>
              <Text style={styles.metricLabel}>Posts</Text>
            </View>
          </View>
        </View>

        {priorityRoutes.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prioridade right now</Text>
            {priorityRoutes.map((item) => (
              <Pressable
                key={item.route}
                style={pressableFeedback(styles.priorityCard)}
                onPress={() => router.push(item.route as never)}
              >
                <View style={[styles.priorityIcon, { backgroundColor: item.accent }]}>
                  <Ionicons name={item.icon} size={21} color="#000" />
                </View>
                <View style={styles.cardTextBlock}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDescription}>{item.description}</Text>
                </View>
                <View style={styles.countBubble}>
                  <Text style={styles.countValue}>{item.count}</Text>
                  <Text style={styles.countLabel}>{item.countLabel}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ferramentas admin</Text>
          <View style={styles.toolGrid}>
            {routes.map((item) => (
              <Pressable
                key={item.route}
                style={pressableFeedback(styles.toolCard)}
                onPress={() => router.push(item.route as never)}
              >
                <View style={[styles.toolIcon, { backgroundColor: item.accent }]}>
                  <Ionicons name={item.icon} size={20} color="#000" />
                </View>
                <Text style={styles.toolTitle}>{item.title}</Text>
                <Text style={styles.toolDescription}>{item.description}</Text>
                <View style={styles.toolFooter}>
                  <Text style={styles.toolCount}>
                    {item.count} {item.countLabel}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#777" />
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operacao segura</Text>
          <View style={styles.operationCard}>
            <View style={styles.operationRow}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#b7f7cf" />
              <Text style={styles.operationText}>
                Botoes do hub levam apenas para modulos existentes e funcionais.
              </Text>
            </View>
            <View style={styles.operationRow}>
              <Ionicons name="lock-closed-outline" size={20} color="#a8c7ff" />
              <Text style={styles.operationText}>
                Acoes sensiveis continuam dentro das telas proprias, com confirmacao.
              </Text>
            </View>
            <View style={styles.operationRow}>
              <Ionicons name="eye-outline" size={20} color="#f5d47a" />
              <Text style={styles.operationText}>
                Revisoes importantes aparecem destacadas no topo quando existem pendencias.
              </Text>
            </View>
          </View>
        </View>
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
    paddingBottom: 180,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
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
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  heroCard: {
    borderRadius: 30,
    padding: 20,
    backgroundColor: "#0b0b0b",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 24,
  },
  heroTopLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  eyebrow: {
    color: "#EDEDED",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statusPill: {
    flexShrink: 1,
    minHeight: 30,
    borderRadius: 15,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#b7f7cf",
  },
  statusDotLoading: {
    backgroundColor: "#f5d47a",
  },
  statusText: {
    color: "#d8d8d8",
    fontSize: 11,
    fontWeight: "800",
  },
  title: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  subtitle: {
    color: "#a9a9a9",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    marginBottom: 18,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    flexGrow: 1,
    minWidth: "46%",
    borderRadius: 20,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  metricValue: {
    color: "#fff",
    fontSize: 25,
    fontWeight: "900",
  },
  metricLabel: {
    color: "#8d8d8d",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
    textTransform: "uppercase",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  priorityCard: {
    minHeight: 92,
    borderRadius: 24,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.075)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 10,
  },
  priorityIcon: {
    width: 46,
    height: 46,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTextBlock: {
    flex: 1,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  cardDescription: {
    color: "#a8a8a8",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  countBubble: {
    minWidth: 68,
    minHeight: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  countValue: {
    color: "#000",
    fontSize: 18,
    fontWeight: "900",
  },
  countLabel: {
    color: "#444",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  toolGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  toolCard: {
    width: "48%",
    minHeight: 178,
    borderRadius: 24,
    padding: 14,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  toolIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  toolTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  toolDescription: {
    flex: 1,
    color: "#9a9a9a",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 7,
  },
  toolFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toolCount: {
    color: "#dedede",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  operationCard: {
    borderRadius: 24,
    padding: 16,
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  operationRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  operationText: {
    flex: 1,
    color: "#cfcfcf",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
});
