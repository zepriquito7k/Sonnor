import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import BackIcon from "../../icons/BackIcon";
import MailIcon from "../../icons/MailIcon";

import { fetchSignInMethodsForEmail } from "firebase/auth";
import { auth } from "../../firebase/config";
import { isValidEmail } from "../../firebase/validate";

export default function ForgotPassword() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [errorEmail, setErrorEmail] = useState(false);

  async function handleReset() {
    setErrorEmail(false);

    // 1. Validar email
    if (!isValidEmail(email)) {
      setErrorEmail(true);
      return;
    }

    try {
      // 2. Checar se o email existe no Firebase DE VERDADE
      const clean = email.trim().toLowerCase();
      const methods = await fetchSignInMethodsForEmail(auth, clean);

      console.log("SIGN-IN METHODS:", methods);

      // Se NÃO existir nenhum tipo de login associado → email não existe
      if (methods.length === 0) {
        setErrorEmail(true);
        return;
      }

      // 3. Se existir → avança para a verify-mail
      router.push({
        pathname: "/auth/verify-mail",
        params: { email: clean },
      });
    } catch (err) {
      console.log("FORGOT ERROR:", err);
      setErrorEmail(true);
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

      <Text style={styles.titleLarge}>Forget password?</Text>
      <Text style={styles.subtitle}>Enter your email</Text>

      {/* INPUT */}
      <View
        style={[
          styles.inputContainer,
          errorEmail && { borderColor: "#8B0000", borderWidth: 1.5 },
        ]}
      >
        <MailIcon size={22} color="#8f8f99" />
        <TextInput
          placeholder="Email"
          placeholderTextColor="#808080"
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setErrorEmail(false);
          }}
        />
      </View>

      <TouchableOpacity style={styles.sendButton} onPress={handleReset}>
        <Text style={styles.sendText}>send</Text>
      </TouchableOpacity>
    </View>
  );
}

///////////////////////////////////////////////////////
// ESTILOS — IGUAL AO LOGIN
///////////////////////////////////////////////////////

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
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    paddingLeft: 10,
  },

  sendButton: {
    backgroundColor: "#222",
    height: 55,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 50,
    marginTop: 30,
  },
  sendText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
