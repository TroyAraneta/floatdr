import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../contexts/ThemeContext";
import useAdminStatus from "../../hooks/useAdminStatus";
import ThemedView from "../../components/ThemedView";
import ThemedCard from "../../components/ThemedCard";
import ThemedText from "../../components/ThemedText";
import ThemedTextInput from "../../components/ThemedTextInput";
import ThemedButton from "../../components/ThemedButton";
import Spacer from "../../components/Spacer";

const ManageAdmins = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { isHeadAdmin, loading: adminLoading, refetch } = useAdminStatus();

  const [currentUserId, setCurrentUserId] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [busyIds, setBusyIds] = useState({});

  const loadAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_admins");
      if (error) throw error;
      setAdmins(data || []);
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to load admins.");
    } finally {
      setLoading(false);
    }
  }, []);

  const runSearch = useCallback(async (query) => {
    const q = (query || "").trim();
    if (!q) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, admin_role")
        .ilike("username", `%${q}%`)
        .order("username", { ascending: true })
        .limit(25);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to search users.");
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data?.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (!isHeadAdmin) {
      setLoading(false);
      return;
    }
    loadAdmins();
  }, [isHeadAdmin, loadAdmins]);

  const handleSearch = useCallback(() => {
    runSearch(search);
  }, [runSearch, search]);

  const clearSearch = useCallback(() => {
    setSearch("");
    setSearchResults([]);
  }, []);

  const setBusy = useCallback((id, value) => {
    setBusyIds((prev) => {
      const next = { ...prev };
      if (value) next[id] = true;
      else delete next[id];
      return next;
    });
  }, []);

  const applyRole = useCallback(
    async (userId, newRole) => {
      try {
        setBusy(userId, true);
        const { error } = await supabase.rpc("set_admin_role", {
          target_user_id: userId,
          new_role: newRole,
        });
        if (error) throw error;

        await loadAdmins();
        await runSearch(search);
        await refetch();
        Alert.alert("Success", "Admin role updated.");
      } catch (err) {
        Alert.alert("Error", err?.message || "Failed to update role.");
      } finally {
        setBusy(userId, false);
      }
    },
    [loadAdmins, runSearch, search, refetch, setBusy]
  );

  const confirmRoleChange = useCallback(
    (userId, newRole, label) => {
      Alert.alert("Confirm", `Set role to ${label}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: newRole === "user" ? "destructive" : "default",
          onPress: () => applyRole(userId, newRole),
        },
      ]);
    },
    [applyRole]
  );

  const roleLabel = useCallback((role) => {
    if (role === "head_admin") return "Head Admin";
    if (role === "admin") return "Admin";
    if (role === "user") return "User";
    if (!role) return "Role Missing";
    return "User";
  }, []);

  const RolePill = useCallback(
    ({ role }) => {
      const label = roleLabel(role);

      const pillStyle = { backgroundColor: theme.uiBackground };

      const textStyle =
        role === "head_admin"
          ? { color: theme.text }
          : role === "admin"
          ? { color: theme.icon }
          : role === "user"
          ? { color: theme.textMuted }
          : { color: theme.warning };

      return (
        <View style={[styles.rolePill, pillStyle]}>
          <ThemedText style={[styles.rolePillText, textStyle]}>
            {label}
          </ThemedText>
        </View>
      );
    },
    [roleLabel, theme]
  );

  const ActionRow = useCallback(
    ({ userId, role }) => {
      const isBusy = !!busyIds[userId];
      const isSelf = !!currentUserId && userId === currentUserId;
      const normalizedRole =
        role === "head_admin" || role === "admin" || role === "user"
          ? role
          : null;

      if (isSelf) {
        return (
          <View style={[styles.protectedWrap, { backgroundColor: theme.uiBackground }]}>
            <Ionicons name="lock-closed" size={14} color={theme.iconMuted} />
            <ThemedText style={[styles.protectedText, { color: theme.textMuted }]}>
              Current Account
            </ThemedText>
          </View>
        );
      }

      if (normalizedRole === "head_admin") {
        return (
          <View style={[styles.protectedWrap, { backgroundColor: theme.uiBackground }]}>
            <Ionicons name="lock-closed" size={14} color={theme.iconMuted} />
            <ThemedText style={[styles.protectedText, { color: theme.textMuted }]}>
              Protected
            </ThemedText>
          </View>
        );
      }

      if (!normalizedRole) {
        return (
          <View style={[styles.protectedWrap, { backgroundColor: theme.uiBackground }]}>
            <Ionicons name="alert-circle-outline" size={14} color={theme.warning} />
            <ThemedText style={[styles.protectedText, { color: theme.warning }]}>
              Data Issue
            </ThemedText>
          </View>
        );
      }

      const isUser = normalizedRole === "user";
      const isAdmin = normalizedRole === "admin";

      return (
        <View style={styles.actionsCol}>
          {isUser && (
            <ThemedButton
              onPress={() => confirmRoleChange(userId, "admin", "Admin")}
              style={[styles.primaryActionBtn, { backgroundColor: theme.icon }]}
              disabled={isBusy}
            >
              <ThemedText style={styles.actionText}>
                {isBusy ? "Working..." : "Promote"}
              </ThemedText>
            </ThemedButton>
          )}

          {isAdmin && (
            <>
              <ThemedButton
                onPress={() => confirmRoleChange(userId, "user", "User")}
                style={[styles.dangerActionBtn, { backgroundColor: theme.warning }]}
                disabled={isBusy}
              >
                <ThemedText style={styles.actionText}>
                  {isBusy ? "Working..." : "Demote"}
                </ThemedText>
              </ThemedButton>

              {/* Secondary action - smaller, less loud */}
              <Pressable
                onPress={() =>
                  confirmRoleChange(userId, "head_admin", "Head Admin")
                }
                disabled={isBusy}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.secondaryLinkBtn,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={14}
                  color={theme.icon}
                />
                <ThemedText style={[styles.secondaryLinkText, { color: theme.icon }]}>
                  Make Head Admin
                </ThemedText>
              </Pressable>
            </>
          )}
        </View>
      );
    },
    [busyIds, confirmRoleChange, currentUserId, theme]
  );

  const renderPersonCard = useCallback(
    ({ item, variant }) => {
      const role = item.admin_role ?? null;

      return (
        <ThemedCard style={[styles.personCard, { backgroundColor: theme.surface }]}>
          <View style={styles.personRow}>
            {/* Left: avatar circle */}
            <View
              style={[
                styles.avatar,
                { backgroundColor: theme.uiBackground },
              ]}
              accessibilityRole="image"
              accessibilityLabel="User avatar"
            >
              <Ionicons name="person" size={16} color={theme.iconMuted} />
            </View>

            {/* Middle: name + role */}
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.name, { color: theme.title }]}>
                {item.username || "User"}
              </ThemedText>

              <View style={styles.metaRow}>
                <RolePill role={role} />
                {variant === "search" && (
                  <ThemedText muted style={{ color: theme.textMuted }}>
                    From search
                  </ThemedText>
                )}
                {!role && (
                  <ThemedText muted style={{ color: theme.warning }}>
                    Profile role needs repair
                  </ThemedText>
                )}
              </View>
            </View>

            {/* Right: actions */}
            <ActionRow userId={item.id} role={role} />
          </View>
        </ThemedCard>
      );
    },
    [ActionRow, RolePill, theme]
  );

  const isLoading = adminLoading || loading;

  const showEmptyAdmins = useMemo(() => admins.length === 0, [admins.length]);

  const showSearchSection = useMemo(
    () => searchResults.length > 0 || searching,
    [searchResults.length, searching]
  );

  if (isLoading) {
    return (
      <ThemedView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.icon} />
      </ThemedView>
    );
  }

  if (!isHeadAdmin) {
    return (
      <ThemedView style={[styles.center, { backgroundColor: theme.background }]}>
        <Ionicons name="lock-closed-outline" size={22} color={theme.iconMuted} />
        <Spacer height={10} />
        <ThemedText style={[styles.deniedTitle, { color: theme.title }]}>
          Access Denied
        </ThemedText>
        <Spacer height={6} />
        <ThemedText style={[styles.deniedBody, { color: theme.textMuted }]}>
          You must be a head admin to view this page.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <FlatList
        data={admins}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderPersonCard({ item, variant: "admins" })}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Top Bar */}
            <View style={styles.headerRow}>
              <Pressable
                onPress={() => router.replace("/(dashboard)/menu")}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Back"
                accessibilityHint="Returns to the menu screen"
                style={[styles.backButton, { backgroundColor: theme.surface }]}
              >
                <Ionicons name="arrow-back" size={18} color={theme.iconMuted} />
              </Pressable>

              <View style={{ flex: 1 }}>
                <ThemedText
                  title
                  style={[styles.headerTitle, { color: theme.title }]}
                >
                  Manage Admins
                </ThemedText>
                <ThemedText muted style={{ color: theme.textMuted }}>
                  Promote, demote, and assign head admins.
                </ThemedText>
              </View>

              <View style={styles.headerRightSpacer} />
            </View>

            <Spacer height={14} />

            {/* Search Card */}
            <ThemedCard
              style={[styles.searchCard, { backgroundColor: theme.surface }]}
            >
              <View style={styles.searchTitleRow}>
                <Ionicons name="search" size={16} color={theme.iconMuted} />
                <ThemedText style={[styles.sectionLabel, { color: theme.title }]}>
                  Search users
                </ThemedText>
              </View>

              <Spacer height={10} />

              <ThemedTextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by username..."
                autoCapitalize="none"
                style={styles.searchInput}
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />

              <Spacer height={10} />

              <View style={styles.searchRow}>
                <ThemedButton
                  onPress={handleSearch}
                  style={[styles.searchBtn, { backgroundColor: theme.icon }]}
                  disabled={searching}
                >
                  <ThemedText style={styles.actionText}>
                    {searching ? "Searching..." : "Search"}
                  </ThemedText>
                </ThemedButton>

                <ThemedButton
                  onPress={clearSearch}
                  style={[
                    styles.searchBtn,
                    {
                      backgroundColor: theme.uiBackground,
                      borderWidth: 1,
                      borderColor: theme.navBackground,
                    },
                  ]}
                >
                  <ThemedText style={[styles.clearText, { color: theme.text }]}>
                    Clear
                  </ThemedText>
                </ThemedButton>
              </View>

              {searching && (
                <>
                  <Spacer height={10} />
                  <View style={styles.inlineLoadingRow}>
                    <ActivityIndicator size="small" color={theme.icon} />
                    <ThemedText muted style={{ color: theme.textMuted }}>
                      Searching...
                    </ThemedText>
                  </View>
                </>
              )}
            </ThemedCard>

            {/* Search results section */}
            {showSearchSection && (
              <>
                <Spacer height={16} />
                <ThemedText style={[styles.sectionHeader, { color: theme.title }]}>
                  Search Results
                </ThemedText>
                <Spacer height={10} />

                {searchResults.length === 0 && !searching ? (
                  <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>
                    No matches found.
                  </ThemedText>
                ) : (
                  <View style={{ gap: 12 }}>
                    {searchResults.map((item) => (
                      <View key={item.id}>
                        {renderPersonCard({ item, variant: "search" })}
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            <Spacer height={18} />

            {/* Current admins label */}
            <ThemedText style={[styles.sectionHeader, { color: theme.title }]}>
              Current Admins
            </ThemedText>
            <Spacer height={10} />
          </>
        }
        ListEmptyComponent={
          showEmptyAdmins ? (
            <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>
              No admins found.
            </ThemedText>
          ) : null
        }
        ListFooterComponent={<Spacer height={40} />}
      />
    </ThemedView>
  );
};

export default ManageAdmins;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },

  listContent: { padding: 16, paddingBottom: 50 },

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
    fontSize: 22,
    fontWeight: "800",
  },

  headerRightSpacer: {
    width: 40,
    height: 40,
  },

  searchCard: {
    borderRadius: 18,
    padding: 14,
  },

  searchTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  searchInput: {},

  searchRow: { flexDirection: "row", gap: 10 },

  searchBtn: { borderRadius: 12, flex: 1, paddingVertical: 12 },

  actionText: { color: "#fff", fontWeight: "800", fontSize: 12 },

  clearText: { fontWeight: "800", fontSize: 12 },

  sectionLabel: { fontSize: 13, fontWeight: "800" },

  sectionHeader: { fontSize: 14, fontWeight: "900" },

  emptyText: { textAlign: "left" },

  personCard: {
    borderRadius: 16,
    padding: 12,
  },

  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  name: { fontSize: 15, fontWeight: "800" },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },

  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  rolePillText: {
    fontSize: 12,
    fontWeight: "800",
  },

  actionsCol: {
    alignItems: "flex-end",
    gap: 8,
  },

  primaryActionBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  dangerActionBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  secondaryLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 10,
  },

  secondaryLinkText: {
    fontSize: 12,
    fontWeight: "800",
  },

  protectedWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },

  protectedText: {
    fontSize: 12,
    fontWeight: "800",
  },

  deniedTitle: { fontWeight: "900", fontSize: 16 },
  deniedBody: { textAlign: "center" },

  inlineLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
