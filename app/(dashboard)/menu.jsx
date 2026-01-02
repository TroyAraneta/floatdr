import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
  View,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import ThemedText from "../../components/ThemedText";
import ThemedView from "../../components/ThemedView";
import Spacer from "../../components/Spacer";
import { useRouter } from "expo-router";

const Menu = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert("Error", "No user logged in.");
        setLoading(false);
        return;
      }

      setEmail(user.email);

      const { data, error } = await supabase
        .from("profiles")
        .select("username, bio, avatar_url")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        Alert.alert("Error loading profile", error.message);
      } else if (data) {
        setUsername(data.username || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url || "");
      }

      setLoading(false);
    };

    loadProfile();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Logout Failed", error.message);
    } else {
      router.replace("/(auth)/login");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a84ff" />
      </View>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Title */}
        <ThemedText title style={styles.title}>
          Profile
        </ThemedText>
        <Spacer height={10} />

        {/* Profile Card */}
        <TouchableOpacity
          style={styles.profileCard}
          activeOpacity={0.8}
          onPress={() => router.push("/(stack)/profileDetails")}
        >
          <Image
            source={{
              uri:
                avatarUrl ||
                "https://cdn-icons-png.flaticon.com/512/149/149071.png",
            }}
            style={styles.profileImage}
          />
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.profileName}>
              {username || "User"}
            </ThemedText>
            <ThemedText style={styles.profileEmail}>{email}</ThemedText>
            {bio ? (
              <ThemedText style={styles.profileBio}>{bio}</ThemedText>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={22} color="#aaa" />
        </TouchableOpacity>

        <Spacer height={20} />

        {/* Menu Section */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(stack)/editProfile")}
          >
            <Ionicons name="create-outline" size={22} color="#0a84ff" />
            <ThemedText style={styles.menuText}>Edit Profile</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(stack)/saveForum")}
          >
            <Ionicons name="bookmark-outline" size={22} color="#0a84ff" />
            <ThemedText style={styles.menuText}>Saved Forums</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="settings-outline" size={22} color="#0a84ff" />
            <ThemedText style={styles.menuText}>Settings</ThemedText>
          </TouchableOpacity>
        </View>

        <Spacer height={30} />

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <ThemedText style={styles.logoutText}>Logout</ThemedText>
        </TouchableOpacity>

        <Spacer height={60} />
      </ScrollView>
    </ThemedView>
  );
};

export default Menu;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#e6f4f9",
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e6f4f9",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1c1e21",
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
  },
  profileEmail: {
    fontSize: 14,
    color: "#555",
  },
  profileBio: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 6,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  menuText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 10,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a84ff",
    borderRadius: 14,
    paddingVertical: 14,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
});
