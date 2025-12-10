import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import ThemedText from "../../components/ThemedText";
import Spacer from "../../components/Spacer";
import { useRouter } from "expo-router";

const ProfileDetails = () => {
  const [userData, setUserData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) throw new Error("No user logged in.");

        // Fetch profile info
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("username, bio, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        setUserData({
          id: user.id,
          email: user.email,
          ...profileData,
        });

        // Fetch posts authored by the user
        const { data: postsData, error: postsError } = await supabase
          .from("forums")
          .select("id, content, image_url, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (postsError) throw postsError;
        setPosts(postsData || []);
      } catch (error) {
        console.error("Error loading profile details:", error.message);
        Alert.alert("Error", "Failed to load profile details.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleDelete = async (postId) => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("forums")
              .delete()
              .eq("id", postId)
              .eq("user_id", userData.id);

            if (error) throw error;
            Alert.alert("Deleted", "Your post has been removed.");
            setPosts((prev) => prev.filter((p) => p.id !== postId));
          } catch (err) {
            Alert.alert("Error", err.message);
          }
        },
      },
    ]);
  };

  const handleSavePost = (post) => {
    setMenuVisible(null);
    router.push({
      pathname: "/(dashboard)/saveforum",
      params: { postId: post.id },
    });
  };

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3C5A99" />
      </View>
    );

  if (!userData)
    return (
      <View style={styles.center}>
        <ThemedText>No profile data available.</ThemedText>
      </View>
    );

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* ✅ Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <ThemedText title style={styles.headerTitle}>
          Profile Details
        </ThemedText>
      </View>

      {/* ✅ Profile Info */}
      <View style={styles.profileSection}>
        <Image
          source={{
            uri:
              userData.avatar_url ||
              "https://cdn-icons-png.flaticon.com/512/149/149071.png",
          }}
          style={styles.avatar}
        />
        <ThemedText style={styles.username}>
          {userData.username || "User"}
        </ThemedText>
        <ThemedText style={styles.email}>{userData.email}</ThemedText>

        {userData.bio ? (
          <ThemedText style={styles.bio}>{userData.bio}</ThemedText>
        ) : (
          <ThemedText style={styles.bioPlaceholder}>No bio yet</ThemedText>
        )}
      </View>

      <Spacer height={20} />

      {/* ✅ User Posts */}
      <ThemedText title style={styles.sectionTitle}>
        Your Posts
      </ThemedText>

      {posts.length === 0 ? (
        <ThemedText style={styles.noPosts}>
          You haven’t posted anything yet.
        </ThemedText>
      ) : (
        posts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            {/* 3-dot menu */}
            <View style={styles.postTopBar}>
              <TouchableOpacity
                onPress={() =>
                  setMenuVisible(menuVisible === post.id ? null : post.id)
                }
              >
                <Ionicons name="ellipsis-vertical" size={20} color="#555" />
              </TouchableOpacity>

              {/* Dropdown Menu */}
              <Modal
                transparent
                visible={menuVisible === post.id}
                animationType="fade"
                onRequestClose={() => setMenuVisible(null)}
              >
                <TouchableOpacity
                  style={styles.modalOverlay}
                  onPress={() => setMenuVisible(null)}
                >
                  <View style={styles.menuContainer}>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => handleSavePost(post)}
                    >
                      <Ionicons name="bookmark-outline" size={18} color="#333" />
                      <ThemedText style={styles.menuText}>Save Post</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setMenuVisible(null);
                        Alert.alert("Download", "Download image feature coming soon!");
                      }}
                    >
                      <Ionicons name="download-outline" size={18} color="#333" />
                      <ThemedText style={styles.menuText}>
                        Download Image
                      </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setMenuVisible(null);
                        Alert.alert("Edit Post", "Edit post feature coming soon!");
                      }}
                    >
                      <Ionicons name="create-outline" size={18} color="#333" />
                      <ThemedText style={styles.menuText}>Edit Post</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setMenuVisible(null);
                        handleDelete(post.id);
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#c0392b" />
                      <ThemedText
                        style={[styles.menuText, { color: "#c0392b" }]}
                      >
                        Delete Post
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Modal>
            </View>

            {post.content && (
              <ThemedText style={styles.postContent}>{post.content}</ThemedText>
            )}
            {post.image_url && (
              <Image source={{ uri: post.image_url }} style={styles.postImage} />
            )}
            <ThemedText style={styles.postDate}>
              {new Date(post.created_at).toLocaleString()}
            </ThemedText>
          </View>
        ))
      )}

      <Spacer height={40} />
    </ScrollView>
  );
};

export default ProfileDetails;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F9FAFB",
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  profileSection: {
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 20,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 3,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 10,
  },
  username: {
    fontSize: 20,
    fontWeight: "600",
    color: "#222",
  },
  email: {
    fontSize: 14,
    color: "#555",
  },
  bio: {
    marginTop: 10,
    fontSize: 15,
    textAlign: "center",
    color: "#333",
    paddingHorizontal: 20,
  },
  bioPlaceholder: {
    marginTop: 10,
    fontSize: 14,
    color: "#888",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
    marginBottom: 10,
  },
  postCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  postTopBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 6,
  },
  postContent: {
    fontSize: 15,
    color: "#333",
    marginBottom: 8,
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginBottom: 8,
  },
  postDate: {
    fontSize: 12,
    color: "#777",
    textAlign: "right",
  },
  noPosts: {
    color: "#666",
    textAlign: "center",
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  menuContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 8,
    width: 200,
    elevation: 5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  menuText: {
    fontSize: 15,
    marginLeft: 8,
  },
});
