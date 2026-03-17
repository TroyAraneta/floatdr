import {
  StyleSheet,
  View,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { useState, useMemo, useRef } from "react";
import { useRouter, Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

import AuthLayout from "../../components/AuthLayout";
import ThemedText from "../../components/ThemedText";
import ThemedButton from "../../components/ThemedButton";
import ThemedTextInput from "../../components/ThemedTextInput";
import { useTheme } from "../../contexts/ThemeContext";

/* ---------- helpers ---------- */

const getPasswordStrength = (password) => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Za-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  return score; // 0–3
};

const strengthLabel = ["Too weak", "Weak", "Good", "Strong"];

/* ---------- screen ---------- */

export default function Register() {
  const router = useRouter();
  const submitLockRef = useRef(false);
  const { theme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Existing: used for server errors (e.g. email already registered)
  const [errorMsg, setErrorMsg] = useState("");

  // NEW: track field interaction (so we don’t show errors too early)
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirm: false,
  });

  // NEW: reveals all errors after user taps submit
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  // Existing: simple validation helpers
  const emailLooksValid = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  const passwordsMatch =
    password.length > 0 && confirm.length > 0 && password === confirm;

  // Existing: theme-based strength color
  const strengthColor = useMemo(() => {
    if (strength <= 0) return theme.danger;
    if (strength === 1) return theme.warning;
    if (strength === 2) return theme.primary;
    return theme.success;
  }, [strength, theme]);

  // NEW: field-level errors computed (Google Forms style)
  const fieldErrors = useMemo(() => {
    const errs = { email: "", password: "", confirm: "" };

    // Email
    if (!email.trim()) errs.email = "Email is required.";
    else if (!emailLooksValid) errs.email = "Enter a valid email address.";

    // Password
    if (!password) errs.password = "Password is required.";
    else if (strength < 2)
      errs.password = "Password is too weak. Use 8+ chars and a number.";

    // Confirm
    if (!confirm) errs.confirm = "Please confirm your password.";
    else if (password !== confirm) errs.confirm = "Passwords do not match.";

    return errs;
  }, [email, emailLooksValid, password, confirm, strength]);

  // NEW: should we show an error for a specific field?
  const shouldShowFieldError = (key) => touched[key] || submitAttempted;

    const handleSubmit = async () => {
    if (submitLockRef.current) return;
    if (loading) return;

    setSubmitAttempted(true);
    setErrorMsg("");
    setTouched({ email: true, password: true, confirm: true });

    const hasAnyClientError = Object.values(fieldErrors).some(Boolean);
    if (hasAnyClientError) return;

    const normalizedEmail = email.trim().toLowerCase();

    submitLockRef.current = true;
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        // OPTIONAL (recommended once deep linking is configured):
        // options: { emailRedirectTo: "YOUR_DEEPLINK_URL_HERE" },
      });

      if (error) {
        const msg = (error.message || "").toLowerCase();

        if (msg.includes("user already registered") || msg.includes("already") || msg.includes("exists")) {
          setErrorMsg("This email is already registered. Try signing in instead.");
        } else if (msg.includes("rate limit")) {
          setErrorMsg("Too many attempts. Please wait a bit and try again.");
        } else {
          setErrorMsg(error.message || "Registration failed. Please try again.");
        }
        return;
      }

      router.replace({
        pathname: "/(auth)/verifyEmail",
        params: { email: normalizedEmail },
      });
    } finally {
      setLoading(false);
      setTimeout(() => {
        submitLockRef.current = false;
      }, 1200);
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
                Create your account
              </ThemedText>
            </View>


            {/* Form */}
            <View style={styles.form}>
              {/* Email */}
              <ThemedTextInput
                placeholder="Email"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (errorMsg) setErrorMsg("");
                }}
                onBlur={() =>
                  setTouched((prev) => ({ ...prev, email: true }))
                }
                keyboardType="email-address"
                autoCapitalize="none"
                style={[
                  styles.input,
                  // NEW: subtle error border without changing ThemedTextInput defaults
                  shouldShowFieldError("email") && fieldErrors.email
                    ? [styles.inputError, { borderColor: theme.danger }]
                    : null,
                ]}
                textContentType="emailAddress"
                autoComplete="email"
                accessibilityLabel="Email"
                accessibilityHint={
                  shouldShowFieldError("email") && fieldErrors.email
                    ? fieldErrors.email
                    : undefined
                }
              />
              {/* NEW: error under field */}
              {shouldShowFieldError("email") && !!fieldErrors.email && (
                <ThemedText
                  style={[styles.fieldError, { color: theme.danger }]}
                  accessibilityLiveRegion="polite"
                >
                  {fieldErrors.email}
                </ThemedText>
              )}

              {/* Password */}
              <View style={styles.passwordWrapper}>
                <ThemedTextInput
                  placeholder="Password"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (errorMsg) setErrorMsg("");
                  }}
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, password: true }))
                  }
                  secureTextEntry={!showPassword}
                  style={[
                    styles.input,
                    styles.passwordInput,
                    // NEW: subtle error border
                    shouldShowFieldError("password") && fieldErrors.password
                      ? [styles.inputError, { borderColor: theme.danger }]
                      : null,
                  ]}
                  textContentType="newPassword"
                  autoComplete="password-new"
                  accessibilityLabel="Password"
                  accessibilityHint={
                    shouldShowFieldError("password") && fieldErrors.password
                      ? fieldErrors.password
                      : undefined
                  }
                />

                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? "Hide password" : "Show password"
                  }
                  accessibilityHint="Toggles password visibility"
                  style={styles.eyePressable}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color={theme.iconMuted}
                  />
                </Pressable>
              </View>

              {/* NEW: error under field */}
              {shouldShowFieldError("password") && !!fieldErrors.password && (
                <ThemedText
                  style={[styles.fieldError, { color: theme.danger }]}
                  accessibilityLiveRegion="polite"
                >
                  {fieldErrors.password}
                </ThemedText>
              )}

              {/* Confirm */}
              <ThemedTextInput
                placeholder="Confirm password"
                value={confirm}
                onChangeText={(t) => {
                  setConfirm(t);
                  if (errorMsg) setErrorMsg("");
                }}
                onBlur={() =>
                  setTouched((prev) => ({ ...prev, confirm: true }))
                }
                secureTextEntry={!showPassword}
                style={[
                  styles.input,
                  // NEW: subtle error border
                  shouldShowFieldError("confirm") && fieldErrors.confirm
                    ? [styles.inputError, { borderColor: theme.danger }]
                    : null,
                ]}
                textContentType="newPassword"
                autoComplete="password-new"
                accessibilityLabel="Confirm password"
                accessibilityHint={
                  shouldShowFieldError("confirm") && fieldErrors.confirm
                    ? fieldErrors.confirm
                    : undefined
                }
              />

              {/* NEW: error under field */}
              {shouldShowFieldError("confirm") && !!fieldErrors.confirm && (
                <ThemedText
                  style={[styles.fieldError, { color: theme.danger }]}
                  accessibilityLiveRegion="polite"
                >
                  {fieldErrors.confirm}
                </ThemedText>
              )}

              {/* Strength indicator (kept) */}
              {password.length > 0 && (
                <View style={styles.strengthRow}>
                  <View
                    style={[
                      styles.strengthTrack,
                      { backgroundColor: theme.uiBackground },
                    ]}
                    accessibilityRole="progressbar"
                    accessibilityLabel="Password strength"
                    accessibilityValue={{
                      min: 0,
                      max: 3,
                      now: strength,
                      text: strengthLabel[strength],
                    }}
                  >
                    <View
                      style={[
                        styles.strengthFill,
                        {
                          width: `${(strength / 3) * 100}%`,
                          backgroundColor: strengthColor,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.strengthMetaRow}>
                    <ThemedText muted style={styles.strengthText}>
                      {strengthLabel[strength]}
                    </ThemedText>

                    <ThemedText muted style={styles.strengthHint}>
                      Use 8+ chars and a number.
                    </ThemedText>
                  </View>
                </View>
              )}

              {/* Existing: server error (e.g. email already registered) */}
              {!!errorMsg && (
                <ThemedText
                  style={[styles.errorText, { color: theme.danger }]}
                  accessibilityLiveRegion="polite"
                >
                  {errorMsg}
                </ThemedText>
              )}

              <ThemedButton
                onPress={handleSubmit}
                disabled={
                  loading ||
                  strength < 2 ||
                  password !== confirm ||
                  !emailLooksValid
                }
                style={styles.primaryButton}
                accessibilityRole="button"
                accessibilityLabel="Create account"
              >
                <ThemedText style={styles.primaryButtonText}>
                  {loading ? "Creating account…" : "Create account"}
                </ThemedText>
              </ThemedButton>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.loginRow}>
                <ThemedText muted>Already have an account?</ThemedText>
                <Link href="/login">
                  <ThemedText style={[styles.link, { color: theme.primary }]}>
                    Sign in
                  </ThemedText>
                </Link>
              </View>
            </View>
          </ScrollView>
        </AuthLayout>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

/* ---------- styles ---------- */

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
    marginTop: 32,
  },

  input: {
    marginBottom: 16,
  },

  // NEW: border styling only when invalid (doesn't fight your ThemedTextInput base style)
  inputError: {
    borderWidth: 1,
  },

  // NEW: Google-forms-like helper line under inputs
  fieldError: {
    fontSize: 12,
    marginTop: -10, // pulls closer to the input since input already has marginBottom
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
    justifyContent: "center",
    alignItems: "center",
  },

  strengthRow: {
    marginBottom: 16,
  },

  strengthTrack: {
    height: 6,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 6,
  },

  strengthFill: {
    height: "100%",
  },

  strengthMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  strengthText: {
    fontSize: 12,
  },

  strengthHint: {
    fontSize: 12,
  },

  // Existing: server error styling
  errorText: {
    fontSize: 13,
    marginBottom: 12,
  },

  primaryButton: {
    marginTop: 8,
  },

  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },

  footer: {
    marginTop: 32,
    marginBottom: 20,
    alignItems: "center",
  },

  loginRow: {
    flexDirection: "row",
    gap: 6,
  },

  link: {
    fontWeight: "600",
  },
});
