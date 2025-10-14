import { useState } from "react"
import {
  StyleSheet,
  TextInput,
  Image,
  TouchableOpacity,
  Alert,
  View,
  Modal,
  ActivityIndicator,
} from "react-native"
import * as ImagePicker from "expo-image-picker"
import * as FileSystem from "expo-file-system/legacy" // ✅ Legacy import for Expo SDK 54+
import { Buffer } from "buffer"
import { supabase } from "../../lib/supabase"
import ThemedText from "../../components/ThemedText"
import ThemedButton from "../../components/ThemedButton"

const CreatePost = ({ visible, onClose, onPostCreated }) => {
  const [content, setContent] = useState("")
  const [image, setImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  // ✅ Image picker
  const handleChooseImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("Permission Denied", "We need access to your photos to upload an image.")
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [ImagePicker.MediaType.IMAGE],
      allowsEditing: true,
      quality: 0.8,
    })

    if (!result.canceled) {
      setImage(result.assets[0].uri)
    }
  }

  // ✅ Upload image to Supabase Storage
  const uploadImage = async (uri, userId) => {
    try {
      setUploading(true)

      const fileInfo = await FileSystem.getInfoAsync(uri)
      if (!fileInfo.exists) throw new Error("File does not exist")

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      })
      const binary = Buffer.from(base64, "base64")

      const fileExt = uri.split(".").pop() || "jpg"
      const fileName = `${userId}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(fileName, binary, {
          contentType: "image/jpeg",
          upsert: false,
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from("post-images").getPublicUrl(fileName)
      return data.publicUrl
    } catch (error) {
      console.error("Upload error:", error)
      Alert.alert("Image Upload Failed", error.message)
      return null
    } finally {
      setUploading(false)
    }
  }

  // ✅ Handle post submission
  const handlePost = async () => {
    if (!content.trim() && !image) {
      Alert.alert("Empty Post", "Please write something or attach an image.")
      return
    }

    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("You must be logged in to create a post.")

      let imageUrl = null
      if (image) imageUrl = await uploadImage(image, user.id)

      const { error } = await supabase.from("forums").insert([
        {
          user_id: user.id,
          content,
          image_url: imageUrl,
        },
      ])

      if (error) throw error

      Alert.alert("Posted!", "Your post has been created successfully 🎉")
      setContent("")
      setImage(null)
      onClose()
      onPostCreated?.()
    } catch (error) {
      Alert.alert("Error", error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ThemedText title={true} style={{ textAlign: "center", marginBottom: 10 }}>
            Create Post
          </ThemedText>

          <TextInput
            style={styles.input}
            placeholder="What's on your mind?"
            placeholderTextColor="#999"
            multiline
            value={content}
            onChangeText={setContent}
          />

          {image && <Image source={{ uri: image }} style={styles.previewImage} />}

          {uploading && (
            <View style={styles.uploading}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <ThemedText style={{ marginLeft: 6 }}>Uploading image...</ThemedText>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity onPress={handleChooseImage}>
              <Image
                source={{ uri: "https://cdn-icons-png.flaticon.com/512/685/685655.png" }}
                style={styles.imageIcon}
              />
            </TouchableOpacity>

            <ThemedButton onPress={handlePost} disabled={loading || uploading}>
              <ThemedText style={styles.postButtonText}>
                {loading ? "Posting..." : "Post"}
              </ThemedText>
            </ThemedButton>

            <ThemedButton onPress={onClose} style={styles.cancelButton}>
              <ThemedText style={styles.cancelText}>Cancel</ThemedText>
            </ThemedButton>
          </View>
        </View>
      </View>
    </Modal>
  )
}

export default CreatePost

// 🎨 STYLES
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    width: "90%",
  },
  input: {
    backgroundColor: "#f2f3f5",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: "#000",
    minHeight: 100,
    textAlignVertical: "top",
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginTop: 10,
  },
  uploading: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  imageIcon: {
    width: 30,
    height: 30,
    tintColor: "#4CAF50",
  },
  postButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "#ccc",
  },
  cancelText: {
    color: "#000",
    fontWeight: "bold",
  },
})
