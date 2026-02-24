import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function Index() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Text style={styles.logo}>Sonnor</Text>

      <Image
        source={require("../assets/motion.gif")}
        style={styles.gif}
        resizeMode="contain"
      />

      <Text style={styles.tagline}>
        Mais de 1k de pessoas confiam na Sonnor
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primary}
          onPress={() => router.push("/auth/login")}
        >
          <Text style={styles.primaryText}>Entrar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondary}
          onPress={() => router.push("/auth/new-account")}
        >
          <Text style={styles.secondaryText}>Criar Conta</Text>
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
  logo: {
    marginTop: 60,
    textAlign: "center",
    fontSize: 48,
    color: "#fff",
    fontFamily: "Bristol",
  },
  gif: {
    position: "absolute",
    width: width * 1.3,
    height: height * 0.45,
    top: height * 0.23,
    left: -width * 0.2,
  },
  tagline: {
    position: "absolute",
    top: height * 0.23 + height * 0.45 - 60,
    left: 24,
    fontSize: 26,
    color: "#fff",
    fontWeight: "700",
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
  secondary: {
    borderWidth: 1,
    borderColor: "#fff",
    paddingVertical: 16,
    borderRadius: 32,
    alignItems: "center",
  },
  secondaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
});
