import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
  Pressable,
  Linking,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../contexts/ThemeContext";

import ThemedText from "../../components/ThemedText";
import Spacer from "../../components/Spacer";
import ThemedView from "../../components/ThemedView";
import ThemedCard from "../../components/ThemedCard";
import ThemedButton from "../../components/ThemedButton";
import { Colors } from "../../constants/colors";

const TEMP_CONSULTATION_LINK = "https://example.com/consultations";
const TEMP_SUPPLEMENTS_LINK = "https://example.com/supplements";

const Home = () => {
  const router = useRouter();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [isMuted, setIsMuted] = useState(true);

  const player = useVideoPlayer(
    require("../../assets/vid/Meet_the_Float_Doctor.mp4"),
    (player) => {
      player.loop = true;
      player.muted = true;
    }
  );

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", user.id)
            .single();

          setUsername(data?.username || "Float Enthusiast");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        try {
          player?.pause?.();
        } catch {}
      };
    }, [player])
  );

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    try {
      if (player) player.muted = isMuted;
    } catch {}
  }, [isMuted, player]);

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const openExternalLink = async (url, errorMessage) => {
    try {
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        Alert.alert("Link unavailable", errorMessage);
        return;
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert("Error", errorMessage);
    }
  };

  if (loading) {
    return (
      <ThemedView
        style={[styles.loadingContainer, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.welcomeRow}>
            <ThemedText style={[styles.welcomeLabel, { color: theme.textMuted }]}>
              Welcome,
            </ThemedText>
            <ThemedText title style={[styles.username, { color: theme.title }]}>
              {username}
            </ThemedText>
          </View>
        </View>

        <Spacer height={18} />

        {/* Video */}
        <Animated.View style={[styles.videoWrap, { opacity: fadeAnim }]}>
          <ThemedCard
            style={[styles.videoCard, { backgroundColor: theme.surface }]}
          >
            <View
              style={[styles.videoFrame, { backgroundColor: theme.uiBackground }]}
            >
              <VideoView
                player={player}
                style={styles.video}
                contentFit="contain"
                fullscreenOptions={{ enable: false }}
                allowsPictureInPicture={false}
                showsControls={false}
              />

              <View
                style={[
                  styles.videoBadge,
                  { backgroundColor: "rgba(0,0,0,0.40)" },
                ]}
                pointerEvents="none"
              >
                <Ionicons name="play-circle-outline" size={16} color="#fff" />
                <ThemedText style={styles.videoBadgeText}>
                  Meet the Float Doctor
                </ThemedText>
              </View>

              <Pressable
                onPress={toggleMute}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={isMuted ? "Unmute video" : "Mute video"}
                accessibilityHint="Toggles video sound"
                style={[
                  styles.soundToggle,
                  { backgroundColor: "rgba(0,0,0,0.45)" },
                ]}
              >
                <Ionicons
                  name={isMuted ? "volume-mute-outline" : "volume-high-outline"}
                  size={18}
                  color="#fff"
                />
              </Pressable>
            </View>
          </ThemedCard>
        </Animated.View>

        <Spacer height={18} />

        {/* Health Services */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <ThemedText
            muted
            style={[styles.sectionLabel, { color: theme.textMuted }]}
          >
            Health services
          </ThemedText>

          <Spacer height={10} />

          <View style={styles.healthSection}>
            <HealthFeatureCard
              icon="people-outline"
              title="Community for Float and Mindfulness"
              subtitle="Join the FloatDr forum community and connect with others"
              theme={theme}
              onPress={() => router.push("/(dashboard)/forum")}
            />

            <HealthFeatureCard
              icon="beaker-outline"
              title="Lab Tests"
              subtitle="Check neurotransmitter or hormone-related markers"
              theme={theme}
              onPress={() => router.push("/(stack)/labTests")}
            />
          </View>

          <Spacer height={4} />

          <PrimaryActionCard
            icon="medkit-outline"
            title="Health Consultations"
            subtitle="Talk with a provider about your wellness concerns"
            buttonLabel="Request Consultation"
            theme={theme}
            onPress={() =>
              openExternalLink(
                TEMP_CONSULTATION_LINK,
                "Unable to open the consultation website right now."
              )
            }
          />

          <Spacer height={10} />

          <SecondaryActionCard
            icon="flask-outline"
            title="Personalized Supplements"
            subtitle="Get supplements tailored to your symptoms"
            buttonLabel="Get Personalized Supplements"
            theme={theme}
            onPress={() =>
              openExternalLink(
                TEMP_SUPPLEMENTS_LINK,
                "Unable to open the supplements website right now."
              )
            }
          />
        </Animated.View>

        <Spacer height={80} />
      </ScrollView>
    </ThemedView>
  );
};

export default Home;

/* ---------- Local Components ---------- */

const PrimaryActionCard = ({
  icon,
  title,
  subtitle,
  buttonLabel,
  onPress,
  theme,
}) => (
  <ThemedCard
    style={[
      styles.primaryActionCard,
      { backgroundColor: theme.surface, shadowColor: theme.shadow },
    ]}
  >
    <View style={styles.primaryActionHeader}>
      <View
        style={[
          styles.primaryActionIconChip,
          { backgroundColor: theme.uiBackground },
        ]}
      >
        <Ionicons name={icon} size={22} color={theme.icon} />
      </View>

      <View style={{ flex: 1 }}>
        <ThemedText style={[styles.primaryActionTitle, { color: theme.title }]}>
          {title}
        </ThemedText>

        {!!subtitle && (
          <ThemedText
            muted
            style={[styles.primaryActionSubtitle, { color: theme.textMuted }]}
          >
            {subtitle}
          </ThemedText>
        )}
      </View>
    </View>

    <Spacer height={12} />

    <ThemedButton
      onPress={onPress}
      style={styles.primaryActionButton}
      accessibilityLabel={buttonLabel}
      accessibilityHint="Opens an external website"
    >
      <View style={styles.buttonContent}>
        <ThemedText style={styles.primaryActionButtonText}>
          {buttonLabel}
        </ThemedText>
        <Ionicons name="open-outline" size={15} color="#fff" />
      </View>
    </ThemedButton>
  </ThemedCard>
);

const SecondaryActionCard = ({
  icon,
  title,
  subtitle,
  buttonLabel,
  onPress,
  theme,
}) => (
  <ThemedCard
    style={[
      styles.secondaryActionCard,
      { backgroundColor: theme.surface, shadowColor: theme.shadow },
    ]}
  >
    <View style={styles.secondaryActionHeader}>
      <View
        style={[
          styles.secondaryActionIconChip,
          { backgroundColor: theme.uiBackground },
        ]}
      >
        <Ionicons name={icon} size={20} color={theme.icon} />
      </View>

      <View style={{ flex: 1 }}>
        <ThemedText
          style={[styles.secondaryActionTitle, { color: theme.title }]}
        >
          {title}
        </ThemedText>

        {!!subtitle && (
          <ThemedText
            muted
            style={[styles.secondaryActionSubtitle, { color: theme.textMuted }]}
          >
            {subtitle}
          </ThemedText>
        )}
      </View>
    </View>

    <Spacer height={10} />

    <ThemedButton
      onPress={onPress}
      style={styles.secondaryActionButton}
      accessibilityLabel={buttonLabel}
      accessibilityHint="Opens an external website"
    >
      <View style={styles.buttonContent}>
        <ThemedText style={styles.secondaryActionButtonText}>
          {buttonLabel}
        </ThemedText>
        <Ionicons name="open-outline" size={15} color="#fff" />
      </View>
    </ThemedButton>
  </ThemedCard>
);

const HealthFeatureCard = ({ icon, title, subtitle, onPress, theme }) => (
  <TouchableOpacity
    style={[
      styles.healthCard,
      { backgroundColor: theme.surface, shadowColor: theme.shadow },
    ]}
    activeOpacity={0.85}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={title}
    accessibilityHint={subtitle || undefined}
  >
    <View
      style={[styles.healthCardIconChip, { backgroundColor: theme.uiBackground }]}
    >
      <Ionicons name={icon} size={20} color={theme.icon} />
    </View>

    <View style={{ flex: 1 }}>
      <ThemedText style={[styles.healthCardTitle, { color: theme.title }]}>
        {title}
      </ThemedText>

      {!!subtitle && (
        <ThemedText
          muted
          style={[styles.healthCardSubtitle, { color: theme.textMuted }]}
        >
          {subtitle}
        </ThemedText>
      )}
    </View>

    <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
  </TouchableOpacity>
);

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  screen: { flex: 1 },

  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  headerContainer: {
    alignSelf: "stretch",
  },

  welcomeRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
  },

  welcomeLabel: {
    fontSize: 19,
    fontWeight: "700",
    marginRight: 8,
    letterSpacing: -0.2,
  },

  username: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.7,
    marginTop: 2,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 2,
  },

  videoWrap: {
    borderRadius: 20,
  },

  videoCard: {
    padding: 0,
    overflow: "hidden",
  },

  videoFrame: {
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },

  video: {
    width: "100%",
    height: 182,
  },

  videoBadge: {
    position: "absolute",
    left: 12,
    bottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  videoBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  soundToggle: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  healthSection: {
    marginTop: 0,
  },

  primaryActionCard: {
    borderRadius: 20,
    padding: 16,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  primaryActionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  primaryActionIconChip: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  primaryActionTitle: {
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
  },

  primaryActionSubtitle: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },

  primaryActionButton: {
    borderRadius: 12,
    paddingVertical: 11,
  },

  primaryActionButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  secondaryActionCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  secondaryActionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  secondaryActionIconChip: {
    width: 38,
    height: 38,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  secondaryActionTitle: {
    fontSize: 15,
    fontWeight: "800",
  },

  secondaryActionSubtitle: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },

  secondaryActionButton: {
    borderRadius: 12,
    paddingVertical: 10,
  },

  secondaryActionButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },

  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  healthCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  healthCardIconChip: {
    width: 38,
    height: 38,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  healthCardTitle: {
    fontSize: 15,
    fontWeight: "800",
  },

  healthCardSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },

  /* kept from your file so nothing else is lost */
  resetCard: {
    borderRadius: 18,
    padding: 16,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  resetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  resetIconChip: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  resetTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  resetList: {
    gap: 10,
  },

  resetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  resetText: {
    fontSize: 14,
    lineHeight: 18,
    flex: 1,
  },

  resetActions: {
    gap: 10,
  },

  resetBtn: {
    borderRadius: 14,
  },

  resetBtnText: {
    color: "#fff",
    fontWeight: "800",
  },

  resetLinkBtn: {
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
  },

  resetLinkText: {
    fontWeight: "700",
    fontSize: 14,
  },
});