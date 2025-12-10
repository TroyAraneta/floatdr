import { useEffect, useState } from "react"
import { View, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native"
import { supabase } from "../../lib/supabase"
import ThemedText from "../../components/ThemedText"
import ThemedButton from "../../components/ThemedButton"
import { useRouter } from "expo-router"

export default function ForumIndex() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from("forum_categories").select("*").order("id", { ascending: true })
      if (!error) setCategories(data)
      setLoading(false)
    }
    fetchCategories()
  }, [])

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )

  return (
    <ScrollView style={styles.container}>
      <ThemedText title style={styles.heading}>Forum Categories</ThemedText>

      {categories.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          style={styles.categoryCard}
          onPress={() => router.push(`/forum/${cat.id}`)}
        >
          <ThemedText style={styles.catTitle}>{cat.name}</ThemedText>
          <ThemedText style={styles.catDesc}>{cat.description}</ThemedText>
        </TouchableOpacity>
      ))}

      <ThemedButton
        onPress={() => router.push("/(stack)/createPost")}
        style={{ marginTop: 20 }}
      >
        <ThemedText style={{ color: "#fff", fontWeight: "bold" }}>Create Thread</ThemedText>
      </ThemedButton>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  heading: { fontSize: 22, fontWeight: "600", marginBottom: 14 },
  categoryCard: {
    backgroundColor: "#f7f7f7",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },
  catTitle: { fontSize: 16, fontWeight: "bold", color: "#222" },
  catDesc: { fontSize: 14, color: "#666", marginTop: 4 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
})
