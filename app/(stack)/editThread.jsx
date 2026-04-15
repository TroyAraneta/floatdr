import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Buffer } from "buffer";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "../../lib/supabase";
import { useTheme } from "../../contexts/ThemeContext";
import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";
import ThemedCard from "../../components/ThemedCard";
import ThemedButton from "../../components/ThemedButton";
import ThemedTextInput from "../../components/ThemedTextInput";
import Spacer from "../../components/Spacer";
import useAdminStatus from "../../hooks/useAdminStatus";

const MAX_TITLE = 120;
const MAX_BODY = 5000;
const POST_IMAGES_BUCKET = "post-images";

function normalize(v) {
  return (v ?? "").toString();
}

function extractStoragePathFromPublicUrl(url) {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${POST_IMAGES_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const path = url.slice(idx + marker.length);
  return path ? decodeURIComponent(path) : null;
}

function getExt(uri) {
  const safe = (uri || "").split("?")[0];
  const rawExt = safe.split(".").pop()?.toLowerCase() || "jpg";
  return rawExt === "jpeg" ? "jpg" : rawExt;
}

export default function EditThread() {
  const router = useRouter();
  const { theme } = useTheme();
  const params = useLocalSearchParams();

  const threadId = Array.isArray(params.threadId)
    ? params.threadId[0]
    : params.threadId;
  const threadIdStr = normalize(threadId).trim();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);

  const [currentUserId, setCurrentUserId] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const { isAdmin, loading: adminLoading } = useAdminStatus();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const original = useRef({ title: "", content: "", imageUrl: "" });

  const navigateToForum = useCallback(() => {
    router.replace("/(dashboard)/forum");
  }, [router]);

  const hasChanges = useMemo(() => {
    return (
      normalize(title).trim() !== normalize(original.current.title).trim() ||
      normalize(content).trim() !== normalize(original.current.content).trim() ||
      normalize(imageUrl).trim() !== normalize(original.current.imageUrl).trim()
    );
  }, [title, content, imageUrl]);

  const canEdit = isOwner;

  const canSave = useMemo(() => {
    if (!canEdit) return false;
    if (saving || uploading || deletingPost) return false;

    const t = normalize(title).trim();
    const b = normalize(content).trim();

    if (!t) return false;
    if (t.length > MAX_TITLE || b.length > MAX_BODY) return false;

    return hasChanges;
  }, [canEdit, saving, uploading, deletingPost, title, content, hasChanges]);

  const confirmDiscardIfNeeded = useCallback(
    (onDiscard) => {
      if (!hasChanges || saving || uploading || deletingPost) {
        onDiscard?.();
        return;
      }

      Alert.alert(
        "Discard changes?",
        "You have unsaved edits. If you leave now, your changes will be lost.",
        [
          { text: "Keep editing", style: "cancel" },
          { text: "Discard", style: "destructive", onPress: () => onDiscard?.() },
        ]
      );
    },
    [hasChanges, saving, uploading, deletingPost]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);

      if (!threadIdStr) {
        Alert.alert("Error", "Missing thread ID.");
        navigateToForum();
        return;
      }

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        Alert.alert("Login required", "Please log in again.");
        router.replace("/(auth)/login");
        return;
      }

      setCurrentUserId(user.id);

      const { data: thread, error: threadErr } = await supabase
        .from("forum_threads")
        .select("id, title, body, image_url, author_id")
        .eq("id", threadIdStr)
        .single();

      if (threadErr) throw threadErr;

      const safeTitle = normalize(thread?.title);
      const safeBody = normalize(thread?.body);
      const safeImageUrl = normalize(thread?.image_url);

      setIsOwner(user.id === thread?.author_id);
      setTitle(safeTitle);
      setContent(safeBody);
      setImageUrl(safeImageUrl);

      original.current = {
        title: safeTitle,
        content: safeBody,
        imageUrl: safeImageUrl,
      };
    } catch (err) {
      console.error("EditThread load error:", err?.message || err);
      Alert.alert("Error", "Failed to load thread.");
      navigateToForum();
    } finally {
      setLoading(false);
    }
  }, [navigateToForum, router, threadIdStr]);

  useEffect(() => {
    load();
  }, [load]);

  const uploadPickedImage = useCallback(
    async (uri) => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Not logged in.");
      }

      const cleanUri = uri.split("?")[0];
      const storedExt = getExt(cleanUri);
      const normalizedExt = storedExt === "jpg" ? "jpeg" : storedExt;
      const fileName = `${Date.now()}.${storedExt}`;
      const filePath = `${threadIdStr}/${fileName}`;
      const mimeType = `image/${normalizedExt}`;

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const binary = Buffer.from(base64, "base64");

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(POST_IMAGES_BUCKET)
        .upload(filePath, binary, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadErr) {
        console.log(
          "EditThread storage upload error:",
          JSON.stringify({ uploadData, uploadErr }, null, 2)
        );
        throw uploadErr;
      }

      const { data } = supabase.storage
        .from(POST_IMAGES_BUCKET)
        .getPublicUrl(filePath);

      if (!data?.publicUrl) {
        throw new Error("Failed to resolve public URL.");
      }

      return data.publicUrl;
    },
    [threadIdStr]
  );

  const handleReplacePhoto = useCallback(async () => {
    if (!canEdit || saving || uploading || deletingPost) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.length) return;

      setUploading(true);
      const publicUrl = await uploadPickedImage(result.assets[0].uri);
      setImageUrl(publicUrl);
    } catch (err) {
      console.error("Replace photo error:", err?.message || err);
      Alert.alert("Error", err?.message || "Failed to replace photo.");
    } finally {
      setUploading(false);
    }
  }, [canEdit, saving, uploading, deletingPost, uploadPickedImage]);

  const handleRemovePhoto = useCallback(async () => {
    if (!canEdit || saving || uploading || deletingPost || !imageUrl) return;
    setImageUrl("");
  }, [canEdit, saving, uploading, deletingPost, imageUrl]);

  const handleSave = useCallback(async () => {
    if (!canEdit) {
      Alert.alert("Not allowed", "Only the post owner can edit this post.");
      return;
    }

    const t = normalize(title).trim();
    const b = normalize(content).trim();

    if (!t) {
      Alert.alert("Missing fields", "Title is required.");
      return;
    }

    try {
      setSaving(true);

      const previousImageUrl = normalize(original.current.imageUrl).trim();
      const nextImageUrl = normalize(imageUrl).trim();

      const { error } = await supabase
        .from("forum_threads")
        .update({
          title: t,
          body: b,
          image_url: nextImageUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", threadIdStr);

      if (error) throw error;

      const previousPath = extractStoragePathFromPublicUrl(previousImageUrl);
      const nextPath = extractStoragePathFromPublicUrl(nextImageUrl);

      if (previousPath && previousPath !== nextPath) {
        const { error: removeErr } = await supabase.storage
          .from(POST_IMAGES_BUCKET)
          .remove([previousPath]);

        if (removeErr) {
          console.warn("Old image cleanup warning:", removeErr.message);
        }
      }

      original.current = {
        ...original.current,
        title: t,
        content: b,
        imageUrl: nextImageUrl,
      };

      Alert.alert("Saved", "Post updated.");
      navigateToForum();
    } catch (err) {
      console.error("Save edit error:", err?.message || err);
      Alert.alert("Error", err?.message || "Failed to save post.");
    } finally {
      setSaving(false);
    }
  }, [canEdit, title, content, imageUrl, threadIdStr, navigateToForum]);

  const handleDeletePost = useCallback(() => {
    if (!isAdmin || adminLoading || !threadIdStr || deletingPost) return;

    Alert.alert("Delete post?", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setDeletingPost(true);

            const { error } = await supabase.rpc("delete_forum_thread_cascade", {
              p_thread_id: threadIdStr,
            });

            if (error) throw error;

            Alert.alert("Deleted", "Post deleted.");
            navigateToForum();
          } catch (err) {
            console.error("Admin delete error:", err?.message || err);
            Alert.alert("Error", err?.message || "Failed to delete post.");
          } finally {
            setDeletingPost(false);
          }
        },
      },
    ]);
  }, [isAdmin, adminLoading, threadIdStr, deletingPost, navigateToForum]);

  if (loading) {
    return (
      <ThemedView style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.icon} size="large" />
      </ThemedView>
    );
  }

  const titleCount = normalize(title).length;
  const bodyCount = normalize(content).length;
  const busy = saving || uploading || deletingPost;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => confirmDiscardIfNeeded(navigateToForum)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
            accessibilityHint="Returns to the forum screen"
            style={[styles.backButton, { backgroundColor: theme.surface }]}
          >
            <Ionicons name="arrow-back" size={18} color={theme.iconMuted} />
          </Pressable>

          <ThemedText title style={[styles.headerTitle, { color: theme.icon }]}>
            Edit post
          </ThemedText>

          <View style={styles.headerRightSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!canEdit && (
            <>
              <ThemedCard
                style={[
                  styles.noticeCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.uiBackground,
                    shadowColor: theme.shadow,
                  },
                ]}
              >
                <View style={styles.noticeRow}>
                  <View
                    style={[
                      styles.noticeIcon,
                      { backgroundColor: theme.uiBackground },
                    ]}
                  >
                    <Ionicons name="lock-closed" size={16} color={theme.iconMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontWeight: "900", color: theme.title }}>
                      You can't edit this post
                    </ThemedText>
                    <ThemedText
                      muted
                      style={{ color: theme.textMuted, marginTop: 2 }}
                    >
                      Only the post owner can edit title, body, and photo.
                    </ThemedText>
                  </View>
                </View>
              </ThemedCard>
              <Spacer height={12} />
            </>
          )}

          {isAdmin && !adminLoading && (
            <>
              <ThemedButton
                onPress={handleDeletePost}
                disabled={busy}
                style={[styles.deleteBtn, { backgroundColor: theme.warning }]}
              >
                <ThemedText style={styles.deleteText}>
                  {deletingPost ? "Deleting..." : "Delete Post (Admin)"}
                </ThemedText>
              </ThemedButton>
              <Spacer height={12} />
            </>
          )}

          <ThemedCard
            style={[
              styles.card,
              { backgroundColor: theme.surface, shadowColor: theme.shadow },
            ]}
          >
            <ThemedText
              muted
              style={[styles.sectionLabel, { color: theme.textMuted }]}
            >
              POST
            </ThemedText>

            <Spacer height={10} />

            <View style={styles.labelRow}>
              <ThemedText style={[styles.label, { color: theme.title }]}>
                Title
              </ThemedText>
              <ThemedText
                muted
                style={{
                  color: titleCount > MAX_TITLE ? theme.warning : theme.textMuted,
                }}
              >
                {titleCount}/{MAX_TITLE}
              </ThemedText>
            </View>

            <ThemedTextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Write a title..."
              autoCapitalize="sentences"
              editable={!busy && canEdit}
              style={styles.input}
            />

            <Spacer height={12} />

            <View style={styles.labelRow}>
              <ThemedText style={[styles.label, { color: theme.title }]}>
                Body
              </ThemedText>
              <ThemedText
                muted
                style={{
                  color: bodyCount > MAX_BODY ? theme.warning : theme.textMuted,
                }}
              >
                {bodyCount}/{MAX_BODY}
              </ThemedText>
            </View>

            <ThemedTextInput
              value={content}
              onChangeText={setContent}
              placeholder="What's on your mind?"
              multiline
              textAlignVertical="top"
              editable={!busy && canEdit}
              style={[styles.input, styles.textarea]}
            />

            <Spacer height={12} />

            <ThemedText style={[styles.label, { color: theme.title }]}>
              Photo
            </ThemedText>
            <Spacer height={8} />

            {imageUrl ? (
              <>
                <Image
                  source={{ uri: imageUrl }}
                  style={[
                    styles.imagePreview,
                    { backgroundColor: theme.uiBackground },
                  ]}
                  resizeMode="cover"
                />

                <Spacer height={10} />

                <View style={styles.imageActionsRow}>
                  <ThemedButton
                    onPress={handleReplacePhoto}
                    disabled={!canEdit || busy}
                    style={[
                      styles.imageActionBtn,
                      {
                        backgroundColor:
                          canEdit && !busy ? theme.icon : theme.uiBackground,
                      },
                    ]}
                  >
                    <ThemedText style={styles.actionText}>
                      {uploading ? "Uploading..." : "Replace photo"}
                    </ThemedText>
                  </ThemedButton>

                  <ThemedButton
                    onPress={handleRemovePhoto}
                    disabled={!canEdit || busy}
                    style={[
                      styles.imageActionBtn,
                      { backgroundColor: theme.uiBackground },
                    ]}
                  >
                    <ThemedText style={[styles.actionText, { color: theme.text }]}>
                      Remove photo
                    </ThemedText>
                  </ThemedButton>
                </View>
              </>
            ) : (
              <>
                <View
                  style={[
                    styles.imagePlaceholder,
                    {
                      backgroundColor: theme.uiBackground,
                      borderColor: theme.navBackground,
                    },
                  ]}
                >
                  <Ionicons name="image-outline" size={26} color={theme.iconMuted} />
                  <ThemedText
                    muted
                    style={{ color: theme.textMuted, marginTop: 6 }}
                  >
                    No photo attached
                  </ThemedText>
                </View>

                <Spacer height={10} />

                <ThemedButton
                  onPress={handleReplacePhoto}
                  disabled={!canEdit || busy}
                  style={[
                    styles.addPhotoBtn,
                    {
                      backgroundColor:
                        canEdit && !busy ? theme.icon : theme.uiBackground,
                    },
                  ]}
                >
                  <ThemedText style={styles.actionText}>
                    {uploading ? "Uploading..." : "Add Photo"}
                  </ThemedText>
                </ThemedButton>
              </>
            )}

            <Spacer height={14} />

            <ThemedButton
              onPress={handleSave}
              disabled={!canSave}
              style={[
                styles.saveBtn,
                { backgroundColor: canSave ? theme.icon : theme.uiBackground },
              ]}
            >
              {saving ? (
                <View style={styles.savingRow}>
                  <ActivityIndicator color="#fff" />
                  <ThemedText style={styles.saveText}>Saving...</ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.saveText}>
                  {hasChanges ? "Save changes" : "Saved"}
                </ThemedText>
              )}
            </ThemedButton>
          </ThemedCard>

          <Spacer height={70} />
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "left",
  },
  headerRightSpacer: {
    width: 40,
    height: 40,
  },
  container: {
    padding: 16,
    paddingBottom: 60,
    flexGrow: 1,
  },
  noticeCard: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  noticeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  noticeIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    borderRadius: 14,
  },
  deleteText: {
    color: "#fff",
    fontWeight: "900",
  },
  card: {
    borderRadius: 18,
    padding: 14,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "900",
  },
  input: {},
  textarea: {
    minHeight: 160,
  },
  imagePreview: {
    width: "100%",
    height: 220,
    borderRadius: 12,
  },
  imageActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  imageActionBtn: {
    borderRadius: 12,
    flex: 1,
  },
  imagePlaceholder: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 130,
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoBtn: {
    borderRadius: 12,
  },
  actionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  saveBtn: {
    borderRadius: 14,
  },
  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  saveText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
});