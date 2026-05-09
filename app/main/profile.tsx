import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { buildReleaseRoute, findMusicMatch } from "../../constants/musicLibrary";
import { pickLibraryImage } from "../../utils/mediaPicker";
import { useResponsive } from "../../utils/responsive";

type EditPanelType = "albums" | "posts" | null;

type AlbumItem = {
  id: number;
  name: string;
  year: number;
  type: "Album" | "Single";
  cover: string;
  background: string | null;
  releaseDate: string;
  releaseTime: string;
  lastEditedAt: string | null;
  removedAt: string | null;
  removalReason: string | null;
};

type PostItem = {
  id: number;
  title: string;
  caption: string;
  image: string;
  date: string;
  time: string;
  lastEditedAt: string | null;
  removedAt: string | null;
  removalReason: string | null;
};

type PreviewItem = {
  title: string;
  subtitle: string;
  image: string;
  description?: string;
};

const DEFAULT_BANNER_URI =
  "https://i.pinimg.com/1200x/b9/e8/db/b9e8db33168a26c9ca697a05ddc80937.jpg";

const INITIAL_ALBUMS: AlbumItem[] = [
  {
    id: 1,
    name: "Neon Dreams",
    year: 2026,
    type: "Album",
    cover:
      "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
    background:
      "https://i.pinimg.com/1200x/f4/2f/59/f42f595b9b6b0b9cc8269e4a84364707.jpg",
    releaseDate: "16/04/2026",
    releaseTime: "22:30",
    lastEditedAt: null,
    removedAt: null,
    removalReason: null,
  },
  {
    id: 2,
    name: "Midnight Avenue",
    year: 2025,
    type: "Album",
    cover:
      "https://i.pinimg.com/1200x/6b/87/62/6b8762d66ffc9220294524e16485b4e0.jpg",
    background:
      "https://i.pinimg.com/1200x/8d/dc/29/8ddc29e3bbdadf33fc22ca5ffa23d59d.jpg",
    releaseDate: "08/11/2025",
    releaseTime: "00:15",
    lastEditedAt: "2025-05-10T12:00:00.000Z",
    removedAt: null,
    removalReason: null,
  },
  {
    id: 3,
    name: "Blue Motel",
    year: 2024,
    type: "Single",
    cover:
      "https://i.pinimg.com/1200x/8f/2a/0b/8f2a0b7b1f8a4d7f1b3c2d9e0f1a2b3c.jpg",
    background:
      "https://i.pinimg.com/1200x/1a/6c/3d/1a6c3d7b8c9d0e1f2a3b4c5d6e7f8a9b.jpg",
    releaseDate: "03/06/2024",
    releaseTime: "18:45",
    lastEditedAt: null,
    removedAt: null,
    removalReason: null,
  },
  {
    id: 4,
    name: "After Hours Tape",
    year: 2023,
    type: "Album",
    cover:
      "https://i.pinimg.com/1200x/2f/6b/4c/2f6b4c0e5b92c4f1b85c9b7d1f3c1a0e.jpg",
    background:
      "https://i.pinimg.com/1200x/4e/5f/6a/4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b.jpg",
    releaseDate: "27/10/2023",
    releaseTime: "20:00",
    lastEditedAt: null,
    removedAt: null,
    removalReason: null,
  },
  {
    id: 5,
    name: "Velvet Echo",
    year: 2022,
    type: "Single",
    cover:
      "https://i.pinimg.com/1200x/7c/1f/2d/7c1f2d8b8b4f5d91f0c7c0a9a2b6d7e1.jpg",
    background:
      "https://i.pinimg.com/1200x/7a/5d/2d/7a5d2db7c7a21c7e0f7b41a2d9f0a1b2.jpg",
    releaseDate: "05/01/2022",
    releaseTime: "12:10",
    lastEditedAt: null,
    removedAt: null,
    removalReason: null,
  },
];

const INITIAL_POSTS: PostItem[] = [
  {
    id: 1,
    title: "Drop teaser",
    caption: "Preview visual do novo drop com identidade mais escura.",
    image:
      "https://i.pinimg.com/1200x/f4/2f/59/f42f595b9b6b0b9cc8269e4a84364707.jpg",
    date: "20/04/2026",
    time: "19:20",
    lastEditedAt: null,
    removedAt: null,
    removalReason: null,
  },
  {
    id: 2,
    title: "Studio night",
    caption: "Sessão no estúdio para fechar a narrativa desta era.",
    image:
      "https://i.pinimg.com/1200x/6b/87/62/6b8762d66ffc9220294524e16485b4e0.jpg",
    date: "11/04/2026",
    time: "23:50",
    lastEditedAt: null,
    removedAt: null,
    removalReason: null,
  },
  {
    id: 3,
    title: "Backstage",
    caption: "Momento rápido dos bastidores antes do ensaio geral.",
    image:
      "https://i.pinimg.com/1200x/8d/dc/29/8ddc29e3bbdadf33fc22ca5ffa23d59d.jpg",
    date: "28/03/2026",
    time: "15:05",
    lastEditedAt: null,
    removedAt: null,
    removalReason: null,
  },
  {
    id: 4,
    title: "Merch draft",
    caption: "Primeira proposta visual para o merch do próximo lançamento.",
    image:
      "https://i.pinimg.com/736x/8d/dc/29/8ddc29e3bbdadf33fc22ca5ffa23d59d.jpg",
    date: "17/03/2026",
    time: "12:30",
    lastEditedAt: null,
    removedAt: null,
    removalReason: null,
  },
];

const GALLERY_ITEMS: PreviewItem[] = [
  {
    title: "Portrait",
    subtitle: "Editorial visual",
    image:
      "https://i.pinimg.com/736x/8d/dc/29/8ddc29e3bbdadf33fc22ca5ffa23d59d.jpg",
  },
  {
    title: "Moodboard",
    subtitle: "Era atual",
    image:
      "https://i.pinimg.com/736x/6b/87/62/6b8762d66ffc9220294524e16485b4e0.jpg",
  },
  {
    title: "Backstage",
    subtitle: "Set do vídeo",
    image:
      "https://i.pinimg.com/1200x/f4/2f/59/f42f595b9b6b0b9cc8269e4a84364707.jpg",
  },
  {
    title: "Campaign",
    subtitle: "Coleção em destaque",
    image:
      "https://i.pinimg.com/1200x/8f/2a/0b/8f2a0b7b1f8a4d7f1b3c2d9e0f1a2b3c.jpg",
  },
];

const FASHION_ITEMS: PreviewItem[] = [
  {
    title: "Night jersey",
    subtitle: "Novo drop",
    image:
      "https://kitqueen.co.uk/cdn/shop/files/Navy_96e51aa8-74f2-41ad-af5a-37c60af73c54.png?v=1683196276&width=1500",
  },
  {
    title: "Chrome set",
    subtitle: "Mais popular",
    image:
      "https://kitqueen.co.uk/cdn/shop/files/Navy_96e51aa8-74f2-41ad-af5a-37c60af73c54.png?v=1683196276&width=1500",
  },
  {
    title: "Tour tee",
    subtitle: "Preview",
    image:
      "https://kitqueen.co.uk/cdn/shop/files/Navy_96e51aa8-74f2-41ad-af5a-37c60af73c54.png?v=1683196276&width=1500",
  },
  {
    title: "Runway fit",
    subtitle: "Seleção",
    image:
      "https://kitqueen.co.uk/cdn/shop/files/Navy_96e51aa8-74f2-41ad-af5a-37c60af73c54.png?v=1683196276&width=1500",
  },
];

function VideoMediaPreview({ src }: { src: string }) {
  const player = useVideoPlayer(src, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.play();
  });

  return (
    <VideoView
      player={player}
      style={styles.boxImage}
      nativeControls={false}
      fullscreenOptions={{ enable: false }}
    />
  );
}

function MediaPreview({ src }: { src: string }) {
  if (src.endsWith(".mp4")) {
    return <VideoMediaPreview src={src} />;
  }

  return <Image source={{ uri: src }} style={styles.boxImage} />;
}

function canEditAgain(lastEditedAt: string | null) {
  if (!lastEditedAt) {
    return true;
  }

  const previousEdit = new Date(lastEditedAt);
  const nextEdit = new Date(previousEdit);

  nextEdit.setFullYear(nextEdit.getFullYear() + 1);

  return new Date() >= nextEdit;
}

function getNextEditDate(lastEditedAt: string | null) {
  if (!lastEditedAt) {
    return null;
  }

  const nextEdit = new Date(lastEditedAt);

  nextEdit.setFullYear(nextEdit.getFullYear() + 1);

  return nextEdit.toLocaleDateString("pt-PT");
}

export default function ProfileScreen() {
  const router = useRouter();
  const { wp, hp, font } = useResponsive();
  const scrollY = useRef(new Animated.Value(0)).current;

  const [editMenuVisible, setEditMenuVisible] = useState(false);
  const [activePanel, setActivePanel] = useState<EditPanelType>(null);
  const [bannerUri, setBannerUri] = useState(DEFAULT_BANNER_URI);
  const [profileBackgroundUri, setProfileBackgroundUri] = useState<
    string | null
  >(null);
  const [albums, setAlbums] = useState(INITIAL_ALBUMS);
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(
    INITIAL_ALBUMS[0]?.id ?? null,
  );
  const [selectedPostId, setSelectedPostId] = useState<number | null>(
    INITIAL_POSTS[0]?.id ?? null,
  );
  const [albumDraftName, setAlbumDraftName] = useState(INITIAL_ALBUMS[0].name);
  const [albumDraftCover, setAlbumDraftCover] = useState(INITIAL_ALBUMS[0].cover);
  const [albumDraftBackground, setAlbumDraftBackground] = useState<
    string | null
  >(INITIAL_ALBUMS[0].background);
  const [albumRemovalReason, setAlbumRemovalReason] = useState("");
  const [postDraftTitle, setPostDraftTitle] = useState(INITIAL_POSTS[0].title);
  const [postDraftCaption, setPostDraftCaption] = useState(
    INITIAL_POSTS[0].caption,
  );
  const [postDraftImage, setPostDraftImage] = useState(INITIAL_POSTS[0].image);
  const [postRemovalReason, setPostRemovalReason] = useState("");
  const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);

  const activeAlbums = useMemo(
    () => albums.filter((album) => !album.removedAt),
    [albums],
  );
  const removedAlbums = useMemo(
    () => albums.filter((album) => album.removedAt),
    [albums],
  );
  const activePosts = useMemo(
    () => posts.filter((post) => !post.removedAt),
    [posts],
  );
  const removedPosts = useMemo(
    () => posts.filter((post) => post.removedAt),
    [posts],
  );

  const selectedAlbum =
    albums.find((album) => album.id === selectedAlbumId) ?? null;
  const selectedPost = posts.find((post) => post.id === selectedPostId) ?? null;
  const selectedAlbumLocked =
    selectedAlbum !== null && !canEditAgain(selectedAlbum.lastEditedAt);

  const lastDrop = activeAlbums[0] ?? INITIAL_ALBUMS[0];
  const timelineItems = activeAlbums.slice(0, 4);
  const topItems = activeAlbums.slice(0, 5);
  const albumItems = activeAlbums.filter((album) => album.type === "Album");
  const singleItems = activeAlbums.filter((album) => album.type === "Single");

  const BANNER_HEIGHT = hp(43);
  const BANNER_MIN_HEIGHT = hp(15);
  const COLLAPSE_DISTANCE = BANNER_HEIGHT - BANNER_MIN_HEIGHT;
  const MAX_STRETCH = hp(25);

  const bannerHeight = scrollY.interpolate({
    inputRange: [-MAX_STRETCH, 0, COLLAPSE_DISTANCE],
    outputRange: [
      BANNER_HEIGHT + MAX_STRETCH,
      BANNER_HEIGHT,
      BANNER_MIN_HEIGHT,
    ],
    extrapolate: "clamp",
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-MAX_STRETCH, 0, COLLAPSE_DISTANCE],
    outputRange: [1.35, 1.12, 1.22],
    extrapolate: "clamp",
  });

  const imageTranslateY = scrollY.interpolate({
    inputRange: [-MAX_STRETCH, 0, COLLAPSE_DISTANCE],
    outputRange: [-22, -12, -8],
    extrapolate: "clamp",
  });

  const bannerContentOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_DISTANCE * 0.6, COLLAPSE_DISTANCE],
    outputRange: [1, 0.35, 0],
    extrapolate: "clamp",
  });

  const compactContentOpacity = scrollY.interpolate({
    inputRange: [COLLAPSE_DISTANCE * 0.55, COLLAPSE_DISTANCE],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const compactContentTranslateY = scrollY.interpolate({
    inputRange: [COLLAPSE_DISTANCE * 0.55, COLLAPSE_DISTANCE],
    outputRange: [8, 0],
    extrapolate: "clamp",
  });

  function resetAlbumDraft(album: AlbumItem) {
    setSelectedAlbumId(album.id);
    setAlbumDraftName(album.name);
    setAlbumDraftCover(album.cover);
    setAlbumDraftBackground(album.background);
    setAlbumRemovalReason("");
  }

  function resetPostDraft(post: PostItem) {
    setSelectedPostId(post.id);
    setPostDraftTitle(post.title);
    setPostDraftCaption(post.caption);
    setPostDraftImage(post.image);
    setPostRemovalReason("");
  }

  function closeEditMenu() {
    setEditMenuVisible(false);
  }

  function closePanel() {
    setActivePanel(null);
  }

  async function handlePickBanner() {
    closeEditMenu();

    const uri = await pickLibraryImage();

    if (!uri) {
      return;
    }

    setBannerUri(uri);
    Alert.alert("Banner atualizado", "A foto do banner foi trocada.");
  }

  async function handlePickProfileBackground() {
    closeEditMenu();

    const uri = await pickLibraryImage();

    if (!uri) {
      return;
    }

    setProfileBackgroundUri(uri);
    Alert.alert("Fundo atualizado", "A foto de fundo do perfil foi aplicada.");
  }

  function handleRemoveProfileBackground() {
    closeEditMenu();
    setProfileBackgroundUri(null);
    Alert.alert("Fundo removido", "O perfil voltou ao fundo escuro.");
  }

  function openAlbumPanel() {
    closeEditMenu();

    if (activeAlbums[0]) {
      resetAlbumDraft(activeAlbums[0]);
    }

    setActivePanel("albums");
  }

  function openPostPanel() {
    closeEditMenu();

    if (activePosts[0]) {
      resetPostDraft(activePosts[0]);
    }

    setActivePanel("posts");
  }

  async function handlePickAlbumCover() {
    if (selectedAlbumLocked) {
      Alert.alert(
        "Edição bloqueada",
        `Este álbum só pode ser alterado outra vez em ${getNextEditDate(
          selectedAlbum?.lastEditedAt ?? null,
        )}.`,
      );
      return;
    }

    const uri = await pickLibraryImage();

    if (uri) {
      setAlbumDraftCover(uri);
    }
  }

  async function handlePickAlbumBackground() {
    if (selectedAlbumLocked) {
      Alert.alert(
        "Edição bloqueada",
        `Este álbum só pode ser alterado outra vez em ${getNextEditDate(
          selectedAlbum?.lastEditedAt ?? null,
        )}.`,
      );
      return;
    }

    const uri = await pickLibraryImage();

    if (uri) {
      setAlbumDraftBackground(uri);
    }
  }

  function handleRemoveAlbumBackground() {
    if (selectedAlbumLocked) {
      Alert.alert(
        "Edição bloqueada",
        `Este álbum só pode ser alterado outra vez em ${getNextEditDate(
          selectedAlbum?.lastEditedAt ?? null,
        )}.`,
      );
      return;
    }

    setAlbumDraftBackground(null);
  }

  function handleSaveAlbum() {
    if (!selectedAlbum) {
      return;
    }

    if (selectedAlbumLocked) {
      Alert.alert(
        "Edição bloqueada",
        `Este álbum só pode ser alterado outra vez em ${getNextEditDate(
          selectedAlbum.lastEditedAt,
        )}.`,
      );
      return;
    }

    const cleanName = albumDraftName.trim();

    if (!cleanName) {
      Alert.alert("Nome em falta", "Define um nome antes de guardar.");
      return;
    }

    const changed =
      cleanName !== selectedAlbum.name ||
      albumDraftCover !== selectedAlbum.cover ||
      albumDraftBackground !== selectedAlbum.background;

    if (!changed) {
      Alert.alert("Sem alterações", "Não houve mudanças para guardar.");
      return;
    }

    setAlbums((current) =>
      current.map((album) =>
        album.id === selectedAlbum.id
          ? {
              ...album,
              name: cleanName,
              cover: albumDraftCover,
              background: albumDraftBackground,
              lastEditedAt: new Date().toISOString(),
            }
          : album,
      ),
    );

    Alert.alert(
      "Álbum atualizado",
      "As alterações foram guardadas. A próxima edição ficará disponível daqui a 1 ano.",
    );
  }

  function handleRemoveAlbum() {
    if (!selectedAlbum) {
      return;
    }

    const cleanReason = albumRemovalReason.trim();

    if (!cleanReason) {
      Alert.alert(
        "Motivo obrigatório",
        "Explica porque estás a remover este álbum antes de continuar.",
      );
      return;
    }

    setAlbums((current) =>
      current.map((album) =>
        album.id === selectedAlbum.id
          ? {
              ...album,
              removedAt: new Date().toISOString(),
              removalReason: cleanReason,
            }
          : album,
      ),
    );

    const nextAlbum =
      activeAlbums.find((album) => album.id !== selectedAlbum.id) ?? null;

    if (nextAlbum) {
      resetAlbumDraft(nextAlbum);
    } else {
      setSelectedAlbumId(null);
      setAlbumDraftName("");
      setAlbumDraftCover("");
      setAlbumDraftBackground(null);
      setAlbumRemovalReason("");
    }

    Alert.alert("Álbum removido", `"${selectedAlbum.name}" foi removido.`);
  }

  async function handlePickPostImage() {
    const uri = await pickLibraryImage();

    if (uri) {
      setPostDraftImage(uri);
    }
  }

  function handleSavePost() {
    if (!selectedPost) {
      return;
    }

    const cleanTitle = postDraftTitle.trim();
    const cleanCaption = postDraftCaption.trim();

    if (!cleanTitle || !cleanCaption) {
      Alert.alert(
        "Campos em falta",
        "O post precisa de título e legenda antes de guardar.",
      );
      return;
    }

    setPosts((current) =>
      current.map((post) =>
        post.id === selectedPost.id
          ? {
              ...post,
              title: cleanTitle,
              caption: cleanCaption,
              image: postDraftImage,
              lastEditedAt: new Date().toISOString(),
            }
          : post,
      ),
    );

    Alert.alert("Post atualizado", "As alterações do post foram guardadas.");
  }

  function handleRemovePost() {
    if (!selectedPost) {
      return;
    }

    const cleanReason = postRemovalReason.trim();

    if (!cleanReason) {
      Alert.alert(
        "Motivo obrigatório",
        "Explica porque estás a remover este post.",
      );
      return;
    }

    setPosts((current) =>
      current.map((post) =>
        post.id === selectedPost.id
          ? {
              ...post,
              removedAt: new Date().toISOString(),
              removalReason: cleanReason,
            }
          : post,
      ),
    );

    const nextPost = activePosts.find((post) => post.id !== selectedPost.id) ?? null;

    if (nextPost) {
      resetPostDraft(nextPost);
    } else {
      setSelectedPostId(null);
      setPostDraftTitle("");
      setPostDraftCaption("");
      setPostDraftImage("");
      setPostRemovalReason("");
    }

    Alert.alert("Post removido", `"${selectedPost.title}" foi removido.`);
  }

  function openPreview(item: PreviewItem) {
    const match = findMusicMatch(item.title);

    if (match) {
      router.push(
        buildReleaseRoute(match, {
          heroImage: item.image,
        }),
      );
      return;
    }

    setPreviewItem(item);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function openReleaseFromAlbum(item: AlbumItem) {
    const fallback: PreviewItem = {
      title: item.name,
      subtitle: `${item.type} • ${item.year}`,
      image: item.background ?? item.cover,
      description: `Lancado em ${item.releaseDate} as ${item.releaseTime}.`,
    };
    const match = findMusicMatch(item.name);

    if (!match) {
      openPreview(fallback);
      return;
    }

    router.push(
      buildReleaseRoute(match, {
        title: item.name,
        cover: item.cover,
        heroImage: item.background ?? item.cover,
        type: item.type,
        year: item.year,
        releaseDate: item.releaseDate,
      }),
    );
  }

  const panelTitle = activePanel === "albums" ? "Editar álbuns" : "Editar posts";

  return (
    <View style={styles.root}>
      {profileBackgroundUri && (
        <>
          <Image
            source={{ uri: profileBackgroundUri }}
            style={styles.profileBackgroundImage}
          />
          <View style={styles.profileBackgroundOverlay} />
        </>
      )}

      <Modal transparent visible={editMenuVisible} animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={closeEditMenu}>
          <Pressable
            style={styles.editMenuCard}
            onPress={(event) => event.stopPropagation()}
          >
            <TouchableOpacity
              style={styles.editMenuOption}
              onPress={handlePickBanner}
            >
              <Text style={styles.editMenuText}>Mudar foto do banner</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editMenuOption}
              onPress={handlePickProfileBackground}
            >
              <Text style={styles.editMenuText}>Escolher foto de fundo</Text>
            </TouchableOpacity>

            {profileBackgroundUri && (
              <TouchableOpacity
                style={styles.editMenuOption}
                onPress={handleRemoveProfileBackground}
              >
                <Text style={styles.editMenuText}>Remover foto de fundo</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.editMenuOption}
              onPress={openAlbumPanel}
            >
              <Text style={styles.editMenuText}>Editar álbuns</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editMenuOption}
              onPress={openPostPanel}
            >
              <Text style={styles.editMenuText}>Editar posts</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={activePanel !== null} animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={closePanel}>
          <Pressable
            style={styles.managerCard}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.managerHeader}>
              <Text style={styles.managerTitle}>{panelTitle}</Text>

              <TouchableOpacity onPress={closePanel}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.managerScroll}
              contentContainerStyle={styles.managerScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {activePanel === "albums" && (
                <>
                  <Text style={styles.managerSectionTitle}>Lista de álbuns</Text>

                  {activeAlbums.length === 0 ? (
                    <Text style={styles.emptyListText}>
                      Não tens álbuns ativos neste momento.
                    </Text>
                  ) : (
                    activeAlbums.map((album) => {
                      const locked = !canEditAgain(album.lastEditedAt);

                      return (
                        <TouchableOpacity
                          key={album.id}
                          style={[
                            styles.managerRow,
                            selectedAlbumId === album.id && styles.managerRowActive,
                          ]}
                          onPress={() => resetAlbumDraft(album)}
                        >
                          <Image
                            source={{ uri: album.cover }}
                            style={styles.managerThumb}
                          />

                          <View style={styles.managerRowText}>
                            <Text style={styles.managerRowTitle}>{album.name}</Text>
                            <Text style={styles.managerRowMeta}>
                              {album.releaseDate} • {album.releaseTime} • {album.type}
                            </Text>
                            {locked && (
                              <Text style={styles.managerRowHint}>
                                Próxima edição: {getNextEditDate(album.lastEditedAt)}
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}

                  {selectedAlbum && !selectedAlbum.removedAt && (
                    <View style={styles.editorCard}>
                      <Text style={styles.editorTitle}>Álbum selecionado</Text>

                      <View style={styles.editorPreviewRow}>
                        <Image
                          source={{ uri: albumDraftCover }}
                          style={styles.editorCoverPreview}
                        />

                        <View style={styles.editorBackgroundBlock}>
                          {albumDraftBackground ? (
                            <Image
                              source={{ uri: albumDraftBackground }}
                              style={styles.editorBackgroundPreview}
                            />
                          ) : (
                            <View style={styles.editorBackgroundPlaceholder}>
                              <Text style={styles.editorBackgroundPlaceholderText}>
                                Sem fundo do álbum
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <TextInput
                        value={albumDraftName}
                        onChangeText={setAlbumDraftName}
                        placeholder="Nome do álbum"
                        placeholderTextColor="#666"
                        style={[
                          styles.editorInput,
                          selectedAlbumLocked && styles.editorInputDisabled,
                        ]}
                        editable={!selectedAlbumLocked}
                      />

                      {selectedAlbumLocked ? (
                        <Text style={styles.lockedText}>
                          Este álbum já foi editado este ano. Nova edição disponível em{" "}
                          {getNextEditDate(selectedAlbum.lastEditedAt)}.
                        </Text>
                      ) : (
                        <>
                          <View style={styles.editorActionRow}>
                            <TouchableOpacity
                              style={styles.secondaryButton}
                              onPress={handlePickAlbumCover}
                            >
                              <Text style={styles.secondaryButtonText}>
                                Editar capa
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.secondaryButton}
                              onPress={handlePickAlbumBackground}
                            >
                              <Text style={styles.secondaryButtonText}>
                                Editar fundo
                              </Text>
                            </TouchableOpacity>
                          </View>

                          <TouchableOpacity
                            style={styles.subtleButton}
                            onPress={handleRemoveAlbumBackground}
                          >
                            <Text style={styles.subtleButtonText}>
                              Remover fundo do álbum
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={handleSaveAlbum}
                          >
                            <Text style={styles.primaryButtonText}>
                              Guardar edição anual
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}

                      <TextInput
                        value={albumRemovalReason}
                        onChangeText={setAlbumRemovalReason}
                        placeholder="Motivo para remover este álbum"
                        placeholderTextColor="#666"
                        style={[styles.editorInput, styles.multilineInput]}
                        multiline
                      />

                      <TouchableOpacity
                        style={styles.dangerButton}
                        onPress={handleRemoveAlbum}
                      >
                        <Text style={styles.dangerButtonText}>Remover álbum</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {removedAlbums.length > 0 && (
                    <>
                      <Text style={styles.managerSectionTitle}>
                        Álbuns removidos
                      </Text>

                      {removedAlbums.map((album) => (
                        <View key={album.id} style={styles.managerRowRemoved}>
                          <Image
                            source={{ uri: album.cover }}
                            style={styles.managerThumb}
                          />

                          <View style={styles.managerRowText}>
                            <Text style={styles.managerRowTitle}>{album.name}</Text>
                            <Text style={styles.managerRowMeta}>
                              Removido em{" "}
                              {album.removedAt
                                ? new Date(album.removedAt).toLocaleDateString("pt-PT")
                                : "--"}
                            </Text>
                            <Text style={styles.managerRowHint}>
                              Motivo: {album.removalReason}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </>
                  )}
                </>
              )}

              {activePanel === "posts" && (
                <>
                  <Text style={styles.managerSectionTitle}>Lista de posts</Text>

                  {activePosts.length === 0 ? (
                    <Text style={styles.emptyListText}>
                      Não tens posts ativos neste momento.
                    </Text>
                  ) : (
                    activePosts.map((post) => (
                      <TouchableOpacity
                        key={post.id}
                        style={[
                          styles.managerRow,
                          selectedPostId === post.id && styles.managerRowActive,
                        ]}
                        onPress={() => resetPostDraft(post)}
                      >
                        <Image source={{ uri: post.image }} style={styles.managerThumb} />

                        <View style={styles.managerRowText}>
                          <Text style={styles.managerRowTitle}>{post.title}</Text>
                          <Text style={styles.managerRowMeta}>
                            {post.date} • {post.time}
                          </Text>
                          <Text style={styles.managerRowHint} numberOfLines={2}>
                            {post.caption}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}

                  {selectedPost && !selectedPost.removedAt && (
                    <View style={styles.editorCard}>
                      <Text style={styles.editorTitle}>Post selecionado</Text>

                      <Image
                        source={{ uri: postDraftImage }}
                        style={styles.postEditorPreview}
                      />

                      <TextInput
                        value={postDraftTitle}
                        onChangeText={setPostDraftTitle}
                        placeholder="Título do post"
                        placeholderTextColor="#666"
                        style={styles.editorInput}
                      />

                      <TextInput
                        value={postDraftCaption}
                        onChangeText={setPostDraftCaption}
                        placeholder="Legenda do post"
                        placeholderTextColor="#666"
                        style={[styles.editorInput, styles.multilineInput]}
                        multiline
                      />

                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={handlePickPostImage}
                      >
                        <Text style={styles.secondaryButtonText}>
                          Trocar imagem do post
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={handleSavePost}
                      >
                        <Text style={styles.primaryButtonText}>Guardar post</Text>
                      </TouchableOpacity>

                      <TextInput
                        value={postRemovalReason}
                        onChangeText={setPostRemovalReason}
                        placeholder="Motivo para remover este post"
                        placeholderTextColor="#666"
                        style={[styles.editorInput, styles.multilineInput]}
                        multiline
                      />

                      <TouchableOpacity
                        style={styles.dangerButton}
                        onPress={handleRemovePost}
                      >
                        <Text style={styles.dangerButtonText}>Remover post</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {removedPosts.length > 0 && (
                    <>
                      <Text style={styles.managerSectionTitle}>Posts removidos</Text>

                      {removedPosts.map((post) => (
                        <View key={post.id} style={styles.managerRowRemoved}>
                          <Image source={{ uri: post.image }} style={styles.managerThumb} />

                          <View style={styles.managerRowText}>
                            <Text style={styles.managerRowTitle}>{post.title}</Text>
                            <Text style={styles.managerRowMeta}>
                              Removido em{" "}
                              {post.removedAt
                                ? new Date(post.removedAt).toLocaleDateString("pt-PT")
                                : "--"}
                            </Text>
                            <Text style={styles.managerRowHint}>
                              Motivo: {post.removalReason}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={previewItem !== null} animationType="fade">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setPreviewItem(null)}
        >
          <Pressable
            style={styles.previewCard}
            onPress={(event) => event.stopPropagation()}
          >
            {previewItem && (
              <>
                <Image
                  source={{ uri: previewItem.image }}
                  style={styles.previewImage}
                />
                <Text style={styles.previewTitle}>{previewItem.title}</Text>
                <Text style={styles.previewSubtitle}>{previewItem.subtitle}</Text>
                {!!previewItem.description && (
                  <Text style={styles.previewDescription}>
                    {previewItem.description}
                  </Text>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Animated.View
        style={[
          styles.bannerFixed,
          {
            height: bannerHeight,
          },
        ]}
      >
        <View style={styles.bannerBackground} />
        <Animated.Image
          source={{ uri: bannerUri }}
          style={[
            styles.bannerArtist,
            {
              transform: [{ translateY: imageTranslateY }, { scale: imageScale }],
            },
          ]}
        />
        <Image
          source={require("../../icons/banner.png")}
          style={[styles.bannerArtist, styles.bannerOverlay]}
        />
        <View style={styles.bannerDarkOverlay} />

        <Animated.View
          style={[
            styles.bannerContent,
            { zIndex: 7, opacity: bannerContentOpacity },
          ]}
        >
          <View style={styles.bannerLeft}>
            <Text style={[styles.artistName, { fontSize: font(32) }]}>
              Artist name
            </Text>
            <View style={styles.artistRow}>
              <Text style={[styles.artistStudio, { fontSize: font(14) }]}>
                Studio Name
              </Text>
              <View style={styles.verifyBadge}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.followButton}
            onPress={() => setEditMenuVisible(true)}
          >
            <Text style={[styles.followText, { fontSize: font(15) }]}>
              Editar
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={[
            styles.compactContent,
            {
              opacity: compactContentOpacity,
              transform: [{ translateY: compactContentTranslateY }],
            },
          ]}
        >
          <View style={styles.bannerLeft}>
            <Text style={[styles.artistName, { fontSize: font(26) }]}>
              Artist name
            </Text>
            <View style={styles.artistRow}>
              <Text style={[styles.artistStudio, { fontSize: font(12) }]}>
                Studio name
              </Text>
              <View style={styles.verifyBadge}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.followButton}
            onPress={() => setEditMenuVisible(true)}
          >
            <Text style={[styles.followText, { fontSize: font(13) }]}>
              Editar
            </Text>
          </TouchableOpacity>
        </Animated.View>
        <View style={styles.bannerBottomFade} />
      </Animated.View>

      <Animated.ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
      >
        <Animated.View style={{ height: bannerHeight }} />

        <View style={styles.content}>
          <View style={[styles.statsRow, { paddingHorizontal: wp(5) }]}>
            <View style={styles.statBlock}>
              <Text style={[styles.statTitle, { fontSize: font(14) }]}>
                Followers
              </Text>
              <Text style={[styles.statNumber, { fontSize: font(16) }]}>0</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={[styles.statTitle, { fontSize: font(14) }]}>
                Álbuns
              </Text>
              <Text style={[styles.statNumber, { fontSize: font(16) }]}>
                {activeAlbums.length}
              </Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={[styles.statTitle, { fontSize: font(14) }]}>
                Posts
              </Text>
              <Text style={[styles.statNumber, { fontSize: font(16) }]}>
                {activePosts.length}
              </Text>
            </View>
          </View>

          <View style={[styles.sectionHeader, { paddingHorizontal: wp(5) }]}>
            <Text style={[styles.sectionTitle, { fontSize: font(20) }]}>
              Last drop
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.lastDropRow, { paddingHorizontal: wp(5) }]}
            onPress={() =>
              openPreview({
                title: lastDrop.name,
                subtitle: `${lastDrop.type} • ${lastDrop.year}`,
                image: lastDrop.cover,
                description: `Lançado em ${lastDrop.releaseDate} às ${lastDrop.releaseTime}.`,
              })
            }
          >
            <View style={[styles.lastDropCover, { width: wp(23), height: wp(23) }]}>
              <Image source={{ uri: lastDrop.cover }} style={styles.boxImage} />
            </View>
            <View style={styles.lastDropInfo}>
              <Text style={[styles.lastDropTitle, { fontSize: font(22) }]}>
                {lastDrop.name}
              </Text>
              <Text style={[styles.lastDropSubtitle, { fontSize: font(14) }]}>
                {lastDrop.type} • {lastDrop.year}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.sectionHeader, { paddingHorizontal: wp(5) }]}>
            <Text style={[styles.sectionTitle, { fontSize: font(20) }]}>
              Top 5
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.top5Scroll, { paddingHorizontal: wp(5) }]}
          >
            {topItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.topCard, { width: wp(30) }]}
                onPress={() =>
                  openPreview({
                    title: item.name,
                    subtitle: `${item.type} • ${item.year}`,
                    image: item.cover,
                    description: `Saída em ${item.releaseDate} às ${item.releaseTime}.`,
                  })
                }
              >
                <View style={[styles.topCardCover, { height: wp(30) }]}>
                  <MediaPreview src={item.cover} />
                </View>
                <Text style={[styles.topCardTitle, { fontSize: font(14) }]}>
                  {item.name}
                </Text>
                <Text style={[styles.topCardSubtitle, { fontSize: font(12) }]}>
                  {item.type} • {item.year}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[styles.sectionHeader, { paddingHorizontal: wp(5) }]}>
            <Text style={[styles.sectionTitle, { fontSize: font(20) }]}>
              Cronograma
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.timelineScroll, { paddingHorizontal: wp(5) }]}
          >
            {timelineItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.timelineBlock, { width: wp(45) }]}
                onPress={() =>
                  openPreview({
                    title: item.name,
                    subtitle: `${item.releaseDate} • ${item.releaseTime}`,
                    image: item.background ?? item.cover,
                    description: `Projeto ${item.type.toLowerCase()} do ano ${item.year}.`,
                  })
                }
              >
                <View style={[styles.timelineCover, { height: wp(45) }]}>
                  <MediaPreview src={item.background ?? item.cover} />
                </View>
                <Text style={[styles.timelineTitle, { fontSize: font(14) }]}>
                  {item.name}
                </Text>
                <Text style={[styles.timelineSubtitle, { fontSize: font(12) }]}>
                  {item.year}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[styles.sectionHeader, { paddingHorizontal: wp(5) }]}>
            <Text style={[styles.sectionTitle, { fontSize: font(20) }]}>
              Álbuns
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.albumScroll, { paddingHorizontal: wp(5) }]}
          >
            {albumItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.albumCardMusic, { width: wp(35) }]}
                onPress={() =>
                  openPreview({
                    title: item.name,
                    subtitle: `${item.type} • ${item.year}`,
                    image: item.cover,
                    description: `Última edição: ${
                      item.lastEditedAt
                        ? new Date(item.lastEditedAt).toLocaleDateString("pt-PT")
                        : "nunca"
                    }.`,
                  })
                }
              >
                <View style={[styles.albumCoverLarge, { height: wp(35) }]}>
                  <MediaPreview src={item.cover} />
                </View>
                <Text style={[styles.albumCardTitle, { fontSize: font(14) }]}>
                  {item.name}
                </Text>
                <View style={styles.explicitRow}>
                  <View style={styles.explicitBadge}>
                    <Text style={[styles.explicitText, { fontSize: font(12) }]}>
                      A
                    </Text>
                  </View>
                  <Text style={[styles.explicitYear, { fontSize: font(14) }]}>
                    {item.year}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[styles.sectionHeader, { paddingHorizontal: wp(5) }]}>
            <Text style={[styles.sectionTitle, { fontSize: font(20) }]}>
              Singles
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.albumScroll, { paddingHorizontal: wp(5) }]}
          >
            {singleItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.albumCardMusic, { width: wp(35) }]}
                onPress={() =>
                  openPreview({
                    title: item.name,
                    subtitle: `${item.type} • ${item.year}`,
                    image: item.cover,
                    description: `Saiu em ${item.releaseDate} às ${item.releaseTime}.`,
                  })
                }
              >
                <View style={[styles.albumCoverLarge, { height: wp(35) }]}>
                  <MediaPreview src={item.cover} />
                </View>
                <Text style={[styles.albumCardTitle, { fontSize: font(14) }]}>
                  {item.name}
                </Text>
                <View style={styles.explicitRow}>
                  <View style={styles.explicitBadge}>
                    <Text style={[styles.explicitText, { fontSize: font(12) }]}>
                      S
                    </Text>
                  </View>
                  <Text style={[styles.explicitYear, { fontSize: font(14) }]}>
                    {item.year}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[styles.bioSection, { paddingHorizontal: wp(5) }]}>
            <Text style={[styles.bioTitle, { fontSize: font(22) }]}>
              Artist name
            </Text>
            <Text style={[styles.bioText, { fontSize: font(14) }]}>
              Perfil artístico com lançamentos, imagens, produtos e posts ligados a
              uma identidade visual mais cinematográfica.
            </Text>
            <Text style={[styles.bioDetail, { fontSize: font(15) }]}>
              Full name: Artist name full.
            </Text>
            <Text style={[styles.bioDetail, { fontSize: font(15) }]}>
              Birth date: DD/MM/YYYY.
            </Text>
            <Text style={[styles.bioDetail, { fontSize: font(15) }]}>
              Styles artist: pop, funk, R&B.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.logoWrapper}
            onPress={() =>
              openPreview({
                title: "Brand logo",
                subtitle: "Identidade visual",
                image:
                  "https://www.iconsdb.com/icons/preview/white/nike-xxl.png",
              })
            }
          >
            <View style={styles.brandLogo}>
              <Image
                source={{
                  uri: "https://www.iconsdb.com/icons/preview/white/nike-xxl.png",
                }}
                style={styles.boxImage}
              />
            </View>
          </TouchableOpacity>

          <View style={[styles.sectionHeader, { paddingHorizontal: wp(5) }]}>
            <Text style={[styles.sectionTitle, { fontSize: font(20) }]}>
              New Drops
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.fashionScroll, { paddingHorizontal: wp(5) }]}
          >
            {FASHION_ITEMS.map((item, index) => (
              <TouchableOpacity
                key={`${item.title}-${index}`}
                style={[styles.fashionCard, { width: wp(40) }]}
                onPress={() => openPreview(item)}
              >
                <View style={[styles.fashionImage, { height: hp(28) }]}>
                  <MediaPreview src={item.image} />
                </View>
                <Text style={[styles.fashionTitle, { fontSize: font(14) }]}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[styles.sectionHeader, { paddingHorizontal: wp(5) }]}>
            <Text style={[styles.sectionTitle, { fontSize: font(20) }]}>
              Most Popular
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.fashionScroll, { paddingHorizontal: wp(5) }]}
          >
            {FASHION_ITEMS.slice().reverse().map((item, index) => (
              <TouchableOpacity
                key={`${item.subtitle}-${index}`}
                style={[styles.fashionCard, { width: wp(40) }]}
                onPress={() => openPreview(item)}
              >
                <View style={[styles.fashionImage, { height: hp(28) }]}>
                  <MediaPreview src={item.image} />
                </View>
                <Text style={[styles.fashionTitle, { fontSize: font(14) }]}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[styles.sectionHeader, { paddingHorizontal: wp(5) }]}>
            <Text style={[styles.sectionTitle, { fontSize: font(20) }]}>
              Gallery
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.fashionScroll, { paddingHorizontal: wp(5) }]}
          >
            {GALLERY_ITEMS.map((item, index) => (
              <TouchableOpacity
                key={`${item.title}-${index}`}
                style={[styles.fashionCard, { width: wp(40) }]}
                onPress={() => openPreview(item)}
              >
                <View style={[styles.fashionImage, { height: hp(28) }]}>
                  <MediaPreview src={item.image} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[styles.sectionHeader, { paddingHorizontal: wp(5) }]}>
            <Text style={[styles.sectionTitle, { fontSize: font(20) }]}>
              Posts
            </Text>
          </View>
          <View style={[styles.postsGrid, { paddingHorizontal: wp(5) }]}>
            {activePosts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={[
                  styles.postBlock,
                  { width: (wp(100) - wp(10) - 10) / 3, height: hp(25) },
                ]}
                onPress={() =>
                  openPreview({
                    title: post.title,
                    subtitle: `${post.date} • ${post.time}`,
                    image: post.image,
                    description: post.caption,
                  })
                }
              >
                <MediaPreview src={post.image} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  profileBackgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.28,
  },
  profileBackgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  editMenuCard: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
    borderRadius: 22,
    paddingVertical: 10,
    backgroundColor: "rgba(12,12,12,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  editMenuOption: {
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  editMenuText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  managerCard: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "84%",
    alignSelf: "center",
    borderRadius: 24,
    backgroundColor: "rgba(10,10,10,0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  managerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  managerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  managerScroll: {
    flex: 1,
  },
  managerScrollContent: {
    padding: 18,
    paddingBottom: 30,
  },
  managerSectionTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 8,
  },
  managerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 10,
    marginBottom: 10,
  },
  managerRowActive: {
    borderColor: "rgba(255,255,255,0.32)",
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  managerRowRemoved: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "rgba(255,255,255,0.02)",
    padding: 10,
    marginBottom: 10,
    opacity: 0.9,
  },
  managerThumb: {
    width: 54,
    height: 54,
    borderRadius: 14,
  },
  managerRowText: {
    flex: 1,
  },
  managerRowTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  managerRowMeta: {
    color: "#9c9c9c",
    fontSize: 12,
    marginTop: 2,
  },
  managerRowHint: {
    color: "#cfcfcf",
    fontSize: 12,
    marginTop: 4,
  },
  editorCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  editorTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  editorPreviewRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  editorCoverPreview: {
    width: 92,
    height: 92,
    borderRadius: 18,
  },
  editorBackgroundBlock: {
    flex: 1,
  },
  editorBackgroundPreview: {
    width: "100%",
    height: 92,
    borderRadius: 18,
  },
  editorBackgroundPlaceholder: {
    flex: 1,
    height: 92,
    borderRadius: 18,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  editorBackgroundPlaceholderText: {
    color: "#888",
    fontSize: 12,
  },
  editorInput: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    color: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  editorInputDisabled: {
    opacity: 0.6,
  },
  multilineInput: {
    minHeight: 92,
    textAlignVertical: "top",
  },
  lockedText: {
    color: "#d6c79d",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  editorActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  secondaryButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  subtleButton: {
    minHeight: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    marginBottom: 10,
  },
  subtleButtonText: {
    color: "#d1d1d1",
    fontSize: 13,
    fontWeight: "600",
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "700",
  },
  dangerButton: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(210,62,62,0.14)",
    borderWidth: 1,
    borderColor: "rgba(210,62,62,0.35)",
  },
  dangerButtonText: {
    color: "#ff8d8d",
    fontSize: 14,
    fontWeight: "700",
  },
  emptyListText: {
    color: "#8b8b8b",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 10,
  },
  previewCard: {
    width: "100%",
    maxWidth: 380,
    alignSelf: "center",
    borderRadius: 24,
    padding: 16,
    backgroundColor: "rgba(10,10,10,0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  previewImage: {
    width: "100%",
    height: 260,
    borderRadius: 18,
    marginBottom: 14,
  },
  previewTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  previewSubtitle: {
    color: "#a4a4a4",
    fontSize: 13,
    marginTop: 4,
  },
  previewDescription: {
    color: "#d2d2d2",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  container: { flex: 1 },
  bannerFixed: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    zIndex: 10,
    backgroundColor: "#000",
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
  },
  bannerArtist: { width: "100%", height: "100%", resizeMode: "cover" },
  bannerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  bannerDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.22)",
    zIndex: 3,
  },
  bannerContent: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  compactContent: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 8,
  },
  bannerLeft: { flexShrink: 1 },
  artistName: { color: "#fff", fontWeight: "800" },
  artistRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  artistStudio: { color: "#fff", opacity: 0.95 },
  verifyBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  followButton: {
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 26,
  },
  followText: { color: "#fff", fontWeight: "700" },
  bannerBackground: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  bannerBottomFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 4,
  },
  content: { paddingTop: 20 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: 20,
  },
  statBlock: { alignItems: "center" },
  statTitle: { color: "#fff", fontWeight: "600" },
  statNumber: { color: "#fff" },
  sectionHeader: { paddingTop: 20, paddingBottom: 10 },
  sectionTitle: { color: "#fff", fontWeight: "700" },
  lastDropRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  lastDropCover: { borderRadius: 22, overflow: "hidden", marginRight: 20 },
  lastDropInfo: { flexShrink: 1 },
  lastDropTitle: { color: "#fff", fontWeight: "800" },
  lastDropSubtitle: { color: "#777" },
  top5Scroll: {},
  topCard: { marginRight: 16 },
  topCardCover: {
    width: "100%",
    borderRadius: 22,
    overflow: "hidden",
  },
  topCardTitle: { color: "#fff", marginTop: 6, fontWeight: "700" },
  topCardSubtitle: { color: "#777" },
  timelineScroll: { paddingVertical: 20 },
  timelineBlock: { marginRight: 20 },
  timelineCover: {
    width: "100%",
    borderRadius: 22,
    overflow: "hidden",
  },
  timelineTitle: { color: "#fff", marginTop: 6, fontWeight: "700" },
  timelineSubtitle: { color: "#777" },
  albumScroll: {
    paddingVertical: 20,
    flexDirection: "row",
  },
  albumCardMusic: { marginRight: 20 },
  albumCoverLarge: {
    width: "100%",
    borderRadius: 22,
    overflow: "hidden",
  },
  albumCardTitle: { color: "#fff", marginTop: 6, fontWeight: "700" },
  explicitRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  explicitBadge: {
    backgroundColor: "#333",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  explicitText: { color: "#fff", fontWeight: "800" },
  explicitYear: { color: "#777" },
  bioSection: { paddingVertical: 20 },
  bioTitle: { color: "#fff", fontWeight: "800" },
  bioText: { color: "#ddd", marginTop: 10, lineHeight: 22 },
  bioDetail: { color: "#fff", marginTop: 12 },
  logoWrapper: { alignItems: "center", marginVertical: 120 },
  brandLogo: { width: 120, height: 120, borderRadius: 20, overflow: "hidden" },
  fashionScroll: {
    paddingVertical: 20,
    flexDirection: "row",
  },
  fashionCard: { marginRight: 20 },
  fashionImage: {
    width: "100%",
    borderRadius: 22,
    overflow: "hidden",
  },
  fashionTitle: { color: "#fff", marginTop: 6, fontWeight: "700" },
  postsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  postBlock: {
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 10,
  },
  postEditorPreview: {
    width: "100%",
    height: 180,
    borderRadius: 18,
    marginBottom: 12,
  },
  boxImage: { width: "100%", height: "100%", resizeMode: "cover" },
});
