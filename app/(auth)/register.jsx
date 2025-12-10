import {
  Keyboard,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  Alert,
  View,
  Image,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";
import ThemedButton from "../../components/ThemedButton";
import ThemedTextInput from "../../components/ThemedTextInput";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert("Missing Info", "Please enter both email and password.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert("Registration Failed", error.message);
    } else {
      Alert.alert(
        "Success",
        "Your account has been created! Please check your email for confirmation."
      );
      router.replace("/login");
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ThemedView style={styles.container}>
        {/* 🌊 Logo and Title */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/img/FDLogo.png")} // optional logo image
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedText title style={styles.title}>
            FloatDr Forum
          </ThemedText>
          <Text style={styles.subtitle}>
            Create an account
          </Text>
        </View>

        {/* Email Input */}
        <ThemedTextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Password Input */}
        <ThemedTextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Register Button */}
        <ThemedButton
          onPress={handleSubmit}
          disabled={loading}
          style={styles.registerButton}
        >
          <Text style={styles.registerText}>
            {loading ? "Registering..." : "Register"}
          </Text>
        </ThemedButton>

        {/* Login Link */}
        <View style={styles.bottomText}>
          <Text style={{ color: "#666" }}>Already have an account? </Text>
          <Link href="/login" replace>
            <Text style={styles.linkText}>Login</Text>
          </Link>
        </View>
      </ThemedView>
    </TouchableWithoutFeedback>
  );
};

export default Register;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e6f4f9",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0a84ff",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
  },
  input: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  registerButton: {
    width: "100%",
    backgroundColor: "#0a84ff",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  registerText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
  },
  bottomText: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
  },
  linkText: {
    color: "#0a84ff",
    fontWeight: "600",
  },
});
