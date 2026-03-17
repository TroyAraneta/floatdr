import { StyleSheet, View } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

const ThemedCard = ({ style, ...props }) => {
  const { theme, isDark } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark
            ? theme.navBackground   // match header in dark
            : theme.surface,
        },
        style,
      ]}
      {...props}
    />
  );
};

export default ThemedCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
});
