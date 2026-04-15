import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  StyleSheet,
  FlatList,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  Animated,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { supabase } from "../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";
import ThemedTextInput from "../../components/ThemedTextInput";
import ThemedCard from "../../components/ThemedCard";
import ThemedButton from "../../components/ThemedButton";
import SubscriptionModal from "../../components/SubscriptionModal";
import { Colors } from "../../constants/colors";
import { useMembership } from "../../contexts/MembershipContext";
import { useTheme } from "../../contexts/ThemeContext";

export default function Forum() {
  const REQUEST_TIMEOUT_MS = 30000;
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [imageRatios, setImageRatios] = useState({});
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [menuThread, setMenuThread] = useState(null);
  const [menuThreadPosition, setMenuThreadPosition] = useState({ x: 0, y: 0 });
  const [profileMenuThread, setProfileMenuThread] = useState(null);
  const [profileMenuPosition, setProfileMenuPosition] = useState({ x: 0, y: 0 });
  const [userId, setUserId] = useState(null);
  const [threadReactions, setThreadReactions] = useState([]);

  const scales = useRef({}).current;
  const avatarRefs = useRef({}).current;
  const menuButtonRefs = useRef({}).current;
  const listAnim = useRef(new Animated.Value(0)).current;
  const loadingMoreRef = useRef(false);
  const reqIdRef = useRef(0);

  const withTimeout = (promise, ms = REQUEST_TIMEOUT_MS) => {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out")), ms)
      ),
    ]);
  };
  const isPermissionDenied = (err) => {
    const msg = (err?.message || "").toLowerCase();
    return msg.includes("permission denied") || msg.includes("rls");
  };

  const { isMember, loading: membershipLoading } = useMembership();

  // PAGINATION
  const PAGE_SIZE = 15;
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState(null);

  const categories = useMemo(
    () => [
      { name: "Mind", slug: "mind" },
      { name: "Body", slug: "body" },
      { name: "Spirit", slug: "spirit" },
    ],
    []
  );
  const requestedSlug = (
    Array.isArray(params.slug) ? params.slug[0] : params.slug || ""
  )
    .toString()
    .trim()
    .toLowerCase();
  const matchedCategory = useMemo(
    () => categories.find((item) => item.slug === requestedSlug) || categories[0],
    [categories, requestedSlug]
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id || null);
    });
  }, []);

  const [selectedCategory, setSelectedCategory] = useState(matchedCategory);

  useEffect(() => {
    setSelectedCategory(matchedCategory);
  }, [matchedCategory]);

  // Dynamic FAB placement:
  // Prefer actual tab-bar height and fallback when unavailable in context.
  let tabBarHeight = 64 + insets.bottom;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch (_error) {
    // Fallback keeps placement stable if hook can't resolve tab bar height.
  }
  const FAB_HEIGHT = 48;
  const FAB_GAP = 18; // target ~16-20px above tab bar
  const tabBarBaseline = 60 + insets.bottom;
  const fabBottom = FAB_GAP + Math.max(0, tabBarHeight - tabBarBaseline);
  const listBottomPadding = FAB_HEIGHT + fabBottom + insets.bottom + 16;

  const dedupeById = useCallback((items) => {
    const seen = new Set();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, []);

  const mergeUnique = useCallback((prev, next, keyFn) => {
    const seen = new Set(prev.map(keyFn));
    const merged = [...prev];
    next.forEach((item) => {
      const key = keyFn(item);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    });
    return merged;
  }, []);

  // REACTIONS PER PAGE
  const fetchReactionsForThreadIds = useCallback(async (threadIds) => {
    if (!threadIds || threadIds.length === 0) return [];
    const { data: reactionsData } = await supabase
      .from("thread_reactions")
      .select("thread_id, user_id, type")
      .in("thread_id", threadIds);
    return reactionsData || [];
  }, []);

  const formatThreadsFromRpc = useCallback((rows) => {
    return (rows || []).map((row) => ({
      id: row.thread_id,
      title: row.title,
      body: row.body,
      image_url: row.image_url,
      created_at: row.created_at,
      author_id: row.author_id,
      // Backend RPC should return reply_count for each thread.
      reply_count: Number(row.reply_count ?? 0),
      profiles: {
        username: row.author_username,
        avatar_url: row.author_avatar_url,
      },
      top_comment: row.top_comment_id
        ? {
            id: row.top_comment_id,
            body: row.top_comment_body,
            created_at: row.top_comment_created_at,
            author_id: row.top_comment_author_id,
            likes: row.top_comment_likes,
            profiles: {
              username: row.top_comment_author_username,
              avatar_url: row.top_comment_author_avatar_url,
            },
          }
        : null,
    }));
  }, []);

  // FETCH FIRST PAGE
  const fetchFirstPage = useCallback(async () => {
    const myReqId = ++reqIdRef.current;

    try {
      setLoading(true);
      setThreads([]);
      setThreadReactions([]);
      setCursor(null);
      setHasMore(true);

      // Expected RPC params: page_size, cursor_created_at, cursor_thread_id
      const { data, error } = await withTimeout(
        supabase.rpc("get_threads_with_top_comment", {
          category_slug: selectedCategory.slug,
          page_size: PAGE_SIZE,
          cursor_created_at: null,
          cursor_thread_id: null,
        }),
        12000
      );

      // If a newer request started, ignore this result
      if (myReqId !== reqIdRef.current) return;

      if (error) throw error;

      const formatted = formatThreadsFromRpc(data);
      setThreads(formatted);
      const last = formatted[formatted.length - 1] || null;
      setCursor(
        last ? { created_at: last.created_at, thread_id: last.id } : null
      );
      setHasMore(formatted.length === PAGE_SIZE);

      listAnim.setValue(0);
      Animated.timing(listAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      const threadIds = formatted.map((t) => t.id);
      if (myReqId === reqIdRef.current) {
        setLoading(false);
      }

      fetchReactionsForThreadIds(threadIds)
        .then((reactions) => {
          if (myReqId === reqIdRef.current) {
            setThreadReactions(reactions);
          }
        })
        .catch((reactionError) => {
          console.error("Failed to load thread reactions:", reactionError);
        });
      return;
    } catch (err) {
      console.error(err);
      if (isPermissionDenied(err)) {
        setShowMemberModal(true);
        return;
      }
      Alert.alert(
        "Could not load threads",
        err?.message?.includes("timed out")
          ? "The request took too long. Please try again."
          : "Please check your connection and try again."
      );
    } finally {
      if (myReqId === reqIdRef.current) {
        setLoading(false);
      }
    }
  }, [selectedCategory, listAnim, formatThreadsFromRpc, fetchReactionsForThreadIds]);

  // FETCH NEXT PAGE
  const fetchNextPage = useCallback(async () => {
    if (loading) return;
    if (loadingMoreRef.current || loadingMore) return;
    if (!hasMore) return;
    if (threads.length === 0) return;
    if (!cursor) return;

    try {
      loadingMoreRef.current = true;
      setLoadingMore(true);

      // Expected RPC params: page_size, cursor_created_at, cursor_thread_id
      const { data, error } = await supabase.rpc(
        "get_threads_with_top_comment",
        {
          category_slug: selectedCategory.slug,
          page_size: PAGE_SIZE,
          cursor_created_at: cursor.created_at,
          cursor_thread_id: cursor.thread_id,
        }
      );
      if (error) throw error;

      const formatted = formatThreadsFromRpc(data);
      setThreads((prev) => dedupeById([...prev, ...formatted]));
      const last = formatted[formatted.length - 1] || null;
      if (last) {
        setCursor({ created_at: last.created_at, thread_id: last.id });
      }
      setHasMore(formatted.length === PAGE_SIZE);

      const threadIds = formatted.map((t) => t.id);
      const reactions = await fetchReactionsForThreadIds(threadIds);
      setThreadReactions((prev) =>
        mergeUnique(prev, reactions, (item) => `${item.thread_id}:${item.user_id}`)
      );
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [
    loading,
    loadingMore,
    hasMore,
    cursor,
    threads.length,
    dedupeById,
    mergeUnique,
    selectedCategory,
    formatThreadsFromRpc,
    fetchReactionsForThreadIds,
  ]);

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
      fetchFirstPage();
    }
  }, [fetchFirstPage, membershipLoading, isMember]);

  useEffect(() => {
    if (!membershipLoading && !isMember) {
      setThreads([]);
      setThreadReactions([]);
      setCursor(null);
      setHasMore(false);
      setLoading(false);
    }
  }, [membershipLoading, isMember]);

  /* -------------------------------------------------- */
  /* Pull To Refresh                                    */
  /* -------------------------------------------------- */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchFirstPage();
    } finally {
      setRefreshing(false);
    }
  }, [fetchFirstPage]);


  /* -------------------------------------------------- */
  /* Filter                                             */
  /* -------------------------------------------------- */
  // SEARCH DEBOUNCE
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  const filteredThreads = useMemo(() => {
    return threads.filter((thread) =>
      thread.title.toLowerCase().includes((debouncedSearch || "").toLowerCase())
    );
  }, [threads, debouncedSearch]);

  /* -------------------------------------------------- */
  /* Save Thread                                        */
  /* -------------------------------------------------- */
  const handleSaveThread = async (thread) => {
    if (!thread || !userId) return;

    const { error } = await supabase.from("saved_threads").insert({
      user_id: userId,
      thread_id: thread.id,
    });

    if (error) {
      Alert.alert("Already saved or error occurred");
      console.error(error);
    } else {
      Alert.alert("Thread saved");
    }

    setMenuThread(null);
  };

  /* -------------------------------------------------- */
  /* Delete Thread                                      */
  /* -------------------------------------------------- */
  const handleDeleteThread = async (thread) => {
    Alert.alert("Delete thread?", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.rpc("delete_forum_thread_cascade", {
            p_thread_id: thread.id,
          });

          if (error) {
            Alert.alert("Failed to delete");
            console.error(error);
          } else {
            setThreads((prev) => prev.filter((t) => t.id !== thread.id));
          }

          setMenuThread(null);
        },
      },
    ]);
  };

  /* -------------------------------------------------- */
  /* Report Thread                                      */
  /* -------------------------------------------------- */
  const handleReportThread = async (thread) => {
    if (!thread?.id) {
      Alert.alert("Unable to report", "This post is missing required information.");
      return;
    }

    if (!userId) {
      Alert.alert("Login required", "Please log in to report this post.");
      return;
    }

    router.push({
      pathname: "/(stack)/reportThread",
      params: {
        threadId: thread.id,
        threadTitle: thread.title || "",
      },
    });
    setMenuThread(null);
  };

  /* -------------------------------------------------- */
  /* Utility Functions                                  */
  /* -------------------------------------------------- */
  const timeAgo = (date) => {
    const diff = (Date.now() - new Date(date)) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const formatReplyCount = useCallback((count) => {
    const safeCount = Number.isFinite(Number(count)) ? Number(count) : 0;
    if (safeCount === 1) return "1 reply";
    return `${safeCount} replies`;
  }, []);

  const reactionMap = useMemo(() => {
    const map = {};

    threadReactions.forEach((r) => {
      if (!map[r.thread_id]) {
        map[r.thread_id] = { like: 0, dislike: 0, userReaction: null };
      }

      map[r.thread_id][r.type] += 1;

      if (r.user_id === userId) {
        map[r.thread_id].userReaction = r.type;
      }
    });

    return map;
  }, [threadReactions, userId]);

  const animateLike = (threadId) => {
    if (!scales[threadId]) scales[threadId] = new Animated.Value(1);
    Animated.sequence([
      Animated.timing(scales[threadId], {
        toValue: 1.25,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(scales[threadId], {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleReact = async (threadId, type, e) => {
    if (e) {
      e.stopPropagation?.();
      e.preventDefault?.();
    }

    if (!userId) {
      Alert.alert("Please log in to react");
      return;
    }

    const current = reactionMap[threadId]?.userReaction;
    const previousReactions = threadReactions;

    setThreadReactions((prev) => {
      let updated = [...prev];

      updated = updated.filter(
        (r) => !(r.thread_id === threadId && r.user_id === userId)
      );

      if (current !== type) {
        updated.push({
          thread_id: threadId,
          user_id: userId,
          type,
        });
      }

      return updated;
    });

    try {
      if (current === type) {
        const { error } = await supabase
          .from("thread_reactions")
          .delete()
          .eq("thread_id", threadId)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("thread_reactions")
          .upsert({ thread_id: threadId, user_id: userId, type });
        if (error) throw error;

        if (type === "like") animateLike(threadId);
      }
    } catch (error) {
      setThreadReactions(previousReactions);
      console.error(error);
      Alert.alert(
        "Reaction failed",
        "We couldn't save your reaction. Please try again."
      );
    }
  };

  const renderThread = useCallback(
    (thread) => {
      const translateY = listAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [8, 0],
      });

      const opacity = listAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      });

      const counts = reactionMap[thread.id] || {
        like: 0,
        dislike: 0,
        userReaction: null,
      };
      const userReaction = counts.userReaction;

      return (
        <Animated.View
          style={{
            opacity,
            transform: [{ translateY }],
          }}
        >
          <Pressable
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: theme.surface },
              pressed && styles.cardPressed,
            ]}
            onPress={() =>
              router.push({
                pathname: "/forum/thread",
                params: { id: thread.id },
              })
            }
          >
            <View style={styles.header}>
              <TouchableOpacity
                ref={(ref) => {
                  if (ref) avatarRefs[thread.id] = ref;
                }}
                onPress={(e) => {
                  e?.stopPropagation?.();
                  const ref = avatarRefs[thread.id];
                  if (ref) {
                    ref.measureInWindow((x, y, width, height) => {
                      setProfileMenuPosition({ x: x, y: y + height + 2 });
                      setProfileMenuThread(thread);
                    });
                  } else {
                    setProfileMenuThread(thread);
                  }
                }}
                style={styles.avatarContainer}
              >
                <Image
                  source={{
                    uri:
                      thread.profiles?.avatar_url ||
                      "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                  }}
                  style={styles.avatar}
                />
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <ThemedText style={styles.title}>{thread.title}</ThemedText>
                <ThemedText style={styles.meta} muted>
                  {`${thread.profiles?.username || "User"} - ${new Date(
                    thread.created_at
                  ).toLocaleDateString()} - ${formatReplyCount(thread.reply_count)}`}
                </ThemedText>
              </View>

              <TouchableOpacity
                ref={(ref) => {
                  if (ref) menuButtonRefs[thread.id] = ref;
                }}
                onPress={(e) => {
                  e?.stopPropagation?.();
                  const ref = menuButtonRefs[thread.id];
                  if (ref) {
                    ref.measureInWindow((x, y, width, height) => {
                      setMenuThreadPosition({
                        x: x + width,
                        y: y + height + 2,
                      });
                      setMenuThread(thread);
                    });
                  } else {
                    setMenuThread(thread);
                  }
                }}
                style={styles.menuButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={20}
                  color={theme.iconMuted}
                />
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
                source={{ uri: thread.image_url }}
                style={[
                  styles.image,
                  { backgroundColor: theme.uiBackground },
                  {
                    height:
                      imageRatios[thread.id] && imageRatios[thread.id] < 1
                        ? 300 // portrait - taller
                        : 180, // landscape - normal
                  },
                ]}
                resizeMode="contain"
                onLoad={(e) => {
                  const { width, height } = e.nativeEvent.source;
                  setImageRatios((prev) => ({
                    ...prev,
                    [thread.id]: width / height,
                  }));
                }}
              />
            )}

            {/* Reactions */}
            <View
              style={[
                styles.reactionsContainer,
                { borderTopColor: theme.uiBackground },
              ]}
            >
              <TouchableOpacity
                disabled={userReaction === "dislike"}
                onPress={(e) => handleReact(thread.id, "like", e)}
                style={styles.reactionButton}
              >
                <Animated.View
                  style={[
                    styles.reactBtn,
                    { backgroundColor: theme.uiBackground },
                    userReaction === "like" && {
                      backgroundColor: theme.surface,
                    },
                    { transform: [{ scale: scales[thread.id] || 1 }] },
                  ]}
                >
                  <Ionicons
                    name="heart"
                    size={16}
                    color={
                      userReaction === "like"
                        ? "#e6004c"
                        : theme.iconMuted
                    }
                    style={{ marginRight: 4 }}
                  />
                  <ThemedText
                    style={[
                      styles.reactionText,
                      userReaction === "like" && styles.reactedText,
                    ]}
                  >
                    {counts.like}
                  </ThemedText>
                </Animated.View>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={userReaction === "like"}
                onPress={(e) => handleReact(thread.id, "dislike", e)}
                style={styles.reactionButton}
              >
                <View
                  style={[
                    styles.reactBtn,
                    { backgroundColor: theme.uiBackground },
                    userReaction === "dislike" && {
                      backgroundColor: theme.surface,
                    },
                  ]}
                >
                  <Ionicons
                    name="heart-dislike"
                    size={16}
                    color={
                      userReaction === "dislike"
                        ? Colors.primary
                        : theme.iconMuted
                    }
                    style={{ marginRight: 4 }}
                  />
                  <ThemedText
                    style={[
                      styles.reactionText,
                      userReaction === "dislike" && styles.dislikedText,
                    ]}
                  >
                    {counts.dislike}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            </View>

            {/* Top Comment */}
            {thread.top_comment && (
              <View
                style={[
                  styles.commentContainer,
                  { borderTopColor: theme.uiBackground },
                ]}
              >
                <View style={styles.commentHeader}>
                  <Image
                    source={{
                      uri:
                        thread.top_comment.profiles?.avatar_url ||
                        "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                    }}
                    style={styles.commentAvatar}
                  />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.commentAuthor}>
                      {thread.top_comment.profiles?.username || "User"}
                    </ThemedText>
                    <ThemedText style={styles.commentTime} muted>
                      {timeAgo(thread.top_comment.created_at)}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.commentBody} numberOfLines={2}>
                  {thread.top_comment.body}
                </ThemedText>
              </View>
            )}
          </Pressable>
        </Animated.View>
      );
    },
    [
      listAnim,
      imageRatios,
      userId,
      theme,
      router,
      handleReact,
      reactionMap,
      scales,
      avatarRefs,
      menuButtonRefs,
      timeAgo,
      formatReplyCount,
    ]
  );

  /* -------------------------------------------------- */
  /* Render                                             */
  /* -------------------------------------------------- */
  if (membershipLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </ThemedView>
    );
  }

  if (!isMember) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <ThemedCard style={styles.modal}>
            <Ionicons name="lock-closed" size={36} color={Colors.primary} />
            <ThemedText style={styles.modalTitle} title>
              Members Only
            </ThemedText>
            <ThemedText style={styles.modalText} muted>
              Forum access is limited to members.
            </ThemedText>

            <View style={styles.modalActions}>
              <ThemedButton
                style={[styles.modalBtn, { backgroundColor: theme.uiBackground }]}
                onPress={() => router.back()}
              >
                <ThemedText style={styles.secondaryText}>Go Back</ThemedText>
              </ThemedButton>

              <ThemedButton
                style={styles.modalBtn}
                onPress={() => setShowSubscriptionModal(true)}
              >
                <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
                  Get Membership
                </ThemedText>
              </ThemedButton>
            </View>
          </ThemedCard>
        </View>

        <SubscriptionModal
          visible={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          onCloseToMemberGate={() => setShowSubscriptionModal(false)}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search */}
      <ThemedCard style={styles.searchBox}>
        <Ionicons name="search" size={18} color={theme.iconMuted} />
        <ThemedTextInput
          placeholder="Search threads..."
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
      </ThemedCard>

      {/* Categories */}
      <View style={styles.tabs}>
        {categories.map((cat) => {
          const isActive = selectedCategory?.slug === cat.slug;

          return (
            <TouchableOpacity
              key={cat.slug}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive ? theme.uiBackground : theme.surface,
                  borderColor: isActive ? theme.primary : theme.uiBackground,
                },
                isActive && styles.tabActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Category ${cat.name}`}
              accessibilityState={{ selected: isActive }}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  { color: isActive ? theme.primary : theme.textMuted },
                  isActive && styles.tabTextActive,
                ]}
              >
                {cat.name}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Threads */}
      <FlatList
        data={filteredThreads}
        keyExtractor={(item) => String(item.id)}
        refreshing={refreshing}
        onRefresh={onRefresh}
        // FLATLIST INFINITE SCROLL
        onEndReached={fetchNextPage}
        onEndReachedThreshold={0.6}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews
        contentContainerStyle={{ paddingBottom: listBottomPadding }}
        ListEmptyComponent={
          !loading && (
            <ThemedText style={styles.emptyText}>No threads yet.</ThemedText>
          )
        }
        ListHeaderComponent={
          loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 30 }} />
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
          ) : null
        }
        renderItem={({ item }) => renderThread(item)}
      />

      {/* New Thread FAB */}
      <TouchableOpacity
        onPress={() => {
          if (!isMember) {
            setShowMemberModal(true);
            return;
          }
          const route = `/createThread?slug=${selectedCategory.slug}`;
          console.log("[Forum FAB] onPress fired, navigating to:", route);
          router.push(route);
        }}
        style={[
          styles.fab,
          {
            backgroundColor: Colors.primary,
            bottom: fabBottom,
          },
        ]}
      >
        <Ionicons name="add" size={22} color="#fff" />
        <ThemedText style={styles.fabText}>New Thread</ThemedText>
      </TouchableOpacity>

      {/* Member Modal */}
      <Modal transparent visible={showMemberModal} animationType="fade">
        <Pressable style={styles.overlay}>
          <ThemedCard style={styles.modal}>
            <Ionicons name="lock-closed" size={36} color={Colors.primary} />
            <ThemedText style={styles.modalTitle} title>
              Members Only
            </ThemedText>
            <ThemedText style={styles.modalText} muted>
              Forum access is limited to members.
            </ThemedText>

            <View style={styles.modalActions}>
              <ThemedButton
                style={[styles.modalBtn, { backgroundColor: theme.uiBackground }]}
                onPress={() => {
                  setShowMemberModal(false);
                  router.back();
                }}
              >
                <ThemedText style={styles.secondaryText}>Go Back</ThemedText>
              </ThemedButton>

              <ThemedButton
                style={styles.modalBtn}
                onPress={() => {
                  setShowMemberModal(false);
                  setShowSubscriptionModal(true);
                }}
              >
                <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
                  Get Membership
                </ThemedText>
              </ThemedButton>
            </View>
          </ThemedCard>
        </Pressable>
      </Modal>

      {/* Thread Menu Dropdown */}
      {menuThread && (
        <Modal transparent visible={!!menuThread} animationType="fade">
          <Pressable
            style={styles.dropdownOverlay}
            onPress={() => {
              setMenuThread(null);
              setMenuThreadPosition({ x: 0, y: 0 });
            }}
          >
            <ThemedCard
              style={[
                styles.threadMenuDropdown,
                {
                  top: menuThreadPosition.y > 0 ? menuThreadPosition.y : 80,
                  right:
                    menuThreadPosition.x > 0
                      ? Dimensions.get("window").width - menuThreadPosition.x
                      : 16,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => handleSaveThread(menuThread)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="bookmark-outline"
                  size={18}
                  color={theme.icon}
                />
                <ThemedText style={styles.dropdownText}>Save</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  handleReportThread(menuThread);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="flag-outline" size={18} color={theme.icon} />
                <ThemedText style={styles.dropdownText}>Report</ThemedText>
              </TouchableOpacity>

              {menuThread?.author_id === userId && (
                <>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      router.push({
                        pathname: "/(stack)/editThread",
                        params: { threadId: menuThread.id },
                      });
                      setMenuThread(null);
                      setMenuThreadPosition({ x: 0, y: 0 });
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={18} color={theme.icon} />
                    <ThemedText style={styles.dropdownText}>Edit</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => handleDeleteThread(menuThread)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={Colors.warning}
                    />
                    <ThemedText style={[styles.dropdownText, { color: Colors.warning }]}>
                      Delete
                    </ThemedText>
                  </TouchableOpacity>
                </>
              )}
            </ThemedCard>
          </Pressable>
        </Modal>
      )}

      {/* Profile Menu Dropdown */}
      {profileMenuThread && (
        <Modal transparent visible={!!profileMenuThread} animationType="fade">
          <Pressable
            style={styles.dropdownOverlay}
            onPress={() => {
              setProfileMenuThread(null);
              setProfileMenuPosition({ x: 0, y: 0 });
            }}
          >
            <ThemedCard
              style={[
                styles.profileDropdown,
                {
                  top: profileMenuPosition.y > 0 ? profileMenuPosition.y : 80,
                  left: profileMenuPosition.x > 0 ? profileMenuPosition.x : 16,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  if (profileMenuThread?.author_id) {
                    router.push({
                      pathname: "/(stack)/userProfile",
                      params: { userId: profileMenuThread.author_id },
                    });
                  }
                  setProfileMenuThread(null);
                  setProfileMenuPosition({ x: 0, y: 0 });
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="person-outline" size={18} color={theme.icon} />
                <ThemedText style={styles.dropdownText}>View Profile</ThemedText>
              </TouchableOpacity>
            </ThemedCard>
          </Pressable>
        </Modal>
      )}

      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onCloseToMemberGate={() => setShowSubscriptionModal(false)}
      />

    </ThemedView>
  );
}

/* -------------------------------------------------- */
/* Styles                                              */
/* -------------------------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, overflow: "visible" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    padding: 12,
    paddingHorizontal: 12,
    paddingVertical: 8, // NEW: shorter
    borderRadius: 16,
  },
  searchInput: {
    marginLeft: 8,
    flex: 1,
    backgroundColor: "transparent",
  },

  tabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tab: {
    padding: 10,
    borderRadius: 10,
    width: "30%",
    alignItems: "center",
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: "500" },
  tabTextActive: { color: "#fff", fontWeight: "600" },

  card: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.995 }],
  },
  header: { flexDirection: "row", alignItems: "center" },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  title: { fontSize: 16, fontWeight: "600" },
  meta: { fontSize: 12, marginTop: 2 },
  preview: { marginTop: 10, fontSize: 14, lineHeight: 20 },
  image: {
    width: "100%",
    borderRadius: 10,
    marginTop: 10,
  },

  menuButton: {
    padding: 6,
    borderRadius: 20,
  },

  fab: {
    position: "absolute",
    alignSelf: "center",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    height: 48,
    paddingHorizontal: 20,
    borderRadius: 24,

    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,

    zIndex: 999,
  },
  fabText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "800",
    fontSize: 14,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    padding: 24,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, marginTop: 10 },
  modalText: { textAlign: "center", marginTop: 8 },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    minWidth: 100,
  },
  secondaryText: {
    fontWeight: "600",
  },

  emptyText: { textAlign: "center", marginTop: 40 },

  threadMenuDropdown: {
    position: "absolute",
    paddingVertical: 4,
    minWidth: 160,
    maxWidth: 200,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },

  profileDropdown: {
    position: "absolute",
    paddingVertical: 4,
    minWidth: 160,
    maxWidth: 200,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },

  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
  },

  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dropdownText: {
    fontSize: 15,
    marginLeft: 10,
    fontWeight: "400",
  },

  reactionsContainer: {
    flexDirection: "row",
    marginTop: 12,
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  reactionButton: {
    // Container for touchable
  },
  reactBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  reacted: {},
  disliked: {},
  reactionText: {
    fontSize: 14,
  },
  reactedText: {
    color: "#e6004c",
    fontWeight: "600",
  },
  dislikedText: {
    color: Colors.primary,
    fontWeight: "600",
  },

  commentContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: "600",
  },
  commentTime: {
    fontSize: 11,
    marginTop: 2,
  },
  commentBody: {
    fontSize: 13,
    lineHeight: 18,
  },
});


