import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";

export default function EditThread() {
  const router = useRouter();
  const { threadId } = useLocalSearchParams();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // ✅ Check if user is admin
  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (error || !data) return false;
    setIsAdmin(data.is_admin === true);
    return data.is_admin === true;
  };

  // ✅ Fetch thread details
  const fetchThread = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("forum_threads")
        .select("title, content")
        .eq("id", threadId)
        .single();

      if (error) throw error;
      setTitle(data.title);
      setContent(data.content);
    } catch (err) {
      console.error("Error loading thread:", err.message);
      Alert.alert("Error", "Failed to load thread details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdminStatus();
    fetchThread();
  }, [threadId]);

  // ✅ Update thread in Supabase
  const handleSave = async () => {
    if (!isAdmin) {
      Alert.alert("Access Denied", "Only admins can edit threads.");
      return;
    }

    if (!title.trim() || !content.trim()) {
      Alert.alert("Missing Fields", "Please fill out all fields.");
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from("forum_threads")
        .update({ title, content })
        .eq("id", threadId);

      if (error) throw error;

      Alert.alert("Success", "Thread updated successfully.");
      router.back();
    } catch (err) {
      console.error("Error saving thread:", err.message);
      Alert.alert("Error", "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#4CAF50" size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Edit Thread</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Thread Title"
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder="Thread Content"
        multiline
        numberOfLines={6}
        value={content}
        onChangeText={setContent}
      />

      <TouchableOpacity
        style={[styles.button, saving && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#fff",
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  textarea: {
    height: 150,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
