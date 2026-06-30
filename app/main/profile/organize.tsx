import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { pressableFeedback } from "../../../components/pressFeedback";
import { useSuccessFeedback } from "../../../components/SuccessFeedback";
import { MUSIC_GENRES } from "../../../constants/musicGenres";
import { deleteOwnedAlbum } from "../../../firebase/albumDeletionClient";
import { getProfileContent, getSearchableUsers } from "../../../firebase/contentClient";
import {
  updateAlbumDetails,
  updateAlbumMedia,
  updateTrackDetails,
  updateTrackMedia,
} from "../../../firebase/contentMutations";
import type { AlbumDocument, TrackDocument } from "../../../firebase/schema";
import { uploadUriToStorage } from "../../../firebase/storageClient";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { pickLibraryAsset } from "../../../utils/mediaPicker";

type AlbumItem = AlbumDocument & { id: string };
type TrackItem = TrackDocument & { id: string };
const TRACK_TITLE_MAX_LENGTH = 43;
const FOLDER_TITLE_MAX_LENGTH = 40;
type ArtistOption = {
  avatarUrl: string;
  id: string;
  name: string;
  username: string;
};

export default function OrganizeProfileScreen() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { showSuccess } = useSuccessFeedback();
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState("");
  const [editingAlbum, setEditingAlbum] = useState<AlbumItem | null>(null);
  const [editingTrack, setEditingTrack] = useState<TrackItem | null>(null);
  const [albumTitle, setAlbumTitle] = useState("");
  const [trackTitle, setTrackTitle] = useState("");
  const [trackGenre, setTrackGenre] = useState("");
  const [trackLyrics, setTrackLyrics] = useState("");
  const [trackExplicit, setTrackExplicit] = useState(false);
  const [artistQuery, setArtistQuery] = useState("");
  const [selectedArtists, setSelectedArtists] = useState<ArtistOption[]>([]);

  const selectedAlbum = albums.find((album) => album.id === selectedAlbumId) ?? null;
  const albumTracks = useMemo(() => {
    if (!selectedAlbum) return [];
    const ids = Array.isArray(selectedAlbum.trackIds) ? selectedAlbum.trackIds : [];

    return tracks
      .filter((track) => track.albumId === selectedAlbum.id || ids.includes(track.id))
      .sort((left, right) => {
        const leftIndex = ids.indexOf(left.id);
        const rightIndex = ids.indexOf(right.id);
        return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) -
          (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
      });
  }, [selectedAlbum, tracks]);
  const albumCollaborators = useMemo(() => {
    const map = new Map<string, ArtistOption>();

    albumTracks.forEach((track) => {
      (track.featUserIds || []).forEach((artistId, index) => {
        if (!artistId || map.has(artistId)) return;
        const artist = artists.find((item) => item.id === artistId);
        map.set(
          artistId,
          artist ?? {
            avatarUrl: "",
            id: artistId,
            name: track.featNames?.[index] || "Artist",
            username: "",
          },
        );
      });
    });

    return Array.from(map.values()).slice(0, 6);
  }, [albumTracks, artists]);
  const visibleArtists = artists
    .filter((artist) => artist.id !== user?.uid)
    .filter((artist) => !selectedArtists.some((selected) => selected.id === artist.id))
    .filter((artist) => {
      const query = artistQuery.trim().toLowerCase();
      return query && `${artist.name} ${artist.username}`.toLowerCase().includes(query);
    })
    .slice(0, 8);

  async function loadContent() {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [content, searchableUsers] = await Promise.all([
        getProfileContent(user.uid),
        getSearchableUsers(),
      ]);
      setAlbums(content.albums as AlbumItem[]);
      setTracks(content.tracks as TrackItem[]);
      setArtists(
        searchableUsers.map((artist) => ({
          avatarUrl: artist.avatarUrl || artist.bannerUrl || "",
          id: artist.uid || artist.id,
          name: artist.displayName || artist.username || "Artist",
          username: artist.username || "",
        })),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadContent();
  }, [user?.uid]);

  function openAlbumEditor(album: AlbumItem) {
    setEditingAlbum(album);
    setAlbumTitle(album.title || "");
  }

  function openTrackEditor(track: TrackItem) {
    setEditingTrack(track);
    setTrackTitle(track.title || "");
    setTrackGenre(track.genre || "");
    setTrackLyrics(track.lyrics || "");
    setTrackExplicit(track.explicit === true);
    setArtistQuery("");
    setSelectedArtists(
      (track.featUserIds || []).map((id, index) => {
        const artist = artists.find((item) => item.id === id);
        return (
          artist ?? {
            avatarUrl: "",
            id,
            name: track.featNames?.[index] || "Artist",
            username: "",
          }
        );
      }),
    );
  }

  async function handleChangeAlbumCover(album: AlbumItem) {
    const asset = await pickLibraryAsset({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: "images",
      quality: 0.92,
    });

    if (!asset?.uri) return;

    setSaving(true);
    try {
      const upload = await uploadUriToStorage({ kind: "albumCover", albumId: album.id }, asset.uri);
      await updateAlbumMedia(album.id, { coverUrl: upload.downloadUrl });
      await Promise.all(albumTracks.map((track) => updateTrackMedia(track.id, { coverUrl: upload.downloadUrl })));
      setAlbums((current) =>
        current.map((item) => item.id === album.id ? { ...item, coverUrl: upload.downloadUrl } : item),
      );
      setTracks((current) =>
        current.map((track) =>
          track.albumId === album.id ? { ...track, coverUrl: upload.downloadUrl } : track,
        ),
      );
      showSuccess();
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAlbum() {
    if (!editingAlbum || !albumTitle.trim()) return;
    setSaving(true);
    try {
      await updateAlbumDetails(editingAlbum.id, { title: albumTitle.trim() });
      setAlbums((current) =>
        current.map((album) => album.id === editingAlbum.id ? { ...album, title: albumTitle.trim() } : album),
      );
      setEditingAlbum(null);
      showSuccess();
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteAlbum(album: AlbumItem) {
    Alert.alert(
      "Deletar folder?",
      "This deletes the folder, all tracks, linked posts, likes, saves, and files stored in it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deletar",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              await deleteOwnedAlbum(album.id);
              setAlbums((current) => current.filter((item) => item.id !== album.id));
              setTracks((current) =>
                current.filter(
                  (track) =>
                    track.albumId !== album.id &&
                    !(album.trackIds || []).includes(track.id),
                ),
              );
              setSelectedAlbumId("");
              setEditingAlbum(null);
              showSuccess({});
            } catch (error) {
              console.log("DELETE ORGANIZE ALBUM ERROR:", error);
              Alert.alert("Error", "Could not deletar a folder right now.");
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  }

  async function handlePickTrackVideo() {
    if (!editingTrack) return;
    const asset = await pickLibraryAsset({
      allowsEditing: false,
      mediaTypes: "videos",
      quality: 0.85,
    });

    if (!asset?.uri) return;

    setSaving(true);
    try {
      const upload = await uploadUriToStorage(
        { kind: "trackShortVideo", trackId: editingTrack.id },
        asset.uri,
      );
      await updateTrackMedia(editingTrack.id, { shortVideoUrl: upload.downloadUrl });
      setEditingTrack({ ...editingTrack, shortVideoUrl: upload.downloadUrl });
      setTracks((current) =>
        current.map((track) =>
          track.id === editingTrack.id ? { ...track, shortVideoUrl: upload.downloadUrl } : track,
        ),
      );
      showSuccess();
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveTrack() {
    if (!editingTrack || !trackTitle.trim()) return;
    setSaving(true);
    try {
      await updateTrackDetails(editingTrack.id, {
        explicit: trackExplicit,
        featNames: selectedArtists.map((artist) => artist.name),
        featUserIds: selectedArtists.map((artist) => artist.id),
        genre: trackGenre,
        lyrics: trackLyrics.trim(),
        title: trackTitle.trim(),
      });
      setTracks((current) =>
        current.map((track) =>
          track.id === editingTrack.id
            ? {
                ...track,
                explicit: trackExplicit,
                featNames: selectedArtists.map((artist) => artist.name),
                featUserIds: selectedArtists.map((artist) => artist.id),
                genre: trackGenre,
                lyrics: trackLyrics.trim(),
                title: trackTitle.trim(),
              }
            : track,
        ),
      );
      setEditingTrack(null);
      showSuccess();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable style={pressableFeedback(styles.backButton)} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={25} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Organizar</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!selectedAlbum ? (
          <>
            <Text style={styles.sectionTitle}>Folders</Text>
            <View style={styles.albumList}>
              {albums.map((album) => (
                <Pressable
                  key={album.id}
                  style={pressableFeedback(styles.albumListRow)}
                  onPress={() => setSelectedAlbumId(album.id)}
                >
                  {album.coverUrl ? (
                    <Image source={{ uri: album.coverUrl }} style={styles.albumListCover} />
                  ) : (
                    <View style={[styles.albumListCover, styles.coverFallback]}>
                      <Ionicons name="albums-outline" size={28} color="#777" />
                    </View>
                  )}
                  <View style={styles.albumListText}>
                    <Text style={styles.albumTitle} numberOfLines={1}>{album.title}</Text>
                    <Text style={styles.albumMeta}>{album.type || "folder"} · {album.trackIds?.length || 0} tracks</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#777" />
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <Pressable style={pressableFeedback(styles.openAlbumHeader)} onPress={() => openAlbumEditor(selectedAlbum)}>
              {selectedAlbum.coverUrl ? (
                <Image source={{ uri: selectedAlbum.coverUrl }} style={styles.openAlbumCover} />
              ) : (
                <View style={[styles.openAlbumCover, styles.coverFallback]} />
              )}
              <View style={styles.openAlbumText}>
                <Text style={styles.openAlbumTitle} numberOfLines={1}>{selectedAlbum.title}</Text>
                {albumCollaborators.length > 0 ? (
                  <View style={styles.albumCollaborators}>
                    {albumCollaborators.map((artist) => (
                      artist.avatarUrl ? (
                        <Image
                          key={artist.id}
                          source={{ uri: artist.avatarUrl }}
                          style={styles.albumCollaboratorAvatar}
                        />
                      ) : (
                        <View key={artist.id} style={[styles.albumCollaboratorAvatar, styles.coverFallback]}>
                          <Ionicons name="person-outline" size={13} color="#888" />
                        </View>
                      )
                    ))}
                  </View>
                ) : null}
              </View>
              <Ionicons name="create-outline" size={20} color="#fff" />
            </Pressable>
            <Pressable
              style={pressableFeedback(styles.coverAction)}
              onPress={() => void handleChangeAlbumCover(selectedAlbum)}
              disabled={saving}
            >
              <Ionicons name="image-outline" size={18} color="#000" />
              <Text style={styles.coverActionText}>Trocar capa da folder</Text>
            </Pressable>
            <Pressable
              style={pressableFeedback(styles.deleteFolderButton)}
              onPress={() => confirmDeleteAlbum(selectedAlbum)}
              disabled={saving}
            >
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={styles.deleteFolderText}>Deletar folder</Text>
            </Pressable>

            <Text style={styles.sectionTitle}>Tracks</Text>
            {albumTracks.map((track, index) => (
              <Pressable
                key={track.id}
                style={pressableFeedback(styles.trackRow)}
                onPress={() => openTrackEditor(track)}
              >
                <Text style={styles.trackNumber}>{index + 1}</Text>
                {selectedAlbum.coverUrl || track.coverUrl ? (
                  <Image source={{ uri: selectedAlbum.coverUrl || track.coverUrl }} style={styles.trackCover} />
                ) : (
                  <View style={[styles.trackCover, styles.coverFallback]} />
                )}
                <View style={styles.trackText}>
                  <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
                  <Text style={styles.albumMeta} numberOfLines={1}>
                    {track.genre || "No category"} · {track.shortVideoUrl ? "With music video" : "No music video"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#777" />
              </Pressable>
            ))}
            <Pressable style={pressableFeedback(styles.backToAlbums)} onPress={() => setSelectedAlbumId("")}>
              <Text style={styles.backToAlbumsText}>See other folders</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <Modal animationType="fade" transparent visible={Boolean(editingAlbum)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.editorCard}>
            <Text style={styles.editorTitle}>Edit folder</Text>
            <TextInput
              placeholder="Folder name"
              placeholderTextColor="#777"
              style={styles.input}
              value={albumTitle}
              maxLength={FOLDER_TITLE_MAX_LENGTH}
              onChangeText={setAlbumTitle}
            />
            <View style={styles.editorActions}>
              <Pressable style={pressableFeedback(styles.darkButton)} onPress={() => setEditingAlbum(null)}>
                <Text style={styles.darkButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={pressableFeedback(styles.lightButton)} onPress={handleSaveAlbum} disabled={saving}>
                <Text style={styles.lightButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={Boolean(editingTrack)}>
        <View style={styles.modalBackdrop}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.trackEditorCard}>
            <Text style={styles.editorTitle}>Edit track</Text>
            <TextInput
              placeholder="Track name"
              placeholderTextColor="#777"
              style={styles.input}
              value={trackTitle}
              maxLength={TRACK_TITLE_MAX_LENGTH}
              onChangeText={setTrackTitle}
            />
            <Text style={styles.smallLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreRow}>
              {MUSIC_GENRES.map((genre) => (
                <Pressable
                  key={genre}
                  style={pressableFeedback([styles.genreChip, trackGenre === genre ? styles.genreChipSelected : null])}
                  onPress={() => setTrackGenre(genre)}
                >
                  <Text style={[styles.genreText, trackGenre === genre ? styles.genreTextSelected : null]}>{genre}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <View style={styles.explicitBadge}>
                  <Text style={styles.explicitText}>E</Text>
                </View>
                <Text style={styles.switchLabel}>Explicit content</Text>
              </View>
              <Switch value={trackExplicit} onValueChange={setTrackExplicit} />
            </View>
            <Pressable style={pressableFeedback(styles.videoButton)} onPress={handlePickTrackVideo} disabled={saving}>
              <Ionicons name="film-outline" size={18} color="#fff" />
              <Text style={styles.videoButtonText}>
                {editingTrack?.shortVideoUrl ? "Change music video" : "Add music video"}
              </Text>
            </Pressable>
            <TextInput
              multiline
              placeholder="Track lyrics"
              placeholderTextColor="#777"
              style={[styles.input, styles.textArea]}
              value={trackLyrics}
              onChangeText={setTrackLyrics}
            />
            <Text style={styles.smallLabel}>Features</Text>
            <TextInput
              placeholder="Search artists"
              placeholderTextColor="#777"
              style={styles.input}
              value={artistQuery}
              onChangeText={setArtistQuery}
            />
            {visibleArtists.map((artist) => (
              <Pressable
                key={artist.id}
                style={pressableFeedback(styles.artistRow)}
                onPress={() => {
                  setSelectedArtists((current) => [...current, artist]);
                  setArtistQuery("");
                }}
              >
                {artist.avatarUrl ? (
                  <Image source={{ uri: artist.avatarUrl }} style={styles.artistAvatar} />
                ) : (
                  <View style={[styles.artistAvatar, styles.coverFallback]} />
                )}
                <Text style={styles.artistName}>{artist.name}</Text>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
              </Pressable>
            ))}
            {selectedArtists.length > 0 ? (
              <View style={styles.selectedArtists}>
                {selectedArtists.map((artist) => (
                  <Pressable
                    key={artist.id}
                    style={pressableFeedback(styles.selectedArtist)}
                    onPress={() =>
                      setSelectedArtists((current) => current.filter((item) => item.id !== artist.id))
                    }
                  >
                    <Text style={styles.selectedArtistText}>{artist.name}</Text>
                    <Ionicons name="close" size={14} color="#000" />
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Text style={styles.lockedNote}>The audio cannot be changed after publication</Text>
            <View style={styles.editorActions}>
              <Pressable style={pressableFeedback(styles.darkButton)} onPress={() => setEditingTrack(null)}>
                <Text style={styles.darkButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={pressableFeedback(styles.lightButton)} onPress={handleSaveTrack} disabled={saving}>
                <Text style={styles.lightButtonText}>Save</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  header: {
    minHeight: 96,
    paddingHorizontal: 20,
    paddingTop: 48,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 170,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 14,
    marginTop: 18,
  },
  albumList: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#0b0b0b",
  },
  albumListCover: {
    width: 58,
    height: 58,
    borderRadius: 15,
    backgroundColor: "#111",
  },
  albumListRow: {
    minHeight: 82,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  albumListText: {
    flex: 1,
  },
  albumTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  albumMeta: {
    color: "#888",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
    textTransform: "capitalize",
  },
  coverFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#151515",
  },
  openAlbumHeader: {
    minHeight: 96,
    borderRadius: 24,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: "#101010",
  },
  openAlbumCover: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: "#171717",
  },
  openAlbumText: {
    flex: 1,
  },
  openAlbumTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  albumCollaboratorAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "#111",
    marginLeft: -5,
  },
  albumCollaborators: {
    flexDirection: "row",
    marginLeft: 5,
    marginTop: 8,
  },
  coverAction: {
    minHeight: 48,
    borderRadius: 24,
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E6E6E6",
  },
  coverActionText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "900",
  },
  deleteFolderButton: {
    minHeight: 48,
    borderRadius: 24,
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,116,116,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,116,116,0.26)",
  },
  deleteFolderText: {
    color: "#ff7474",
    fontSize: 14,
    fontWeight: "900",
  },
  trackRow: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  trackNumber: {
    width: 22,
    color: "#777",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  trackCover: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#151515",
  },
  trackText: {
    flex: 1,
  },
  trackTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  backToAlbums: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  backToAlbumsText: {
    color: "#ddd",
    fontSize: 14,
    fontWeight: "900",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.78)",
    padding: 18,
  },
  editorCard: {
    borderRadius: 26,
    padding: 18,
    backgroundColor: "#0c0c0c",
    gap: 14,
  },
  trackEditorCard: {
    borderRadius: 26,
    marginTop: 34,
    padding: 18,
    backgroundColor: "#0c0c0c",
    gap: 14,
  },
  editorTitle: {
    color: "#fff",
    fontSize: 23,
    fontWeight: "900",
  },
  input: {
    minHeight: 54,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: "#fff",
    backgroundColor: "#151515",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    fontWeight: "800",
  },
  textArea: {
    minHeight: 110,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  editorActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  darkButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#181818",
  },
  darkButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  lightButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E6E6E6",
  },
  lightButtonText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "900",
  },
  smallLabel: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  genreRow: {
    gap: 9,
  },
  genreChip: {
    minHeight: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  genreChipSelected: {
    backgroundColor: "#E6E6E6",
  },
  genreText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  genreTextSelected: {
    color: "#000",
  },
  explicitBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  explicitText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 14,
    includeFontPadding: false,
  },
  switchRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  switchText: {
    flex: 1,
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  switchLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
  },
  videoButton: {
    minHeight: 50,
    borderRadius: 18,
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
  },
  videoButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  artistRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  artistAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  artistName: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  selectedArtists: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedArtist: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E6E6E6",
  },
  selectedArtistText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "900",
  },
  lockedNote: {
    color: "#777",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
});
