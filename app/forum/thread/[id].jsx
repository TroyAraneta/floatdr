import { useEffect, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Alert,
  Modal, // ✅ REPORT FEATURE
  Pressable, // ✅ REPORT FEATURE
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { supabase } from "../../../lib/supabase";
import ThemedText from "../../../components/ThemedText";
import ThemedButton from "../../../components/ThemedButton";

const ThreadView = () => {
  const { id } = useLocalSearchParams();
  const [thread, setThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ REPORT FEATURE
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const fetchThread = async () => {
    try {
      const { data: threadData, error: threadError } = await supabase
        .from("forum_threads")
        .select(`
          id,
          title,
          content,
          image_url,
          created_at,
          profiles ( id, username, avatar_url )
        `)
        .eq("id", id)
        .single();

      if (threadError) throw threadError;
      setThread(threadData);

      const { data: repliesData, error: repliesError } = await supabase
        .from("forum_replies")
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles ( id, username, avatar_url )
        `)
        .eq("thread_id", id)
        .order("created_at", { ascending: true });

      if (repliesError) throw repliesError;
      setReplies(repliesData || []);
    } catch (err) {
      console.error("Error fetching thread:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThread();
    const channel = supabase
      .channel(`thread_${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "forum_replies",
          filter: `thread_id=eq.${id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setReplies((prev) => [...prev, payload.new]);
          } else if (payload.eventType === "DELETE") {
            setReplies((prev) => prev.filter((r) => r.id !== payload.old.id));
          } else if (payload.eventType === "UPDATE") {
            setReplies((prev) =>
              prev.map((r) =>
                r.id === payload.new.id ? { ...r, ...payload.new } : r
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchThread();
    setRefreshing(false);
  }, []);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    try {
      setPosting(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert("Error", "You must be logged in to reply.");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single();

      const username = profile?.username || "Anonymous";
      const avatar = profile?.avatar_url || null;

      const { error: insertError } = await supabase
        .from("forum_replies")
        .insert([
          {
            thread_id: id,
            user_id: user.id,
            content: replyText,
          },
        ]);


      if (insertError) throw insertError;

      setReplyText("");
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setPosting(false);
    }
  };

  // ✅ REPORT FEATURE — handle report submission
  const handleReportSubmit = async () => {
    if (!reportReason.trim()) {
      Alert.alert("Missing reason", "Please select or write a reason.");
      return;
    }

    try {
      setSubmittingReport(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert("Error", "You must be logged in to report.");
        return;
      }

      const { error } = await supabase.from("forum_reports").insert([
        {
          thread_id: id,
          reporter_id: user.id,
          reason: reportReason,
          details: reportDetails,
        },
      ]);

      if (error) throw error;

      Alert.alert("Reported", "Thank you. The report has been submitted.");
      setReportModalVisible(false);
      setReportReason("");
      setReportDetails("");
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );

  if (!thread)
    return (
      <View style={styles.center}>
        <ThemedText>Thread not found</ThemedText>
      </View>
    );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* Original Thread */}
        <View style={styles.postCard}>
          <View style={styles.header}>
            <Image
              source={{
                uri:
                  thread.profiles?.avatar_url ||
                  "https://cdn-icons-png.flaticon.com/512/149/149071.png",
              }}
              style={styles.avatar}
            />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.username}>
                {thread.profiles?.username || "Anonymous"}
              </ThemedText>
              <ThemedText style={styles.date}>
                {new Date(thread.created_at).toLocaleString()}
              </ThemedText>
            </View>
          </View>

          <ThemedText title style={styles.title}>
            {thread.title}
          </ThemedText>
          {thread.content && (
            <ThemedText style={styles.content}>{thread.content}</ThemedText>
          )}
          {thread.image_url && (
            <Image source={{ uri: thread.image_url }} style={styles.image} />
          )}

          {/* ✅ REPORT BUTTON */}
          <TouchableOpacity
            onPress={() => setReportModalVisible(true)}
            style={styles.reportButton}
          >
            <ThemedText style={{ color: "#e53935", fontWeight: "600" }}>
              🚩 Report Post
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Replies */}
        <ThemedText title style={styles.replyHeader}>
          Replies
        </ThemedText>

        {replies.length === 0 ? (
          <ThemedText style={styles.noReplies}>
            No replies yet. Be the first!
          </ThemedText>
        ) : (
          replies.map((r) => (
            <View key={r.id} style={styles.replyCard}>
              <View style={styles.header}>
                <Image
                  source={{
                    uri:
                      r.profiles?.avatar_url ||
                      "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                  }}
                  style={styles.avatarSmall}
                />
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.username}>
                    {r.profiles?.username || "Anonymous"}
                  </ThemedText>
                  <ThemedText style={styles.date}>
                    {new Date(r.created_at).toLocaleString()}
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={styles.replyText}>{r.content}</ThemedText>
            </View>
          ))
        )}
      </ScrollView>

      {/* Reply Input */}
      <View style={styles.replyBox}>
        <TextInput
          style={styles.input}
          placeholder="Write a reply..."
          value={replyText}
          onChangeText={setReplyText}
          multiline
        />
        <TouchableOpacity
          onPress={handleReply}
          disabled={posting}
          style={styles.sendButton}
        >
          <ThemedText style={{ color: "#fff", fontWeight: "bold" }}>
            {posting ? "..." : "Send"}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* ✅ REPORT MODAL */}
      <Modal
        transparent
        animationType="fade"
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setReportModalVisible(false)}
        >
          <View style={styles.modalBox}>
            <ThemedText title>Report Post</ThemedText>

            <TextInput
              placeholder="Reason (e.g. spam, harassment...)"
              value={reportReason}
              onChangeText={setReportReason}
              style={styles.modalInput}
            />

            <TextInput
              placeholder="Additional details (optional)"
              value={reportDetails}
              onChangeText={setReportDetails}
              style={[styles.modalInput, { height: 80 }]}
              multiline
            />

            <ThemedButton
              title={submittingReport ? "Submitting..." : "Submit Report"}
              onPress={handleReportSubmit}
              disabled={submittingReport}
              color="#e53935"
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default ThreadView;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: { padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  postCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 8 },
  avatarSmall: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
  username: { fontWeight: "600", color: "#333" },
  date: { fontSize: 12, color: "#777" },
  title: { fontSize: 18, fontWeight: "700", marginVertical: 6 },
  content: { fontSize: 15, color: "#444", marginBottom: 8 },
  image: { width: "100%", height: 200, borderRadius: 10 },
  reportButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#ffeaea",
    borderRadius: 8,
  },
  replyHeader: { fontSize: 18, marginBottom: 10 },
  noReplies: { textAlign: "center", color: "#777", marginTop: 20 },
  replyCard: {
    backgroundColor: "#f3f3f3",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  replyText: { color: "#333", fontSize: 14, marginLeft: 38 },
  replyBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    backgroundColor: "#f2f3f5",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginLeft: 8,
  },
  // ✅ Modal styling
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    width: "85%",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
});
