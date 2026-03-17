import { useCallback, useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useRouter, useFocusEffect } from "expo-router";

import ThemedText from "../../components/ThemedText";
import ThemedView from "../../components/ThemedView";
import ThemedCard from "../../components/ThemedCard";
import ThemedButton from "../../components/ThemedButton";
import Spacer from "../../components/Spacer";
import { useTheme } from "../../contexts/ThemeContext";
import useMembershipStatus from "../../hooks/useMembershipStatus";
import SubscriptionModal from "../../components/SubscriptionModal";

const FALLBACK_AVATAR =
  "https://cdn-icons-png.flaticon.com/512/149/149071.png";

export default function SaveForum() {
  const router = useRouter();
  const { theme } = useTheme();
  const { isSubscribed: isMember, subscriptionLoading: membershipLoading } =
    useMembershipStatus();

  const [savedThreads, setSavedThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [userId, setUserId] = useState(null);

  // membership gate
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id || null);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!membershipLoading && !isMember) {
        setShowMemberModal(true);
      }
    }, [membershipLoading, isMember])
  );

  const fetchSaved = useCallback(async () => {
    try {
      if (!userId) return;
      setLoading(true);

      // Using your schema: saved_threads -> forum_threads -> profiles
      const { data, error } = await supabase
        .from("saved_threads")
        .select(
          `
          thread_id,
          created_at,
          forum_threads:thread_id (
            id,
            title,
            body,
            image_url,
            created_at,
            author_id,
            profiles:author_id ( username, avatar_url )
          )
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted =
        (data || [])
          .map((row) => row.forum_threads)
          .filter(Boolean) || [];

      setSavedThreads(formatted);
    } catch (err) {
      console.error("Error fetching saved threads:", err?.message);
      Alert.alert("Error", "Could not load saved posts.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!membershipLoading && isMember && userId) {
      fetchSaved();
    }
  }, [membershipLoading, isMember, userId, fetchSaved]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSaved();
    setRefreshing(false);
  }, [fetchSaved]);

  const timeAgo = (date) => {
    const diff = (Date.now() - new Date(date)) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const handleUnsave = useCallback(
    async (threadId) => {
      if (!userId || !threadId) return;

      Alert.alert("Remove saved post?", "This will remove it from Saved.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("saved_threads")
              .delete()
              .eq("user_id", userId)
              .eq("thread_id", threadId);

            if (error) {
              Alert.alert("Error", "Failed to remove saved post.");
              return;
            }

            setSavedThreads((prev) => prev.filter((t) => t.id !== threadId));
          },
        },
      ]);
    },
    [userId]
  );

  const renderItem = useCallback(
    ({ item }) => {
      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() =>
            router.push({
              pathname: "/forum/thread",
              params: { id: item.id },
            })
          }
        >
          <ThemedCard style={[styles.card, { backgroundColor: theme.surface }]}>
            {/* Header */}
            <View style={styles.headerRow}>
              <Image
                source={{
                  uri: item.profiles?.avatar_url || FALLBACK_AVATAR,
                }}
                style={styles.avatar}
              />

              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.username, { color: theme.title }]}>
                  {item.profiles?.username || "User"}
                </ThemedText>
                <ThemedText muted style={{ color: theme.textMuted, fontSize: 12 }}>
                  {timeAgo(item.created_at)}
                </ThemedText>
              </View>

              <TouchableOpacity
                onPress={() => handleUnsave(item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="bookmark" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>

            {!!item.title && (
              <ThemedText style={[styles.title, { color: theme.title }]}>
                {item.title}
              </ThemedText>
            )}

            {!!item.body && (
              <ThemedText
                style={[styles.body, { color: theme.text }]}
                numberOfLines={item.image_url ? 3 : 5}
              >
                {item.body}
              </ThemedText>
            )}

            {!!item.image_url && (
              <Image
                source={{ uri: item.image_url }}
                style={[styles.image, { backgroundColor: theme.uiBackground }]}
                resizeMode="cover"
              />
            )}
          </ThemedCard>
        </TouchableOpacity>
      );
    },
    [router, theme, handleUnsave]
  );

  const empty = useMemo(() => {
    if (loading) return null;
    return (
      <View style={styles.center}>
        <Ionicons name="bookmark-outline" size={28} color={theme.iconMuted} />
        <Spacer height={10} />
        <ThemedText muted style={{ color: theme.textMuted }}>
          You haven't saved any posts yet.
        </ThemedText>
      </View>
    );
  }, [loading, theme]);

  if (membershipLoading) {
    return (
      <ThemedView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.topBar, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          onPress={() => router.replace("/(dashboard)/menu")}
          style={[styles.backBtn, { backgroundColor: theme.surface }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={18} color={theme.iconMuted} />
        </TouchableOpacity>

        <ThemedText title style={[styles.headerTitle, { color: theme.title }]}>
          Saved Posts
        </ThemedText>

        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={savedThreads}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        ListHeaderComponent={
          loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 18 }} />
          ) : null
        }
        ListEmptyComponent={empty}
      />

      {/* Member Gate Modal (same style/behavior as Forum) */}
      <Modal transparent visible={showMemberModal} animationType="fade">
        <Pressable style={styles.overlay}>
          <ThemedCard style={[styles.modal, { backgroundColor: theme.surface }]}>
            <Ionicons name="lock-closed" size={36} color={theme.primary} />
            <ThemedText title style={[styles.modalTitle, { color: theme.title }]}>
              Members Only
            </ThemedText>
            <ThemedText muted style={[styles.modalText, { color: theme.textMuted }]}>
              Saved posts are available for members only.
            </ThemedText>

            <View style={styles.modalActions}>
              <ThemedButton
                style={[styles.modalBtn, { backgroundColor: theme.uiBackground }]}
                onPress={() => {
                  setShowMemberModal(false);
                  router.replace("/(dashboard)/menu");
                }}
              >
                <ThemedText style={{ fontWeight: "700", color: theme.text }}>
                  Go Back
                </ThemedText>
              </ThemedButton>

              <ThemedButton
                style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                onPress={() => {
                  setShowMemberModal(false);
                  setShowSubscriptionModal(true);
                }}
              >
                <ThemedText style={{ color: "#fff", fontWeight: "800" }}>
                  Get Membership
                </ThemedText>
              </ThemedButton>
            </View>
          </ThemedCard>
        </Pressable>
      </Modal>

      {/* Subscription modal (same component you use in Forum) */}
      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onCloseToMemberGate={() => {
          setShowSubscriptionModal(false);
          setShowMemberModal(true);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  topBar: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
  },

  center: {
    marginTop: 50,
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  username: {
    fontSize: 14,
    fontWeight: "800",
  },

  title: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "800",
  },
  body: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },

  image: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginTop: 10,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  modal: {
    width: "100%",
    maxWidth: 420,
    padding: 22,
    alignItems: "center",
    borderRadius: 18,
  },
  modalTitle: {
    fontSize: 18,
    marginTop: 10,
  },
  modalText: {
    textAlign: "center",
    marginTop: 8,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  modalBtn: {
    flex: 1,
    minWidth: 120,
    borderRadius: 14,
  },
});

