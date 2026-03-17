import { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { supabase } from "../../lib/supabase";
import { useTheme } from "../../contexts/ThemeContext";
import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";
import ThemedCard from "../../components/ThemedCard";
import ThemedTextInput from "../../components/ThemedTextInput";
import ThemedButton from "../../components/ThemedButton";
import Spacer from "../../components/Spacer";

const REPORT_REASONS = [
  "Spam",
  "Harassment",
  "Misinformation",
  "Inappropriate content",
  "Other",
];

function normalizeParam(value) {
  if (Array.isArray(value)) return value[0] || "";
  return (value || "").toString();
}

export default function ReportThread() {
  const router = useRouter();
  const { theme } = useTheme();
  const params = useLocalSearchParams();

  const threadId = normalizeParam(params.threadId).trim();
  const threadTitle = normalizeParam(params.threadTitle).trim();

  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return !!threadId && !!reason && !submitting;
  }, [threadId, reason, submitting]);

  const handleSubmit = async () => {
    if (submitting) return;

    if (!threadId) {
      Alert.alert("Missing thread", "This post can't be reported right now.");
      return;
    }

    if (!reason) {
      Alert.alert("Select a reason", "Please choose why you're reporting this post.");
      return;
    }

    try {
      setSubmitting(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert("Login required", "Please log in to submit a report.");
        router.replace("/(auth)/login");
        return;
      }

      const payload = {
        thread_id: threadId,
        reporter_id: user.id,
        reason,
        notes: notes.trim() || null,
      };

      const { error } = await supabase.from("moderation_reports").insert(payload);
      if (error) throw error;

      Alert.alert("Report submitted", "Thank you. We'll review this post.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (err) {
      console.error("Report thread error:", err?.message || err);
      Alert.alert("Unable to submit report", err?.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={[styles.backButton, { backgroundColor: theme.surface }]}
            >
              <Ionicons name="arrow-back" size={18} color={theme.iconMuted} />
            </Pressable>

            <ThemedText title style={[styles.headerTitle, { color: theme.title }]}>
              Report Post
            </ThemedText>

            <View style={styles.headerSpacer} />
          </View>

          <Spacer height={16} />

          <ThemedCard
            style={[
              styles.card,
              { backgroundColor: theme.surface, shadowColor: theme.shadow },
            ]}
          >
            <ThemedText style={[styles.introTitle, { color: theme.title }]}>
              Tell us why you're reporting this post
            </ThemedText>
            <ThemedText muted style={[styles.introBody, { color: theme.textMuted }]}>
              Choose the reason that best fits. Add extra details if they would help.
            </ThemedText>

            {!!threadTitle && (
              <>
                <Spacer height={12} />
                <View
                  style={[
                    styles.threadInfo,
                    { backgroundColor: theme.uiBackground, borderColor: theme.navBackground },
                  ]}
                >
                  <ThemedText style={[styles.threadLabel, { color: theme.textMuted }]}>
                    Post
                  </ThemedText>
                  <ThemedText style={[styles.threadTitleText, { color: theme.text }]}>
                    {threadTitle}
                  </ThemedText>
                </View>
              </>
            )}

            <Spacer height={16} />

            <ThemedText style={[styles.sectionLabel, { color: theme.title }]}>
              Reason
            </ThemedText>
            <Spacer height={10} />

            <View style={styles.reasonList}>
              {REPORT_REASONS.map((item) => {
                const selected = reason === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setReason(item)}
                    style={[
                      styles.reasonChip,
                      {
                        backgroundColor: selected ? theme.primary : theme.uiBackground,
                        borderColor: selected ? theme.primary : theme.navBackground,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.reasonChipText,
                        { color: selected ? "#fff" : theme.text },
                      ]}
                    >
                      {item}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <Spacer height={18} />

            <ThemedText style={[styles.sectionLabel, { color: theme.title }]}>
              Extra details
            </ThemedText>
            <Spacer height={8} />

            <ThemedTextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add anything else that would help our review..."
              multiline
              textAlignVertical="top"
              style={styles.notesInput}
            />

            <Spacer height={18} />

            <ThemedButton
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={[
                styles.submitButton,
                { backgroundColor: canSubmit ? theme.primary : theme.uiBackground },
              ]}
            >
              {submitting ? (
                <View style={styles.submittingRow}>
                  <ActivityIndicator size="small" color="#fff" />
                  <ThemedText style={styles.submitText}>Submitting...</ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.submitText}>Submit Report</ThemedText>
              )}
            </ThemedButton>
          </ThemedCard>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: 20,
    paddingBottom: 80,
  },
  headerRow: {
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
    fontSize: 22,
    fontWeight: "800",
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  card: {
    borderRadius: 18,
    padding: 16,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  introBody: {
    marginTop: 6,
    lineHeight: 20,
  },
  threadInfo: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  threadLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  threadTitleText: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "600",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  reasonList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  reasonChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  reasonChipText: {
    fontSize: 14,
    fontWeight: "700",
  },
  notesInput: {
    minHeight: 120,
  },
  submitButton: {
    borderRadius: 14,
  },
  submittingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  submitText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
});
