// app/_layout.jsx
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SupabaseAuthProvider, useAuth } from "../contexts/SupabaseAuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { configureRevenueCat } from "../lib/revenuecat";

import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

// Prevent splash from auto-hiding until fonts are ready
SplashScreen.preventAutoHideAsync();

/* ----------------------------- */
/* Global Auth + Verify Gate     */
/* ----------------------------- */
function AuthGate({ children }) {
  const router = useRouter();
  const segments = useSegments();
  const { user, loading, isEmailVerified } = useAuth();

  useEffect(() => {
    if (loading) return;

    const group = segments[0]; // "(auth)" | "(dashboard)" | "(stack)" | "forum" | etc.
    const inAuth = group === "(auth)";
    const inDashboard = group === "(dashboard)";
    const inStack = group === "(stack)";

    // 1) Logged in but NOT verified => force verifyEmail
    if (user && !isEmailVerified) {
      const isVerifyScreen = inAuth && segments[1] === "verifyEmail";
      if (!isVerifyScreen) {
        router.replace({
          pathname: "/(auth)/verifyEmail",
          params: { email: user.email || "" },
        });
      }
      return;
    }

    // 2) Logged in and verified, but still in auth screens => go home
    if (user && isEmailVerified && inAuth) {
      router.replace("/(dashboard)/home");
      return;
    }

    // 3) Not logged in but trying to access protected stacks => send to login
    if (!user && (inDashboard || inStack)) {
      router.replace("/(auth)/login");
      return;
    }
  }, [user, loading, isEmailVerified, segments, router]);

  return children;
}

function RevenueCatBootstrap() {
  const { user } = useAuth();

  useEffect(() => {
    configureRevenueCat(user?.id ?? null);
  }, [user?.id]);

  return null;
}

export default function RootLayout() {

  const [fontsLoaded] = useFonts({
    TimesNewRoman: require("../assets/fonts/times.ttf"),
    TimesNewRomanBold: require("../assets/fonts/timesbd.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SupabaseAuthProvider>
      <ThemeProvider>
        <StatusBar style="auto" />
        <RevenueCatBootstrap />
        <AuthGate>
          <Slot />
        </AuthGate>
      </ThemeProvider>
    </SupabaseAuthProvider>
  );
}