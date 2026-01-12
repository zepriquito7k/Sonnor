import { VideoView, useVideoPlayer } from "expo-video";
import React, { useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import DynamicIslandTest from "./components/Dynamicmenu";

const { width } = Dimensions.get("window");
const BANNER_HEIGHT = 350;

// Banner compacto (colapsado) — retangular no topo (um pouco maior, como pediste)
const BANNER_MIN_HEIGHT = 125;

const COLLAPSE_DISTANCE = BANNER_HEIGHT - BANNER_MIN_HEIGHT;

// “quanto” pode esticar ao puxar para baixo
const MAX_STRETCH = 220;

// ==================================================
// FUNÇÃO QUE DECIDE SE É IMAGEM OU VÍDEO
// ==================================================
function getMedia(src: string) {
  if (src.endsWith(".mp4")) {
    const player = useVideoPlayer(src, (p) => {
      p.loop = true;
      p.muted = true;
      p.play();
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

  return <Image source={{ uri: src }} style={styles.boxImage} />;
}

export default function ProfileScreen() {
  const scrollY = useRef(new Animated.Value(0)).current;

  // Banner cresce APENAS para baixo, com o topo fixo no ecrã (Apple Music / Spotify style)
  const bannerHeight = scrollY.interpolate({
    inputRange: [-MAX_STRETCH, 0, COLLAPSE_DISTANCE],
    outputRange: [
      BANNER_HEIGHT + MAX_STRETCH,
      BANNER_HEIGHT,
      BANNER_MIN_HEIGHT,
    ],
    extrapolate: "clamp",
  });

  // Zoom: mais visível no estado normal, zoom-in ao puxar, e MAIS zoom-out ao colapsar
  const imageScale = scrollY.interpolate({
    inputRange: [-MAX_STRETCH, 0, COLLAPSE_DISTANCE],
    outputRange: [1.35, 1.12, 1.22],
    extrapolate: "clamp",
  });

  // Ajuste de foco (para o rosto ficar mais visível)
  const imageTranslateY = scrollY.interpolate({
    inputRange: [-MAX_STRETCH, 0, COLLAPSE_DISTANCE],
    outputRange: [-22, -12, -8],
    extrapolate: "clamp",
  });

  // Cantos: colado aos cantos SEM aberturas (sempre 0)
  const bannerRadius = scrollY.interpolate({
    inputRange: [0, COLLAPSE_DISTANCE],
    outputRange: [0, 0],
    extrapolate: "clamp",
  });

  // Banner grande vai desaparecendo ao colapsar (mas não desaparece “a seco”)
  const bannerContentOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_DISTANCE * 0.6, COLLAPSE_DISTANCE],
    outputRange: [1, 0.35, 0],
    extrapolate: "clamp",
  });

  // Banner pequeno aparece no colapso com OS MESMOS textos/verified/follow
  const compactContentOpacity = scrollY.interpolate({
    inputRange: [COLLAPSE_DISTANCE * 0.55, COLLAPSE_DISTANCE],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // Para o conteúdo compacto “assentar” dentro da box sem escapar
  const compactContentTranslateY = scrollY.interpolate({
    inputRange: [COLLAPSE_DISTANCE * 0.55, COLLAPSE_DISTANCE],
    outputRange: [8, 0],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.root}>
      {/* ========================= */}
      {/* BANNER FIXO NO TOPO       */}
      {/* (topo não desce; só estica em baixo) */}
      {/* ========================= */}
      <Animated.View
        style={[
          styles.bannerFixed,
          {
            height: bannerHeight,
            borderTopLeftRadius: bannerRadius,
            borderTopRightRadius: bannerRadius,
          },
        ]}
      >
        {/* ========================= */}
        {/* FUNDO / AURA              */}
        {/* ========================= */}
        <View style={styles.bannerBackground} />

        {/* Imagem do artista (mais visível / melhor enquadramento) */}
        <Animated.Image
          source={{
            uri: "https://i.pinimg.com/1200x/b9/e8/db/b9e8db33168a26c9ca697a05ddc80937.jpg",
          }}
          style={[
            styles.bannerArtist,
            {
              transform: [
                { translateY: imageTranslateY },
                { scale: imageScale },
              ],
            },
          ]}
        />

        {/* Blur/overlay escuro — cobre SEMPRE a box inteira (também no mini banner) */}
        <Image
          source={require("../../icons/banner.png")}
          style={[styles.bannerArtist, styles.bannerOverlay]}
        />

        {/* Escurecimento extra suave para garantir legibilidade */}
        <View style={styles.bannerDarkOverlay} />

        {/* ========================= */}
        {/* CONTEÚDO — BANNER GRANDE  */}
        {/* (igual ao que tens, com follow + verified à esquerda) */}
        {/* ========================= */}
        <Animated.View
          style={[
            styles.bannerContent,
            { zIndex: 7, opacity: bannerContentOpacity },
          ]}
        >
          <View style={styles.bannerLeft}>
            <Text style={styles.artistName}>Artist name</Text>

            <View style={styles.artistRow}>
              <Text style={styles.artistStudio}>Studio Name</Text>

              <View style={styles.verifyBadge}>
                <Text style={styles.verifyText}>✓</Text>
              </View>
            </View>
          </View>

          <View style={styles.followButton}>
            <Text style={styles.followText}>Follow</Text>
          </View>
        </Animated.View>

        {/* ========================= */}
        {/* CONTEÚDO — BANNER PEQUENO */}
        {/* (MESMOS textos/verified/follow, sem aumentar o nome) */}
        {/* ========================= */}
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
            <Text style={styles.artistName}>Artist name</Text>

            <View style={styles.artistRow}>
              <Text style={styles.artistStudio}>Studio name</Text>

              <View style={styles.verifyBadge}>
                <Text style={styles.verifyText}>✓</Text>
              </View>
            </View>
          </View>

          <View style={styles.followButton}>
            <Text style={styles.followText}>Follow</Text>
          </View>
        </Animated.View>

        <View style={styles.bannerBottomFade} />
      </Animated.View>

      {/* ========================= */}
      {/* SCROLL DO CONTEÚDO        */}
      {/* (começa depois do banner) */}
      {/* ========================= */}
      <Animated.ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: 200,
        }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* Espaçador para o conteúdo acompanhar a altura do banner (stretch + collapse) */}
        <Animated.View style={{ height: bannerHeight }} />

        {/* ========================= */}
        {/* CONTEÚDO                  */}
        {/* ========================= */}
        <View style={styles.content}>
          {/* ========================= */}
          {/* STATS                     */}
          {/* ========================= */}
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statTitle}>Folowers</Text>
              <Text style={styles.statNumber}>0</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statTitle}>Albuns</Text>
              <Text style={styles.statNumber}>0</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statTitle}>Posts</Text>
              <Text style={styles.statNumber}>0</Text>
            </View>
          </View>

          {/* ========================= */}
          {/* LAST DROP                 */}
          {/* ========================= */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Last drop</Text>
          </View>

          <View style={styles.lastDropRow}>
            <View style={styles.lastDropCover}>
              <Image
                source={{
                  uri: "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
                }}
                style={styles.boxImage}
              />
            </View>

            <View style={styles.lastDropInfo}>
              <Text style={styles.lastDropTitle}>Album name</Text>
              <Text style={styles.lastDropSubtitle}>Single - 2025</Text>
            </View>
          </View>

          {/* ========================= */}
          {/* TOP 5                     */}
          {/* ========================= */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top 5</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.top5Scroll}
          >
            {[
              "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
              "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
              "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
              "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
            ].map((src, idx) => (
              <View key={idx} style={styles.topCard}>
                <View style={styles.topCardCover}>{getMedia(src)}</View>
                <Text style={styles.topCardTitle}>Name</Text>
                <Text style={styles.topCardSubtitle}>Album name - 2024</Text>
              </View>
            ))}
          </ScrollView>

          {/* ========================= */}
          {/* CRONOGRAMA                */}
          {/* ========================= */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Cronograma</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timelineScroll}
          >
            {[
              "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
              "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
              "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
            ].map((src, idx) => (
              <View key={idx} style={styles.timelineBlock}>
                <View style={styles.timelineCover}>{getMedia(src)}</View>
                <Text style={styles.timelineTitle}>Album name</Text>
                <Text style={styles.timelineSubtitle}>{2005 + idx * 2}</Text>
              </View>
            ))}
          </ScrollView>

          {/* ========================= */}
          {/* ALBUNS                    */}
          {/* ========================= */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Albuns</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.albumScroll}
          >
            {[
              "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
              "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
              "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
              "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
            ].map((src, idx) => (
              <View key={idx} style={styles.albumCardMusic}>
                <View style={styles.albumCoverLarge}>{getMedia(src)}</View>
                <Text style={styles.albumCardTitle}>Name</Text>

                <View style={styles.explicitRow}>
                  <View style={styles.explicitBadge}>
                    <Text style={styles.explicitText}>E</Text>
                  </View>
                  <Text style={styles.explicitYear}>{2025 - idx}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* ========================= */}
          {/* SINGLES                   */}
          {/* ========================= */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Singles</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.albumScroll}
          >
            {[
              "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
              "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
              "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
              "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
            ].map((src, idx) => (
              <View key={idx} style={styles.albumCardMusic}>
                <View style={styles.albumCoverLarge}>{getMedia(src)}</View>
                <Text style={styles.albumCardTitle}>Name</Text>

                <View style={styles.explicitRow}>
                  <View style={styles.explicitBadge}>
                    <Text style={styles.explicitText}>S</Text>
                  </View>
                  <Text style={styles.explicitYear}>{2025 - idx}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* ========================= */}
          {/* COLABS                    */}
          {/* ========================= */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Colabs</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.albumScroll}
          >
            {[
              "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
              "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
              "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
              "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
            ].map((src, idx) => (
              <View key={idx} style={styles.albumCardMusic}>
                <View style={styles.albumCoverLarge}>{getMedia(src)}</View>
                <Text style={styles.albumCardTitle}>Name (feat.)</Text>

                <View style={styles.explicitRow}>
                  <View style={styles.explicitBadge}>
                    <Text style={styles.explicitText}>C</Text>
                  </View>
                  <Text style={styles.explicitYear}>{2025 - idx}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* ========================= */}
          {/* BIO                       */}
          {/* ========================= */}
          <View style={styles.bioSection}>
            <Text style={styles.bioTitle}>Artist name</Text>

            <Text style={styles.bioText}>BIO details...</Text>

            <Text style={styles.bioDetail}>Full name: Artist name full.</Text>
            <Text style={styles.bioDetail}>Birth date: DD/MM/YYYY.</Text>
            <Text style={styles.bioDetail}>
              Styles artist: ,pop, funk, etc...
            </Text>
          </View>

          {/* ========================= */}
          {/* LOGO                      */}
          {/* ========================= */}
          <View style={styles.logoWrapper}>
            <View style={styles.brandLogo}>
              <Image
                source={{
                  uri: "https://www.iconsdb.com/icons/preview/white/nike-xxl.png",
                }}
                style={styles.boxImage}
              />
            </View>
          </View>

          {/* ========================= */}
          {/* NEW DROPS (IMAGEM/VÍDEO)  */}
          {/* ========================= */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>New Drops</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.fashionScroll}
          >
            {[
              "https://kitqueen.co.uk/cdn/shop/files/Navy_96e51aa8-74f2-41ad-af5a-37c60af73c54.png?v=1683196276&width=1500",
              "https://kitqueen.co.uk/cdn/shop/files/Navy_96e51aa8-74f2-41ad-af5a-37c60af73c54.png?v=1683196276&width=1500",
              "https://kitqueen.co.uk/cdn/shop/files/Navy_96e51aa8-74f2-41ad-af5a-37c60af73c54.png?v=1683196276&width=1500",
              "https://kitqueen.co.uk/cdn/shop/files/Navy_96e51aa8-74f2-41ad-af5a-37c60af73c54.png?v=1683196276&width=1500",
            ].map((src, idx) => (
              <View key={idx} style={styles.fashionCard}>
                <View style={styles.fashionImage}>{getMedia(src)}</View>
                <Text style={styles.fashionTitle}>Name</Text>
              </View>
            ))}
          </ScrollView>

          {/* ========================= */}
          {/* MOST POPULAR              */}
          {/* ========================= */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Most Popular</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.fashionScroll}
          >
            {[
              "https://kitqueen.co.uk/cdn/shop/files/Navy_96e51aa8-74f2-41ad-af5a-37c60af73c54.png?v=1683196276&width=1500",
              "https://kitqueen.co.uk/cdn/shop/files/Navy_96e51aa8-74f2-41ad-af5a-37c60af73c54.png?v=1683196276&width=1500",
              "https://kitqueen.co.uk/cdn/shop/files/Navy_96e51aa8-74f2-41ad-af5a-37c60af73c54.png?v=1683196276&width=1500",
              "https://kitqueen.co.uk/cdn/shop/files/Navy_96e51aa8-74f2-41ad-af5a-37c60af73c54.png?v=1683196276&width=1500",
            ].map((src, idx) => (
              <View key={idx} style={styles.fashionCard}>
                <View style={styles.fashionImage}>{getMedia(src)}</View>
                <Text style={styles.fashionTitle}>Name</Text>
              </View>
            ))}
          </ScrollView>

          {/* ========================= */}
          {/* GALERY                    */}
          {/* ========================= */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Galery</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.fashionScroll}
          >
            {[
              "https://i.pinimg.com/736x/8d/dc/29/8ddc29e3bbdadf33fc22ca5ffa23d59d.jpg",
              "https://i.pinimg.com/736x/8d/dc/29/8ddc29e3bbdadf33fc22ca5ffa23d59d.jpg",
              "https://i.pinimg.com/736x/8d/dc/29/8ddc29e3bbdadf33fc22ca5ffa23d59d.jpg",
              "https://i.pinimg.com/736x/8d/dc/29/8ddc29e3bbdadf33fc22ca5ffa23d59d.jpg",
            ].map((src, idx) => (
              <View key={idx} style={styles.fashionCard}>
                <View style={styles.fashionImage}>{getMedia(src)}</View>
              </View>
            ))}
          </ScrollView>

          {/* ========================= */}
          {/* POSTS                     */}
          {/* ========================= */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Posts</Text>
          </View>

          <View style={styles.postsGrid}>
            {[
              "https://i.pinimg.com/1200x/f4/2f/59/f42f595b9b6b0b9cc8269e4a84364707.jpg",
              "https://i.pinimg.com/736x/db/e4/e9/dbe4e9c0ad2e6b765afd45996620c9a9.jpg",
              "https://i.pinimg.com/736x/cf/c0/09/cfc009b2b7b681a548898b70fe68c8ae.jpg",
            ].map((src, idx) => (
              <View key={idx} style={styles.postBlock}>
                {getMedia(src)}
              </View>
            ))}
          </View>
        </View>
      </Animated.ScrollView>
      <DynamicIslandTest />
    </View>
  );
}

//
// ==================================================
// STYLES
// ==================================================
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  container: { flex: 1 },

  // banner agora é fixo no topo — colado aos cantos/ lados (sem aberturas)
  bannerFixed: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    zIndex: 10,
    backgroundColor: "#000",
    borderEndEndRadius: 20,
    borderEndStartRadius: 20,
  },

  // mantém a mesma imagem do banner, mas agora ocupa 100% do bannerFixed
  bannerArtist: { width: "100%", height: "100%", resizeMode: "cover" },

  bannerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  // camada extra para reforçar o “blur escuro” (texto/botão sempre legíveis)
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

  // Conteúdo compacto: MESMA estrutura à esquerda + follow, mas encaixado no mini banner
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

  bannerLeft: {},
  // Não aumentar o texto do nome (mantido como no teu original)
  artistName: { color: "#FFF", fontSize: 32, fontWeight: "800" },
  artistRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  artistStudio: { color: "#FFF", fontSize: 14, opacity: 0.95 },

  verifyBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  verifyText: { color: "#FFF", fontWeight: "800", fontSize: 11 },

  // Follow mais escuro (como pediste)
  followButton: {
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 26,
  },
  followText: { color: "#FFF", fontWeight: "700", fontSize: 15 },

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
    height: BANNER_HEIGHT * 0.35,
    zIndex: 4,
  },

  content: { paddingTop: 20 },

  // STATS
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  statBlock: { alignItems: "center" },
  statTitle: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  statNumber: { color: "#FFF", fontSize: 16 },

  // HEADERS
  sectionHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  sectionTitle: { color: "#FFF", fontSize: 20, fontWeight: "700" },

  // LAST DROP
  lastDropRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  lastDropCover: {
    width: 90,
    height: 90,
    borderRadius: 22,
    overflow: "hidden",
    marginRight: 20,
  },

  lastDropInfo: { flexShrink: 1 },

  lastDropTitle: { color: "#FFF", fontSize: 22, fontWeight: "800" },
  lastDropSubtitle: { color: "#777", fontSize: 14 },

  // TOP 5
  top5Scroll: { paddingHorizontal: 20 },

  topCard: { width: 120, marginRight: 16 },

  topCardCover: {
    width: "100%",
    height: 120,
    borderRadius: 22,
    overflow: "hidden",
  },

  topCardTitle: { color: "#FFF", marginTop: 6, fontWeight: "700" },
  topCardSubtitle: { color: "#777" },

  // CRONOGRAMA
  timelineScroll: { paddingHorizontal: 20, paddingVertical: 20 },

  timelineBlock: { marginRight: 20, width: 180 },

  timelineCover: {
    width: "100%",
    height: 180,
    borderRadius: 22,
    overflow: "hidden",
  },

  timelineTitle: { color: "#FFF", marginTop: 6, fontWeight: "700" },
  timelineSubtitle: { color: "#777" },

  // ALBUMS
  albumScroll: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: "row",
  },

  albumCardMusic: { width: 140, marginRight: 20 },

  albumCoverLarge: {
    width: "100%",
    height: 140,
    borderRadius: 22,
    overflow: "hidden",
  },

  albumCardTitle: { color: "#FFF", marginTop: 6, fontWeight: "700" },

  explicitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  explicitBadge: {
    backgroundColor: "#333",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  explicitText: { color: "#FFF", fontSize: 12, fontWeight: "800" },
  explicitYear: { color: "#777", fontSize: 14 },

  // BIO
  bioSection: { paddingHorizontal: 20, paddingVertical: 20 },

  bioTitle: { color: "#FFF", fontSize: 22, fontWeight: "800" },
  bioText: { color: "#DDD", marginTop: 10, lineHeight: 22 },
  bioDetail: { color: "#FFF", marginTop: 12, fontSize: 15 },

  // LOGO
  logoWrapper: { alignItems: "center", marginVertical: 300 },

  brandLogo: {
    width: 120,
    height: 120,
    borderRadius: 20,
    overflow: "hidden",
  },

  // FASHION
  fashionScroll: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: "row",
  },

  fashionCard: { width: 160, marginRight: 20 },

  fashionImage: {
    width: "100%",
    height: 220,
    borderRadius: 22,
    overflow: "hidden",
  },

  fashionTitle: { color: "#FFF", marginTop: 6, fontWeight: "700" },

  // POSTS
  postsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },

  postBlock: {
    width: (width - 20 * 2 - 10) / 3,
    height: 200,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 10,
  },

  // UNIVERSAL
  boxImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
});
