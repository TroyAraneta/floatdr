import React from "react";
import { View, Image, StyleSheet } from "react-native";

export default function CustomHeader() {
  return (
    <View style={styles.header}>
      {/* App Logo */}
      <Image
        source={require("../assets/img/FDLogo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* App Title as an Image */}
      <Image
        source={require("../assets/img/FLOATDR.png")}
        style={styles.appName}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#1877f2",
    paddingTop: 55,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4, // smaller gap between logo and text
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  logo: {
    width: 50,   // slightly bigger
    height: 50,  // slightly bigger
  },
  appName: {
    width: 130,  // slightly smaller than before
    height: 32,
  },
});
