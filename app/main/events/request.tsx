import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ResizeMode, Video } from "expo-av";

import { useSuccessFeedback } from "../../../components/SuccessFeedback";
import { requestEventBanner } from "../../../firebase/eventClient";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { pickLibraryAsset } from "../../../utils/mediaPicker";

export default function RequestEventScreen() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { showSuccess } = useSuccessFeedback();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [mediaUri, setMediaUri] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [saving, setSaving] = useState(false);

  async function pickMedia() {
    const asset = await pickLibraryAsset({
      allowsEditing: false,
      aspect: [16, 9],
      mediaTypes: ["images", "videos"],
      quality: 0.92,
    });

    if (asset?.uri) {
      setMediaUri(asset.uri);
      setMediaType(asset.type === "video" ? "video" : "image");
    }
  }

  async function submitRequest() {
    if (!user?.uid) {
      Alert.alert("Login required", "Sign in to request an event.");
      return;
    }

    if (
      title.trim().length < 3 ||
      details.trim().length < 12 ||
      !linkUrl.trim().startsWith("http") ||
      !mediaUri
    ) {
      Alert.alert(
        "Missing information",
        "Add a title, text, full link, and an event image or video.",
      );
      return;
    }

    try {
      setSaving(true);
      await requestEventBanner({
        userId: user.uid,
        title,
        details,
        linkUrl,
        mediaType,
        mediaUri,
      });
      showSuccess({
        message: "Request sent",
        onDone: () => router.back(),
      });
    } catch (error) {
      console.log("REQUEST EVENT ERROR:", error);
      Alert.alert("Error", "Could not send the event request right now.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.root}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Request event</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={styles.title}>Divulga um evento na Sonnor</Text>
        <Text style={styles.subtitle}>
          Send an image or video, link, and a simple explanation of what you want to promote.
        </Text>

        <Pressable style={styles.imagePicker} onPress={pickMedia}>
          {mediaUri && mediaType === "video" ? (
            <Video
              source={{ uri: mediaUri }}
              style={styles.previewImage}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping
              isMuted
            />
          ) : mediaUri ? (
            <Image source={{ uri: mediaUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.emptyImage}>
              <Ionicons name="images-outline" size={34} color="#888" />
              <Text style={styles.emptyImageText}>Add image or video</Text>
            </View>
          )}
        </Pressable>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Name do evento ou parceria"
          placeholderTextColor="#777"
          style={styles.input}
        />
        <TextInput
          value={linkUrl}
          onChangeText={setLinkUrl}
          autoCapitalize="none"
          keyboardType="url"
          placeholder="https://link-do-evento.com"
          placeholderTextColor="#777"
          style={styles.input}
        />
        <TextInput
          value={details}
          onChangeText={setDetails}
          multiline
          placeholder="Explain what you want to promote."
          placeholderTextColor="#777"
          style={[styles.input, styles.textArea]}
        />

        <Pressable
          disabled={saving}
          style={[styles.submitButton, saving ? styles.submitButtonDisabled : null]}
          onPress={submitRequest}
        >
          {saving ? <ActivityIndicator color="#000" /> : null}
          <Text style={styles.submitText}>{saving ? "Sending..." : "Send"}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 58,
    paddingBottom: 80,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  headerSpacer: {
    width: 42,
  },
  title: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#999",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 10,
    marginBottom: 24,
  },
  imagePicker: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#111",
    marginBottom: 16,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  emptyImage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyImageText: {
    color: "#888",
    fontSize: 13,
    fontWeight: "800",
  },
  input: {
    minHeight: 56,
    borderRadius: 18,
    paddingHorizontal: 16,
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 12,
  },
  textArea: {
    minHeight: 130,
    paddingTop: 16,
    textAlignVertical: "top",
  },
  submitButton: {
    minHeight: 58,
    borderRadius: 29,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.62,
  },
  submitText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "900",
  },
});
