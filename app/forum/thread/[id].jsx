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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../../lib/supabase";
import ThemedText from "../../../components/ThemedText";
import { useTheme } from "../../../contexts/ThemeContext";

const ThreadView = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const [thread, setThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const handleReportThread = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      Alert.alert("Login required", "Please log in to report this post.");
      router.replace("/(auth)/login");
      return;
    }

    router.push({
      pathname: "/(stack)/reportThread",
      params: {
        threadId: id,
        threadTitle: thread?.title || "",
      },
    });
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <View style={[styles.postCard, { backgroundColor: theme.surface }]}>
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

          <TouchableOpacity
            onPress={handleReportThread}
            style={[styles.reportButton, { backgroundColor: theme.uiBackground }]}
          >
            <ThemedText style={{ color: "#e53935", fontWeight: "600" }}>
              Report Post
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ThemedText title style={styles.replyHeader}>
          Replies
        </ThemedText>

        {replies.length === 0 ? (
          <ThemedText style={styles.noReplies}>
            No replies yet. Be the first!
          </ThemedText>
        ) : (
          replies.map((r) => (
            <View
              key={r.id}
              style={[styles.replyCard, { backgroundColor: theme.surface }]}
            >
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

      <View
        style={[
          styles.replyBox,
          { backgroundColor: theme.surface, borderColor: theme.uiBackground },
        ]}
      >
        <TextInput
          style={[styles.input, { backgroundColor: theme.uiBackground }]}
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
    </View>
  );
};

export default ThreadView;

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  postCard: {
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
    borderRadius: 8,
  },
  replyHeader: { fontSize: 18, marginBottom: 10 },
  noReplies: { textAlign: "center", color: "#777", marginTop: 20 },
  replyCard: {
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
  },
  input: {
    flex: 1,
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
});
