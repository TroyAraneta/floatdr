import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Image,
  TouchableOpacity,
  View,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";

import ThemedText from "../../components/ThemedText";
import ThemedView from "../../components/ThemedView";
import ThemedCard from "../../components/ThemedCard";
import ThemedButton from "../../components/ThemedButton";
import Spacer from "../../components/Spacer";
import SubscriptionModal from "../../components/SubscriptionModal";
import { Colors } from "../../constants/colors";
import { useMembership } from "../../contexts/MembershipContext";
import { useTheme } from "../../contexts/ThemeContext";

const FALLBACK_AVATAR =
  "https://cdn-icons-png.flaticon.com/512/149/149071.png";

export default function Menu() {
  const router = useRouter();
  const { theme } = useTheme();
  const { isMember, isAdmin, isHeadAdmin, loading: membershipLoading } =
    useMembership();

  const [loading, setLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const [myId, setMyId] = useState(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user) {
        setMyId(null);
        setLoading(false);
        return;
      }

      setMyId(user.id);
      setEmail(user.email || "");

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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleLogout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) router.replace("/(auth)/login");
  }, [router]);

  const goToMyProfile = useCallback(() => {
    if (!myId) return;
    router.push({
      pathname: "/(stack)/userProfile",
      params: { userId: myId },
    });
  }, [router, myId]);

  const openSubscriptionModal = useCallback(() => {
    setShowSubscriptionModal(true);
  }, []);

  const closeSubscriptionModal = useCallback(() => {
    setShowSubscriptionModal(false);
  }, []);

  const MenuItem = useCallback(
    ({ icon, label, onPress, danger = false }) => (
      <TouchableOpacity
        style={styles.menuItem}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.menuLeft}>
          <View
            style={[
              styles.iconChip,
              { backgroundColor: theme.uiBackground },
              danger && { backgroundColor: "rgba(229,57,53,0.12)" },
            ]}
          >
            <Ionicons
              name={icon}
              size={18}
              color={danger ? "#e53935" : theme.icon}
            />
          </View>

          <ThemedText
            style={[
              styles.menuText,
              { color: danger ? "#e53935" : theme.text },
            ]}
          >
            {label}
          </ThemedText>
        </View>

        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      </TouchableOpacity>
    ),
    [theme]
  );

  const showMembershipCTA = useMemo(() => {
    if (membershipLoading) return false;
    return !isMember;
  }, [membershipLoading, isMember]);

  if (loading) {
    return (
      <ThemedView style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <ThemedText title style={[styles.title, { color: theme.title }]}>
            Menu
          </ThemedText>
        </View>

        <Spacer height={12} />

        <TouchableOpacity
          style={[styles.profileCard, { backgroundColor: theme.surface }]}
          activeOpacity={0.85}
          onPress={goToMyProfile}
          disabled={!myId}
        >
          <Image
            source={{ uri: avatarUrl || FALLBACK_AVATAR }}
            style={[styles.avatar, { backgroundColor: theme.uiBackground }]}
          />

          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.name, { color: theme.title }]}>
              {username || "User"}
            </ThemedText>

            {!!email && (
              <ThemedText
                muted
                style={[styles.email, { color: theme.textMuted }]}
              >
                {email}
              </ThemedText>
            )}

            {!!bio && (
              <ThemedText
                muted
                style={[styles.bio, { color: theme.textMuted }]}
                numberOfLines={2}
              >
                {bio}
              </ThemedText>
            )}
          </View>

          <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
        </TouchableOpacity>

        {showMembershipCTA && (
          <>
            <Spacer height={12} />

            <ThemedCard
              style={[styles.membershipCard, { backgroundColor: theme.surface }]}
            >
              <View style={styles.membershipRow}>
                <View style={styles.membershipLeft}>
                  <View
                    style={[
                      styles.membershipIcon,
                      { backgroundColor: theme.uiBackground },
                    ]}
                  >
                    <Ionicons
                      name="sparkles-outline"
                      size={18}
                      color={Colors.primary}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <ThemedText
                      style={[styles.membershipTitle, { color: theme.title }]}
                    >
                      Get Membership
                    </ThemedText>
                    <ThemedText muted style={{ color: theme.textMuted }}>
                      Unlock forum access & premium features.
                    </ThemedText>
                  </View>
                </View>

                <ThemedButton
                  style={styles.membershipBtn}
                  onPress={openSubscriptionModal}
                >
                  <ThemedText style={styles.membershipBtnText}>View</ThemedText>
                </ThemedButton>
              </View>
            </ThemedCard>
          </>
        )}

        <Spacer height={18} />

        <ThemedText
          muted
          style={[styles.sectionLabel, { color: theme.textMuted }]}
        >
          Account
        </ThemedText>
        <Spacer height={8} />

        <ThemedCard style={[styles.card, { backgroundColor: theme.surface }]}>
          <MenuItem
            icon="create-outline"
            label="Edit Profile"
            onPress={() => router.push("/(stack)/editProfile")}
          />
          <MenuItem
            icon="bookmark-outline"
            label="Saved Forums"
            onPress={() => router.push("/(stack)/saveForum")}
          />
        </ThemedCard>

        <Spacer height={14} />

        <ThemedText
          muted
          style={[styles.sectionLabel, { color: theme.textMuted }]}
        >
          App
        </ThemedText>
        <Spacer height={8} />

        <ThemedCard style={[styles.card, { backgroundColor: theme.surface }]}>
          <MenuItem
            icon="settings-outline"
            label="Settings"
            onPress={() => router.push("/(stack)/settings")}
          />
          {isAdmin && (
            <MenuItem
              icon="flag-outline"
              label="Manage Reports"
              onPress={() => router.push("/(stack)/manageReports")}
            />
          )}
          {isHeadAdmin && (
            <MenuItem
              icon="shield-checkmark-outline"
              label="Manage Admins"
              onPress={() => router.push("/(stack)/manageAdmins")}
            />
          )}
          <MenuItem
            icon="book-outline"
            label="Library"
            onPress={() => router.push("/(dashboard)/library")}
          />
        </ThemedCard>

        <Spacer height={20} />

        <ThemedCard style={[styles.card, { backgroundColor: theme.surface }]}>
          <MenuItem
            icon="log-out-outline"
            label="Log Out"
            onPress={handleLogout}
            danger
          />
        </ThemedCard>

        <Spacer height={60} />
      </ScrollView>

      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={closeSubscriptionModal}
        onCloseToMemberGate={closeSubscriptionModal}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 18,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginRight: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: "800",
  },
  email: {
    fontSize: 13,
    marginTop: 2,
  },
  bio: {
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },

  membershipCard: {
    borderRadius: 18,
    padding: 14,
  },
  membershipRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  membershipLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  membershipIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  membershipTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  membershipBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  membershipBtnText: {
    color: "#fff",
    fontWeight: "800",
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 4,
  },

  card: {
    borderRadius: 18,
    paddingVertical: 4,
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconChip: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  menuText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
