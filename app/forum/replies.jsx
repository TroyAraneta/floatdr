import { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";
import ThemedTextInput from "../../components/ThemedTextInput";

export default function Replies() {
  const { replyId } = useLocalSearchParams();

  const [parent, setParent] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editingReply, setEditingReply] = useState(null);
  const [editText, setEditText] = useState("");

  /* -------------------- USER -------------------- */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id ?? null);
    });
  }, []);

  /* -------------------- LOAD DATA -------------------- */
  useEffect(() => {
    if (!replyId) return;

    const load = async () => {
      setLoading(true);

      const { data: parentReply } = await supabase
        .from("forum_replies")
        .select(`
          id,
          body,
          created_at,
          author_id,
          thread_id,
          profiles ( username, avatar_url )
        `)
        .eq("id", replyId)
        .single();

      const { data: childReplies } = await supabase
        .from("forum_replies")
        .select(`
          id,
          body,
          created_at,
          author_id,
          parent_id,
          profiles ( username, avatar_url )
        `)
        .eq("parent_id", replyId)
        .order("created_at");

      setParent(parentReply);
      setReplies(childReplies || []);
      setLoading(false);
    };

    load();
  }, [replyId]);

  /* -------------------- ACTIONS -------------------- */
  const reloadReplies = async () => {
    const { data } = await supabase
      .from("forum_replies")
      .select(`
        id,
        body,
        created_at,
        author_id,
        parent_id,
        profiles ( username, avatar_url )
      `)
      .eq("parent_id", replyId)
      .order("created_at");

    setReplies(data || []);
  };

  const submitReply = async () => {
    if (!replyText.trim() || !userId) return;

    await supabase.from("forum_replies").insert({
      thread_id: parent.thread_id,
      author_id: userId,
      body: replyText.trim(),
      parent_id: replyId,
    });

    setReplyText("");
    reloadReplies();
  };

  const saveEdit = async () => {
    if (!editText.trim()) return;

    await supabase
      .from("forum_replies")
      .update({ body: editText.trim() })
      .eq("id", editingReply.id);

    setEditingReply(null);
    setEditText("");
    reloadReplies();
  };

  /* -------------------- RENDER -------------------- */
  if (loading || !parent) {
    return (
      <ThemedView safe style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <ThemedView safe style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
        {/* PARENT REPLY */}
        <View style={styles.parentCard}>
          <Image
            source={{
              uri:
                parent.profiles?.avatar_url ||
                "https://cdn-icons-png.flaticon.com/512/149/149071.png",
            }}
            style={styles.avatar}
          />

          <View style={{ flex: 1 }}>
            <ThemedText style={styles.username}>
              {parent.profiles?.username ?? "User"}
            </ThemedText>
            <ThemedText style={styles.body}>
              {parent.body}
            </ThemedText>
          </View>
        </View>

        <ThemedText style={styles.replyCount}>
          {replies.length} Replies
        </ThemedText>

        {/* CHILD REPLIES */}
        {replies.map(reply => (
          <View key={reply.id} style={styles.replyCard}>
            <Image
              source={{
                uri:
                  reply.profiles?.avatar_url ||
                  "https://cdn-icons-png.flaticon.com/512/149/149071.png",
              }}
              style={styles.replyAvatar}
            />

            <View style={{ flex: 1 }}>
              <ThemedText style={styles.username}>
                {reply.profiles?.username ?? "User"}
              </ThemedText>

              {editingReply?.id === reply.id ? (
                <View style={styles.editBox}>
                  <ThemedTextInput
                    value={editText}
                    onChangeText={setEditText}
                    multiline
                    style={{ paddingBottom: 40 }}
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingReply(null);
                        setEditText("");
                      }}
                    >
                      <ThemedText style={styles.cancel}>
                        Cancel
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={saveEdit}>
                      <ThemedText style={styles.done}>
                        Done
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <ThemedText style={styles.body}>
                  {reply.body}
                </ThemedText>
              )}
            </View>

            {/* MENU */}
            {reply.author_id === userId && (
              <TouchableOpacity
                hitSlop={15}
                onPress={() => {
                  Alert.alert("Options", "", [
                    {
                      text: "Edit",
                      onPress: () => {
                        setEditingReply(reply);
                        setEditText(reply.body);
                      },
                    },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: async () => {
                        await supabase
                          .from("forum_replies")
                          .delete()
                          .eq("id", reply.id);
                        reloadReplies();
                      },
                    },
                    { text: "Cancel", style: "cancel" },
                  ]);
                }}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={16}
                  color="#777"
                />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      {/* REPLY INPUT */}
      {!editingReply && (
        <ThemedView safe style={styles.replyBox}>
          <ThemedTextInput
            placeholder="Write a reply..."
            value={replyText}
            onChangeText={setReplyText}
            multiline
            style={{ flex: 1 }}
          />
          <TouchableOpacity onPress={submitReply} style={styles.send}>
            <Ionicons name="send" size={22} color="#0a84ff" />
          </TouchableOpacity>
        </ThemedView>
      )}
    </ThemedView>
  );
}

/* -------------------- STYLES -------------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  parentCard: {
    flexDirection: "row",
    margin: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#fff",
  },

  replyCard: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#fff",
  },

  avatar: { width: 42, height: 42, borderRadius: 21, marginRight: 12 },
  replyAvatar: { width: 34, height: 34, borderRadius: 17, marginRight: 10 },

  username: { fontWeight: "600", marginBottom: 2 },
  body: { opacity: 0.85 },

  replyCount: {
    marginHorizontal: 16,
    marginBottom: 6,
    fontWeight: "600",
  },

  replyBox: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#eee",
  },

  send: { padding: 10 },

  editBox: { position: "relative" },
  editActions: {
    position: "absolute",
    right: 8,
    bottom: 8,
    flexDirection: "row",
    gap: 12,
  },

  cancel: { opacity: 0.6 },
  done: { fontWeight: "600" },
});
