import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  Image,
  LayoutChangeEvent,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  PanGestureHandlerStateChangeEvent,
  PinchGestureHandler,
  PinchGestureHandlerGestureEvent,
  PinchGestureHandlerStateChangeEvent,
  State,
} from "react-native-gesture-handler";

import {
  pickLibraryAsset,
  pickLibraryImages,
} from "../../../../utils/mediaPicker";

const MAX_CHARS = 180;
const OVERLAY_STAGE_SIZE = 168;
const TRASH_ZONE_SIZE = 88;

type FilterType = "none" | "bw" | "warm" | "cool";

type OverlayItem = {
  id: string;
  uri: string;
  x: number;
  y: number;
  scale: number;
  baseWidth: number;
  baseHeight: number;
};

type ReadySong = {
  id: string;
  title: string;
  artist: string;
  release: string;
  duration: string;
  cover: string;
};

const READY_SONGS: ReadySong[] = [
  {
    id: "noites-de-neon",
    title: "Noites de Neon",
    artist: "Artist Name",
    release: "Neon Dreams",
    duration: "3:24",
    cover:
      "https://i.pinimg.com/1200x/f5/8d/79/f58d797b9db7094bed77987ec32cc954.jpg",
  },
  {
    id: "velvet-city",
    title: "Velvet City",
    artist: "Artist Name",
    release: "Neon Dreams",
    duration: "2:58",
    cover:
      "https://i.pinimg.com/1200x/f4/2f/59/f42f595b9b6b0b9cc8269e4a84364707.jpg",
  },
  {
    id: "afterlight",
    title: "Afterlight",
    artist: "Artist Name",
    release: "Neon Dreams",
    duration: "3:11",
    cover:
      "https://i.pinimg.com/1200x/8d/dc/29/8ddc29e3bbdadf33fc22ca5ffa23d59d.jpg",
  },
  {
    id: "late-hours",
    title: "Late Hours",
    artist: "Artist Name",
    release: "Midnight Avenue",
    duration: "3:18",
    cover:
      "https://i.pinimg.com/1200x/8f/2a/0b/8f2a0b7b1f8a4d7f1b3c2d9e0f1a2b3c.jpg",
  },
  {
    id: "electric-sleep",
    title: "Electric Sleep",
    artist: "Artist Name",
    release: "Midnight Avenue",
    duration: "3:02",
    cover:
      "https://i.pinimg.com/1200x/1a/6c/3d/1a6c3d7b8c9d0e1f2a3b4c5d6e7f8a9b.jpg",
  },
  {
    id: "slow-motion",
    title: "Slow Motion",
    artist: "Artist Name",
    release: "Midnight Avenue",
    duration: "3:37",
    cover:
      "https://i.pinimg.com/1200x/7c/1f/2d/7c1f2d8b8b4f5d91f0c7c0a9a2b6d7e1.jpg",
  },
];

function clampScale(value: number) {
  return Math.max(0.25, Math.min(value, 5));
}

function getOverlayBaseSize(uri: string) {
  return new Promise<{ baseWidth: number; baseHeight: number }>((resolve) => {
    Image.getSize(
      uri,
      (width, height) => {
        if (!width || !height) {
          resolve({
            baseWidth: OVERLAY_STAGE_SIZE,
            baseHeight: OVERLAY_STAGE_SIZE,
          });
          return;
        }

        const fitScale = Math.min(
          OVERLAY_STAGE_SIZE / width,
          OVERLAY_STAGE_SIZE / height,
        );

        resolve({
          baseWidth: width * fitScale,
          baseHeight: height * fitScale,
        });
      },
      () =>
        resolve({
          baseWidth: OVERLAY_STAGE_SIZE,
          baseHeight: OVERLAY_STAGE_SIZE,
        }),
    );
  });
}

export default function CreatePostScreen() {
  const router = useRouter();
  const [baseUri, setBaseUri] = useState<string | null>(null);
  const [baseType, setBaseType] = useState<"image" | "video" | null>(null);
  const [baseScale, setBaseScale] = useState(1);
  const baseScaleStart = useRef(1);
  const [overlayItems, setOverlayItems] = useState<OverlayItem[]>([]);
  const overlayDragStart = useRef<Record<string, { x: number; y: number }>>({});
  const overlayScaleStart = useRef<Record<string, number>>({});
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [draggingOverlayId, setDraggingOverlayId] = useState<string | null>(
    null,
  );
  const [isOverlayDragging, setIsOverlayDragging] = useState(false);
  const [isTrashTargetActive, setIsTrashTargetActive] = useState(false);
  const [caption, setCaption] = useState("");
  const [typing, setTyping] = useState(false);
  const [songMenuVisible, setSongMenuVisible] = useState(false);
  const [songQuery, setSongQuery] = useState("");
  const [selectedSong, setSelectedSong] = useState<ReadySong | null>(null);
  const [captionHasWrap, setCaptionHasWrap] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [filter, setFilter] = useState<FilterType>("none");
  const dragUiOpacity = useRef(new Animated.Value(1)).current;

  const filteredSongs = useMemo(() => {
    const normalizedQuery = songQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return READY_SONGS;
    }

    return READY_SONGS.filter((song) => {
      const haystacks = [song.title, song.artist, song.release].map((value) =>
        value.toLowerCase(),
      );

      return haystacks.some((value) => value.includes(normalizedQuery));
    });
  }, [songQuery]);

  useEffect(() => {
    setConfirmed(false);
  }, [
    baseUri,
    baseType,
    baseScale,
    overlayItems,
    caption,
    filter,
    selectedSong,
  ]);

  useEffect(() => {
    if (!caption) {
      setCaptionHasWrap(false);
    }
  }, [caption]);

  const animateDragUi = useCallback(
    (targetOpacity: number, duration: number) => {
      dragUiOpacity.stopAnimation();
      Animated.timing(dragUiOpacity, {
        toValue: targetOpacity,
        duration,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && targetOpacity === 1) {
          dragUiOpacity.setValue(1);
        }
      });
    },
    [dragUiOpacity],
  );

  function showDragVisuals(overlayId: string) {
    setIsOverlayDragging(true);
    setDraggingOverlayId(overlayId);
    animateDragUi(0.18, 160);
  }

  function hideDragVisuals() {
    setIsOverlayDragging(false);
    setDraggingOverlayId(null);
    setIsTrashTargetActive(false);
    animateDragUi(1, 220);
  }

  function getInitialOverlayPosition(
    index: number,
    overlayWidth = OVERLAY_STAGE_SIZE,
    overlayHeight = OVERLAY_STAGE_SIZE,
  ) {
    const centerX = previewSize.width / 2 - overlayWidth / 2;
    const centerY = previewSize.height / 2 - overlayHeight / 2;

    return {
      x: (previewSize.width ? centerX : 90) + (index % 3) * 16,
      y: (previewSize.height ? centerY : 120) + Math.floor(index / 3) * 14,
    };
  }

  function getTrashBounds() {
    const centerX = previewSize.width / 2;
    const bottomY = previewSize.height - 18;

    return {
      x: centerX - TRASH_ZONE_SIZE / 2,
      y: bottomY - TRASH_ZONE_SIZE,
      width: TRASH_ZONE_SIZE,
      height: TRASH_ZONE_SIZE,
    };
  }

  function getOverlayBounds(position: {
    x: number;
    y: number;
    scale: number;
    baseWidth: number;
    baseHeight: number;
  }) {
    const scaledWidth = position.baseWidth * position.scale;
    const scaledHeight = position.baseHeight * position.scale;
    const offsetX = (scaledWidth - position.baseWidth) / 2;
    const offsetY = (scaledHeight - position.baseHeight) / 2;

    return {
      x: position.x - offsetX,
      y: position.y - offsetY,
      width: scaledWidth,
      height: scaledHeight,
    };
  }

  function clearDragState(overlayId?: string) {
    if (overlayId) {
      delete overlayDragStart.current[overlayId];
    }

    hideDragVisuals();
  }

  function handleGlobalTouchRelease() {
    if (!isOverlayDragging) {
      return;
    }

    hideDragVisuals();
  }

  function isOverlayOverTrash(position: {
    x: number;
    y: number;
    scale: number;
    baseWidth: number;
    baseHeight: number;
  }) {
    if (previewSize.width === 0 || previewSize.height === 0) {
      return false;
    }

    const trashBounds = getTrashBounds();
    const overlayBounds = getOverlayBounds(position);
    const intersectionWidth =
      Math.min(
        overlayBounds.x + overlayBounds.width,
        trashBounds.x + trashBounds.width,
      ) - Math.max(overlayBounds.x, trashBounds.x);
    const intersectionHeight =
      Math.min(
        overlayBounds.y + overlayBounds.height,
        trashBounds.y + trashBounds.height,
      ) - Math.max(overlayBounds.y, trashBounds.y);

    if (intersectionWidth <= 0 || intersectionHeight <= 0) {
      return false;
    }

    const overlapArea = intersectionWidth * intersectionHeight;
    const trashArea = trashBounds.width * trashBounds.height;
    const overlayBottom = overlayBounds.y + overlayBounds.height;
    const overlayBottomInsideTrash =
      overlayBottom >= trashBounds.y + trashBounds.height * 0.45;

    return overlapArea >= trashArea * 0.3 && overlayBottomInsideTrash;
  }

  async function pickBaseMedia() {
    const asset = await pickLibraryAsset({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
    });

    if (!asset) {
      return;
    }

    setBaseUri(asset.uri);
    setBaseType(asset.type === "video" ? "video" : "image");
    setBaseScale(1);
    baseScaleStart.current = 1;
  }

  async function pickOverlayImages() {
    const uris = await pickLibraryImages({
      allowsMultipleSelection: true,
      orderedSelection: true,
      selectionLimit: 10,
    });

    if (uris.length === 0) {
      return;
    }

    const overlayEntries = await Promise.all(
      uris.map(async (uri) => ({
        uri,
        ...(await getOverlayBaseSize(uri)),
      })),
    );

    setOverlayItems((current) => [
      ...current,
      ...overlayEntries.map((entry, index) => {
        const position = getInitialOverlayPosition(
          current.length + index,
          entry.baseWidth,
          entry.baseHeight,
        );

        return {
          id: `overlay-${Date.now()}-${current.length + index}`,
          uri: entry.uri,
          x: position.x,
          y: position.y,
          scale: 1,
          baseWidth: entry.baseWidth,
          baseHeight: entry.baseHeight,
        };
      }),
    ]);
  }

  function removeOverlayById(id: string) {
    setOverlayItems((current) => current.filter((item) => item.id !== id));
    delete overlayScaleStart.current[id];
    clearDragState(id);
  }

  function onDragOverlay(
    overlayId: string,
    event: PanGestureHandlerGestureEvent,
  ) {
    const startPosition = overlayDragStart.current[overlayId];

    if (!startPosition) {
      return;
    }

    const nextPosition = {
      x: startPosition.x + event.nativeEvent.translationX,
      y: startPosition.y + event.nativeEvent.translationY,
    };

    const currentOverlay = overlayItems.find((item) => item.id === overlayId);

    if (!isOverlayDragging) {
      showDragVisuals(overlayId);
    }

    setDraggingOverlayId(overlayId);
    setIsTrashTargetActive(
      isOverlayOverTrash({
        x: nextPosition.x,
        y: nextPosition.y,
        scale: currentOverlay?.scale ?? 1,
        baseWidth: currentOverlay?.baseWidth ?? OVERLAY_STAGE_SIZE,
        baseHeight: currentOverlay?.baseHeight ?? OVERLAY_STAGE_SIZE,
      }),
    );
    setOverlayItems((current) =>
      current.map((item) =>
        item.id === overlayId
          ? {
              ...item,
              x: nextPosition.x,
              y: nextPosition.y,
            }
          : item,
      ),
    );
  }

  function onOverlayStateChange(
    overlayId: string,
    event: PanGestureHandlerStateChangeEvent,
  ) {
    const { oldState, state, translationX, translationY } = event.nativeEvent;

    if (state === State.BEGAN || state === State.ACTIVE) {
      const currentOverlay = overlayItems.find((item) => item.id === overlayId);

      if (!currentOverlay) {
        return;
      }

      if (!overlayDragStart.current[overlayId]) {
        overlayDragStart.current[overlayId] = {
          x: currentOverlay.x,
          y: currentOverlay.y,
        };
      }

      showDragVisuals(overlayId);
      setIsTrashTargetActive(false);
      return;
    }

    if (oldState === State.ACTIVE) {
      const startPosition =
        overlayDragStart.current[overlayId] ??
        overlayItems.find((item) => item.id === overlayId);
      const currentOverlay = overlayItems.find((item) => item.id === overlayId);

      if (!startPosition || !currentOverlay) {
        clearDragState(overlayId);
        return;
      }

      const nextPosition = {
        x: startPosition.x + translationX,
        y: startPosition.y + translationY,
        scale: currentOverlay.scale,
        baseWidth: currentOverlay.baseWidth,
        baseHeight: currentOverlay.baseHeight,
      };

      if (isOverlayOverTrash(nextPosition)) {
        removeOverlayById(overlayId);
      } else {
        setOverlayItems((current) =>
          current.map((item) =>
            item.id === overlayId
              ? {
                  ...item,
                  x: nextPosition.x,
                  y: nextPosition.y,
                }
              : item,
          ),
        );
      }

      clearDragState(overlayId);
      return;
    }

    if (
      state === State.CANCELLED ||
      state === State.FAILED ||
      state === State.END
    ) {
      clearDragState(overlayId);
    }
  }

  function onOverlayPinchGesture(
    overlayId: string,
    event: PinchGestureHandlerGestureEvent,
  ) {
    const startScale = overlayScaleStart.current[overlayId];

    if (!startScale) {
      return;
    }

    const nextScale = clampScale(startScale * event.nativeEvent.scale);

    setOverlayItems((current) =>
      current.map((item) =>
        item.id === overlayId
          ? {
              ...item,
              scale: nextScale,
            }
          : item,
      ),
    );
  }

  function onOverlayPinchStateChange(
    overlayId: string,
    event: PinchGestureHandlerStateChangeEvent,
  ) {
    const { state } = event.nativeEvent;

    if (state === State.BEGAN) {
      const currentOverlay = overlayItems.find((item) => item.id === overlayId);

      if (!currentOverlay) {
        return;
      }

      overlayScaleStart.current[overlayId] = currentOverlay.scale;
      return;
    }

    if (
      state === State.END ||
      state === State.CANCELLED ||
      state === State.FAILED
    ) {
      const currentOverlay = overlayItems.find((item) => item.id === overlayId);

      overlayScaleStart.current[overlayId] = currentOverlay?.scale ?? 1;
    }
  }

  function onBasePinchGesture(event: PinchGestureHandlerGestureEvent) {
    setBaseScale(clampScale(baseScaleStart.current * event.nativeEvent.scale));
  }

  function onBasePinchStateChange(event: PinchGestureHandlerStateChangeEvent) {
    const { state } = event.nativeEvent;

    if (state === State.BEGAN) {
      baseScaleStart.current = baseScale;
      return;
    }

    if (
      state === State.END ||
      state === State.CANCELLED ||
      state === State.FAILED
    ) {
      baseScaleStart.current = baseScale;
    }
  }

  function handlePreviewLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;

    setPreviewSize((current) => {
      if (current.width === width && current.height === height) {
        return current;
      }

      return { width, height };
    });
  }

  function getFilterStyle() {
    switch (filter) {
      case "bw":
        return { backgroundColor: "rgba(0,0,0,0.35)" };
      case "warm":
        return { backgroundColor: "rgba(255,140,60,0.18)" };
      case "cool":
        return { backgroundColor: "rgba(80,120,255,0.18)" };
      default:
        return null;
    }
  }

  function handleCancel() {
    if (
      !baseUri &&
      !caption &&
      overlayItems.length === 0 &&
      filter === "none" &&
      !selectedSong
    ) {
      router.back();
      return;
    }

    Alert.alert("Descartar post?", "Vais perder as alterações atuais.", [
      {
        text: "Continuar a editar",
        style: "cancel",
      },
      {
        text: "Descartar",
        style: "destructive",
        onPress: () => router.back(),
      },
    ]);
  }

  function handlePrimaryAction() {
    if (!baseUri) {
      Alert.alert("Falta conteúdo", "Escolhe uma imagem ou um vídeo primeiro.");
      return;
    }

    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    Alert.alert("Post pronto", "O post foi confirmado para publicação.", [
      {
        text: "Fechar",
        onPress: () => router.back(),
      },
    ]);
  }

  function handleSongSelect(song: ReadySong) {
    setSelectedSong(song);
    setSongMenuVisible(false);
    setSongQuery("");
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View
        style={styles.root}
        onTouchEnd={handleGlobalTouchRelease}
        onTouchCancel={handleGlobalTouchRelease}
      >
        <Animated.View style={[styles.topOutside, { opacity: dragUiOpacity }]}>
          <TouchableOpacity onPress={handleCancel}>
            <Text style={styles.topText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handlePrimaryAction}>
            <Text style={styles.topText}>
              {confirmed ? "Publicar" : "Feito"}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.preview} onLayout={handlePreviewLayout}>
          <View style={styles.mediaStage}>
            {baseUri ? (
              baseType === "image" ? (
                <PinchGestureHandler
                  shouldCancelWhenOutside={false}
                  onGestureEvent={onBasePinchGesture}
                  onHandlerStateChange={onBasePinchStateChange}
                >
                  <View style={styles.fullStretch}>
                    <Image
                      source={{ uri: baseUri }}
                      style={[
                        styles.media,
                        {
                          transform: [{ scale: baseScale }],
                        },
                      ]}
                      resizeMode="contain"
                    />
                  </View>
                </PinchGestureHandler>
              ) : (
                <Video
                  source={{ uri: baseUri }}
                  style={styles.media}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay
                  isLooping
                  isMuted
                />
              )
            ) : (
              <TouchableOpacity
                style={styles.placeholder}
                onPress={pickBaseMedia}
                activeOpacity={0.85}
              >
                <Ionicons name="images-outline" size={44} color="#777" />
                <Text style={styles.placeholderText}>
                  Escolher imagem ou vídeo
                </Text>
              </TouchableOpacity>
            )}

            {filter !== "none" && (
              <View
                style={[StyleSheet.absoluteFillObject, getFilterStyle()!]}
              />
            )}
          </View>

          <Animated.View
            style={[styles.musicInside, { opacity: dragUiOpacity }]}
          >
            <TouchableOpacity
              onPress={() => setSongMenuVisible(true)}
              activeOpacity={0.88}
            >
              <Text style={styles.musicTitle}>
                {selectedSong ? selectedSong.title : "Escolher música"}
              </Text>
              <Text style={styles.musicSubtitle}>
                {selectedSong
                  ? `${selectedSong.artist} • ${selectedSong.release}`
                  : "Toca para pesquisar ou escolher uma pronta"}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {overlayItems.map((overlay, index) => {
            const overlayWidth = overlay.baseWidth * overlay.scale;
            const overlayHeight = overlay.baseHeight * overlay.scale;
            const overlayOffsetX = (overlayWidth - overlay.baseWidth) / 2;
            const overlayOffsetY = (overlayHeight - overlay.baseHeight) / 2;

            return (
              <PinchGestureHandler
                key={overlay.id}
                shouldCancelWhenOutside={false}
                onGestureEvent={(event) =>
                  onOverlayPinchGesture(overlay.id, event)
                }
                onHandlerStateChange={(event) =>
                  onOverlayPinchStateChange(overlay.id, event)
                }
              >
                <View collapsable={false}>
                  <PanGestureHandler
                    shouldCancelWhenOutside={false}
                    onEnded={() => clearDragState(overlay.id)}
                    onCancelled={() => clearDragState(overlay.id)}
                    onFailed={() => clearDragState(overlay.id)}
                    onGestureEvent={(event) => onDragOverlay(overlay.id, event)}
                    onHandlerStateChange={(event) =>
                      onOverlayStateChange(overlay.id, event)
                    }
                  >
                    <View
                      onTouchEnd={() => clearDragState(overlay.id)}
                      onTouchCancel={() => clearDragState(overlay.id)}
                      style={[
                        styles.overlayFrame,
                        {
                          left: overlay.x - overlayOffsetX,
                          top: overlay.y - overlayOffsetY,
                          width: overlayWidth,
                          height: overlayHeight,
                          zIndex:
                            draggingOverlayId === overlay.id ? 150 : 20 + index,
                        },
                      ]}
                    >
                      <Image
                        source={{ uri: overlay.uri }}
                        style={styles.overlayMedia}
                        resizeMode="contain"
                      />
                    </View>
                  </PanGestureHandler>
                </View>
              </PinchGestureHandler>
            );
          })}

          {isOverlayDragging && (
            <View style={styles.trashIconWrap} pointerEvents="none">
              <Ionicons
                name={isTrashTargetActive ? "trash" : "trash-outline"}
                size={34}
                color={isTrashTargetActive ? "#ff3a3a" : "#ffffff"}
              />
            </View>
          )}

          <Animated.View
            style={[styles.bottomInfo, { opacity: dragUiOpacity }]}
          >
            <TouchableOpacity
              style={styles.captionTouch}
              onPress={() => setTyping(true)}
              activeOpacity={0.9}
            >
              <Image
                source={{
                  uri: "https://i.pinimg.com/1200x/b9/e8/db/b9e8db33168a26c9ca697a05ddc80937.jpg",
                }}
                style={styles.avatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.username}>Artist Name</Text>
                {caption.length === 0 ? (
                  <Text style={styles.hintText}>
                    Toca aqui para escrever a legenda
                  </Text>
                ) : (
                  <>
                    <Text
                      style={styles.previewText}
                      numberOfLines={2}
                      onTextLayout={(event) =>
                        setCaptionHasWrap(event.nativeEvent.lines.length > 1)
                      }
                    >
                      {caption}
                    </Text>
                    {captionHasWrap && (
                      <Text style={styles.readMoreText}>Ver mais</Text>
                    )}
                  </>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.musicIconBox}
              activeOpacity={0.86}
              onPress={() => setSongMenuVisible(true)}
            >
              {selectedSong ? (
                <Image
                  source={{ uri: selectedSong.cover }}
                  style={styles.songCoverPreview}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="musical-notes-outline" size={22} color="#fff" />
              )}
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.tools, { opacity: dragUiOpacity }]}>
            <Tool icon="images-outline" onPress={pickBaseMedia} />
            <Tool icon="layers-outline" onPress={pickOverlayImages} />
            <Tool
              icon="color-filter-outline"
              onPress={() =>
                setFilter(
                  filter === "none"
                    ? "bw"
                    : filter === "bw"
                      ? "warm"
                      : filter === "warm"
                        ? "cool"
                        : "none",
                )
              }
            />
          </Animated.View>
        </View>

        <Modal visible={typing} transparent animationType="fade">
          <TouchableWithoutFeedback onPress={() => setTyping(false)}>
            <View style={styles.modalBackdrop}>
              <BlurView
                intensity={40}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
              <TouchableWithoutFeedback>
                <View style={styles.typingBox}>
                  <TextInput
                    autoFocus
                    multiline
                    value={caption}
                    onChangeText={(text) =>
                      text.length <= MAX_CHARS && setCaption(text)
                    }
                    placeholder="Escrever legenda..."
                    placeholderTextColor="#777"
                    style={styles.input}
                  />
                  <Text style={styles.counter}>
                    {caption.length}/{MAX_CHARS}
                  </Text>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal visible={songMenuVisible} transparent animationType="fade">
          <TouchableWithoutFeedback onPress={() => setSongMenuVisible(false)}>
            <View style={styles.modalBackdrop}>
              <BlurView
                intensity={42}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
              <TouchableWithoutFeedback>
                <View style={styles.songMenuSheet}>
                  <View style={styles.songHandle} />
                  <View style={styles.songMenuHeader}>
                    <Text style={styles.songMenuTitle}>Escolher música</Text>
                    <TouchableOpacity onPress={() => setSongMenuVisible(false)}>
                      <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.songSearchBox}>
                    <Ionicons name="search-outline" size={18} color="#999" />
                    <TextInput
                      value={songQuery}
                      onChangeText={setSongQuery}
                      placeholder="Pesquisar música, artista ou álbum"
                      placeholderTextColor="#777"
                      style={styles.songSearchInput}
                    />
                  </View>

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.songList}
                  >
                    {filteredSongs.map((song) => {
                      const isSelected = selectedSong?.id === song.id;

                      return (
                        <TouchableOpacity
                          key={song.id}
                          style={[
                            styles.songRow,
                            isSelected && styles.songRowSelected,
                          ]}
                          activeOpacity={0.86}
                          onPress={() => handleSongSelect(song)}
                        >
                          <Image
                            source={{ uri: song.cover }}
                            style={styles.songRowCover}
                            resizeMode="cover"
                          />

                          <View style={styles.songRowText}>
                            <Text
                              style={[
                                styles.songRowTitle,
                                isSelected && styles.songRowTitleSelected,
                              ]}
                            >
                              {song.title}
                            </Text>
                            <Text style={styles.songRowSubtitle}>
                              {song.artist} • {song.release}
                            </Text>
                          </View>

                          <View style={styles.songRowMeta}>
                            <Text style={styles.songDuration}>
                              {song.duration}
                            </Text>
                            {isSelected && (
                              <Ionicons
                                name="checkmark-circle"
                                size={22}
                                color="#fff"
                              />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}

                    {filteredSongs.length === 0 && (
                      <Text style={styles.songEmptyText}>
                        Nenhuma música encontrada para essa pesquisa.
                      </Text>
                    )}
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}

function Tool({
  icon,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.tool} onPress={onPress}>
      <Ionicons name={icon} size={22} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  topOutside: {
    paddingHorizontal: 30,
    paddingTop: 50,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  topText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  preview: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 10,
    position: "relative",
  },
  mediaStage: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#0f0f0f",
  },
  fullStretch: {
    width: "100%",
    height: "100%",
  },
  media: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#777",
    marginTop: 8,
  },
  musicInside: {
    position: "absolute",
    top: 16,
    left: 20,
    right: 20,
    alignItems: "center",
    zIndex: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  musicTitle: {
    color: "#f3f3f3",
    fontSize: 15,
    fontWeight: "700",
  },
  musicSubtitle: {
    color: "#d8d8d8",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  overlayFrame: {
    position: "absolute",
    width: OVERLAY_STAGE_SIZE,
    height: OVERLAY_STAGE_SIZE,
    backgroundColor: "transparent",
    borderWidth: 0,
    borderColor: "transparent",
  },
  overlayMedia: {
    width: "100%",
    height: "100%",
  },
  trashIconWrap: {
    position: "absolute",
    left: "50%",
    bottom: 24,
    marginLeft: -20,
    zIndex: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomInfo: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    zIndex: 12,
  },
  captionTouch: {
    flexDirection: "row",
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 46,
    marginTop: -15,
  },
  username: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  previewText: {
    color: "#ddd",
    fontSize: 14,
    lineHeight: 18,
  },
  readMoreText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 5,
  },
  hintText: {
    color: "#ededed",
    fontSize: 13,
  },
  musicIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  songCoverPreview: {
    width: "100%",
    height: "100%",
  },
  tools: {
    position: "absolute",
    right: 14,
    top: 90,
    gap: 14,
    zIndex: 12,
  },
  tool: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
  },
  typingBox: {
    marginTop: 100,
    marginHorizontal: 16,
    backgroundColor: "rgba(15,15,15,0.9)",
    borderRadius: 18,
    padding: 16,
  },
  input: {
    minHeight: 140,
    color: "#fff",
    fontSize: 15,
  },
  counter: {
    color: "#888",
    fontSize: 12,
    textAlign: "right",
    marginTop: 8,
  },
  songMenuSheet: {
    marginTop: "auto",
    backgroundColor: "rgba(14,14,14,0.98)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
    minHeight: "58%",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  songHandle: {
    alignSelf: "center",
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.26)",
    marginBottom: 14,
  },
  songMenuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  songMenuTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  songSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  songSearchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
  },
  songList: {
    paddingTop: 14,
    gap: 10,
  },
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  songRowSelected: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  songRowCover: {
    width: 50,
    height: 50,
    borderRadius: 14,
    marginRight: 12,
    backgroundColor: "#111",
  },
  songRowText: {
    flex: 1,
    paddingRight: 12,
  },
  songRowTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  songRowTitleSelected: {
    color: "#fff",
  },
  songRowSubtitle: {
    color: "#ababab",
    fontSize: 12,
    marginTop: 5,
  },
  songRowMeta: {
    alignItems: "flex-end",
    gap: 6,
  },
  songDuration: {
    color: "#bfbfbf",
    fontSize: 12,
    fontWeight: "600",
  },
  songEmptyText: {
    color: "#999",
    textAlign: "center",
    paddingVertical: 24,
    fontSize: 14,
  },
});
