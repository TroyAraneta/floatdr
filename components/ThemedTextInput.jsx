import { TextInput, StyleSheet } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

export default function ThemedTextInput({ style, ...props }) {
  const { theme } = useTheme();

  return (
    <TextInput
      placeholderTextColor={theme.textMuted}
      style={[
        styles.input,
        {
          backgroundColor: theme.uiBackground,
          color: theme.text,
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    fontSize: 16,
  },
});
