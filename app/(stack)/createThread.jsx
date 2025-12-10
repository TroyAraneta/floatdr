import { useState, useEffect } from "react";
import {
  StyleSheet,
  TextInput,
  Image,
  TouchableOpacity,
  Alert,
  View,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy"; // ✅ modern import
import { Buffer } from "buffer";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import ThemedText from "../../components/ThemedText";
import ThemedButton from "../../components/ThemedButton";
import Ionicons from "@expo/vector-icons/Ionicons";

const CreateThread = () => {
  const router = useRouter();
  const { category: routeCategory } = useLocalSearchParams();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categoryId, setCategoryId] = useState(null);

  // ✅ Fetch category ID
  useEffect(() => {
    const fetchCategory = async () => {
      if (!routeCategory) return;
      const { data, error } = await supabase
        .from("forum_categories")
        .select("id")
        .eq("name", routeCategory)
        .single();

      if (error || !data) {
        Alert.alert("Error", `Category '${routeCategory}' not found.`);
      } else {
        setCategoryId(data.id);
      }
    };
    fetchCategory();
  }, [routeCategory]);

  // ✅ Choose Image (no crop screen)
  const handleChooseImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      return Alert.alert("Permission denied", "Please allow access to photos.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // ✅ Upload Image to Supabase
  const uploadImage = async (uri, userId) => {
    if (!uri) throw new Error("No image selected");
    try {
      setUploading(true);

      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) throw new Error("File does not exist");

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileExt = uri.split(".").pop() || "jpg";
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // ✅ Use base64 upload with proper options
      const { data, error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(fileName, base64, {
          contentType: `image/${fileExt}`,
          upsert: false,
          // 👇 This flag tells Supabase it's a base64 string, not binary
          base64: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("post-images")
        .getPublicUrl(fileName);

      return publicData.publicUrl;
    } catch (err) {
      Alert.alert("Upload Failed", err.message);
      console.error("Upload error:", err);
      return null;
    } finally {
      setUploading(false);
    }
  };

  // ✅ Create Thread
  const handleCreateThread = async () => {
    if (!title.trim())
      return Alert.alert("Missing Question", "Please enter your discussion topic.");
    if (!content.trim() && !image)
      return Alert.alert("Empty Post", "Add some thoughts or attach an image.");
    if (!categoryId) return Alert.alert("Error", "Invalid category.");

    try {
      setLoading(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user)
        return Alert.alert("Error", "You must be logged in.");

      const imageUrl = image ? await uploadImage(image, user.id) : null;

      const { error: insertError } = await supabase.from("forum_threads").insert([
        {
          category_id: categoryId,
          user_id: user.id,
          title,
          content,
          image_url: imageUrl,
          created_at: new Date(),
        },
      ]);

      if (insertError) throw insertError;

      Alert.alert("Posted!", "Your float discussion has been created 🩵");
      router.replace("/(dashboard)/forum");
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setTitle("");
      setContent("");
      setImage(null);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f0f8fb" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* 🔙 Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push("/(dashboard)/forum")}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#0a84ff" />
          </TouchableOpacity>
          <ThemedText title style={styles.headerTitle}>
            Create Post
          </ThemedText>
        </View>

        {/* 🩵 Card */}
        <View style={styles.card}>
          <View style={styles.categoryPill}>
            <Ionicons name="pricetag-outline" size={16} color="#0a84ff" />
            <ThemedText style={styles.categoryText}>
              {routeCategory || "Float Discussions"}
            </ThemedText>
          </View>

          {/* 📝 Title */}
          <TextInput
            style={styles.questionInput}
            placeholder="Start a discussion about float therapy..."
            placeholderTextColor="#666"
            multiline
            value={title}
            onChangeText={setTitle}
          />

          {/* 🧠 Content */}
          <TextInput
            style={styles.detailsInput}
            placeholder="Share your float experience, thoughts, or questions..."
            placeholderTextColor="#999"
            multiline
            value={content}
            onChangeText={setContent}
          />

          {/* 🖼️ Image Preview */}
          {image && (
            <View style={styles.imageBox}>
              <Image source={{ uri: image }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setImage(null)}
              >
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {uploading && (
            <View style={styles.uploading}>
              <ActivityIndicator size="small" color="#0a84ff" />
              <ThemedText style={{ marginLeft: 8 }}>Uploading image...</ThemedText>
            </View>
          )}

          {/* ➕ Add Image */}
          {!image && (
            <TouchableOpacity onPress={handleChooseImage} style={styles.addImageRow}>
              <Ionicons name="image-outline" size={20} color="#0a84ff" />
              <ThemedText style={styles.addImageText}>Add Photo</ThemedText>
            </TouchableOpacity>
          )}

          {/* 🚀 Post Button */}
          <View style={styles.submitBox}>
            <ThemedButton
              onPress={handleCreateThread}
              disabled={
                !title.trim() || (!content.trim() && !image) || loading || uploading
              }
              style={[
                styles.postButton,
                (!title.trim() || (!content.trim() && !image)) && { opacity: 0.6 },
              ]}
            >
              <ThemedText style={styles.postText}>
                {loading ? "Posting..." : "Post Discussion"}
              </ThemedText>
            </ThemedButton>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CreateThread;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 55,
    paddingBottom: 8,
  },
  backButton: {
    marginRight: 10,
    padding: 4,
  },
  headerTitle: {
    fontWeight: "700",
    fontSize: 22,
    color: "#1a1a1a",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
    marginHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#e3f2fd",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  categoryText: {
    marginLeft: 6,
    color: "#0a84ff",
    fontWeight: "600",
  },
  questionInput: {
    backgroundColor: "#f4f8fa",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: "#050505",
  },
  detailsInput: {
    backgroundColor: "#f4f8fa",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#050505",
    marginTop: 10,
    minHeight: 100,
    textAlignVertical: "top",
  },
  imageBox: {
    position: "relative",
    marginTop: 12,
    borderRadius: 10,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: 220,
  },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 14,
    padding: 4,
  },
  uploading: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  addImageRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },
  addImageText: {
    color: "#0a84ff",
    marginLeft: 6,
    fontWeight: "600",
  },
  submitBox: {
    marginTop: 24,
  },
  postButton: {
    backgroundColor: "#0a84ff",
    borderRadius: 10,
    paddingVertical: 12,
  },
  postText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
  },
});
