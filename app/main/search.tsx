import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DynamicIslandTest from "./components/Dynamicmenu";

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
};

type RecentItem = {
  id: number;
  type: "music" | "artist" | "album" | "brand";
  title: string;
  subtitle: string;
  cover: string;
};

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [playingItem, setPlayingItem] = useState<number | null>(null);

  // =========================
  // MOCK: CATEGORIAS (máx 9) — 1ª é "Ver todas"
  // =========================
  const categories: CategoryItem[] = [
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

  // =========================
  // MOCK: POSTS (feed) — agora 9
  // =========================
  const posts: PostItem[] = [
    {
      id: 1,
      artist: "Artist Name",
      caption: "Novo drop esta semana. Fica atento.",
      meta: "Há 2h • Lisboa",
      image:
        "https://i.pinimg.com/736x/6b/87/62/6b8762d66ffc9220294524e16485b4e0.jpg",
    },
    {
      id: 2,
      artist: "Artist Name",
      caption: "Studio session a abrir caminho para o próximo EP.",
      meta: "Há 5h • Porto",
      image:
        "https://i.pinimg.com/736x/6b/87/62/6b8762d66ffc9220294524e16485b4e0.jpg",
    },
    {
      id: 3,
      artist: "Artist Name",
      caption: "Moodboard do próximo visual. Minimal e pesado.",
      meta: "Ontem • Braga",
      image:
        "https://i.pinimg.com/736x/6b/87/62/6b8762d66ffc9220294524e16485b4e0.jpg",
    },
    {
      id: 4,
      artist: "Artist Name",
      caption: "Teaser curto. Som limpo, vibe crua.",
      meta: "Há 2 dias",
      image:
        "https://i.pinimg.com/1200x/8f/2a/0b/8f2a0b7b1f8a4d7f1b3c2d9e0f1a2b3c.jpg",
    },
    {
      id: 5,
      artist: "Artist Name",
      caption: "Look do dia + snippet do beat.",
      meta: "Há 3 dias",
      image:
        "https://i.pinimg.com/1200x/2c/7a/1d/2c7a1d3e4f5a6b7c8d9e0f1a2b3c4d5e.jpg",
    },
    {
      id: 6,
      artist: "Artist Name",
      caption: "Capas em teste. Qual escolhiam?",
      meta: "Há 4 dias",
      image:
        "https://i.pinimg.com/1200x/1a/6c/3d/1a6c3d7b8c9d0e1f2a3b4c5d6e7f8a9b.jpg",
    },
    {
      id: 7,
      artist: "Artist Name",
      caption: "Ensaios visuais para o próximo lançamento.",
      meta: "Há 1 semana",
      image:
        "https://i.pinimg.com/1200x/6b/4c/2f/6b4c2f0e5b92c4f1b85c9b7d1f3c1a0e.jpg",
    },
    {
      id: 8,
      artist: "Artist Name",
      caption: "Prévia do merch. Linhas simples, marca forte.",
      meta: "Há 1 semana",
      image:
        "https://i.pinimg.com/1200x/7a/5d/2d/7a5d2db7c7a21c7e0f7b41a2d9f0a1b2.jpg",
    },
    {
      id: 9,
      artist: "Artist Name",
      caption: "Backstage do set. Energia máxima.",
      meta: "Há 2 semanas",
      image:
        "https://i.pinimg.com/1200x/4e/5f/6a/4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b.jpg",
    },
  ];

  // =========================
  // MOCK: RECENTES — aparece ao clicar no search (com query vazia)
  // =========================
  const recentSearches: RecentItem[] = [
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
      title: "Name",
      subtitle: "Música • Name Artist",
      cover:
        "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
    },
    {
      id: 3,
      type: "album",
      title: "Album Name",
      subtitle: "Álbum • Name Artist",
      cover:
        "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
    },
    {
      id: 4,
      type: "music",
      title: "Name",
      subtitle: "Música • Name Artist (Feat. Someone)",
      cover:
        "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
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

  // =========================
  // MOCK: RESULTADOS — aparece quando escreve (query com texto)
  // =========================
  const fakeResults: ResultItem[] = [
    {
      id: 1,
      type: "music",
      title: "Name",
      subtitle: "Single ou EP • Name Artist (Feat. Someone, Someone)",
      cover:
        "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
    },
    {
      id: 2,
      type: "music",
      title: "Name",
      subtitle: "Single ou EP • Name Artist (Feat. Someone, Someone)",
      cover:
        "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
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
      title: "Electric",
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

  function togglePlay(id: number) {
    setPlayingItem((current) => (current === id ? null : id));
  }

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;

  const filteredResults = useMemo(() => {
    if (!hasQuery) return [];
    const q = trimmedQuery.toLowerCase();
    return fakeResults.filter((item) => {
      const title = item.title.toLowerCase();
      const subtitle = item.subtitle.toLowerCase();
      return title.includes(q) || subtitle.includes(q);
    });
  }, [hasQuery, trimmedQuery]);

  // =========================
  // REGRAS:
  // 1) Se escreveu -> Resultados
  // 2) Se clicou no input (focus) e ainda não escreveu -> Recentes
  // 3) Se abriu o ecrã (sem focus e sem query) -> Categorias + Posts
  // =========================
  const showResults = hasQuery;
  const showRecents = !hasQuery && isSearchFocused;
  const showExplore = !hasQuery && !isSearchFocused;

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Pesquisar</Text>

      {/* SEARCH BOX */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Artistas, músicas ou álbuns..."
          placeholderTextColor="#777"
          value={query}
          onChangeText={setQuery}
          onFocus={() => setIsSearchFocused(true)}
          returnKeyType="search"
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 170 }}
      >
        {/* ESTADO C: RESULTADOS */}
        {showResults && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resultados</Text>

            {filteredResults.length === 0 ? (
              <Text style={styles.emptyText}>
                Sem resultados para “{trimmedQuery}”.
              </Text>
            ) : (
              filteredResults.map((item) => (
                <View key={item.id} style={styles.resultWrapper}>
                  <TouchableOpacity
                    style={styles.resultItem}
                    activeOpacity={0.2}
                  >
                    <Image
                      source={{ uri: item.cover }}
                      style={[
                        item.type === "artist"
                          ? styles.artistCover
                          : styles.cover,
                      ]}
                    />

                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultTitle}>{item.title}</Text>
                      <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
                    </View>

                    {item.type === "music" && (
                      <TouchableOpacity onPress={() => togglePlay(item.id)}>
                        <Ionicons
                          name={
                            playingItem === item.id
                              ? "pause-outline"
                              : "play-outline"
                          }
                          size={32}
                          color="#fff"
                          style={{ marginLeft: 12 }}
                        />
                      </TouchableOpacity>
                    )}

                    {item.type === "brand" && (
                      <Ionicons
                        name="shirt-outline"
                        size={24}
                        color="#aaa"
                        style={{ marginLeft: 12 }}
                      />
                    )}
                  </TouchableOpacity>

                  <View style={styles.divider} />
                </View>
              ))
            )}
          </View>
        )}

        {/* ESTADO B: RECENTES (ao clicar no search com query vazia) */}
        {showRecents && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recentes</Text>

              <TouchableOpacity activeOpacity={0.2}>
                <Text style={styles.actionText}>Limpar</Text>
              </TouchableOpacity>
            </View>

            {recentSearches.map((item) => (
              <View key={item.id} style={styles.resultWrapper}>
                <TouchableOpacity style={styles.resultItem} activeOpacity={0.2}>
                  <Image
                    source={{ uri: item.cover }}
                    style={
                      item.type === "artist" ? styles.artistCover : styles.cover
                    }
                  />

                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultTitle}>{item.title}</Text>
                    <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
                  </View>

                  <Ionicons
                    name={
                      item.type === "brand" ? "shirt-outline" : "time-outline"
                    }
                    size={22}
                    color="#888"
                    style={{ marginLeft: 12 }}
                  />
                </TouchableOpacity>

                <View style={styles.divider} />
              </View>
            ))}
          </View>
        )}

        {/* ESTADO A: EXPLORE (categorias + posts) */}
        {showExplore && (
          <>
            {/* CATEGORIAS */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Categorias</Text>

              <View style={styles.categoriesGrid}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.2}
                    style={[
                      styles.categoryCard,
                      cat.isAll ? styles.categoryCardAll : null,
                    ]}
                  >
                    <Image
                      source={{ uri: cat.cover }}
                      style={styles.categoryImage}
                    />
                    <View style={styles.categoryOverlay} />
                    <Text style={styles.categoryTitle}>{cat.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* POSTS — GRID 3x3 */}
            <View
              style={[styles.section, { marginTop: 10, paddingBottom: 30 }]}
            >
              <Text style={styles.sectionTitle}>Posts</Text>

              <View style={styles.postsGrid}>
                {posts.map((post) => (
                  <TouchableOpacity
                    key={post.id}
                    activeOpacity={0.2}
                    style={styles.postGridItem}
                  >
                    <Image
                      source={{ uri: post.image }}
                      style={styles.postGridImage}
                    />

                    {/* OVERLAY */}
                    <View style={styles.postOverlay} />

                    {/* ARTIST NAME */}
                    <Text style={styles.postArtistOverlay}>Artist Name</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
      <DynamicIslandTest />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  pageTitle: {
    fontSize: 34,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 25,
  },

  searchBox: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#242424",
  },

  searchInput: {
    color: "#fff",
    fontSize: 16,
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
    fontSize: 14,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  actionText: {
    color: "#b80000ff",
    fontSize: 13,
    marginBottom: 12,
  },

  // ===== RESULTADOS / RECENTES =====
  resultWrapper: {
    marginBottom: 3,
  },

  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },

  cover: {
    width: 58,
    height: 58,
    borderRadius: 12,
    marginRight: 15,
  },

  artistCover: {
    width: 58,
    height: 58,
    borderRadius: 58,
    marginRight: 15,
  },

  resultTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  resultSubtitle: {
    color: "#888",
    fontSize: 13,
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: "#111",
    marginTop: 10,
  },

  emptyText: {
    color: "#777",
    fontSize: 14,
    marginTop: 8,
  },

  // ===== CATEGORIAS =====
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  categoryCard: {
    width: "31.5%",
    aspectRatio: 1,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1b1b1b",
    backgroundColor: "#0f0f0f",
  },

  categoryCardAll: {
    borderColor: "#383838ff",
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
    fontSize: 13,
    fontWeight: "700",
  },

  // ===== POSTS =====
  postCard: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#0f0f0f",
    borderWidth: 1,
    borderColor: "#1b1b1b",
    marginBottom: 12,
  },

  postImage: {
    width: "100%",
    height: 190,
  },

  postContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  postTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  postArtist: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  postMeta: {
    color: "#777",
    fontSize: 12,
  },

  postCaption: {
    color: "#bbb",
    fontSize: 13,
    lineHeight: 18,
  },

  // ===== POSTS GRID 3x3 =====
  postsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  postGridItem: {
    width: "32%",
    height: 200,
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
    left: 2,
    bottom: 6,
    color: "#b9b9b9ff",
    fontSize: 12,
    fontWeight: "700",
  },
});
