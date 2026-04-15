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
    id: "premier-28-day-hormone-panel-women",
    name: "LAB | Premier 28-Day Hormone Panel (Women)",
    price: "$1500",
    description:
      "Comprehensive saliva hormone test measuring estradiol, progesterone, and testosterone across a full 28-day menstrual cycle using 11 saliva samples. This test helps identify hormone imbalances related to PMS, fertility issues, menstrual irregularities, mood changes, and metabolic health.",
    icon: "water-outline",
    purchaseLink: "https://buy.stripe.com/28E14m7Vj3m787U7myak00a",
    statementDescriptor: "HORMONE TEST",
    marketingFeatures: [
      "28-day hormone cycle analysis",
      "11 saliva samples collected across the cycle",
      "Measures estradiol progesterone and testosterone",
      "Identifies hormonal imbalance patterns",
      "Includes hormone trend graph analysis",
    ],
  },
  {
    id: "basic-hormone-panel-saliva",
    name: "LAB | Basic Hormone Panel (Saliva)",
    price: "$575",
    description:
      "Saliva hormone snapshot test evaluating estradiol, progesterone, testosterone, DHEA, and four cortisol levels. This panel provides insight into hormone balance and stress response patterns in both men and women.",
    icon: "flask-outline",
    purchaseLink: "https://buy.stripe.com/bJefZgdfD4qb5ZM4amak009",
    statementDescriptor: "HORMONE PANEL",
    marketingFeatures: [
      "Hormone snapshot evaluation",
      "Measures estradiol progesterone testosterone and DHEA",
      "Includes four cortisol measurements",
      "Evaluates hormone balance and stress response",
      "Non-invasive saliva testing",
    ],
  },
  {
    id: "comprehensive-thyroid-metabolic-panel",
    name: "LAB | Comprehensive Thyroid & Metabolic Panel",
    price: "$800",
    description:
      "Advanced blood panel evaluating thyroid function, metabolic health, inflammation markers, and vitamin status. Includes concierge phlebotomist home visit for convenient blood sample collection.",
    icon: "fitness-outline",
    purchaseLink: "https://buy.stripe.com/cNi14m0sRe0Lbk6ayKak008",
    statementDescriptor: "THYROID PANEL",
    marketingFeatures: [
      "Comprehensive thyroid hormone evaluation",
      "Includes thyroid antibodies and metabolic markers",
      "Lipid panel and inflammation markers included",
      "Vitamin D and magnesium evaluation",
      "Concierge phlebotomist home visit",
    ],
  },
  {
    id: "food-sensitivity-240-3-antibodies",
    name: "LAB | 240 Food Sensitivity Panel (3 Antibodies)",
    price: "$1500",
    description:
      "Fingerstick blood test measuring immune reactions to 240 foods using three antibody markers: IgA, IgG, and IgG4. Helps identify potential food sensitivities that may contribute to digestive issues, inflammation, and immune responses.",
    icon: "restaurant-outline",
    purchaseLink: "https://buy.stripe.com/eVq00i0sRcWH9bYdKWak007",
    statementDescriptor: "FOOD TEST",
    marketingFeatures: [
      "Tests immune reactions to 240 foods",
      "Measures IgA IgG and IgG4 antibodies",
      "Identifies hidden food sensitivities",
      "Helps evaluate digestive and inflammatory triggers",
      "Fingerstick blood sample collection",
    ],
  },
  {
    id: "food-sensitivity-240-igg",
    name: "LAB | 240 Food Sensitivity Panel (IgG)",
    price: "$660",
    description:
      "Fingerstick blood test evaluating IgG antibody reactions to 240 foods. This panel helps detect delayed food sensitivities that may impact digestion, inflammation, and overall wellness.",
    icon: "nutrition-outline",
    purchaseLink: "https://buy.stripe.com/bJebJ03F31dZag222eak006",
    statementDescriptor: "FOOD TEST",
    marketingFeatures: [
      "Tests IgG immune reactions to 240 foods",
      "Identifies delayed food sensitivities",
      "Helps evaluate digestive triggers",
      "Fingerstick blood collection",
      "Home testing kit included",
    ],
  },
  {
    id: "comprehensive-neurotransmitter-panel",
    name: "LAB | Comprehensive Neurotransmitter Panel",
    price: "$850",
    description:
      "Urine-based laboratory panel measuring neurotransmitters such as serotonin, dopamine, GABA, norepinephrine, and epinephrine. Provides insight into mood balance, stress response, cognitive function, and neurological health.",
    icon: "pulse-outline",
    purchaseLink: "https://buy.stripe.com/aFacN4a3rcWHdse4amak005",
    statementDescriptor: "NEURO TEST",
    marketingFeatures: [
      "Measures serotonin dopamine and GABA levels",
      "Evaluates norepinephrine and epinephrine balance",
      "Assesses mood stress and neurological function",
      "Includes neurotransmitter metabolite analysis",
      "Urine-based laboratory testing",
    ],
  },
  {
    id: "basic-neurotransmitter-panel",
    name: "LAB | Basic Neurotransmitter Panel",
    price: "$450",
    description:
      "Urine test measuring key neurotransmitters involved in mood regulation, stress response, and brain chemistry. Provides a snapshot of neurological balance.",
    icon: "medkit-outline",
    purchaseLink: "https://buy.stripe.com/28E8wO1wV4qbcoa8qCak004",
    statementDescriptor: "NEURO TEST",
    marketingFeatures: [
      "Evaluates key neurotransmitters affecting mood",
      "Measures dopamine serotonin and related markers",
      "Helps investigate fatigue anxiety and mood imbalance",
      "Urine-based laboratory analysis",
      "Basic neurological chemistry snapshot",
    ],
  },
  {
    id: "vitamin-d-fingerstick-test",
    name: "LAB | Vitamin D Fingerstick Test",
    price: "$100",
    description:
      "Quick fingerstick blood test measuring vitamin D levels to evaluate immune function, bone health, and overall wellness.",
    icon: "sunny-outline",
    purchaseLink: "https://buy.stripe.com/7sY8wOb7v8Gr1Jw7myak003",
    statementDescriptor: "LAB TEST",
    marketingFeatures: [
      "Measures vitamin D blood levels",
      "Evaluates bone and immune health",
      "Identifies vitamin D deficiency",
      "Quick fingerstick blood sample",
      "At-home test kit",
    ],
  },
  {
    id: "magnesium-urine-test",
    name: "LAB | Magnesium Urine Test",
    price: "$100",
    description:
      "Urine test evaluating magnesium levels in the body. Magnesium plays a key role in muscle function, nerve signaling, and metabolic health.",
    icon: "water-outline",
    purchaseLink: "https://buy.stripe.com/cNi6oG1wVe0L4VI6iuak002",
    statementDescriptor: "LAB TEST",
    marketingFeatures: [
      "Measures magnesium levels in the body",
      "Supports muscle and nerve health evaluation",
      "Helps investigate fatigue and metabolic imbalance",
      "Urine-based laboratory analysis",
      "Home collection test",
    ],
  },
  {
    id: "complete-iron-panel-anemia",
    name: "LAB | Complete Iron Panel for Anemia",
    price: "$350",
    description:
      "Comprehensive blood panel evaluating iron levels and anemia markers. Includes concierge phlebotomist home visit for blood sample collection.",
    icon: "bandage-outline",
    purchaseLink: "https://buy.stripe.com/bJe7sK6Rf1dZbk67myak001",
    statementDescriptor: "IRON PANEL",
    marketingFeatures: [
      "Comprehensive iron metabolism analysis",
      "Helps detect iron deficiency or anemia",
      "Evaluates fatigue-related nutrient issues",
      "Blood collection performed by phlebotomist",
      "Home visit included",
    ],
  },
  {
    id: "adrenal-function-inflammation-panel",
    name: "LAB | Adrenal Function & Inflammation Panel",
    price: "$450",
    description:
      "Saliva-based test measuring cortisol levels throughout the day along with DHEA and secretory IgA. Helps evaluate adrenal health, stress response, and immune balance.",
    icon: "leaf-outline",
    purchaseLink: "https://buy.stripe.com/7sY28q6Rf09Vag236iak000",
    statementDescriptor: "ADRENAL TEST",
    marketingFeatures: [
      "Measures cortisol levels across the day",
      "Includes DHEA and immune marker sIgA",
      "Evaluates adrenal stress response",
      "Helps identify inflammation patterns",
      "Saliva-based laboratory testing",
    ],
  },
  {
    id: "comprehensive-genetic-panel",
    name: "LAB | Comprehensive Genetic Panel",
    price: "$550",
    description:
      "Saliva-based DNA test analyzing key genetic markers (SNPs) related to metabolism, cardiovascular health, nutrient absorption, hormone regulation, brain function, and methylation pathways. Provides a personalized report to help guide targeted lifestyle, diet, and supplement strategies.",
    icon: "git-network-outline",
    purchaseLink: "https://buy.stripe.com/6oUaEWfnL09VdsecGSak00b",
    statementDescriptor: "GENETIC PANEL",
    marketingFeatures: [
      "Analyzes genetic markers across multiple health systems",
      "Covers metabolism weight and cardiovascular risk factors",
      "Evaluates vitamin absorption and nutritional pathways",
      "Assesses hormone metabolism and brain health markers",
      "Includes methylation and detoxification gene insights",
      "Personalized easy-to-read genetic report",
    ],
  },
];

const LabTests = () => {
  const router = useRouter();
  const { theme } = useTheme();

  const handlePurchase = async (item) => {
    try {
      if (!item?.purchaseLink) {
        Alert.alert(
          "Purchase link missing",
          `Add the Stripe Payment Link for ${item.name} first.`
        );
        return;
      }

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
    <ThemedView
      safe
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.replace("/(dashboard)/home")}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={[styles.headerBtn, { backgroundColor: theme.surface }]}
          >
            <Ionicons name="arrow-back" size={18} color={theme.iconMuted} />
          </Pressable>

          <ThemedText title style={[styles.headerTitle, { color: theme.title }]}>
            Lab Tests
          </ThemedText>

          <View style={styles.headerSpacer} />
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

              <View style={styles.testContent}>
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

            <Spacer height={16} />

            <ThemedButton
              onPress={() => handlePurchase(item)}
              style={styles.purchaseButton}
              accessibilityRole="button"
              accessibilityLabel={`Purchase ${item.name}`}
              accessibilityHint={`Opens a purchase flow for ${item.name}`}
            >
              <View style={styles.buttonContent}>
                <ThemedText
                  style={[styles.purchaseButtonText, { color: theme.surface }]}
                >
                  Purchase This Test
                </ThemedText>
                <Ionicons
                  name="open-outline"
                  size={16}
                  color={theme.surface}
                />
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },

  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },

  headerSpacer: {
    width: 44,
    height: 44,
  },

  testCard: {
    borderRadius: 16,
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
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  testContent: {
    flex: 1,
  },

  testName: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
  },

  testDescription: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
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
    fontWeight: "700",
  },

  purchaseButton: {
    borderRadius: 12,
    minHeight: 44,
    paddingVertical: 12,
  },

  purchaseButtonText: {
    fontWeight: "700",
    fontSize: 14,
  },

  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
