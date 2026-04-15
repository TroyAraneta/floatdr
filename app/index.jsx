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
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/SupabaseAuthContext";

export default function AppEntry() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, loading } = useAuth();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  useEffect(() => {
    if (loading) return;

    router.replace(user ? "/(dashboard)/home" : "/(auth)/login");
  }, [loading, router, user]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="dark-content" />

      <Animated.View style={{ opacity, alignItems: "center" }}>
        <Image
          source={require("../assets/img/FDLogo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

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
