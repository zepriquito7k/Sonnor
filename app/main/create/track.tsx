import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  cancelMusicSubmission,
  getAutomaticReleaseType,
  getApprovedMusicSubmissions,
  submitMusicForReview,
} from "../../../firebase/musicReviewClient";
import { pressableFeedback } from "../../../components/pressFeedback";
import { useSuccessFeedback } from "../../../components/SuccessFeedback";
import type { MusicSubmissionDocument } from "../../../firebase/schema";
import { useCurrentUser } from "../../../hooks/useCurrentUser";

type PickedMp3 = {
  name: string;
  uri: string;
  size?: number;
};

const documentPickerPackage = "expo-document-picker";
const PRE_RELEASE_TIME_PARTS = ["Dias", "Hora", "Min", "Seg"] as const;
const PRE_RELEASE_TIME_MAX = [61, 23, 59, 59] as const;

function parsePreReleaseDelay(value: string) {
  const rawParts = value.split(":").map((part) => Number(part));
  const parts = rawParts.length === 4 ? rawParts : [0, ...rawParts];
  const [days = 0, hours = 0, minutes = 0, seconds = 0] = parts;

  return {
    parts,
    seconds: days * 86400 + hours * 3600 + minutes * 60 + seconds,
  };
}

async function pickMp3Files(): Promise<PickedMp3[]> {
  const DocumentPicker = await import(documentPickerPackage);
  const result = await DocumentPicker.getDocumentAsync({
    type: ["audio/mpeg", "audio/mp3"],
    copyToCacheDirectory: true,
    multiple: true,
  });

  if (result.canceled) {
    return [];
  }

  return result.assets
    .filter((asset: { name: string }) => asset.name.toLowerCase().endsWith(".mp3"))
    .map((asset: { name: string; uri: string; size?: number }) => ({
      name: asset.name,
      uri: asset.uri,
      size: asset.size,
    }));
}

export default function CreateTrackScreen() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { showSuccess } = useSuccessFeedback();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [uploadStep, setUploadStep] = useState("");
  const [approvedSubmissions, setApprovedSubmissions] = useState<
    MusicSubmissionDocument[]
  >([]);
  const [approvedLoading, setApprovedLoading] = useState(false);
  const [preReleaseEnabled, setPreReleaseEnabled] = useState(false);
  const [preReleaseDelay, setPreReleaseDelay] = useState("00:00:00:00");
  const approvedReleaseGroups = React.useMemo(() => {
    const map = new Map<string, MusicSubmissionDocument[]>();

    approvedSubmissions.forEach((submission) => {
      const id = submission.reviewBatchId || submission.id;
      map.set(id, [...(map.get(id) ?? []), submission]);
    });

    return Array.from(map.entries()).map(([id, items]) => ({
      id,
      items,
      first: items[0],
    }));
  }, [approvedSubmissions]);

  const loadApprovedSubmissions = useCallback(async () => {
    if (!user) {
      setApprovedSubmissions([]);
      return;
    }

    try {
      setApprovedLoading(true);
      setApprovedSubmissions(await getApprovedMusicSubmissions(user.uid));
    } catch (error) {
      console.log("LOAD APPROVED MUSIC ERROR:", error);
    } finally {
      setApprovedLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    loadApprovedSubmissions();
  }, [loadApprovedSubmissions]);

  function updatePreReleaseTimePart(index: number, value: string) {
    const parts = preReleaseDelay.split(":");
    while (parts.length < PRE_RELEASE_TIME_PARTS.length) {
      parts.unshift("00");
    }
    const digits = value.replace(/\D/g, "").slice(0, 2);
    const numericValue = Number(digits);
    const max = PRE_RELEASE_TIME_MAX[index] ?? 59;
    parts[index] = digits
      ? String(Math.min(Number.isFinite(numericValue) ? numericValue : 0, max)).padStart(2, "0")
      : "";
    setPreReleaseDelay(parts.join(":"));
  }
  const preReleaseDelayParts = preReleaseDelay.split(":").length === 4
    ? preReleaseDelay.split(":")
    : ["00", ...preReleaseDelay.split(":")];

  async function handlePickAndSend() {
    if (!user) {
      Alert.alert("Login required", "You need to sign in to upload music.");
      return;
    }

    try {
      const { parts: delayParts, seconds: delaySeconds } = parsePreReleaseDelay(preReleaseDelay);

      if (
        preReleaseEnabled &&
        (delayParts.some((value) => !Number.isFinite(value) || value < 0) || delaySeconds <= 0)
      ) {
        Alert.alert("Invalid time", "Choose a time greater than zero.");
        return;
      }

      const files = await pickMp3Files();

      if (files.length === 0) {
        return;
      }

      if (files.length > 12) {
        Alert.alert("Maximum of 12 tracks", "Select between 1 and 12 MP3 files.");
        return;
      }

      const releaseType = getAutomaticReleaseType(files.length);
      const reviewBatchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const typeLabel = releaseType === "album" ? "Album" : releaseType === "ep" ? "EP" : "Single";
      const reviewBatchTitle = `${typeLabel} with ${files.length} ${files.length === 1 ? "track" : "tracks"}`;

      setSelectedFileName(reviewBatchTitle);
      setUploading(true);
      setProgress(0);

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];

        setUploadStep(`${index + 1}/${files.length}`);
        await submitMusicForReview(
          {
            userId: user.uid,
            mp3Uri: file.uri,
            originalFileName: file.name,
            declaredTitle: file.name.replace(/\.mp3$/i, ""),
            reviewBatchId,
            reviewBatchTitle,
            reviewBatchTrackCount: files.length,
            reviewBatchIndex: index,
            reviewBatchReleaseType: releaseType,
            requestedPreReleaseEnabled: preReleaseEnabled,
            requestedPreReleaseDelaySeconds: preReleaseEnabled ? delaySeconds : 0,
          },
          (nextProgress) => {
            setProgress((index + nextProgress) / files.length);
          },
        );
      }

      showSuccess({
        message: files.length === 1 ? "Track sent for review" : "Release sent for review",
      });
      setSelectedFileName("");
      setUploadStep("");
      await loadApprovedSubmissions();
    } catch (error) {
      console.log("PICK AND SUBMIT MP3 ERROR:", error);
      Alert.alert(
        "Error",
        "Could not load this MP3. Confirm that expo-document-picker is installed.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleCancelApproved(submissionId: string) {
    Alert.alert(
      "Cancel publication",
      "Do you want to abandon this approved song?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelMusicSubmission(submissionId);
              await loadApprovedSubmissions();
            } catch (error) {
              console.log("CANCEL APPROVED MUSIC ERROR:", error);
              Alert.alert("Error", "Could not cancel right now.");
            }
          },
        },
      ],
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Create release</Text>
        <Text style={styles.subtitle}>
          Select the MP3s. Sonnor automatically defines the format and checks
          each track before you can finish.
        </Text>

        <View style={styles.autoTypeCard}>
          <View style={styles.autoTypeIcon}>
            <Ionicons name="sparkles-outline" size={22} color="#000" />
          </View>
          <View style={styles.autoTypeInfo}>
            <Text style={styles.autoTypeTitle}>Automatic format</Text>
            <Text style={styles.autoTypeText}>1–3 Single  ·  4–6 EP  ·  7–12 Album</Text>
          </View>
        </View>

        <View style={styles.preReleaseCard}>
          <View style={styles.preReleaseHeader}>
            <View style={styles.preReleaseIcon}>
              <Ionicons name="notifications-outline" size={22} color="#000" />
            </View>
            <View style={styles.preReleaseInfo}>
              <Text style={styles.preReleaseTitle}>Pre-release</Text>
            </View>
            <Switch
              style={styles.preReleaseSwitch}
              value={preReleaseEnabled}
              onValueChange={setPreReleaseEnabled}
            />
          </View>
          {preReleaseEnabled ? (
            <View style={styles.preReleaseTimeRow}>
              <View style={styles.preReleaseTimeFields}>
                {PRE_RELEASE_TIME_PARTS.map((label, index) => (
                  <React.Fragment key={label}>
                    {index > 0 ? <Text style={styles.preReleaseTimeSeparator}>:</Text> : null}
                    <View style={styles.preReleaseTimeBox}>
                      <Text style={styles.preReleaseTimeBoxLabel}>{label}</Text>
                      <TextInput
                        keyboardType="number-pad"
                        maxLength={2}
                        onChangeText={(value) => updatePreReleaseTimePart(index, value)}
                        placeholder="00"
                        placeholderTextColor="#777"
                        selectTextOnFocus
                        style={styles.preReleaseTimePart}
                        value={preReleaseDelayParts[index] ?? ""}
                      />
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.iconCircle}>
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="musical-notes-outline" size={30} color="#fff" />
            )}
          </View>

          <Text style={styles.cardTitle}>
            {uploading ? "Uploading MP3" : "Select MP3"}
          </Text>
          <Text style={styles.cardText}>
            {uploading
              ? `${selectedFileName || "file"} - ${Math.round(progress * 100)}%`
              : "Select between 1 and 12 .mp3 files at once."}
          </Text>
          {uploadStep ? <Text style={styles.uploadStep}>Track {uploadStep}</Text> : null}

          <Pressable
            style={pressableFeedback([styles.button, uploading && styles.buttonDisabled])}
            onPress={handlePickAndSend}
            disabled={uploading}
          >
            <Ionicons name="folder-open-outline" size={20} color="#000" />
            <Text style={styles.buttonText}>
              {uploading ? "Sending..." : "Select MP3"}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.note}>
          After upload, the Sonnor team checks if the file can pass.
        </Text>

        <View style={styles.approvedSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Approved to continue</Text>
            <Pressable style={pressableFeedback(styles.refreshButton)} onPress={loadApprovedSubmissions}>
              <Ionicons name="refresh-outline" size={19} color="#fff" />
            </Pressable>
          </View>

          {approvedLoading ? (
            <View style={styles.smallCard}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.smallCardText}>Searching approved songs...</Text>
            </View>
          ) : approvedSubmissions.length === 0 ? (
            <View style={styles.smallCard}>
              <Text style={styles.smallCardText}>
                When a song is approved, the button to continue appears here.
              </Text>
            </View>
          ) : (
            approvedReleaseGroups.map((group) => {
              const submission = group.first;

              return (
              <View key={group.id} style={styles.approvedCard}>
                <View style={styles.approvedInfo}>
                  <Text style={styles.approvedTitle} numberOfLines={1}>
                    {submission.reviewBatchTitle || "Approved release"}
                  </Text>
                  <Text style={styles.approvedMeta} numberOfLines={1}>
                    {group.items.length} {group.items.length === 1 ? "verified track" : "verified tracks"}
                  </Text>
                </View>

                <Pressable
                  style={pressableFeedback(styles.continueButton)}
                  onPress={() =>
                    router.push(
                      `/main/create/finish-track/${submission.id}` as never,
                    )
                  }
                >
                  <Text style={styles.continueText}>Continue</Text>
                </Pressable>

                <Pressable
                  style={pressableFeedback(styles.cancelButton)}
                  onPress={() => handleCancelApproved(submission.id)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 70,
    paddingBottom: 150,
  },
  title: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "800",
  },
  subtitle: {
    color: "#aaa",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 26,
  },
  autoTypeCard: {
    minHeight: 82,
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.26)",
    marginBottom: 18,
  },
  autoTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E6E6E6",
  },
  autoTypeInfo: {
    flex: 1,
  },
  autoTypeTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  autoTypeText: {
    color: "#aebdcb",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 5,
  },
  card: {
    borderRadius: 24,
    padding: 22,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
  },
  preReleaseCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 18,
    padding: 16,
  },
  preReleaseHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  preReleaseIcon: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  preReleaseInfo: {
    flex: 1,
  },
  preReleaseSwitch: {
    alignSelf: "center",
    transform: [{ translateY: 1 }],
  },
  preReleaseText: {
    color: "#999",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  preReleaseTimeFields: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
  },
  preReleaseTimeBox: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    minWidth: 52,
    paddingHorizontal: 8,
    paddingTop: 7,
  },
  preReleaseTimeBoxLabel: {
    color: "#777",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  preReleaseTimePart: {
    color: "#000",
    fontSize: 17,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
    minWidth: 36,
    paddingHorizontal: 0,
    paddingBottom: 7,
    paddingTop: 2,
    textAlign: "center",
  },
  preReleaseTimeSeparator: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    marginHorizontal: 4,
  },
  preReleaseTimeRow: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  preReleaseTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.09)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 21,
    fontWeight: "800",
  },
  cardText: {
    color: "#aaa",
    fontSize: 14,
    marginTop: 8,
    marginBottom: 22,
    textAlign: "center",
  },
  uploadStep: {
    color: "#777",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 14,
  },
  button: {
    width: "100%",
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "#fff",
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "800",
  },
  note: {
    color: "#777",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 18,
    textAlign: "center",
  },
  approvedSection: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  refreshButton: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  smallCard: {
    minHeight: 72,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  smallCardText: {
    color: "#999",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  approvedCard: {
    minHeight: 74,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 10,
  },
  approvedInfo: {
    flex: 1,
  },
  approvedTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  approvedMeta: {
    color: "#999",
    fontSize: 12,
    marginTop: 4,
  },
  continueButton: {
    minHeight: 40,
    borderRadius: 14,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  continueText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "900",
  },
  cancelButton: {
    minHeight: 40,
    borderRadius: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(210,62,62,0.16)",
    borderWidth: 1,
    borderColor: "rgba(210,62,62,0.4)",
  },
  cancelText: {
    color: "#ff8d8d",
    fontSize: 13,
    fontWeight: "900",
  },
});
