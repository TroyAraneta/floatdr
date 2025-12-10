import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Image,
  StyleSheet,
  Platform,
  ActionSheetIOS,
  Modal,
  Pressable,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ForumList({ category: initialCategory }) {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedThread, setSelectedThread] = useState(null);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const categories = ["Mind", "Body", "Spirit"];

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user);
    };
    getUser();
  }, []);

  const fetchThreads = async () => {
    setLoading(true);
    try {
      const { data: cat } = await supabase
        .from("forum_categories")
        .select("id")
        .eq("name", selectedCategory)
        .single();

      if (!cat) return;

      const { data, error } = await supabase
        .from("forum_threads")
        .select(`
          id, title, content, created_at, user_id,
          profiles ( username, avatar_url )
        `)
        .eq("category_id", cat.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setThreads(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, [selectedCategory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchThreads();
    setRefreshing(false);
  }, [selectedCategory]);

  const handleMenuPress = (thread) => {
    setSelectedThread(thread);

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            "Cancel",
            "Report Forum",
            "Save Forum",
            ...(user?.id === thread.user_id ? ["Delete Forum"] : []),
          ],
          cancelButtonIndex: 0,
          destructiveButtonIndex: user?.id === thread.user_id ? 3 : undefined,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) handleReport(thread);
          else if (buttonIndex === 2) handleSave(thread);
          else if (buttonIndex === 3 && user?.id === thread.user_id)
            await deleteThread(thread.id);
        }
      );
    } else {
      setMenuVisible(true);
    }
  };

  const handleReport = (thread) => {
    Alert.alert("Reported", `You have reported "${thread.title}".`);
  };

  const handleSave = (thread) => {
    Alert.alert("Saved", `You have saved "${thread.title}" for later.`);
  };

  const deleteThread = async (id) => {
    Alert.alert("Confirm", "Delete this thread?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("forum_threads")
            .delete()
            .eq("id", id);
          if (error) Alert.alert("Error", "Failed to delete thread.");
          else {
            Alert.alert("Deleted", "Thread removed.");
            fetchThreads();
          }
        },
      },
    ]);
  };

  const filteredThreads = threads.filter((thread) =>
    thread.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* 🔍 Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#555" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${selectedCategory.toLowerCase()} threads...`}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* 🧠 Category Tabs */}
      <View style={styles.tabRow}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.tab, selectedCategory === cat && styles.tabActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              style={[
                styles.tabText,
                selectedCategory === cat && styles.tabTextActive,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 💬 Threads */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <ActivityIndicator color="#0a84ff" style={{ marginTop: 20 }} />
        ) : filteredThreads.length === 0 ? (
          <Text style={styles.emptyText}>No threads yet.</Text>
        ) : (
          filteredThreads.map((thread) => (
            <TouchableOpacity
              key={thread.id}
              style={styles.threadCard}
              onPress={() =>
                router.push({
                  pathname: "/(dashboard)/thread",
                  params: { threadId: thread.id },
                })
              }
            >
              <View style={styles.threadHeader}>
                <View style={styles.avatar}>
                  {thread.profiles?.avatar_url ? (
                    <Image
                      source={{ uri: thread.profiles.avatar_url }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Ionicons name="person" size={20} color="#666" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.threadTitle}>{thread.title}</Text>
                  <Text style={styles.threadMeta}>
                    {thread.profiles?.username || "User"} ·{" "}
                    {new Date(thread.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleMenuPress(thread)}>
                  <Ionicons name="ellipsis-vertical" size={18} color="#888" />
                </TouchableOpacity>
              </View>
              <Text style={styles.threadContent} numberOfLines={2}>
                {thread.content}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* 📱 Android Menu */}
      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuModal}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                handleReport(selectedThread);
                setMenuVisible(false);
              }}
            >
              <Text style={styles.menuItemText}>Report Forum</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                handleSave(selectedThread);
                setMenuVisible(false);
              }}
            >
              <Text style={styles.menuItemText}>Save Forum</Text>
            </TouchableOpacity>
            {user?.id === selectedThread?.user_id && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  deleteThread(selectedThread.id);
                  setMenuVisible(false);
                }}
              >
                <Text style={[styles.menuItemText, { color: "red" }]}>
                  Delete Forum
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* ➕ Floating "New Thread" Button */}
      <TouchableOpacity
        style={[styles.newThreadButton, { bottom: insets.bottom + 20 }]}
        onPress={() =>
          router.push({
            pathname: "/(stack)/createThread",
            params: { category: selectedCategory },
          })
        }
      >
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={styles.newThreadText}>New Thread</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e6f4f9",
  },
  searchContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    margin: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "#fff",
    marginHorizontal: 6,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: "#0a84ff",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
  },
  tabTextActive: {
    color: "#fff",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  threadCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
  },
  threadHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EAF2F8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  threadTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1E21",
  },
  threadMeta: {
    fontSize: 13,
    color: "#777",
  },
  threadContent: {
    marginTop: 8,
    color: "#444",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 30,
    color: "#666",
  },
  newThreadButton: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    backgroundColor: "#0a84ff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  newThreadText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuModal: {
    backgroundColor: "#fff",
    borderRadius: 14,
    width: "80%",
    paddingVertical: 10,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  menuItemText: {
    fontSize: 16,
    color: "#333",
  },
});
