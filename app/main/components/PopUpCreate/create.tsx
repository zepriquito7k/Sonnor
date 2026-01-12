import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

/* ------------------ TIPOS ------------------ */
type CheckKey =
  | "rights"
  | "correctNames"
  | "finalVersion"
  | "rules"
  | "processing";

export default function CreateMusic() {
  const router = useRouter();

  /* ------------------ ESTADOS ------------------ */

  const [step, setStep] = useState(1);

  // Etapa 1
  const [file, setFile] = useState<string | null>(null);

  // Etapa 2 – análise simulada
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Etapa 3 – metadados
  const [musicName, setMusicName] = useState("Nova Música");
  const [albumName, setAlbumName] = useState("");
  const [releaseType, setReleaseType] = useState<
    "single" | "ep" | "album" | null
  >(null);

  // Etapa 4 – confirmações
  const [checks, setChecks] = useState<Record<CheckKey, boolean>>({
    rights: false,
    correctNames: false,
    finalVersion: false,
    rules: false,
    processing: false,
  });

  const allChecksOk = Object.values(checks).every(Boolean);

  /* ------------------ DESBLOQUEIO DAS ETAPAS ------------------ */

  const stepUnlocked = {
    1: true,
    2: !!file,
    3: analysisProgress === 100,
    4: !!musicName && releaseType !== null,
  };

  /* ------------------ SIMULAR PICK ------------------ */

  const simulatePickFile = () => {
    setFile("musica_exemplo.mp3");
    setMusicName("Nova Música");

    setStep(2);
    setAnalyzing(true);
    setAnalysisProgress(0);
  };

  /* ------------------ SIMULAÇÃO DE ANÁLISE ------------------ */

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

  /* ============================================================= */
  /* ===================== RENDER DA SCREEN ======================= */
  /* ============================================================= */

  return (
    <View style={styles.root}>
      {/* ---------- HEADER FIXO ---------- */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Criar Música</Text>
        <Text style={styles.headerStep}>Etapa {step}/4</Text>
      </View>

      {/* ---------- SCROLL GERAL (DESBLOQUEADO GRADUALMENTE) ---------- */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ================================================= */}
        {/* ================== ETAPA 1 ====================== */}
        {/* ================================================= */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ficheiro</Text>

          {!file && (
            <TouchableOpacity
              style={styles.fileButton}
              onPress={simulatePickFile}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={42}
                color="#5b523eff"
              />
              <Text style={styles.fileButtonText}>
                Selecionar ficheiro de áudio
              </Text>
              <Text style={styles.fileFormats}>mp3 · wav · flac</Text>
            </TouchableOpacity>
          )}

          {file && (
            <View style={styles.fileSelected}>
              <Ionicons
                name="musical-note-outline"
                size={26}
                color="#5b523eff"
              />
              <Text style={styles.fileSelectedText}>{file}</Text>
            </View>
          )}
        </View>

        {/* ================================================= */}
        {/* ================== ETAPA 2 ====================== */}
        {/* ================================================= */}

        {stepUnlocked[2] && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Análise</Text>

            <View style={styles.analyzeBox}>
              {analysisProgress < 100 ? (
                <>
                  <ActivityIndicator size="large" color="#5b523eff" />
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

        {/* ================================================= */}
        {/* ================== ETAPA 3 ====================== */}
        {/* ================================================= */}

        {stepUnlocked[3] && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalhes</Text>

            {/* Título */}
            <Text style={styles.inputLabel}>Título da música</Text>
            <TouchableOpacity style={styles.inputBox}>
              <Text style={styles.inputText}>{musicName}</Text>
            </TouchableOpacity>

            {/* Álbum */}
            <Text style={styles.inputLabel}>Álbum (opcional)</Text>
            <TouchableOpacity style={styles.inputBox}>
              <Text style={styles.inputText}>
                {albumName || "Nome do álbum ou vazio"}
              </Text>
            </TouchableOpacity>

            {/* Tipo de lançamento */}
            <Text style={styles.inputLabel}>Tipo de lançamento</Text>
            <View style={styles.typeRow}>
              {["single", "ep", "album"].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeButton,
                    releaseType === t && styles.typeButtonActive,
                  ]}
                  onPress={() => setReleaseType(t as any)}
                >
                  <Text
                    style={[
                      styles.typeText,
                      releaseType === t && styles.typeTextActive,
                    ]}
                  >
                    {t.toUpperCase()}
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

        {/* ================================================= */}
        {/* ================== ETAPA 4 ====================== */}
        {/* ================================================= */}

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
            >
              <Text style={styles.publishText}>Publicar música</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ============================================================= */
/* ============================ STYLES =========================== */
/* ============================================================= */

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

  /* --------- ETAPA 1 --------- */
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
    paddingVertical: 10,
  },
  fileSelectedText: {
    color: "#ddd",
    fontSize: 14,
  },

  /* --------- ETAPA 2 --------- */
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
    color: "#5b523eff",
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
    backgroundColor: "#5b523eff",
  },

  /* --------- ETAPA 3 --------- */
  inputLabel: {
    color: "#bbb",
    fontSize: 13,
    marginTop: 14,
    marginBottom: 6,
  },
  inputBox: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.14)",
  },
  inputText: {
    color: "#fff",
    fontSize: 14,
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
    backgroundColor: "#5b523eff",
    borderColor: "#5b523eff",
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
    backgroundColor: "#5b523eff",
    borderRadius: 10,
    alignItems: "center",
  },
  nextStepText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "600",
  },

  /* --------- ETAPA 4 --------- */
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
    borderColor: "#5b523eff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxInner: {
    width: 12,
    height: 12,
    backgroundColor: "#5b523eff",
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
    backgroundColor: "#5b523eff",
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
