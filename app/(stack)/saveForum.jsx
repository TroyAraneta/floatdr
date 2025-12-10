import { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";
import ThemedText from "../../components/ThemedText";
import Spacer from "../../components/Spacer";

export default function SaveForum() {
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchSavedPosts = async () => {
      try {
        setLoading(true);
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) throw new Error("Not logged in.");

        // 🔹 Fetch saved posts (assuming a 'saved_forums' table linking user_id and post_id)
        const { data, error } = await supabase
          .from("saved_forums")
          .select(
            `
            id,
            forums (
              id,
              content,
              image_url,
              created_at,
              profiles ( username, avatar_url )
            )
          `
          )
          .eq("user_id", user.id)
          .order("id", { ascending: false });

        if (error) throw error;

        const formatted = data
          .map((item) => item.forums)
          .filter((p) => p != null);

        setSavedPosts(formatted);
      } catch (err) {
        console.error("Error fetching saved posts:", err.message);
        Alert.alert("Error", "Could not load saved posts.");
      } finally {
        setLoading(false);
      }
    };

    fetchSavedPosts();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* ✅ Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <ThemedText title style={styles.headerTitle}>
          Saved Posts
        </ThemedText>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3C5A99" />
        </View>
      ) : savedPosts.length === 0 ? (
        <View style={styles.center}>
          <ThemedText style={styles.emptyText}>
            You haven’t saved any posts yet.
          </ThemedText>
        </View>
      ) : (
        savedPosts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            {/* Post Header */}
            <View style={styles.postHeader}>
              <Image
                source={{
                  uri:
                    post.profiles?.avatar_url ||
                    "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                }}
                style={styles.avatar}
              />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.username}>
                  {post.profiles?.username || "Anonymous"}
                </ThemedText>
                <ThemedText style={styles.date}>
                  {new Date(post.created_at).toLocaleString()}
                </ThemedText>
              </View>

              <TouchableOpacity
                onPress={() =>
                  Alert.alert("Remove Saved Post", "Feature coming soon!")
                }
              >
                <Ionicons name="bookmark" size={22} color="#3C5A99" />
              </TouchableOpacity>
            </View>

            {/* Post Content */}
            {post.content && (
              <ThemedText style={styles.postContent}>{post.content}</ThemedText>
            )}

            {post.image_url && (
              <Image source={{ uri: post.image_url }} style={styles.postImage} />
            )}
          </View>
        ))
      )}

      <Spacer height={40} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F9FAFB",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },
  emptyText: {
    color: "#777",
    fontSize: 15,
  },
  postCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  username: {
    fontSize: 15,
    fontWeight: "500",
    color: "#222",
  },
  date: {
    fontSize: 12,
    color: "#666",
  },
  postContent: {
    fontSize: 15,
    color: "#333",
    marginVertical: 8,
    lineHeight: 20,
  },
  postImage: {
    width: "100%",
    height: 220,
    borderRadius: 10,
    marginTop: 8,
  },
});
