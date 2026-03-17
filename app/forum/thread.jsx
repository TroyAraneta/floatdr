import { useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  View,
  Animated,
  Platform,
  Alert,
  Modal,
  Pressable,
  Dimensions,
  Keyboard,
  AppState,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";
import ThemedTextInput from "../../components/ThemedTextInput";
import ThemedCard from "../../components/ThemedCard";
import { Colors } from "../../constants/colors";
import { useTheme } from "../../contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Thread() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();


  const [thread, setThread] = useState(null);
  const [sending, setSending] = useState(false);
  const [replies, setReplies] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [threadReactions, setThreadReactions] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyingToItem, setReplyingToItem] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState("relevant"); // relevant | newest
  const [menuThread, setMenuThread] = useState(null);
  const [menuThreadPosition, setMenuThreadPosition] = useState({ x: 0, y: 0 });
  const [menuComment, setMenuComment] = useState(null);
  const [menuCommentPosition, setMenuCommentPosition] = useState({ x: 0, y: 0 });
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // TODO: When you add settings, check user preference here
  const [showProfileWarning, setShowProfileWarning] = useState(true);

  const scales = useRef({}).current;
  const menuButtonRef = useRef(null);
  const commentMenuButtonRefs = useRef({}).current;
  const listRef = useRef(null);

  /* ---------------- USER ---------------- */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) =>
      setUserId(data?.user?.id ?? null)
    );
  }, []);

  /* ---------------- KEYBOARD HANDLING ---------------- */
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  /* ---------------- APP STATE HANDLING ---------------- */
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Force dismiss keyboard
        Keyboard.dismiss();
        
        // Force reset keyboard height
        setKeyboardHeight(0);
        
        // Reset reply state
        setReplyingTo(null);
        setReplyingToItem(null);
        setReplyText("");
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      appStateSubscription?.remove();
    };
  }, []);

  /* ---------------- LOAD ---------------- */
  const loadThread = async () => {
    const { data, error } = await supabase
      .from("forum_threads")
      .select(`
        id,
        title,
        body,
        image_url,
        created_at,
        author_id,
        profiles ( username, avatar_url )
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Failed to load thread:", error);
      Alert.alert("Error", "Failed to refresh thread.");
      return null;
    }

    setThread(data || null);
    return data || null;
  };

  const loadData = async () => {
    // THREAD-SCOPED REACTIONS
    const [
      { data: replyData, error: replyError },
      { data: threadReactionData, error: threadReactionError },
    ] = await Promise.all([
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
      supabase
        .from("thread_reactions")
        .select("thread_id,user_id,type")
        .eq("thread_id", id),
    ]);

    if (replyError) {
      console.error("Failed to load replies:", replyError);
      Alert.alert("Error", "Failed to refresh comments.");
    }
    if (threadReactionError) {
      console.error("Failed to load thread reactions:", threadReactionError);
      Alert.alert("Error", "Failed to refresh reactions.");
    }

    const safeReplies = replyError ? [] : replyData || [];
    const replyIds = safeReplies.map((r) => r.id);
    let reactionData = [];

    if (replyIds.length > 0) {
      const { data, error: replyReactionError } = await supabase
        .from("reply_reactions")
        .select("reply_id,user_id,type")
        .in("reply_id", replyIds);

      if (replyReactionError) {
        console.error("Failed to load reply reactions:", replyReactionError);
        Alert.alert("Error", "Failed to refresh reactions.");
      } else {
        reactionData = data || [];
      }
    }

    setReplies(safeReplies);
    setReactions(reactionData);
    setThreadReactions(threadReactionError ? [] : threadReactionData || []);
  };

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      await loadThread();
      await loadData();
      setLoading(false);
    };

    load();
  }, [id]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadThread();
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  /* ---------------- HELPERS ---------------- */
  const timeAgo = (date) => {
    const diff = (Date.now() - new Date(date)) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const replyReactionMap = useMemo(() => {
    const map = {};
    reactions.forEach((r) => {
      if (!map[r.reply_id]) {
        map[r.reply_id] = { like: 0, dislike: 0, userReaction: null };
      }
      map[r.reply_id][r.type] += 1;
      if (r.user_id === userId) {
        map[r.reply_id].userReaction = r.type;
      }
    });
    return map;
  }, [reactions, userId]);

  const threadReactionMap = useMemo(() => {
    const map = { like: 0, dislike: 0, userReaction: null };
    threadReactions.forEach((r) => {
      map[r.type] += 1;
      if (r.user_id === userId) map.userReaction = r.type;
    });
    return map;
  }, [threadReactions, userId]);

  const getReactionCount = (replyId, type) =>
    replyReactionMap[replyId]?.[type] || 0;

  const getUserReaction = (replyId) =>
    replyReactionMap[replyId]?.userReaction || null;

  const sortedComments = useMemo(() => {
    return replies
      .filter((r) => !r.parent_id)
      .sort((a, b) =>
        sort === "newest"
          ? new Date(b.created_at) - new Date(a.created_at)
          : getReactionCount(b.id, "like") - getReactionCount(a.id, "like")
      );
  }, [replies, sort, replyReactionMap]);

  const getReplies = (id) =>
    replies
      .filter(r => r.parent_id === id)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const getThreadReactionCount = (type) => threadReactionMap[type] || 0;

  const getUserThreadReaction = () => threadReactionMap.userReaction;

  const animateThreadLike = () => {
    if (!scales["thread"]) scales["thread"] = new Animated.Value(1);
    Animated.sequence([
      Animated.timing(scales["thread"], { toValue: 1.25, duration: 120, useNativeDriver: true }),
      Animated.timing(scales["thread"], { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const handleThreadReact = async (type) => {
    if (!userId) {
      Alert.alert("Please log in to react");
      return;
    }

    const current = getUserThreadReaction();

    if (current === type) {
      // Remove reaction
      await supabase
        .from("thread_reactions")
        .delete()
        .eq("thread_id", id)
        .eq("user_id", userId);
    } else {
      // Add or change reaction
      await supabase
        .from("thread_reactions")
        .upsert({ thread_id: id, user_id: userId, type });
      if (type === "like") animateThreadLike();
    }

    // Refresh reactions
    const { data: threadReactionData } = await supabase
      .from("thread_reactions")
      .select("thread_id,user_id,type")
      .eq("thread_id", id);
    
    setThreadReactions(threadReactionData || []);
  };

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
    setReplyingToItem(item);
    // Always add username tag when replying to a reply (nested comment)
    if (isReply) {
      setReplyText(`@${item.profiles.username} `);
    } else {
      setReplyText("");
    }
  };

  const animateLike = (id) => {
    if (!scales[id]) scales[id] = new Animated.Value(1);
    Animated.sequence([
      Animated.timing(scales[id], { toValue: 1.25, duration: 120, useNativeDriver: true }),
      Animated.timing(scales[id], { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const react = async (replyId, type) => {
    if (!userId) {
      Alert.alert("Please log in to react");
      return;
    }

    const current = getUserReaction(replyId);
    const previous = reactions;

    // Optimistic reaction state for this user+reply.
    setReactions((prev) => {
      const withoutCurrent = prev.filter(
        (r) => !(r.reply_id === replyId && r.user_id === userId)
      );
      if (current === type) return withoutCurrent;
      return [...withoutCurrent, { reply_id: replyId, user_id: userId, type }];
    });

    try {
      if (current === type) {
        const { error } = await supabase
          .from("reply_reactions")
          .delete()
          .eq("reply_id", replyId)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("reply_reactions")
          .upsert({ reply_id: replyId, user_id: userId, type });
        if (error) throw error;
        if (type === "like") animateLike(replyId);
      }
    } catch (err) {
      setReactions(previous);
      await loadData();
    }
  };

  const submitReply = async () => {
    if (!userId) {
      Alert.alert("Please log in to reply");
      return;
    }

    if (!replyText.trim()) return;
    if (sending) return;
  
    try {
      setSending(true);
  
      const { error } = await supabase.from("forum_replies").insert({
        body: replyText.trim(),
        author_id: userId,
        thread_id: id,
        parent_id: replyingTo,
      });
  
      if (error) throw error;
  
      setReplyText("");
      setReplyingTo(null);
      setReplyingToItem(null);
      Keyboard.dismiss();
      loadData();
    } catch (err) {
      Alert.alert("Error", "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  /* ---------------- NAVIGATION ---------------- */
  const navigateToProfile = (authorId, username) => {
    if (!authorId) return;

    if (showProfileWarning) {
      Alert.alert(
        "View Profile",
        `Do you want to view ${username || "this user"}'s profile?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "View Profile",
            onPress: () => {
              router.push({
                pathname: "/(stack)/userProfile",
                params: { userId: authorId },
              });
            },
          },
        ]
      );
    } else {
      router.push({
        pathname: "/(stack)/userProfile",
        params: { userId: authorId },
      });
    }
  };

  /* ---------------- COMMENT MODERATION ---------------- */
  const handleReportComment = async (commentId) => {
    // COMMENT REPORTING (notes fallback)
    const { error } = await supabase.from("moderation_reports").insert({
      thread_id: id,
      reporter_id: userId,
      reason: "Inappropriate content",
      notes: `Reported reply_id=${commentId}`,
    });

    if (error) {
      console.error(error);
      Alert.alert("Failed to report");
    } else {
      Alert.alert("Reported");
    }
    setMenuComment(null);
  };

  const handleDeleteComment = async (commentId) => {
    Alert.alert(
      "Delete comment?",
      "This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("forum_replies")
              .delete()
              .eq("id", commentId)
              .eq("author_id", userId);

            if (error) {
              Alert.alert("Failed to delete");
              console.error(error);
            } else {
              loadData();
            }

            setMenuComment(null);
          },
        },
      ]
    );
  };

  /* ---------------- THREAD MODERATION ---------------- */
  const handleSaveThread = async () => {
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

    setMenuThread(null);
  };

  const handleDeleteThread = async () => {
    Alert.alert(
      "Delete thread?",
      "This action cannot be undone.",
      [
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
              router.push("/(dashboard)/forum");
            }

            setMenuThread(null);
          },
        },
      ]
    );
  };

  const handleReportThread = async () => {
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

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
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
          <Animated.View 
            style={[
              styles.reactBtn, 
              { backgroundColor: theme.uiBackground },
              reaction === "like" && { backgroundColor: theme.surface },
              { transform: [{ scale: scales[item.id] || 1 }] }
            ]}
          >
            <Ionicons 
              name="heart" 
              size={16} 
              color={reaction === "like" ? "#e6004c" : theme.iconMuted}
              style={{ marginRight: 4 }} 
            />
            <ThemedText>{getReactionCount(item.id, "like")}</ThemedText>
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={reaction === "like"}
          onPress={() => react(item.id, "dislike")}
        >
          <View 
            style={[
              styles.reactBtn, 
              { backgroundColor: theme.uiBackground },
              reaction === "dislike" && { backgroundColor: theme.surface }
            ]}
          >
            <Ionicons 
              name="heart-dislike" 
              size={16} 
              color={reaction === "dislike" ? Colors.primary : theme.iconMuted}
              style={{ marginRight: 4 }} 
            />
            <ThemedText>{getReactionCount(item.id, "dislike")}</ThemedText>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => startReply(item, !!item.parent_id)}>
          <View style={styles.replyAction}>
            <Ionicons name="chatbubble-outline" size={16} color={theme.icon} />
            <ThemedText style={{ marginLeft: 4 }}>Reply</ThemedText>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const listBottomPadding =
    Platform.OS === "ios"
      ? (replyingToItem ? 180 : 140) + keyboardHeight
      : replyingToItem
      ? 120
      : 80;

  const renderTopLevelComment = ({ item: comment }) => {
    const children = getReplies(comment.id);
    const open = expanded.has(comment.id);

    return (
      <View>
        <ThemedCard style={styles.replyCard}>
          <TouchableOpacity
            onPress={() => navigateToProfile(comment.author_id, comment.profiles?.username)}
            style={styles.avatarContainer}
          >
            <Image
              source={{
                uri:
                  comment.profiles?.avatar_url ||
                  "https://cdn-icons-png.flaticon.com/512/149/149071.png",
              }}
              style={styles.replyAvatar}
            />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={styles.userRow}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.replyUser}>
                  {comment.profiles?.username || "User"}
                </ThemedText>
                <ThemedText style={styles.time} muted>
                  {timeAgo(comment.created_at)}
                </ThemedText>
              </View>
              <TouchableOpacity
                ref={(ref) => {
                  if (ref) commentMenuButtonRefs[comment.id] = ref;
                }}
                onPress={() => {
                  const ref = commentMenuButtonRefs[comment.id];
                  if (ref) {
                    ref.measureInWindow((x, y, width, height) => {
                      setMenuCommentPosition({ x: x + width, y: y + height + 2 });
                      setMenuComment(comment);
                    });
                  } else {
                    setMenuComment(comment);
                  }
                }}
                style={styles.menuButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="ellipsis-vertical" size={18} color={theme.iconMuted} />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.commentBody}>{comment.body}</ThemedText>
            {renderActions(comment)}

            {children.length > 0 && (
              <TouchableOpacity onPress={() => toggleReplies(comment.id)}>
                <ThemedText style={styles.viewReplies}>
                  {open ? "Hide replies" : `View ${children.length} replies`}
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </ThemedCard>

        {open &&
          children.map((reply) => (
            <View
              key={reply.id}
              style={[styles.childReply, { backgroundColor: theme.uiBackground }]}
            >
              <TouchableOpacity
                onPress={() => navigateToProfile(reply.author_id, reply.profiles?.username)}
                style={styles.avatarContainer}
              >
                <Image
                  source={{
                    uri:
                      reply.profiles?.avatar_url ||
                      "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                  }}
                  style={styles.childAvatar}
                />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <View style={styles.userRow}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.replyUser}>
                      {reply.profiles?.username || "User"}
                    </ThemedText>
                    <ThemedText style={styles.time} muted>
                      {timeAgo(reply.created_at)}
                    </ThemedText>
                  </View>
                  <TouchableOpacity
                    ref={(ref) => {
                      if (ref) commentMenuButtonRefs[reply.id] = ref;
                    }}
                    onPress={() => {
                      const ref = commentMenuButtonRefs[reply.id];
                      if (ref) {
                        ref.measureInWindow((x, y, width, height) => {
                          setMenuCommentPosition({ x: x + width, y: y + height + 2 });
                          setMenuComment(reply);
                        });
                      } else {
                        setMenuComment(reply);
                      }
                    }}
                    style={styles.menuButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="ellipsis-vertical" size={18} color={theme.iconMuted} />
                  </TouchableOpacity>
                </View>
                <ThemedText style={styles.commentBody}>{reply.body}</ThemedText>
                {renderActions(reply)}
              </View>
            </View>
          ))}
      </View>
    );
  };

  return (
    <ThemedView
      safe
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Back Button Header */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity 
          onPress={() => router.replace("/(dashboard)/forum")}
          style={[styles.backButton, { backgroundColor: theme.surface }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={18} color={theme.iconMuted} />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {/* FLATLIST COMMENTS */}
        <FlatList
          ref={listRef}
          data={sortedComments}
          keyExtractor={(item) => item.id}
          renderItem={renderTopLevelComment}
          refreshing={refreshing}
          onRefresh={onRefresh}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: listBottomPadding }}
          ListHeaderComponent={
            <>
              {thread && (
                <ThemedCard style={styles.threadCard}>
                  <View style={styles.profileRow}>
                    <TouchableOpacity
                      onPress={() => navigateToProfile(thread.author_id, thread.profiles?.username)}
                      style={styles.avatarContainer}
                    >
                      <Image
                        source={{
                          uri:
                            thread.profiles?.avatar_url ||
                            "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                        }}
                        style={styles.threadAvatar}
                      />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.threadUser}>
                        {thread.profiles?.username || "User"}
                      </ThemedText>
                      <ThemedText style={styles.threadDate} muted>
                        {new Date(thread.created_at).toLocaleDateString()}
                      </ThemedText>
                    </View>
                    <TouchableOpacity
                      ref={menuButtonRef}
                      onPress={() => {
                        if (menuButtonRef.current) {
                          menuButtonRef.current.measureInWindow((x, y, width, height) => {
                            setMenuThreadPosition({ x: x + width, y: y + height + 2 });
                            setMenuThread(thread);
                          });
                        } else {
                          setMenuThread(thread);
                        }
                      }}
                      style={styles.menuButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="ellipsis-vertical" size={20} color={theme.iconMuted} />
                    </TouchableOpacity>
                  </View>

                  <ThemedText style={styles.title} title>{thread.title}</ThemedText>
                  {thread.body && thread.body.trim() !== "" && (
                    <ThemedText style={styles.body}>{thread.body}</ThemedText>
                  )}

                  {thread.image_url && thread.image_url.trim() !== "" && (
                    <Image
                      source={{ uri: thread.image_url }}
                      style={[styles.threadImage, { backgroundColor: theme.uiBackground }]}
                      resizeMode="contain"
                      onError={(error) => {
                        console.log("Image load error:", error);
                      }}
                    />
                  )}

                  <View style={[styles.threadReactionsContainer, { borderTopColor: theme.uiBackground }]}>
                    <TouchableOpacity
                      disabled={getUserThreadReaction() === "dislike"}
                      onPress={() => handleThreadReact("like")}
                      style={styles.reactionButton}
                    >
                      <Animated.View
                        style={[
                          styles.reactBtn,
                          { backgroundColor: theme.uiBackground },
                          getUserThreadReaction() === "like" && styles.reacted,
                          { transform: [{ scale: scales["thread"] || 1 }] },
                        ]}
                      >
                        <Ionicons
                          name="heart"
                          size={16}
                          color={getUserThreadReaction() === "like" ? "#e6004c" : theme.iconMuted}
                          style={{ marginRight: 4 }}
                        />
                        <ThemedText
                          style={[
                            styles.reactionText,
                            getUserThreadReaction() === "like" && styles.reactedText,
                          ]}
                        >
                          {getThreadReactionCount("like")}
                        </ThemedText>
                      </Animated.View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={getUserThreadReaction() === "like"}
                      onPress={() => handleThreadReact("dislike")}
                      style={styles.reactionButton}
                    >
                      <View
                        style={[
                          styles.reactBtn,
                          { backgroundColor: theme.uiBackground },
                          getUserThreadReaction() === "dislike" && styles.disliked,
                        ]}
                      >
                        <Ionicons
                          name="heart-dislike"
                          size={16}
                          color={getUserThreadReaction() === "dislike" ? Colors.primary : theme.iconMuted}
                          style={{ marginRight: 4 }}
                        />
                        <ThemedText
                          style={[
                            styles.reactionText,
                            getUserThreadReaction() === "dislike" && styles.dislikedText,
                          ]}
                        >
                          {getThreadReactionCount("dislike")}
                        </ThemedText>
                      </View>
                    </TouchableOpacity>
                  </View>
                </ThemedCard>
              )}

              {sortedComments.length > 0 && (
                <View style={styles.sortRow}>
                  {["relevant", "newest"].map((s) => (
                    <TouchableOpacity key={s} onPress={() => setSort(s)}>
                      <ThemedText
                        style={[
                          styles.sort,
                          sort === s && styles.activeSort,
                        ]}
                      >
                        {s === "relevant" ? "Most Relevant" : "Newest"}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={styles.noCommentsContainer}>
              <Ionicons name="chatbubble-outline" size={48} color={theme.iconMuted} />
              <ThemedText style={styles.noCommentsText}>No comments yet</ThemedText>
              <ThemedText style={styles.noCommentsSubtext} muted>Be the first to comment!</ThemedText>
            </View>
          }
        />

        {/* Input bar - fixed position at bottom */}
        <View 
          style={[
            styles.replyBar, 
            { 
              backgroundColor: theme.surface, 
              borderColor: theme.uiBackground,
              paddingBottom: Platform.OS === 'ios' 
                ? Math.max(insets.bottom, keyboardHeight > 0 ? 0 : 12)
                : 12,
            }
          ]}
        >
          {replyingToItem && (
            <View
              style={[
                styles.replyingToIndicator,
                { backgroundColor: theme.uiBackground },
              ]}
            >
              <View style={styles.replyingToContent}>
                <Ionicons name="arrow-back" size={14} color={Colors.primary} />
                <ThemedText style={styles.replyingToText} muted>
                  Replying to <ThemedText style={styles.replyingToUsername}>{replyingToItem.profiles?.username || "User"}</ThemedText>
                </ThemedText>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setReplyingTo(null);
                  setReplyingToItem(null);
                  setReplyText("");
                  Keyboard.dismiss();
                }}
                style={styles.cancelReplyButton}
              >
                <Ionicons name="close" size={18} color={theme.iconMuted} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.replyInputContainer}>
            <ThemedTextInput
              placeholder="Write a reply..."
              value={replyText}
              onChangeText={setReplyText}
              style={{ flex: 1, marginRight: 12 }}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              onPress={submitReply}
              disabled={sending || !replyText.trim()}
              style={{ opacity: (sending || !replyText.trim()) ? 0.5 : 1 }}
            >
              <Ionicons name="send" size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 3 Dots Menu Dropdown - Thread */}
      {menuThread && (
        <Modal transparent visible={!!menuThread} animationType="fade">
          <Pressable
            style={styles.dropdownOverlay}
            onPress={() => {
              setMenuThread(null);
              setMenuThreadPosition({ x: 0, y: 0 });
            }}
          >
            <ThemedCard style={[styles.threadMenuDropdown, { 
              top: menuThreadPosition.y > 0 ? menuThreadPosition.y : 80, 
              right: menuThreadPosition.x > 0 ? Dimensions.get('window').width - menuThreadPosition.x : 16 
            }]}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => handleSaveThread()}
                activeOpacity={0.7}
              >
                <Ionicons name="bookmark-outline" size={18} color={theme.icon} />
                <ThemedText style={styles.dropdownText}>Save</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => handleReportThread()}
                activeOpacity={0.7}
              >
                <Ionicons name="flag-outline" size={18} color={theme.icon} />
                <ThemedText style={styles.dropdownText}>Report</ThemedText>
              </TouchableOpacity>

              {thread?.author_id === userId && (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => handleDeleteThread()}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.warning} />
                  <ThemedText style={[styles.dropdownText, { color: Colors.warning }]}>Delete</ThemedText>
                </TouchableOpacity>
              )}
            </ThemedCard>
          </Pressable>
        </Modal>
      )}

      {/* 3 Dots Menu Dropdown - Comment */}
      {menuComment && (
        <Modal transparent visible={!!menuComment} animationType="fade">
          <Pressable
            style={styles.dropdownOverlay}
            onPress={() => {
              setMenuComment(null);
              setMenuCommentPosition({ x: 0, y: 0 });
            }}
          >
            <ThemedCard style={[styles.threadMenuDropdown, { 
              top: menuCommentPosition.y > 0 ? menuCommentPosition.y : 80, 
              right: menuCommentPosition.x > 0 ? Dimensions.get('window').width - menuCommentPosition.x : 16 
            }]}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => handleReportComment(menuComment.id)}
                activeOpacity={0.7}
              >
                <Ionicons name="flag-outline" size={18} color={theme.icon} />
                <ThemedText style={styles.dropdownText}>Report</ThemedText>
              </TouchableOpacity>

              {menuComment?.author_id === userId && (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => handleDeleteComment(menuComment.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.warning} />
                  <ThemedText style={[styles.dropdownText, { color: Colors.warning }]}>Delete</ThemedText>
                </TouchableOpacity>
              )}
            </ThemedCard>
          </Pressable>
        </Modal>
      )}
    </ThemedView>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  threadCard: {
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 16,
    padding: 20,
  },

  profileRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 12 
  },
  avatarContainer: {
    marginRight: 12,
  },
  threadAvatar: { 
    width: 44, 
    height: 44, 
    borderRadius: 22,
  },
  threadUser: { 
    fontWeight: "600", 
    fontSize: 14,
  },
  threadDate: {
    fontSize: 12,
    marginTop: 2,
  },
  menuButton: {
    padding: 6,
    borderRadius: 20,
  },

  title: { 
    fontSize: 18, 
    fontWeight: "700", 
    marginTop: 4, 
    marginBottom: 0,
  },
  body: { 
    fontSize: 14, 
    marginTop: 8,
    marginBottom: 0,
    lineHeight: 20,
  },
  threadImage: {
    width: "100%",
    minHeight: 200,
    maxHeight: 400,
    borderRadius: 12,
    marginTop: 12,
  },

  sortRow: { 
    flexDirection: "row", 
    gap: 12, 
    marginHorizontal: 16, 
    marginBottom: 8 
  },
  sort: { 
    fontSize: 12,
    paddingVertical: 4 
  },
  activeSort: { 
    fontWeight: "700", 
    color: Colors.primary,
    borderBottomWidth: 2, 
    borderColor: Colors.primary,
  },

  replyCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    flexDirection: "row",
  },

  childReply: {
    marginLeft: 60,
    marginRight: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
  },

  replyAvatar: { 
    width: 38, 
    height: 38, 
    borderRadius: 19, 
    marginRight: 10 
  },
  childAvatar: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    marginRight: 10 
  },

  userRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginBottom: 4 
  },
  replyUser: { 
    fontWeight: "600",
  },
  time: { 
    fontSize: 11,
  },

  commentBody: {
    fontSize: 14,
    lineHeight: 20,
  },

  actions: { 
    flexDirection: "row", 
    marginTop: 8, 
    gap: 10 
  },
  reactBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  reacted: {},
  disliked: {},

  replyAction: { 
    flexDirection: "row", 
    alignItems: "center", 
    opacity: 0.7 
  },

  viewReplies: { 
    marginTop: 6, 
    fontWeight: "600", 
    color: Colors.primary,
  },
  threadReactionsContainer: {
    flexDirection: "row",
    marginTop: 12,
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  reactionButton: {
    // Container for touchable
  },
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

  replyBar: {
    paddingTop: 12,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: -2 },
    elevation: 2,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  replyInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 0,
  },
  noCommentsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  noCommentsText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
  },
  noCommentsSubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
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
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  dropdownText: {
    fontSize: 15,
    marginLeft: 10,
    fontWeight: "400",
  },
  replyingToIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  replyingToContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  replyingToText: {
    fontSize: 13,
    marginLeft: 6,
  },
  replyingToUsername: {
    fontWeight: "600",
    color: Colors.primary,
  },
  cancelReplyButton: {
    padding: 4,
    marginLeft: 8,
  },
});

