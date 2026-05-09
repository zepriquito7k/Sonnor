import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { buildReleaseRoute, findMusicMatch } from "../../constants/musicLibrary";
import { useResponsive } from "../../utils/responsive";
import FullscreenMedia from "./components/FullscreenMedia";

type FeaturedPost = {
  artist: string;
  avatar: string;
  caption: string;
  id: number;
  image: string;
  musicName: string;
};

type DetailItem = {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  description: string;
};

const FEATURED_POSTS: FeaturedPost[] = [
  {
    id: 1,
    artist: "Artist Name",
    avatar:
      "https://i.pinimg.com/1200x/b9/e8/db/b9e8db33168a26c9ca697a05ddc80937.jpg",
    caption: "Nova bio visual para este drop. Mood noturno e cinematográfico.",
    image:
      "https://i.pinimg.com/736x/6b/87/62/6b8762d66ffc9220294524e16485b4e0.jpg",
    musicName: "Noites de Neon",
  },
  {
    id: 2,
    artist: "Artist Name",
    avatar:
      "https://i.pinimg.com/1200x/b9/e8/db/b9e8db33168a26c9ca697a05ddc80937.jpg",
    caption: "Preview do conceito visual do próximo post com foco na estética.",
    image:
      "https://i.pinimg.com/1200x/f4/2f/59/f42f595b9b6b0b9cc8269e4a84364707.jpg",
    musicName: "Velvet City",
  },
  {
    id: 3,
    artist: "Artist Name",
    avatar:
      "https://i.pinimg.com/1200x/b9/e8/db/b9e8db33168a26c9ca697a05ddc80937.jpg",
    caption: "Legenda curta com energia de lançamento e identidade do artista.",
    image:
      "https://i.pinimg.com/1200x/8d/dc/29/8ddc29e3bbdadf33fc22ca5ffa23d59d.jpg",
    musicName: "Afterlight",
  },
];

const CONTINUE_ITEMS: DetailItem[] = [
  {
    id: 1,
    title: "Neon Dreams",
    subtitle: "Artist Name",
    image:
      "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
    description: "Projeto guardado na tua fila para continuares a ouvir.",
  },
  {
    id: 2,
    title: "Midnight Avenue",
    subtitle: "Artist Name",
    image:
      "https://i.pinimg.com/1200x/6b/87/62/6b8762d66ffc9220294524e16485b4e0.jpg",
    description: "Álbum retomado a partir da última reprodução.",
  },
  {
    id: 3,
    title: "Blue Motel",
    subtitle: "Artist Name",
    image:
      "https://i.pinimg.com/1200x/8f/2a/0b/8f2a0b7b1f8a4d7f1b3c2d9e0f1a2b3c.jpg",
    description: "Single favorito ainda em destaque na tua biblioteca.",
  },
  {
    id: 4,
    title: "After Hours Tape",
    subtitle: "Artist Name",
    image:
      "https://i.pinimg.com/1200x/2f/6b/4c/2f6b4c0e5b92c4f1b85c9b7d1f3c1a0e.jpg",
    description: "Projeto com visual escuro e produção mais pesada.",
  },
];

const RELEASE_ITEMS: DetailItem[] = [
  {
    id: 1,
    title: "Late Hours",
    subtitle: "Artist Name",
    image:
      "https://i.pinimg.com/1200x/8f/2a/0b/8f2a0b7b1f8a4d7f1b3c2d9e0f1a2b3c.jpg",
    description: "Single recém-lançado com visual principal já publicado.",
  },
  {
    id: 2,
    title: "Electric Sleep",
    subtitle: "Artist Name",
    image:
      "https://i.pinimg.com/1200x/1a/6c/3d/1a6c3d7b8c9d0e1f2a3b4c5d6e7f8a9b.jpg",
    description: "Novo drop pensado para playlists editoriais.",
  },
  {
    id: 3,
    title: "Slow Motion",
    subtitle: "Artist Name",
    image:
      "https://i.pinimg.com/1200x/7c/1f/2d/7c1f2d8b8b4f5d91f0c7c0a9a2b6d7e1.jpg",
    description: "Faixa com identidade visual inspirada em fotografia analógica.",
  },
  {
    id: 4,
    title: "Street Echo",
    subtitle: "Artist Name",
    image:
      "https://i.pinimg.com/1200x/7a/5d/2d/7a5d2db7c7a21c7e0f7b41a2d9f0a1b2.jpg",
    description: "Lançamento em crescimento nas últimas 24 horas.",
  },
];

const MODEL_ITEMS: DetailItem[] = [
  {
    id: 1,
    title: "Night Run",
    subtitle: "Name Shop",
    image:
      "https://www.iconsdb.com/icons/preview/white/nike-xxl.png",
    description: "Peça visual ligada à coleção principal do artista.",
  },
  {
    id: 2,
    title: "Chrome Fit",
    subtitle: "Name Shop",
    image:
      "https://www.iconsdb.com/icons/preview/white/nike-xxl.png",
    description: "Look de campanha com styling mais minimal e forte.",
  },
  {
    id: 3,
    title: "Studio Uniform",
    subtitle: "Name Shop",
    image:
      "https://www.iconsdb.com/icons/preview/white/nike-xxl.png",
    description: "Seleção pensada para backstage e conteúdo curto.",
  },
  {
    id: 4,
    title: "Motion Pack",
    subtitle: "Name Shop",
    image:
      "https://www.iconsdb.com/icons/preview/white/nike-xxl.png",
    description: "Visual desenhado para editoriais e reels.",
  },
  {
    id: 5,
    title: "Tour Pack",
    subtitle: "Name Shop",
    image:
      "https://www.iconsdb.com/icons/preview/white/nike-xxl.png",
    description: "Coleção com leitura mais comercial e pronta para drop.",
  },
  {
    id: 6,
    title: "Runway Pack",
    subtitle: "Name Shop",
    image:
      "https://www.iconsdb.com/icons/preview/white/nike-xxl.png",
    description: "Peças escolhidas para destacar o lado editorial da marca.",
  },
];

const EXCLUSIVE_COLLECTIONS: DetailItem[] = [
  {
    id: 1,
    title: "Collection 01",
    subtitle: "Coleção exclusiva",
    image:
      "https://kitqueen.co.uk/cdn/shop/files/Navy_96e51aa8-74f2-41ad-af5a-37c60af73c54.png?v=1683196276&width=1500",
    description: "Capsule com identidade noturna e acabamento premium.",
  },
  {
    id: 2,
    title: "Collection 02",
    subtitle: "Coleção exclusiva",
    image:
      "https://kitqueen.co.uk/cdn/shop/files/Navy_96e51aa8-74f2-41ad-af5a-37c60af73c54.png?v=1683196276&width=1500",
    description: "Linha pensada para o próximo calendário de lançamentos.",
  },
  {
    id: 3,
    title: "Collection 03",
    subtitle: "Coleção exclusiva",
    image:
      "https://kitqueen.co.uk/cdn/shop/files/Navy_96e51aa8-74f2-41ad-af5a-37c60af73c54.png?v=1683196276&width=1500",
    description: "Coleção visualmente limpa para ativações especiais.",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { wp, hp, font } = useResponsive();
  const [showFull, setShowFull] = useState(false);
  const [fullType, setFullType] = useState<"image" | "video" | null>(null);
  const [fullSource, setFullSource] = useState<string | null>(null);
  const [fullPost, setFullPost] = useState<FeaturedPost | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<DetailItem | null>(null);

  const heroCard = useMemo(
    () => ({
      id: 0,
      title: "Visual em destaque",
      subtitle: "Campanha principal",
      image:
        "https://i.pinimg.com/736x/c5/25/2a/c5252a97ccdddc0b4e7974850f2df6f8.jpg",
      description:
        "Banner principal ligado à campanha visual mais recente do artista.",
    }),
    [],
  );

  function openFullscreen(post: FeaturedPost) {
    setFullPost(post);
    setFullType("image");
    setFullSource(post.image);
    setShowFull(true);
  }

  function openReleaseFromItem(item: DetailItem) {
    const match = findMusicMatch(item.title);

    if (!match) {
      setSelectedDetail(item);
      return;
    }

    router.push(
      buildReleaseRoute(match, {
        cover: item.image,
        heroImage: item.image,
      }),
    );
  }

  const CARD_WIDTH = wp(46);
  const SQUARE_SIZE = wp(42);
  const FASHION_WIDTH = wp(50);

  return (
    <View style={styles.container}>
      <Modal transparent visible={selectedDetail !== null} animationType="fade">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelectedDetail(null)}
        >
          <Pressable
            style={styles.detailCard}
            onPress={(event) => event.stopPropagation()}
          >
            {selectedDetail && (
              <>
                <Image
                  source={{ uri: selectedDetail.image }}
                  style={styles.detailImage}
                />
                <Text style={styles.detailTitle}>{selectedDetail.title}</Text>
                <Text style={styles.detailSubtitle}>
                  {selectedDetail.subtitle}
                </Text>
                <Text style={styles.detailDescription}>
                  {selectedDetail.description}
                </Text>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 230 }}
      >
        <Text
          style={[
            styles.pageTitle,
            {
              fontSize: font(32),
              marginTop: hp(8),
              paddingLeft: wp(5),
              marginBottom: hp(2),
            },
          ]}
        >
          Início
        </Text>

        <View style={[styles.section, { marginBottom: hp(4) }]}>
          <Pressable onPress={() => setSelectedDetail(heroCard)}>
            <Image
              source={{ uri: heroCard.image }}
              style={[styles.bigBanner, { height: hp(24) }]}
            />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { fontSize: font(22), paddingLeft: wp(5), marginBottom: hp(2) },
            ]}
          >
            Para Ti
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: wp(5), paddingRight: wp(5) }}
          >
            <View style={{ flexDirection: "row", gap: wp(4) }}>
              {FEATURED_POSTS.map((post) => (
                <Pressable key={post.id} onPress={() => openFullscreen(post)}>
                  <Image
                    style={[
                      styles.musicBox,
                      { width: CARD_WIDTH, height: hp(30) },
                    ]}
                    source={{ uri: post.image }}
                  />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={[styles.section, { marginTop: hp(6) }]}>
          <Text
            style={[
              styles.sectionTitle,
              { fontSize: font(22), paddingLeft: wp(5), marginBottom: hp(2) },
            ]}
          >
            Continuar
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: wp(5), paddingRight: wp(5) }}
          >
            <View style={{ flexDirection: "row", gap: wp(4) }}>
              {CONTINUE_ITEMS.map((item) => (
                <Pressable
                  key={item.id}
                  style={{ width: SQUARE_SIZE }}
                  onPress={() => openReleaseFromItem(item)}
                >
                  <Image
                    style={[
                      styles.squareBox,
                      { width: SQUARE_SIZE, height: SQUARE_SIZE },
                    ]}
                    source={{ uri: item.image }}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.itemTitle,
                      { fontSize: font(17), marginTop: hp(1.2) },
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.itemArtist, { fontSize: font(14) }]}
                  >
                    {item.subtitle}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={[styles.section, { marginTop: hp(6) }]}>
          <Text
            style={[
              styles.sectionTitle,
              { fontSize: font(22), paddingLeft: wp(5), marginBottom: hp(2) },
            ]}
          >
            Lançamentos
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: wp(5), paddingRight: wp(5) }}
          >
            <View style={{ flexDirection: "row", gap: wp(4) }}>
              {RELEASE_ITEMS.map((item) => (
                <Pressable
                  key={item.id}
                  style={{ width: SQUARE_SIZE }}
                  onPress={() => openReleaseFromItem(item)}
                >
                  <Image
                    style={[
                      styles.squareBox,
                      { width: SQUARE_SIZE, height: SQUARE_SIZE },
                    ]}
                    source={{ uri: item.image }}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.itemTitle,
                      { fontSize: font(17), marginTop: hp(1.2) },
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.itemArtist, { fontSize: font(14) }]}
                  >
                    {item.subtitle}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={[styles.section, { marginTop: hp(8) }]}>
          <Text
            style={[
              styles.sectionTitle,
              { fontSize: font(22), paddingLeft: wp(5), marginBottom: hp(2.5) },
            ]}
          >
            Model
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: wp(5), paddingRight: wp(5) }}
          >
            <View style={{ flexDirection: "row", gap: wp(6) }}>
              {MODEL_ITEMS.map((item) => (
                <Pressable
                  key={item.id}
                  style={{ width: FASHION_WIDTH }}
                  onPress={() => setSelectedDetail(item)}
                >
                  <Image
                    source={{ uri: item.image }}
                    style={[
                      styles.fashionBoxTransparent,
                      { width: FASHION_WIDTH, height: hp(28) },
                    ]}
                  />
                  <Text
                    style={[
                      styles.fashionLabel,
                      { fontSize: font(16), marginTop: hp(1.5) },
                    ]}
                  >
                    {item.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={[styles.section, { marginTop: hp(8) }]}>
          <Text
            style={[
              styles.sectionTitle,
              { fontSize: font(22), paddingLeft: wp(5), marginBottom: hp(2.5) },
            ]}
          >
            Coleções Exclusivas
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: wp(5), paddingRight: wp(5) }}
          >
            <View style={{ flexDirection: "row", gap: wp(8) }}>
              {EXCLUSIVE_COLLECTIONS.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedDetail(item)}
                >
                  <Image
                    source={{ uri: item.image }}
                    resizeMode="contain"
                    style={{
                      width: wp(55),
                      height: wp(55),
                      backgroundColor: "transparent",
                    }}
                  />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      {showFull && fullType && fullSource && (
        <FullscreenMedia
          visible={showFull}
          onClose={() => {
            setShowFull(false);
            setFullPost(null);
          }}
          post={fullPost ?? undefined}
          type={fullType}
          source={fullSource}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  pageTitle: { color: "#fff", fontWeight: "700" },
  section: { width: "100%" },
  sectionTitle: { color: "#fff", fontWeight: "600" },
  bigBanner: { width: "100%", borderRadius: 0 },
  musicBox: { borderRadius: 18, backgroundColor: "#111" },
  squareBox: { borderRadius: 18, backgroundColor: "#111" },
  fashionBoxTransparent: {
    backgroundColor: "transparent",
    resizeMode: "contain",
  },
  fashionLabel: { color: "#fff", textAlign: "center", fontWeight: "500" },
  itemTitle: { color: "#fff", fontWeight: "600" },
  itemArtist: { color: "#888" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
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
