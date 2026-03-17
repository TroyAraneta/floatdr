import {
  Keyboard,
  StyleSheet,
  View,
  Image,
  TouchableWithoutFeedback,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { useMemo, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../contexts/ThemeContext";

import AuthLayout from "../../components/AuthLayout";
import ThemedText from "../../components/ThemedText";
import ThemedButton from "../../components/ThemedButton";
import ThemedTextInput from "../../components/ThemedTextInput";

export default function VerifyEmail() {
  const router = useRouter();
  const { theme } = useTheme();
  const params = useLocalSearchParams();

  const initialEmail = Array.isArray(params.email) ? params.email[0] : params.email;

  const [email, setEmail] = useState((initialEmail || "").toString());
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const emailLooksValid = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  const handleResend = async () => {
    const normalized = email.trim().toLowerCase();
    setSuccessMsg("");
    setErrorMsg("");

    if (!normalized) {
      setErrorMsg("Email is required.");
      return;
    }

    if (!emailLooksValid) {
      setErrorMsg("Enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: normalized,
      });
      if (error) throw error;
      setSuccessMsg("Verification email sent. Check your inbox and spam folder.");
    } catch (err) {
      setErrorMsg(err?.message || "Could not resend verification email.");
    } finally {
      setLoading(false);
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
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Image
                source={require("../../assets/img/FDLogoBlack.png")}
                style={styles.logo}
                resizeMode="contain"
                accessible
                accessibilityRole="image"
                accessibilityLabel="FloatDr Forum logo"
              />

              <ThemedText title style={styles.title}>
                Verify your email
              </ThemedText>
              <ThemedText muted style={styles.subtitle}>
                You cannot access your account until your email is verified.
              </ThemedText>
            </View>

            <View style={styles.form}>
              <ThemedTextInput
                placeholder="Email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errorMsg) setErrorMsg("");
                  if (successMsg) setSuccessMsg("");
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                textContentType="emailAddress"
                autoComplete="email"
                style={styles.input}
              />

              {!!errorMsg && (
                <ThemedText style={[styles.errorText, { color: theme.danger }]}>
                  {errorMsg}
                </ThemedText>
              )}
              {!!successMsg && (
                <ThemedText style={[styles.successText, { color: theme.success }]}>
                  {successMsg}
                </ThemedText>
              )}

              <ThemedButton
                onPress={handleResend}
                disabled={loading}
                style={styles.primaryButton}
              >
                <ThemedText style={styles.primaryButtonText}>
                  {loading ? "Sending..." : "Resend verification email"}
                </ThemedText>
              </ThemedButton>

              <Pressable onPress={() => router.replace("/(auth)/login")}>
                <View style={styles.backRow}>
                  <Ionicons name="arrow-back" size={16} color={theme.primary} />
                  <ThemedText style={[styles.backText, { color: theme.primary }]}>
                    Back to login
                  </ThemedText>
                </View>
              </Pressable>
            </View>
          </ScrollView>
        </AuthLayout>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  title: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  form: {
    marginTop: 24,
  },
  input: {
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: -10,
    marginBottom: 12,
  },
  successText: {
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
  backRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  backText: {
    fontWeight: "600",
  },
});
