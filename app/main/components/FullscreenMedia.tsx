import { VideoView, useVideoPlayer } from "expo-video";
import React from "react";
import { Image, Modal, Pressable, StyleSheet } from "react-native";

type FullscreenMediaProps = {
  visible: boolean;
  onClose: () => void;
  type: "image" | "video";
  source: string;
};

export default function FullscreenMedia({
  visible,
  onClose,
  type,
  source,
}: FullscreenMediaProps) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = false; // SOM LIGADO APENAS NO FULLSCREEN
    p.play();
  });

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <Pressable style={styles.container} onPress={onClose}>
        {type === "image" && (
          <Image
            resizeMode="contain" // MOSTRA A IMAGEM COMPLETA SEM ZOOM
            source={{ uri: source }}
            style={styles.media}
          />
        )}

        {type === "video" && (
          <VideoView
            player={player}
            style={styles.media}
            contentFit="contain" // MOSTRA O VÍDEO COMPLETO SEM ZOOM
            allowsFullscreen={false}
          />
        )}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  media: {
    width: "100%",
    height: "100%",
  },
});
