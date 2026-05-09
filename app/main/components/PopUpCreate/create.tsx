import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type CheckKey =
  | "rights"
  | "correctNames"
  | "finalVersion"
  | "rules"
  | "processing";

export default function CreateMusic() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [file, setFile] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [musicName, setMusicName] = useState("Nova Música");
  const [albumName, setAlbumName] = useState("");
  const [releaseType, setReleaseType] = useState<
    "single" | "ep" | "album" | null
  >(null);
  const [checks, setChecks] = useState<Record<CheckKey, boolean>>({
    rights: false,
    correctNames: false,
    finalVersion: false,
    rules: false,
    processing: false,
  });

  const allChecksOk = Object.values(checks).every(Boolean);

  const stepUnlocked = {
    1: true,
    2: !!file,
    3: analysisProgress === 100,
    4: !!musicName.trim() && releaseType !== null,
  };

  function simulatePickFile() {
    setFile("musica_exemplo.mp3");
    setMusicName("Nova Música");
    setStep(2);
    setAnalyzing(true);
    setAnalysisProgress(0);
  }

  function handlePublish() {
    if (!allChecksOk) {
      return;
    }

    Alert.alert(
      "Música pronta",
      `“${musicName.trim()}” foi preparada para publicação.`,
      [
        {
          text: "Fechar",
          onPress: () => router.back(),
        },
      ],
    );
  }

  useEffect(() => {
    if (!analyzing) return;

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;

      if (progress >= 100) {
        progress = 100;
        setAnalyzing(false);
        setStep(3);
        clearInterval(interval);
      }

      setAnalysisProgress(progress);
    }, 250);

    return () => clearInterval(interval);
  }, [analyzing]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Criar Música</Text>
        <Text style={styles.headerStep}>Etapa {step}/4</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ficheiro</Text>

          {!file ? (
            <TouchableOpacity style={styles.fileButton} onPress={simulatePickFile}>
              <Ionicons
                name="cloud-upload-outline"
                size={42}
                color="#5b523e"
              />
              <Text style={styles.fileButtonText}>
                Selecionar ficheiro de áudio
              </Text>
              <Text style={styles.fileFormats}>mp3 · wav · flac</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.fileSelected}
              onPress={simulatePickFile}
            >
              <Ionicons
                name="musical-note-outline"
                size={26}
                color="#5b523e"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.fileSelectedText}>{file}</Text>
                <Text style={styles.fileSelectedHint}>Toque para trocar</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {stepUnlocked[2] && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Análise</Text>

            <View style={styles.analyzeBox}>
              {analysisProgress < 100 ? (
                <>
                  <ActivityIndicator size="large" color="#5b523e" />
                  <Text style={styles.analyzeText}>A analisar ficheiro...</Text>

                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${analysisProgress}%` },
                      ]}
                    />
                  </View>
                </>
              ) : (
                <Text style={styles.analyzeDone}>Ficheiro validado</Text>
              )}
            </View>
          </View>
        )}

        {stepUnlocked[3] && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalhes</Text>

            <Text style={styles.inputLabel}>Título da música</Text>
            <TextInput
              value={musicName}
              onChangeText={setMusicName}
              placeholder="Nome da música"
              placeholderTextColor="#666"
              style={styles.inputBox}
            />

            <Text style={styles.inputLabel}>Álbum (opcional)</Text>
            <TextInput
              value={albumName}
              onChangeText={setAlbumName}
              placeholder="Nome do álbum ou deixa vazio"
              placeholderTextColor="#666"
              style={styles.inputBox}
            />

            <Text style={styles.inputLabel}>Tipo de lançamento</Text>
            <View style={styles.typeRow}>
              {["single", "ep", "album"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    releaseType === type && styles.typeButtonActive,
                  ]}
                  onPress={() => setReleaseType(type as "single" | "ep" | "album")}
                >
                  <Text
                    style={[
                      styles.typeText,
                      releaseType === type && styles.typeTextActive,
                    ]}
                  >
                    {type.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {releaseType && (
              <TouchableOpacity
                style={styles.nextStepButton}
                onPress={() => setStep(4)}
              >
                <Text style={styles.nextStepText}>Continuar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {stepUnlocked[4] && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Confirmações</Text>

            {(Object.keys(checks) as CheckKey[]).map((key) => (
              <TouchableOpacity
                key={key}
                style={styles.checkRow}
                onPress={() =>
                  setChecks((prev) => ({
                    ...prev,
                    [key]: !prev[key],
                  }))
                }
              >
                <View style={styles.checkbox}>
                  {checks[key] && <View style={styles.checkboxInner} />}
                </View>

                <Text style={styles.checkText}>
                  {key === "rights"
                    ? "Tenho os direitos desta música"
                    : key === "correctNames"
                    ? "Os nomes estão corretos"
                    : key === "finalVersion"
                    ? "Esta é a versão final"
                    : key === "rules"
                    ? "Cumpre as regras da plataforma"
                    : "Aceito o processamento do upload"}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              disabled={!allChecksOk}
              style={[styles.publishButton, !allChecksOk && styles.disabled]}
              onPress={handlePublish}
            >
              <Text style={styles.publishText}>Publicar música</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  headerStep: {
    color: "#777",
    fontSize: 14,
  },
  scroll: {
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 14,
  },
  fileButton: {
    alignItems: "center",
    paddingVertical: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "#0b0b0b",
  },
  fileButtonText: {
    color: "#fff",
    fontSize: 15,
    marginTop: 12,
  },
  fileFormats: {
    color: "#666",
    fontSize: 12,
    marginTop: 4,
  },
  fileSelected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#0b0b0b",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  fileSelectedText: {
    color: "#ddd",
    fontSize: 14,
  },
  fileSelectedHint: {
    color: "#777",
    fontSize: 12,
    marginTop: 4,
  },
  analyzeBox: {
    paddingVertical: 30,
    alignItems: "center",
  },
  analyzeText: {
    color: "#aaa",
    fontSize: 14,
    marginTop: 12,
  },
  analyzeDone: {
    color: "#5b523e",
    fontSize: 15,
    fontWeight: "600",
  },
  progressBar: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 6,
    marginTop: 16,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#5b523e",
  },
  inputLabel: {
    color: "#bbb",
    fontSize: 13,
    marginTop: 14,
    marginBottom: 6,
  },
  inputBox: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#0d0d0d",
    color: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  typeRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  typeButtonActive: {
    backgroundColor: "#5b523e",
    borderColor: "#5b523e",
  },
  typeText: {
    color: "#aaa",
    fontSize: 12,
  },
  typeTextActive: {
    color: "#000",
    fontWeight: "700",
  },
  nextStepButton: {
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: "#5b523e",
    borderRadius: 10,
    alignItems: "center",
  },
  nextStepText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "600",
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#5b523e",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxInner: {
    width: 12,
    height: 12,
    backgroundColor: "#5b523e",
    borderRadius: 4,
  },
  checkText: {
    color: "#ddd",
    fontSize: 13,
    flex: 1,
  },
  publishButton: {
    marginTop: 20,
    paddingVertical: 14,
    backgroundColor: "#5b523e",
    borderRadius: 12,
    alignItems: "center",
  },
  publishText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.4,
  },
});
