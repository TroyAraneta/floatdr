import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import ThemedText from "../../components/ThemedText";
import Spacer from "../../components/Spacer";

const Settings = () => {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Logout Failed", error.message);
    } else {
      Alert.alert("Goodbye 👋", "You’ve been logged out successfully.");
      router.replace("/(auth)/login");
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <ThemedText title style={styles.headerTitle}>
        Settings
      </ThemedText>

      <Spacer height={20} />

      {/* 🌊 Account Section */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Account</ThemedText>

        <TouchableOpacity
          style={styles.item}
          onPress={() => router.push("/(stack)/editProfile")}
        >
          <Ionicons name="person-outline" size={22} color="#0a84ff" />
          <ThemedText style={styles.label}>Edit Profile</ThemedText>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => Alert.alert("Change Password", "Feature coming soon!")}>
          <Ionicons name="lock-closed-outline" size={22} color="#0a84ff" />
          <ThemedText style={styles.label}>Change Password</ThemedText>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#c0392b" />
          <ThemedText style={[styles.label, { color: "#c0392b" }]}>
            Logout
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* ⚙️ App Preferences */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>App Preferences</ThemedText>

        <View style={styles.item}>
          <Ionicons name="moon-outline" size={22} color="#0a84ff" />
          <ThemedText style={styles.label}>Dark Mode</ThemedText>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: "#ccc", true: "#0a84ff" }}
          />
        </View>

        <View style={styles.item}>
          <Ionicons name="notifications-outline" size={22} color="#0a84ff" />
          <ThemedText style={styles.label}>Notifications</ThemedText>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: "#ccc", true: "#0a84ff" }}
          />
        </View>
      </View>

      {/* 🧘 Wellness & Support */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Wellness & Support</ThemedText>

        <TouchableOpacity
          style={styles.item}
          onPress={() => router.push("/(dashboard)/library")}
        >
          <Ionicons name="book-outline" size={22} color="#0a84ff" />
          <ThemedText style={styles.label}>Float Therapy Library</ThemedText>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={() =>
            Alert.alert("Support", "Contact us at support@floatdr.com 💬")
          }
        >
          <Ionicons name="help-circle-outline" size={22} color="#0a84ff" />
          <ThemedText style={styles.label}>Help & Support</ThemedText>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={() => Alert.alert("Privacy Policy", "Coming soon!")}
        >
          <Ionicons name="document-text-outline" size={22} color="#0a84ff" />
          <ThemedText style={styles.label}>Privacy Policy</ThemedText>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>
      </View>

      <Spacer height={60} />
    </ScrollView>
  );
};

export default Settings;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#e6f4f9",
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0a84ff",
    textAlign: "left",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 8,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444",
    marginLeft: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eee",
  },
  label: {
    flex: 1,
    fontSize: 15,
    marginLeft: 12,
    color: "#222",
  },
});
