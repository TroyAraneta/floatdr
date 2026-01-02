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
  Modal,
  Pressable,
  Text,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import ThemedText from "../../components/ThemedText";
import useMembershipStatus from "../../hooks/useMembershipStatus";

export default function Forum() {
  const router = useRouter();

  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [imageRatios, setImageRatios] = useState({}); 
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [menuThread, setMenuThread] = useState(null); 
  const [userId, setUserId] = useState(null);

  const { isMember, loading: membershipLoading } = useMembershipStatus();

  const categories = [
    { name: "Mind", slug: "mind" },
    { name: "Body", slug: "body" },
    { name: "Spirit", slug: "spirit" },
  ];

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id || null);
    });
  }, []);

  const [selectedCategory, setSelectedCategory] = useState(categories[0]);

  /* -------------------------------------------------- */
  /* Fetch Threads                                      */
  /* -------------------------------------------------- */
  const fetchThreads = async () => {
    try {
      setLoading(true);

      if (!selectedCategory?.slug) {
        console.warn("No category selected");
        return;
      }

      const { data: category, error: categoryError } = await supabase
        .from("forum_categories")
        .select("id")
        .eq("slug", selectedCategory.slug)
        .single();

      if (categoryError || !category) {
        console.error("Category not found:", selectedCategory.slug);
        return;
      }

      const { data, error } = await supabase
      .from("forum_threads")
      .select(`
        id,
        title,
        body,
        created_at,
        image_url,
        author_id,
        profiles (
          username,
          avatar_url
        )
      `)
      .eq("category_id", category.id)
      .order("created_at", { ascending: false });


      if (error) throw error;
      setThreads(data || []);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };


  /* -------------------------------------------------- */
  /* Membership Gate                                    */
  /* -------------------------------------------------- */
  useFocusEffect(
    useCallback(() => {
      if (!membershipLoading && !isMember) {
        setShowMemberModal(true);
      }
    }, [membershipLoading, isMember])
  );

  /* -------------------------------------------------- */
  /* Load Threads                                       */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (!membershipLoading && isMember) {
      fetchThreads();
    }
  }, [selectedCategory, membershipLoading, isMember]);

  /* -------------------------------------------------- */
  /* Pull To Refresh                                    */
  /* -------------------------------------------------- */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchThreads();
    setRefreshing(false);
  }, [selectedCategory]);

  /* -------------------------------------------------- */
  /* Filter                                             */
  /* -------------------------------------------------- */
  const filteredThreads = threads.filter(thread =>
    thread.title
      .toLowerCase()
      .includes((search || "").toLowerCase())
  );


  /* -------------------------------------------------- */
  /* Render                                             */
  /* -------------------------------------------------- */
  if (membershipLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  // -------------------------------------------------- //
  // Save Thread                                       //
  // -------------------------------------------------- //
  const handleSaveThread = async (thread) => {
    if (!thread || !userId) return;

    const { error } = await supabase
      .from("saved_threads") 
      .insert({
        user_id: userId,    
        thread_id: thread.id,
      });

    if (error) {
      Alert.alert("Already saved or error occurred");
      console.error(error);
    } else {
      Alert.alert("Thread saved");
    }

    setMenuThread(null); // close menu
  };

  // -------------------------------------------------- //
  // Delete Thread                                     //
  // -------------------------------------------------- //
  const handleDeleteThread = async (thread) => {
    Alert.alert(
      "Delete thread?",
      "This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("forum_threads")
              .delete()
              .eq("id", thread.id)
              .eq("author_id", userId);

            if (error) {
              Alert.alert("Failed to delete");
              console.error(error);
            } else {
              setThreads((prev) =>
                prev.filter((t) => t.id !== thread.id)
              );
            }

            setMenuThread(null);
          },
        },
      ]
    );
  };

  // -------------------------------------------------- // 
  // Report Thread                                     //
  // -------------------------------------------------- //
  const handleReportThread = async (thread) => {
    await supabase.from("moderation_reports").insert({
      thread_id: thread.id,
      reporter_id: userId,
      reason: "Inappropriate content",
    });

    if (error) {
      console.error(error);
      Alert.alert("Failed to report");
    } else {
      Alert.alert("Reported");
    }
    setMenuThread(null);
  };



  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#666" />
        <TextInput
          placeholder="Search threads..."
          style={styles.searchInput}
          onChangeText={setSearch}
        />
      </View>

      {/* Categories */}
      <View style={styles.tabs}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.slug}
            style={[
              styles.tab,
              selectedCategory === cat && styles.tabActive,
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <ThemedText
              style={[
                styles.tabText,
                selectedCategory === cat && styles.tabTextActive,
              ]}
            >
              {cat.name}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Threads */}
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {loading && <ActivityIndicator style={{ marginTop: 30 }} />}

        {!loading && filteredThreads.length === 0 && (
          <ThemedText style={styles.emptyText}>
            No threads yet.
          </ThemedText>
        )}

        {filteredThreads.map((thread) => (
          <TouchableOpacity
            key={thread.id}
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: "/forum/thread",
                params: { id: thread.id },
              })
            }
          >
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
                <ThemedText style={styles.title}>{thread.title}</ThemedText>
                <ThemedText style={styles.meta}>
                  {thread.profiles?.username || "User"} ·{" "}
                  {new Date(thread.created_at).toLocaleDateString()}
                </ThemedText>
              </View>

              <TouchableOpacity
                onPress={() => setMenuThread(thread)}
                style={styles.menuButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="ellipsis-vertical" size={20} color="#666" />
              </TouchableOpacity>

            </View>

            <ThemedText
              numberOfLines={thread.image_url ? 2 : 4}
              style={styles.preview}
            >
              {thread.body}
            </ThemedText>



            {thread.image_url && (
            <Image
              source={{ uri: thread.image_url }} // image URL from Supabase
              style={[
                styles.image, // base style
                {
                  height:
                    imageRatios[thread.id] && imageRatios[thread.id] < 1
                      ? 300 // portrait → taller
                      : 180, // landscape → normal
                },
              ]}
              resizeMode="contain" // NEVER crop forum images
              onLoad={(e) => {
                const { width, height } = e.nativeEvent.source;
                setImageRatios((prev) => ({
                  ...prev,
                  [thread.id]: width / height, // store ratio per thread
                }));
              }}
            />
          )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* New Thread */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          router.push({
            pathname: "/(stack)/createThread",
            params: { slug: selectedCategory.slug },
          })
        }
      >
        <Ionicons name="add" size={22} color="#fff" />
        <ThemedText style={styles.fabText}>New Thread</ThemedText>
      </TouchableOpacity>

      {/* Member Modal */}
      <Modal transparent visible={showMemberModal} animationType="fade">
        <Pressable style={styles.overlay}>
          <View style={styles.modal}>
            <Ionicons name="lock-closed" size={36} color="#0a84ff" />
            <ThemedText style={styles.modalTitle}>
              Members Only
            </ThemedText>
            <ThemedText style={styles.modalText}>
              Forum access is limited to members.
            </ThemedText>

            <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.secondaryBtn]}
              onPress={() => {
                setShowMemberModal(false);
                router.back();
              }}
            >
              <ThemedText style={styles.secondaryText}>
                Go Back
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => {
                setShowMemberModal(false);
                router.replace("/(dashboard)/menu");
              }}
            >
              <ThemedText style={{ color: "#fff" }}>
                Go to Menu
              </ThemedText>
            </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
      <Modal transparent visible={!!menuThread} animationType="fade">
        <Pressable
          style={styles.overlay}
          onPress={() => setMenuThread(null)} // tap outside to close
        >
          <View style={styles.menuModal}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleSaveThread(menuThread)}
            >
              <Ionicons name="bookmark-outline" size={18} />
              <Text style={styles.menuText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { handleReportThread(menuThread); }}
            >
              <Ionicons name="flag-outline" size={18} />
              <Text style={styles.menuText}>Report</Text>
            </TouchableOpacity>

            {menuThread?.author_id === userId && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleDeleteThread(menuThread)}
              >
                <Ionicons name="trash-outline" size={18} color="red" />
                <Text style={[styles.menuText, { color: "red" }]}>Delete</Text>
              </TouchableOpacity>
            )}
            
          </View>
        </Pressable>
      </Modal>

    </View>
  );
}

/* -------------------------------------------------- */
/* Styles                                              */
/* -------------------------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#e6f4f9" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 16,
    padding: 12,
    borderRadius: 12,
  },
  searchInput: { marginLeft: 8, flex: 1 },

  tabs: { flexDirection: "row", justifyContent: "space-around" },
  tab: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    width: "30%",
    alignItems: "center",
  },
  tabActive: { backgroundColor: "#0a84ff" },
  tabText: { color: "#555" },
  tabTextActive: { color: "#fff", fontWeight: "600" },

  card: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 16,
  },
  header: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  title: { fontSize: 16, fontWeight: "600" },
  meta: { fontSize: 12, color: "#777" },
  preview: { marginTop: 10, color: "#555" },
  image: {
    width: "100%", // fill card width
    borderRadius: 10,
    marginTop: 10,
    backgroundColor: "#f4f8fa", // helps portrait images visually
  },


  fab: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    backgroundColor: "#0a84ff",
    flexDirection: "row",
    padding: 14,
    borderRadius: 30,
  },
  fabText: { color: "#fff", marginLeft: 6 },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginTop: 10 },
  modalText: { textAlign: "center", marginTop: 8 },
  modalBtn: {
    marginTop: 20,
    backgroundColor: "#0a84ff",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  emptyText: { textAlign: "center", marginTop: 40, color: "#777" },
  modalActions: {
  flexDirection: "row",
  gap: 12,
  marginTop: 20,
  },

  secondaryBtn: {
    backgroundColor: "#f1f1f1",
  },

  secondaryText: {
    color: "#333",
    fontWeight: "600",
  },
  menuModal: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 8,
    width: 200,
    elevation: 5, // Android shadow
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  menuText: {
    marginLeft: 12,
    fontSize: 15,
  },

  menuButton: {
    padding: 6,
    borderRadius: 20,
  },
});
