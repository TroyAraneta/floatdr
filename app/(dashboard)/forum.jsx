import { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  View,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Image,
  ActionSheetIOS,
  Platform,
  Modal,
  Pressable,
  Text,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import ThemedText from "../../components/ThemedText";

const Forum = () => {
  const [threads, setThreads] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("Mind");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedThread, setSelectedThread] = useState(null);

  const fixedCategories = ["Mind", "Body", "Spirit"];
  const router = useRouter();

  // 🧍‍♂️ Check user authentication
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        Alert.alert("Access denied", "Only members can use the forum.");
        router.push("/(auth)/login");
      } else {
        setUser(data.user);
      }
    };
    checkUser();
  }, []);

  // 🧠 Fetch threads
  const fetchThreads = async () => {
    try {
      setLoading(true);
      const { data: categoryData } = await supabase
        .from("forum_categories")
        .select("id")
        .eq("name", selectedCategory)
        .single();

      if (!categoryData) throw new Error("Category not found.");

      const { data, error } = await supabase
        .from("forum_threads")
        .select(`
          id,
          title,
          content,
          created_at,
          image_url,
          user_id,
          profiles ( username, avatar_url )
        `)
        .eq("category_id", categoryData.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setThreads(data || []);
    } catch (err) {
      console.error("Error loading threads:", err.message);
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
          destructiveButtonIndex: user?.id === thread.user_id ? 3 : undefined,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleReport(thread);
          else if (buttonIndex === 2) handleSave(thread);
          else if (buttonIndex === 3 && user?.id === thread.user_id)
            deleteThread(thread.id);
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

  const filteredThreads = threads.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* 🔍 Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#555" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search topics..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* 🌊 Category Tabs */}
      <View style={styles.tabRow}>
        {fixedCategories.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setSelectedCategory(cat)}
            style={[
              styles.tab,
              selectedCategory === cat && styles.tabActive,
            ]}
          >
            <ThemedText
              style={[
                styles.tabText,
                selectedCategory === cat && styles.tabTextActive,
              ]}
            >
              {cat}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* 💬 Threads */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading && <ActivityIndicator color="#0a84ff" style={{ marginTop: 20 }} />}
        {!loading && filteredThreads.length === 0 && (
          <ThemedText style={styles.emptyText}>No threads yet.</ThemedText>
        )}

        {filteredThreads.map((thread) => (
          <TouchableOpacity
            key={thread.id}
            style={styles.threadCard}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/(dashboard)/thread",
                params: { threadId: thread.id },
              })
            }
          >
            <View style={styles.threadHeader}>
              {thread.profiles?.avatar_url ? (
                <Image
                  source={{ uri: thread.profiles.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.defaultAvatar}>
                  <Ionicons name="person" size={20} color="#666" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.threadTitle}>{thread.title}</ThemedText>
                <ThemedText style={styles.threadMeta}>
                  {thread.profiles?.username || "User"} ·{" "}
                  {new Date(thread.created_at).toLocaleDateString()}
                </ThemedText>
              </View>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => handleMenuPress(thread)}
              >
                <Ionicons name="ellipsis-vertical" size={18} color="#999" />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.threadPreview} numberOfLines={2}>
              {thread.content}
            </ThemedText>

            {/* 🖼️ Display thread image if available */}
            {thread.image_url && (
              <Image
                source={{ uri: thread.image_url }}
                style={styles.threadImage}
                resizeMode="cover"
              />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 📱 Android Modal Menu */}
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

      {/* ➕ Floating Button */}
      <TouchableOpacity
        style={styles.newThreadBtn}
        onPress={async () => {
          const { data } = await supabase.auth.getUser();
          if (data?.user) {
            router.push({
              pathname: "/(stack)/createThread",
              params: { category: selectedCategory },
            });
          } else {
            Alert.alert("Login required", "Only members can post threads.");
          }
        }}
      >
        <Ionicons name="add" size={22} color="#fff" />
        <ThemedText style={styles.newThreadText}>New Thread</ThemedText>
      </TouchableOpacity>
    </View>
  );
};

export default Forum;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e6f4f9",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 14,
    marginHorizontal: 20,
  },
  tab: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  tabActive: {
    backgroundColor: "#0a84ff",
  },
  tabText: {
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  threadCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  threadHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  defaultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EAF2F8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  threadTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1E21",
  },
  threadMeta: {
    fontSize: 13,
    color: "#777",
    marginTop: 2,
  },
  threadPreview: {
    fontSize: 14,
    color: "#444",
    marginTop: 10,
  },
  threadImage: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginTop: 10,
  },
  menuButton: {
    padding: 6,
  },
  emptyText: {
    textAlign: "center",
    color: "#777",
    marginTop: 30,
  },
  newThreadBtn: {
    position: "absolute",
    bottom: 25,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0a84ff",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  newThreadText: {
    color: "#fff",
    marginLeft: 6,
    fontSize: 15,
    fontWeight: "600",
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
