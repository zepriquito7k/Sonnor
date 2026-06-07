import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { login } from "../../firebase/auth";
import { isValidEmail } from "../../firebase/validate";
import { useResponsive } from "../../utils/responsive"; // Importado o seu hook

export default function LoginScreen() {
  const router = useRouter();
  const { wp, hp, font } = useResponsive(); // Inicializando as funções de escala

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const previousPasswordRef = useRef("");

  function handlePasswordChange(value: string) {
    const previousValue = previousPasswordRef.current;

    setPassword(value);
    previousPasswordRef.current = value;

    const receivedIosAutofill =
      Platform.OS === "ios" &&
      value.length > 1 &&
      previousValue.length === 0 &&
      passwordInputRef.current?.isFocused();

    if (!receivedIosAutofill) {
      return;
    }

    requestAnimationFrame(() => {
      emailInputRef.current?.blur();
      passwordInputRef.current?.blur();
      Keyboard.dismiss();
    });
  }

  async function handleLogin() {
    setError(false);

    if (!isValidEmail(email) || password.trim() === "") {
      setError(true);
      Alert.alert("Dados em falta", "Escreve um email valido e a password.");
      return;
    }

    try {
      await login(email, password);
      router.replace("/main/home");
    } catch (err: any) {
      setError(true);

      if (err?.code === "auth/user-not-found") {
        Alert.alert(
          "Conta nao encontrada",
          "Ainda nao existe uma conta com estes dados. Cria conta primeiro.",
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Criar conta",
              onPress: () => router.push("/auth/new-account"),
            },
          ],
        );
        return;
      }

      if (
        err?.code === "auth/wrong-password" ||
        err?.code === "auth/invalid-credential"
      ) {
        Alert.alert(
          "Login invalido",
          "Confirma se o email e a password estao iguais aos do Firebase Authentication.",
        );
        return;
      }

      Alert.alert("Erro no login", "Nao foi possivel entrar agora.");
    }
  }

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/Background.gif")}
        style={[styles.background, { width: wp(100), height: hp(100) }]}
        resizeMode="cover"
      />
      <View style={[styles.overlay, { width: wp(100), height: hp(100) }]} />

      <Text style={[styles.logo, { marginTop: hp(8), fontSize: font(48) }]}>
        Sonnor
      </Text>

      <View
        style={[styles.form, { marginTop: hp(13), paddingHorizontal: wp(6) }]}
      >
        <Text style={[styles.title, { fontSize: font(22) }]}>
          Iniciar sessão
        </Text>

        <TextInput
          ref={emailInputRef}
          style={[
            styles.input,
            error && styles.inputError,
            {
              height: hp(6.5),
              borderRadius: wp(8),
              fontSize: font(16),
              paddingHorizontal: wp(5),
            },
          ]}
          placeholder="Email"
          placeholderTextColor="#777"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          ref={passwordInputRef}
          style={[
            styles.input,
            error && styles.inputError,
            {
              height: hp(6.5),
              borderRadius: wp(8),
              fontSize: font(16),
              paddingHorizontal: wp(5),
            },
          ]}
          placeholder="Password"
          placeholderTextColor="#777"
          autoComplete="current-password"
          secureTextEntry
          textContentType="password"
          value={password}
          onChangeText={handlePasswordChange}
        />

        <TouchableOpacity onPress={() => router.push("/auth/forgot-password")}>
          <Text style={[styles.forgot, { fontSize: font(13) }]}>
            Esqueceste-te da password?
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[styles.actions, { bottom: hp(5), paddingHorizontal: wp(6) }]}
      >
        <TouchableOpacity
          style={[
            styles.primary,
            { paddingVertical: hp(1.8), borderRadius: wp(8) },
          ]}
          onPress={handleLogin}
        >
          <Text style={[styles.primaryText, { fontSize: font(16) }]}>
            Entrar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.apple,
            { paddingVertical: hp(1.8), borderRadius: wp(8) },
          ]}
        >
          <Ionicons name="logo-apple" size={font(20)} color="#000" />
          <Text style={[styles.appleText, { fontSize: font(15) }]}>
            Iniciar sessão com Apple
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.secondary,
            { paddingVertical: hp(1.8), borderRadius: wp(8) },
          ]}
          onPress={() => router.push("/auth/new-account")}
        >
          <Text style={[styles.secondaryText, { fontSize: font(15) }]}>
            Criar conta
          </Text>
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
    opacity: 0.5,
  },
  overlay: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  logo: {
    textAlign: "center",
    color: "#fff",
    fontFamily: "Bristol",
  },
  form: {
    gap: 14,
  },
  title: {
    color: "#fff",
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#111",
    color: "#fff",
  },
  inputError: {
    borderWidth: 1,
    borderColor: "#8B0000",
  },
  forgot: {
    color: "#777",
    alignSelf: "flex-end",
  },
  actions: {
    position: "absolute",
    left: 0,
    right: 0,
    gap: 14,
  },
  primary: {
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: "#000",
    fontWeight: "600",
  },
  apple: {
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  appleText: {
    color: "#000",
    fontWeight: "500",
  },
  secondary: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    color: "#fff",
    fontWeight: "600",
  },
});
