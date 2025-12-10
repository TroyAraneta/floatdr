import { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import ThemedText from "../../components/ThemedText";
import ThemedButton from "../../components/ThemedButton";

export default function UserProfile() {
  const { userId } = useLocalSearchParams();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    if (userId) fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      setCurrentUserId(authData?.user?.id);

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;
      setUser(profile);

      // Fetch user posts
      const { data: userPosts, error: postError } = await supabase
        .from("forums")
        .select("id, content, image_url, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (postError) throw postError;
      setPosts(userPosts || []);
    } catch (err) {
      console.error("Error loading user profile:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    Alert.alert("Connection Request Sent", `You’ve requested to connect with ${user.username}.`);
  };

  if (loading)
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#333" />
        <ThemedText>Loading profile...</ThemedText>
      </View>
    );

  if (!user)
    return (
      <View style={styles.loaderContainer}>
        <ThemedText>User not found.</ThemedText>
      </View>
    );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* === Header === */}
      <View style={styles.header}>
        <Image
          source={{
            uri: user.avatar_url || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
          }}
          style={styles.avatar}
        />
        <ThemedText style={styles.username}>{user.username}</ThemedText>
        {user.bio && <ThemedText style={styles.bio}>{user.bio}</ThemedText>}

        {currentUserId !== user.id && (
          <ThemedButton onPress={handleConnect} style={styles.connectBtn}>
            <ThemedText style={styles.connectText}>Connect</ThemedText>
          </ThemedButton>
        )}
      </View>

      {/* === User’s Posts === */}
      <View style={styles.postsContainer}>
        <ThemedText title style={styles.sectionTitle}>
          {user.username}'s Posts
        </ThemedText>

        {posts.length === 0 && <ThemedText>No posts yet.</ThemedText>}

        {posts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            {post.content && (
              <ThemedText style={styles.postContent}>{post.content}</ThemedText>
            )}
            {post.image_url && (
              <Image source={{ uri: post.image_url }} style={styles.postImage} />
            )}
            <ThemedText style={styles.dateText}>
              {new Date(post.created_at).toLocaleString()}
            </ThemedText>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    padding: 16,
    backgroundColor: "#fff",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  username: {
    fontSize: 22,
    fontWeight: "600",
    color: "#222",
  },
  bio: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    marginVertical: 8,
    paddingHorizontal: 10,
  },
  connectBtn: {
    marginTop: 10,
    paddingHorizontal: 24,
    backgroundColor: "#007bff",
  },
  connectText: {
    color: "#fff",
    fontSize: 16,
  },
  postsContainer: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  postCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  postContent: {
    fontSize: 15,
    color: "#333",
    marginBottom: 8,
  },
  postImage: {
    width: "100%",
    height: 220,
    borderRadius: 10,
    marginBottom: 8,
  },
  dateText: {
    fontSize: 12,
    color: "#777",
  },
});
