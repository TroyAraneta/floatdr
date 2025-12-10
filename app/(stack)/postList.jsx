import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase"; // adjust path if needed
import { View, Text, TouchableOpacity, Alert, ScrollView } from "react-native";

export default function PostList() {
  const [posts, setPosts] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState(null);

  // Fetch posts
  useEffect(() => {
    fetchPosts();
    checkAdminStatus();
  }, []);

  // Get posts from Supabase
  async function fetchPosts() {
    const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching posts:", error);
    } else {
      setPosts(data);
    }
  }

  // Check if user is admin
  async function checkAdminStatus() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    setUserId(user.id);

    const { data, error } = await supabase
      .from("admins")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error checking admin:", error);
    } else {
      setIsAdmin(!!data);
    }
  }

  // Delete post (admin only)
  async function deletePost(id) {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("posts").delete().eq("id", id);

          if (error) {
            Alert.alert("Error", "Failed to delete post.");
            console.error("Delete error:", error);
          } else {
            Alert.alert("Deleted", "Post removed successfully.");
            fetchPosts(); // refresh list
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={{ padding: 20 }}>
      {posts.length === 0 ? (
        <Text>No posts available.</Text>
      ) : (
        posts.map((post) => (
          <View
            key={post.id}
            style={{
              backgroundColor: "#fff",
              padding: 15,
              marginBottom: 10,
              borderRadius: 10,
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 5,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>{post.title}</Text>
            <Text style={{ marginTop: 5 }}>{post.content}</Text>

            {isAdmin && (
              <TouchableOpacity
                onPress={() => deletePost(post.id)}
                style={{
                  backgroundColor: "#ff4d4d",
                  marginTop: 10,
                  padding: 8,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "#fff", textAlign: "center" }}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}
