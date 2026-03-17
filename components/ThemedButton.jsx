import { Pressable, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";
import { useTheme } from "../contexts/ThemeContext";

function ThemedButton({
  style,
  children,
  disabled = false,
  ...props
}) {
  const { theme, isDark } = useTheme();


  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: disabled
            ? theme.uiBackground
            : theme.isDark
              ? theme.navBackground
              : Colors.primary,
        },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {children}
    </Pressable>
  );
}

export default ThemedButton;

const styles = StyleSheet.create({
  base: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }], // subtle, calm feedback
  },

  disabled: {
    opacity: 0.6,
  },
});
