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
import { useTheme } from "../../contexts/ThemeContext";
import ThemedText from "../../components/ThemedText";
import ThemedButton from "../../components/ThemedButton";
import Ionicons from "@expo/vector-icons/Ionicons";
import useMembershipStatus from "../../hooks/useMembershipStatus";
import SubscriptionModal from "../../components/SubscriptionModal";

const CreateThread = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const rawSlug = useLocalSearchParams().slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;

  const { user, loading: authLoading } = useAuth();
  const {
    isSubscribed: isMember,
    subscriptionLoading: membershipLoading,
    error: membershipError,
    refreshSubscription: refreshMembership,
  } = useMembershipStatus();

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

  const ensureMediaPermission = async () => {
    try {
      let permission = await ImagePicker.getMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (permission.granted) {
        return true;
      }

      if (permission.canAskAgain === false) {
        Alert.alert(
          "Photo access needed",
          "Photo access is currently blocked for this app. Please enable it in your phone settings.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => {
                Linking.openSettings?.();
              },
            },
          ]
        );
        return false;
      }

      Alert.alert(
        "Permission denied",
        "Please allow photo access to choose an image."
      );
      return false;
    } catch (error) {
      Alert.alert(
        "Permission error",
        error?.message || "Unable to check photo permissions."
      );
      return false;
    }
  };

  const handleChooseImage = async () => {
    const hasPermission = await ensureMediaPermission();
    if (!hasPermission) return;

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
  };

  const uploadImage = async (uri) => {
    try {
      setUploading(true);

      if (!user?.id) {
        throw new Error("Not logged in.");
      }

      const cleanUri = uri.split("?")[0];
      const rawExt = cleanUri.split(".").pop()?.toLowerCase() || "jpg";
      const normalizedExt = rawExt === "jpg" ? "jpeg" : rawExt;
      const storedExt = rawExt === "jpeg" ? "jpg" : rawExt;
      const fileName = `${Date.now()}.${storedExt}`;
      const filePath = `${user.id}/${fileName}`;
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
        console.log("CreateThread storage upload error:", JSON.stringify(error, null, 2));
        throw error;
      }

      const { data } = supabase.storage.from("post-images").getPublicUrl(filePath);

      if (!data?.publicUrl) {
        throw new Error("Failed to get public image URL.");
      }

      return data.publicUrl;
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

    try {
      setLoading(true);

      const imageUrl = image ? await uploadImage(image) : null;

      if (image && !imageUrl) {
        return;
      }

      const { error } = await supabase.from("forum_threads").insert([
        {
          category_id: category.id,
          author_id: user.id,
          title: title.trim(),
          body: content.trim(),
          image_url: imageUrl,
        },
      ]);

      if (error) {
        if (isPermissionDenied(error)) {
          await refreshMembership?.();
          Alert.alert(
            "Members-only",
            "Your membership may not be active. Please check your subscription."
          );
          return;
        }

        throw error;
      }

      Alert.alert("Posted!", "Your discussion is live.");
      router.replace("/(dashboard)/forum");
    } catch (err) {
      Alert.alert("Error", err?.message || "Unable to create post.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
      setTitle("");
      setContent("");
      setImage(null);
      setImageRatio(1);
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
