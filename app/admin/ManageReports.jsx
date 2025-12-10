import { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { supabase } from "../../lib/supabase";
import ThemedText from "../../components/ThemedText";
import ThemedButton from "../../components/ThemedButton";

const ManageReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ Fetch all reports (with thread + reporter info)
  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from("forum_reports")
        .select(`
          id,
          reason,
          details,
          created_at,
          thread_id,
          reporter_id,
          forum_threads ( title ),
          profiles ( username )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // ✅ Delete a report (after reviewing it)
  const handleDeleteReport = async (id) => {
    Alert.alert("Confirm", "Delete this report?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("forum_reports")
              .delete()
              .eq("id", id);
            if (error) throw error;
            setReports((prev) => prev.filter((r) => r.id !== id));
          } catch (err) {
            Alert.alert("Error", err.message);
          }
        },
      },
    ]);
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshing={refreshing}
      onRefresh={fetchReports}
    >
      <ThemedText title style={styles.title}>
        ⚠️ Manage Reports
      </ThemedText>

      {reports.length === 0 ? (
        <ThemedText style={styles.emptyText}>No reports found.</ThemedText>
      ) : (
        reports.map((r) => (
          <View key={r.id} style={styles.card}>
            <ThemedText style={styles.reason}>
              Reason: {r.reason}
            </ThemedText>
            {r.details ? (
              <ThemedText style={styles.details}>
                Details: {r.details}
              </ThemedText>
            ) : null}
            <ThemedText style={styles.meta}>
              Reported by: {r.profiles?.username || "Anonymous"}
            </ThemedText>
            <ThemedText style={styles.meta}>
              Thread: {r.forum_threads?.title || "(deleted)"}
            </ThemedText>
            <ThemedText style={styles.date}>
              {new Date(r.created_at).toLocaleString()}
            </ThemedText>

            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => handleDeleteReport(r.id)}
                style={styles.deleteBtn}
              >
                <ThemedText style={{ color: "#fff" }}>Delete</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

export default ManageReports;

const styles = StyleSheet.create({
  container: { backgroundColor: "#fff", flex: 1 },
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
});
