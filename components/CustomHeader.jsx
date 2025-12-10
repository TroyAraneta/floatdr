import React from "react";
import { View, Image, Text, StyleSheet, StatusBar } from "react-native";

export default function CustomHeader() {
  return (
    <View style={styles.header}>
      <StatusBar barStyle="light-content" backgroundColor="#1877f2" />
      <View style={styles.content}>
        <Image
          source={require("../assets/img/trans-logo_white.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>                Forum</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#1877f2",
    paddingTop: 20,
    paddingBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 180,
    height: 120,
    marginBottom: -5, // slight overlap to remove visual gap
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "sans-serif-medium",
    letterSpacing: 1,
    marginTop: -40, // ensure no extra space above text
    marginBottom: 15
  },
});
