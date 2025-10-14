import { useEffect, useState, useCallback } from "react"
import { StyleSheet, ScrollView, RefreshControl, View, Image } from "react-native"
import { supabase } from "../../lib/supabase"
import ThemedView from "../../components/ThemedView"
import ThemedText from "../../components/ThemedText"
import ThemedButton from "../../components/ThemedButton"
import Spacer from "../../components/Spacer"
import CreatePost from "./CreatePost" // ✅ Import modal component

const Forum = () => {
  const [posts, setPosts] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false) // ✅ modal state

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("forums")
        .select(`
          id,
          content,
          image_url,
          created_at,
          user_id,
          users ( username )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setPosts(data || [])
    } catch (error) {
      console.error("Error fetching posts:", error.message)
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchPosts()
    setRefreshing(false)
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [])

  return (
    <ThemedView style={styles.container} safe={true}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText title={true} style={styles.heading}>
          Forum Feed
        </ThemedText>

        <ThemedButton
          onPress={async () => {
            const { data } = await supabase.auth.getUser()
            if (data?.user) setShowCreateModal(true)
            else alert("You must be logged in to post.")
          }}
        >
          <ThemedText style={styles.buttonText}>Create Post</ThemedText>
        </ThemedButton>

        <Spacer />

        {loading && <ThemedText>Loading posts...</ThemedText>}

        {!loading && posts.length === 0 && (
          <ThemedText>No posts yet. Be the first to create one!</ThemedText>
        )}

        {posts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <Image
                source={{ uri: "https://cdn-icons-png.flaticon.com/512/149/149071.png" }}
                style={styles.avatar}
              />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.username}>
                  {post.users?.username || "Anonymous"}
                </ThemedText>
                <ThemedText style={styles.date}>
                  {new Date(post.created_at).toLocaleString()}
                </ThemedText>
              </View>
            </View>

            {post.content && <ThemedText style={styles.postContent}>{post.content}</ThemedText>}
            {post.image_url && <Image source={{ uri: post.image_url }} style={styles.postImage} />}
          </View>
        ))}
      </ScrollView>

      {/* ✅ Create Post Modal */}
      <CreatePost
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPostCreated={fetchPosts}
      />
    </ThemedView>
  )
}

export default Forum

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  heading: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 12,
    color: "#222",
  },
  buttonText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
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
})
