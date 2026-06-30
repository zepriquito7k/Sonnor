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
import { pressableFeedback } from "../../../../components/pressFeedback";
import { useSuccessFeedback } from "../../../../components/SuccessFeedback";
import { getSearchableUsers } from "../../../../firebase/contentClient";
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
const TRACK_TITLE_MAX_LENGTH = 43;
const FOLDER_TITLE_MAX_LENGTH = 40;
type TrackDraft = {
  submissionId: string;
  title: string;
  genre: string;
  lyrics: string;
  explicit: boolean;
  videoAsset: PickedAsset | null;
};
type ArtistOption = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
};
type WizardStep = "release" | "track" | "collaborators" | "media" | "review";

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
  const days = Math.floor(totalSeconds / 86400);
  const remainingAfterDays = totalSeconds % 86400;
  const hours = Math.floor(remainingAfterDays / 3600);
  const minutes = Math.floor((remainingAfterDays % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [days, hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
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
  const { showSuccess } = useSuccessFeedback();
  const submissionId = getParamValue(params.submissionId);

  const [submission, setSubmission] = useState<MusicSubmissionDocument | null>(null);
  const [releaseSubmissions, setReleaseSubmissions] = useState<MusicSubmissionDocument[]>([]);
  const [trackDrafts, setTrackDrafts] = useState<TrackDraft[]>([]);
  const [releaseTitle, setReleaseTitle] = useState("");
  const [coverAsset, setCoverAsset] = useState<PickedAsset | null>(null);
  const [step, setStep] = useState<WizardStep>("release");
  const [trackIndex, setTrackIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [genreQuery, setGenreQuery] = useState("");
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [artistQuery, setArtistQuery] = useState("");
  const [artistOptions, setArtistOptions] = useState<ArtistOption[]>([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState<ArtistOption[]>([]);
  const [preReleaseEnabled, setPreReleaseEnabled] = useState(false);
  const [preReleaseDelay, setPreReleaseDelay] = useState("00:00:00:00");

  const releaseType = useMemo<ReleaseType>(() => {
    try {
      return getAutomaticReleaseType(releaseSubmissions.length || 1);
    } catch {
      return "single";
    }
  }, [releaseSubmissions.length]);
  const genreSeed = useMemo(() => Math.random(), []);
  const totalSteps = trackDrafts.length + 4;
  const currentStepNumber =
    step === "release"
      ? 1
      : step === "track"
        ? trackIndex + 2
        : step === "collaborators"
          ? totalSteps - 2
          : step === "media"
            ? totalSteps - 1
            : totalSteps;
  const progress = `${Math.min(100, (currentStepNumber / totalSteps) * 100)}%` as `${number}%`;
  const currentDraft = trackDrafts[trackIndex];
  const randomizedGenres = useMemo(
    () =>
      [...MUSIC_GENRES].sort((left, right) => {
        const leftScore = Math.sin((left.charCodeAt(0) + left.length) * genreSeed);
        const rightScore = Math.sin((right.charCodeAt(0) + right.length) * genreSeed);
        return leftScore - rightScore;
      }),
    [genreSeed],
  );
  const visibleGenres = useMemo(() => {
    const query = genreQuery.trim().toLowerCase();
    const filtered = randomizedGenres.filter((genre) =>
      genre.toLowerCase().includes(query),
    );

    if (query || showAllGenres) {
      return filtered;
    }

    const featured = filtered.slice(0, 9);

    if (currentDraft?.genre && !featured.includes(currentDraft.genre as typeof MUSIC_GENRES[number])) {
      return [currentDraft.genre as typeof MUSIC_GENRES[number], ...featured].slice(0, 10);
    }

    return featured;
  }, [currentDraft?.genre, genreQuery, randomizedGenres, showAllGenres]);
  const visibleArtistOptions = artistOptions
    .filter((artist) => artist.id !== user?.uid)
    .filter(
      (artist) =>
        !selectedCollaborators.some((selected) => selected.id === artist.id),
    )
    .filter((artist) => {
      const query = artistQuery.trim().toLowerCase();

      if (!query) {
        return false;
      }

      return `${artist.name} ${artist.username}`.toLowerCase().includes(query);
    })
    .slice(0, 8);

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

        const [items, artists] = await Promise.all([
          first?.reviewBatchId
            ? getApprovedMusicSubmissionBatch(user.uid, first.reviewBatchId)
            : Promise.resolve(first ? [first] : []),
          getSearchableUsers(),
        ]);
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
            title: (
              item.declaredTitle ||
              item.originalFileName?.replace(/\.mp3$/i, "") ||
              `Track ${index + 1}`
            ).slice(0, TRACK_TITLE_MAX_LENGTH),
            genre: "",
            lyrics: "",
            explicit: false,
            videoAsset: null,
          })),
        );
        setArtistOptions(
          artists.map((artist) => ({
            id: artist.uid || artist.id,
            name: artist.displayName || artist.username || "Artist",
            username: artist.username || "",
            avatarUrl: artist.avatarUrl || artist.bannerUrl || "",
          })),
        );
      } catch (error) {
        console.log("LOAD APPROVED SUBMISSION ERROR:", error);
        Alert.alert("Error", "Could not carregar este release aprovado.");
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

  function addCollaborator(artist: ArtistOption) {
    setSelectedCollaborators((current) =>
      current.some((item) => item.id === artist.id) ? current : [...current, artist],
    );
    setArtistQuery("");
  }

  function removeCollaborator(artistId: string) {
    setSelectedCollaborators((current) => current.filter((item) => item.id !== artistId));
  }

  async function handlePickCover() {
    const asset = await pickAsset("images", [1, 1]);
    if (asset) setCoverAsset(asset);
  }

  async function handlePickTrackVideo(index: number) {
    const asset = await pickAsset("videos");
    if (asset) {
      setTrackDrafts((current) =>
        current.map((draft, draftIndex) =>
          draftIndex === index ? { ...draft, videoAsset: asset } : draft,
        ),
      );
    }
  }

  function goBack() {
    if (step === "release") {
      router.back();
    } else if (step === "track" && trackIndex === 0) {
      setStep("release");
    } else if (step === "track") {
      setTrackIndex((current) => current - 1);
    } else if (step === "collaborators") {
      setTrackIndex(Math.max(0, trackDrafts.length - 1));
      setStep("track");
    } else if (step === "media") {
      setStep("collaborators");
    } else {
      setStep("media");
    }
  }

  function goNext() {
    if (step === "release") {
      if (!releaseTitle.trim()) {
        Alert.alert("Name required", "Enter the release name.");
        return;
      }
      if (!coverAsset) {
        Alert.alert("Cover required", "Choose a cover for the folder.");
        return;
      }
      setStep("track");
      return;
    }

    if (step === "track") {
      if (!currentDraft?.title.trim()) {
        Alert.alert("Name required", "Enter this track name.");
        return;
      }
      if (!currentDraft.genre) {
        Alert.alert("Category required", "Choose this track category.");
        return;
      }
      if (trackIndex < trackDrafts.length - 1) {
        setGenreQuery("");
        setShowAllGenres(false);
        setTrackIndex((current) => current + 1);
      } else {
        setStep("collaborators");
      }
      return;
    }

    if (step === "collaborators") {
      setStep("media");
      return;
    }

    if (step === "media") {
      if (trackDrafts.some((draft) => !draft.videoAsset)) {
        Alert.alert("Music video required", "Each track needs a music video.");
        return;
      }
      setStep("review");
    }
  }

  async function handleFinishRelease() {
    if (!user || !submission || !submissionId || releaseSubmissions.length === 0) return;
    if (releaseSubmissions.some((item) => item.status !== "approved" || item.reviewBatchAllowed !== true)) {
      Alert.alert("Not allowed yet", "The admin has not allowed this release yet.");
      return;
    }
    if (trackDrafts.some((draft) => !draft.title.trim())) {
      Alert.alert("Track missing name", "Every track needs a name.");
      return;
    }

    try {
      setSaving(true);
      setProgressLabel("Creating release...");
      const genres = Array.from(new Set(trackDrafts.map((draft) => draft.genre.trim()).filter(Boolean)));
      const rawDelayParts = preReleaseDelay.split(":").map((value) => Number(value));
      const delayParts = rawDelayParts.length === 4 ? rawDelayParts : [0, ...rawDelayParts];
      const delaySeconds =
        (delayParts[0] || 0) * 86400 +
        (delayParts[1] || 0) * 3600 +
        (delayParts[2] || 0) * 60 +
        (delayParts[3] || 0);
      if (preReleaseEnabled && delaySeconds <= 0) {
        Alert.alert("Invalid time", "Choose a time greater than zero.");
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
        setProgressLabel(`Creating track ${index + 1}/${releaseSubmissions.length}...`);
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
            featUserIds: selectedCollaborators.map((artist) => artist.id),
            featNames: selectedCollaborators.map((artist) => artist.name),
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
      if (coverAsset && trackIds[0]) {
        setProgressLabel("Uploading cover...");
        coverUrl = (await uploadUriToStorage({ kind: "albumCover", albumId }, coverAsset.uri)).downloadUrl;
      }
      if (coverUrl) {
        await updateAlbumMedia(albumId, { coverUrl });
        await Promise.all(trackIds.map((trackId) => updateTrackMedia(trackId, { coverUrl })));
      }
      await Promise.all(
        trackIds.map(async (trackId, index) => {
          const video = trackDrafts[index]?.videoAsset;

          if (!video) return;

          setProgressLabel(`Uploading music video ${index + 1}/${trackIds.length}...`);
          const shortVideoUrl = (
            await uploadUriToStorage({ kind: "trackShortVideo", trackId }, video.uri)
          ).downloadUrl;
          await updateTrackMedia(trackId, { shortVideoUrl });
        }),
      );

      setProgressLabel("Publishing...");
      await Promise.all(releaseSubmissions.map((item, index) => completeMusicSubmission(item.id, trackIds[index])));
      showSuccess({
        message: preReleaseEnabled ? "Pre-release created" : "Release published",
        onDone: () => router.replace("/main/profile"),
      });
    } catch (error) {
      console.log("FINISH RELEASE ERROR:", error);
      Alert.alert("Error", "Could not publish this release.");
    } finally {
      setSaving(false);
      setProgressLabel("");
    }
  }

  function handleCancelPublish() {
    if (!submissionId) return;
    Alert.alert("Abandon release", "Do you want to cancel this approved release?", [
      { text: "Back", style: "cancel" },
      {
        text: "Abandon",
        style: "destructive",
        onPress: async () => {
          await Promise.all(releaseSubmissions.map((item) => cancelMusicSubmission(item.id)));
          router.replace("/main/create/track");
        },
      },
    ]);
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color="#fff" /><Text style={styles.muted}>Preparing release...</Text></View>;
  }

  if (!submission || releaseSubmissions.length === 0) {
    return <View style={styles.centered}><Text style={styles.question}>Release not found</Text><Pressable style={pressableFeedback(styles.linkButton)} onPress={() => router.back()}><Text style={styles.link}>Back</Text></Pressable></View>;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
      <View style={styles.topBar}>
        <Pressable style={pressableFeedback(styles.backButton)} onPress={goBack}><Ionicons name="chevron-back" size={27} color="#fff" /></Pressable>
        <Text style={styles.topTitle}>{releaseLabel(releaseType)}</Text>
        <Text style={styles.stepCount}>{currentStepNumber}/{totalSteps}</Text>
      </View>
      <View style={styles.progressRail}><View style={[styles.progressFill, { width: progress }]} /></View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {step === "release" ? (
          <View style={styles.stepBlock}>
            <View style={styles.heroIcon}><Ionicons name="albums-outline" size={36} color="#000" /></View>
            <Text style={styles.question}>What is this {releaseLabel(releaseType).toLowerCase()} called?</Text>
            <Text style={styles.explanation}>Sonnor automatically set this as {releaseLabel(releaseType)} based on {releaseSubmissions.length} verified tracks.</Text>
            <TextInput
              autoFocus
              placeholder="Release name"
              placeholderTextColor="#666"
              style={styles.input}
              value={releaseTitle}
              maxLength={FOLDER_TITLE_MAX_LENGTH}
              onChangeText={setReleaseTitle}
            />
            <Pressable style={pressableFeedback(styles.coverPicker)} onPress={handlePickCover}>
              {coverAsset ? <Image source={{ uri: coverAsset.uri }} style={styles.coverImage} /> : <><Ionicons name="image-outline" size={42} color="#888" /><Text style={styles.pickerText}>Choose folder cover</Text></>}
            </Pressable>
            {preReleaseEnabled ? (
              <View style={styles.preReleaseSummary}>
                <Ionicons name="notifications" size={22} color="#000" />
                <View style={styles.preReleaseSummaryText}>
                  <Text style={styles.preReleaseSummaryTitle}>Active pre-release</Text>
                  <Text style={styles.preReleaseSummaryMeta}>
                    Automatic publication in {preReleaseDelay} after you finish.
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {step === "track" && currentDraft ? (
          <View style={styles.stepBlock}>
            <Text style={styles.eyebrow}>Track {trackIndex + 1} of {trackDrafts.length}</Text>
            <Text style={styles.question}>Complete the track details.</Text>
            <TextInput
              placeholder="Track name"
              placeholderTextColor="#666"
              style={styles.input}
              value={currentDraft.title}
              maxLength={TRACK_TITLE_MAX_LENGTH}
              onChangeText={(title) => updateCurrentDraft({ title })}
            />
            <View style={styles.genreSearch}>
              <Ionicons name="search-outline" size={20} color="#888" />
              <TextInput
                placeholder="Search category"
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
                    style={pressableFeedback([styles.genreChip, selected ? styles.genreChipSelected : null])}
                    onPress={() => updateCurrentDraft({ genre })}
                  >
                    <Text style={[styles.genreChipText, selected ? styles.genreChipTextSelected : null]}>{genre}</Text>
                    {selected ? <Ionicons name="checkmark" size={16} color="#000" /> : null}
                  </Pressable>
                );
              })}
              {!genreQuery.trim() ? (
                <Pressable
                  style={pressableFeedback([styles.genreChip, styles.genreToggleChip])}
                  onPress={() => setShowAllGenres((current) => !current)}
                >
                  <Text style={styles.genreChipText}>
                    {showAllGenres ? "Hide" : "Show all"}
                  </Text>
                  <Ionicons
                    name={showAllGenres ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#fff"
                  />
                </Pressable>
              ) : null}
            </View>
            <View style={styles.switchRow}>
              <View style={styles.switchText}><View style={styles.explicitBadge}><Text style={styles.explicitText}>E</Text></View><Text style={styles.switchLabel}>Explicit content</Text></View>
              <Switch
                style={styles.explicitSwitch}
                value={currentDraft.explicit}
                onValueChange={(explicit) => updateCurrentDraft({ explicit })}
              />
            </View>
            <TextInput multiline placeholder="Track lyrics (optional)" placeholderTextColor="#666" style={[styles.input, styles.textArea]} value={currentDraft.lyrics} onChangeText={(lyrics) => updateCurrentDraft({ lyrics })} />
          </View>
        ) : null}

        {step === "collaborators" ? (
          <View style={styles.stepBlock}>
            <Text style={styles.question}>Features</Text>
            <Text style={styles.explanation}>Search for artists who participated in this release. If there are no features, you can continue without adding anyone.</Text>
            <View style={styles.artistSearchBlock}>
              <View style={styles.genreSearch}>
                <Ionicons name="search-outline" size={20} color="#888" />
                <TextInput
                  placeholder="Search artists"
                  placeholderTextColor="#666"
                  style={styles.genreSearchInput}
                  value={artistQuery}
                  onChangeText={setArtistQuery}
                />
              </View>
              {visibleArtistOptions.length > 0 ? (
                <View style={styles.artistResults}>
                  {visibleArtistOptions.map((artist) => (
                    <Pressable
                      key={artist.id}
                      style={pressableFeedback(styles.artistResultRow)}
                      onPress={() => addCollaborator(artist)}
                    >
                      {artist.avatarUrl ? (
                        <Image source={{ uri: artist.avatarUrl }} style={styles.artistResultAvatar} />
                      ) : (
                        <View style={styles.artistResultAvatarFallback}>
                          <Ionicons name="person-outline" size={18} color="#fff" />
                        </View>
                      )}
                      <View style={styles.artistResultTextBlock}>
                        <Text style={styles.artistResultName} numberOfLines={1}>
                          {artist.name}
                        </Text>
                        <Text style={styles.artistResultUsername} numberOfLines={1}>
                          {artist.username ? `@${artist.username}` : "Artist"}
                        </Text>
                      </View>
                      <Ionicons name="add-circle-outline" size={22} color="#fff" />
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {selectedCollaborators.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.collaboratorRow}>
                  {selectedCollaborators.map((artist) => (
                    <Pressable
                      key={artist.id}
                      style={pressableFeedback(styles.collaboratorBubble)}
                      onPress={() => removeCollaborator(artist.id)}
                    >
                      {artist.avatarUrl ? (
                        <Image source={{ uri: artist.avatarUrl }} style={styles.collaboratorAvatar} />
                      ) : (
                        <View style={styles.collaboratorAvatarFallback}>
                          <Ionicons name="person-outline" size={18} color="#fff" />
                        </View>
                      )}
                      <Text style={styles.collaboratorName} numberOfLines={1}>
                        {artist.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
            </View>
          </View>
        ) : null}

        {step === "media" ? (
          <View style={styles.stepBlock}>
            <Text style={styles.question}>Music videos</Text>
            <Text style={styles.explanation}>Each track needs a short music video. The MP3 does not change.</Text>
            <View style={styles.trackReviewList}>
              {trackDrafts.map((draft, index) => (
                <Pressable
                  key={draft.submissionId}
                  style={pressableFeedback(styles.videoPickRow)}
                  onPress={() => handlePickTrackVideo(index)}
                >
                  <View style={styles.trackNumberBox}>
                    <Text style={styles.trackNumber}>{index + 1}</Text>
                  </View>
                  <View style={styles.videoPickTextBlock}>
                    <Text style={styles.trackName} numberOfLines={1}>{draft.title}</Text>
                    <Text style={styles.videoPickMeta} numberOfLines={1}>
                      {draft.videoAsset?.name || (draft.videoAsset ? "Video selected" : "Add music video")}
                    </Text>
                  </View>
                  <Ionicons
                    name={draft.videoAsset ? "checkmark-circle" : "film-outline"}
                    size={23}
                    color={draft.videoAsset ? "#7CFF9B" : "#fff"}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {step === "review" ? (
          <View style={styles.stepBlock}>
            <Text style={styles.question}>Everything is ready to publish.</Text>
            <View style={styles.releasePreview}>
              {coverAsset ? <Image source={{ uri: coverAsset.uri }} style={styles.previewCover} /> : <View style={[styles.previewCover, styles.coverFallback]}><Ionicons name="musical-notes" size={32} color="#777" /></View>}
              <View style={styles.previewInfo}><Text style={styles.previewTitle} numberOfLines={2}>{releaseTitle}</Text><Text style={styles.previewMeta}>{releaseLabel(releaseType)} · {trackDrafts.length} tracks</Text></View>
            </View>
            <View style={styles.trackReviewList}>
              {trackDrafts.map((draft, index) => <View key={draft.submissionId} style={styles.trackReviewRow}><Text style={styles.trackNumber}>{index + 1}</Text><Text style={styles.trackName} numberOfLines={1}>{draft.title}</Text>{draft.explicit ? <View style={styles.smallExplicit}><Text style={styles.smallExplicitText}>E</Text></View> : null}</View>)}
            </View>
            <Pressable style={pressableFeedback([styles.cancelButton, saving && styles.disabled])} onPress={handleCancelPublish} disabled={saving}><Text style={styles.cancelText}>Abandon release</Text></Pressable>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {step === "review" ? (
          <Pressable style={pressableFeedback([styles.primaryButton, saving && styles.disabled])} onPress={handleFinishRelease} disabled={saving}>
            {saving ? <ActivityIndicator color="#000" /> : null}<Text style={styles.primaryText}>{saving ? progressLabel || "Publishing..." : "Publish release"}</Text>
          </Pressable>
        ) : (
          <Pressable style={pressableFeedback(styles.primaryButton)} onPress={goNext}><Text style={styles.primaryText}>Next</Text></Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 24,
    backgroundColor: "#000",
  },
  topBar: {
    minHeight: 96,
    paddingHorizontal: 22,
    paddingTop: 48,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
  },
  topTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 19,
    fontWeight: "900",
    textAlign: "center",
  },
  stepCount: {
    width: 44,
    color: "#888",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right",
  },
  progressRail: {
    height: 3,
    backgroundColor: "#171717",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#E6E6E6",
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 44,
    paddingBottom: 170,
  },
  stepBlock: {
    gap: 16,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E6E6E6",
    marginBottom: 8,
  },
  eyebrow: {
    color: "#E6E6E6",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  question: {
    color: "#fff",
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
  },
  explanation: {
    color: "#aaa",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
  },
  input: {
    minHeight: 62,
    borderRadius: 8,
    paddingHorizontal: 17,
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    backgroundColor: "#0b0b0b",
    borderWidth: 1.5,
    borderColor: "#d7d7d7",
  },
  textArea: {
    minHeight: 130,
    paddingTop: 16,
    textAlignVertical: "top",
  },
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
  genreSearchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  genreGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
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
  genreChipSelected: {
    backgroundColor: "#E6E6E6",
    borderColor: "#E6E6E6",
  },
  genreToggleChip: {
    borderColor: "rgba(255,255,255,0.28)",
  },
  genreChipText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  genreChipTextSelected: {
    color: "#000",
  },
  sectionLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  artistSearchBlock: {
    gap: 10,
  },
  artistResults: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#0f0f0f",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  artistResultRow: {
    minHeight: 62,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  artistResultAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#191919",
  },
  artistResultAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#191919",
  },
  artistResultTextBlock: {
    flex: 1,
  },
  artistResultName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  artistResultUsername: {
    color: "#888",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  collaboratorRow: {
    gap: 12,
    paddingVertical: 4,
  },
  collaboratorBubble: {
    width: 74,
    alignItems: "center",
    gap: 6,
  },
  collaboratorAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#191919",
    borderWidth: 2,
    borderColor: "#E6E6E6",
  },
  collaboratorAvatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#191919",
    borderWidth: 2,
    borderColor: "#E6E6E6",
  },
  collaboratorName: {
    width: "100%",
    color: "#ddd",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  switchRow: {
    minHeight: 62,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#111",
  },
  switchText: {
    flex: 1,
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  switchLabel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
  },
  preReleaseSummary: {
    minHeight: 70,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
  },
  preReleaseSummaryText: {
    flex: 1,
  },
  preReleaseSummaryTitle: {
    color: "#000",
    fontSize: 15,
    fontWeight: "900",
  },
  preReleaseSummaryMeta: {
    color: "#555",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  explicitBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  explicitSwitch: {
    alignSelf: "center",
    transform: [{ translateY: 1 }],
  },
  explicitText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 14,
    includeFontPadding: false,
  },
  coverPicker: {
    width: "100%",
    aspectRatio: 1,
    maxHeight: 390,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    overflow: "hidden",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  pickerText: {
    color: "#aaa",
    fontSize: 14,
    fontWeight: "900",
  },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 27,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  secondaryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  releasePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 14,
    borderRadius: 22,
    backgroundColor: "#101010",
  },
  previewCover: {
    width: 100,
    height: 100,
    borderRadius: 16,
  },
  coverFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#181818",
  },
  previewInfo: {
    flex: 1,
  },
  previewTitle: {
    color: "#fff",
    fontSize: 21,
    fontWeight: "900",
  },
  previewMeta: {
    color: "#999",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 7,
  },
  trackReviewList: {
    borderRadius: 20,
    paddingHorizontal: 14,
    backgroundColor: "#0c0c0c",
  },
  trackReviewRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  trackNumberBox: {
    width: 24,
    alignItems: "center",
  },
  trackNumber: {
    width: 20,
    color: "#777",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  trackName: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  videoPickMeta: {
    color: "#888",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  videoPickRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  videoPickTextBlock: {
    flex: 1,
  },
  smallExplicit: {
    width: 19,
    height: 19,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ddd",
  },
  smallExplicitText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "900",
  },
  cancelButton: {
    minHeight: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(210,62,62,0.12)",
  },
  cancelText: {
    color: "#ff8d8d",
    fontSize: 14,
    fontWeight: "900",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 122,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  primaryButton: {
    width: "65%",
    minWidth: 220,
    maxWidth: 340,
    minHeight: 58,
    borderRadius: 29,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "#E6E6E6",
  },
  primaryText: {
    color: "#000",
    fontSize: 17,
    fontWeight: "900",
  },
  disabled: {
    opacity: 0.55,
  },
  muted: {
    color: "#999",
    fontSize: 13,
    fontWeight: "700",
  },
  linkButton: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  link: {
    color: "#E6E6E6",
    fontSize: 15,
    fontWeight: "900",
  },
});
