import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";

import { MUSIC_GENRES } from "../../constants/musicGenres";
import { uploadUriToStorage } from "../../firebase/storageClient";
import { updateUserProfile } from "../../firebase/userProfile";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { getRandomAvatarFallbackColor } from "../../utils/avatarFallback";
import { pickLibraryAsset } from "../../utils/mediaPicker";
import { useResponsive } from "../../utils/responsive";
import {
  MAX_AVATAR_GIF_DURATION_SECONDS,
  getImageUploadExtension,
  isAvatarGifDurationAllowed,
} from "../../utils/uploadAsset";

type StepKey = "displayName" | "username" | "photo" | "birthDate" | "location" | "interests" | "review";

const steps: StepKey[] = ["displayName", "username", "photo", "birthDate", "location", "interests", "review"];

export default function CreateProfileScreen() {
  const { user } = useCurrentUser();
  const { font, hp } = useResponsive();

  const [stepIndex, setStepIndex] = useState(0);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [profileImageExtension, setProfileImageExtension] = useState("jpg");
  const [avatarFallbackColor] = useState(() => getRandomAvatarFallbackColor());
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [interestQuery, setInterestQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const step = steps[stepIndex];
  const progress = `${((stepIndex + 1) / steps.length) * 100}%` as `${number}%`;

  useEffect(() => {
    if (user?.displayName && !displayName.trim()) {
      setDisplayName(user.displayName);
    }

  }, [displayName, user?.displayName]);

  const canContinue = useMemo(() => {
    if (step === "displayName") {
      return displayName.trim().length >= 2;
    }

    if (step === "username") {
      return username.trim().length >= 3;
    }

    if (step === "birthDate") {
      return /^\d{2}\/\d{2}\/\d{4}$/.test(birthDate.trim());
    }

    if (step === "location") {
      return country.trim().length >= 2 && city.trim().length >= 2;
    }

    if (step === "interests") {
      return interests.length >= 3;
    }

    return true;
  }, [birthDate, city, country, displayName, interests.length, step, username]);

  function goBack() {
    if (stepIndex === 0) {
      router.back();
      return;
    }

    setStepIndex((current) => current - 1);
  }

  function goNext() {
    if (!canContinue) {
      if (step === "interests") {
        Alert.alert("Choose a few more", "Select at least 3 styles to personalize your Sonnor.");
        return;
      }

      Alert.alert("Missing detail", "Fill in this step before continuing.");
      return;
    }

    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  function toggleInterest(option: string) {
    setInterests((current) => {
      if (current.includes(option)) {
        return current.filter((item) => item !== option);
      }

      return [...current, option];
    });
  }

  function formatBirthDate(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    const day = digits.slice(0, 2);
    const month = digits.slice(2, 4);
    const year = digits.slice(4, 8);

    return [day, month, year].filter(Boolean).join("/");
  }

  async function pickImage() {
    const asset = await pickLibraryAsset({
      allowsEditing: false,
      mediaTypes: "images",
      quality: 0.9,
    });

    if (asset?.uri) {
      const extension = getImageUploadExtension(asset);

      if (extension === "gif") {
        try {
          const allowed = await isAvatarGifDurationAllowed(asset.uri);

          if (!allowed) {
            Alert.alert(
              "GIF too long",
              `The profile GIF must be at most ${MAX_AVATAR_GIF_DURATION_SECONDS} seconds.`,
            );
            return;
          }
        } catch (error) {
          console.log("GIF DURATION CHECK ERROR:", error);
        }
      }

      setProfileImage(asset.uri);
      setProfileImageExtension(extension);
    }
  }

  async function handleCreateProfile() {
    if (!user) {
      Alert.alert("Session expired", "Sign in again to finish your profile.");
      return;
    }

    try {
      setSaving(true);

      let avatarUrl = "";
      let bannerUrl = "";

      if (profileImage) {
        const avatarUpload = await uploadUriToStorage(
          { kind: "avatar", userId: user.uid, extension: profileImageExtension },
          profileImage,
        );

        avatarUrl = avatarUpload.downloadUrl;

        if (profileImageExtension !== "gif") {
          const bannerUpload = await uploadUriToStorage(
            { kind: "banner", userId: user.uid },
            profileImage,
          );
          bannerUrl = bannerUpload.downloadUrl;
        }
      }

      await updateUserProfile(user.uid, {
        username: username.trim(),
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl,
        avatarFallbackColor,
        bannerUrl,
        country: country.trim(),
        city: city.trim(),
        birthDate: birthDate.trim(),
        interests,
        profileHiddenFields: ["birthDate", "location"],
        onboardingCompleted: true,
      });

      router.replace("/main/home");
    } catch (error) {
      console.log("CREATE PROFILE ERROR:", error);
      Alert.alert("Error", "Could not create the profile right now.");
    } finally {
      setSaving(false);
    }
  }

  const visibleInterestOptions = useMemo(() => {
    const query = interestQuery.trim().toLowerCase();

    if (!query) {
      return MUSIC_GENRES;
    }

    return MUSIC_GENRES.filter((option) =>
      option.toLowerCase().includes(query),
    );
  }, [interestQuery]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.root}
    >
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={goBack}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </Pressable>
        <Text style={styles.topTitle}>Create profile</Text>
        <View style={styles.topSpacer} />
      </View>

      <View style={styles.progressRail}>
        <View style={[styles.progressFill, { width: progress }]} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: hp(7) }]}
      >
        {step === "displayName" ? (
          <View style={styles.stepBlock}>
            <Text style={[styles.question, { fontSize: font(38) }]}>What is your name?</Text>
            <TextInput
              autoCapitalize="words"
              placeholder="Your name"
              placeholderTextColor="#777"
              style={styles.spotifyInput}
              value={displayName}
              onChangeText={setDisplayName}
            />
            <Text style={styles.helperText}>This appears on your Sonnor profile.</Text>
            <TextInput
              multiline
              placeholder="A short bio, if you want"
              placeholderTextColor="#777"
              style={[styles.spotifyInput, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
            />
          </View>
        ) : null}

        {step === "username" ? (
          <View style={styles.stepBlock}>
            <Text style={[styles.question, { fontSize: font(38) }]}>Choose a unique name</Text>
            <View style={styles.usernameBox}>
              <Text style={styles.atSign}>@</Text>
              <TextInput
                autoCapitalize="none"
                placeholder="yourname"
                placeholderTextColor="#777"
                style={styles.usernameInput}
                value={username}
                onChangeText={(value) => setUsername(value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
              />
            </View>
            <Text style={styles.helperText}>Use at least 3 characters. Avoid adding private information.</Text>
          </View>
        ) : null}

        {step === "photo" ? (
          <View style={styles.centerStep}>
            <Text style={[styles.question, styles.centerQuestion, { fontSize: font(36) }]}>Add a photo or GIF</Text>
            <Pressable style={styles.avatarPicker} onPress={pickImage}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <View
                  style={[
                    styles.avatarImage,
                    styles.avatarColorPreview,
                    { backgroundColor: avatarFallbackColor },
                  ]}
                >
                  <Ionicons name="person" size={58} color="#fff" />
                </View>
              )}
            </Pressable>
            <TouchableOpacity style={styles.secondaryPill} onPress={pickImage}>
              <Ionicons name="images-outline" size={18} color="#fff" />
              <Text style={styles.secondaryPillText}>{profileImage ? "Change photo/GIF" : "Choose photo/GIF"}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {step === "birthDate" ? (
          <View style={styles.stepBlock}>
            <Text style={[styles.question, { fontSize: font(38) }]}>What is your date of birth?</Text>
            <TextInput
              keyboardType="number-pad"
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#777"
              style={styles.spotifyInput}
              maxLength={10}
              value={birthDate}
              onChangeText={(value) => setBirthDate(formatBirthDate(value))}
            />
            <Text style={styles.helperText}>This detail helps keep your account right for you.</Text>
          </View>
        ) : null}

        {step === "location" ? (
          <View style={styles.stepBlock}>
            <Text style={[styles.question, { fontSize: font(38) }]}>Where are you from?</Text>
            <TextInput
              autoCapitalize="words"
              placeholder="Country"
              placeholderTextColor="#777"
              style={styles.spotifyInput}
              value={country}
              onChangeText={setCountry}
            />
            <TextInput
              autoCapitalize="words"
              placeholder="City"
              placeholderTextColor="#777"
              style={styles.spotifyInput}
              value={city}
              onChangeText={setCity}
            />
          </View>
        ) : null}

        {step === "interests" ? (
          <View style={styles.stepBlock}>
            <Text style={[styles.question, { fontSize: font(36) }]}>Choose 3 or more styles you like.</Text>
            <View style={styles.searchLikeBox}>
              <Ionicons name="search-outline" size={24} color="#111" />
              <TextInput
                autoCapitalize="none"
                placeholder="Search styles"
                placeholderTextColor="#555"
                style={styles.searchLikeInput}
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
                    <Text style={[styles.chipText, selected ? styles.chipTextSelected : null]}>{option}</Text>
                    {selected ? <Ionicons name="checkmark" size={17} color="#000" /> : null}
                  </Pressable>
                );
              })}
            </View>
            {visibleInterestOptions.length === 0 ? (
              <Text style={styles.helperText}>Could not find esse estilo.</Text>
            ) : null}
          </View>
        ) : null}

        {step === "review" ? (
          <View style={styles.reviewStep}>
            <View style={styles.reviewAvatarStack}>
              <View style={[styles.reviewBubble, styles.reviewBubbleLeft]}>
                <Text style={styles.reviewBubbleText}>{displayName.trim().slice(0, 1).toUpperCase() || "S"}</Text>
              </View>
              <View style={styles.reviewBubble}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.reviewImage} />
                ) : (
                  <Ionicons name="person" size={32} color="#fff" />
                )}
              </View>
              <View style={[styles.reviewBubble, styles.reviewBubbleRight]}>
                <Ionicons name="musical-notes" size={30} color="#000" />
              </View>
            </View>
            <Text style={[styles.question, styles.centerQuestion, { fontSize: font(36) }]}>Excelente escolha.</Text>
            <Text style={styles.reviewText}>Your profile will be ready with {interests.slice(0, 3).join(", ")}.</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {step === "photo" ? (
          <TouchableOpacity style={styles.skipButton} onPress={goNext}>
            <Text style={styles.skipText}>Not now</Text>
          </TouchableOpacity>
        ) : null}

        {step === "review" ? (
          <TouchableOpacity
            disabled={saving}
            style={[styles.primaryPill, saving ? styles.disabledButton : null]}
            onPress={handleCreateProfile}
          >
            {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryText}>Create profile</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            disabled={!canContinue}
            style={[styles.primaryPill, !canContinue ? styles.disabledButton : null]}
            onPress={goNext}
          >
            <Text style={styles.primaryText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  topBar: {
    minHeight: 96,
    paddingHorizontal: 22,
    paddingTop: 48,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  topTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  topSpacer: {
    width: 44,
  },
  progressRail: {
    height: 3,
    backgroundColor: "#181818",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#E6E6E6",
  },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 170,
  },
  stepBlock: {
    gap: 18,
  },
  centerStep: {
    minHeight: 460,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  question: {
    color: "#fff",
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 46,
  },
  centerQuestion: {
    textAlign: "center",
  },
  spotifyInput: {
    minHeight: 64,
    borderRadius: 7,
    paddingHorizontal: 18,
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    backgroundColor: "#0b0b0b",
    borderWidth: 1.5,
    borderColor: "#d7d7d7",
  },
  bioInput: {
    minHeight: 116,
    paddingTop: 16,
    fontSize: 17,
    fontWeight: "800",
    textAlignVertical: "top",
  },
  helperText: {
    color: "#e9e9e9",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 22,
  },
  usernameBox: {
    minHeight: 64,
    borderRadius: 7,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0b0b0b",
    borderWidth: 1.5,
    borderColor: "#d7d7d7",
  },
  atSign: {
    color: "#8e8e8e",
    fontSize: 22,
    fontWeight: "900",
    marginRight: 2,
  },
  usernameInput: {
    flex: 1,
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  avatarPicker: {
    width: 168,
    height: 168,
    borderRadius: 84,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1b1b1b",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarColorPreview: {
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryPill: {
    minHeight: 48,
    borderRadius: 24,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  secondaryPillText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  searchLikeBox: {
    minHeight: 58,
    borderRadius: 5,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f4f4f4",
  },
  searchLikeInput: {
    flex: 1,
    color: "#111",
    fontSize: 18,
    fontWeight: "900",
    minHeight: 52,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingTop: 8,
  },
  chip: {
    minHeight: 46,
    borderRadius: 23,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  reviewStep: {
    minHeight: 520,
    alignItems: "center",
    justifyContent: "center",
    gap: 22,
  },
  reviewAvatarStack: {
    width: 190,
    height: 86,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewBubble: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#222",
    borderWidth: 2,
    borderColor: "#000",
    overflow: "hidden",
  },
  reviewBubbleLeft: {
    backgroundColor: "#E6E6E6",
    marginRight: -14,
  },
  reviewBubbleRight: {
    backgroundColor: "#fff",
    marginLeft: -14,
  },
  reviewBubbleText: {
    color: "#000",
    fontSize: 28,
    fontWeight: "900",
  },
  reviewImage: {
    width: "100%",
    height: "100%",
  },
  reviewText: {
    maxWidth: 280,
    color: "#bdbdbd",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 22,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 128,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 34,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#000",
  },
  primaryPill: {
    width: "58%",
    minWidth: 216,
    maxWidth: 320,
    minHeight: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E6E6E6",
  },
  primaryText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.45,
  },
  skipButton: {
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: {
    color: "#bdbdbd",
    fontSize: 14,
    fontWeight: "900",
  },
});
