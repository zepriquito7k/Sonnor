import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DynamicIslandTest from "./components/Dynamicmenu";

export default function HomeScreen() {
  // FULLSCREEN STATES

  const [showFull, setShowFull] = useState(false);
  const [fullType, setFullType] = useState<"image" | "video" | null>(null);
  const [fullSource, setFullSource] = useState<string | null>(null);

  function openFullscreen(type: "image" | "video", uri: string) {
    setFullType(type);
    setFullSource(uri);
    setShowFull(true);
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 230 }}
      >
        {/* TÍTULO */}
        <Text style={styles.pageTitle}>Início</Text>
        {/* Banner */}
        <View style={styles.section}>
          <Image
            source={{
              uri: "https://i.pinimg.com/736x/c5/25/2a/c5252a97ccdddc0b4e7974850f2df6f8.jpg",
            }}
            style={styles.bigBanner}
          />
        </View>

        {/* PARA TI */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Para Ti</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              {/* VÍDEO */}

              {/* IMAGENS */}
              {[
                "https://i.pinimg.com/736x/6b/87/62/6b8762d66ffc9220294524e16485b4e0.jpg",
                "https://i.pinimg.com/736x/6b/87/62/6b8762d66ffc9220294524e16485b4e0.jpg",
                "https://i.pinimg.com/736x/6b/87/62/6b8762d66ffc9220294524e16485b4e0.jpg",
              ].map((uri, index) => (
                <Pressable
                  key={index}
                  onPress={() => openFullscreen("image", uri)}
                >
                  <Image style={styles.musicBox} source={{ uri }} />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Continuar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Continuar</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
                  }}
                />
                <Text style={styles.itemTitle}>Name</Text>
                <Text style={styles.itemArtist}>Artist Name</Text>
              </View>

              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
                  }}
                />
                <Text style={styles.itemTitle}>Name</Text>
                <Text style={styles.itemArtist}>Artist Name</Text>
              </View>

              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
                  }}
                />
                <Text style={styles.itemTitle}>Name</Text>
                <Text style={styles.itemArtist}>Artist Name</Text>
              </View>

              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
                  }}
                />
                <Text style={styles.itemTitle}>Name</Text>
                <Text style={styles.itemArtist}>Artist Name</Text>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* LANÇAMENTOS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lançamentos</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
                  }}
                />
                <Text style={styles.itemTitle}>Name</Text>
                <Text style={styles.itemArtist}>Artist Name</Text>
              </View>

              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
                  }}
                />
                <Text style={styles.itemTitle}>Name</Text>
                <Text style={styles.itemArtist}>Artist Name</Text>
              </View>

              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
                  }}
                />
                <Text style={styles.itemTitle}>Name</Text>
                <Text style={styles.itemArtist}>Artist Name</Text>
              </View>

              {/*  novos boxes */}
              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
                  }}
                />
                <Text style={styles.itemTitle}>Name</Text>
                <Text style={styles.itemArtist}>Artist Name</Text>
              </View>

              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
                  }}
                />
                <Text style={styles.itemTitle}>Name</Text>
                <Text style={styles.itemArtist}>Artist Name</Text>
              </View>

              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
                  }}
                />
                <Text style={styles.itemTitle}>Name</Text>
                <Text style={styles.itemArtist}>Artist Name</Text>
              </View>

              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
                  }}
                />
                <Text style={styles.itemTitle}>Name</Text>
                <Text style={styles.itemArtist}>Artist Name</Text>
              </View>

              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
                  }}
                />
                <Text style={styles.itemTitle}>Name</Text>
                <Text style={styles.itemArtist}>Artist Name</Text>
              </View>

              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
                  }}
                />
                <Text style={styles.itemTitle}>Name</Text>
                <Text style={styles.itemArtist}>Artist Name</Text>
              </View>

              <View>
                <Image
                  style={styles.squareBox}
                  source={{
                    uri: "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
                  }}
                />
                <Text style={styles.itemTitle}>Name</Text>
                <Text style={styles.itemArtist}>Artist Name</Text>
              </View>
            </View>
          </ScrollView>
        </View>
        {/* MODA DOS ARTISTAS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Model</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              <View style={styles.fashionCard}>
                <Image
                  source={{
                    uri: "https://www.iconsdb.com/icons/preview/white/nike-xxl.png",
                  }}
                  style={styles.fashionBox}
                />
                <Text style={styles.fashionLabel}>Name Shop</Text>
              </View>

              <View style={styles.fashionCard}>
                <Image
                  source={{
                    uri: "https://www.iconsdb.com/icons/preview/white/nike-xxl.png",
                  }}
                  style={styles.fashionBox}
                />
                <Text style={styles.fashionLabel}>Name Shop</Text>
              </View>

              <View style={styles.fashionCard}>
                <Image
                  source={{
                    uri: "https://www.iconsdb.com/icons/preview/white/nike-xxl.png",
                  }}
                  style={styles.fashionBox}
                />
                <Text style={styles.fashionLabel}>Name Shop</Text>
              </View>

              <View style={styles.fashionCard}>
                <Image
                  source={{
                    uri: "https://www.iconsdb.com/icons/preview/white/nike-xxl.png",
                  }}
                  style={styles.fashionBox}
                />
                <Text style={styles.fashionLabel}>Name Shop</Text>
              </View>

              <View style={styles.fashionCard}>
                <Image
                  source={{
                    uri: "https://www.iconsdb.com/icons/preview/white/nike-xxl.png",
                  }}
                  style={styles.fashionBox}
                />
                <Text style={styles.fashionLabel}>Name Shop</Text>
              </View>

              <View style={styles.fashionCard}>
                <Image
                  source={{
                    uri: "https://www.iconsdb.com/icons/preview/white/nike-xxl.png",
                  }}
                  style={styles.fashionBox}
                />
                <Text style={styles.fashionLabel}>Name Shop</Text>
              </View>
            </View>
          </ScrollView>
        </View>
        {/* COLEÇÕES EXCLUSIVAS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coleções Exclusivas</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.exclusiveRow}>
              <Image
                source={{
                  uri: "https://kitqueen.co.uk/cdn/shop/files/Navy_96e51aa8-74f2-41ad-af5a-37c60af73c54.png?v=1683196276&width=1500",
                }}
                style={styles.exclusiveBox}
              />

              <Image
                source={{
                  uri: "https://kitqueen.co.uk/cdn/shop/files/Navy_96e51aa8-74f2-41ad-af5a-37c60af73c54.png?v=1683196276&width=1500",
                }}
                style={styles.exclusiveBox}
              />

              <Image
                source={{
                  uri: "https://kitqueen.co.uk/cdn/shop/files/Navy_96e51aa8-74f2-41ad-af5a-37c60af73c54.png?v=1683196276&width=1500",
                }}
                resizeMode="contain"
                style={{ width: 160, height: 160 }}
              />
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      <DynamicIslandTest />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000ff" },

  pageTitle: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
    paddingLeft: 20,
    marginTop: 50,
    marginBottom: 10,
  },

  section: { marginTop: 20 },

  sectionTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "600",
    paddingLeft: 20,
    marginBottom: 12,
  },

  bigBanner: {
    height: 180,
    borderRadius: 0,
    marginTop: -20,
  },

  horizontalList: {
    flexDirection: "row",
    gap: 14,
    paddingLeft: 20,
  },

  musicBox: {
    width: 150,
    height: 200,
    borderRadius: 18,
  },

  squareBox: {
    width: 150,
    height: 150,
    borderRadius: 18,
  },

  fashionCard: {
    width: 160,
  },

  fashionBox: {
    width: 160,
    height: 200,
    borderRadius: 18,
  },

  fashionLabel: {
    color: "#fff",
    marginTop: 6,
    fontSize: 15,
  },

  exclusiveRow: {
    flexDirection: "row",
    gap: 14,
    paddingLeft: 20,
  },

  exclusiveBox: {
    width: 180,
    height: 180,
    borderRadius: 22,
  },

  itemTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 8,
  },

  itemArtist: {
    color: "#bbb",
    fontSize: 14,
    marginTop: 2,
  },
});
