import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";

const ThemedView = ({ style, safe = false, ...props }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        {
          backgroundColor: theme.background,
          paddingTop: safe ? insets.top : 0,
          paddingBottom: safe ? insets.bottom : 0,
        },
        style,
      ]}
      {...props}
    />
  );
};

export default ThemedView;
