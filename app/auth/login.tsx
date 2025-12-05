import { useRouter } from "expo-router";
import React, { useState } from "react";
import { login } from "../../firebase/auth";
import { isValidEmail } from "../../firebase/validate";

import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import AppleIcon from "../../icons/AppleIcon";
import EyeClosed from "../../icons/EyeClosed";
import EyeOpen from "../../icons/EyeOpen";
import GoogleIcon from "../../icons/GoogleIcon";
import LockIcon from "../../icons/LockIcon";
import MailIcon from "../../icons/MailIcon";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [errorEmail, setErrorEmail] = useState(false);
  const [errorPassword, setErrorPassword] = useState(false);

  async function handleLogin() {
    setErrorEmail(false);
    setErrorPassword(false);

    // EMAIL INVÁLIDO
    if (!isValidEmail(email)) {
      setErrorEmail(true);
      return;
    }

    // PASSWORD VAZIA
    if (password.trim() === "") {
      setErrorPassword(true);
      return;
    }

    try {
      await login(email, password);
      router.push("/main/home");
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        setErrorEmail(true);
      } else if (err.code === "auth/invalid-credential") {
        setErrorEmail(true);
        setErrorPassword(true);
      } else {
        setErrorEmail(true);
        setErrorPassword(true);
      }
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logoText}>Sonnor</Text>

      <Text style={styles.titleLarge}>hello</Text>
      <Text style={styles.titleLarge}>welcome</Text>

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
          autoCapitalize="none"
          keyboardType="email-address"
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

        <TextInput
          style={[styles.input, { opacity: showPassword ? 0.4 : 1 }]}
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

      <TouchableOpacity
        style={styles.forgotPassContainer}
        onPress={() => router.push("/auth/forgot-password")}
      >
        <Text style={styles.forgotPassText}>forgot the password?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.newAccountContainer}
        onPress={() => router.push("/auth/new-account")}
      >
        <Text style={styles.newAccountText}>new account</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signInButton} onPress={handleLogin}>
        <Text style={styles.signInButtonText}>Sign In</Text>
      </TouchableOpacity>

      <View style={styles.dividerContainer}>
        <View style={styles.line}></View>
        <Text style={styles.orText}>OR</Text>
        <View style={styles.line}></View>
      </View>

      <TouchableOpacity style={styles.appleButton}>
        <View style={styles.iconContainerLeft}>
          <AppleIcon size={22} color="#fff" />
        </View>
        <Text style={styles.providerText}>Continue with apple</Text>
        <View style={styles.iconContainerRight} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.googleButton}>
        <View style={styles.iconContainerLeft}>
          <GoogleIcon size={22} />
        </View>
        <Text style={styles.providerText}>Continue with google</Text>
        <View style={styles.iconContainerRight} />
      </TouchableOpacity>

      <Text style={styles.footerText}>
        By continuing you confirm that you agree to our Terms of Service,
        Privacy Policy and good behavior in chat with users
      </Text>
    </View>
  );
}

////////////////////////////////////////////////////////////
// ESTILOS — IGUAL AO TEU
////////////////////////////////////////////////////////////

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 25,
    paddingTop: 80,
  },

  eyeButton: {
    position: "absolute",
    right: 20,
    opacity: 0.3,
  },

  iconContainerLeft: {
    position: "absolute",
    left: 20,
  },
  iconContainerRight: {
    width: 22,
    height: 22,
    opacity: 0,
  },

  logoText: {
    fontFamily: "Bristol",
    fontSize: 60,
    color: "#fff",
    textAlign: "center",
    marginBottom: 40,
  },

  titleLarge: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "700",
    marginLeft: 5,
    marginBottom: 2,
  },

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

  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    paddingLeft: 10,
  },

  forgotPassContainer: {
    marginTop: 10,
    alignSelf: "flex-end",
    paddingRight: 15,
  },

  forgotPassText: {
    color: "#838383",
    fontSize: 13,
  },

  newAccountContainer: {
    marginTop: 30,
    marginBottom: -20,
    alignSelf: "flex-end",
    paddingRight: 20,
  },

  newAccountText: {
    color: "#838383",
    fontSize: 13,
  },

  signInButton: {
    backgroundColor: "#fff",
    borderRadius: 50,
    height: 55,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25,
  },

  signInButtonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "600",
  },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 30,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#333",
  },

  orText: {
    color: "#777",
    marginHorizontal: 10,
    fontSize: 14,
  },

  appleButton: {
    backgroundColor: "#111",
    borderRadius: 50,
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    position: "relative",
  },

  googleButton: {
    backgroundColor: "#111",
    borderRadius: 50,
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  providerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  footerText: {
    color: "#666",
    fontSize: 10,
    textAlign: "center",
    marginTop: 25,
    lineHeight: 18,
  },
});
