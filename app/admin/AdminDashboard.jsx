import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { supabase } from "../../lib/supabase";
import useAdminStatus from "../hooks/useAdminStatus";

export default function AdminDashboard() {
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch reports
  useEffect(() => {
    if (isAdmin) fetchReports();
  }, [isAdmin]);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reports")
      .select("id, reason, status, user_id, post_id, created_at");

    if (error) {
      console.error("Error fetching reports:", error);
      Alert.alert("Error", "Failed to load reports.");
    } else {
      setReports(data);
    }
    setLoading(false);
  };

  // Mark report as resolved
  const handleResolve = async (id) => {
    const { error } = await supabase.from("reports").update({ status: "Resolved" }).eq("id", id);
    if (error) {
      Alert.alert("Error", "Failed to update report status.");
    } else {
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: "Resolved" } : r)));
      Alert.alert("✅ Success", "Report marked as resolved.");
    }
  };

  // Delete report and post
  const handleDelete = (reportId, postId) => {
    Alert.alert(
      "Confirm Delete",
      "Do you want to delete this report and the associated post?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Delete the post (if exists)
            if (postId) {
              const { error: postError } = await supabase.from("posts").delete().eq("id", postId);
              if (postError) console.error("Error deleting post:", postError);
            }

            // Delete the report itself
            const { error: reportError } = await supabase.from("reports").delete().eq("id", reportId);
            if (reportError) {
              Alert.alert("Error", "Failed to delete report.");
            } else {
              setReports((prev) => prev.filter((r) => r.id !== reportId));
              Alert.alert("🗑️ Deleted", "Report and post deleted successfully.");
            }
          },
        },
      ]
    );
  };

  // Loading states
  if (adminLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  // Not admin case
  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "red", fontWeight: "bold", fontSize: 16 }}>Access Denied 🚫</Text>
        <Text style={{ color: "#555", marginTop: 5 }}>You must be an admin to view this page.</Text>
      </View>
    );
  }

  // Render each report
  const renderItem = ({ item }) => (
    <View style={styles.reportCard}>
      <Text style={styles.id}>Report ID: {item.id}</Text>
      <Text>Reason: {item.reason}</Text>
      <Text>Status: {item.status}</Text>
      <Text>User ID: {item.user_id}</Text>
      {item.post_id && <Text>Post ID: {item.post_id}</Text>}
      <Text>Created: {new Date(item.created_at).toLocaleString()}</Text>

      <View style={styles.actions}>
        {item.status !== "Resolved" && (
          <TouchableOpacity style={[styles.button, styles.resolveButton]} onPress={() => handleResolve(item.id)}>
            <Text style={styles.buttonText}>Resolve</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={() => handleDelete(item.id, item.post_id)}
        >
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>👑 Admin Report Dashboard</Text>
      <Text style={styles.subheading}>Monitor and manage all user reports below</Text>

      {reports.length === 0 ? (
        <Text style={styles.emptyText}>No reports found.</Text>
      ) : (
        <FlatList data={reports} keyExtractor={(item) => item.id.toString()} renderItem={renderItem} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  subheading: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  reportCard: {
    backgroundColor: "#f2f2f2",
    padding: 14,
    borderRadius: 10,
    marginVertical: 8,
  },
  id: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 8,
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  resolveButton: {
    backgroundColor: "#4CAF50",
  },
  deleteButton: {
    backgroundColor: "#F44336",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  emptyText: {
    textAlign: "center",
    color: "#777",
    marginTop: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
