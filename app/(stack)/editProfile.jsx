import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Buffer } from "buffer";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";

import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";
import ThemedButton from "../../components/ThemedButton";
import ThemedCard from "../../components/ThemedCard";
import ThemedTextInput from "../../components/ThemedTextInput";
import Spacer from "../../components/Spacer";
import { useTheme } from "../../contexts/ThemeContext";

const FALLBACK_AVATAR =
  "https://cdn-icons-png.flaticon.com/512/149/149071.png";
const MAX_USERNAME = 30;
const MAX_BIO = 160;

const EditProfile = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert("Error", "You must be logged in to edit your profile.");
        router.replace("/(dashboard)/menu");
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
  }, [router]);

  useEffect(() => {
    const croppedAvatarUri = Array.isArray(params.croppedAvatarUri)
      ? params.croppedAvatarUri[0]
      : params.croppedAvatarUri;

    if (!croppedAvatarUri) return;

    uploadAvatar(croppedAvatarUri);
  }, [params.croppedAvatarUri]);

  const handleBack = () => {
    router.replace("/(dashboard)/menu");
  };

  const handleChooseImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        router.push({
          pathname: "/(stack)/avatarCrop",
          params: {
            imageUri: result.assets[0].uri,
            returnTo: "/(stack)/editProfile",
            origin: "editProfile",
          },
        });
      }
    } catch (error) {
      Alert.alert("Error", "Unable to open image picker.");
    }
  };

  const uploadAvatar = async (uri) => {
    try {
      setUploading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) throw new Error("Not logged in.");

      const cleanUri = uri.split("?")[0];
      const rawExt = cleanUri.split(".").pop()?.toLowerCase() || "jpg";
      const normalizedExt = rawExt === "jpg" ? "jpeg" : rawExt;
      const storedExt = rawExt === "jpeg" ? "jpg" : rawExt;
      const fileName = `${user.id}/avatar.${storedExt}`;
      const mimeType = `image/${normalizedExt}`;

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const binary = Buffer.from(base64, "base64");

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, binary, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const publicUrl = data?.publicUrl;

      if (!publicUrl) throw new Error("Failed to get public URL.");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id)
        .select();

      if (updateError) throw updateError;

      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
      router.setParams({ croppedAvatarUri: undefined, t: undefined });
      Alert.alert("Success", "Profile picture updated!");
    } catch (error) {
      console.error("Edit profile upload failed:", error);
      Alert.alert("Upload Failed", error?.message || "Unable to upload avatar.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const nextUsername = username.trim();
    const nextBio = bio.trim();

    if (nextUsername.length > MAX_USERNAME) {
      Alert.alert("Username too long", `Username must be ${MAX_USERNAME} characters or less.`);
      return;
    }

    if (nextBio.length > MAX_BIO) {
      Alert.alert("Bio too long", `Bio must be ${MAX_BIO} characters or less.`);
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert("Error", "No user logged in.");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        username: nextUsername,
        bio: nextBio,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setLoading(false);

    if (error) {
      Alert.alert("Update Failed", error.message);
    } else {
      Alert.alert("Success", "Profile updated successfully!");
      router.replace("/(dashboard)/menu");
    }
  };

  if (loading) {
    return (
      <ThemedView
        style={[styles.loadingContainer, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  const usernameTrimmed = username.trim();
  const bioTrimmed = bio.trim();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ThemedView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
            accessibilityHint="Returns to the previous screen"
            style={[
              styles.backButton,
              { backgroundColor: theme.surface },
            ]}
          >
            <Ionicons name="arrow-back" size={18} color={theme.iconMuted} />
          </Pressable>

          <ThemedText title style={[styles.headerTitle, { color: theme.icon }]}>
            Edit Profile
          </ThemedText>

          <View style={styles.headerRightSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedCard
            style={[
              styles.avatarCard,
              { backgroundColor: theme.surface, shadowColor: theme.shadow },
            ]}
          >
            <View style={styles.avatarRow}>
              <View style={styles.avatarWrap}>
                <Image
                  source={{ uri: avatarUrl || FALLBACK_AVATAR }}
                  style={[
                    styles.avatar,
                    { backgroundColor: theme.uiBackground },
                  ]}
                  accessibilityLabel="Profile picture"
                />

                <View
                  style={[
                    styles.cameraChip,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.uiBackground,
                    },
                  ]}
                >
                  <Ionicons name="camera" size={14} color={theme.iconMuted} />
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <ThemedText
                  style={[styles.avatarTitle, { color: theme.title }]}
                >
                  Profile photo
                </ThemedText>
                <ThemedText
                  muted
                  style={{ color: theme.textMuted, marginTop: 4 }}
                >
                  Use a clear photo so people recognize you.
                </ThemedText>

                <View style={styles.avatarActions}>
                  <TouchableOpacity
                    style={[
                      styles.avatarActionBtn,
                      styles.avatarActionBtnSingle,
                      { backgroundColor: theme.uiBackground },
                    ]}
                    onPress={handleChooseImage}
                    activeOpacity={0.85}
                    disabled={uploading}
                    accessibilityRole="button"
                    accessibilityLabel="Choose and crop profile photo"
                  >
                    <Ionicons
                      name="crop-outline"
                      size={18}
                      color={theme.icon}
                    />
                    <ThemedText
                      style={[styles.avatarActionText, { color: theme.text }]}
                    >
                      Choose & Crop
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                {uploading && (
                  <View style={styles.uploadingRow}>
                    <ActivityIndicator size="small" color={theme.primary} />
                    <ThemedText
                      muted
                      style={{ marginLeft: 8, color: theme.textMuted }}
                    >
                      Uploading photo...
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
          </ThemedCard>

          <Spacer height={14} />

          <ThemedCard
            style={[
              styles.formCard,
              { backgroundColor: theme.surface, shadowColor: theme.shadow },
            ]}
          >
            <ThemedText
              muted
              style={[styles.sectionLabel, { color: theme.textMuted }]}
            >
              ABOUT YOU
            </ThemedText>

            <Spacer height={10} />

            <ThemedText style={[styles.label, { color: theme.title }]}>
              Username
            </ThemedText>

            <ThemedTextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your username"
              style={[styles.input, { borderColor: theme.uiBackground }]}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Username"
              returnKeyType="next"
              maxLength={MAX_USERNAME}
            />

            <View style={styles.counterRow}>
              <ThemedText
                muted
                style={{ color: theme.textMuted, fontSize: 12 }}
              />
              <ThemedText
                muted
                style={{ color: theme.textMuted, fontSize: 12 }}
              >
                {usernameTrimmed.length}/30
              </ThemedText>
            </View>

            <Spacer height={14} />

            <ThemedText style={[styles.label, { color: theme.title }]}>
              Bio
            </ThemedText>

            <ThemedTextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Tell something about yourself"
              multiline
              style={[
                styles.input,
                styles.bioInput,
                { borderColor: theme.uiBackground },
              ]}
              accessibilityLabel="Bio"
              textAlignVertical="top"
              maxLength={MAX_BIO}
            />

            <View style={styles.counterRow}>
              <ThemedText
                muted
                style={{ color: theme.textMuted, fontSize: 12 }}
              />
              <ThemedText
                muted
                style={{ color: theme.textMuted, fontSize: 12 }}
              >
                {bioTrimmed.length}/160
              </ThemedText>
            </View>

            <Spacer height={18} />

            <ThemedButton
              onPress={handleSave}
              disabled={uploading}
              style={styles.saveButton}
              accessibilityRole="button"
              accessibilityLabel="Save profile changes"
            >
              <ThemedText style={styles.saveText}>
                {uploading ? "Please wait..." : "Save Changes"}
              </ThemedText>
            </ThemedButton>
          </ThemedCard>

          <Spacer height={70} />
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
};

export default EditProfile;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarCard: {
    borderRadius: 18,
    padding: 14,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarWrap: {
    width: 92,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  cameraChip: {
    position: "absolute",
    right: 6,
    bottom: 2,
    width: 24,
    height: 24,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  avatarTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  avatarActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  avatarActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    minHeight: 44,
    flex: 1,
  },
  avatarActionBtnSingle: {
    flex: 0,
    alignSelf: "flex-start",
    minWidth: 150,
  },
  avatarActionText: {
    fontWeight: "800",
    fontSize: 13,
  },
  uploadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  formCard: {
    borderRadius: 18,
    padding: 14,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  label: {
    fontSize: 14,
    fontWeight: "900",
  },
  helper: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
    lineHeight: 16,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  bioInput: {
    minHeight: 110,
  },
  counterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  saveButton: {
    borderRadius: 14,
  },
  saveText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "left",
  },
  headerRightSpacer: {
    width: 40,
    height: 40,
  },
});
