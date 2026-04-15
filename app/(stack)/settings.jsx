import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import ThemedText from "../../components/ThemedText";
import Spacer from "../../components/Spacer";
import SettingsItem from "../../components/SettingsItem";
import { useTheme } from "../../contexts/ThemeContext";

const Settings = () => {
  const router = useRouter();
  const { theme, isDark, toggleDarkMode, forceLightForAuth } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [userId, setUserId] = useState(null);

  // NEW: back navigation (safe fallback)
  const handleBack = () => {
    router.replace("/(dashboard)/menu");
  };

  const performLogout = async () => {
    try {
      // light UI for login page, but do NOT save to DB
      forceLightForAuth();

      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert("Logout Failed", error.message);
        return;
      }

      router.replace("/(auth)/login");
    } catch (e) {
      Alert.alert("Logout Failed", e?.message || "Something went wrong.");
    }
  };


  const handleLogout = () => {
    // Optional but very standard: confirm logout
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: performLogout },
    ]);
  };

  useEffect(() => {
    const loadSettings = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;

      if (!uid) return;

      setUserId(uid);

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", uid)
        .single();

      if (data) {
        setNotifications(data.push_notifications);
        setEmailNotifications(data.email_notifications);
      } else if (error?.code === "PGRST116") {
        const { error: insertError } = await supabase.from("user_settings").insert({
          user_id: uid,
        });

        if (insertError) {
          Alert.alert("Error", "Failed to initialize settings.");
        }
      } else {
        Alert.alert("Error", "Failed to load settings.");
      }
    };

    loadSettings();
  }, []);

  const updateSetting = async (field, value) => {
    if (!userId) return false;

    const { error } = await supabase
      .from("user_settings")
      .update({ [field]: value, updated_at: new Date() })
      .eq("user_id", userId);

    if (error) {
      Alert.alert("Error", "Failed to update setting.");
      return false;
    }

    return true;
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action is permanent and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.rpc("delete_user_account");

              if (error) throw error;

              Alert.alert("Account Deleted");

              // NEW: also ensure theme returns to light after delete/logout
              if (isDark) {
                await toggleDarkMode(false);
              }

              await supabase.auth.signOut();
              router.replace("/(auth)/login");
            } catch (err) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ]
    );
  };

  const getSwitchColors = (enabled) => ({
    trackColor: {
      false: theme.switchTrackOff,
      true: theme.switchTrackOn,
    },
    thumbColor: enabled ? theme.switchThumbOn : theme.switchThumbOff,
    ios_backgroundColor: theme.switchTrackOff,
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* NEW: Header row with back button */}
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
          Settings
        </ThemedText>

        {/* spacer to keep title centered-ish visually */}
        <View style={styles.headerRightSpacer} />
      </View>

      <Spacer height={20} />

      <View
        style={[
          styles.section,
          {
            backgroundColor: theme.surface,
            shadowColor: theme.shadow,
          },
        ]}
      >
        <ThemedText style={[styles.sectionTitle, { color: theme.textMuted }]}>
          Account
        </ThemedText>

        <SettingsItem
          icon="person-outline"
          label="Edit Profile"
          onPress={() => router.push("/(stack)/editProfile")}
          showChevron
        />

        <SettingsItem
          icon="lock-closed-outline"
          label="Change Password"
          onPress={() => router.push("/(stack)/changePassword")}
          showChevron
        />

        <SettingsItem
          icon="trash-outline"
          label="Delete Account"
          onPress={handleDeleteAccount}
          destructive
        />

        <SettingsItem
          icon="log-out-outline"
          label="Logout"
          onPress={handleLogout}
          destructive
        />
      </View>

      <View
        style={[
          styles.section,
          {
            backgroundColor: theme.surface,
            shadowColor: theme.shadow,
          },
        ]}
      >
        <ThemedText style={[styles.sectionTitle, { color: theme.textMuted }]}>
          App Preferences
        </ThemedText>

        <SettingsItem
          icon="moon-outline"
          label="Dark Mode"
          rightAccessory={
            <Switch
              value={isDark}
              onValueChange={toggleDarkMode}
              {...getSwitchColors(isDark)}
            />
          }
        />

        <SettingsItem
          icon="notifications-outline"
          label="Notifications"
          rightAccessory={
            <Switch
              value={notifications}
              onValueChange={async (value) => {
                setNotifications(value);

                if (value && userId) {
                  const { registerForPushNotifications } = await import(
                    "../../lib/registerForPush"
                  );
                  await registerForPushNotifications(userId);
                }
                const success = await updateSetting("push_notifications", value);
                if (!success) {
                  setNotifications(!value);
                }
              }}
              {...getSwitchColors(notifications)}
            />
          }
        />

        <SettingsItem
          icon="mail-outline"
          label="Email Notifications"
          rightAccessory={
            <Switch
              value={emailNotifications}
              onValueChange={async (value) => {
                setEmailNotifications(value);
                const success = await updateSetting("email_notifications", value);
                if (!success) {
                  setEmailNotifications(!value);
                }
              }}
              {...getSwitchColors(emailNotifications)}
            />
          }
        />
      </View>

      <View
        style={[
          styles.section,
          {
            backgroundColor: theme.surface,
            shadowColor: theme.shadow,
          },
        ]}
      >
        <ThemedText style={[styles.sectionTitle, { color: theme.textMuted }]}>
          Wellness & Support
        </ThemedText>

        <SettingsItem
          icon="book-outline"
          label="Float Therapy Library"
          onPress={() => router.push("/(dashboard)/library")}
          showChevron
        />

        <SettingsItem
          icon="help-circle-outline"
          label="Help & Support"
          onPress={() =>
            Alert.alert("Support", "Contact us at support@floatdr.com")
          }
          showChevron
        />

        <SettingsItem
          icon="document-text-outline"
          label="Privacy Policy"
          onPress={() => Alert.alert("Privacy Policy", "Coming soon!")}
          showChevron
        />
      </View>

      <Spacer height={60} />
    </ScrollView>
  );
};

export default Settings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },

  // NEW: header row styles
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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

  section: {
    borderRadius: 16,
    paddingVertical: 8,
    marginBottom: 20,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 16,
    marginTop: 12,
    marginBottom: 8,
  },
});
