import { Text } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

const ThemedText = ({
  style,
  title = false,
  muted = false,
  ...props
}) => {
  const { theme } = useTheme();

  const color = title
    ? theme.title
    : muted
    ? theme.textMuted
    : theme.text;

  return <Text style={[{ color }, style]} {...props} />;
};

export default ThemedText;
