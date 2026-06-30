import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { usePlayer, type Track } from "../../context/PlayerContext";
import { getAlbumContent, getLibraryContent } from "../../firebase/contentClient";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useCurrentUser } from "../../hooks/useCurrentUser";

type LibraryFilter = "liked" | "saved" | null;

export default function LibraryScreen() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { playQueue } = usePlayer();
  const [activeFilter, setActiveFilter] = useState<LibraryFilter>(null);
  const loadLibrary = useCallback(() => getLibraryContent(user?.uid), [user?.uid]);
  const { data } = useAsyncData(loadLibrary, {
    sections: [],
    tracks: [],
    albums: [],
    posts: [],
    recentPlays: [],
    playlists: [],
  });
  const showSaved = activeFilter !== "liked";
  const showLiked = activeFilter !== "saved";
  const libraryTracks = useMemo<Track[]>(
    () =>
      data.tracks.map((track) => ({
        albumId: track.albumId,
        artist: track.featNames?.[0] || "Sonnor",
        cover: track.coverUrl,
        folderTitle: "Liked",
        genre: track.genre,
        id: track.id,
        lyrics: track.lyrics,
        shortVideo: track.shortVideoUrl,
        source: "library",
        title: track.title,
        uri: track.audioUrl,
      })),
    [data.tracks],
  );

  function openAlbum(album: (typeof data.albums)[number]) {
    router.push({
      pathname: "/main/release/[slug]",
      params: {
        albumId: album.id,
        cover: album.coverUrl ?? "",
        slug: album.id,
        title: album.title,
      },
    });
  }

  async function playAlbum(albumId: string) {
    const content = await getAlbumContent(albumId);
    if (!content) return;

    const artist = content.user?.displayName || content.user?.username || "Sonnor";
    const queue: Track[] = content.tracks.map((track) => ({
      albumId,
      artist,
      cover: track.coverUrl || content.album.coverUrl,
      folderTitle: content.album.title,
      genre: track.genre,
      id: track.id,
      lyrics: track.lyrics,
      shortVideo: track.shortVideoUrl,
      source: "library",
      title: track.title,
      uri: track.audioUrl,
    }));

    await playQueue(queue, 0, { autoRecommendations: true });
  }

  function openLikedFolder() {
    router.push({
      pathname: "/main/release/[slug]",
      params: {
        liked: "1",
        slug: "liked-tracks",
        title: "Liked",
      },
    });
  }

  function toggleFilter(filter: Exclude<LibraryFilter, null>) {
    setActiveFilter((current) => (current === filter ? null : filter));
  }

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={23} color="#f5f5f5" />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>A TUA COLECAO</Text>
            <Text style={styles.title}>Biblioteca</Text>
          </View>
        </View>

        <View style={styles.featureGrid}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.featureCard,
              activeFilter === "liked" ? styles.featureCardActive : null,
              pressed ? styles.pressed : null,
            ]}
            onPress={() => toggleFilter("liked")}
          >
            <Ionicons
              name={activeFilter === "liked" ? "heart" : "heart-outline"}
              size={36}
              color={activeFilter === "liked" ? "#ff315d" : "#f5f5f5"}
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.featureCard,
              activeFilter === "saved" ? styles.featureCardActive : null,
              pressed ? styles.pressed : null,
            ]}
            onPress={() => toggleFilter("saved")}
          >
            <Ionicons
              name={activeFilter === "saved" ? "bookmark" : "bookmark-outline"}
              size={35}
              color={activeFilter === "saved" ? "#7ff0d1" : "#f5f5f5"}
            />
          </Pressable>
        </View>

        {showSaved ? (
          <>
            {showLiked ? (
              <>
                <Text style={styles.sectionTitle}>Liked</Text>
                {data.tracks.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="heart-outline" size={26} color="#9ba4a0" />
                    <Text style={styles.emptyTitle}>Nenhuma track curtida</Text>
                  </View>
                ) : (
                  <View style={styles.albumList}>
                    <Pressable
                      style={({ pressed }) => [styles.albumRow, pressed ? styles.albumRowPressed : null]}
                      onPress={openLikedFolder}
                    >
                      <View style={styles.albumCoverWrap}>
                        <View style={[styles.albumCover, styles.likedFolderCover]}>
                          <Ionicons name="heart" size={27} color="#fff" />
                        </View>
                      </View>
                      <View style={styles.albumText}>
                        <Text numberOfLines={1} style={styles.albumTitle}>Liked</Text>
                        <Text style={styles.albumMeta}>{data.tracks.length} tracks likes</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#69736f" />
                    </Pressable>
                  </View>
                )}
              </>
            ) : null}

            <Text style={styles.sectionTitle}>Albums</Text>
            {data.albums.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="bookmark-outline" size={26} color="#9ba4a0" />
                <Text style={styles.emptyTitle}>No saved albums</Text>
              </View>
            ) : (
              <View style={styles.albumList}>
                {data.albums.map((album) => (
                  <Pressable
                    key={album.id}
                    style={({ pressed }) => [styles.albumRow, pressed ? styles.albumRowPressed : null]}
                    onPress={() => openAlbum(album)}
                  >
                    <View style={styles.albumCoverWrap}>
                      {album.coverUrl ? (
                        <Image source={{ uri: album.coverUrl }} style={styles.albumCover} />
                      ) : (
                        <View style={styles.albumCover} />
                      )}
                      <Pressable
                        style={({ pressed }) => [
                          styles.albumPlay,
                          pressed ? styles.playButtonPressed : null,
                        ]}
                        onPress={(event) => {
                          event.stopPropagation();
                          void playAlbum(album.id);
                        }}
                      >
                        <Ionicons name="play" size={16} color="#07110e" />
                      </Pressable>
                    </View>
                    <View style={styles.albumText}>
                      <Text numberOfLines={1} style={styles.albumTitle}>{album.title}</Text>
                      <Text style={styles.albumMeta}>
                        {album.type || "Album"} · {(album.trackIds ?? []).length} tracks
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#69736f" />
                  </Pressable>
                ))}
              </View>
            )}
          </>
        ) : null}

        {!showSaved && showLiked ? (
          <>
            <Text style={styles.sectionTitle}>Liked</Text>
            {data.tracks.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="heart-outline" size={26} color="#9ba4a0" />
                <Text style={styles.emptyTitle}>Nenhuma track curtida</Text>
              </View>
            ) : (
              <View style={styles.albumList}>
                <Pressable
                  style={({ pressed }) => [styles.albumRow, pressed ? styles.albumRowPressed : null]}
                  onPress={openLikedFolder}
                >
                  <View style={styles.albumCoverWrap}>
                    <View style={[styles.albumCover, styles.likedFolderCover]}>
                      <Ionicons name="heart" size={27} color="#fff" />
                    </View>
                  </View>
                  <View style={styles.albumText}>
                    <Text numberOfLines={1} style={styles.albumTitle}>Liked</Text>
                    <Text style={styles.albumMeta}>{data.tracks.length} tracks likes</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#69736f" />
                </Pressable>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#050706",
    flex: 1,
  },
  content: {
    paddingBottom: 240,
    paddingHorizontal: 20,
    paddingTop: 64,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  pressed: {
    opacity: 0.55,
    transform: [{ scale: 0.96 }],
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: "#bfeee0",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.7,
  },
  title: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "900",
    marginTop: 4,
  },
  heroCard: {
    alignItems: "center",
    backgroundColor: "#f0f5f1",
    borderRadius: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 28,
    minHeight: 132,
    padding: 20,
  },
  heroLabel: {
    color: "#2a3430",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#06100d",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 8,
  },
  heroMeta: {
    color: "#52605b",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 8,
  },
  heroIcon: {
    alignItems: "center",
    backgroundColor: "#c7f7e2",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  featureGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 28,
  },
  featureCard: {
    alignItems: "center",
    backgroundColor: "#050505",
    borderColor: "#161817",
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 118,
  },
  featureCardActive: {
    borderColor: "#f1f4f1",
  },
  likedCard: {
    backgroundColor: "#7a2332",
  },
  savedCard: {
    backgroundColor: "#1d5e56",
  },
  featureIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 24,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  featureText: {
    marginTop: 18,
  },
  featureTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
  },
  featureMeta: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
  },
  historyCard: {
    backgroundColor: "#0c1110",
    borderColor: "#18211e",
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  historyHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  historyTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  historyItem: {
    color: "#aeb8b4",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 23,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 34,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#0c1110",
    borderColor: "#18211e",
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 14,
    padding: 24,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 10,
  },
  emptyText: {
    color: "#8f9995",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: "center",
  },
  albumList: {
    marginTop: 14,
  },
  albumRow: {
    alignItems: "center",
    backgroundColor: "#0c1110",
    borderColor: "#18211e",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    marginBottom: 10,
    minHeight: 82,
    padding: 10,
  },
  albumRowPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.99 }],
  },
  albumCover: {
    backgroundColor: "#19352e",
    borderRadius: 16,
    height: 62,
    width: 62,
  },
  likedFolderCover: {
    alignItems: "center",
    backgroundColor: "#ff4f8b",
    justifyContent: "center",
  },
  albumCoverWrap: {
    height: 62,
    width: 62,
  },
  albumText: {
    flex: 1,
  },
  albumTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  albumMeta: {
    color: "#8f9995",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
    textTransform: "capitalize",
  },
  albumPlay: {
    position: "absolute",
    right: -3,
    bottom: -3,
    borderRadius: 17,
    alignItems: "center",
    backgroundColor: "#E6E6E6",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  playButtonPressed: {
    opacity: 0.42,
    transform: [{ scale: 0.9 }],
  },
});
