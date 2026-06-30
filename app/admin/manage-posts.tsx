import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
  listAdminPosts,
  type AdminPostListItem,
} from "../../firebase/adminClient";

function readDateMillis(value: AdminPostListItem["createdAt"]) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object" && "seconds" in value && typeof value.seconds === "number") {
    return value.seconds * 1000;
  }
  return 0;
}

function formatPostDate(value: AdminPostListItem["createdAt"]) {
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

function matchesPost(item: AdminPostListItem, query: string) {
  const text = query.trim().toLowerCase();

  if (!text) {
    return true;
  }

  return [
    item.id,
    item.userId,
    item.userDisplayName,
    item.username,
    item.userEmail,
    item.caption,
    item.mediaType,
    item.status,
    item.linkedTrackId,
    item.linkedAlbumId,
  ].some((value) => value.toLowerCase().includes(text));
}

export default function ManagePostsScreen() {
  const [posts, setPosts] = useState<AdminPostListItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadPosts() {
    setLoading(true);

    try {
      setPosts(await listAdminPosts());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  const filteredPosts = useMemo(
    () => posts.filter((item) => matchesPost(item, query)),
    [posts, query],
  );

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Sonnor Admin</Text>
            <Text style={styles.title}>Posts</Text>
            <Text style={styles.subtitle}>
              Review published posts, owners, linked music, reports, and media.
            </Text>
          </View>
          <Pressable style={pressableFeedback(styles.refreshButton)} onPress={loadPosts}>
            <Ionicons name="refresh-outline" size={19} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={19} color="#777" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search post, user, username, email, status, or linked music"
            placeholderTextColor="#777"
            style={styles.searchInput}
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.countText}>
          {loading ? "Loading posts..." : `${filteredPosts.length} posts`}
        </Text>

        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 30 }} />
        ) : null}

        {!loading && filteredPosts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No posts found.</Text>
          </View>
        ) : null}

        {filteredPosts.map((item) => (
          <View key={item.id} style={styles.postCard}>
            <View style={styles.ownerRow}>
              {item.userAvatarUrl ? (
                <Image source={{ uri: item.userAvatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Ionicons name="person-outline" size={20} color="#fff" />
                </View>
              )}
              <View style={styles.ownerInfo}>
                <Text style={styles.ownerName} numberOfLines={1}>
                  {item.userDisplayName}
                </Text>
                <Text style={styles.ownerMeta} numberOfLines={1}>
                  {item.username ? `@${item.username}` : item.userEmail || item.userId}
                </Text>
                <Text style={styles.ownerMeta} numberOfLines={1}>
                  User ID {item.userId || "missing"}
                </Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>

            {item.thumbnailUrl || item.mediaUrl ? (
              <Pressable
                style={pressableFeedback(styles.mediaPreview)}
                onPress={() => Linking.openURL(item.mediaUrl || item.thumbnailUrl).catch(() => null)}
              >
                <Image source={{ uri: item.thumbnailUrl || item.mediaUrl }} style={styles.mediaImage} />
                <View style={styles.mediaTypePill}>
                  <Ionicons
                    name={item.mediaType === "video" ? "videocam-outline" : "image-outline"}
                    size={14}
                    color="#fff"
                  />
                  <Text style={styles.mediaTypeText}>{item.mediaType}</Text>
                </View>
              </Pressable>
            ) : null}

            <Text style={styles.caption}>
              {item.caption || "This post has no caption."}
            </Text>

            <View style={styles.metaGrid}>
              <View style={styles.metaCard}>
                <Text style={styles.metaValue}>{item.likesCount}</Text>
                <Text style={styles.metaLabel}>Likes</Text>
              </View>
              <View style={styles.metaCard}>
                <Text style={styles.metaValue}>{item.commentsCount}</Text>
                <Text style={styles.metaLabel}>Comments</Text>
              </View>
              <View style={styles.metaCard}>
                <Text style={styles.metaValue}>{item.reportsCount}</Text>
                <Text style={styles.metaLabel}>Reports</Text>
              </View>
            </View>

            <View style={styles.detailBlock}>
              <Text style={styles.detailText}>Post ID {item.id}</Text>
              <Text style={styles.detailText}>Created {formatPostDate(item.createdAt)}</Text>
              {item.linkedTrackId ? (
                <Text style={styles.detailText}>Linked track {item.linkedTrackId}</Text>
              ) : null}
              {item.linkedAlbumId ? (
                <Text style={styles.detailText}>Linked album {item.linkedAlbumId}</Text>
              ) : null}
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
    maxWidth: 290,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
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
  postCard: {
    borderRadius: 24,
    padding: 14,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#111",
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  ownerMeta: {
    color: "#888",
    fontSize: 12,
    marginTop: 3,
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
  mediaPreview: {
    height: 220,
    borderRadius: 22,
    overflow: "hidden",
    marginTop: 14,
    backgroundColor: "#111",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  mediaTypePill: {
    position: "absolute",
    right: 12,
    top: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  mediaTypeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  caption: {
    color: "#f2f2f2",
    fontSize: 15,
    lineHeight: 21,
    marginTop: 14,
  },
  metaGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  metaCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  metaValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  metaLabel: {
    color: "#888",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  detailBlock: {
    gap: 5,
    marginTop: 14,
  },
  detailText: {
    color: "#777",
    fontSize: 12,
    fontWeight: "700",
  },
});
