import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { completePasswordReset } from "../../firebase/auth";
import { useResponsive } from "../../utils/responsive";

// Ícones
import BackIcon from "../../icons/BackIcon";
import EyeClosed from "../../icons/EyeClosed";
import EyeOpen from "../../icons/EyeOpen";
import KeyIcon from "../../icons/KeyIcon";
import LockIcon from "../../icons/LockIcon";

export default function NewPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string | string[];
    resetToken?: string | string[];
  }>();
  const { wp, hp, font } = useResponsive();
  const email = Array.isArray(params.email) ? params.email[0] : params.email;
  const resetToken = Array.isArray(params.resetToken)
    ? params.resetToken[0]
    : params.resetToken;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorPassword, setErrorPassword] = useState(false);
  const [errorConfirm, setErrorConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleUpdate() {
    if (loading) return;

    setErrorPassword(false);
    setErrorConfirm(false);

    if (!email || !resetToken) {
      Alert.alert(
        "Error",
        "Your password reset session expired. Please request a new code.",
      );
      router.replace("/auth/forgot-password");
      return;
    }

    if (password.length < 6) {
      setErrorPassword(true);
      Alert.alert("Error", "Your new password must have at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setErrorConfirm(true);
      Alert.alert("Erro", "As senhas não coincidem.");
      return;
    }

    try {
      setLoading(true);
      await completePasswordReset(email, resetToken, password);
      // Lógica Firebase aqui
      Alert.alert("Success", "Your password was updated.");
      router.replace("/auth/login");
    } catch (err: any) {
      console.log("UPDATE PASSWORD ERROR:", err);
      Alert.alert(
        "Error",
        err?.message ?? "Unable to update the password right now.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.mainContainer}
    >
      <View
        style={[
          styles.content,
          {
            paddingHorizontal: wp(6.4),
            paddingTop: hp(8),
            paddingBottom: hp(5),
          },
        ]}
      >
        {/* TOPO: VOLTAR */}
        <TouchableOpacity
          style={[styles.backButton, { marginBottom: hp(2.4), gap: wp(2) }]}
          onPress={() => router.back()}
        >
          <BackIcon size={font(22)} color="#fff" />
          <Text style={[styles.backText, { fontSize: font(15) }]}>BACK</Text>
        </TouchableOpacity>

        {/* LOGO */}
        <Text
          style={[styles.logoText, { fontSize: font(60), marginBottom: hp(4) }]}
        >
          Sonnor
        </Text>

        {/* TÍTULOS */}
        <View style={{ marginBottom: hp(4) }}>
          <Text
            style={[
              styles.titleLarge,
              { fontSize: font(34), lineHeight: font(40) },
            ]}
          >
            Reset your
          </Text>
          <Text
            style={[
              styles.titleLarge,
              { fontSize: font(34), lineHeight: font(40) },
            ]}
          >
            password
          </Text>
        </View>

        {/* INPUTS */}
        <View style={styles.inputsWrapper}>
          <View
            style={[
              styles.inputContainer,
              {
                height: hp(7),
                borderRadius: hp(7) / 2,
                paddingHorizontal: wp(5),
                marginBottom: hp(2),
              },
              errorPassword && styles.errorBorder,
            ]}
          >
            <LockIcon size={font(20)} color="#8f8f99" />
            <TextInput
              style={[
                styles.input,
                { fontSize: font(16), marginLeft: wp(3), paddingRight: wp(10) },
              ]}
              placeholder="New Password"
              placeholderTextColor="#808080"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setErrorPassword(false);
              }}
            />
            <TouchableOpacity
              style={[styles.eyeButton, { right: wp(5) }]}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOpen size={font(20)} color="#fff" />
              ) : (
                <EyeClosed size={font(20)} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.inputContainer,
              {
                height: hp(7),
                borderRadius: hp(7) / 2,
                paddingHorizontal: wp(5),
              },
              errorConfirm && styles.errorBorder,
            ]}
          >
            <KeyIcon size={font(20)} color="#8f8f99" />
            <TextInput
              style={[
                styles.input,
                { fontSize: font(16), marginLeft: wp(3), paddingRight: wp(10) },
              ]}
              placeholder="Confirm Password"
              placeholderTextColor="#808080"
              secureTextEntry={!showConfirm}
              value={confirm}
              onChangeText={(t) => {
                setConfirm(t);
                setErrorConfirm(false);
              }}
            />
            <TouchableOpacity
              style={[styles.eyeButton, { right: wp(5) }]}
              onPress={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? (
                <EyeOpen size={font(20)} color="#fff" />
              ) : (
                <EyeClosed size={font(20)} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* BOTÃO FINAL */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { height: hp(7), marginTop: hp(5), borderRadius: hp(7) / 2 },
          ]}
          onPress={handleUpdate}
          disabled={loading}
        >
          <Text style={[styles.submitButtonText, { fontSize: font(18) }]}>
            {loading ? "Updating..." : "Update Password"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    flex: 1, // Ocupa todo o espaço sem scroll
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
    fontWeight: "800",
  },
  inputsWrapper: {
    width: "100%",
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
  errorBorder: {
    borderColor: "#8B0000",
    borderWidth: 1.5,
  },
  eyeButton: {
    position: "absolute",
    opacity: 0.5,
  },
  submitButton: {
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonText: {
    color: "#000",
    fontWeight: "700",
  },
});
