import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import ThemedText from "../../components/ThemedText";

const MessageUser = () => {
  const { recipientId } = useLocalSearchParams();
  const [recipient, setRecipient] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);

  useEffect(() => {
    const initChat = async () => {
      try {
        // Get logged in user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert("Error", "You must be logged in to message someone.");
          return;
        }
        setCurrentUser(user);

        // Fetch recipient details
        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .eq("id", recipientId)
          .single();

        if (userError) throw userError;
        setRecipient(userData);

        // Fetch previous messages between the two users
        const { data: messagesData, error: msgError } = await supabase
          .from("messages")
          .select("*")
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order("created_at", { ascending: true });

        if (msgError) throw msgError;

        // Filter to only include messages between these two users
        const filtered = messagesData.filter(
          (msg) =>
            (msg.sender_id === user.id && msg.receiver_id === recipientId) ||
            (msg.sender_id === recipientId && msg.receiver_id === user.id)
        );

        setMessages(filtered);
      } catch (err) {
        console.error("Error loading messages:", err.message);
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, [recipientId]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    const message = {
      sender_id: currentUser.id,
      receiver_id: recipientId,
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
    };

    // Add locally first for instant feedback
    setMessages((prev) => [...prev, message]);
    setNewMessage("");

    const { error } = await supabase.from("messages").insert([message]);
    if (error) Alert.alert("Error", error.message);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3C5A99" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <Image
          source={{
            uri:
              recipient?.avatar_url ||
              "https://cdn-icons-png.flaticon.com/512/149/149071.png",
          }}
          style={styles.avatar}
        />
        <ThemedText style={styles.username}>
          {recipient?.username || "User"}
        </ThemedText>
      </View>

      {/* MESSAGES */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageBubble,
              item.sender_id === currentUser?.id
                ? styles.sent
                : styles.received,
            ]}
          >
            <ThemedText
              style={{
                color:
                  item.sender_id === currentUser?.id ? "#fff" : "#222",
              }}
            >
              {item.content}
            </ThemedText>
          </View>
        )}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        onLayout={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      {/* MESSAGE INPUT */}
      <View style={styles.inputContainer}>
        <TextInput
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          style={styles.input}
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default MessageUser;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  username: { fontSize: 18, fontWeight: "600" },
  messageBubble: {
    margin: 8,
    padding: 10,
    borderRadius: 12,
    maxWidth: "75%",
  },
  sent: {
    backgroundColor: "#3C5A99",
    alignSelf: "flex-end",
  },
  received: {
    backgroundColor: "#f1f1f1",
    alignSelf: "flex-start",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: "#3C5A99",
    borderRadius: 20,
    padding: 10,
  },
});
