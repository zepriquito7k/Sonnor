import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { MUSIC_GENRES } from "../../../../constants/musicGenres";
import {
  createAlbum,
  createTrack,
  updateAlbumDetails,
  updateAlbumMedia,
  updateTrackMedia,
} from "../../../../firebase/contentMutations";
import {
  cancelMusicSubmission,
  completeMusicSubmission,
  getApprovedMusicSubmissionBatch,
  getAutomaticReleaseType,
  getMusicSubmission,
} from "../../../../firebase/musicReviewClient";
import type { MusicSubmissionDocument, ReleaseType } from "../../../../firebase/schema";
import { uploadUriToStorage } from "../../../../firebase/storageClient";
import { useCurrentUser } from "../../../../hooks/useCurrentUser";

type PickedAsset = { uri: string; name?: string };
type TrackDraft = {
  submissionId: string;
  title: string;
  featNames: string;
  genre: string;
  lyrics: string;
  explicit: boolean;
};
type WizardStep = "release" | "track" | "media" | "review";

const imagePickerPackage = "expo-image-picker";

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function releaseLabel(type: ReleaseType) {
  if (type === "ep") return "EP";
  if (type === "album") return "Album";
  return "Single";
}

function delayLabel(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

async function pickAsset(mediaTypes: "images" | "videos", aspect?: [number, number]) {
  const ImagePicker = await import(imagePickerPackage);
  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    aspect,
    mediaTypes,
    quality: mediaTypes === "images" ? 0.9 : 0.8,
    videoMaxDuration: mediaTypes === "videos" ? 30 : undefined,
  });

  if (result.canceled) return null;
  const asset = result.assets[0];
  return asset ? { uri: asset.uri, name: asset.fileName ?? undefined } : null;
}

export default function FinishTrackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ submissionId?: string | string[] }>();
  const { user } = useCurrentUser();
  const submissionId = getParamValue(params.submissionId);

  const [submission, setSubmission] = useState<MusicSubmissionDocument | null>(null);
  const [releaseSubmissions, setReleaseSubmissions] = useState<MusicSubmissionDocument[]>([]);
  const [trackDrafts, setTrackDrafts] = useState<TrackDraft[]>([]);
  const [releaseTitle, setReleaseTitle] = useState("");
  const [coverAsset, setCoverAsset] = useState<PickedAsset | null>(null);
  const [videoAsset, setVideoAsset] = useState<PickedAsset | null>(null);
  const [step, setStep] = useState<WizardStep>("release");
  const [trackIndex, setTrackIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [genreQuery, setGenreQuery] = useState("");
  const [preReleaseEnabled, setPreReleaseEnabled] = useState(false);
  const [preReleaseDelay, setPreReleaseDelay] = useState("24:00:00");

  const releaseType = useMemo<ReleaseType>(() => {
    try {
      return getAutomaticReleaseType(releaseSubmissions.length || 1);
    } catch {
      return "single";
    }
  }, [releaseSubmissions.length]);
  const totalSteps = trackDrafts.length + 3;
  const currentStepNumber =
    step === "release" ? 1 : step === "track" ? trackIndex + 2 : step === "media" ? totalSteps - 1 : totalSteps;
  const progress = `${Math.min(100, (currentStepNumber / totalSteps) * 100)}%` as `${number}%`;
  const currentDraft = trackDrafts[trackIndex];
  const visibleGenres = MUSIC_GENRES.filter((genre) =>
    genre.toLowerCase().includes(genreQuery.trim().toLowerCase()),
  );

  useEffect(() => {
    let mounted = true;

    async function loadSubmission() {
      if (!submissionId || !user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const first = await getMusicSubmission(submissionId);
        if (!mounted) return;
        setSubmission(first);

        const items = first?.reviewBatchId
          ? await getApprovedMusicSubmissionBatch(user.uid, first.reviewBatchId)
          : first ? [first] : [];
        if (!mounted) return;

        const ordered = [...items].sort((left, right) => {
          const leftIndex = left.reviewBatchIndex;
          const rightIndex = right.reviewBatchIndex;
          if (typeof leftIndex === "number" && typeof rightIndex === "number") {
            return leftIndex - rightIndex;
          }
          return (left.originalFileName || left.id).localeCompare(right.originalFileName || right.id);
        });
        setReleaseSubmissions(ordered);
        setReleaseTitle(first?.reviewBatchTitle || first?.declaredTitle || "");
        setPreReleaseEnabled(first?.requestedPreReleaseEnabled === true);
        setPreReleaseDelay(delayLabel(first?.requestedPreReleaseDelaySeconds ?? 0));
        setTrackDrafts(
          ordered.map((item, index) => ({
            submissionId: item.id,
            title: item.declaredTitle || item.originalFileName?.replace(/\.mp3$/i, "") || `Faixa ${index + 1}`,
            featNames: "",
            genre: "",
            lyrics: "",
            explicit: false,
          })),
        );
      } catch (error) {
        console.log("LOAD APPROVED SUBMISSION ERROR:", error);
        Alert.alert("Erro", "Nao foi possivel carregar este lancamento aprovado.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSubmission();
    return () => {
      mounted = false;
    };
  }, [submissionId, user?.uid]);

  function updateCurrentDraft(patch: Partial<TrackDraft>) {
    setTrackDrafts((current) =>
      current.map((draft, index) => (index === trackIndex ? { ...draft, ...patch } : draft)),
    );
  }

  async function handlePickCover() {
    const asset = await pickAsset("images", [1, 1]);
    if (asset) setCoverAsset(asset);
  }

  async function handlePickVideo() {
    const asset = await pickAsset("videos");
    if (asset) setVideoAsset(asset);
  }

  function goBack() {
    if (step === "release") {
      router.back();
    } else if (step === "track" && trackIndex === 0) {
      setStep("release");
    } else if (step === "track") {
      setTrackIndex((current) => current - 1);
    } else if (step === "media") {
      setTrackIndex(Math.max(0, trackDrafts.length - 1));
      setStep("track");
    } else {
      setStep("media");
    }
  }

  function goNext() {
    if (step === "release") {
      if (!releaseTitle.trim()) {
        Alert.alert("Falta o nome", "Escreve o nome do lancamento.");
        return;
      }
      setStep("track");
      return;
    }

    if (step === "track") {
      if (!currentDraft?.title.trim()) {
        Alert.alert("Falta o nome", "Escreve o nome desta faixa.");
        return;
      }
      if (!currentDraft.genre) {
        Alert.alert("Falta a categoria", "Escolhe a categoria desta faixa.");
        return;
      }
      if (trackIndex < trackDrafts.length - 1) {
        setGenreQuery("");
        setTrackIndex((current) => current + 1);
      } else {
        setStep("media");
      }
      return;
    }

    if (step === "media") setStep("review");
  }

  async function handleFinishRelease() {
    if (!user || !submission || !submissionId || releaseSubmissions.length === 0) return;
    if (releaseSubmissions.some((item) => item.status !== "approved" || item.reviewBatchAllowed !== true)) {
      Alert.alert("Ainda nao permitido", "O admin ainda nao permitiu este lancamento.");
      return;
    }
    if (trackDrafts.some((draft) => !draft.title.trim())) {
      Alert.alert("Faixa sem nome", "Todas as faixas precisam de um nome.");
      return;
    }

    try {
      setSaving(true);
      setProgressLabel("A criar lancamento...");
      const genres = Array.from(new Set(trackDrafts.map((draft) => draft.genre.trim()).filter(Boolean)));
      const delayParts = preReleaseDelay.split(":").map((value) => Number(value));
      const delaySeconds =
        (delayParts[0] || 0) * 3600 +
        (delayParts[1] || 0) * 60 +
        (delayParts[2] || 0);
      if (preReleaseEnabled && delaySeconds <= 0) {
        Alert.alert("Tempo invalido", "Escolhe um tempo maior que zero.");
        return;
      }
      const releaseDate = preReleaseEnabled
        ? new Date(Date.now() + delaySeconds * 1000)
        : new Date();
      const releaseStatus = preReleaseEnabled ? "scheduled" : "published";
      const albumId = await createAlbum({
        userId: user.uid,
        title: releaseTitle.trim(),
        slug: slugify(releaseTitle) || `release-${Date.now()}`,
        type: getAutomaticReleaseType(releaseSubmissions.length),
        coverUrl: "",
        backgroundUrl: "",
        genres,
        explicit: trackDrafts.some((draft) => draft.explicit),
        trackIds: [],
        releaseDate,
        preReleaseEnabled,
        status: releaseStatus,
      });

      const trackIds: string[] = [];
      for (let index = 0; index < releaseSubmissions.length; index += 1) {
        const item = releaseSubmissions[index];
        const draft = trackDrafts[index];
        setProgressLabel(`A criar faixa ${index + 1}/${releaseSubmissions.length}...`);
        trackIds.push(
          await createTrack({
            userId: user.uid,
            sourceSubmissionId: item.id,
            title: draft.title.trim(),
            slug: slugify(draft.title) || `track-${Date.now()}-${index + 1}`,
            albumId,
            audioUrl: item.audioUrl,
            coverUrl: "",
            previewUrl: "",
            shortVideoUrl: "",
            featUserIds: [],
            featNames: draft.featNames.split(",").map((name) => name.trim()).filter(Boolean),
            genre: draft.genre.trim(),
            explicit: draft.explicit,
            lyrics: draft.lyrics.trim(),
            releaseDate,
            status: releaseStatus,
          }),
        );
      }
      await updateAlbumDetails(albumId, { trackIds });

      let coverUrl = "";
      let shortVideoUrl = "";
      if (coverAsset && trackIds[0]) {
        setProgressLabel("A carregar capa...");
        coverUrl = (await uploadUriToStorage({ kind: "trackCover", trackId: trackIds[0] }, coverAsset.uri)).downloadUrl;
      }
      if (videoAsset && trackIds[0]) {
        setProgressLabel("A carregar video...");
        shortVideoUrl = (await uploadUriToStorage({ kind: "trackShortVideo", trackId: trackIds[0] }, videoAsset.uri)).downloadUrl;
      }
      if (coverUrl || shortVideoUrl) {
        await Promise.all(trackIds.map((trackId) => updateTrackMedia(trackId, { coverUrl, shortVideoUrl })));
        if (coverUrl) await updateAlbumMedia(albumId, { coverUrl });
      }

      setProgressLabel("A publicar...");
      await Promise.all(releaseSubmissions.map((item, index) => completeMusicSubmission(item.id, trackIds[index])));
      Alert.alert(
        preReleaseEnabled ? "Pre-lancamento criado" : "Lancamento criado",
        preReleaseEnabled
          ? "O contador ja esta ativo na home."
          : "O teu lancamento foi publicado na Sonnor.",
        [
        { text: "Ver perfil", onPress: () => router.replace("/main/profile") },
        ],
      );
    } catch (error) {
      console.log("FINISH RELEASE ERROR:", error);
      Alert.alert("Erro", "Nao foi possivel publicar este lancamento.");
    } finally {
      setSaving(false);
      setProgressLabel("");
    }
  }

  function handleCancelPublish() {
    if (!submissionId) return;
    Alert.alert("Desistir do lancamento", "Queres cancelar este lancamento aprovado?", [
      { text: "Voltar", style: "cancel" },
      {
        text: "Desistir",
        style: "destructive",
        onPress: async () => {
          await Promise.all(releaseSubmissions.map((item) => cancelMusicSubmission(item.id)));
          router.replace("/main/create/track");
        },
      },
    ]);
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color="#fff" /><Text style={styles.muted}>A preparar lancamento...</Text></View>;
  }

  if (!submission || releaseSubmissions.length === 0) {
    return <View style={styles.centered}><Text style={styles.question}>Lancamento nao encontrado</Text><Pressable onPress={() => router.back()}><Text style={styles.link}>Voltar</Text></Pressable></View>;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={goBack}><Ionicons name="chevron-back" size={27} color="#fff" /></Pressable>
        <Text style={styles.topTitle}>{releaseLabel(releaseType)}</Text>
        <Text style={styles.stepCount}>{currentStepNumber}/{totalSteps}</Text>
      </View>
      <View style={styles.progressRail}><View style={[styles.progressFill, { width: progress }]} /></View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {step === "release" ? (
          <View style={styles.stepBlock}>
            <View style={styles.heroIcon}><Ionicons name="albums-outline" size={36} color="#000" /></View>
            <Text style={styles.question}>Como se chama este {releaseLabel(releaseType).toLowerCase()}?</Text>
            <Text style={styles.explanation}>A Sonnor definiu automaticamente como {releaseLabel(releaseType)} pelas {releaseSubmissions.length} faixas verificadas.</Text>
            <TextInput autoFocus placeholder="Nome do lancamento" placeholderTextColor="#666" style={styles.input} value={releaseTitle} onChangeText={setReleaseTitle} />
            {preReleaseEnabled ? (
              <View style={styles.preReleaseSummary}>
                <Ionicons name="notifications" size={22} color="#000" />
                <View style={styles.preReleaseSummaryText}>
                  <Text style={styles.preReleaseSummaryTitle}>Pré-lançamento ativo</Text>
                  <Text style={styles.preReleaseSummaryMeta}>
                    Publicação automática em {preReleaseDelay} após terminares.
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {step === "track" && currentDraft ? (
          <View style={styles.stepBlock}>
            <Text style={styles.eyebrow}>Faixa {trackIndex + 1} de {trackDrafts.length}</Text>
            <Text style={styles.question}>Completa os detalhes da faixa.</Text>
            <TextInput placeholder="Nome da faixa" placeholderTextColor="#666" style={styles.input} value={currentDraft.title} onChangeText={(title) => updateCurrentDraft({ title })} />
            <TextInput placeholder="Participacoes, separadas por virgula" placeholderTextColor="#666" style={styles.input} value={currentDraft.featNames} onChangeText={(featNames) => updateCurrentDraft({ featNames })} />
            <View style={styles.genreSearch}>
              <Ionicons name="search-outline" size={20} color="#888" />
              <TextInput
                placeholder="Pesquisar categoria"
                placeholderTextColor="#666"
                style={styles.genreSearchInput}
                value={genreQuery}
                onChangeText={setGenreQuery}
              />
            </View>
            <View style={styles.genreGrid}>
              {visibleGenres.map((genre) => {
                const selected = currentDraft.genre === genre;
                return (
                  <Pressable
                    key={genre}
                    style={[styles.genreChip, selected ? styles.genreChipSelected : null]}
                    onPress={() => updateCurrentDraft({ genre })}
                  >
                    <Text style={[styles.genreChipText, selected ? styles.genreChipTextSelected : null]}>{genre}</Text>
                    {selected ? <Ionicons name="checkmark" size={16} color="#000" /> : null}
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.switchRow}>
              <View style={styles.switchText}><View style={styles.explicitBadge}><Text style={styles.explicitText}>E</Text></View><Text style={styles.switchLabel}>Conteudo explicito</Text></View>
              <Switch value={currentDraft.explicit} onValueChange={(explicit) => updateCurrentDraft({ explicit })} />
            </View>
            <TextInput multiline placeholder="Letra da faixa (opcional)" placeholderTextColor="#666" style={[styles.input, styles.textArea]} value={currentDraft.lyrics} onChangeText={(lyrics) => updateCurrentDraft({ lyrics })} />
          </View>
        ) : null}

        {step === "media" ? (
          <View style={styles.stepBlock}>
            <Text style={styles.question}>Da uma imagem ao lancamento.</Text>
            <Text style={styles.explanation}>A capa e o video curto serao usados em todas as faixas.</Text>
            <Pressable style={styles.coverPicker} onPress={handlePickCover}>
              {coverAsset ? <Image source={{ uri: coverAsset.uri }} style={styles.coverImage} /> : <><Ionicons name="image-outline" size={42} color="#888" /><Text style={styles.pickerText}>Escolher capa</Text></>}
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={handlePickVideo}>
              <Ionicons name="film-outline" size={20} color="#fff" /><Text style={styles.secondaryText}>{videoAsset ? "Trocar video curto" : "Adicionar video curto"}</Text>
            </Pressable>
            {videoAsset ? <Text style={styles.muted}>{videoAsset.name || "Video selecionado"}</Text> : null}
          </View>
        ) : null}

        {step === "review" ? (
          <View style={styles.stepBlock}>
            <Text style={styles.question}>Tudo pronto para publicar.</Text>
            <View style={styles.releasePreview}>
              {coverAsset ? <Image source={{ uri: coverAsset.uri }} style={styles.previewCover} /> : <View style={[styles.previewCover, styles.coverFallback]}><Ionicons name="musical-notes" size={32} color="#777" /></View>}
              <View style={styles.previewInfo}><Text style={styles.previewTitle} numberOfLines={2}>{releaseTitle}</Text><Text style={styles.previewMeta}>{releaseLabel(releaseType)} · {trackDrafts.length} faixas</Text></View>
            </View>
            <View style={styles.trackReviewList}>
              {trackDrafts.map((draft, index) => <View key={draft.submissionId} style={styles.trackReviewRow}><Text style={styles.trackNumber}>{index + 1}</Text><Text style={styles.trackName} numberOfLines={1}>{draft.title}</Text>{draft.explicit ? <View style={styles.smallExplicit}><Text style={styles.smallExplicitText}>E</Text></View> : null}</View>)}
            </View>
            <Pressable style={styles.cancelButton} onPress={handleCancelPublish} disabled={saving}><Text style={styles.cancelText}>Desistir do lancamento</Text></Pressable>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {step === "review" ? (
          <Pressable style={[styles.primaryButton, saving && styles.disabled]} onPress={handleFinishRelease} disabled={saving}>
            {saving ? <ActivityIndicator color="#000" /> : null}<Text style={styles.primaryText}>{saving ? progressLabel || "A publicar..." : "Publicar lancamento"}</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.primaryButton} onPress={goNext}><Text style={styles.primaryText}>Seguinte</Text></Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 24, backgroundColor: "#000" },
  topBar: { minHeight: 96, paddingHorizontal: 22, paddingTop: 48, flexDirection: "row", alignItems: "center" },
  backButton: { width: 44, height: 44, justifyContent: "center" },
  topTitle: { flex: 1, color: "#fff", fontSize: 19, fontWeight: "900", textAlign: "center" },
  stepCount: { width: 44, color: "#888", fontSize: 13, fontWeight: "900", textAlign: "right" },
  progressRail: { height: 3, backgroundColor: "#171717" },
  progressFill: { height: "100%", backgroundColor: "#6F8FAF" },
  content: { paddingHorizontal: 22, paddingTop: 44, paddingBottom: 170 },
  stepBlock: { gap: 16 },
  heroIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", backgroundColor: "#6F8FAF", marginBottom: 8 },
  eyebrow: { color: "#6F8FAF", fontSize: 13, fontWeight: "900", textTransform: "uppercase" },
  question: { color: "#fff", fontSize: 34, lineHeight: 40, fontWeight: "900" },
  explanation: { color: "#aaa", fontSize: 15, lineHeight: 22, fontWeight: "700" },
  input: { minHeight: 62, borderRadius: 8, paddingHorizontal: 17, color: "#fff", fontSize: 17, fontWeight: "800", backgroundColor: "#0b0b0b", borderWidth: 1.5, borderColor: "#d7d7d7" },
  textArea: { minHeight: 130, paddingTop: 16, textAlignVertical: "top" },
  genreSearch: {
    minHeight: 56,
    borderRadius: 8,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0b0b0b",
    borderWidth: 1.5,
    borderColor: "#d7d7d7",
  },
  genreSearchInput: { flex: 1, color: "#fff", fontSize: 16, fontWeight: "800" },
  genreGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  genreChip: {
    minHeight: 42,
    borderRadius: 21,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  genreChipSelected: { backgroundColor: "#6F8FAF", borderColor: "#6F8FAF" },
  genreChipText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  genreChipTextSelected: { color: "#000" },
  switchRow: { minHeight: 62, paddingHorizontal: 16, borderRadius: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#111" },
  switchText: { flexDirection: "row", alignItems: "center", gap: 10 },
  switchLabel: { color: "#fff", fontSize: 15, fontWeight: "900" },
  preReleaseSummary: { minHeight: 70, paddingHorizontal: 16, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff" },
  preReleaseSummaryText: { flex: 1 },
  preReleaseSummaryTitle: { color: "#000", fontSize: 15, fontWeight: "900" },
  preReleaseSummaryMeta: { color: "#555", fontSize: 12, fontWeight: "700", marginTop: 4 },
  explicitBadge: { width: 24, height: 24, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  explicitText: { color: "#000", fontSize: 13, fontWeight: "900" },
  coverPicker: { width: "100%", aspectRatio: 1, maxHeight: 390, borderRadius: 24, alignItems: "center", justifyContent: "center", gap: 10, overflow: "hidden", backgroundColor: "#111", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  coverImage: { width: "100%", height: "100%" },
  pickerText: { color: "#aaa", fontSize: 14, fontWeight: "900" },
  secondaryButton: { minHeight: 54, borderRadius: 27, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: "#171717", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  secondaryText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  releasePreview: { flexDirection: "row", alignItems: "center", gap: 16, padding: 14, borderRadius: 22, backgroundColor: "#101010" },
  previewCover: { width: 100, height: 100, borderRadius: 16 },
  coverFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#181818" },
  previewInfo: { flex: 1 },
  previewTitle: { color: "#fff", fontSize: 21, fontWeight: "900" },
  previewMeta: { color: "#999", fontSize: 13, fontWeight: "800", marginTop: 7 },
  trackReviewList: { borderRadius: 20, paddingHorizontal: 14, backgroundColor: "#0c0c0c" },
  trackReviewRow: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  trackNumber: { width: 20, color: "#777", fontSize: 12, fontWeight: "900", textAlign: "center" },
  trackName: { flex: 1, color: "#fff", fontSize: 14, fontWeight: "800" },
  smallExplicit: { width: 19, height: 19, borderRadius: 5, alignItems: "center", justifyContent: "center", backgroundColor: "#ddd" },
  smallExplicitText: { color: "#000", fontSize: 10, fontWeight: "900" },
  cancelButton: { minHeight: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(210,62,62,0.12)" },
  cancelText: { color: "#ff8d8d", fontSize: 14, fontWeight: "900" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 122, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 32, alignItems: "center", justifyContent: "center", backgroundColor: "#000" },
  primaryButton: { width: "65%", minWidth: 220, maxWidth: 340, minHeight: 58, borderRadius: 29, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: "#6F8FAF" },
  primaryText: { color: "#000", fontSize: 17, fontWeight: "900" },
  disabled: { opacity: 0.55 },
  muted: { color: "#999", fontSize: 13, fontWeight: "700" },
  link: { color: "#6F8FAF", fontSize: 15, fontWeight: "900" },
});
