import { Tabs, usePathname, Redirect } from "expo-router";
import { StyleSheet, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import CustomHeader from "../../components/CustomHeader";
import { useAuth } from "../../contexts/SupabaseAuthContext";

export default function DashboardLayout() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Hide header for certain screens
  const hideHeader =
    pathname.includes("Menu") || pathname.includes("thread/");

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.navBackground}
      />

      <Tabs
        screenOptions={{
          headerShown: !hideHeader,
          header: () => <CustomHeader />,

          tabBarStyle: {
            backgroundColor: theme.navBackground,
            borderTopWidth: 0,
            height: 60 + insets.bottom,
            paddingBottom: Math.max(insets.bottom - 5, 5),
            paddingTop: 5,
          },
          tabBarLabelStyle: { fontSize: 12 },
          tabBarActiveTintColor: theme.iconColorFocused,
          tabBarInactiveTintColor: theme.iconColor,
          sceneStyle: {
            backgroundColor: theme.background,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="forum"
          options={{
            title: "Forum",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "chatbubble" : "chatbubble-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="library"
          options={{
            title: "Library",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "book" : "book-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="schedule"
          options={{
            title: "Schedule",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "calendar" : "calendar-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="menu"
          options={{
            title: "Menu",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({});