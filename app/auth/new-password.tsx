import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { changePassword } from "../../firebase/auth";
import BackIcon from "../../icons/BackIcon";
import EyeClosed from "../../icons/EyeClosed";
import EyeOpen from "../../icons/EyeOpen";
import LockIcon from "../../icons/LockIcon";

export default function NewPassword() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorPassword, setErrorPassword] = useState(false);
  const [errorConfirm, setErrorConfirm] = useState(false);

  async function handleCreatePassword() {
    setErrorPassword(password.trim() === "");
    setErrorConfirm(confirm.trim() === "" || confirm !== password);

    if (password.trim() === "" || confirm.trim() === "" || confirm !== password)
      return;

    try {
      await changePassword(password);
      router.push("/auth/login");
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push("/auth/login")}
      >
        <BackIcon size={22} color="#fff" />
        <Text style={styles.backText}>BACK</Text>
      </TouchableOpacity>

      <Text style={styles.logoText}>Sonnor</Text>

      <Text style={styles.titleLarge}>New password</Text>
      <Text style={styles.subtitle}>Create new password</Text>

      {/* PASSWORD */}
      <View
        style={[
          styles.inputContainer,
          errorPassword && { borderColor: "#8B0000", borderWidth: 1 },
        ]}
      >
        <LockIcon size={22} color="#8f8f99" />

        {!showPassword && (
          <TextInput
            style={[styles.input, { opacity: 1 }]}
            placeholder="Password"
            placeholderTextColor="#808080"
            secureTextEntry={true}
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setErrorPassword(false);
            }}
          />
        )}

        {showPassword && (
          <TextInput
            style={[styles.input, { opacity: 0.4 }]}
            placeholder="Password"
            placeholderTextColor="#808080"
            secureTextEntry={false}
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setErrorPassword(false);
            }}
          />
        )}

        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <EyeOpen size={22} color="#fff" />
          ) : (
            <EyeClosed size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* CONFIRM PASSWORD */}
      <View
        style={[
          styles.inputContainer,
          errorConfirm && { borderColor: "#8B0000", borderWidth: 1 },
        ]}
      >
        <LockIcon size={22} color="#8f8f99" />

        {!showConfirm && (
          <TextInput
            style={[styles.input, { opacity: 1 }]}
            placeholder="Confirm password"
            placeholderTextColor="#808080"
            secureTextEntry={true}
            value={confirm}
            onChangeText={(t) => {
              setConfirm(t);
              setErrorConfirm(false);
            }}
          />
        )}

        {showConfirm && (
          <TextInput
            style={[styles.input, { opacity: 0.4 }]}
            placeholder="Confirm password"
            placeholderTextColor="#808080"
            secureTextEntry={false}
            value={confirm}
            onChangeText={(t) => {
              setConfirm(t);
              setErrorConfirm(false);
            }}
          />
        )}

        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowConfirm(!showConfirm)}
        >
          {showConfirm ? (
            <EyeOpen size={22} color="#fff" />
          ) : (
            <EyeClosed size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.createButton}
        onPress={handleCreatePassword}
      >
        <Text style={styles.createText}>Create</Text>
      </TouchableOpacity>
    </View>
  );
}

////////////////////////////////////////////////////////////
// ESTILOS
////////////////////////////////////////////////////////////

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 25,
    paddingTop: 70,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 20,
  },

  backText: { color: "#fff", fontSize: 15, fontWeight: "500" },

  logoText: {
    fontFamily: "Bristol",
    fontSize: 60,
    color: "#fff",
    textAlign: "center",
    marginBottom: 40,
  },

  titleLarge: { color: "#fff", fontSize: 34 },
  subtitle: { color: "#ccc", fontSize: 16, marginBottom: 30 },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 50,
    paddingHorizontal: 20,
    height: 55,
    marginTop: 20,
    borderWidth: 0,
  },

  input: { flex: 1, color: "#fff", fontSize: 16, paddingLeft: 10 },

  eyeButton: {
    position: "absolute",
    right: 20,
    opacity: 0.3,
  },

  createButton: {
    backgroundColor: "#222",
    height: 55,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },

  createText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
