import {
  Keyboard,
  StyleSheet,
  TouchableWithoutFeedback,
  Alert,
  View,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

import AuthLayout from "../../components/AuthLayout";
import ThemedText from "../../components/ThemedText";
import ThemedButton from "../../components/ThemedButton";
import ThemedTextInput from "../../components/ThemedTextInput";
import { useTheme } from "../../contexts/ThemeContext";

export default function ForgotPassword() {
  const router = useRouter();
  const { theme } = useTheme();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // NEW: Google/Facebook-style inline error
  const [touched, setTouched] = useState({ email: false });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const emailLooksValid = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  const emailError = useMemo(() => {
    if (!email.trim()) return "Email is required.";
    if (!emailLooksValid) return "Enter a valid email address.";
    return "";
  }, [email, emailLooksValid]);

  const shouldShowEmailError = touched.email || submitAttempted;

  const handleReset = async () => {
    setSubmitAttempted(true);
    setTouched({ email: true });

    if (emailError) return;

    if (loading) return;
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Check your email", "We sent you a password reset link.");
      router.back(); // go back to login
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <AuthLayout>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Image
                source={require("../../assets/img/FDLogoBlack.png")}
                style={styles.logo}
                resizeMode="contain"
                accessible
                accessibilityRole="image"
                accessibilityLabel="FloatDr Forum logo"
              />
              <ThemedText style={styles.headerSubtitle}>
                Reset your password
              </ThemedText>
            </View>


            {/* Form */}
            <View style={styles.form}>
              <ThemedTextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                onBlur={() =>
                  setTouched((prev) => ({ ...prev, email: true }))
                }
                keyboardType="email-address"
                autoCapitalize="none"
                textContentType="emailAddress"
                autoComplete="email"
                accessibilityLabel="Email"
                accessibilityHint={
                  shouldShowEmailError && emailError ? emailError : undefined
                }
                style={[
                  styles.input,
                  shouldShowEmailError && emailError
                    ? [styles.inputError, { borderColor: theme.danger }]
                    : null,
                ]}
              />

              {/* Inline error under the field (Google/Facebook style) */}
              {shouldShowEmailError && !!emailError && (
                <ThemedText
                  style={[styles.fieldError, { color: theme.danger }]}
                  accessibilityLiveRegion="polite"
                >
                  {emailError}
                </ThemedText>
              )}

              <ThemedButton
                onPress={handleReset}
                disabled={loading || !!emailError}
                style={styles.primaryButton}
                accessibilityRole="button"
                accessibilityLabel="Send reset link"
              >
                <ThemedText style={styles.primaryButtonText}>
                  {loading ? "Sending…" : "Send reset link"}
                </ThemedText>
              </ThemedButton>

              {/* Secondary actions */}
              <View style={styles.secondaryRow}>
                <Pressable
                  onPress={() => router.back()}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <ThemedText style={[styles.secondaryLink, { color: theme.primary }]}>
                    Back to login
                  </ThemedText>
                </Pressable>
              </View>
            </View>

            {/* Footer helper */}
            <View style={styles.footer}>
              <ThemedText muted style={styles.footerText}>
                If you don’t see the email, check your spam folder.
              </ThemedText>
            </View>
          </ScrollView>
        </AuthLayout>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingBottom: 20,
  },

  header: {
    alignItems: "center",
    marginTop: 50,
  },

  logo: {
    width: 280,
    height: 120,
  },

  headerSubtitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "600",
  },

  form: {
    marginTop: 28,
  },

  input: {
    marginBottom: 16,
  },

  inputError: {
    borderWidth: 1,
  },

  fieldError: {
    fontSize: 12,
    marginTop: -10,
    marginBottom: 12,
  },

  primaryButton: {
    marginTop: 6,
  },

  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },

  secondaryRow: {
    marginTop: 14,
    alignItems: "center",
  },

  secondaryLink: {
    fontWeight: "600",
  },

  footer: {
    marginTop: 28,
    marginBottom: 20,
    alignItems: "center",
  },

  footerText: {
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 18,
    lineHeight: 18,
  },
});
