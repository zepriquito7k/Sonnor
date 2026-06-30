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
      message: "This email already has an account. You can sign in from login.",
      title: "Account already exists",
    };
  }

  if (error?.code === "functions/permission-denied") {
    return {
      message:
        "The function that sends the code is not public/published yet for account creation without login.",
      title: "Firebase permission",
    };
  }

  if (error?.code === "functions/failed-precondition") {
    return {
      message:
        "Gmail SMTP is not configured on the server yet.",
      title: "Email not configured",
    };
  }

  if (error?.code === "functions/not-found") {
    return {
      message:
        "The code sending function has not been published in Firebase yet. Publish the Functions and try again.",
      title: "Function not published",
    };
  }

  if (error?.code === "functions/resource-exhausted") {
    return {
      message: "Too many codes were requested right now. Wait a little and try again.",
      title: "Too many requests",
    };
  }

  if (error?.code === "functions/unavailable") {
    return {
      message: "The email service is temporarily unavailable. Try again in a moment.",
      title: "Email unavailable",
    };
  }

  return {
    message: "Could not send the code right now.",
    title: "Error",
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
        title: "Create account",
        subtitle: "Choose how you want to start on Sonnor.",
      };
    }

    if (step === "email") {
      return {
        title: "What is your email?",
        subtitle: "We will send a 4-digit code before creating the account.",
      };
    }

    if (step === "code") {
      return {
        title: "Confirm the code",
        subtitle: `We sent 4 digits to ${email.trim().toLowerCase()}.`,
      };
    }

    return {
      title: "Create your password",
      subtitle: "Now choose a password to protect your account.",
    };
  }, [email, step]);

  async function handleSendCode() {
    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      Alert.alert("Invalid email", "Enter a valid email.");
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
      Alert.alert("Incomplete code", "Enter the 4 digits sent by email.");
      return;
    }

    try {
      setLoading(true);
      await verifySignupCode(email, code);
      setStep("password");
    } catch (error) {
      console.log("VERIFY SIGNUP CODE ERROR:", error);
      Alert.alert("Invalid code", "Confirm the code or request another.");
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
      Alert.alert("Password too short", "The password must have at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      Alert.alert("Passwords do not match", "Enter the same password in both fields.");
      return;
    }

    try {
      setLoading(true);
      await register(email, password);
      router.replace("/onboarding/create-profile");
    } catch (error: any) {
      console.log("CREATE ACCOUNT ERROR:", error);

      if (error?.code === "auth/email-already-in-use") {
        Alert.alert("Account already exists", "This email already has an account. You can sign in from login.");
        return;
      }

      Alert.alert("Error", "Could not create the account right now.");
    } finally {
      setLoading(false);
    }
  }

  function handleApple() {
    Alert.alert("Apple", "The Apple option is ready visually. The Apple provider still needs to be connected in Firebase.");
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
                <Text style={styles.greenText}>{loading ? "Sending..." : "Send code"}</Text>
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
                <Text style={styles.greenText}>{loading ? "Confirming..." : "Confirm code"}</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={loading} style={styles.ghostButton} onPress={handleSendCode}>
                <Text style={styles.ghostText}>Send another code</Text>
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
                <Text style={styles.greenText}>{loading ? "Creating..." : "Create account"}</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        <TouchableOpacity style={styles.loginLink} onPress={() => router.replace("/auth/login")}>
          <Text style={styles.loginText}>I already have an account</Text>
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
    color: "#E6E6E6",
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
    borderColor: "#E6E6E6",
    backgroundColor: "rgba(255,255,255,0.10)",
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
    backgroundColor: "#E6E6E6",
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
