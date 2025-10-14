import { useState, useEffect } from "react"
import { StyleSheet, TextInput, Alert, Image } from "react-native"
import { supabase } from "../../lib/supabase"
import Spacer from "../../components/Spacer"
import ThemedText from "../../components/ThemedText"
import ThemedView from "../../components/ThemedView"
import ThemedButton from "../../components/ThemedButton"

const Profile = () => {
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [email, setEmail] = useState("")

  // Load current user profile
  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()

      if (userError || !user) {
        Alert.alert("Error", "No user logged in.")
        setLoading(false)
        return
      }

      setEmail(user.email)

      const { data, error } = await supabase
        .from("profiles")
        .select("username, bio, avatar_url")
        .eq("id", user.id)
        .single()

      if (error && error.code !== "PGRST116") {
        Alert.alert("Error loading profile", error.message)
      } else if (data) {
        setUsername(data.username || "")
        setBio(data.bio || "")
        setAvatarUrl(data.avatar_url || "")
      }

      setLoading(false)
    }

    loadProfile()
  }, [])

  // Save profile updates
  const handleSave = async () => {
    setLoading(true)
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      Alert.alert("Error", "No user logged in.")
      setLoading(false)
      return
    }

    const updates = {
      id: user.id,
      username,
      bio,
      avatar_url: avatarUrl,
      updated_at: new Date(),
    }

    const { error } = await supabase.from("profiles").upsert(updates)
    setLoading(false)

    if (error) {
      Alert.alert("Update Failed", error.message)
    } else {
      Alert.alert("Success", "Profile updated successfully ✅")
    }
  }

  // Logout
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) Alert.alert("Logout Failed", error.message)
  }

  return (
    <ThemedView style={styles.container} safe={true}>
      <ThemedText title={true} style={styles.heading}>
        My Profile
      </ThemedText>

      <Spacer />

      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 20 }}
        />
      ) : null}

      <ThemedText>Email: {email}</ThemedText>
      <Spacer />

      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={[styles.input, { height: 100, textAlignVertical: "top" }]}
        placeholder="Bio"
        value={bio}
        onChangeText={setBio}
        multiline
      />
      <TextInput
        style={styles.input}
        placeholder="Avatar URL (optional)"
        value={avatarUrl}
        onChangeText={setAvatarUrl}
      />

      <ThemedButton onPress={handleSave} disabled={loading}>
        <ThemedText style={styles.buttonText}>
          {loading ? "Saving..." : "Save Changes"}
        </ThemedText>
      </ThemedButton>

      <Spacer height={20} />

      <ThemedButton onPress={handleLogout} style={{ backgroundColor: "#c0392b" }}>
        <ThemedText style={styles.buttonText}>Logout</ThemedText>
      </ThemedButton>
    </ThemedView>
  )
}

export default Profile

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  heading: {
    fontWeight: "bold",
    fontSize: 22,
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
})
