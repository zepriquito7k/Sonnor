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

import BackIcon from "../../icons/BackIcon";
import EyeClosed from "../../icons/EyeClosed";
import EyeOpen from "../../icons/EyeOpen";
import KeyIcon from "../../icons/KeyIcon";
import LockIcon from "../../icons/LockIcon";
import MailIcon from "../../icons/MailIcon";

export default function NewAccount() {
  const router = useRouter();

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
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push("/auth/login")}
      >
        <BackIcon size={22} color="#fff" />
        <Text style={styles.backText}>BACK</Text>
      </TouchableOpacity>

      <Text style={styles.logoText}>Sonnor</Text>

      <Text style={styles.titleLarge}>Let’s get</Text>
      <Text style={styles.titleLarge}>started</Text>

      {/* EMAIL */}
      <View
        style={[
          styles.inputContainer,
          errorEmail && { borderColor: "#8B0000", borderWidth: 1 },
        ]}
      >
        <MailIcon size={22} color="#8f8f99" />
        <TextInput
          style={styles.input}
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
          errorPassword && { borderColor: "#8B0000", borderWidth: 1 },
        ]}
      >
        <LockIcon size={22} color="#8f8f99" />

        {/* Input escondido */}
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

        {/* Input visível */}
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
        <KeyIcon size={22} color="#8f8f99" />

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

      <TouchableOpacity style={styles.signInButton} onPress={handleCreate}>
        <Text style={styles.signInButtonText}>Sign Up</Text>
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

  signInButton: {
    backgroundColor: "#fff",
    borderRadius: 50,
    height: 55,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 35,
  },
  signInButtonText: { color: "#000", fontSize: 18, fontWeight: "600" },
});
