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
import type { MusicSubmissionDocument } from "../../../firebase/schema";
import { useCurrentUser } from "../../../hooks/useCurrentUser";

type PickedMp3 = {
  name: string;
  uri: string;
  size?: number;
};

const documentPickerPackage = "expo-document-picker";
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
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [uploadStep, setUploadStep] = useState("");
  const [approvedSubmissions, setApprovedSubmissions] = useState<
    MusicSubmissionDocument[]
  >([]);
  const [approvedLoading, setApprovedLoading] = useState(false);
  const [preReleaseEnabled, setPreReleaseEnabled] = useState(false);
  const [preReleaseDelay, setPreReleaseDelay] = useState("24:00:00");
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
    parts[index] = value.replace(/\D/g, "").slice(0, 2);
    setPreReleaseDelay(parts.join(":"));
  }

  async function handlePickAndSend() {
    if (!user) {
      Alert.alert("Login necessario", "Tens de iniciar sessao para enviar musica.");
      return;
    }

    try {
      const delayParts = preReleaseDelay.split(":").map((value) => Number(value));
      const delaySeconds =
        (delayParts[0] || 0) * 3600 +
        (delayParts[1] || 0) * 60 +
        (delayParts[2] || 0);

      if (
        preReleaseEnabled &&
        (delayParts.some((value) => !Number.isFinite(value) || value < 0) || delaySeconds <= 0)
      ) {
        Alert.alert("Tempo invalido", "Escolhe um tempo maior que zero no formato HH:MM:SS.");
        return;
      }

      const files = await pickMp3Files();

      if (files.length === 0) {
        return;
      }

      if (files.length > 12) {
        Alert.alert("Maximo de 12 faixas", "Seleciona entre 1 e 12 ficheiros MP3.");
        return;
      }

      const releaseType = getAutomaticReleaseType(files.length);
      const reviewBatchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const typeLabel = releaseType === "album" ? "Album" : releaseType === "ep" ? "EP" : "Single";
      const reviewBatchTitle = `${typeLabel} com ${files.length} ${files.length === 1 ? "faixa" : "faixas"}`;

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

      Alert.alert(
        "Lancamento enviado",
        `${files.length === 1 ? "A faixa foi enviada" : "As faixas foram enviadas"} para revisao individual da Sonnor.`,
      );
      setSelectedFileName("");
      setUploadStep("");
      await loadApprovedSubmissions();
    } catch (error) {
      console.log("PICK AND SUBMIT MP3 ERROR:", error);
      Alert.alert(
        "Erro",
        "Nao foi possivel carregar este MP3. Confirma se tens expo-document-picker instalado.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleCancelApproved(submissionId: string) {
    Alert.alert(
      "Cancelar publicação",
      "Queres desistir desta música aprovada?",
      [
        { text: "Não", style: "cancel" },
        {
          text: "Cancelar",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelMusicSubmission(submissionId);
              await loadApprovedSubmissions();
            } catch (error) {
              console.log("CANCEL APPROVED MUSIC ERROR:", error);
              Alert.alert("Erro", "Não foi possível cancelar agora.");
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
        <Text style={styles.title}>Criar lancamento</Text>
        <Text style={styles.subtitle}>
          Seleciona os MP3. A Sonnor define automaticamente o formato e verifica
          cada faixa antes de poderes finalizar.
        </Text>

        <View style={styles.autoTypeCard}>
          <View style={styles.autoTypeIcon}>
            <Ionicons name="sparkles-outline" size={22} color="#000" />
          </View>
          <View style={styles.autoTypeInfo}>
            <Text style={styles.autoTypeTitle}>Formato automatico</Text>
            <Text style={styles.autoTypeText}>1–3 Single  ·  4–6 EP  ·  7–12 Album</Text>
          </View>
        </View>

        <View style={styles.preReleaseCard}>
          <View style={styles.preReleaseHeader}>
            <View style={styles.preReleaseIcon}>
              <Ionicons name="notifications-outline" size={22} color="#000" />
            </View>
            <View style={styles.preReleaseInfo}>
              <Text style={styles.preReleaseTitle}>Pré-lançamento</Text>
            </View>
            <Switch value={preReleaseEnabled} onValueChange={setPreReleaseEnabled} />
          </View>
          {preReleaseEnabled ? (
            <View style={styles.preReleaseTimeRow}>
              <Text style={styles.preReleaseTimeLabel}>Tempo após aprovação</Text>
              <View style={styles.preReleaseTimeFields}>
                {["Hora", "Min", "Seg"].map((label, index) => (
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
                        value={preReleaseDelay.split(":")[index] ?? ""}
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
            {uploading ? "A carregar MP3" : "Selecionar MP3"}
          </Text>
          <Text style={styles.cardText}>
            {uploading
              ? `${selectedFileName || "ficheiro"} - ${Math.round(progress * 100)}%`
              : "Seleciona entre 1 e 12 ficheiros .mp3 de uma vez."}
          </Text>
          {uploadStep ? <Text style={styles.uploadStep}>Faixa {uploadStep}</Text> : null}

          <Pressable
            style={[styles.button, uploading && styles.buttonDisabled]}
            onPress={handlePickAndSend}
            disabled={uploading}
          >
            <Ionicons name="folder-open-outline" size={20} color="#000" />
            <Text style={styles.buttonText}>
              {uploading ? "A enviar..." : "Selecionar MP3"}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.note}>
          Depois do upload, a equipa Sonnor verifica se o ficheiro pode passar.
        </Text>

        <View style={styles.approvedSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Aprovadas para continuar</Text>
            <Pressable onPress={loadApprovedSubmissions}>
              <Ionicons name="refresh-outline" size={19} color="#fff" />
            </Pressable>
          </View>

          {approvedLoading ? (
            <View style={styles.smallCard}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.smallCardText}>A procurar musicas aprovadas...</Text>
            </View>
          ) : approvedSubmissions.length === 0 ? (
            <View style={styles.smallCard}>
              <Text style={styles.smallCardText}>
                Quando uma musica for aprovada, aparece aqui o botao para continuar.
              </Text>
            </View>
          ) : (
            approvedReleaseGroups.map((group) => {
              const submission = group.first;

              return (
              <View key={group.id} style={styles.approvedCard}>
                <View style={styles.approvedInfo}>
                  <Text style={styles.approvedTitle} numberOfLines={1}>
                    {submission.reviewBatchTitle || "Lancamento aprovado"}
                  </Text>
                  <Text style={styles.approvedMeta} numberOfLines={1}>
                    {group.items.length} {group.items.length === 1 ? "faixa verificada" : "faixas verificadas"}
                  </Text>
                </View>

                <Pressable
                  style={styles.continueButton}
                  onPress={() =>
                    router.push(
                      `/main/create/finish-track/${submission.id}` as never,
                    )
                  }
                >
                  <Text style={styles.continueText}>Continuar</Text>
                </Pressable>

                <Pressable
                  style={styles.cancelButton}
                  onPress={() => handleCancelApproved(submission.id)}
                >
                  <Text style={styles.cancelText}>Cancelar</Text>
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
    backgroundColor: "rgba(111,143,175,0.17)",
    borderWidth: 1,
    borderColor: "rgba(111,143,175,0.35)",
    marginBottom: 18,
  },
  autoTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6F8FAF",
  },
  autoTypeInfo: { flex: 1 },
  autoTypeTitle: { color: "#fff", fontSize: 15, fontWeight: "900" },
  autoTypeText: { color: "#aebdcb", fontSize: 12, fontWeight: "800", marginTop: 5 },
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
  preReleaseText: {
    color: "#999",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  preReleaseTimeFields: {
    alignItems: "center",
    flexDirection: "row",
  },
  preReleaseTimeBox: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    minWidth: 58,
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
    marginHorizontal: 5,
  },
  preReleaseTimeLabel: {
    color: "#bbb",
    fontSize: 12,
    fontWeight: "800",
  },
  preReleaseTimeRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
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
