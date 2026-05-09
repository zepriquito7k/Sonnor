import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { register } from "../../firebase/auth";
import { emailExists } from "../../firebase/authExtra";
import { isValidEmail } from "../../firebase/validate";
import { useResponsive } from "../../utils/responsive"; // Import do seu hook

import BackIcon from "../../icons/BackIcon";
import EyeClosed from "../../icons/EyeClosed";
import EyeOpen from "../../icons/EyeOpen";
import KeyIcon from "../../icons/KeyIcon";
import LockIcon from "../../icons/LockIcon";
import MailIcon from "../../icons/MailIcon";

export default function NewAccount() {
  const router = useRouter();
  const { wp, hp, font } = useResponsive(); // Inicializando responsividade

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorEmail, setErrorEmail] = useState(false);
  const [errorPassword, setErrorPassword] = useState(false);
  const [errorConfirm, setErrorConfirm] = useState(false);

  async function handleCreate() {
    setErrorEmail(false);

    if (!isValidEmail(email)) {
      setErrorEmail(true);
      return;
    }

    const exists = await emailExists(email);
    if (exists) {
      setErrorEmail(true);
      return;
    }

    try {
      await register(email, password);
      router.push("/auth/login");
    } catch (err) {
      setErrorEmail(true);
      console.log("CREATE ERROR:", err);
    }
  }

  return (
    <View
      style={[
        styles.container,
        { paddingHorizontal: wp(6.4), paddingTop: hp(8) },
      ]}
    >
      <TouchableOpacity
        style={[styles.backButton, { marginBottom: hp(2.4) }]}
        onPress={() => router.push("/auth/login")}
      >
        <BackIcon size={font(22)} color="#fff" />
        <Text style={[styles.backText, { fontSize: font(15) }]}>BACK</Text>
      </TouchableOpacity>

      <Text
        style={[styles.logoText, { fontSize: font(60), marginBottom: hp(4.7) }]}
      >
        Sonnor
      </Text>

      <Text style={[styles.titleLarge, { fontSize: font(34) }]}>Let’s get</Text>
      <Text style={[styles.titleLarge, { fontSize: font(34) }]}>started</Text>

      {/* EMAIL */}
      <View
        style={[
          styles.inputContainer,
          { height: hp(6.5), marginTop: hp(2.4), borderRadius: wp(12) },
          errorEmail && { borderColor: "#8B0000", borderWidth: 1 },
        ]}
      >
        <MailIcon size={font(22)} color="#8f8f99" />
        <TextInput
          style={[styles.input, { fontSize: font(16), paddingLeft: wp(2.5) }]}
          placeholder="Email"
          placeholderTextColor="#808080"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setErrorEmail(false);
          }}
        />
      </View>

      {/* PASSWORD */}
      <View
        style={[
          styles.inputContainer,
          { height: hp(6.5), marginTop: hp(2.4), borderRadius: wp(12) },
          errorPassword && { borderColor: "#8B0000", borderWidth: 1 },
        ]}
      >
        <LockIcon size={font(22)} color="#8f8f99" />

        <TextInput
          style={[
            styles.input,
            {
              fontSize: font(16),
              paddingLeft: wp(2.5),
              opacity: showPassword ? 0.4 : 1,
            },
          ]}
          placeholder="Password"
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
            <EyeOpen size={font(22)} color="#fff" />
          ) : (
            <EyeClosed size={font(22)} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* CONFIRM PASSWORD */}
      <View
        style={[
          styles.inputContainer,
          { height: hp(6.5), marginTop: hp(2.4), borderRadius: wp(12) },
          errorConfirm && { borderColor: "#8B0000", borderWidth: 1 },
        ]}
      >
        <KeyIcon size={font(22)} color="#8f8f99" />

        <TextInput
          style={[
            styles.input,
            {
              fontSize: font(16),
              paddingLeft: wp(2.5),
              opacity: showConfirm ? 0.4 : 1,
            },
          ]}
          placeholder="Confirm password"
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
            <EyeOpen size={font(22)} color="#fff" />
          ) : (
            <EyeClosed size={font(22)} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[
          styles.signInButton,
          { height: hp(6.5), marginTop: hp(4), borderRadius: wp(12) },
        ]}
        onPress={handleCreate}
      >
        <Text style={[styles.signInButtonText, { fontSize: font(18) }]}>
          Sign Up
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
    gap: 5,
  },
  backText: { color: "#fff", fontWeight: "500" },

  logoText: {
    fontFamily: "Bristol",
    color: "#fff",
    textAlign: "center",
  },

  titleLarge: { color: "#fff" },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    paddingHorizontal: 20,
    borderWidth: 0,
  },

  input: { flex: 1, color: "#fff" },

  eyeButton: {
    position: "absolute",
    opacity: 0.3,
  },

  signInButton: {
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  signInButtonText: { color: "#000", fontWeight: "600" },
});
