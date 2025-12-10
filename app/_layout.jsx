// app/_layout.jsx
import { Slot } from "expo-router";
import { Colors } from "../constants/colors";
import { useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  return (
    <>
      <StatusBar style="auto" />
      {/* Slot lets each route group manage its own layout 
          (Tabs, Stack, etc.) independently */}
      <Slot />
    </>
  );
}
