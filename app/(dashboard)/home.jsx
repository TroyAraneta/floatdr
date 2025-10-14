import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>FloatDr Forum</Text>
      <Text style={styles.subtitle}>Welcome, Alex</Text>

      {/* Video Preview Card */}
      <TouchableOpacity style={styles.videoCard} activeOpacity={0.9}>
        <ImageBackground
          source={{
            uri: "https://images.unsplash.com/photo-1610276198568-eb6d0ff53e48?auto=format&fit=crop&w=800&q=60",
          }}
          style={styles.videoBackground}
          imageStyle={{ borderRadius: 15 }}
        >
          <View style={styles.overlay}>
            <Ionicons name="play-circle" size={48} color="#fff" />
            <Text style={styles.videoText}>Floating for Anxiety</Text>
          </View>
        </ImageBackground>
      </TouchableOpacity>

      {/* Menu Buttons */}
      <View style={styles.menuContainer}>
        <MenuButton
          icon="chatbubble-outline"
          text="Start Discussion"
          onPress={() => router.push("/(dashboard)/forum")}
        />
        <MenuButton
          icon="calendar-outline"
          text="My Appointments"
          onPress={() => router.push("/(dashboard)/schedule")}
        />
        <MenuButton
          icon="medkit-outline"
          text="Premium Content"
          onPress={() => router.push("/(dashboard)/library")}
        />
      </View>
    </View>
  );
}

/* Reusable Menu Button Component */
function MenuButton({ icon, text, onPress }) {
  return (
    <TouchableOpacity style={styles.menuButton} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.menuIconContainer}>
        <Ionicons name={icon} size={22} color="#3C5A99" />
      </View>
      <Text style={styles.menuText}>{text}</Text>
      <Ionicons name="chevron-forward" size={20} color="#aaa" />
    </TouchableOpacity>
  );
}

/* Styles */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#222",
    marginBottom: 20,
  },
  videoCard: {
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 30,
  },
  videoBackground: {
    height: 160,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.3)",
    width: "100%",
    height: "100%",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  videoText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 10,
  },
  menuContainer: {
    gap: 15,
  },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  menuIconContainer: {
    backgroundColor: "#EAF0FA",
    borderRadius: 10,
    padding: 6,
    marginRight: 15,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
});
