import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import DynamicIslandTest from "./components/Dynamicmenu";

export default function MainLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar style="light" />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
        }}
      />

      <DynamicIslandTest />
    </View>
  );
}
