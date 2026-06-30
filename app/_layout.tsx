import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { SuccessFeedbackProvider } from "../components/SuccessFeedback";
import { PlayerProvider } from "../context/PlayerContext";
import { auth } from "../firebase/config";
import { getHomeContent } from "../firebase/contentClient";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    Bristol: require("../assets/fonts/Bristol.ttf"),
  });
  const [showOpening, setShowOpening] = useState(true);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [openingReady, setOpeningReady] = useState(false);
  const openingOpacity = useRef(new Animated.Value(1)).current;
  const letterOpacity = useRef(new Animated.Value(0)).current;
  const letterScale = useRef(new Animated.Value(0.78)).current;
  const letterTranslateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (!loaded) {
      return;
    }

    void SplashScreen.hideAsync();

    Animated.parallel([
      Animated.timing(letterOpacity, {
        duration: 420,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(letterScale, {
        damping: 16,
        mass: 0.7,
        stiffness: 110,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(letterTranslateY, {
        duration: 520,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start(() => setOpeningReady(true));
  }, [
    letterOpacity,
    letterScale,
    letterTranslateY,
    loaded,
  ]);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    let active = true;
    let unsubscribe = () => {};

    const initialUser = new Promise<User | null>((resolve) => {
      unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          unsubscribe();
          resolve(user);
        },
        () => resolve(null),
      );
    });

    initialUser
      .then((user) => (user ? getHomeContent(user.uid) : null))
      .catch((error) => console.log("INITIAL FIREBASE LOAD ERROR:", error))
      .finally(() => {
        if (active) {
          setFirebaseReady(true);
        }
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [loaded]);

  useEffect(() => {
    if (!firebaseReady || !openingReady) {
      return;
    }

    Animated.parallel([
      Animated.timing(letterScale, {
        duration: 520,
        easing: Easing.inOut(Easing.cubic),
        toValue: 1.08,
        useNativeDriver: true,
      }),
      Animated.timing(openingOpacity, {
        delay: 90,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start(() => setShowOpening(false));
  }, [firebaseReady, letterScale, openingOpacity, openingReady]);

  if (!loaded) return null;

  return (
    <PlayerProvider>
      <SuccessFeedbackProvider>
        <View style={styles.root}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ gestureEnabled: false }} />
            <Stack.Screen name="auth" options={{ gestureEnabled: false }} />
          </Stack>

          {showOpening ? (
            <Animated.View
              pointerEvents="auto"
              style={[styles.opening, { opacity: openingOpacity }]}
            >
              <Animated.View
                style={{
                  opacity: letterOpacity,
                  transform: [
                    { scale: letterScale },
                    { translateY: letterTranslateY },
                  ],
                }}
              >
                <View style={styles.openingLetterFrame}>
                  <Text style={styles.openingLetter}>S</Text>
                </View>
              </Animated.View>
            </Animated.View>
          ) : null}
        </View>
      </SuccessFeedbackProvider>
    </PlayerProvider>
  );
}

const styles = StyleSheet.create({
  opening: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "#000",
    justifyContent: "center",
    zIndex: 9999,
  },
  openingLetter: {
    includeFontPadding: true,
    color: "#fff",
    fontFamily: "Bristol",
    fontSize: 96,
    lineHeight: 150,
    paddingHorizontal: 36,
    textAlign: "center",
    textAlignVertical: "center",
  },
  openingLetterFrame: {
    alignItems: "center",
    height: 170,
    justifyContent: "center",
    overflow: "visible",
    width: 280,
  },
  root: {
    backgroundColor: "#000",
    flex: 1,
  },
});
