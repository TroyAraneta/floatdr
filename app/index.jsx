import React, { useEffect, useRef } from "react";
import {
  View,
  Image,
  StyleSheet,
  Animated,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";

export default function AppEntry() {
  const router = useRouter();
  const { theme } = useTheme();

  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    bootApp();
  }, []);

  const bootApp = async () => {
    // Subtle fade-in (feels premium, not cringe)
    Animated.timing(opacity, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    // Immediately check auth (no artificial delay)
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Small delay ONLY so screen doesn’t flash too fast
    setTimeout(() => {
      if (session?.user) {
        router.replace("/(dashboard)");
      } else {
        router.replace("/(auth)/login");
      }
    }, 400);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="dark-content" />

      <Animated.View style={{ opacity, alignItems: "center" }}>
        <Image
          source={require("../assets/img/FDLogo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Subtle loading indicator */}
        <ActivityIndicator
          size="small"
          color={theme.primary}
          style={styles.loader}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  logo: {
    width: 140,
    height: 140,
  },

  loader: {
    marginTop: 24,
  },
});