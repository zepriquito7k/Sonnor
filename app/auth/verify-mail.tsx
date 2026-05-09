import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  sendPasswordResetCode,
  verifyPasswordResetCode,
} from "../../firebase/auth";

import BackIcon from "../../icons/BackIcon";

export default function VerifyMail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const email = Array.isArray(params.email) ? params.email[0] : params.email;

  const [codes, setCodes] = useState(["", "", "", ""]);
  const [errorCode, setErrorCode] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const inputsRef = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  function handleCodeChange(value: string, index: number) {
    if (value.length > 1) value = value.slice(-1);

    const updated = [...codes];
    updated[index] = value;
    setCodes(updated);
    setErrorCode(false);

    if (value && index < 3) inputsRef[index + 1].current?.focus();
    if (!value && index > 0) inputsRef[index - 1].current?.focus();

    if (updated.every((n) => n !== "")) Keyboard.dismiss();
  }

  async function handleVerify() {
    if (verifyLoading) return;

    const fullCode = codes.join("");

    if (!email || fullCode.length < 4) {
      setErrorCode(true);
      return;
    }

    try {
      setVerifyLoading(true);
      const { resetToken } = await verifyPasswordResetCode(email, fullCode);

      router.push({
        pathname: "/auth/new-password",
        params: { email, resetToken },
      });
    } catch (err: any) {
      console.log("OTP ERROR:", err);
      setErrorCode(true);

      let message = "Unable to verify the code right now.";

      if (err?.code === "functions/deadline-exceeded") {
        message = "This code expired. Please request a new one.";
      } else if (err?.code === "functions/permission-denied") {
        message = "The verification code is incorrect.";
      } else if (err?.code === "functions/not-found") {
        message = "No verification code was found for this email.";
      }

      Alert.alert("Error", message);
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleResend() {
    if (!email || resendLoading) return;
    setResendLoading(true);

    try {
      await sendPasswordResetCode(email);

      Alert.alert(
        "Code sent",
        "A new verification code was sent to your email.",
      );
    } catch (err) {
      console.log("RESEND ERROR:", err);
      Alert.alert("Error", "Failed to resend code.");
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <BackIcon size={22} color="#fff" />
        <Text style={styles.backText}>BACK</Text>
      </TouchableOpacity>

      <Text style={styles.logo}>Sonnor</Text>

      <Text style={styles.title}>Verify your mail</Text>

      <Text style={styles.subtitle}>
        Please enter the 4 digit code{"\n"}Sent to your mail
      </Text>

      <View style={styles.codeRow}>
        {codes.map((_, index) => (
          <TextInput
            key={index}
            ref={inputsRef[index]}
            keyboardType="number-pad"
            maxLength={1}
            value={codes[index]}
            onChangeText={(t) => handleCodeChange(t, index)}
            style={[
              styles.codeBox,
              errorCode && { borderColor: "#8B0000", borderWidth: 2 },
            ]}
          />
        ))}
      </View>

      <TouchableOpacity onPress={handleResend} disabled={resendLoading}>
        <Text style={[styles.resend, resendLoading && { opacity: 0.5 }]}>
          {resendLoading ? "Sending..." : "Resend Code"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.verifyButton, verifyLoading && { opacity: 0.7 }]}
        onPress={handleVerify}
        disabled={verifyLoading}
      >
        <Text style={styles.verifyText}>
          {verifyLoading ? "Verifying..." : "Verify"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

///////////////////////////////////////////////////////
// ESTILOS
///////////////////////////////////////////////////////

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 25,
    paddingTop: 60,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  backText: {
    color: "#fff",
    fontSize: 15,
  },

  logo: {
    fontFamily: "Bristol",
    fontSize: 60,
    color: "#fff",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 40,
  },

  title: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "700",
    marginBottom: 15,
  },

  subtitle: {
    color: "#ccc",
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 35,
  },

  codeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  codeBox: {
    width: 65,
    height: 65,
    backgroundColor: "#111",
    borderRadius: 12,
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },

  resend: {
    alignSelf: "flex-end",
    marginRight: 5,
    marginBottom: 40,
    color: "#8f8f99",
    fontSize: 15,
  },

  verifyButton: {
    backgroundColor: "#222",
    height: 60,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },

  verifyText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
