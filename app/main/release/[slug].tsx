import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { usePlayer, type Track } from "../../../context/PlayerContext";
import { getAlbumContent, getLibraryContent } from "../../../firebase/contentClient";
import {
  removeAlbumFromLibrary,
  saveAlbumToLibrary,
} from "../../../firebase/settingsClient";
import { useAsyncData } from "../../../hooks/useAsyncData";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import AnimatedSoundWave from "../components/AnimatedSoundWave";

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function yearOf(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().getFullYear();
  }
  return new Date().getFullYear();
}

function dateOf(value: unknown) {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (value && typeof value === "object" && "seconds" in value) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  return null;
}

function relativeReleaseDate(value: unknown) {
  const date = dateOf(value);
  if (!date) return String(yearOf(value));

  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 14) return `${days} dias atras`;
  if (days < 60) return `${Math.floor(days / 7)} semanas atras`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} ${months === 1 ? "mes" : "meses"} atras`;
  }
  return String(date.getFullYear());
}

function CoverAccent({
  cover,
  style,
}: {
  cover: string;
  style: object;
}) {
  return (
    <View style={[styles.coverAccent, style]}>
      {cover ? (
        <Image
          blurRadius={18}
          resizeMode="cover"
          source={{ uri: cover }}
          style={styles.coverAccentImage}
        />
      ) : null}
      <View style={styles.coverAccentShade} />
    </View>
  );
}

function AccentText({
  children,
  cover,
  numberOfLines,
  style,
}: {
  children: React.ReactNode;
  cover: string;
  numberOfLines?: number;
  style: object;
}) {
  return (
    <View style={styles.accentTextWrap}>
      <CoverAccent cover={cover} style={StyleSheet.absoluteFillObject} />
      <Text numberOfLines={numberOfLines} style={[style, styles.accentText]}>
        {children}
      </Text>
    </View>
  );
}

export default function ReleaseScreen() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const params = useLocalSearchParams<{
    albumId?: string | string[];
    artist?: string | string[];
    cover?: string | string[];
    slug?: string | string[];
    title?: string | string[];
  }>();
  const albumId = valueOf(params.albumId) ?? valueOf(params.slug) ?? "";
  const loadAlbum = useCallback(() => getAlbumContent(albumId), [albumId]);
  const { data, loading } = useAsyncData(loadAlbum, null);
  const { playQueue, status, track: currentTrack } = usePlayer();
  const [saved, setSaved] = useState(false);

  const album = data?.album;
  const artist =
    data?.user?.displayName ||
    data?.user?.username ||
    valueOf(params.artist) ||
    "Sonnor";
  const avatar = data?.user?.avatarUrl || "";
  const title = album?.title || valueOf(params.title) || "Album";
  const cover = album?.coverUrl || valueOf(params.cover) || "";
  const queue: Track[] =
    data?.tracks.map((item) => ({
      albumId,
      artist,
      cover: item.coverUrl || cover,
      genre: item.genre,
      id: item.id,
      lyrics: item.lyrics,
      shortVideo: item.shortVideoUrl,
      source: "release",
      title: item.title,
      uri: item.audioUrl,
    })) ?? [];
  const isPlaying = status?.isLoaded && status.isPlaying;
  useEffect(() => {
    let active = true;
    if (!user?.uid) return;

    getLibraryContent(user.uid).then((library) => {
      if (active) setSaved(library.albums.some((item) => item.id === albumId));
    });

    return () => {
      active = false;
    };
  }, [albumId, user?.uid]);

  async function playFrom(index: number) {
    await playQueue(queue, index);
  }

  async function toggleSaved() {
    if (!user?.uid) return;
    const next = !saved;
    setSaved(next);

    try {
      if (next) await saveAlbumToLibrary(user.uid, albumId);
      else await removeAlbumFromLibrary(user.uid, albumId);
    } catch {
      setSaved(!next);
    }
  }

  function openArtistProfile() {
    if (!album?.userId) return;
    router.push({ pathname: "/main/profile", params: { userId: album.userId } });
  }

  if (loading) {
    return <View style={styles.center}><Text style={styles.muted}>A carregar album...</Text></View>;
  }

  if (!album) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Album nao encontrado</Text>
        <Pressable onPress={() => router.back()}><Text style={styles.backText}>Voltar</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.heroGradient}>
          {cover ? (
            <Image
              blurRadius={20}
              resizeMode="cover"
              source={{ uri: cover }}
              style={styles.heroColorSample}
            />
          ) : null}
          <Svg height="100%" width="100%">
            <Defs>
              <LinearGradient id="albumFade" x1="0" x2="0" y1="0" y2="1">
                <Stop offset="0" stopColor="#000000" stopOpacity="0.08" />
                <Stop offset="0.38" stopColor="#000000" stopOpacity="0.52" />
                <Stop offset="0.64" stopColor="#000000" stopOpacity="0.94" />
                <Stop offset="0.8" stopColor="#000000" />
                <Stop offset="1" stopColor="#000000" />
              </LinearGradient>
            </Defs>
            <Rect fill="url(#albumFade)" height="100%" width="100%" />
          </Svg>
        </View>

        <View style={styles.topRow}>
          <Pressable style={styles.topButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={27} color="#fff" />
          </Pressable>
          <Pressable style={styles.topButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.heroContent}>
          {cover ? <Image source={{ uri: cover }} style={styles.cover} /> : <View style={styles.cover} />}

          <Text style={styles.title}>{title}</Text>
          <Pressable style={styles.artistRow} onPress={openArtistProfile}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.artistAvatar} />
            ) : (
              <View style={styles.artistAvatarFallback}>
                <Ionicons name="person" size={15} color="#fff" />
              </View>
            )}
            <Text style={styles.artist}>{artist}</Text>
          </Pressable>
          <Text style={styles.meta}>
            {(album.type || "album").replace(/^./, (letter) => letter.toUpperCase())} · {relativeReleaseDate(album.releaseDate ?? album.createdAt)} · {data.tracks.length} faixas
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.actionButton} onPress={toggleSaved}>
            {saved ? <CoverAccent cover={cover} style={styles.savedAccent} /> : null}
            <Ionicons name={saved ? "checkmark-circle" : "add-circle-outline"} size={30} color={saved ? "#fff" : "#c1cbc8"} />
          </Pressable>
          <View style={styles.actionSpacer} />
          <Pressable style={styles.actionButton}>
            <Ionicons name="shuffle" size={28} color="#c1cbc8" />
          </Pressable>
          <Pressable style={({ pressed }) => [styles.playButton, pressed ? styles.playButtonPressed : null]} onPress={() => playFrom(0)}>
            <CoverAccent cover={cover} style={StyleSheet.absoluteFillObject} />
            <Ionicons name="play" size={30} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.trackList}>
          {data.tracks.map((item, index) => {
            const active = currentTrack?.id === item.id;
            return (
              <Pressable key={item.id} style={styles.trackRow} onPress={() => playFrom(index)}>
                <View style={styles.trackText}>
                  {active ? (
                    <View style={styles.activeTitleRow}>
                      <AccentText cover={cover} numberOfLines={1} style={styles.trackTitle}>
                        {item.title}
                      </AccentText>
                      {isPlaying ? <AnimatedSoundWave /> : null}
                    </View>
                  ) : (
                    <Text numberOfLines={1} style={styles.trackTitle}>{item.title}</Text>
                  )}
                  <View style={styles.trackMetaRow}>
                    {item.explicit ? <View style={styles.explicitBadge}><Text style={styles.explicitText}>E</Text></View> : null}
                    {active ? (
                      <AccentText cover={cover} numberOfLines={1} style={styles.trackArtist}>
                        {artist}
                      </AccentText>
                    ) : (
                      <Text numberOfLines={1} style={styles.trackArtist}>{artist}</Text>
                    )}
                  </View>
                </View>
                <Ionicons name="ellipsis-horizontal" size={21} color="#858b89" />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#000000", flex: 1 },
  content: { paddingBottom: 300, paddingHorizontal: 22, paddingTop: 54 },
  heroGradient: { height: 660, left: -22, position: "absolute", right: -22, top: 0 },
  heroColorSample: {
    height: 8,
    left: "50%",
    opacity: 1,
    position: "absolute",
    top: 120,
    transform: [{ scale: 110 }],
    width: 8,
  },
  topRow: { flexDirection: "row", justifyContent: "space-between" },
  topButton: { alignItems: "center", height: 42, justifyContent: "center", width: 42 },
  heroContent: { minHeight: 418 },
  cover: { alignSelf: "center", backgroundColor: "#17201d", borderRadius: 18, height: 250, marginTop: 14, width: 250 },
  title: { color: "#fff", fontSize: 32, fontWeight: "900", letterSpacing: -0.7, marginTop: 25 },
  artistRow: { alignItems: "center", flexDirection: "row", gap: 9, marginTop: 14 },
  artistAvatar: { borderRadius: 14, height: 28, width: 28 },
  artistAvatarFallback: { alignItems: "center", backgroundColor: "#18372f", borderRadius: 14, height: 28, justifyContent: "center", width: 28 },
  artist: { color: "#fff", fontSize: 15, fontWeight: "800" },
  meta: { color: "rgba(255,255,255,0.66)", fontSize: 13, fontWeight: "700", marginTop: 9 },
  actions: { alignItems: "center", flexDirection: "row", gap: 14, marginTop: 4 },
  actionButton: { alignItems: "center", height: 42, justifyContent: "center", width: 36 },
  actionSpacer: { flex: 1 },
  playButton: { alignItems: "center", backgroundColor: "#171717", borderRadius: 29, height: 58, justifyContent: "center", overflow: "hidden", width: 58 },
  playButtonPressed: { opacity: 0.46, transform: [{ scale: 0.92 }] },
  coverAccent: { overflow: "hidden" },
  coverAccentImage: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ scale: 2.8 }],
  },
  coverAccentShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  savedAccent: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  accentTextWrap: { alignSelf: "flex-start", overflow: "hidden" },
  accentText: { color: "#fff", paddingHorizontal: 4, paddingVertical: 1 },
  trackList: { marginTop: 18 },
  trackRow: { alignItems: "center", flexDirection: "row", gap: 16, minHeight: 68, paddingVertical: 7 },
  trackText: { flex: 1 },
  activeTitleRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  trackTitle: { color: "#f3f5f4", fontSize: 17, fontWeight: "700" },
  trackMetaRow: { alignItems: "center", flexDirection: "row", gap: 7, marginTop: 7 },
  trackArtist: { color: "#9da5a2", flex: 1, fontSize: 14, fontWeight: "600" },
  explicitBadge: { alignItems: "center", backgroundColor: "#a5aaa8", borderRadius: 3, height: 15, justifyContent: "center", width: 15 },
  explicitText: { color: "#111", fontSize: 10, fontWeight: "900" },
  center: { alignItems: "center", backgroundColor: "#080a09", flex: 1, justifyContent: "center", padding: 24 },
  muted: { color: "#9da5a2" },
  backText: { color: "#fff", marginTop: 18 },
});
