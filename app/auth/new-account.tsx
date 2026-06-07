import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  register,
  sendSignupCode,
  verifySignupCode,
} from "../../firebase/auth";
import { isValidEmail } from "../../firebase/validate";
import { useResponsive } from "../../utils/responsive";

type Step = "choice" | "email" | "code" | "password";

function getSignupCodeErrorAlert(error: any) {
  if (error?.code === "functions/already-exists") {
    return {
      message: "Este email ja tem conta. Podes entrar pelo login.",
      title: "Conta ja existe",
    };
  }

  if (error?.code === "functions/permission-denied") {
    return {
      message:
        "A funcao que envia o codigo ainda nao esta publica/publicada para criar conta sem login.",
      title: "Permissao no Firebase",
    };
  }

  if (error?.code === "functions/failed-precondition") {
    return {
      message:
        "O Gmail SMTP ainda nao esta configurado no servidor.",
      title: "Email nao configurado",
    };
  }

  if (error?.code === "functions/not-found") {
    return {
      message:
        "A funcao de enviar codigo ainda nao foi publicada no Firebase. Publica as Functions e tenta outra vez.",
      title: "Funcao nao publicada",
    };
  }

  if (error?.code === "functions/resource-exhausted") {
    return {
      message: "Foram pedidos codigos demais agora. Espera um pouco e tenta novamente.",
      title: "Muitos pedidos",
    };
  }

  if (error?.code === "functions/unavailable") {
    return {
      message: "O servico de email esta temporariamente indisponivel. Tenta novamente em instantes.",
      title: "Email indisponivel",
    };
  }

  return {
    message: "Nao foi possivel enviar o codigo agora.",
    title: "Erro",
  };
}

export default function NewAccount() {
  const router = useRouter();
  const { hp, font } = useResponsive();

  const [step, setStep] = useState<Step>("choice");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const codeInputs = useRef<(TextInput | null)[]>([]);

  const stepCopy = useMemo(() => {
    if (step === "choice") {
      return {
        title: "Criar conta",
        subtitle: "Escolhe como queres comecar no Sonnor.",
      };
    }

    if (step === "email") {
      return {
        title: "Qual e o teu email?",
        subtitle: "Vamos enviar um codigo de 4 digitos antes de criar a conta.",
      };
    }

    if (step === "code") {
      return {
        title: "Confirma o codigo",
        subtitle: `Enviamos 4 digitos para ${email.trim().toLowerCase()}.`,
      };
    }

    return {
      title: "Cria a tua chave",
      subtitle: "Agora escolhe uma password para proteger a tua conta.",
    };
  }, [email, step]);

  async function handleSendCode() {
    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      Alert.alert("Email invalido", "Escreve um email valido.");
      return;
    }

    try {
      setLoading(true);
      await sendSignupCode(cleanEmail);
      setEmail(cleanEmail);
      setStep("code");
    } catch (error: any) {
      console.log("SEND SIGNUP CODE ERROR:", error);

      const alert = getSignupCodeErrorAlert(error);
      Alert.alert(alert.title, alert.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (code.trim().length !== 4) {
      Alert.alert("Codigo incompleto", "Escreve os 4 digitos enviados por email.");
      return;
    }

    try {
      setLoading(true);
      await verifySignupCode(email, code);
      setStep("password");
    } catch (error) {
      console.log("VERIFY SIGNUP CODE ERROR:", error);
      Alert.alert("Codigo invalido", "Confirma o codigo ou pede outro.");
    } finally {
      setLoading(false);
    }
  }

  function handleCodeDigitChange(value: string, index: number) {
    const digits = code.padEnd(4, " ").split("");
    const pastedDigits = value.replace(/\D/g, "");

    if (pastedDigits.length > 1) {
      pastedDigits
        .slice(0, 4 - index)
        .split("")
        .forEach((digit, offset) => {
          digits[index + offset] = digit;
        });

      const nextCode = digits.join("").replace(/\s/g, "");
      setCode(nextCode);

      const nextEmptyIndex = digits.findIndex((digit) => digit === " ");
      if (nextCode.length === 4 || nextEmptyIndex === -1) {
        Keyboard.dismiss();
      } else {
        codeInputs.current[nextEmptyIndex]?.focus();
      }

      return;
    }

    const digit = pastedDigits.slice(-1);

    digits[index] = digit;

    const nextCode = digits.join("").replace(/\s/g, "");
    setCode(nextCode);

    if (digit && index < 3) {
      codeInputs.current[index + 1]?.focus();
      return;
    }

    if (digit && index === 3 && nextCode.length === 4) {
      Keyboard.dismiss();
    }
  }

  function handleCodeBackspace(index: number) {
    if (code[index] || index === 0) {
      return;
    }

    codeInputs.current[index - 1]?.focus();
  }

  async function handleCreateAccount() {
    if (password.trim().length < 6) {
      Alert.alert("Password curta", "A password precisa de pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirm) {
      Alert.alert("Passwords diferentes", "Confirma a mesma password nos dois campos.");
      return;
    }

    try {
      setLoading(true);
      await register(email, password);
      router.replace("/onboarding/create-profile");
    } catch (error: any) {
      console.log("CREATE ACCOUNT ERROR:", error);

      if (error?.code === "auth/email-already-in-use") {
        Alert.alert("Conta ja existe", "Este email ja tem conta. Podes entrar pelo login.");
        return;
      }

      Alert.alert("Erro", "Nao foi possivel criar a conta agora.");
    } finally {
      setLoading(false);
    }
  }

  function handleApple() {
    Alert.alert("Apple", "A opcao Apple esta pronta no visual. Falta ligar o provedor Apple no Firebase.");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.root}
    >
      <Image
        source={require("../../assets/Background.gif")}
        style={styles.background}
        resizeMode="cover"
      />
      <View style={styles.overlay} />

      <View style={[styles.content, { paddingTop: hp(7) }]}>
        <Pressable style={styles.backButton} onPress={() => step === "choice" ? router.replace("/") : setStep("choice")}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>

        <Text style={[styles.logo, { fontSize: font(46) }]}>Sonnor</Text>

        <View style={styles.heroText}>
          <Text style={[styles.eyebrow, { fontSize: font(12) }]}>Sonnor account</Text>
          <Text style={[styles.title, { fontSize: font(34) }]}>{stepCopy.title}</Text>
          <Text style={[styles.subtitle, { fontSize: font(14) }]}>{stepCopy.subtitle}</Text>
        </View>

        <View style={styles.panel}>
          {step === "choice" ? (
            <>
              <TouchableOpacity style={styles.appleButton} onPress={handleApple}>
                <Ionicons name="logo-apple" size={22} color="#000" />
                <Text style={styles.appleText}>Iniciar com Apple</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mailButton} onPress={() => setStep("email")}>
                <Ionicons name="mail-outline" size={20} color="#fff" />
                <Text style={styles.mailText}>Iniciar com Mail</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {step === "email" ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="email@exemplo.com"
                placeholderTextColor="#777"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
              />
              <TouchableOpacity
                disabled={loading}
                style={[styles.greenButton, loading ? styles.buttonDisabled : null]}
                onPress={handleSendCode}
              >
                <Text style={styles.greenText}>{loading ? "A enviar..." : "Enviar codigo"}</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {step === "code" ? (
            <>
              <View style={styles.codeGrid}>
                {[0, 1, 2, 3].map((index) => (
                  <TextInput
                    key={index}
                    ref={(input) => {
                      codeInputs.current[index] = input;
                    }}
                    style={[
                      styles.codeBox,
                      code[index] ? styles.codeBoxFilled : null,
                    ]}
                    keyboardType="number-pad"
                    maxLength={4}
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    value={code[index] ?? ""}
                    onChangeText={(value) => handleCodeDigitChange(value, index)}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === "Backspace") {
                        handleCodeBackspace(index);
                      }
                    }}
                    selectTextOnFocus
                  />
                ))}
              </View>
              <TouchableOpacity
                disabled={loading}
                style={[styles.greenButton, loading ? styles.buttonDisabled : null]}
                onPress={handleVerifyCode}
              >
                <Text style={styles.greenText}>{loading ? "A confirmar..." : "Confirmar codigo"}</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={loading} style={styles.ghostButton} onPress={handleSendCode}>
                <Text style={styles.ghostText}>Enviar outro codigo</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {step === "password" ? (
            <>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  placeholderTextColor="#777"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword((value) => !value)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={21} color="#aaa" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Confirmar password"
                placeholderTextColor="#777"
                secureTextEntry={!showPassword}
                value={confirm}
                onChangeText={setConfirm}
              />
              <TouchableOpacity
                disabled={loading}
                style={[styles.greenButton, loading ? styles.buttonDisabled : null]}
                onPress={handleCreateAccount}
              >
                <Text style={styles.greenText}>{loading ? "A criar..." : "Criar conta"}</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        <TouchableOpacity style={styles.loginLink} onPress={() => router.replace("/auth/login")}>
          <Text style={styles.loginText}>Ja tenho conta</Text>
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
  background: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.68)",
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  logo: {
    color: "#fff",
    fontFamily: "Bristol",
    textAlign: "center",
    marginTop: 8,
  },
  heroText: {
    marginTop: 54,
    marginBottom: 22,
  },
  eyebrow: {
    color: "#6F8FAF",
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    color: "#fff",
    fontWeight: "900",
    letterSpacing: 0,
  },
  subtitle: {
    color: "#b8b8b8",
    lineHeight: 21,
    marginTop: 10,
  },
  panel: {
    borderRadius: 28,
    padding: 16,
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  appleButton: {
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  appleText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "900",
  },
  mailButton: {
    minHeight: 56,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  mailText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  input: {
    minHeight: 54,
    borderRadius: 18,
    paddingHorizontal: 16,
    color: "#fff",
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    fontSize: 15,
  },
  codeGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  codeBox: {
    flex: 1,
    height: 62,
    borderRadius: 18,
    color: "#fff",
    fontSize: 27,
    fontWeight: "900",
    textAlign: "center",
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  codeBoxFilled: {
    borderColor: "#6F8FAF",
    backgroundColor: "rgba(111,143,175,0.12)",
  },
  codeInput: {
    textAlign: "center",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 10,
  },
  passwordRow: {
    minHeight: 54,
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  passwordInput: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
  },
  greenButton: {
    minHeight: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6F8FAF",
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  greenText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "900",
  },
  ghostButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostText: {
    color: "#aaa",
    fontWeight: "800",
  },
  loginLink: {
    alignSelf: "center",
    marginTop: 22,
  },
  loginText: {
    color: "#fff",
    fontWeight: "800",
  },
});
