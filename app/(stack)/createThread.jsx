import { useState, useEffect, useRef, useCallback } from "react";
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
  Linking,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Buffer } from "buffer";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/SupabaseAuthContext";
import { useMembership } from "../../contexts/MembershipContext";
import { useTheme } from "../../contexts/ThemeContext";
import ThemedText from "../../components/ThemedText";
import ThemedButton from "../../components/ThemedButton";
import Ionicons from "@expo/vector-icons/Ionicons";
import SubscriptionModal from "../../components/SubscriptionModal";

const CreateThread = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const rawSlug = useLocalSearchParams().slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;

  const { user, loading: authLoading } = useAuth();
  const { isMember, loading: membershipLoading, error: membershipError, refreshMembership } =
    useMembership();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [imageRatio, setImageRatio] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [category, setCategory] = useState(null);

  const submittingRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/(auth)/login");
    }
  }, [authLoading, user, router]);

  const isPermissionDenied = (err) => {
    const msg = (err?.message || "").toLowerCase();
    return msg.includes("permission denied") || msg.includes("rls");
  };

  useEffect(() => {
    const fetchCategory = async () => {
      if (!slug) {
        Alert.alert("Error", "Missing category.");
        router.back();
        return;
      }

      if (authLoading || membershipLoading) return;
      if (!user) return;

      if (!isMember) {
        setCategory(null);
        return;
      }

      const { data, error } = await supabase
        .from("forum_categories")
        .select("id, name")
        .eq("slug", slug)
        .single();

      if (error) {
        if (isPermissionDenied(error)) {
          setCategory(null);
          return;
        }

        Alert.alert("Error", "Category not found.");
        return;
      }

      setCategory(data);
    };

    fetchCategory();
  }, [slug, authLoading, membershipLoading, user, isMember, router]);

  const handleChooseImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        Image.getSize(
          asset.uri,
          (width, height) => {
            setImageRatio(width / height);
            setImage(asset.uri);
          },
          () => {
            setImage(asset.uri);
          }
        );
      }
    } catch (error) {
      Alert.alert("Error", "Unable to open image picker.");
    }
  };

  const uploadImage = async (uri, threadId) => {
    try {
      setUploading(true);

      if (!user?.id || !threadId) {
        throw new Error("Not logged in.");
      }

      const cleanUri = uri.split("?")[0];
      const rawExt = cleanUri.split(".").pop()?.toLowerCase() || "jpg";
      const normalizedExt = rawExt === "jpg" ? "jpeg" : rawExt;
      const storedExt = rawExt === "jpeg" ? "jpg" : rawExt;
      const fileName = `${Date.now()}.${storedExt}`;
      const filePath = `${threadId}/${fileName}`;
      const mimeType = `image/${normalizedExt}`;

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const binary = Buffer.from(base64, "base64");

      const { error } = await supabase.storage
        .from("post-images")
        .upload(filePath, binary, {
          contentType: mimeType,
          upsert: false,
        });

      if (error) {
        Alert.alert(
          "Storage Upload Error",
          JSON.stringify(
            {
              message: error?.message || null,
              name: error?.name || null,
              statusCode: error?.statusCode || null,
              error: error?.error || null,
            },
            null,
            2
          )
        );
        throw error;
      }

      const { data } = supabase.storage.from("post-images").getPublicUrl(filePath);

      if (!data?.publicUrl) {
        throw new Error("Failed to get public image URL.");
      }

      return {
        publicUrl: data.publicUrl,
        filePath,
      };
    } catch (err) {
      Alert.alert("Upload failed", err?.message || "Unable to upload image.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleCreateThread = useCallback(async () => {
    if (submittingRef.current) return;

    if (!user) {
      Alert.alert("Please log in", "You must be logged in to post.");
      return;
    }

    if (membershipLoading) {
      Alert.alert("Please wait", "Checking membership status...");
      return;
    }

    if (!isMember) {
      Alert.alert(
        "Members-only",
        "You need an active membership to create a post."
      );
      return;
    }

    if (!title.trim()) {
      Alert.alert("Missing title", "Please enter a discussion title.");
      return;
    }

    if (!content.trim() && !image) {
      Alert.alert("Empty post", "Add text or an image.");
      return;
    }

    if (!category) {
      Alert.alert("Error", "Invalid category.");
      return;
    }

    submittingRef.current = true;
    let postedSuccessfully = false;

    try {
      setLoading(true);
      let uploadedFilePath = null;
      const { data: createdThread, error } = await supabase
        .from("forum_threads")
        .insert([
          {
            category_id: category.id,
            author_id: user.id,
            title: title.trim(),
            body: content.trim(),
            image_url: null,
          },
        ])
        .select("id")
        .single();

      if (error || !createdThread?.id) {
        const createError = error || new Error("Unable to create post.");

        if (isPermissionDenied(createError)) {
          await refreshMembership();
          Alert.alert(
            "Members-only",
            "Your membership may not be active. Please check your subscription."
          );
          return;
        }

        throw createError;
      }

      if (image) {
        const uploadResult = await uploadImage(image, createdThread.id);

        if (!uploadResult?.publicUrl) {
          await supabase
            .from("forum_threads")
            .delete()
            .eq("id", createdThread.id)
            .eq("author_id", user.id);
          return;
        }

        uploadedFilePath = uploadResult.filePath;

        const { error: updateError } = await supabase
          .from("forum_threads")
          .update({ image_url: uploadResult.publicUrl })
          .eq("id", createdThread.id)
          .eq("author_id", user.id);

        if (updateError) {
          if (uploadedFilePath) {
            await supabase.storage.from("post-images").remove([uploadedFilePath]);
          }
          await supabase
            .from("forum_threads")
            .delete()
            .eq("id", createdThread.id)
            .eq("author_id", user.id);
          throw updateError;
        }
      }

      postedSuccessfully = true;
      Alert.alert("Posted!", "Your discussion is live.");
      router.replace("/(dashboard)/forum");
    } catch (err) {
      Alert.alert("Error", err?.message || "Unable to create post.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
      if (postedSuccessfully) {
        setTitle("");
        setContent("");
        setImage(null);
        setImageRatio(1);
      }
    }
  }, [
    user,
    membershipLoading,
    isMember,
    title,
    content,
    image,
    category,
    router,
    refreshMembership,
  ]);

  if (authLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  if (!membershipLoading && user && !isMember) {
    return (
      <View style={[styles.loadingWrap, { paddingHorizontal: 20 }]}>
        <Ionicons name="lock-closed" size={24} color={theme.iconMuted} />
        <ThemedText style={{ marginTop: 10, fontWeight: "700" }}>
          Members-only
        </ThemedText>
        <ThemedText muted style={{ marginTop: 6, textAlign: "center" }}>
          You need an active membership to create a post.
        </ThemedText>

        {!!membershipError && (
          <ThemedText muted style={{ marginTop: 6, textAlign: "center" }}>
            We couldn't verify membership right now. Check your connection.
          </ThemedText>
        )}

        <ThemedButton
          style={[styles.postButton, { marginTop: 16 }]}
          onPress={() => setShowSubscriptionModal(true)}
        >
          <ThemedText style={styles.postText}>View Membership</ThemedText>
        </ThemedButton>

        <TouchableOpacity onPress={refreshMembership} style={{ marginTop: 12 }}>
          <ThemedText style={{ color: theme.primary, fontWeight: "600" }}>
            Retry
          </ThemedText>
        </TouchableOpacity>

        <SubscriptionModal
          visible={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          onCloseToMemberGate={() => setShowSubscriptionModal(false)}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: theme.surface }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={18} color={theme.iconMuted} />
          </TouchableOpacity>

          <ThemedText title style={styles.headerTitle}>
            Create Post
          </ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View
            style={[
              styles.categoryPill,
              { backgroundColor: theme.uiBackground },
            ]}
          >
            <Ionicons name="pricetag-outline" size={16} color={theme.primary} />
            <ThemedText
              style={[styles.categoryText, { color: theme.primary }]}
            >
              {category?.name || "Loading..."}
            </ThemedText>
          </View>

          <TextInput
            style={[
              styles.questionInput,
              { backgroundColor: theme.uiBackground, color: theme.text },
            ]}
            placeholder="Start a discussion..."
            placeholderTextColor={theme.textMuted}
            multiline
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={[
              styles.detailsInput,
              { backgroundColor: theme.uiBackground, color: theme.text },
            ]}
            placeholder="Share your thoughts..."
            placeholderTextColor={theme.textMuted}
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
                    height: imageRatio < 1 ? 360 : 220,
                  },
                ]}
                resizeMode="contain"
              />

              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => {
                  setImage(null);
                  setImageRatio(1);
                }}
              >
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {uploading && (
            <View style={styles.uploading}>
              <ActivityIndicator size="small" color={theme.primary} />
              <ThemedText style={{ marginLeft: 8, color: theme.text }}>
                Uploading image...
              </ThemedText>
            </View>
          )}

          {!image && (
            <TouchableOpacity
              onPress={handleChooseImage}
              style={styles.addImageRow}
            >
              <Ionicons name="image-outline" size={20} color={theme.primary} />
              <ThemedText
                style={[styles.addImageText, { color: theme.primary }]}
              >
                Add Photo
              </ThemedText>
            </TouchableOpacity>
          )}

          <View style={styles.submitBox}>
            <ThemedButton
              onPress={handleCreateThread}
              disabled={loading || uploading || membershipLoading || !category}
              style={[styles.postButton, { backgroundColor: theme.primary }]}
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
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 55,
    paddingBottom: 8,
  },
  backButton: {
    marginRight: 10,
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 22, fontWeight: "700" },
  card: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 14,
    marginTop: 10,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  categoryText: {
    marginLeft: 6,
    fontWeight: "600",
  },
  questionInput: {
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  detailsInput: {
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
  addImageText: { marginLeft: 6, fontWeight: "600" },
  submitBox: { marginTop: 24 },
  postButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  postText: { color: "#fff", textAlign: "center", fontWeight: "700" },
});