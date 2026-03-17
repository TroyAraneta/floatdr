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
import { useRouter, Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../contexts/ThemeContext";

import AuthLayout from "../../components/AuthLayout";
import ThemedText from "../../components/ThemedText";
import ThemedButton from "../../components/ThemedButton";
import ThemedTextInput from "../../components/ThemedTextInput";

export default function Login() {
  const router = useRouter();
  const { theme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailServerError, setEmailServerError] = useState("");
  const [touched, setTouched] = useState({ email: false });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const emailLooksValid = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  const emailError = useMemo(() => {
    if (!email.trim()) return "Email is required.";
    if (!emailLooksValid) return "Enter a valid email address.";
    return emailServerError;
  }, [email, emailLooksValid, emailServerError]);

  const shouldShowEmailError = touched.email || submitAttempted;

  const handleLogin = async () => {
    setSubmitAttempted(true);
    setTouched((prev) => ({ ...prev, email: true }));
    setEmailServerError("");
    if (!email.trim() || !emailLooksValid || !password) return;

    const normalizedEmail = email.trim().toLowerCase();

    const goToVerifyEmail = () => {
      router.replace({
        pathname: "/(auth)/verifyEmail",
        params: { email: normalizedEmail },
      });
    };

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    setLoading(false);

    if (!error) {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      const confirmedAt =
        user?.email_confirmed_at || user?.confirmed_at || null;

      if (!confirmedAt) {
        setEmailServerError(
          "Please verify your email first. Check your inbox or spam."
        );
        goToVerifyEmail();
        return;
      }

      router.replace("/(dashboard)/home");
      return;
    }

    const msg = (error?.message || "").toLowerCase();

    if (msg.includes("email not confirmed")) {
      setEmailServerError(
        "Please verify your email first. Check your inbox or spam."
      );
      goToVerifyEmail();
      return;
    }

    setEmailServerError(error?.message || "Login failed. Please try again.");
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
              <ThemedText style={styles.welcomeText}>Welcome</ThemedText>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <ThemedTextInput
                placeholder="Email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailServerError) setEmailServerError("");
                }}
                onBlur={() =>
                  setTouched((prev) => ({ ...prev, email: true }))
                }
                keyboardType="email-address"
                autoCapitalize="none"
                style={[
                  styles.input,
                  shouldShowEmailError && emailError
                    ? [styles.inputError, { borderColor: theme.danger }]
                    : null,
                ]}
                textContentType="emailAddress"
                autoComplete="email"
                accessibilityLabel="Email"
                accessibilityHint={
                  shouldShowEmailError && emailError ? emailError : undefined
                }
              />
              {shouldShowEmailError && !!emailError && (
                <ThemedText
                  style={[styles.fieldError, { color: theme.danger }]}
                  accessibilityLiveRegion="polite"
                >
                  {emailError}
                </ThemedText>
              )}

              <View style={styles.passwordWrapper}>
                <ThemedTextInput
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  style={[styles.input, styles.passwordInput]}
                  textContentType="password"
                  autoComplete="password"
                />

                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyePressable}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color={theme.iconMuted}
                  />
                </Pressable>
              </View>

              <Link href="/forgotPassword" asChild>
                <Pressable>
                  <ThemedText
                    style={[
                      styles.forgot,
                      { color: theme.primary },
                    ]}
                  >
                    Forgot password?
                  </ThemedText>
                </Pressable>
              </Link>

              <ThemedButton
                onPress={handleLogin}
                disabled={loading}
                style={styles.primaryButton}
              >
                <ThemedText style={styles.primaryButtonText}>
                  {loading ? "Signing in..." : "Sign In"}
                </ThemedText>
              </ThemedButton>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <ThemedText muted>
                Don’t have an account?
              </ThemedText>
              <Link href="/register">
                <ThemedText
                  style={[
                    styles.link,
                    { color: theme.primary },
                  ]}
                >
                  Create one
                </ThemedText>
              </Link>
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
    width: 300,
    height: 80,
  },

  welcomeText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "600",
  },

  form: {
    marginTop: 40,
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

  passwordWrapper: {
    position: "relative",
  },

  passwordInput: {
    paddingRight: 48,
  },

  eyePressable: {
    position: "absolute",
    right: 12,
    top: 10,
    padding: 8,
  },

  forgot: {
    textAlign: "right",
    fontSize: 13,
    marginBottom: 20,
  },

  primaryButton: {
    marginTop: 6,
  },

  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },

  footer: {
    marginTop: 30,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },

  link: {
    fontWeight: "600",
  },
});