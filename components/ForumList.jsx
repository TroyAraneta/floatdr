import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
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
import useMembershipStatus from "../hooks/useMembershipStatus"; // membership gate

export default function ForumList({ category: initialCategory }) {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedThread, setSelectedThread] = useState(null);
  const [user, setUser] = useState(null);

  // Membership gate + error state
  const { isMember, loading: membershipLoading, error: membershipError, refresh: refreshMembership } =
    useMembershipStatus();
  const [loadError, setLoadError] = useState(null);
  const [blockedByMembership, setBlockedByMembership] = useState(false);

  const router = useRouter();
  const insets = useSafeAreaInsets();

  // If you want these to be display labels, keep as-is.
  // But we will use slugs consistently for queries.
  const categories = ["Mind", "Body", "Spirit"];

  const isMountedRef = useRef(true);
  const fetchIdRef = useRef(0);

  // Cache category ids by slug (preferred) or name fallback
  const categoryIdMapRef = useRef({});

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // -------------------------
  // Auth
  // -------------------------
  useEffect(() => {
    let active = true;

    const syncUserFromSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active || !isMountedRef.current) return;
      setUser(data?.session?.user ?? null);
    };

    syncUserFromSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active || !isMountedRef.current) return;
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  // -------------------------
  // Helpers
  // -------------------------
  const toCategorySlug = useCallback((label) => {
    // Convert "Mind" -> "mind"
    // If your DB slug is different, update here.
    return String(label || "").trim().toLowerCase();
  }, []);

  const isPermissionDenied = (err) => {
    const msg = (err?.message || "").toLowerCase();
    return msg.includes("permission denied") || msg.includes("rls");
  };

  // -------------------------
  // Fetch Threads (Safe + Optimized)
  // -------------------------
  const fetchThreads = useCallback(async () => {
    const currentFetchId = ++fetchIdRef.current;
    setLoading(true);
    setLoadError(null);

    // If membership is still loading, defer fetch to avoid flicker
    if (membershipLoading) {
      setLoading(false);
      return;
    }

    // If not a member, don't even attempt the query.
    if (!isMember) {
      setThreads([]);
      setBlockedByMembership(true);
      setLoading(false);
      return;
    }

    setBlockedByMembership(false);

    try {
      const categorySlug = toCategorySlug(selectedCategory);
      let categoryId = categoryIdMapRef.current[categorySlug];

      // Cache category id to avoid duplicate queries
      if (!categoryId) {
        // Prefer slug lookup (your DB has slug + name)
        const { data: cat, error } = await supabase
          .from("forum_categories")
          .select("id, slug, name")
          .eq("slug", categorySlug)
          .maybeSingle();

        // Fallback: some older rows might have name only
        if ((!cat || error) && !isPermissionDenied(error)) {
          const fallback = await supabase
            .from("forum_categories")
            .select("id, slug, name")
            .eq("name", selectedCategory)
            .maybeSingle();

          if (fallback.error) throw fallback.error;
          if (!fallback.data) {
            // No category row found; treat as empty
            if (isMountedRef.current && currentFetchId === fetchIdRef.current) {
              setThreads([]);
            }
            return;
          }

          categoryId = fallback.data.id;
        } else {
          if (error) throw error;
          if (!cat) {
            if (isMountedRef.current && currentFetchId === fetchIdRef.current) {
              setThreads([]);
            }
            return;
          }
          categoryId = cat.id;
        }

        categoryIdMapRef.current[categorySlug] = categoryId;
      }

      // Fix schema mismatches: body + author_id
      const { data, error } = await supabase
        .from("forum_threads")
        .select(
          `
          id,
          title,
          body,
          image_url,
          created_at,
          author_id,
          profiles:author_id ( username, avatar_url )
        `
        )
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Prevent race condition
      if (isMountedRef.current && currentFetchId === fetchIdRef.current) {
        setThreads(data || []);
      }
    } catch (err) {
      console.error("Fetch Threads Error:", err);

      if (isPermissionDenied(err)) {
        // With members-only forum, permission errors should show the member gate.
        setBlockedByMembership(true);
        setThreads([]);
      }

      if (isMountedRef.current) {
        setLoadError(err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [selectedCategory, isMember, membershipLoading, toCategorySlug]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // -------------------------
  // Pull to Refresh
  // -------------------------
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshMembership?.();
    await fetchThreads();
    setRefreshing(false);
  }, [fetchThreads, refreshMembership]);

  // -------------------------
  // Menu Actions
  // -------------------------
  const handleMenuPress = (thread) => {
    setSelectedThread(thread);

    // NOTE: we now use author_id instead of user_id
    const isOwner = user?.id === thread.author_id;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            "Cancel",
            "Report Forum",
            "Save Forum",
            ...(isOwner ? ["Delete Forum"] : []),
          ],
          cancelButtonIndex: 0,
          destructiveButtonIndex: isOwner ? 3 : undefined,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) handleReport(thread);
          else if (buttonIndex === 2) handleSave(thread);
          else if (buttonIndex === 3 && isOwner) await deleteThread(thread.id);
        }
      );
    } else {
      setMenuVisible(true);
    }
  };

  const handleReport = (thread) => {
    if (!thread?.id) {
      Alert.alert("Unable to report", "This post is missing required information.");
      return;
    }

    if (!user?.id) {
      Alert.alert("Login required", "Please log in to report this post.");
      return;
    }

    setMenuVisible(false);
    router.push({
      pathname: "/(stack)/reportThread",
      params: {
        threadId: thread.id,
        threadTitle: thread.title || "",
      },
    });
  };

  const handleSave = (thread) => {
    Alert.alert("Save", `Saving will be available soon.\n\nThread: "${thread.title}"`);
  };

  // -------------------------
  // Optimistic Delete
  // -------------------------
  const deleteThread = async (id) => {
    Alert.alert("Confirm", "Delete this thread?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const previousThreads = threads;

          // Optimistic UI update
          setThreads((prev) => prev.filter((thread) => thread.id !== id));

          const { error } = await supabase.from("forum_threads").delete().eq("id", id);

          if (error) {
            console.error("Delete thread error:", error);
            Alert.alert("Error", "Failed to delete thread.");
            setThreads(previousThreads); // rollback
          } else {
            Alert.alert("Deleted", "Thread removed.");
          }
        },
      },
    ]);
  };

  // -------------------------
  // Memoized Filtering
  // -------------------------
  const filteredThreads = useMemo(() => {
    if (!search.trim()) return threads;

    return threads.filter((thread) => thread.title.toLowerCase().includes(search.toLowerCase()));
  }, [threads, search]);

  // -------------------------
  // Render Thread Item
  // -------------------------
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.threadCard}
      onPress={() =>
        router.push({
          pathname: "/(dashboard)/thread",
          params: { threadId: item.id },
        })
      }
    >
      <View style={styles.threadHeader}>
        <View style={styles.avatar}>
          {item.profiles?.avatar_url ? (
            <Image source={{ uri: item.profiles.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={20} color="#666" />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.threadTitle}>{item.title}</Text>
          <Text style={styles.threadMeta}>
            {item.profiles?.username || "User"} · {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>

        <TouchableOpacity onPress={() => handleMenuPress(item)}>
          <Ionicons name="ellipsis-vertical" size={18} color="#888" />
        </TouchableOpacity>
      </View>

      <Text style={styles.threadContent} numberOfLines={2}>
        {item.body}
      </Text>
    </TouchableOpacity>
  );

  // -------------------------
  // Members-only gate UI (minimal + clear)
  // -------------------------
  const showMemberGate = blockedByMembership || (!membershipLoading && !isMember);

  // -------------------------
  // UI
  // -------------------------
  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#555" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${selectedCategory.toLowerCase()} threads...`}
          value={search}
          onChangeText={setSearch}
          editable={!showMemberGate} // avoid confusing UX
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.tab, selectedCategory === cat && styles.tabActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.tabText, selectedCategory === cat && styles.tabTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Membership loading */}
      {membershipLoading ? (
        <ActivityIndicator color="#0a84ff" style={{ marginTop: 20 }} />
      ) : showMemberGate ? (
        <View style={styles.gateBox}>
          <Ionicons name="lock-closed" size={24} color="#666" />
          <Text style={styles.gateTitle}>Members-only forum</Text>
          <Text style={styles.gateText}>
            You need an active membership to view and post in the forum.
          </Text>

          {!!membershipError && (
            <Text style={styles.gateTextMuted}>
              (We couldn’t verify your membership just now. Check your connection.)
            </Text>
          )}

          <TouchableOpacity
            style={styles.gateButton}
            onPress={() => router.push("/subscription")} // adjust route to your modal/screen
          >
            <Text style={styles.gateButtonText}>View Membership</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={16} color="#0a84ff" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <ActivityIndicator color="#0a84ff" style={{ marginTop: 20 }} />
      ) : loadError ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={22} color="#666" />
          <Text style={styles.errorTitle}>Couldn’t load threads</Text>
          <Text style={styles.errorText}>Check your connection and try again.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={16} color="#0a84ff" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredThreads}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 100,
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>No threads yet.</Text>}
        />
      )}

      {/* Android Modal (unchanged behavior) */}
      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
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

            {user?.id === selectedThread?.author_id && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  deleteThread(selectedThread.id);
                  setMenuVisible(false);
                }}
              >
                <Text style={[styles.menuItemText, { color: "red" }]}>Delete Forum</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Floating Button */}
      <TouchableOpacity
        style={[styles.newThreadButton, { bottom: insets.bottom + 20 }]}
        onPress={() =>
          router.push({
            pathname: "/createThread",
            params: { slug: toCategorySlug(selectedCategory) },
          })
        }
        disabled={showMemberGate}
      >
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={styles.newThreadText}>New Thread</Text>
      </TouchableOpacity>
    </View>
  );
}

/* NOTE:
  Your original file didn't include styles here (cut off in paste).
  Keep your existing styles as-is, and ADD the below styles only if missing.
*/
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Keep your existing styles (searchContainer, searchInput, tabRow, etc.)
  // Add these new ones for gate/error UI:

  gateBox: {
    marginTop: 24,
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
  },
  gateTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
  },
  gateText: {
    marginTop: 8,
    fontSize: 13,
    color: "#444",
    textAlign: "center",
  },
  gateTextMuted: {
    marginTop: 6,
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  gateButton: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#0a84ff",
  },
  gateButtonText: { color: "#fff", fontWeight: "700" },

  errorBox: {
    marginTop: 24,
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
  },
  errorTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    color: "#444",
    textAlign: "center",
  },

  retryButton: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  retryText: {
    marginLeft: 6,
    fontSize: 13,
    color: "#0a84ff",
    fontWeight: "600",
  },
});
