import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ThemedText from "./ThemedText";
import { useTheme } from "../contexts/ThemeContext";

const SettingsItem = ({
  icon,
  label,
  onPress,
  rightAccessory = null,
  showChevron = false,
  destructive = false,
  borderTop = true,
}) => {
  const { theme } = useTheme();
  const color = destructive ? theme.danger : theme.text;
  const iconColor = destructive ? theme.danger : theme.icon;

  const content = (
    <>
      <Ionicons name={icon} size={22} color={iconColor} />
      <ThemedText style={[styles.label, { color }]}>{label}</ThemedText>
      {rightAccessory}
      {showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      ) : null}
    </>
  );

  const itemStyle = [
    styles.item,
    borderTop && { borderTopWidth: StyleSheet.hairlineWidth },
    borderTop && { borderTopColor: theme.uiBackground },
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={itemStyle} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={itemStyle}>{content}</View>;
};

export default SettingsItem;

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  label: {
    flex: 1,
    fontSize: 15,
    marginLeft: 12,
  },
});
