// app/_layout.jsx
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SupabaseAuthProvider, useAuth } from "../contexts/SupabaseAuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { configureRevenueCat } from "../lib/revenuecat";

import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import {
  MembershipProvider,
  useMembership,
} from "../contexts/MembershipContext";

// Prevent splash from auto-hiding until fonts are ready
SplashScreen.preventAutoHideAsync();

/* ----------------------------- */
/* Global Auth + Verify Gate     */
/* ----------------------------- */
function AuthGate({ children }) {
  const router = useRouter();
  const segments = useSegments();
  const { user, loading, isEmailVerified } = useAuth();
  const { isAdmin, loading: membershipLoading } = useMembership();

  useEffect(() => {
    if (loading) return;

    const group = segments[0];
    const inAuth = group === "(auth)";
    const isForumRoute = group === "forum" || group === "(dashboard)";
    const isStackRoute = group === "(stack)";
    const isAdminRoute = group === "admin";
    const publicRoutes = ["(auth)", "index"];
    const isPublicRoute = publicRoutes.includes(group);
    const currentPath = `/${segments.filter(Boolean).join("/")}`;
    const replaceIfNeeded = (target) => {
      if (currentPath !== target) {
        router.replace(target);
      }
    };

    if (user && !isEmailVerified) {
      const isVerifyScreen = inAuth && segments[1] === "verifyEmail";
      if (!isVerifyScreen) {
        if (currentPath !== "/(auth)/verifyEmail") {
          router.replace({
            pathname: "/(auth)/verifyEmail",
            params: { email: user.email || "" },
          });
        }
      }
      return;
    }

    if (user && isEmailVerified && inAuth) {
      replaceIfNeeded("/(dashboard)/home");
      return;
    }

    const isProtectedRoute =
      isForumRoute || isStackRoute || isAdminRoute || !isPublicRoute;

    if (!user && isProtectedRoute) {
      replaceIfNeeded("/(auth)/login");
      return;
    }

    if (isAdminRoute && membershipLoading) return;

    if (user && isAdminRoute && !isAdmin) {
      replaceIfNeeded("/(dashboard)/home");
    }
  }, [user, loading, membershipLoading, isEmailVerified, isAdmin, segments, router]);

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
      <MembershipProvider>
        <ThemeProvider>
          <StatusBar style="auto" />
          <RevenueCatBootstrap />
          <AuthGate>
            <Slot />
          </AuthGate>
        </ThemeProvider>
      </MembershipProvider>
    </SupabaseAuthProvider>
  );
}
