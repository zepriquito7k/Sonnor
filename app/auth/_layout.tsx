import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    >
      <Stack.Screen name="login" options={{ gestureEnabled: false }} />
      <Stack.Screen name="new-account" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
