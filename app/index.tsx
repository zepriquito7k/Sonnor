import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* LOGO */}
      <Text style={styles.logo}>Sonnor</Text>
      <Text style={styles.logo}></Text>
      <Text style={styles.logo}></Text>

      {/* TEXTO GRANDE */}
      <Text style={styles.bigText}>Join music</Text>
      <Text style={styles.bigText}>with the</Text>
      <Text style={styles.bigText}>Sonnor</Text>

      {/* BOTÃO START */}
      <TouchableOpacity
        style={styles.startButton}
        onPress={() => router.push("/auth/login")}
      >
        <Text style={styles.startText}>Start</Text>
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
    backgroundColor: "#000000ff",
    paddingHorizontal: 25,
    paddingTop: 60,
  },

  logo: {
    fontFamily: "Bristol",
    fontSize: 60,
    color: "#fff",
    textAlign: "center",
    marginBottom: 30,
  },

  // TEXTO GRANDE EM BAIXO
  bigText: {
    color: "#eee",
    fontSize: 52,
    fontWeight: "700",
    marginBottom: -10,
    marginTop: 20,
  },

  startButton: {
    backgroundColor: "#111",
    borderRadius: 50,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },

  startText: {
    color: "#ccc",
    fontSize: 20,
    fontWeight: "500",
  },
});
