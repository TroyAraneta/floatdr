import { useEffect, useState, useCallback } from "react";
import {
  View,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  StyleSheet,
  FlatList,
} from "react-native";
import { supabase } from "../../lib/supabase";
import ThemedText from "../../components/ThemedText";
import useAdminStatus from "../../hooks/useAdminStatus";

const ManageReports = () => {
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

  const handleDeleteReport = useCallback((id) => {
    Alert.alert("Confirm", "Delete this report?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("moderation_reports")
              .delete()
              .eq("id", id);
            if (error) throw error;
            setReports((prev) => prev.filter((report) => report.id !== id));
          } catch (err) {
            Alert.alert("Error", err.message);
          }
        },
      },
    ]);
  }, []);

  const renderItem = useCallback(
    ({ item }) => (
      <View style={styles.card}>
        <ThemedText style={styles.reason}>Reason: {item.reason}</ThemedText>
        {item.notes ? (
          <ThemedText style={styles.details}>Notes: {item.notes}</ThemedText>
        ) : null}
        <ThemedText style={styles.meta}>
          Reported by: {item.reporter_username || "Anonymous"}
        </ThemedText>
        <ThemedText style={styles.meta}>
          Thread: {item.forum_threads?.title || "(deleted)"}
        </ThemedText>
        <ThemedText style={styles.date}>
          {new Date(item.created_at).toLocaleString()}
        </ThemedText>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => handleDeleteReport(item.id)}
            style={styles.deleteBtn}
          >
            <ThemedText style={{ color: "#fff" }}>Delete</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [handleDeleteReport]
  );

  if (adminLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }
  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <ThemedText style={styles.deniedTitle}>Access Denied</ThemedText>
        <ThemedText style={styles.deniedBody}>
          You must be an admin to view this page.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
          <ThemedText title style={styles.title}>
            Manage Reports
          </ThemedText>
        }
        ListEmptyComponent={
          <ThemedText style={styles.emptyText}>No reports found.</ThemedText>
        }
      />
    </View>
  );
};

export default ManageReports;

const styles = StyleSheet.create({
  container: { backgroundColor: "#fff", flex: 1 },
  listContent: { padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, marginBottom: 16, textAlign: "center" },
  emptyText: { textAlign: "center", color: "#777" },
  card: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  reason: { fontWeight: "700", color: "#333" },
  details: { marginTop: 4, color: "#444" },
  meta: { fontSize: 13, color: "#666", marginTop: 4 },
  date: { fontSize: 12, color: "#999", marginTop: 6 },
  actions: { flexDirection: "row", marginTop: 10 },
  deleteBtn: {
    backgroundColor: "#e53935",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  deniedTitle: { color: "red", fontWeight: "bold", fontSize: 16 },
  deniedBody: { color: "#555", marginTop: 5 },
});
