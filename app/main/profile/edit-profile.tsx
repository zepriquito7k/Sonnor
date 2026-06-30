import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { MUSIC_GENRES } from "../../../constants/musicGenres";
import { getProfileContent } from "../../../firebase/contentClient";
import { updateUserProfile } from "../../../firebase/userProfile";
import { useCurrentUser } from "../../../hooks/useCurrentUser";

type HiddenField = "birthDate" | "location" | "interests";

function formatBirthDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  return [day, month, year].filter(Boolean).join("/");
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useCurrentUser();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [hiddenFields, setHiddenFields] = useState<HiddenField[]>([]);
  const [interestQuery, setInterestQuery] = useState("");

  useEffect(() => {
    let active = true;

    if (!user?.uid) {
      setLoading(false);
      return;
    }

    getProfileContent(user.uid)
      .then((content) => {
        if (!active) {
          return;
        }

        const profile = content.user as Record<string, unknown>;

        setBio(typeof profile.bio === "string" ? profile.bio : "");
        setBirthDate(typeof profile.birthDate === "string" ? profile.birthDate : "");
        setCountry(typeof profile.country === "string" ? profile.country : "");
        setCity(typeof profile.city === "string" ? profile.city : "");
        setInterests(
          Array.isArray(profile.interests)
            ? profile.interests.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
            : [],
        );
        setHiddenFields(
          Array.isArray(profile.profileHiddenFields)
            ? profile.profileHiddenFields.filter((field: unknown): field is HiddenField =>
                field === "birthDate" || field === "location" || field === "interests",
              )
            : [],
        );
      })
      .catch((error) => {
        console.log("LOAD EDIT PROFILE ERROR:", error);
        Alert.alert("Error", "Could not load the profile.");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user?.uid]);

  const visibleInterestOptions = useMemo(() => {
    const query = interestQuery.trim().toLowerCase();

    if (!query) {
      return MUSIC_GENRES;
    }

    return MUSIC_GENRES.filter((option) =>
      option.toLowerCase().includes(query),
    );
  }, [interestQuery]);

  function toggleInterest(option: string) {
    setInterests((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
    );
  }

  function toggleHiddenField(field: HiddenField) {
    setHiddenFields((current) =>
      current.includes(field)
        ? current.filter((item) => item !== field)
        : [...current, field],
    );
  }

  async function handleSave() {
    if (!user?.uid || saving) {
      return;
    }

    if (birthDate.trim() && !/^\d{2}\/\d{2}\/\d{4}$/.test(birthDate.trim())) {
      Alert.alert("Data incompleta", "Usa o formato DD/MM/AAAA.");
      return;
    }

    try {
      setSaving(true);
      await updateUserProfile(user.uid, {
        bio: bio.trim(),
        birthDate: birthDate.trim(),
        country: country.trim(),
        city: city.trim(),
        interests,
        profileHiddenFields: hiddenFields,
      });
      router.back();
    } catch (error) {
      console.log("SAVE EDIT PROFILE ERROR:", error);
      Alert.alert("Error", "Could not guardar o profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <View style={styles.root} />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.root}
    >
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Public profile</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.label}>Bio</Text>
        <TextInput
          multiline
          placeholder="Uma bio curta"
          placeholderTextColor="#777"
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
        />

        <Text style={styles.label}>Birth date</Text>
        <TextInput
          keyboardType="number-pad"
          placeholder="DD/MM/AAAA"
          placeholderTextColor="#777"
          maxLength={10}
          style={styles.input}
          value={birthDate}
          onChangeText={(value) => setBirthDate(formatBirthDate(value))}
        />

        <Text style={styles.label}>Location</Text>
        <TextInput
          autoCapitalize="words"
          placeholder="City"
          placeholderTextColor="#777"
          style={styles.input}
          value={city}
          onChangeText={setCity}
        />
        <TextInput
          autoCapitalize="words"
          placeholder="Pais"
          placeholderTextColor="#777"
          style={styles.input}
          value={country}
          onChangeText={setCountry}
        />

        <Text style={styles.label}>Styles que gostas</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={22} color="#111" />
          <TextInput
            autoCapitalize="none"
            placeholder="Search estilos"
            placeholderTextColor="#555"
            style={styles.searchInput}
            value={interestQuery}
            onChangeText={setInterestQuery}
          />
        </View>
        <View style={styles.chipGrid}>
          {visibleInterestOptions.map((option) => {
            const selected = interests.includes(option);

            return (
              <Pressable
                key={option}
                style={[styles.chip, selected ? styles.chipSelected : null]}
                onPress={() => toggleInterest(option)}
              >
                <Text style={[styles.chipText, selected ? styles.chipTextSelected : null]}>
                  {option}
                </Text>
                {selected ? <Ionicons name="checkmark" size={16} color="#000" /> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.privacyBox}>
          <Text style={styles.privacyTitle}>Hide on profile</Text>
          {[
            { field: "birthDate" as const, label: "Birth year/date" },
            { field: "location" as const, label: "Country and city" },
            { field: "interests" as const, label: "Categories I like" },
          ].map((item) => (
            <View key={item.field} style={styles.switchRow}>
              <Text style={styles.switchText}>{item.label}</Text>
              <Switch
                value={hiddenFields.includes(item.field)}
                onValueChange={() => toggleHiddenField(item.field)}
                trackColor={{ false: "#333", true: "#E6E6E6" }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          disabled={saving}
          style={[styles.saveButton, saving ? styles.disabledButton : null]}
          onPress={handleSave}
        >
          <Text style={styles.saveText}>{saving ? "Saving..." : "Save"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    minHeight: 96,
    paddingHorizontal: 20,
    paddingTop: 48,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 150,
  },
  label: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 20,
    marginBottom: 10,
  },
  input: {
    minHeight: 56,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    marginBottom: 10,
  },
  textArea: {
    minHeight: 108,
    textAlignVertical: "top",
  },
  searchBox: {
    minHeight: 54,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f4f4f4",
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: "#111",
    fontSize: 16,
    fontWeight: "900",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#181818",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  chipSelected: {
    backgroundColor: "#E6E6E6",
    borderColor: "#E6E6E6",
  },
  chipText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  chipTextSelected: {
    color: "#000",
  },
  privacyBox: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginTop: 24,
  },
  privacyTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 8,
  },
  switchRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  switchText: {
    flex: 1,
    color: "#ddd",
    fontSize: 15,
    fontWeight: "800",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 112,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 34,
    backgroundColor: "#000",
  },
  saveButton: {
    minHeight: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E6E6E6",
  },
  saveText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
