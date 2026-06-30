import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { sendPasswordResetCode } from "../../firebase/auth";

import BackIcon from "../../icons/BackIcon";
import MailIcon from "../../icons/MailIcon";

import { isValidEmail } from "../../firebase/validate";
import { useResponsive } from "../../utils/responsive"; // O Teu Hook

export default function ForgotPassword() {
  const router = useRouter();
  const { wp, hp, font } = useResponsive();

  const [email, setEmail] = useState("");
  const [errorEmail, setErrorEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (loading) return;

    setErrorEmail(false);

    if (!isValidEmail(email)) {
      setErrorEmail(true);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
      setLoading(true);
      await sendPasswordResetCode(cleanEmail);

      router.push({
        pathname: "/auth/verify-mail",
        params: { email: cleanEmail },
      });
    } catch (err: any) {
      console.log("RESET PASSWORD ERROR:", {
        code: err?.code,
        details: err?.details,
        message: err?.message,
      });

      if (
        err?.code === "functions/not-found" ||
        err?.code === "functions/invalid-argument"
      ) {
        setErrorEmail(true);
        return;
      }

      if (err?.code === "functions/failed-precondition") {
        Alert.alert(
          "Error",
          "The email sender is not configured correctly in Firebase Functions.",
        );
        return;
      }

      if (err?.code === "functions/resource-exhausted") {
        Alert.alert(
          "Error",
          "Too many reset requests were made. Please try again in a moment.",
        );
        return;
      }

      if (err?.code === "functions/unavailable") {
        Alert.alert(
          "Error",
          "The email service is temporarily unavailable. Try again in a moment.",
        );
        return;
      }

      Alert.alert(
        "Error",
        err?.message ?? "Unable to send the verification code right now.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View
      style={[
        styles.container,
        { paddingHorizontal: wp(6.5), paddingTop: hp(8) },
      ]}
    >
      {/* BACK BUTTON */}
      <TouchableOpacity
        style={[styles.backButton, { marginBottom: hp(2.5), gap: wp(1.5) }]}
        onPress={() => router.push("/auth/login")}
      >
        <BackIcon size={font(22)} color="#fff" />
        <Text style={[styles.backText, { fontSize: font(15) }]}>BACK</Text>
      </TouchableOpacity>

      {/* LOGO */}
      <Text
        style={[styles.logoText, { fontSize: font(60), marginBottom: hp(5) }]}
      >
        Sonnor
      </Text>

      {/* TEXTS */}
      <Text style={[styles.titleLarge, { fontSize: font(34) }]}>
        Forget password?
      </Text>
      <Text
        style={[styles.subtitle, { fontSize: font(16), marginBottom: hp(4) }]}
      >
        Enter your email
      </Text>

      {/* INPUT CONTAINER */}
      <View
        style={[
          styles.inputContainer,
          { height: hp(7), paddingHorizontal: wp(5), borderRadius: hp(7) / 2 },
          errorEmail && { borderColor: "#8B0000", borderWidth: 1.5 },
        ]}
      >
        <MailIcon size={font(22)} color="#8f8f99" />
        <TextInput
          placeholder="Email"
          placeholderTextColor="#808080"
          style={[styles.input, { fontSize: font(16), paddingLeft: wp(2.5) }]}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setErrorEmail(false);
          }}
        />
      </View>

      {/* SEND BUTTON */}
      <TouchableOpacity
        style={[
          styles.sendButton,
          { height: hp(7), borderRadius: hp(7) / 2, marginTop: hp(4) },
        ]}
        onPress={handleReset}
        disabled={loading}
      >
        <Text style={[styles.sendText, { fontSize: font(18) }]}>
          {loading ? "sending..." : "send"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    color: "#fff",
    fontWeight: "500",
  },
  logoText: {
    fontFamily: "Bristol",
    color: "#fff",
    textAlign: "center",
  },
  titleLarge: {
    color: "#fff",
    fontWeight: "700",
  },
  subtitle: {
    color: "#ccc",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
  },
  input: {
    flex: 1,
    color: "#fff",
  },
  sendButton: {
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
  },
  sendText: {
    color: "#fff",
    fontWeight: "600",
    textTransform: "lowercase",
    // Keeps the visual style of the "send" text.
  },
});
