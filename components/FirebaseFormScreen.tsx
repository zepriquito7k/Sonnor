import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { pickLibraryAsset } from "../utils/mediaPicker";

type FormField = {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  defaultValue?: string;
  warningWhenEmpty?: string;
  type?: "text" | "image";
};

type FirebaseFormScreenProps = {
  title: string;
  subtitle: string;
  fields: FormField[];
  submitLabel: string;
  onSubmit: (values: Record<string, string>) => Promise<void>;
};

export default function FirebaseFormScreen({
  title,
  subtitle,
  fields,
  submitLabel,
  onSubmit,
}: FirebaseFormScreenProps) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.key, field.defaultValue ?? ""])),
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);

    try {
      await onSubmit(values);
      Alert.alert("Guardado", "As alteracoes foram preparadas com sucesso.");
    } catch (error) {
      console.log("FORM SAVE ERROR:", error);
      Alert.alert("Erro", "Nao foi possivel guardar agora.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Sonnor Studio</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        <View style={styles.progressRail}>
          <View style={styles.progressFill} />
        </View>

        <View style={styles.form}>
          {fields.map((field) => (
            <View key={field.key} style={styles.fieldBlock}>
              <Text style={styles.label}>{field.label}</Text>
              {field.type === "image" ? (
                <View style={styles.imagePickerBlock}>
                  {values[field.key] ? (
                    <Image
                      source={{ uri: values[field.key] }}
                      style={styles.imagePreview}
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="image-outline" size={28} color="#888" />
                    </View>
                  )}

                  <Pressable
                    style={styles.pickButton}
                    onPress={async () => {
                      const asset = await pickLibraryAsset({
                        mediaTypes: "images",
                        quality: 0.9,
                      });
                      const uri = asset?.uri ?? null;

                      if (!uri) {
                        return;
                      }

                      setValues((current) => ({ ...current, [field.key]: uri }));
                    }}
                  >
                    <Ionicons name="images-outline" size={18} color="#fff" />
                    <Text style={styles.pickButtonText}>
                      {values[field.key] ? "Trocar imagem" : "Escolher imagem"}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  {!values[field.key]?.trim() && field.warningWhenEmpty ? (
                    <Text style={styles.fieldWarning}>{field.warningWhenEmpty}</Text>
                  ) : null}
                  <TextInput
                    style={[styles.input, field.multiline && styles.inputMultiline]}
                    placeholder={field.placeholder ?? field.label}
                    placeholderTextColor="#777"
                    multiline={field.multiline}
                    value={values[field.key]}
                    onChangeText={(value) =>
                      setValues((current) => ({ ...current, [field.key]: value }))
                    }
                  />
                </>
              )}
            </View>
          ))}
        </View>

        <Pressable
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          <Ionicons name="cloud-done-outline" size={20} color="#000" />
          <Text style={styles.submitText}>
            {saving ? "A guardar..." : submitLabel}
          </Text>
        </Pressable>
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
    paddingHorizontal: 20,
    paddingTop: 62,
    paddingBottom: 180,
  },
  header: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
    marginBottom: 26,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.09)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 0,
  },
  eyebrow: {
    color: "#6F8FAF",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 5,
    textTransform: "uppercase",
  },
  subtitle: {
    color: "#b7b7b7",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  progressRail: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.09)",
    marginBottom: 24,
    overflow: "hidden",
  },
  progressFill: {
    width: "42%",
    height: "100%",
    borderRadius: 2,
    backgroundColor: "#6F8FAF",
  },
  form: {
    gap: 16,
  },
  fieldBlock: {
    gap: 9,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.065)",
  },
  label: {
    color: "#d8d8d8",
    fontSize: 13,
    fontWeight: "900",
  },
  fieldWarning: {
    color: "#ff5f5f",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
  input: {
    minHeight: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#fff",
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  inputMultiline: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  imagePickerBlock: {
    gap: 10,
  },
  imagePreview: {
    width: "100%",
    height: 210,
    borderRadius: 18,
    backgroundColor: "#111",
  },
  imagePlaceholder: {
    width: "100%",
    height: 150,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.065)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  pickButton: {
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: "#1f1f1f",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  pickButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  submitButton: {
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: "#6F8FAF",
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "900",
  },
});
