import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
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
} from "react-native-gesture-handler";

const { width } = Dimensions.get("window");

const MAX_CHARS = 180;
const PREVIEW_LIMIT = 30;

type FilterType = "none" | "bw" | "warm" | "cool";

export default function CreatePostScreen() {
  const [baseUri, setBaseUri] = useState<string | null>(null);
  const [baseType, setBaseType] = useState<"image" | "video" | null>(null);
  const [overlayUri, setOverlayUri] = useState<string | null>(null);

  const [caption, setCaption] = useState("");
  const [typing, setTyping] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [filter, setFilter] = useState<FilterType>("none");

  const translateX = useRef(0);
  const translateY = useRef(0);

  const previewText =
    caption.length > PREVIEW_LIMIT
      ? caption.slice(0, PREVIEW_LIMIT) + "..."
      : caption;

  async function pickBaseMedia() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 1,
    });

    if (!res.canceled) {
      setBaseUri(res.assets[0].uri);
      setBaseType(res.assets[0].type === "video" ? "video" : "image");
    }
  }

  async function pickOverlayImage() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!res.canceled) {
      setOverlayUri(res.assets[0].uri);
      translateX.current = 0;
      translateY.current = 0;
    }
  }

  function onDragOverlay(e: PanGestureHandlerGestureEvent) {
    translateX.current += e.nativeEvent.translationX;
    translateY.current += e.nativeEvent.translationY;
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.root}>
        {/* TOPO FORA DA IMAGEM */}
        <View style={styles.topOutside}>
          <TouchableOpacity>
            <Text style={styles.topText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setConfirmed(true)}>
            <Text style={styles.topText}>
              {confirmed ? "Publicar" : "Feito"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* PREVIEW */}
        <View style={styles.preview}>
          {baseUri ? (
            baseType === "image" ? (
              <Image
                source={{ uri: baseUri }}
                style={styles.media}
                resizeMode="cover"
              />
            ) : (
              <Video
                source={{ uri: baseUri }}
                style={styles.media}
                resizeMode={ResizeMode.COVER}
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

          {/* NOME DA MÚSICA — DENTRO DA IMAGEM */}
          <View style={styles.musicInside}>
            <Text style={styles.musicTitle}>Nome da música</Text>
          </View>

          {/* FILTRO */}
          {filter !== "none" && (
            <View style={[StyleSheet.absoluteFillObject, getFilterStyle()!]} />
          )}

          {/* COLAGEM */}
          {overlayUri && (
            <PanGestureHandler onGestureEvent={onDragOverlay}>
              <Image
                source={{ uri: overlayUri }}
                style={[
                  styles.overlay,
                  {
                    transform: [
                      { translateX: translateX.current },
                      { translateY: translateY.current },
                    ],
                  },
                ]}
              />
            </PanGestureHandler>
          )}

          {/* PERFIL + TEXTO */}
          <View style={styles.bottomInfo}>
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
                  <Text style={styles.previewText}>{previewText}</Text>
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.musicIconBox}>
              <Ionicons name="musical-notes-outline" size={22} color="#fff" />
            </View>
          </View>

          {/* FERRAMENTAS */}
          <View style={styles.tools}>
            <Tool icon="images-outline" onPress={pickBaseMedia} />
            <Tool icon="layers-outline" onPress={pickOverlayImage} />
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
                    : "none"
                )
              }
            />
          </View>
        </View>

        {/* MODAL TEXTO */}
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
                    onChangeText={(t) => t.length <= MAX_CHARS && setCaption(t)}
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
      </View>
    </GestureHandlerRootView>
  );
}

function Tool({ icon, onPress }: { icon: any; onPress: () => void }) {
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
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#0f0f0f",
  },

  media: {
    width: "100%",
    height: "100%",
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
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },

  musicTitle: {
    color: "#f3f3f3ff",
    fontSize: 16,
    fontStyle: "italic",
  },

  overlay: {
    position: "absolute",
    width: 140,
    height: 140,
    top: "30%",
    left: "30%",
  },

  bottomInfo: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
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
    marginBlockStart: -15,
  },

  username: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  previewText: {
    color: "#ddd",
    fontSize: 14,
  },

  hintText: {
    color: "#edededff",
    fontSize: 13,
  },

  musicIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },

  tools: {
    position: "absolute",
    right: 14,
    top: 70,
    gap: 14,
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
});
