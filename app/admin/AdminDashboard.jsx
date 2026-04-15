import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ThemedText from "../../components/ThemedText";
import ThemedView from "../../components/ThemedView";
import { useTheme } from "../../contexts/ThemeContext";
import useAdminStatus from "../../hooks/useAdminStatus";

export default function AdminDashboard() {
  const { theme } = useTheme();
  const { isAdmin, loading } = useAdminStatus();

  if (loading) {
    return <ThemedView style={[styles.screen, { backgroundColor: theme.background }]} />;
  }

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Ionicons name="information-circle-outline" size={28} color={theme.iconMuted} />
        <ThemedText style={[styles.title, { color: theme.title }]}>
          Legacy admin screen retired
        </ThemedText>
        <ThemedText style={[styles.body, { color: theme.textMuted }]}>
          This route is disabled because it targets the old reports/posts data model.
        </ThemedText>
        {!isAdmin && (
          <ThemedText style={[styles.body, { color: theme.textMuted }]}>
            Current admin tools remain available through the active forum moderation flow.
          </ThemedText>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 10,
    textAlign: "center",
  },
  body: {
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
});
