import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Image,
  Linking,
  View,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";
import ThemedCard from "../../components/ThemedCard";
import ThemedButton from "../../components/ThemedButton";
import Spacer from "../../components/Spacer";
import { useTheme } from "../../contexts/ThemeContext";

const Schedule = () => {
  const { theme } = useTheme();
  const router = useRouter();

  // Store image ratios dynamically per service
  const [imageRatios, setImageRatios] = useState({});

  const openLink = async (url) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.warn("Failed to open URL:", error);
    }
  };

  const ServiceCard = ({ id, title, tagline, highlights, image, actions }) => {
    const isSingleAction = actions.length === 1;

    return (
      <ThemedCard style={styles.card}>
        {/* Image */}
        {image && (
          <Image
            source={image}
            style={[
              styles.image,
              { backgroundColor: theme.uiBackground },
              {
                height:
                  imageRatios[id] && imageRatios[id] < 1
                    ? 280
                    : 200,
              },
            ]}
            resizeMode="contain"
            onLoad={(e) => {
              const { width, height } = e.nativeEvent.source;
              setImageRatios((prev) => ({
                ...prev,
                [id]: width / height,
              }));
            }}
            accessible
            accessibilityLabel={`${title} image`}
          />
        )}

        {/* Content */}
        <View style={styles.cardContent}>
          {/* Title row */}
          <View style={styles.titleRow}>
            <ThemedText title style={styles.title}>
              {title}
            </ThemedText>

            {/* Small icon chip to add modern feel without clutter */}
            <View
              style={[
                styles.chip,
                { backgroundColor: theme.uiBackground },
              ]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={theme.iconMuted}
              />
            </View>
          </View>

          <ThemedText muted style={styles.tagline}>
            {tagline}
          </ThemedText>

          <Spacer height={12} />

          {/* Highlights */}
          <View style={styles.highlights}>
            {highlights.map((item, index) => (
              <View key={index} style={styles.highlightRow}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color={theme.iconMuted}
                  style={styles.highlightIcon}
                />
                <ThemedText style={styles.highlightText}>
                  {item}
                </ThemedText>
              </View>
            ))}
          </View>

          <Spacer height={16} />

          {/* Actions */}
          <View style={styles.buttonRow}>
            {actions.map((action, index) => {
              const isPrimary = index === 0; // first button is primary
              return (
                <ThemedButton
                  key={index}
                  style={[
                    styles.button,
                    isSingleAction && styles.buttonFull,
                    // Secondary button look (minimal)
                    !isPrimary && [
                      styles.secondaryButton,
                      { backgroundColor: theme.uiBackground },
                    ],
                  ]}
                  onPress={() => openLink(action.url)}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                >
                  <ThemedText
                    style={[
                      styles.buttonText,
                      !isPrimary && { color: theme.text },
                    ]}
                  >
                    {action.label}
                  </ThemedText>
                </ThemedButton>
              );
            })}
          </View>

          {/* Subtle helper under actions */}
          <ThemedText muted style={styles.helperText}>
            Opens booking in your browser
          </ThemedText>
        </View>
      </ThemedCard>
    );
  };

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ flex: 1 }}>
          <ThemedText title style={styles.pageTitle}>
            Schedule a Service
          </ThemedText>
          <ThemedText muted style={styles.pageSubtitle}>
            Choose a service and book in seconds.
          </ThemedText>
        </View>

        <Spacer height={18} />

        <ServiceCard
          id="float-therapy"
          title="Float Therapy"
          tagline="Weightless calm for body and mind"
          image={require("../../assets/img/FloatTherapy.jpg")}
          highlights={[
            "Deep stress & anxiety relief",
            "Eases pain & muscle tension",
            "Improves sleep & mental clarity",
            "90 or 60 minute sessions",
          ]}
          actions={[
            {
              label: "Book 90 min",
              url: "https://floatdoctorbooking.as.me/schedule/c8ab2b35/appointment/4388609/calendar/any?appointmentTypeIds[]=4388609",
            },
            {
              label: "Book 60 min",
              url: "https://floatdoctorbooking.as.me/schedule/c8ab2b35/appointment/4746050/calendar/any?appointmentTypeIds[]=4746050",
            },
          ]}
        />

        <ServiceCard
          id="infrared-sauna"
          title="Infrared Sauna"
          tagline="Detox, sweat, and restore"
          image={require("../../assets/img/Sauna.png")}
          highlights={[
            "Full-spectrum infrared heat",
            "Reduces inflammation",
            "Boosts circulation",
            "Great before a float",
          ]}
          actions={[
            {
              label: "Book Sauna",
              url: "https://floatdoctorbooking.as.me/schedule/c8ab2b35/appointment/12484135/calendar/any?appointmentTypeIds[]=12484135",
            },
          ]}
        />

        <ServiceCard
          id="massage"
          title="Zero-Gravity Massage"
          tagline="Deep relief, zero effort"
          image={require("../../assets/img/ZeroGravity.png")}
          highlights={[
            "Full-body scanning tech",
            "Targets neck, back & legs",
            "Boosts circulation",
            "No therapist required",
          ]}
          actions={[
            {
              label: "Book Massage",
              url: "https://floatdoctorbooking.as.me/schedule/c8ab2b35/appointment/8813986/calendar/any?appointmentTypeIds[]=8813986",
            },
          ]}
        />

        <ServiceCard
          id="consultation"
          title="1:1 Private Consultation"
          tagline="Personalized support & guidance"
          image={require("../../assets/img/Consultation.jpg")}
          highlights={[
            "Licensed therapist support",
            "Stress, anxiety & burnout care",
            "Custom wellness plans",
          ]}
          actions={[
            {
              label: "Book Consultation",
              url: "https://www.floatdr.net/float-club",
            },
          ]}
        />

        <ServiceCard
          id="trifecta"
          title="The Trifecta Combo"
          tagline="The ultimate Float Doctor reset"
          image={require("../../assets/img/Trifecta.jpg")}
          highlights={[
            "Float + Sauna + Massage",
            "Maximum relaxation & recovery",
            "Best value experience",
          ]}
          actions={[
            {
              label: "Book Trifecta",
              url: "https://floatdoctorbooking.as.me/schedule/c8ab2b35/appointment/24834294/calendar/any?appointmentTypeIds[]=24834294",
            },
          ]}
        />

        <Spacer height={40} />
      </ScrollView>
    </ThemedView>
  );
};

export default Schedule;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    marginTop: 4,
    fontSize: 13,
  },

  // Cards
  card: {
    marginBottom: 20,
    padding: 0, // Override ThemedCard default padding
    overflow: "hidden",
  },

  image: {
    width: "100%",
  },

  cardContent: {
    padding: 18,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  chip: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },

  tagline: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 18,
  },

  highlights: {
    gap: 8,
  },

  highlightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  highlightIcon: {
    marginTop: 1,
    marginRight: 8,
  },

  highlightText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },

  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },

  button: {
    flex: 1,
    minHeight: 44,
  },

  buttonFull: {
    flex: 1,
  },

  // Secondary button (still uses ThemedButton, but looks lighter)
  secondaryButton: {
    // backgroundColor injected from theme.uiBackground
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  helperText: {
    fontSize: 12,
    marginTop: 10,
  },
});

