import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useResponsive } from "../utils/responsive";

export default function Index() {
  const { wp, hp, font } = useResponsive();
  const { loading, user } = useCurrentUser();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/main/home");
    }
  }, [loading, user]);

  if (loading || user) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Text style={[styles.logo, { marginTop: hp(8), fontSize: font(40) }]}>
        Sonnor
      </Text>

      <Image
        source={require("../assets/motion.gif")}
        style={{
          position: "absolute",
          width: wp(130),
          height: hp(45),
          top: hp(23),
          left: -wp(20),
        }}
        resizeMode="contain"
      />

      <Text
        style={[
          styles.tagline,
          {
            top: hp(23) + hp(45) - hp(6),
            left: wp(6),
            fontSize: font(22),
          },
        ]}
      >
        Onde a tua vibe vira a sua identidade
      </Text>

      <View
        style={[
          styles.actions,
          {
            bottom: hp(5),
            left: wp(6),
            right: wp(6),
            gap: hp(1.5),
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.primary, { paddingVertical: hp(2) }]}
          onPress={() => router.replace("/auth/login")}
        >
          <Text style={[styles.primaryText, { fontSize: font(16) }]}>
            Entrar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondary, { paddingVertical: hp(2) }]}
          onPress={() => router.replace("/auth/new-account")}
        >
          <Text style={[styles.secondaryText, { fontSize: font(16) }]}>
            Criar Conta
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
  logo: {
    textAlign: "center",
    color: "#fff",
    fontFamily: "Bristol",
  },
  tagline: {
    position: "absolute",
    color: "#fff",
    fontWeight: "700",
  },
  actions: {
    position: "absolute",
  },
  primary: {
    backgroundColor: "#fff",
    borderRadius: 32,
    alignItems: "center",
  },
  primaryText: {
    color: "#000",
    fontWeight: "600",
  },
  secondary: {
    borderWidth: 1,
    borderColor: "#fff",
    borderRadius: 32,
    alignItems: "center",
  },
  secondaryText: {
    color: "#fff",
    fontWeight: "500",
  },
});
