import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  FlatList,
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";
import ThemedCard from "../../components/ThemedCard";
import ThemedButton from "../../components/ThemedButton";
import { useTheme } from "../../contexts/ThemeContext";

const FALLBACK_AVATAR =
  "https://cdn-icons-png.flaticon.com/512/149/149071.png";

export default function UserProfile() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const profileUserId = params?.userId;

  const { theme } = useTheme();

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [imageRatios, setImageRatios] = useState({});
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadAll = useCallback(async () => {
    if (!profileUserId) return;

    try {
      setLoading(true);

      const { data: authData } = await supabase.auth.getUser();
      const me = authData?.user?.id ?? null;
      if (mountedRef.current) setCurrentUserId(me);

      // Profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, bio, avatar_url, created_at")
        .eq("id", profileUserId)
        .single();

      if (profileError) throw profileError;
      if (mountedRef.current) setUser(profile);

      // Posts
      const { data: userPosts, error: postError } = await supabase
        .from("forum_threads")
        .select("id, title, body, image_url, created_at")
        .eq("author_id", profileUserId)
        .order("created_at", { ascending: false });

      if (postError) throw postError;
      if (mountedRef.current) setPosts(userPosts || []);
    } catch (err) {
      console.error("Error loading user profile:", err?.message || err);
      Alert.alert("Error", "Failed to load profile.");
      if (mountedRef.current) setUser(null);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [profileUserId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const canConnect = useMemo(() => {
    if (!user?.id) return false;
    if (!currentUserId) return false;
    return currentUserId !== user.id;
  }, [currentUserId, user?.id]);

  const handleConnect = useCallback(() => {
    if (!user?.username) return;
    Alert.alert(
      "Connection Request Sent",
      `You’ve requested to connect with ${user.username}.`
    );
  }, [user?.username]);

  const timeAgo = useCallback((date) => {
    const diff = (Date.now() - new Date(date)) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  }, []);

  const Header = useMemo(() => {
    if (loading) return null;
    if (!user) return null;

    return (
      <ThemedCard style={[styles.profileCard, { backgroundColor: theme.surface }]}>
        <Image
          source={{ uri: user.avatar_url || FALLBACK_AVATAR }}
          style={[styles.avatar, { backgroundColor: theme.uiBackground }]}
        />

        <ThemedText style={[styles.username, { color: theme.title }]}>
          {user.username || "User"}
        </ThemedText>

        {!!user.bio && (
          <ThemedText style={[styles.bio, { color: theme.textMuted }]} muted>
            {user.bio}
          </ThemedText>
        )}

        <View style={styles.profileMetaRow}>
          <Ionicons name="time-outline" size={14} color={theme.iconMuted} />
          <ThemedText style={[styles.metaText, { color: theme.textMuted }]} muted>
            Joined {new Date(user.created_at).toLocaleDateString()}
          </ThemedText>
        </View>

        {canConnect && (
          <ThemedButton style={[styles.connectBtn, { backgroundColor: theme.primary }]} onPress={handleConnect}>
            <ThemedText style={styles.connectText}>Connect</ThemedText>
          </ThemedButton>
        )}
      </ThemedCard>
    );
  }, [loading, user, theme, canConnect, handleConnect]);

  const renderPost = useCallback(
    ({ item }) => {
      const hasImage = !!item.image_url;
      const ratio = imageRatios[item.id];

      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: "/forum/thread",
              params: { id: item.id },
            })
          }
        >
          <ThemedCard style={[styles.postCard, { backgroundColor: theme.surface }]}>
            <View style={styles.postHeaderRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={theme.iconMuted} />
              <ThemedText style={[styles.postTitle, { color: theme.title }]} numberOfLines={2}>
                {item.title || "Untitled"}
              </ThemedText>
            </View>

            {!!item.body && (
              <ThemedText
                style={[styles.postBody, { color: theme.text }]}
                numberOfLines={hasImage ? 2 : 4}
              >
                {item.body}
              </ThemedText>
            )}

            {hasImage && (
              <Image
                source={{ uri: item.image_url }}
                style={[
                  styles.postImage,
                  { backgroundColor: theme.uiBackground },
                  {
                    height: ratio && ratio < 1 ? 280 : 180,
                  },
                ]}
                resizeMode="contain"
                onLoad={(e) => {
                  const { width, height } = e.nativeEvent.source;
                  if (!width || !height) return;
                  setImageRatios((prev) => ({ ...prev, [item.id]: width / height }));
                }}
              />
            )}

            <View
              style={[
                styles.postFooterRow,
                { borderTopColor: theme.uiBackground },
              ]}
            >
              <Ionicons name="time-outline" size={14} color={theme.iconMuted} />
              <ThemedText style={[styles.dateText, { color: theme.textMuted }]} muted>
                {timeAgo(item.created_at)}
              </ThemedText>

              <View style={{ flex: 1 }} />

              <Ionicons name="chevron-forward" size={16} color={theme.iconMuted} />
            </View>
          </ThemedCard>
        </TouchableOpacity>
      );
    },
    [router, theme, imageRatios, timeAgo]
  );

  if (loading) {
    return (
      <ThemedView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
        <ThemedText style={{ marginTop: 10 }} muted>
          Loading profile...
        </ThemedText>
      </ThemedView>
    );
  }

  if (!user) {
    return (
      <ThemedView style={[styles.center, { backgroundColor: theme.background }]}>
        <ThemedText title>User not found.</ThemedText>
        <ThemedButton
          style={{ marginTop: 12 }}
          onPress={() => router.replace("/(dashboard)/menu")}
        >
          <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
            Go Back
          </ThemedText>
        </ThemedButton>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        ListHeaderComponent={
          <>
            {/* Back row */}
            <View style={styles.topRow}>
              <TouchableOpacity
                onPress={() => router.replace("/(dashboard)/menu")}
                style={[styles.backBtn, { backgroundColor: theme.surface }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="arrow-back" size={18} color={theme.iconMuted} />
              </TouchableOpacity>

              <ThemedText title style={[styles.pageTitle, { color: theme.title }]}>
                Profile
              </ThemedText>

              <View style={{ width: 40 }} />
            </View>

            {Header}

            <ThemedText title style={[styles.sectionTitle, { color: theme.title }]}>
              Posts
            </ThemedText>
          </>
        }
        ListEmptyComponent={
          <ThemedCard style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
            <Ionicons name="document-text-outline" size={22} color={theme.iconMuted} />
            <ThemedText style={{ marginTop: 8 }} muted>
              No posts yet.
            </ThemedText>
          </ThemedCard>
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  pageTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
  },

  profileCard: {
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
    marginBottom: 14,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    marginBottom: 10,
  },
  username: {
    fontSize: 20,
    fontWeight: "700",
  },
  bio: {
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
  },
  profileMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },
  metaText: { fontSize: 12 },

  connectBtn: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignSelf: "stretch",
  },
  connectText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
  },

  sectionTitle: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 16,
  },

  postCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  postHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  postTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  postBody: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  postImage: {
    width: "100%",
    borderRadius: 12,
    marginTop: 12,
  },
  postFooterRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: { fontSize: 12 },

  emptyCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
  },
});
