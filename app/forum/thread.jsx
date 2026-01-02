import { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  View,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";
import ThemedTextInput from "../../components/ThemedTextInput";

export default function Thread() {
  const { id } = useLocalSearchParams();

  const [thread, setThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("relevant"); // relevant | newest

  const scales = useRef({}).current;

  /* ---------------- USER ---------------- */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) =>
      setUserId(data?.user?.id ?? null)
    );
  }, []);

  /* ---------------- LOAD ---------------- */
  const loadData = async () => {
    const [{ data: replyData }, { data: reactionData }] = await Promise.all([
      supabase
        .from("forum_replies")
        .select(`
          id,
          body,
          created_at,
          author_id,
          parent_id,
          profiles ( username, avatar_url )
        `)
        .eq("thread_id", id),

      supabase.from("reply_reactions").select("*"),
    ]);

    setReplies(replyData || []);
    setReactions(reactionData || []);
  };

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);

      const { data } = await supabase
        .from("forum_threads")
        .select(`
          id,
          title,
          body,
          profiles ( username, avatar_url )
        `)
        .eq("id", id)
        .single();

      setThread(data);
      await loadData();
      setLoading(false);
    };

    load();
  }, [id]);

  /* ---------------- HELPERS ---------------- */
  const timeAgo = (date) => {
    const diff = (Date.now() - new Date(date)) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const getReactionCount = (id, type) =>
    reactions.filter(r => r.reply_id === id && r.type === type).length;

  const getUserReaction = (id) =>
    reactions.find(r => r.reply_id === id && r.user_id === userId)?.type;

  const sortedComments = replies
    .filter(r => !r.parent_id)
    .sort((a, b) => sort === "newest"
      ? new Date(b.created_at) - new Date(a.created_at)
      : getReactionCount(b.id, "like") - getReactionCount(a.id, "like")
    );

  const getReplies = (id) =>
    replies
      .filter(r => r.parent_id === id)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  /* ---------------- ACTIONS ---------------- */
  const toggleReplies = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const startReply = (item, isReply = false) => {
    setReplyingTo(item.parent_id ?? item.id);
    setReplyText(isReply && item.author_id !== userId ? `@${item.profiles.username} ` : "");
  };

  const animateLike = (id) => {
    if (!scales[id]) scales[id] = new Animated.Value(1);
    Animated.sequence([
      Animated.timing(scales[id], { toValue: 1.25, duration: 120, useNativeDriver: true }),
      Animated.timing(scales[id], { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const react = async (replyId, type) => {
    const current = getUserReaction(replyId);

    if (current === type) {
      await supabase.from("reply_reactions").delete()
        .eq("reply_id", replyId)
        .eq("user_id", userId);
    } else {
      await supabase.from("reply_reactions").upsert({ reply_id: replyId, user_id: userId, type });
      if (type === "like") animateLike(replyId);
    }
    loadData();
  };

  const submitReply = async () => {
    if (!replyText.trim()) return;

    await supabase.from("forum_replies").insert({
      body: replyText.trim(),
      author_id: userId,
      thread_id: id,
      parent_id: replyingTo,
    });

    setReplyText("");
    setReplyingTo(null);
    loadData();
  };

  if (loading) {
    return (
      <ThemedView safe style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  /* ---------------- UI ---------------- */

  const renderActions = (item) => {
    const reaction = getUserReaction(item.id);

    return (
      <View style={styles.actions}>
        <TouchableOpacity
          disabled={reaction === "dislike"}
          onPress={() => react(item.id, "like")}
        >
          <Animated.View style={[styles.reactBtn, reaction === "like" && styles.reacted, { transform: [{ scale: scales[item.id] || 1 }] }]}>
            <Ionicons name="heart" size={16} style={{ marginRight: 4 }} />
            <ThemedText>{getReactionCount(item.id, "like")}</ThemedText>
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={reaction === "like"}
          onPress={() => react(item.id, "dislike")}
        >
          <View style={[styles.reactBtn, reaction === "dislike" && styles.disliked]}>
            <Ionicons name="heart-dislike" size={16} style={{ marginRight: 4 }} />
            <ThemedText>{getReactionCount(item.id, "dislike")}</ThemedText>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => startReply(item, !!item.parent_id)}>
          <View style={styles.replyAction}>
            <Ionicons name="chatbubble-outline" size={16} />
            <ThemedText style={{ marginLeft: 4 }}>Reply</ThemedText>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ThemedView safe style={styles.container}>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>

          {/* THREAD HEADER */}
          <View style={styles.threadCard}>
            <View style={styles.profileRow}>
              <Image source={{ uri: thread.profiles.avatar_url }} style={styles.threadAvatar} />
              <View>
                <ThemedText style={styles.threadUser}>{thread.profiles.username}</ThemedText>
              </View>
            </View>

            <ThemedText style={styles.title}>{thread.title}</ThemedText>
            <ThemedText style={styles.body}>{thread.body}</ThemedText>
          </View>

          {/* SORT */}
          <View style={styles.sortRow}>
            {["relevant", "newest"].map(s => (
              <TouchableOpacity key={s} onPress={() => setSort(s)}>
                <ThemedText style={[styles.sort, sort === s && styles.activeSort]}>
                  {s === "relevant" ? "Most Relevant" : "Newest"}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* COMMENTS */}
          {sortedComments.map(comment => {
            const children = getReplies(comment.id);
            const open = expanded.has(comment.id);

            return (
              <View key={comment.id}>
                <View style={styles.replyCard}>
                  <Image source={{ uri: comment.profiles.avatar_url }} style={styles.replyAvatar} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.userRow}>
                      <ThemedText style={styles.replyUser}>{comment.profiles.username}</ThemedText>
                      <ThemedText style={styles.time}>{timeAgo(comment.created_at)}</ThemedText>
                    </View>

                    <ThemedText>{comment.body}</ThemedText>
                    {renderActions(comment)}

                    {children.length > 0 && (
                      <TouchableOpacity onPress={() => toggleReplies(comment.id)}>
                        <ThemedText style={styles.viewReplies}>
                          {open ? "Hide replies" : `💬 View ${children.length} replies`}
                        </ThemedText>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {open && children.map(reply => (
                  <View key={reply.id} style={styles.childReply}>
                    <Image source={{ uri: reply.profiles.avatar_url }} style={styles.childAvatar} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.userRow}>
                        <ThemedText style={styles.replyUser}>{reply.profiles.username}</ThemedText>
                        <ThemedText style={styles.time}>{timeAgo(reply.created_at)}</ThemedText>
                      </View>
                      <ThemedText>{reply.body}</ThemedText>
                      {renderActions(reply)}
                    </View>
                  </View>
                ))}
              </View>
            );
          })}

        </ScrollView>

        {/* ✍️ INPUT BAR */}
        <ThemedView safe style={styles.replyBar}>
          <ThemedTextInput
            placeholder="Write a reply..."
            value={replyText}
            onChangeText={setReplyText}
            style={{ flex: 1, marginRight: 12 }}
            multiline
          />
          <TouchableOpacity onPress={submitReply}>
            <Ionicons name="send" size={22} color="#0a84ff" />
          </TouchableOpacity>
        </ThemedView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center" },

  threadCard: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  profileRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  threadAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  threadUser: { fontWeight: "600", fontSize: 14, opacity: 0.8 },

  title: { fontSize: 18, fontWeight: "700", marginTop: 4, marginBottom: 6 },
  body: { opacity: 0.8, fontSize: 14, marginBottom: 6 },

  sortRow: { flexDirection: "row", gap: 12, marginHorizontal: 16, marginBottom: 8 },
  sort: { fontSize: 12, opacity: 0.6, paddingVertical: 4 },
  activeSort: { fontWeight: "700", color: "#0a84ff", opacity: 1, borderBottomWidth: 2, borderColor: "#0a84ff" },

  replyCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#fff",
    flexDirection: "row",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },

  childReply: {
    marginLeft: 60,
    marginRight: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f8f8f8",
    flexDirection: "row",
  },

  replyAvatar: { width: 38, height: 38, borderRadius: 20, marginRight: 10 },
  childAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 10 },

  userRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  replyUser: { fontWeight: "600" },
  time: { fontSize: 11, opacity: 0.4 },

  actions: { flexDirection: "row", marginTop: 8, gap: 10 },
  reactBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#f2f2f2",
  },
  reacted: { backgroundColor: "#ffeff3", color: "#e6004c" },
  disliked: { backgroundColor: "#eef6ff" },

  replyAction: { flexDirection: "row", alignItems: "center", opacity: 0.7 },

  viewReplies: { marginTop: 6, fontWeight: "600", color: "#0a84ff" },

  replyBar: {
    flexDirection: "row",
    padding: 14,
    gap: 10,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "white",
  },
});