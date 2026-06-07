import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import DynamicIslandTest from "./components/Dynamicmenu";
import { SharedMediaProgressProvider } from "./components/SharedMediaProgress";

export default function MainLayout() {
  const pathname = usePathname();

  // Screens onde a Dynamic Island DEVE aparecer
  const showDynamic =
    pathname === "/main/home" ||
    pathname === "/main/search" ||
    pathname === "/main/profile" ||
    pathname === "/main/library" ||
    pathname.startsWith("/main/release/");

  return (
    <SharedMediaProgressProvider>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <StatusBar style="light" />

        <Stack
          screenOptions={{
            headerShown: false,
            animation: "fade",
          }}
        />

        {showDynamic && <DynamicIslandTest />}
      </View>
    </SharedMediaProgressProvider>
  );
}
