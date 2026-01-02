import { useEffect, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import ThemedText from "../../components/ThemedText";
import ThemedButton from "../../components/ThemedButton";
import { Ionicons } from "@expo/vector-icons";

const ForumCategory = () => {
  const { slug } = useLocalSearchParams();
  const router = useRouter();

  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState(null);

  // ✅ Fetch category details
  useEffect(() => {
    const fetchCategory = async () => {
      const { data, error } = await supabase
        .from("forum_categories")
        .select("id, name")
        .eq("slug", slug)
        .single();

      if (error || !data) {
        console.error("Category not found:", slug);
        setLoading(false);
        return;
      }

      setCategory(data);
    };

    fetchCategory();
  }, [slug]);

  // ✅ Fetch threads by category
  const fetchThreads = async () => {
  if (!category) return;

  setLoading(true);
    try {
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
        .eq("category_id", category.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setThreads(data || []);
    } catch (err) {
      console.error("Error fetching threads:", err.message);
    } finally {
      setLoading(false);
    }
  };


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchThreads();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [category]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.headerRow}>
          <ThemedText title style={styles.heading}>
          {category?.name || "Forum"}
          </ThemedText>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/(stack)/createPost",
                params: { slug },
              })
            }
          >
            <Ionicons name="add-circle" size={28} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#4CAF50" />
        ) : threads.length === 0 ? (
          <ThemedText>No threads yet. Start the first one!</ThemedText>
        ) : (
          threads.map((thread) => (
            <TouchableOpacity
              key={thread.id}
              style={styles.threadCard}
              onPress={() =>
                router.push({
                  pathname: "/(dashboard)/forum/thread/[id]",
                  params: { id: thread.id },
                })
              }
            >
              <View style={styles.threadHeader}>
                <Image
                  source={{
                    uri:
                      thread.profiles?.avatar_url ||
                      "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                  }}
                  style={styles.avatar}
                />
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.username}>
                    {thread.profiles?.username || "Anonymous"}
                  </ThemedText>
                  <ThemedText style={styles.date}>
                    {new Date(thread.created_at).toLocaleString()}
                  </ThemedText>
                </View>
              </View>

              <ThemedText style={styles.title}>{thread.title}</ThemedText>

              {thread.body && (
                <ThemedText numberOfLines={2} style={styles.content}>
                  {thread.body}
                </ThemedText>
              )}

              {thread.image_url && (
                <Image
                  source={{ uri: thread.image_url }}
                  style={styles.postImage}
                />
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default ForumCategory;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: "600",
    color: "#222",
  },
  threadCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  threadHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 18,
    marginRight: 10,
  },
  username: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  date: {
    fontSize: 12,
    color: "#777",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
    marginTop: 4,
  },
  content: {
    fontSize: 14,
    color: "#555",
    marginTop: 6,
  },
  postImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    marginTop: 8,
  },
});
