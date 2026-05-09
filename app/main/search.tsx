import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { buildReleaseRoute, findMusicMatch } from "../../constants/musicLibrary";
import { useResponsive } from "../../utils/responsive";

type ResultItem = {
  id: number;
  type: "music" | "artist" | "brand";
  title: string;
  subtitle: string;
  cover: string;
};

type CategoryItem = {
  id: number;
  title: string;
  cover: string;
  isAll?: boolean;
};

type PostItem = {
  id: number;
  artist: string;
  caption: string;
  image: string;
  meta: string;
  category: string;
};

type RecentItem = {
  id: number;
  type: "music" | "artist" | "album" | "brand";
  title: string;
  subtitle: string;
  cover: string;
};

type DetailState = {
  title: string;
  subtitle: string;
  image: string;
  description: string;
};

const CATEGORIES: CategoryItem[] = [
  {
    id: 1,
    title: "Ver todas",
    cover:
      "https://i.pinimg.com/1200x/cc/38/81/cc388177da166ae18bb6331dfb5e82c9.jpg",
    isAll: true,
  },
  {
    id: 2,
    title: "Biblioteca",
    cover:
      "https://i.pinimg.com/1200x/5a/aa/ac/5aaaac17729873418a443d2c6ee863b9.jpg",
    isAll: true,
  },
  {
    id: 3,
    title: "Pop",
    cover:
      "https://i.pinimg.com/1200x/f0/43/71/f0437197c77f99c60e24d8678bdff25f.jpg",
  },
  {
    id: 4,
    title: "R&B",
    cover:
      "https://i.pinimg.com/736x/03/0b/22/030b22a2ac80006faa317b7004820438.jpg",
  },
  {
    id: 5,
    title: "Rock",
    cover:
      "https://i.pinimg.com/1200x/81/20/e2/8120e2e4e020d18ed73b071ab890227f.jpg",
  },
  {
    id: 6,
    title: "Eletrónica",
    cover:
      "https://i.pinimg.com/736x/ca/64/bd/ca64bdb72ab654191343abe508571849.jpg",
  },
  {
    id: 7,
    title: "Jazz",
    cover:
      "https://i.pinimg.com/1200x/86/a4/76/86a476dca6155cfc3c9118bc12a3d6d8.jpg",
  },
  {
    id: 8,
    title: "Lo-fi",
    cover:
      "https://i.pinimg.com/736x/4c/4d/9a/4c4d9ab60e9c5c00fd9a9aaa8bae462a.jpg",
  },
  {
    id: 9,
    title: "Clássica",
    cover:
      "https://i.pinimg.com/1200x/44/00/58/440058f16084fb94ab01f243d11f7c9b.jpg",
  },
];

const POSTS: PostItem[] = [
  {
    id: 1,
    artist: "Artist Name",
    caption: "Novo drop esta semana. Fica atento.",
    meta: "Há 2h • Lisboa",
    image:
      "https://i.pinimg.com/736x/6b/87/62/6b8762d66ffc9220294524e16485b4e0.jpg",
    category: "Pop",
  },
  {
    id: 2,
    artist: "Artist Name",
    caption: "Studio session a abrir caminho para o próximo EP.",
    meta: "Há 5h • Porto",
    image:
      "https://i.pinimg.com/1200x/f4/2f/59/f42f595b9b6b0b9cc8269e4a84364707.jpg",
    category: "R&B",
  },
  {
    id: 3,
    artist: "Artist Name",
    caption: "Moodboard do próximo visual. Minimal e pesado.",
    meta: "Ontem • Braga",
    image:
      "https://i.pinimg.com/1200x/8d/dc/29/8ddc29e3bbdadf33fc22ca5ffa23d59d.jpg",
    category: "Rock",
  },
  {
    id: 4,
    artist: "Artist Name",
    caption: "Teaser curto. Som limpo, vibe crua.",
    meta: "Há 2 dias",
    image:
      "https://i.pinimg.com/1200x/8f/2a/0b/8f2a0b7b1f8a4d7f1b3c2d9e0f1a2b3c.jpg",
    category: "Eletrónica",
  },
  {
    id: 5,
    artist: "Artist Name",
    caption: "Look do dia + snippet do beat.",
    meta: "Há 3 dias",
    image:
      "https://i.pinimg.com/1200x/2c/7a/1d/2c7a1d3e4f5a6b7c8d9e0f1a2b3c4d5e.jpg",
    category: "Jazz",
  },
  {
    id: 6,
    artist: "Artist Name",
    caption: "Capas em teste. Qual escolhiam?",
    meta: "Há 4 dias",
    image:
      "https://i.pinimg.com/1200x/1a/6c/3d/1a6c3d7b8c9d0e1f2a3b4c5d6e7f8a9b.jpg",
    category: "Lo-fi",
  },
  {
    id: 7,
    artist: "Artist Name",
    caption: "Ensaios visuais para o próximo lançamento.",
    meta: "Há 1 semana",
    image:
      "https://i.pinimg.com/1200x/6b/4c/2f/6b4c2f0e5b92c4f1b85c9b7d1f3c1a0e.jpg",
    category: "Pop",
  },
  {
    id: 8,
    artist: "Artist Name",
    caption: "Prévia do merch. Linhas simples, marca forte.",
    meta: "Há 1 semana",
    image:
      "https://i.pinimg.com/1200x/7a/5d/2d/7a5d2db7c7a21c7e0f7b41a2d9f0a1b2.jpg",
    category: "R&B",
  },
  {
    id: 9,
    artist: "Artist Name",
    caption: "Backstage do set. Energia máxima.",
    meta: "Há 2 semanas",
    image:
      "https://i.pinimg.com/1200x/4e/5f/6a/4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b.jpg",
    category: "Rock",
  },
];

const INITIAL_RECENTS: RecentItem[] = [
  {
    id: 1,
    type: "artist",
    title: "Artist Name",
    subtitle: "Artista • 12,4k seguidores",
    cover:
      "https://i.pinimg.com/1200x/b9/e8/db/b9e8db33168a26c9ca697a05ddc80937.jpg",
  },
  {
    id: 2,
    type: "music",
    title: "Late Hours",
    subtitle: "Música • Artist Name",
    cover:
      "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
  },
  {
    id: 3,
    type: "album",
    title: "Neon Dreams",
    subtitle: "Álbum • Artist Name",
    cover:
      "https://i.pinimg.com/1200x/6b/87/62/6b8762d66ffc9220294524e16485b4e0.jpg",
  },
  {
    id: 4,
    type: "music",
    title: "Electric Sleep",
    subtitle: "Música • Artist Name (Feat. Someone)",
    cover:
      "https://i.pinimg.com/1200x/8f/2a/0b/8f2a0b7b1f8a4d7f1b3c2d9e0f1a2b3c.jpg",
  },
  {
    id: 5,
    type: "brand",
    title: "SONNOR WEAR",
    subtitle: "Marca de roupa • Streetwear",
    cover:
      "https://kitqueen.co.uk/cdn/shop/files/Navy_96e51aa8-74f2-41ad-af5a-37c60af73c54.png?v=1683196276&width=1500",
  },
];

const RESULTS: ResultItem[] = [
  {
    id: 1,
    type: "music",
    title: "Late Hours",
    subtitle: "Single • Artist Name (Feat. Someone)",
    cover:
      "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
  },
  {
    id: 2,
    type: "music",
    title: "Afterlight",
    subtitle: "EP • Artist Name",
    cover:
      "https://i.pinimg.com/1200x/6b/87/62/6b8762d66ffc9220294524e16485b4e0.jpg",
  },
  {
    id: 3,
    type: "artist",
    title: "Artist Name",
    subtitle: "Artista • 23,1k seguidores",
    cover:
      "https://i.pinimg.com/1200x/b9/e8/db/b9e8db33168a26c9ca697a05ddc80937.jpg",
  },
  {
    id: 4,
    type: "artist",
    title: "Another Artist",
    subtitle: "Artista • 8,2k seguidores",
    cover:
      "https://i.pinimg.com/1200x/0f/7b/2a/0f7b2a3d4e5f6a7b8c9d0e1f2a3b4c5d.jpg",
  },
  {
    id: 5,
    type: "music",
    title: "New Track",
    subtitle: "Single • Another Artist",
    cover:
      "https://i.pinimg.com/1200x/2f/6b/4c/2f6b4c0e5b92c4f1b85c9b7d1f3c1a0e.jpg",
  },
  {
    id: 6,
    type: "music",
    title: "Slow Jam",
    subtitle: "EP • Artist Name",
    cover:
      "https://i.pinimg.com/1200x/7c/1f/2d/7c1f2d8b8b4f5d91f0c7c0a9a2b6d7e1.jpg",
  },
  {
    id: 7,
    type: "artist",
    title: "Name Artist",
    subtitle: "Artista • 3,5k seguidores",
    cover:
      "https://i.pinimg.com/1200x/35/2a/1f/352a1f7b8c9d0e1f2a3b4c5d6e7f8a9b.jpg",
  },
  {
    id: 8,
    type: "music",
    title: "Electric Sleep",
    subtitle: "Single • Name Artist",
    cover:
      "https://i.pinimg.com/1200x/8f/2a/0b/8f2a0b7b1f8a4d7f1b3c2d9e0f1a2b3c.jpg",
  },
  {
    id: 9,
    type: "music",
    title: "Midnight",
    subtitle: "Single • Another Artist",
    cover:
      "https://i.pinimg.com/1200x/1a/6c/3d/1a6c3d7b8c9d0e1f2a3b4c5d6e7f8a9b.jpg",
  },
  {
    id: 10,
    type: "brand",
    title: "SONNOR WEAR",
    subtitle: "Marca de roupa • Lisboa",
    cover:
      "https://kitqueen.co.uk/cdn/shop/files/Navy_96e51aa8-74f2-41ad-af5a-37c60af73c54.png?v=1683196276&width=1500",
  },
];

export default function SearchScreen() {
  const router = useRouter();
  const { wp, hp, font } = useResponsive();
  const [query, setQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [playingItem, setPlayingItem] = useState<number | null>(null);
  const [recentSearches, setRecentSearches] = useState(INITIAL_RECENTS);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState | null>(null);

  function togglePlay(id: number) {
    setPlayingItem((current) => (current === id ? null : id));
  }

  function saveRecent(item: {
    type?: RecentItem["type"] | ResultItem["type"];
    title: string;
    subtitle: string;
    cover: string;
  }) {
    setRecentSearches((current) => {
      const nextItem: RecentItem = {
        id: Date.now(),
        type:
          item.type === "artist" || item.type === "brand" || item.type === "album"
            ? item.type
            : "music",
        title: item.title,
        subtitle: item.subtitle,
        cover: item.cover,
      };

      const filtered = current.filter((entry) => entry.title !== item.title);

      return [nextItem, ...filtered].slice(0, 6);
    });
  }

  function openDetail(item: DetailState) {
    setDetail(item);
  }

  function openMusicRelease(title: string, cover: string) {
    const match = findMusicMatch(title);

    if (!match) {
      return false;
    }

    router.push(
      buildReleaseRoute(match, {
        cover,
        heroImage: cover,
      }),
    );
    return true;
  }

  function handleResultPress(item: ResultItem) {
    saveRecent(item);

    if (item.type === "music" && openMusicRelease(item.title, item.cover)) {
      return;
    }

    openDetail({
      title: item.title,
      subtitle: item.subtitle,
      image: item.cover,
      description:
        item.type === "brand"
          ? "Marca aberta a colaboração e a novos drops dentro da app."
          : item.type === "artist"
          ? "Perfil do artista com lançamentos, estatísticas e conteúdos recentes."
          : "Faixa pronta para reprodução, partilha e exploração visual.",
    });
  }

  function handleRecentPress(item: RecentItem) {
    if (
      (item.type === "music" || item.type === "album") &&
      openMusicRelease(item.title, item.cover)
    ) {
      saveRecent(item);
      setQuery(item.title);
      setIsSearchFocused(false);
      return;
    }

    setQuery(item.title);
    setIsSearchFocused(false);
    saveRecent(item);
  }

  function handleCategoryPress(category: CategoryItem) {
    if (category.title === "Ver todas") {
      setActiveCategory(null);
      setIsSearchFocused(false);
      return;
    }

    if (category.title === "Biblioteca") {
      openDetail({
        title: "Biblioteca",
        subtitle: "Acesso rápido",
        image: category.cover,
        description:
          "Atalho para os teus álbuns, artistas e músicas guardadas.",
      });
      return;
    }

    setActiveCategory(category.title);
    setIsSearchFocused(false);
  }

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;
  const lowerQuery = trimmedQuery.toLowerCase();

  const filteredResults = !hasQuery
    ? []
    : RESULTS.filter((item) => {
        const title = item.title.toLowerCase();
        const subtitle = item.subtitle.toLowerCase();
        return title.includes(lowerQuery) || subtitle.includes(lowerQuery);
      });

  const filteredPosts = useMemo(() => {
    if (!activeCategory) {
      return POSTS;
    }

    return POSTS.filter((post) => post.category === activeCategory);
  }, [activeCategory]);

  const showResults = hasQuery;
  const showRecents = !hasQuery && isSearchFocused;
  const showExplore = !hasQuery && !isSearchFocused;

  return (
    <View style={[styles.container, { paddingHorizontal: wp(5) }]}>
      <Modal transparent visible={detail !== null} animationType="fade">
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalBackdrop}
          onPress={() => setDetail(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.detailCard}
            onPress={(event) => event.stopPropagation()}
          >
            {detail && (
              <>
                <Image source={{ uri: detail.image }} style={styles.detailImage} />
                <Text style={styles.detailTitle}>{detail.title}</Text>
                <Text style={styles.detailSubtitle}>{detail.subtitle}</Text>
                <Text style={styles.detailDescription}>{detail.description}</Text>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Text style={[styles.pageTitle, { fontSize: font(34) }]}>Pesquisar</Text>

      <View
        style={[
          styles.searchBox,
          { paddingHorizontal: wp(4), paddingVertical: hp(1.5) },
        ]}
      >
        <TextInput
          style={[styles.searchInput, { fontSize: font(16) }]}
          placeholder="Artistas, músicas ou álbuns..."
          placeholderTextColor="#777"
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            setActiveCategory(null);
          }}
          onFocus={() => setIsSearchFocused(true)}
          returnKeyType="search"
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: hp(20) }}
      >
        {showResults && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: font(14) }]}>
              Resultados
            </Text>

            {filteredResults.length === 0 ? (
              <Text style={[styles.emptyText, { fontSize: font(14) }]}>
                Sem resultados para “{trimmedQuery}”.
              </Text>
            ) : (
              filteredResults.map((item) => (
                <View key={item.id} style={styles.resultWrapper}>
                  <TouchableOpacity
                    style={styles.resultItem}
                    activeOpacity={0.8}
                    onPress={() => handleResultPress(item)}
                  >
                    <Image
                      source={{ uri: item.cover }}
                      style={
                        item.type === "artist"
                          ? [
                              styles.artistCover,
                              {
                                width: wp(14),
                                height: wp(14),
                                borderRadius: wp(7),
                              },
                            ]
                          : [styles.cover, { width: wp(14), height: wp(14) }]
                      }
                    />

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.resultTitle, { fontSize: font(16) }]}>
                        {item.title}
                      </Text>
                      <Text
                        style={[styles.resultSubtitle, { fontSize: font(13) }]}
                      >
                        {item.subtitle}
                      </Text>
                    </View>

                    {item.type === "music" && (
                      <TouchableOpacity onPress={() => togglePlay(item.id)}>
                        <Ionicons
                          name={
                            playingItem === item.id
                              ? "pause-outline"
                              : "play-outline"
                          }
                          size={font(32)}
                          color="#fff"
                          style={{ marginLeft: wp(3) }}
                        />
                      </TouchableOpacity>
                    )}

                    {item.type === "brand" && (
                      <Ionicons
                        name="shirt-outline"
                        size={font(24)}
                        color="#aaa"
                        style={{ marginLeft: wp(3) }}
                      />
                    )}
                  </TouchableOpacity>

                  <View style={styles.divider} />
                </View>
              ))
            )}
          </View>
        )}

        {showRecents && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { fontSize: font(14) }]}>
                Recentes
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setRecentSearches([])}
              >
                <Text style={[styles.actionText, { fontSize: font(13) }]}>
                  Limpar
                </Text>
              </TouchableOpacity>
            </View>

            {recentSearches.length === 0 ? (
              <Text style={[styles.emptyText, { fontSize: font(14) }]}>
                Ainda não tens pesquisas recentes.
              </Text>
            ) : (
              recentSearches.map((item) => (
                <View key={item.id} style={styles.resultWrapper}>
                  <TouchableOpacity
                    style={styles.resultItem}
                    activeOpacity={0.8}
                    onPress={() => handleRecentPress(item)}
                  >
                    <Image
                      source={{ uri: item.cover }}
                      style={
                        item.type === "artist"
                          ? [
                              styles.artistCover,
                              {
                                width: wp(14),
                                height: wp(14),
                                borderRadius: wp(7),
                              },
                            ]
                          : [styles.cover, { width: wp(14), height: wp(14) }]
                      }
                    />

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.resultTitle, { fontSize: font(16) }]}>
                        {item.title}
                      </Text>
                      <Text
                        style={[styles.resultSubtitle, { fontSize: font(13) }]}
                      >
                        {item.subtitle}
                      </Text>
                    </View>

                    <Ionicons
                      name={item.type === "brand" ? "shirt-outline" : "time-outline"}
                      size={font(22)}
                      color="#888"
                      style={{ marginLeft: wp(3) }}
                    />
                  </TouchableOpacity>

                  <View style={styles.divider} />
                </View>
              ))
            )}
          </View>
        )}

        {showExplore && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { fontSize: font(14) }]}>
                  Categorias
                </Text>

                {activeCategory && (
                  <Text style={[styles.activeCategoryText, { fontSize: font(12) }]}>
                    Filtro: {activeCategory}
                  </Text>
                )}
              </View>

              <View style={styles.categoriesGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.85}
                    style={[
                      styles.categoryCard,
                      cat.isAll ? styles.categoryCardAll : null,
                      activeCategory === cat.title && styles.categoryCardActive,
                      { width: wp(28.5) },
                    ]}
                    onPress={() => handleCategoryPress(cat)}
                  >
                    <Image source={{ uri: cat.cover }} style={styles.categoryImage} />
                    <View style={styles.categoryOverlay} />
                    <Text style={[styles.categoryTitle, { fontSize: font(13) }]}>
                      {cat.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View
              style={[styles.section, { marginTop: hp(2), paddingBottom: hp(4) }]}
            >
              <Text style={[styles.sectionTitle, { fontSize: font(14) }]}>
                Posts
              </Text>

              <View style={styles.postsGrid}>
                {filteredPosts.map((post) => (
                  <TouchableOpacity
                    key={post.id}
                    activeOpacity={0.85}
                    style={[styles.postGridItem, { width: wp(29), height: hp(24) }]}
                    onPress={() =>
                      openDetail({
                        title: post.artist,
                        subtitle: `${post.category} • ${post.meta}`,
                        image: post.image,
                        description: post.caption,
                      })
                    }
                  >
                    <Image source={{ uri: post.image }} style={styles.postGridImage} />
                    <View style={styles.postOverlay} />
                    <Text
                      style={[styles.postArtistOverlay, { fontSize: font(12) }]}
                    >
                      {post.artist}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: 60,
  },
  pageTitle: {
    fontWeight: "700",
    color: "#fff",
    marginBottom: 25,
  },
  searchBox: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#242424",
  },
  searchInput: {
    color: "#fff",
  },
  section: {
    marginTop: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sectionTitle: {
    color: "#ccc",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  activeCategoryText: {
    color: "#fff",
    opacity: 0.7,
    marginBottom: 12,
  },
  actionText: {
    color: "#d64040",
    marginBottom: 12,
  },
  resultWrapper: {
    marginBottom: 3,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  cover: {
    borderRadius: 12,
    marginRight: 15,
  },
  artistCover: {
    marginRight: 15,
  },
  resultTitle: {
    color: "#fff",
    fontWeight: "600",
  },
  resultSubtitle: {
    color: "#888",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#111",
    marginTop: 10,
  },
  emptyText: {
    color: "#777",
    marginTop: 8,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryCard: {
    aspectRatio: 1,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1b1b1b",
    backgroundColor: "#0f0f0f",
  },
  categoryCardAll: {
    borderColor: "#383838",
  },
  categoryCardActive: {
    borderColor: "#fff",
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  categoryTitle: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    color: "#fff",
    fontWeight: "700",
  },
  postsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  postGridItem: {
    marginBottom: 8,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#0f0f0f",
    borderWidth: 1,
    borderColor: "#1b1b1b",
  },
  postGridImage: {
    width: "100%",
    height: "100%",
  },
  postOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "40%",
  },
  postArtistOverlay: {
    position: "absolute",
    left: 4,
    bottom: 6,
    color: "#b9b9b9",
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  detailCard: {
    width: "100%",
    maxWidth: 380,
    alignSelf: "center",
    borderRadius: 24,
    padding: 16,
    backgroundColor: "rgba(12,12,12,0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  detailImage: {
    width: "100%",
    height: 260,
    borderRadius: 18,
    marginBottom: 14,
  },
  detailTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  detailSubtitle: {
    color: "#a7a7a7",
    fontSize: 13,
    marginTop: 4,
  },
  detailDescription: {
    color: "#ddd",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
});
