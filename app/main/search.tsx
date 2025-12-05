import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
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

export default function SearchScreen() {
  const [query, setQuery] = useState("");

  const [playingItem, setPlayingItem] = useState<number | null>(null);

  const fakeResults = [
    {
      id: 1,
      type: "music",
      title: "Billie Eilish - Lovely",
      subtitle: "Single • Billie Eilish & Khalid",
      cover: "https://m.media-amazon.com/images/I/71laVfWEkCS._SL1400_.jpg",
    },
    {
      id: 2,
      type: "music",
      title: "FE!N",
      subtitle: "Travis Scott • UTOPIA",
      cover: "https://m.media-amazon.com/images/I/419MLl8rxsL._AC_SX385_.jpg",
    },
    {
      id: 3,
      type: "artist",
      title: "The Weekend",
      subtitle: "Artista",
      cover:
        "https://cdn-images.dzcdn.net/images/artist/581693b4724a7fcfa754455101e13a44/1900x1900-000000-81-0-0.jpg",
    },
  ];

  function togglePlay(id: number) {
    setPlayingItem((current) => (current === id ? null : id));
  }

  return (
    <View style={styles.container}>
      <DynamicIslandTest />

      <Text style={styles.pageTitle}>Pesquisar</Text>

      {/* SEARCH BOX */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Artistas, músicas ou álbuns..."
          placeholderTextColor="#777"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resultados</Text>

          {fakeResults.map((item) => (
            <View key={item.id} style={styles.resultWrapper}>
              <TouchableOpacity style={styles.resultItem}>
                {/* COVER / ARTISTA COM IMAGEM CIRCULAR */}
                <Image
                  source={{ uri: item.cover }}
                  style={[
                    item.type === "artist" ? styles.artistCover : styles.cover,
                  ]}
                />

                {/* TITLES */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultTitle}>{item.title}</Text>
                  <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
                </View>

                {/* PLAY ICON ONLY FOR MUSIC */}
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
              </TouchableOpacity>

              <View style={styles.divider} />
            </View>
          ))}
        </View>
      </ScrollView>
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
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#242424",
  },

  searchInput: {
    color: "#fff",
    fontSize: 16,
  },

  section: {
    marginTop: 5,
  },

  sectionTitle: {
    color: "#ccc",
    fontSize: 14,
    marginBottom: 15,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  resultWrapper: {
    marginBottom: 3,
  },

  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },

  /* CAPA DE MÚSICA */
  cover: {
    width: 58,
    height: 58,
    borderRadius: 12,
    marginRight: 15,
  },

  /* FOTO DE ARTISTA REDONDA */
  artistCover: {
    width: 58,
    height: 58,
    borderRadius: 58, // círculo perfeito
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
});
