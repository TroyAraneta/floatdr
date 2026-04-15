import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ThemedText from "../../components/ThemedText";
import ThemedView from "../../components/ThemedView";
import { useTheme } from "../../contexts/ThemeContext";

export default function PostList() {
  const { theme } = useTheme();

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Ionicons name="warning-outline" size={28} color={theme.iconMuted} />
        <ThemedText style={[styles.title, { color: theme.title }]}>
          Legacy post admin screen retired
        </ThemedText>
        <ThemedText style={[styles.body, { color: theme.textMuted }]}>
          This route is disabled because it depends on the old `posts` table and is no longer part of the active forum flow.
        </ThemedText>
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
