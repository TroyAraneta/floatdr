import React from "react";
import { View, StyleSheet, StatusBar, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import { Colors } from "../constants/colors";

export default function CustomHeader() {
  const { theme, isDark } = useTheme();

  const headerBackground = isDark ? theme.navBackground : Colors.primary;

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.safeArea, { backgroundColor: headerBackground }]}
    >
      <StatusBar barStyle="light-content" backgroundColor={headerBackground} />

      <View style={[styles.header, { backgroundColor: headerBackground }]}>
        <Image
          source={require("../assets/img/FDLogoWhite.png")}
          style={styles.logo}
          resizeMode="contain"
          accessible
          accessibilityRole="image"
          accessibilityLabel="FloatDr Forum logo"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    width: "100%",
  },

  header: {
    paddingTop: 30,
    paddingBottom: 15,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },

  // sized to match previous BrandLockup "sm" visual footprint
  logo: {
    width: 280,
    height: 80,
  },
});