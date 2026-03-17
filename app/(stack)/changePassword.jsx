import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../contexts/ThemeContext";
import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";
import ThemedCard from "../../components/ThemedCard";
import ThemedTextInput from "../../components/ThemedTextInput";
import ThemedButton from "../../components/ThemedButton";
import Spacer from "../../components/Spacer";

const ChangePassword = () => {
  const router = useRouter();
  const { theme } = useTheme();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const passwordStrongEnough = useMemo(() => {
    return newPassword.length >= 8 && /\d/.test(newPassword);
  }, [newPassword]);

  const newPasswordError = useMemo(() => {
    if (!newPassword) return "New password is required.";
    if (!passwordStrongEnough) return "Use at least 8 characters and 1 number.";
    return "";
  }, [newPassword, passwordStrongEnough]);

  const confirmPasswordError = useMemo(() => {
    if (!confirmPassword) return "Please confirm your new password.";
    if (newPassword !== confirmPassword) return "Passwords do not match.";
    return "";
  }, [newPassword, confirmPassword]);

  const canSubmit =
    !saving &&
    !newPasswordError &&
    !confirmPasswordError &&
    !!newPassword &&
    !!confirmPassword;

  const handleUpdatePassword = async () => {
    setSubmitAttempted(true);
    if (!canSubmit) return;

    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      Alert.alert("Success", "Password updated successfully.");
      router.back();
    } catch (err) {
      Alert.alert(
        "Unable to update password",
        err?.message || "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const showNewPasswordError = submitAttempted && !!newPasswordError;
  const showConfirmPasswordError = submitAttempted && !!confirmPasswordError;

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
              accessibilityHint="Returns to settings"
              style={[styles.backButton, { backgroundColor: theme.surface }]}
            >
              <Ionicons name="arrow-back" size={18} color={theme.iconMuted} />
            </Pressable>

            <ThemedText title style={[styles.headerTitle, { color: theme.icon }]}>
              Change Password
            </ThemedText>

            <View style={styles.headerRightSpacer} />
          </View>

          <Spacer height={16} />

          <ThemedCard style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
            <ThemedText muted style={[styles.helperText, { color: theme.textMuted }]}>
              Enter a new password for your account.
            </ThemedText>
            <Spacer height={12} />

            <View style={styles.passwordWrapper}>
              <ThemedTextInput
                placeholder="New password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                autoComplete="password-new"
                textContentType="newPassword"
                style={[
                  styles.input,
                  showNewPasswordError ? [styles.inputError, { borderColor: theme.danger }] : null,
                ]}
              />
              <Pressable
                onPress={() => setShowNewPassword((v) => !v)}
                style={styles.eyePressable}
                hitSlop={12}
              >
                <Ionicons
                  name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color={theme.iconMuted}
                />
              </Pressable>
            </View>

            {showNewPasswordError && (
              <ThemedText style={[styles.fieldError, { color: theme.danger }]}>
                {newPasswordError}
              </ThemedText>
            )}

            <View style={styles.passwordWrapper}>
              <ThemedTextInput
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoComplete="password-new"
                textContentType="newPassword"
                style={[
                  styles.input,
                  showConfirmPasswordError
                    ? [styles.inputError, { borderColor: theme.danger }]
                    : null,
                ]}
              />
              <Pressable
                onPress={() => setShowConfirmPassword((v) => !v)}
                style={styles.eyePressable}
                hitSlop={12}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color={theme.iconMuted}
                />
              </Pressable>
            </View>

            {showConfirmPasswordError && (
              <ThemedText style={[styles.fieldError, { color: theme.danger }]}>
                {confirmPasswordError}
              </ThemedText>
            )}

            <Spacer height={8} />

            <ThemedButton
              onPress={handleUpdatePassword}
              disabled={!canSubmit}
              style={[styles.saveBtn, { backgroundColor: canSubmit ? theme.icon : theme.uiBackground }]}
            >
              <ThemedText style={styles.saveText}>
                {saving ? "Updating..." : "Update Password"}
              </ThemedText>
            </ThemedButton>
          </ThemedCard>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
};

export default ChangePassword;

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
    fontSize: 24,
    fontWeight: "700",
    textAlign: "left",
  },
  headerRightSpacer: {
    width: 40,
    height: 40,
  },
  card: {
    borderRadius: 16,
    padding: 14,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
  },
  passwordWrapper: {
    position: "relative",
  },
  input: {
    marginBottom: 12,
    paddingRight: 48,
  },
  eyePressable: {
    position: "absolute",
    right: 12,
    top: 8,
    padding: 8,
  },
  inputError: {
    borderWidth: 1,
  },
  fieldError: {
    fontSize: 12,
    marginTop: -6,
    marginBottom: 10,
  },
  saveBtn: {
    borderRadius: 14,
  },
  saveText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
});
