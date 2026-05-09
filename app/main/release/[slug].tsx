import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  findReleaseBySlug,
  LibraryReleaseType,
} from "../../../constants/musicLibrary";
import { useResponsive } from "../../../utils/responsive";

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getValidReleaseType(value: string | undefined): LibraryReleaseType | undefined {
  if (value === "Album" || value === "Single" || value === "EP") {
    return value;
  }

  return undefined;
}

function getTotalDuration(durations: string[]) {
  const totalSeconds = durations.reduce((sum, duration) => {
    const [minutesText, secondsText] = duration.split(":");
    const minutes = Number(minutesText);
    const seconds = Number(secondsText);

    if (Number.isNaN(minutes) || Number.isNaN(seconds)) {
      return sum;
    }

    return sum + minutes * 60 + seconds;
  }, 0);

  const totalMinutes = Math.floor(totalSeconds / 60);
  return `${totalMinutes} min`;
}

export default function ReleaseScreen() {
  const router = useRouter();
  const { wp, hp, font } = useResponsive();
  const params = useLocalSearchParams<{
    slug?: string | string[];
    trackId?: string | string[];
    title?: string | string[];
    artist?: string | string[];
    type?: string | string[];
    year?: string | string[];
    cover?: string | string[];
    heroImage?: string | string[];
    releaseDate?: string | string[];
  }>();
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  const slug = getParamValue(params.slug);
  const requestedTrackId = getParamValue(params.trackId);
  const baseRelease = useMemo(() => findReleaseBySlug(slug), [slug]);

  const release = useMemo(() => {
    if (!baseRelease) {
      return null;
    }

    const nextType = getValidReleaseType(getParamValue(params.type));
    const yearValue = Number(getParamValue(params.year));

    return {
      ...baseRelease,
      title: getParamValue(params.title) ?? baseRelease.title,
      artist: getParamValue(params.artist) ?? baseRelease.artist,
      type: nextType ?? baseRelease.type,
      year: Number.isFinite(yearValue) ? yearValue : baseRelease.year,
      cover: getParamValue(params.cover) ?? baseRelease.cover,
      heroImage: getParamValue(params.heroImage) ?? baseRelease.heroImage,
      releaseDate: getParamValue(params.releaseDate) ?? baseRelease.releaseDate,
    };
  }, [baseRelease, params.artist, params.cover, params.heroImage, params.releaseDate, params.title, params.type, params.year]);

  useEffect(() => {
    if (!release) {
      setSelectedTrackId(null);
      return;
    }

    const nextTrackId =
      release.tracks.find((track) => track.id === requestedTrackId)?.id ??
      release.tracks[0]?.id ??
      null;

    setSelectedTrackId(nextTrackId);
    setIsPlaying(true);
  }, [release, requestedTrackId]);

  const selectedTrack =
    release?.tracks.find((track) => track.id === selectedTrackId) ?? null;
  const totalDuration = release
    ? getTotalDuration(release.tracks.map((track) => track.duration))
    : "0 min";

  function handleTrackPress(trackId: string) {
    if (selectedTrackId === trackId) {
      setIsPlaying((current) => !current);
      return;
    }

    setSelectedTrackId(trackId);
    setIsPlaying(true);
  }

  function handlePlayPress() {
    if (!release) {
      return;
    }

    if (!selectedTrackId) {
      setSelectedTrackId(release.tracks[0]?.id ?? null);
      setIsPlaying(true);
      return;
    }

    setIsPlaying((current) => !current);
  }

  function handleShufflePress() {
    if (!release || release.tracks.length === 0) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * release.tracks.length);
    setSelectedTrackId(release.tracks[randomIndex]?.id ?? release.tracks[0].id);
    setIsPlaying(true);
  }

  if (!release) {
    return (
      <View style={styles.fallbackContainer}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
          <Text style={styles.backButtonText}>Voltar</Text>
        </Pressable>
        <Text style={styles.fallbackTitle}>Release nao encontrado</Text>
        <Text style={styles.fallbackText}>
          Nao encontrei este album ou musica na biblioteca atual.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={{ uri: release.heroImage }} style={styles.backgroundImage} />
      <View style={styles.backgroundScrim} />
      <BlurView tint="dark" intensity={70} style={StyleSheet.absoluteFillObject} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: hp(6),
            paddingBottom: hp(16),
            paddingHorizontal: wp(6),
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>

          <Pressable style={styles.iconButton}>
            <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.heroBlock}>
          <Image
            source={{ uri: release.cover }}
            style={[
              styles.coverImage,
              {
                width: wp(66),
                height: wp(66),
                borderRadius: wp(5),
              },
            ]}
          />

          <Text style={[styles.releaseTitle, { fontSize: font(30), marginTop: hp(3) }]}>
            {release.title}
          </Text>
          <Text style={[styles.releaseArtist, { fontSize: font(16), marginTop: hp(0.8) }]}>
            {release.artist}
          </Text>

          <View style={[styles.metaRow, { marginTop: hp(2) }]}>
            <View style={styles.metaPill}>
              <Text style={[styles.metaPillText, { fontSize: font(12) }]}>
                {release.type}
              </Text>
            </View>
            <View style={styles.metaPill}>
              <Text style={[styles.metaPillText, { fontSize: font(12) }]}>
                {release.year}
              </Text>
            </View>
            <View style={styles.metaPill}>
              <Text style={[styles.metaPillText, { fontSize: font(12) }]}>
                {release.tracks.length} faixas
              </Text>
            </View>
          </View>

          <Text style={[styles.releaseMeta, { fontSize: font(13), marginTop: hp(1.6) }]}>
            Lancado em {release.releaseDate} • {totalDuration}
          </Text>
        </View>

        <View style={[styles.actionRow, { marginTop: hp(3.2), gap: wp(3) }]}>
          <Pressable
            style={[styles.primaryAction, { minHeight: hp(6.2) }]}
            onPress={handlePlayPress}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={20}
              color="#060606"
            />
            <Text style={[styles.primaryActionText, { fontSize: font(15) }]}>
              {isPlaying ? "Pausar" : "Reproduzir"}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryAction, { minHeight: hp(6.2) }]}
            onPress={handleShufflePress}
          >
            <Ionicons name="shuffle" size={18} color="#fff" />
            <Text style={[styles.secondaryActionText, { fontSize: font(15) }]}>
              Aleatorio
            </Text>
          </Pressable>
        </View>

        <View style={[styles.nowPlayingCard, { marginTop: hp(2.8), padding: wp(4.5) }]}>
          <Text style={[styles.nowPlayingLabel, { fontSize: font(11) }]}>
            {isPlaying ? "A tocar agora" : "Faixa selecionada"}
          </Text>
          <Text style={[styles.nowPlayingTitle, { fontSize: font(19), marginTop: hp(0.6) }]}>
            {selectedTrack?.title ?? "Escolhe uma faixa"}
          </Text>
          <Text
            style={[styles.nowPlayingText, { fontSize: font(13), marginTop: hp(0.8) }]}
          >
            {selectedTrack?.note ??
              "Toca numa faixa da lista para abrir o projeto com a musica certa pronta a tocar."}
          </Text>
        </View>

        <View style={[styles.sectionHeader, { marginTop: hp(4.2) }]}>
          <Text style={[styles.sectionTitle, { fontSize: font(22) }]}>Faixas</Text>
          <Text style={[styles.sectionHint, { fontSize: font(12) }]}>
            Lista do release
          </Text>
        </View>

        <View style={[styles.trackList, { marginTop: hp(1.8) }]}>
          {release.tracks.map((track, index) => {
            const isActive = selectedTrackId === track.id;
            const isActiveAndPlaying = isActive && isPlaying;

            return (
              <Pressable
                key={track.id}
                style={[
                  styles.trackRow,
                  { paddingVertical: hp(1.8), paddingHorizontal: wp(4) },
                  isActive && styles.trackRowActive,
                ]}
                onPress={() => handleTrackPress(track.id)}
              >
                <View style={styles.trackIndexBox}>
                  {isActiveAndPlaying ? (
                    <Ionicons name="pause-circle" size={24} color="#fff" />
                  ) : isActive ? (
                    <Ionicons name="play-circle" size={24} color="#fff" />
                  ) : (
                    <Text style={[styles.trackIndex, { fontSize: font(14) }]}>
                      {index + 1}
                    </Text>
                  )}
                </View>

                <View style={styles.trackTextBlock}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.trackTitle,
                      { fontSize: font(15) },
                      isActive && styles.trackTitleActive,
                    ]}
                  >
                    {track.title}
                  </Text>
                  <Text numberOfLines={1} style={[styles.trackSubtitle, { fontSize: font(12) }]}>
                    {track.note ?? release.artist}
                  </Text>
                </View>

                <Text style={[styles.trackDuration, { fontSize: font(13) }]}>
                  {track.duration}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.aboutCard, { marginTop: hp(3.5), padding: wp(4.5) }]}>
          <Text style={[styles.aboutTitle, { fontSize: font(18) }]}>Sobre o projeto</Text>
          <Text style={[styles.aboutText, { fontSize: font(14), marginTop: hp(1.2) }]}>
            {release.description}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030303",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.34,
  },
  backgroundScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBlock: {
    alignItems: "center",
  },
  coverImage: {
    backgroundColor: "#111",
  },
  releaseTitle: {
    color: "#fff",
    fontWeight: "800",
    textAlign: "center",
  },
  releaseArtist: {
    color: "#d3d3d3",
    fontWeight: "500",
    textAlign: "center",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  metaPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  metaPillText: {
    color: "#f4f4f4",
    fontWeight: "700",
  },
  releaseMeta: {
    color: "#9f9f9f",
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
  },
  primaryAction: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  primaryActionText: {
    color: "#050505",
    fontWeight: "800",
  },
  secondaryAction: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  secondaryActionText: {
    color: "#fff",
    fontWeight: "700",
  },
  nowPlayingCard: {
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  nowPlayingLabel: {
    color: "#9e9e9e",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  nowPlayingTitle: {
    color: "#fff",
    fontWeight: "800",
  },
  nowPlayingText: {
    color: "#d3d3d3",
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: "#fff",
    fontWeight: "800",
  },
  sectionHint: {
    color: "#8d8d8d",
    fontWeight: "600",
  },
  trackList: {
    gap: 10,
  },
  trackRow: {
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.05)",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  trackRowActive: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  trackIndexBox: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  trackIndex: {
    color: "#9a9a9a",
    fontWeight: "700",
  },
  trackTextBlock: {
    flex: 1,
  },
  trackTitle: {
    color: "#f4f4f4",
    fontWeight: "700",
  },
  trackTitleActive: {
    color: "#fff",
  },
  trackSubtitle: {
    color: "#999",
    marginTop: 4,
  },
  trackDuration: {
    color: "#cfcfcf",
    fontWeight: "600",
  },
  aboutCard: {
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  aboutTitle: {
    color: "#fff",
    fontWeight: "800",
  },
  aboutText: {
    color: "#d6d6d6",
    lineHeight: 22,
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: "#050505",
    paddingHorizontal: 24,
    paddingTop: 72,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    marginBottom: 24,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  fallbackTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
  },
  fallbackText: {
    color: "#b8b8b8",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
  },
});
