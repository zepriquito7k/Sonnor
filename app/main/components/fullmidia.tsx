import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { ResizeMode, Video } from "expo-av";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { formatMediaTime, useSharedMediaProgress } from "./SharedMediaProgress";

const { width, height } = Dimensions.get("window");
const ART_SIZE = width * 0.9;
const ARTIST_PANEL_EXPAND_DISTANCE = 320;
// Ajusta aqui a altura do menu inteiro:
// diminui este valor para descer o menu, aumenta para subir.
const ARTIST_PANEL_BOTTOM = -35;
const SHEET_HANDLE_TOUCH_HEIGHT = 52;
const ARTIST_PANEL_PEEK_HEIGHT = 104;
// Nota: o painel do artista usa translateY em vez de animar height,
// porque height não é suportado pelo native animated module neste fluxo.
const ARTIST_PANEL_MAX_HEIGHT = height * 0.68;
const ARTIST_PANEL_TRAVEL = Math.max(
  0,
  ARTIST_PANEL_MAX_HEIGHT - ARTIST_PANEL_PEEK_HEIGHT,
);

export default function FullMidia() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const [isArtistSheetScrollable, setIsArtistSheetScrollable] = useState(false);
  const [liked, setLiked] = useState(false);
  const [following, setFollowing] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<"artist" | "music" | null>(
    null,
  );
  const [reportReason, setReportReason] = useState("");
  const {
    progress,
    currentTime,
    duration,
    isPlaying,
    setProgress,
    togglePlayback,
  } = useSharedMediaProgress();

  const boxAnim = useRef(new Animated.Value(1)).current;
  const controlsAnim = useRef(new Animated.Value(0)).current;
  const blurAnim = useRef(new Animated.Value(0)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;
  const artistSheetAnim = useRef(new Animated.Value(0)).current;
  const artistContentScrollY = useRef(new Animated.Value(0)).current;
  const artistSheetProgress = useRef(0);
  const artistSheetDragStart = useRef(0);

  useEffect(() => {
    const listener = artistSheetAnim.addListener(({ value }) => {
      artistSheetProgress.current = value;
      setIsArtistSheetScrollable(value > 0.96);
    });

    return () => {
      artistSheetAnim.removeListener(listener);
    };
  }, [artistSheetAnim]);

  const snapArtistSheet = (toValue: 0 | 1) => {
    Animated.timing(artistSheetAnim, {
      toValue,
      duration: 260,
      useNativeDriver: true,
    }).start();
  };

  const artistSheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 2 &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderGrant: () => {
        artistSheetAnim.stopAnimation((value) => {
          artistSheetProgress.current = value;
          artistSheetDragStart.current = value;
        });
      },
      onPanResponderMove: (_, gestureState) => {
        const nextValue =
          artistSheetDragStart.current -
          gestureState.dy / ARTIST_PANEL_EXPAND_DISTANCE;

        artistSheetAnim.setValue(Math.max(0, Math.min(1, nextValue)));
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldExpand =
          gestureState.dy < -35 ||
          (gestureState.dy < 18 && artistSheetProgress.current > 0.5);

        snapArtistSheet(shouldExpand ? 1 : 0);
      },
      onPanResponderTerminate: () => {
        snapArtistSheet(artistSheetProgress.current > 0.5 ? 1 : 0);
      },
    }),
  ).current;

  const toggleView = () => {
    blurAnim.setValue(1);

    Animated.parallel([
      Animated.timing(boxAnim, {
        toValue: expanded ? 0 : 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(controlsAnim, {
        toValue: expanded ? 1 : 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(bgAnim, {
        toValue: expanded ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.timing(blurAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });

    setExpanded(!expanded);
  };

  const panelTranslate = controlsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 140],
  });

  const boxScale = boxAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });

  const artistSheetTranslateY = artistSheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [ARTIST_PANEL_TRAVEL, 0],
  });

  const artistDetailsOpacity = artistSheetAnim.interpolate({
    inputRange: [0, 0.18, 0.42, 1],
    outputRange: [0, 0, 0.3, 1],
  });

  const artistDetailsTranslate = artistSheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [26, 0],
  });

  const blurOverlayOpacity = Animated.add(
    blurAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.18],
    }),
    artistSheetAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.18, 0.52],
    }),
  );

  const artistCardOpacity = artistContentScrollY.interpolate({
    inputRange: [0, 24, 72],
    outputRange: [1, 0.5, 0],
    extrapolate: "clamp",
  });

  const artistCardTranslate = artistContentScrollY.interpolate({
    inputRange: [0, 72],
    outputRange: [0, -18],
    extrapolate: "clamp",
  });

  function skipTrack(step: number) {
    setProgress(Math.min(1, Math.max(0, progress + step)));
  }

  function openComments() {
    Alert.alert(
      "Comentários",
      "Aqui podes abrir a conversa do lançamento e responder ao público.",
    );
  }

  function openCredits() {
    Alert.alert(
      "Créditos da faixa",
      "Produção: Studio Name\nComposição: Artist Name\nDireção visual: Sonnor Team",
    );
  }

  return (
    <Pressable
      style={styles.container}
      onPress={!expanded ? toggleView : undefined}
    >
      <Animated.View
        style={{
          position: "absolute",
          width,
          height,
          opacity: bgAnim,
        }}
      >
        <Video
          source={require("../../../assets/From KlickPin CF malcolm _ Malcolm Cool gifs Type.mp4")}
          style={{ width, height }}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted
        />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { opacity: blurOverlayOpacity }]}
      >
        <BlurView tint="dark" intensity={45} style={{ flex: 1 }} />
      </Animated.View>

      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={30} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>User name</Text>
        <Pressable onPress={openComments}>
          <Ionicons name="chatbubble-outline" size={25} color="#fff" />
        </Pressable>
      </View>

      <Animated.View
        style={[
          styles.artworkWrapper,
          {
            opacity: boxAnim,
            transform: [{ scale: boxScale }],
          },
        ]}
      >
        <Pressable onPress={toggleView}>
          <Image
            source={{
              uri: "https://i.pinimg.com/736x/17/c5/01/17c5017285bc72806ff99176f8d1051b.jpg",
            }}
            style={styles.artwork}
          />
        </Pressable>
      </Animated.View>

      <Animated.View
        style={[
          styles.mainContent,
          { transform: [{ translateY: panelTranslate }] },
        ]}
      >
        <View style={styles.info}>
          <View>
            <Text style={styles.music}>Music name</Text>
            <Text style={styles.user}>user name</Text>
          </View>
          <View style={styles.icons}>
            <Pressable onPress={openCredits}>
              <Ionicons name="musical-note-outline" size={32} color="#fff" />
            </Pressable>
            <Pressable onPress={() => setLiked((current) => !current)}>
              <Ionicons
                name={liked ? "heart" : "heart-outline"}
                size={32}
                color={liked ? "#ff5774" : "#fff"}
              />
            </Pressable>
            <Ionicons name="reorder-four-outline" size={32} color="#fff" />
          </View>
        </View>

        <View style={styles.slider}>
          <Slider
            minimumValue={0}
            maximumValue={1}
            value={progress}
            onValueChange={setProgress}
            minimumTrackTintColor="#fff"
            maximumTrackTintColor="rgba(255,255,255,0.3)"
            thumbTintColor="#fff"
          />
          <View style={styles.timeWrapper}>
            <Text style={styles.time}>{formatMediaTime(currentTime)}</Text>
            <Text style={styles.time}>{formatMediaTime(duration)}</Text>
          </View>
        </View>

        {expanded && (
          <View style={styles.controls}>
            <Pressable onPress={() => skipTrack(-0.1)}>
              <Ionicons name="play-back" size={60} color="#fff" />
            </Pressable>
            <Pressable onPress={togglePlayback}>
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={60}
                color="#fff"
              />
            </Pressable>
            <Pressable onPress={() => skipTrack(0.1)}>
              <Ionicons name="play-forward" size={60} color="#fff" />
            </Pressable>
          </View>
        )}
      </Animated.View>

      <Animated.View
        style={[
          styles.sheetGestureHandle,
          {
            transform: [{ translateY: artistSheetTranslateY }],
          },
        ]}
        {...artistSheetPanResponder.panHandlers}
      >
        <View style={styles.homeIndicator} />
      </Animated.View>

      <Animated.View
        style={[
          styles.bottomBar,
          {
            height: ARTIST_PANEL_MAX_HEIGHT,
            transform: [{ translateY: artistSheetTranslateY }],
          },
        ]}
      >
        <View style={styles.sheetTopSpacer} />
        <Animated.View
          style={{
            width: "100%",
            opacity: artistCardOpacity,
            transform: [{ translateY: artistCardTranslate }],
          }}
        >
          <View style={styles.artistCard}>
            <Image
              source={{
                uri: "https://i.pinimg.com/736x/17/c5/01/17c5017285bc72806ff99176f8d1051b.jpg",
              }}
              style={styles.artistAvatar}
            />

            <View style={styles.artistInfo}>
              <Text style={styles.artistLabel}>Sobre o artista</Text>
              <Text style={styles.artistName}>User name</Text>
              <Text style={styles.artistMeta}>12,4 M ouvintes mensais</Text>
            </View>

            <Pressable
              style={styles.followButton}
              onPress={() => setFollowing((current) => !current)}
            >
              <Text style={styles.followButtonText}>
                {following ? "A seguir" : "Seguir"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.artistExtraContent,
            {
              opacity: artistDetailsOpacity,
              transform: [{ translateY: artistDetailsTranslate }],
            },
          ]}
        >
          <View style={styles.artistSectionHeader}>
            <Text style={styles.artistSectionTitle}>Perfil do artista</Text>
            <Text style={styles.artistSectionHint}>Desliza para ver mais</Text>
          </View>

          <Animated.ScrollView
            showsVerticalScrollIndicator
            bounces
            nestedScrollEnabled
            scrollEnabled={isArtistSheetScrollable}
            style={styles.artistScrollView}
            contentContainerStyle={styles.artistScrollContent}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: artistContentScrollY } } }],
              { useNativeDriver: true },
            )}
            scrollEventThrottle={16}
          >
            <Text style={styles.artistBio}>
              Artista versatil com uma mistura de pop, R&B e visuals marcantes.
              Lanca sons cinematicos, atua ao vivo com frequencia e tem uma
              identidade muito forte nas redes.
            </Text>

            <View style={styles.artistQuickFacts}>
              <View style={styles.artistFactItem}>
                <Text style={styles.artistFactLabel}>Origem</Text>
                <Text style={styles.artistFactValue}>Lisboa, Portugal</Text>
              </View>
              <View style={styles.artistFactItem}>
                <Text style={styles.artistFactLabel}>Genero</Text>
                <Text style={styles.artistFactValue}>Pop alternativo</Text>
              </View>
              <View style={styles.artistFactItem}>
                <Text style={styles.artistFactLabel}>Atividade</Text>
                <Text style={styles.artistFactValue}>2018 - presente</Text>
              </View>
            </View>

            <View style={styles.artistStatsRow}>
              <View style={styles.artistStat}>
                <Text style={styles.artistStatNumber}>4</Text>
                <Text style={styles.artistStatLabel}>Albuns</Text>
              </View>
              <View style={styles.artistStat}>
                <Text style={styles.artistStatNumber}>38</Text>
                <Text style={styles.artistStatLabel}>Singles</Text>
              </View>
              <View style={styles.artistStat}>
                <Text style={styles.artistStatNumber}>#12</Text>
                <Text style={styles.artistStatLabel}>Top chart</Text>
              </View>
            </View>

            <View style={styles.artistHighlightCard}>
              <Text style={styles.artistHighlightTitle}>Em destaque</Text>
              <Text style={styles.artistHighlightText}>
                Top faixa: Music Name • Ultimo lancamento ha 2 semanas
              </Text>
              <Text style={styles.artistHighlightSubtext}>
                Lisboa, Portugal • Pop alternativo • Turne ativa
              </Text>
            </View>

            <View style={styles.artistHighlightCard}>
              <Text style={styles.artistHighlightTitle}>Mais sobre</Text>
              <Text style={styles.artistHighlightText}>
                3 premios recentes, 2 colaboracoes internacionais e uma nova era
                visual em preparacao.
              </Text>
              <Text style={styles.artistHighlightSubtext}>
                Ultimo concerto: Porto • Proximo drop: sexta-feira
              </Text>
            </View>

            <View style={styles.artistHighlightCard}>
              <Text style={styles.artistHighlightTitle}>Comunidade</Text>
              <Text style={styles.artistHighlightText}>
                1,8 M seguidores, 245 M streams no ultimo ano e destaque em 14
                playlists editoriais.
              </Text>
              <Text style={styles.artistHighlightSubtext}>
                Fanbase forte em Lisboa, Porto, Madrid e Paris
              </Text>
            </View>

            <View style={styles.artistHighlightCard}>
              <Text style={styles.artistHighlightTitle}>Proximos passos</Text>
              <Text style={styles.artistHighlightText}>
                Novo videoclip em producao, collab internacional confirmada e
                possivel deluxe version a caminho.
              </Text>
              <Text style={styles.artistHighlightSubtext}>
                Atualizado hoje • Equipa criativa ativa
              </Text>
            </View>

            <View style={styles.artistHighlightCard}>
              <Text style={styles.artistHighlightTitle}>
                Discografia em foco
              </Text>
              <Text style={styles.artistHighlightText}>
                2 projetos de estudio, 1 deluxe edition, 6 faixas a crescer esta
                semana e 3 colaboracoes com artistas internacionais.
              </Text>
              <Text style={styles.artistHighlightSubtext}>
                Catalogo em expansao • Melhor fase comercial
              </Text>
            </View>

            <View style={styles.artistHighlightCard}>
              <Text style={styles.artistHighlightTitle}>Presenca digital</Text>
              <Text style={styles.artistHighlightText}>
                Conteudo novo quase todos os dias, visual identity forte e uma
                comunidade muito ativa nos reels e nos lives.
              </Text>
              <Text style={styles.artistHighlightSubtext}>
                Engagement alto • Marca pessoal bem definida
              </Text>
            </View>

            <View style={styles.artistHighlightCard}>
              <Text style={styles.artistHighlightTitle}>Equipa e producao</Text>
              <Text style={styles.artistHighlightText}>
                Producao executiva, direcao criativa, styling e realizacao de
                video alinhados para a proxima era do artista.
              </Text>
              <Text style={styles.artistHighlightSubtext}>
                Session em estudio marcada para esta semana
              </Text>
            </View>

            <View style={styles.artistHighlightCard}>
              <Text style={styles.artistHighlightTitle}>Impacto ao vivo</Text>
              <Text style={styles.artistHighlightText}>
                27 datas concluídas no último ciclo, média alta de retenção em
                palco e uma direção visual muito forte nos concertos.
              </Text>
              <Text style={styles.artistHighlightSubtext}>
                Festival season ativa • Procura em crescimento
              </Text>
            </View>

            <View style={styles.artistHighlightCard}>
              <Text style={styles.artistHighlightTitle}>Colaborações</Text>
              <Text style={styles.artistHighlightText}>
                Feats com produtores de pop, trap e R&B, além de parcerias com
                stylists e realizadores para reforçar a identidade da era.
              </Text>
              <Text style={styles.artistHighlightSubtext}>
                Novas collabs em negociação
              </Text>
            </View>

            <View style={styles.artistHighlightCard}>
              <Text style={styles.artistHighlightTitle}>Notas da equipa</Text>
              <Text style={styles.artistHighlightText}>
                Prioridade atual em posicionamento editorial, narrativa visual,
                consistência de lançamento e expansão da comunidade.
              </Text>
              <Text style={styles.artistHighlightSubtext}>
                Planeamento estratégico atualizado esta semana
              </Text>
            </View>

            <View style={styles.artistHighlightCard}>
              <Text style={styles.artistHighlightTitle}>Faixas populares</Text>
              <Text style={styles.artistHighlightText}>1. Music Name</Text>
              <Text style={styles.artistHighlightText}>2. Midnight Echo</Text>
              <Text style={styles.artistHighlightText}>3. Velvet Lights</Text>
              <Text style={styles.artistHighlightSubtext}>
                Top atual com base nos streams recentes
              </Text>
            </View>

            <View style={styles.artistHighlightCard}>
              <Text style={styles.artistHighlightTitle}>
                Próximos lançamentos
              </Text>
              <Text style={styles.artistHighlightText}>
                Novo single em master final, visualizer em produção e campanha
                social já em preparação.
              </Text>
              <Text style={styles.artistHighlightSubtext}>
                Planeado para as próximas semanas
              </Text>
            </View>

            <View style={styles.artistHighlightCard}>
              <Text style={styles.artistHighlightTitle}>Resumo da era</Text>
              <Text style={styles.artistHighlightText}>
                Estética noturna, som emocional, forte identidade visual e foco
                em crescimento orgânico de comunidade e catálogo.
              </Text>
              <Text style={styles.artistHighlightSubtext}>
                Direção artística alinhada com os próximos drops
              </Text>
            </View>

            <View style={styles.artistHighlightCard}>
              <Text style={styles.artistHighlightTitle}>Agenda</Text>
              <Text style={styles.artistHighlightText}>
                Sessão de estúdio marcada para quarta, gravação de conteúdo no
                fim de semana e reunião criativa para o próximo visual.
              </Text>
              <Text style={styles.artistHighlightSubtext}>
                Semana focada em produção e comunicação
              </Text>
            </View>

            <View style={styles.artistHighlightCard}>
              <Text style={styles.artistHighlightTitle}>
                Highlights recentes
              </Text>
              <Text style={styles.artistHighlightText}>
                Crescimento de streams, melhor retenção em vídeo curto e
                resposta mais forte da comunidade aos últimos drops.
              </Text>
              <Text style={styles.artistHighlightSubtext}>
                Momentum positivo nas plataformas
              </Text>
            </View>

            <View style={styles.artistHighlightCard}>
              <Text style={styles.artistHighlightTitle}>Próxima fase</Text>
              <Text style={styles.artistHighlightText}>
                Expansão visual, novos feats, narrativa mais forte e lançamentos
                mais regulares para consolidar a nova era.
              </Text>
              <Text style={styles.artistHighlightSubtext}>
                Estratégia pronta para execução
              </Text>
            </View>
          </Animated.ScrollView>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#860251ff",
    paddingTop: 60,
  },
  mainContent: {
    paddingBottom: 122,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 50,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "400",
  },
  artworkWrapper: {
    alignItems: "center",
    marginBottom: 50,
  },
  artwork: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: 18,
    backgroundColor: "#000",
  },
  info: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 25,
    marginBottom: -5,
  },
  music: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  user: {
    color: "#aaa",
    fontSize: 15,
  },
  icons: {
    flexDirection: "row",
    gap: 16,
  },
  slider: {
    paddingHorizontal: 25,
    marginBottom: 40,
  },
  time: {
    color: "#fff",
    fontSize: 12,
    marginTop: -6,
    alignSelf: "flex-end",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 26,
  },
  sheetGestureHandle: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom:
      ARTIST_PANEL_BOTTOM + ARTIST_PANEL_MAX_HEIGHT - SHEET_HANDLE_TOUCH_HEIGHT,
    height: SHEET_HANDLE_TOUCH_HEIGHT,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 10,
    zIndex: 60,
    elevation: 60,
  },
  bottomBar: {
    position: "absolute",
    // Ajusta aqui a posicao vertical do corpo "Sobre o artista".
    bottom: ARTIST_PANEL_BOTTOM,
    left: 0,
    right: 0,
    backgroundColor: "rgba(8,8,8,0.96)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    alignItems: "center",
    paddingTop: 14,
    paddingHorizontal: 18,
    paddingBottom: 18,
    overflow: "hidden",
    zIndex: 40,
    elevation: 40,
  },
  homeIndicator: {
    width: 120,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#fff",
    opacity: 0.9,
  },
  sheetTopSpacer: {
    width: "100%",
    height: SHEET_HANDLE_TOUCH_HEIGHT - 6,
  },
  artistCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    padding: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  artistAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#222",
  },
  artistInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  artistLabel: {
    color: "#bdbdbd",
    fontSize: 11,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  artistName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  artistMeta: {
    color: "#b3b3b3",
    fontSize: 11,
  },
  followButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  followButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  artistExtraContent: {
    width: "100%",
    marginTop: 10,
    flex: 1,
  },
  artistSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  artistSectionTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  artistSectionHint: {
    color: "#9f9f9f",
    fontSize: 11,
  },
  artistScrollView: {
    flex: 1,
  },
  artistScrollContent: {
    paddingBottom: 560,
  },
  artistBio: {
    color: "#d3d3d3",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  artistQuickFacts: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginBottom: 14,
    gap: 10,
  },
  artistFactItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  artistFactLabel: {
    color: "#9f9f9f",
    fontSize: 12,
  },
  artistFactValue: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  artistStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 10,
  },
  artistStat: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
  },
  artistStatNumber: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  artistStatLabel: {
    color: "#b3b3b3",
    fontSize: 11,
  },
  artistHighlightCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginBottom: 12,
  },
  artistHighlightTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  artistHighlightText: {
    color: "#d8d8d8",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  artistHighlightSubtext: {
    color: "#9f9f9f",
    fontSize: 11,
    lineHeight: 16,
  },
  timeWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 5,
  },
});
