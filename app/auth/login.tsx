import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { login } from "../../firebase/auth";
import { isValidEmail } from "../../firebase/validate";

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  async function handleLogin() {
    setError(false);

    if (!isValidEmail(email) || password.trim() === "") {
      setError(true);
      return;
    }

    try {
      await login(email, password);
      router.replace("/main/home");
    } catch {
      setError(true);
    }
  }

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/Background.gif")}
        style={styles.background}
        resizeMode="cover"
      />
      <View style={styles.overlay} />

      <Text style={styles.logo}>Sonnor</Text>

      <View style={styles.form}>
        <Text style={styles.title}>Iniciar sessão</Text>

        <TextInput
          style={[styles.input, error && styles.inputError]}
          placeholder="Email"
          placeholderTextColor="#777"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={[styles.input, error && styles.inputError]}
          placeholder="Password"
          placeholderTextColor="#777"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity onPress={() => router.push("/auth/forgot-password")}>
          <Text style={styles.forgot}>Esqueceste-te da password?</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primary} onPress={handleLogin}>
          <Text style={styles.primaryText}>Entrar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.apple}>
          <Ionicons name="logo-apple" size={20} color="#000" />
          <Text style={styles.appleText}>Iniciar sessão com Apple</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  background: {
    position: "absolute",
    width,
    height,
    opacity: 0.5,
  },
  overlay: {
    position: "absolute",
    width,
    height,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  logo: {
    marginTop: 70,
    textAlign: "center",
    fontSize: 48,
    color: "#fff",
    fontFamily: "Bristol",
  },
  form: {
    marginTop: 110,
    paddingHorizontal: 24,
    gap: 14,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  input: {
    height: 54,
    borderRadius: 30,
    backgroundColor: "#111",
    paddingHorizontal: 20,
    color: "#fff",
    fontSize: 16,
  },
  inputError: {
    borderWidth: 1,
    borderColor: "#8B0000",
  },
  forgot: {
    color: "#777",
    fontSize: 13,
    alignSelf: "flex-end",
  },
  actions: {
    position: "absolute",
    bottom: 40,
    left: 24,
    right: 24,
    gap: 14,
  },
  primary: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 32,
    alignItems: "center",
  },
  primaryText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  apple: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 32,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  appleText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "500",
  },
});
