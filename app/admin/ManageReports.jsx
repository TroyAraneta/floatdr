import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  FlatList,
  View,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import ThemedView from "../../components/ThemedView";
import ThemedCard from "../../components/ThemedCard";
import ThemedButton from "../../components/ThemedButton";
import ThemedText from "../../components/ThemedText";
import Spacer from "../../components/Spacer";
import { useTheme } from "../../contexts/ThemeContext";
import useAdminStatus from "../../hooks/useAdminStatus";

const ManageReports = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { data, error } = await supabase
        .from("moderation_reports")
        .select(`
          id,
          reason,
          notes,
          created_at,
          thread_id,
          reply_id,
          reporter_id,
          forum_threads ( title )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const safeReports = data || [];
      const reporterIds = [...new Set(safeReports.map((item) => item.reporter_id).filter(Boolean))];

      let usernameMap = {};
      if (reporterIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", reporterIds);

        if (profileError) throw profileError;

        usernameMap = (profileData || []).reduce((acc, profile) => {
          acc[profile.id] = profile.username;
          return acc;
        }, {});
      }

      setReports(
        safeReports.map((item) => ({
          ...item,
          reporter_username: usernameMap[item.reporter_id] || "Anonymous",
        }))
      );
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    fetchReports(false);
  }, [fetchReports, isAdmin]);

  const handleRefresh = useCallback(() => {
    fetchReports(true);
  }, [fetchReports]);

  const handleDeleteReport = useCallback((item) => {
    const hasReply = !!item.reply_id;

    Alert.alert("Manage Report", "What would you like to do?", [
      { text: "Cancel", style: "cancel" },
      {
        // Dismiss: remove the report only, keep the content
        text: "Dismiss Report",
        style: "default",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("moderation_reports")
              .delete()
              .eq("id", item.id);
            if (error) throw error;
            setReports((prev) => prev.filter((r) => r.id !== item.id));
          } catch (err) {
            Alert.alert("Error", err.message);
          }
        },
      },
      {
        // Delete content: cascade will auto-delete the report too
        text: "Delete Content",
        style: "destructive",
        onPress: async () => {
          try {
            if (hasReply) {
              const { error } = await supabase
                .from("forum_replies")
                .delete()
                .eq("id", item.reply_id);
              if (error) throw error;
            } else {
              const { error } = await supabase
                .from("forum_threads")
                .delete()
                .eq("id", item.thread_id);
              if (error) throw error;
            }

            // No need to delete the report — cascade handles it
            setReports((prev) => prev.filter((r) => r.id !== item.id));
          } catch (err) {
            Alert.alert("Error", err.message);
          }
        },
      },
    ]);
  }, []);

  const renderItem = useCallback(
    ({ item }) => (
      <ThemedCard
        style={[
          styles.card,
          { backgroundColor: theme.surface, shadowColor: theme.shadow },
        ]}
      >
        <ThemedText style={[styles.reason, { color: theme.title }]}>
          Reason: {item.reason}
        </ThemedText>
        {item.notes ? (
          <ThemedText style={[styles.details, { color: theme.text }]}>
            Notes: {item.notes}
          </ThemedText>
        ) : null}
        <ThemedText style={[styles.meta, { color: theme.textMuted }]}>
          Reported by: {item.reporter_username || "Anonymous"}
        </ThemedText>
        <ThemedText style={[styles.meta, { color: theme.textMuted }]}>
          Thread: {item.forum_threads?.title || "(deleted)"}
        </ThemedText>
        {item.reply_id ? (
          <ThemedText style={[styles.meta, { color: theme.textMuted }]}>
            Reply ID: {item.reply_id}
          </ThemedText>
        ) : null}
        <ThemedText style={[styles.date, { color: theme.textMuted }]}>
          {new Date(item.created_at).toLocaleString()}
        </ThemedText>

        <View style={styles.actions}>
          <ThemedButton
            onPress={() => handleDeleteReport(item)}
            style={[styles.deleteBtn, { backgroundColor: theme.warning }]}
          >
            <ThemedText style={{ color: "#fff" }}>Delete</ThemedText>
          </ThemedButton>
        </View>
      </ThemedCard>
    ),
    [handleDeleteReport, theme]
  );

  if (adminLoading || loading) {
    return (
      <ThemedView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.icon} />
      </ThemedView>
    );
  }
  if (!isAdmin) {
    return (
      <ThemedView style={[styles.center, { backgroundColor: theme.background }]}>
        <Ionicons name="lock-closed-outline" size={22} color={theme.iconMuted} />
        <Spacer height={10} />
        <ThemedText style={[styles.deniedTitle, { color: theme.title }]}>
          Access Denied
        </ThemedText>
        <Spacer height={6} />
        <ThemedText style={[styles.deniedBody, { color: theme.textMuted }]}>
          You must be an admin to view this page.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <Pressable
                onPress={() => router.replace("/(dashboard)/menu")}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Back"
                style={[styles.backButton, { backgroundColor: theme.surface }]}
              >
                <Ionicons name="arrow-back" size={18} color={theme.iconMuted} />
              </Pressable>

              <View style={{ flex: 1 }}>
                <ThemedText
                  title
                  style={[styles.headerTitle, { color: theme.title }]}
                >
                  Manage Reports
                </ThemedText>
                <ThemedText muted style={{ color: theme.textMuted }}>
                  Review and remove reported forum content.
                </ThemedText>
              </View>

              <View style={styles.headerRightSpacer} />
            </View>

            <Spacer height={18} />
          </>
        }
        ListEmptyComponent={
          <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>
            No reports found.
          </ThemedText>
        }
        ListFooterComponent={<Spacer height={40} />}
      />
    </ThemedView>
  );
};

export default ManageReports;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 50 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  emptyText: { textAlign: "left" },
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  reason: { fontWeight: "800", fontSize: 15 },
  details: { marginTop: 6, lineHeight: 20 },
  meta: { fontSize: 13, marginTop: 4 },
  date: { fontSize: 12, marginTop: 6 },
  actions: { flexDirection: "row", marginTop: 10 },
  deleteBtn: {
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  deniedTitle: { fontWeight: "900", fontSize: 16 },
  deniedBody: { textAlign: "center" },
});
