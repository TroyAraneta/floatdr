import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Buffer } from "buffer";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import ThemedText from "../../components/ThemedText";
import ThemedButton from "../../components/ThemedButton";

const EditProfile = () => {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // ✅ Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert("Error", "You must be logged in to edit your profile.");
        router.replace("/(dashboard)/profile");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("username, bio, avatar_url")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setUsername(data.username || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url || "");
      }

      setLoading(false);
    };

    loadProfile();
  }, []);

  // ✅ Pick image
  const handleChooseImage = async (shouldCrop = false) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "We need access to your photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: shouldCrop,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  // ✅ Upload avatar to Supabase storage bucket and update profile
  const uploadAvatar = async (uri) => {
    try {
      setUploading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) throw new Error("Not logged in.");

      // Convert image to binary
      const fileExt = uri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${user.id}/avatar.${fileExt}`;
      const mimeType = `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const binary = Buffer.from(base64, "base64");

      // ✅ Upload or replace existing avatar
      const { error: uploadError } = await supabase.storage
        .from("avatars") // change this if your bucket name differs
        .upload(fileName, binary, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // ✅ Get public URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const publicUrl = data?.publicUrl;

      if (!publicUrl) throw new Error("Failed to get public URL.");

      // ✅ Save to profile table
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // ✅ Refresh avatar in UI (force reload)
      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
      Alert.alert("Success", "Profile picture updated!");
    } catch (error) {
      Alert.alert("Upload Failed", error.message);
      console.error("Avatar upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  // ✅ Save profile changes
  const handleSave = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert("Error", "No user logged in.");
      setLoading(false);
      return;
    }

    const updates = {
      id: user.id,
      username,
      bio,
      avatar_url: avatarUrl,
      updated_at: new Date(),
    };

    const { error } = await supabase.from("profiles").upsert(updates);
    setLoading(false);

    if (error) Alert.alert("Update Failed", error.message);
    else {
      Alert.alert("Success", "Profile updated successfully!");
      router.replace("/(dashboard)/profile");
    }
  };

  // ✅ Loading state
  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a84ff" />
      </View>
    );

  // ✅ UI
  return (
    <ScrollView
      style={{ backgroundColor: "#e6f4f9" }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* 🔙 Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/(dashboard)/profile")}>
          <Ionicons name="arrow-back" size={24} color="#0a84ff" />
        </TouchableOpacity>
        <ThemedText title style={styles.headerText}>
          Edit Profile
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>

      {/* 🖼️ Avatar */}
      <View style={styles.avatarContainer}>
        <Image
          source={{
            uri:
              avatarUrl ||
              "https://cdn-icons-png.flaticon.com/512/149/149071.png",
          }}
          style={styles.avatar}
        />

        {uploading ? (
          <View style={styles.uploadingRow}>
            <ActivityIndicator size="small" color="#0a84ff" />
            <ThemedText style={{ marginLeft: 8 }}>Uploading...</ThemedText>
          </View>
        ) : (
          <View style={styles.imageButtonsRow}>
            <TouchableOpacity
              style={styles.imageButton}
              onPress={() => handleChooseImage(false)}
            >
              <Ionicons name="image-outline" size={18} color="#0a84ff" />
              <ThemedText style={styles.imageButtonText}>Change</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.imageButton}
              onPress={() => handleChooseImage(true)}
            >
              <Ionicons name="crop-outline" size={18} color="#0a84ff" />
              <ThemedText style={styles.imageButtonText}>Edit Image</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Username */}
      <ThemedText style={styles.label}>Username</ThemedText>
      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="Enter your username"
        style={styles.input}
      />

      {/* Bio */}
      <ThemedText style={styles.label}>Bio</ThemedText>
      <TextInput
        value={bio}
        onChangeText={setBio}
        placeholder="Tell something about yourself"
        multiline
        numberOfLines={3}
        style={[styles.input, { height: 100, textAlignVertical: "top" }]}
      />

      {/* Save Button */}
      <ThemedButton onPress={handleSave} style={styles.saveButton}>
        <ThemedText style={styles.saveText}>Save Changes</ThemedText>
      </ThemedButton>
    </ScrollView>
  );
};

export default EditProfile;

// ✅ Styles
const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e6f4f9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  headerText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0a84ff",
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 25,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#ddd",
    marginBottom: 12,
  },
  imageButtonsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  imageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  imageButtonText: {
    color: "#0a84ff",
    marginLeft: 6,
    fontWeight: "600",
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 1,
  },
  saveButton: {
    marginTop: 10,
    backgroundColor: "#0a84ff",
    borderRadius: 12,
  },
  saveText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
  },
  uploadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
});
