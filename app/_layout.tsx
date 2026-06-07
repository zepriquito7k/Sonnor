import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { PlayerProvider } from "../context/PlayerContext";

export default function RootLayout() {
  const [loaded] = useFonts({
    Bristol: require("../assets/fonts/Bristol.ttf"),
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <PlayerProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ gestureEnabled: false }} />
        <Stack.Screen name="auth" options={{ gestureEnabled: false }} />
      </Stack>
    </PlayerProvider>
  );
}
