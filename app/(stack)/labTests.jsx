import React from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Alert,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";
import ThemedCard from "../../components/ThemedCard";
import ThemedButton from "../../components/ThemedButton";
import Spacer from "../../components/Spacer";
import { useTheme } from "../../contexts/ThemeContext";

const LAB_TESTS = [
  {
    id: "female-hormone-saliva",
    name: "28 Day Female Hormone Saliva Test",
    price: "$900",
    description:
      "Tracks hormone patterns over a 28-day period using saliva samples.",
    icon: "water-outline",
    purchaseLink: "https://example.com/lab-tests/female-hormone-saliva",
  },
  {
    id: "three-antibody",
    name: "3 Antibody",
    price: "$1500",
    description:
      "A focused antibody panel for targeted lab-based screening.",
    icon: "shield-checkmark-outline",
    purchaseLink: "https://example.com/lab-tests/3-antibody",
  },
  {
    id: "food-sensitivity-240",
    name: "240 Food Sensitivity Test",
    price: "$1500",
    description:
      "Screens a broad list of foods that may be contributing to symptoms.",
    icon: "restaurant-outline",
    purchaseLink: "https://example.com/lab-tests/240-food-sensitivity",
  },
];

const LabTests = () => {
  const router = useRouter();
  const { theme } = useTheme();

  const handlePurchase = async (item) => {
    try {
      const supported = await Linking.canOpenURL(item.purchaseLink);

      if (!supported) {
        Alert.alert(
          "Link unavailable",
          `Unable to open the purchase page for ${item.name}.`
        );
        return;
      }

      await Linking.openURL(item.purchaseLink);
    } catch (error) {
      Alert.alert(
        "Error",
        `Something went wrong while opening the purchase page for ${item.name}.`
      );
    }
  };

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={[styles.headerBtn, { backgroundColor: theme.surface }]}
          >
            <Ionicons name="arrow-back" size={18} color={theme.iconMuted} />
          </Pressable>

          <ThemedText title style={[styles.headerTitle, { color: theme.title }]}>
            Lab Tests
          </ThemedText>

          <View style={{ width: 40 }} />
        </View>

        <Spacer height={8} />

        {LAB_TESTS.map((item) => (
          <ThemedCard
            key={item.id}
            style={[
              styles.testCard,
              { backgroundColor: theme.surface, shadowColor: theme.shadow },
            ]}
          >
            <View style={styles.testHeader}>
              <View
                style={[
                  styles.testIconChip,
                  { backgroundColor: theme.uiBackground },
                ]}
              >
                <Ionicons name={item.icon} size={20} color={theme.icon} />
              </View>

              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.testName, { color: theme.title }]}>
                  {item.name}
                </ThemedText>

                <ThemedText
                  muted
                  style={[styles.testDescription, { color: theme.textMuted }]}
                >
                  {item.description}
                </ThemedText>
              </View>
            </View>

            <Spacer height={12} />

            <View style={styles.priceRow}>
              <ThemedText
                muted
                style={[styles.priceLabel, { color: theme.textMuted }]}
              >
                Price
              </ThemedText>

              <ThemedText style={[styles.priceValue, { color: theme.primary }]}>
                {item.price}
              </ThemedText>
            </View>

            <Spacer height={14} />

            <ThemedButton
              onPress={() => handlePurchase(item)}
              style={styles.purchaseButton}
              accessibilityLabel={`Purchase ${item.name}`}
              accessibilityHint={`Opens a purchase flow for ${item.name}`}
            >
              <View style={styles.buttonContent}>
                <ThemedText style={styles.purchaseButtonText}>
                  Purchase This Test
                </ThemedText>
                <Ionicons name="open-outline" size={15} color="#fff" />
              </View>
            </ThemedButton>
          </ThemedCard>
        ))}

        <Spacer height={80} />
      </ScrollView>
    </ThemedView>
  );
};

export default LabTests;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },

  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },

  testCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  testHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  testIconChip: {
    width: 38,
    height: 38,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  testName: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },

  testDescription: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  priceLabel: {
    fontSize: 12,
    fontWeight: "700",
  },

  priceValue: {
    fontSize: 18,
    fontWeight: "900",
  },

  purchaseButton: {
    borderRadius: 14,
    paddingVertical: 11,
  },

  purchaseButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});