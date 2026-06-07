import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { usePlayer, type Track } from "../../context/PlayerContext";
import { getAlbumContent, getLibraryContent } from "../../firebase/contentClient";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useCurrentUser } from "../../hooks/useCurrentUser";

export default function LibraryScreen() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { playQueue } = usePlayer();
  const loadLibrary = useCallback(() => getLibraryContent(user?.uid), [user?.uid]);
  const { data } = useAsyncData(loadLibrary, {
    sections: [],
    tracks: [],
    albums: [],
    posts: [],
    recentPlays: [],
    playlists: [],
  });

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
      genre: track.genre,
      id: track.id,
      lyrics: track.lyrics,
      shortVideo: track.shortVideoUrl,
      source: "library",
      title: track.title,
      uri: track.audioUrl,
    }));

    await playQueue(queue);
  }

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>A TUA COLECAO</Text>
        <Text style={styles.title}>Biblioteca</Text>

        <View style={styles.featureGrid}>
          <Pressable style={[styles.featureCard, styles.likedCard]}>
            <View style={styles.featureIcon}>
              <Ionicons name="heart" size={28} color="#fff" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Musicas curtidas</Text>
              <Text style={styles.featureMeta}>As tuas favoritas</Text>
            </View>
          </Pressable>

          <Pressable style={[styles.featureCard, styles.savedCard]}>
            <View style={styles.featureIcon}>
              <Ionicons name="bookmark" size={27} color="#fff" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Salvos</Text>
              <Text style={styles.featureMeta}>{data.albums.length} albuns</Text>
            </View>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Albuns guardados</Text>
        {data.albums.length === 0 ? (
          <Text style={styles.emptyText}>
            Guarda um album no botao + para o encontrares aqui.
          </Text>
        ) : (
          <View style={styles.albumList}>
            {data.albums.map((album) => (
              <Pressable key={album.id} style={styles.albumRow} onPress={() => openAlbum(album)}>
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
                  <Text style={styles.albumMeta}>{album.type || "Album"}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#050706", flex: 1 },
  content: { paddingBottom: 300, paddingHorizontal: 20, paddingTop: 72 },
  eyebrow: { color: "#6ff0c7", fontSize: 11, fontWeight: "900", letterSpacing: 1.7 },
  title: { color: "#fff", fontSize: 36, fontWeight: "900", marginTop: 6 },
  featureGrid: { flexDirection: "row", gap: 12, marginTop: 30 },
  featureCard: { flex: 1, justifyContent: "space-between", minHeight: 154, padding: 16 },
  likedCard: { backgroundColor: "#b72b43" },
  savedCard: { backgroundColor: "#23756d" },
  featureIcon: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.16)", height: 50, justifyContent: "center", width: 50 },
  featureText: { marginTop: 18 },
  featureTitle: { color: "#fff", fontSize: 17, fontWeight: "900" },
  featureMeta: { color: "rgba(255,255,255,0.72)", fontSize: 13, fontWeight: "700", marginTop: 6 },
  sectionTitle: { color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 34 },
  emptyText: { color: "#8f9995", fontSize: 14, lineHeight: 21, marginTop: 18 },
  albumList: { marginTop: 14 },
  albumRow: { alignItems: "center", flexDirection: "row", gap: 14, minHeight: 76, paddingVertical: 8 },
  albumCover: { backgroundColor: "#19352e", height: 60, width: 60 },
  albumCoverWrap: { height: 60, width: 60 },
  albumText: { flex: 1 },
  albumTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  albumMeta: { color: "#8f9995", fontSize: 13, fontWeight: "600", marginTop: 6, textTransform: "capitalize" },
  albumPlay: { position: "absolute", right: 4, bottom: 4, borderRadius: 15, alignItems: "center", backgroundColor: "#6F8FAF", height: 30, justifyContent: "center", width: 30 },
  playButtonPressed: { opacity: 0.42, transform: [{ scale: 0.9 }] },
});
