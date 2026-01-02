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
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/SupabaseAuthContext";
import ThemedText from "../../components/ThemedText";
import ThemedButton from "../../components/ThemedButton";
import Ionicons from "@expo/vector-icons/Ionicons";

const CreateThread = () => {
  const router = useRouter();
  const rawSlug = useLocalSearchParams().slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;

  const { user, authChecked } = useAuth();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [imageRatio, setImageRatio] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (authChecked && !user) {
      router.replace("/(tabs)/menu");
    }
  }, [authChecked, user]);

  const [category, setCategory] = useState(null);

  useEffect(() => {
    const fetchCategory = async () => {
      if (!slug) { // guard against bad navigation
        Alert.alert("Error", "Missing category.");
        router.back();
        return;
      }

      const { data, error } = await supabase
        .from("forum_categories")
        .select("id, name")
        .eq("slug", slug)
        .single();

      if (error || !data) {
        Alert.alert("Error", "Category not found.");
        return;
      }

      setCategory(data);
    };

    fetchCategory();
  }, [slug]);

  // 🖼️ Choose image
  const handleChooseImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      return Alert.alert("Permission denied", "Please allow photo access.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
        Image.getSize(
          asset.uri,
          (width, height) => {
            setImageRatio(width / height); // 👈 landscape > 1, portrait < 1
            setImage(asset.uri);
          },
          () => {
            setImage(asset.uri);
          }
        );
    }
  };

  // ☁️ Upload image to Supabase
  const uploadImage = async (uri) => {
    try {
      setUploading(true);

      const fileExt = uri.split(".").pop() || "jpg";
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const formData = new FormData();
      formData.append("file", {
        uri,
        name: fileName,
        type: `image/${fileExt}`,
      });

      const { error } = await supabase.storage
        .from("post-images")
        .upload(filePath, formData, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from("post-images")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err) {
      Alert.alert("Upload failed", err.message);
      return null;
    } finally {
      setUploading(false);
    }
  };


  // 🚀 Create thread
  const handleCreateThread = async () => {
    if (!title.trim())
      return Alert.alert("Missing title", "Please enter a discussion title.");

    if (!content.trim() && !image)
      return Alert.alert("Empty post", "Add text or an image.");

    if (!category)
      return Alert.alert("Error", "Invalid category.");

    try {
      setLoading(true);

      const imageUrl = image ? await uploadImage(image) : null;

      const { error } = await supabase.from("forum_threads").insert([
        {
          category_id: category.id,
          author_id: user.id,
          title,
          body: content,
          image_url: imageUrl,
        },
      ]);


      if (error) throw error;

      Alert.alert("Posted!", "Your discussion is live 🩵");
      router.replace("/(dashboard)/forum");
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
      setTitle("");
      setContent("");
      setImage(null);
    }
  };

  // ⛔ Wait for auth check
  if (!authChecked) return null;

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
            onPress={() => router.back()}
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
              {category?.name || "Loading..."}
            </ThemedText>
          </View>

          <TextInput
            style={styles.questionInput}
            placeholder="Start a discussion..."
            placeholderTextColor="#666"
            multiline
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={styles.detailsInput}
            placeholder="Share your thoughts..."
            placeholderTextColor="#999"
            multiline
            value={content}
            onChangeText={setContent}
          />

          {image && (
            <View style={styles.imageBox}>
              <Image
                source={{ uri: image }}
                style={[
                  styles.previewImage,
                  {
                    height: imageRatio < 1 ? 360 : 220, // 👈 taller for portrait
                  },
                ]}
                resizeMode="contain"
              />
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
              <ThemedText style={{ marginLeft: 8 }}>
                Uploading image...
              </ThemedText>
            </View>
          )}

          {!image && (
            <TouchableOpacity
              onPress={handleChooseImage}
              style={styles.addImageRow}
            >
              <Ionicons name="image-outline" size={20} color="#0a84ff" />
              <ThemedText style={styles.addImageText}>Add Photo</ThemedText>
            </TouchableOpacity>
          )}

          <View style={styles.submitBox}>
            <ThemedButton
              onPress={handleCreateThread}
              disabled={loading || uploading}
              style={styles.postButton}
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
  backButton: { marginRight: 10 },
  headerTitle: { fontSize: 22, fontWeight: "700" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 14,
    marginTop: 10,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
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
  },
  detailsInput: {
    backgroundColor: "#f4f8fa",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    minHeight: 100,
    textAlignVertical: "top",
  },
  imageBox: { marginTop: 12, borderRadius: 10, overflow: "hidden" },
  previewImage: {
    width: "100%",
  },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 14,
    padding: 4,
  },
  uploading: { flexDirection: "row", marginTop: 8 },
  addImageRow: { flexDirection: "row", marginTop: 14 },
  addImageText: { marginLeft: 6, fontWeight: "600", color: "#0a84ff" },
  submitBox: { marginTop: 24 },
  postButton: {
    backgroundColor: "#0a84ff",
    borderRadius: 10,
    paddingVertical: 12,
  },
  postText: { color: "#fff", textAlign: "center", fontWeight: "700" },
});
