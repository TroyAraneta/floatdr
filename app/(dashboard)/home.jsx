import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import ThemedText from "../../components/ThemedText";
import Spacer from "../../components/Spacer";
import ThemedView from "../../components/ThemedView";

const Home = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Setup video player but do NOT auto-play. This keeps it static unless you want autoplay later.
  const player = useVideoPlayer(require("../../assets/vid/float_intro.mp4"), (player) => {
    player.loop = true;
    player.muted = false;
    // do not call player.play() here — we want a static preview
  });

  const giveTemporaryMembership = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("No user logged in");
        return;
      }

      const { error } = await supabase
        .from("memberships")
        .upsert({
          user_id: user.id,
          status: "active",
          plan: "premium",
          expires_at: null, // or new Date(Date.now() + 7*24*60*60*1000)
        });

      if (error) throw error;

      alert("🎉 Membership granted! Re-open Forum to see member view.");
    } catch (err) {
      console.error("Grant membership error:", err);
      alert("Failed to grant membership");
    }
  };


  // Fetch username
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
      } catch (err) {
        // silent fallback
        setUsername("Float Enthusiast");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Defensive: pause video when leaving the screen
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        try {
          if (player) {
            player.pause?.();
            // don't force reset position — keep preview frame as-is
          }
        } catch (e) {
          // ignore
        }
      };
    }, [player])
  );

  // Fade-in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  if (loading)
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a84ff" />
      </ThemedView>
    );

  return (
    <ScrollView
      style={{ backgroundColor: "#e6f4f9" }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* 👋 Welcome */}
      <View style={styles.headerContainer}>
        <ThemedText style={styles.welcomeText}>
          Welcome, <ThemedText style={styles.username}>{username}</ThemedText>
        </ThemedText>
      </View>

      <Spacer height={20} />

      {/* 🎥 Video card — CLEAN preview (no overlay text, no big play button, no native controls) */}
      <Animated.View style={[styles.videoCard, { opacity: fadeAnim }]}>
        <View style={styles.videoOverlay}>
          <VideoView
            player={player}
            style={styles.video}
            allowsFullscreen={false}
            allowsPictureInPicture={false}
            showsControls={false} // hide native controls
          />
        </View>
      </Animated.View>

      <Spacer height={25} />

      {/* 📋 Navigation Options */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={styles.navSection}>
          <TouchableOpacity
            style={styles.navCard}
            activeOpacity={0.85}
            onPress={() => router.push("/(dashboard)/forum")}
          >
            <Ionicons name="chatbubbles-outline" size={22} color="#0a84ff" />
            <ThemedText style={styles.navText}>Start Discussion</ThemedText>
            <Ionicons name="chevron-forward" size={18} color="#aaa" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.navCard} activeOpacity={0.85}>
            <Ionicons name="calendar-outline" size={22} color="#0a84ff" />
            <ThemedText style={styles.navText}>My Appointments</ThemedText>
            <Ionicons name="chevron-forward" size={18} color="#aaa" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.navCard} activeOpacity={0.85}>
            <Ionicons name="medkit-outline" size={22} color="#0a84ff" />
            <ThemedText style={styles.navText}>Premium Content</ThemedText>
            <Ionicons name="chevron-forward" size={18} color="#aaa" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* 🧪 TEMP: Dev Membership Button */}
      <TouchableOpacity
        style={styles.devButton}
        onPress={giveTemporaryMembership}
      >
        <Ionicons name="key-outline" size={18} color="#fff" />
        <ThemedText style={styles.devButtonText}>
          Give Membership (DEV)
        </ThemedText>
      </TouchableOpacity>


      <Spacer height={80} />
    </ScrollView>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e6f4f9",
  },
  headerContainer: {
    alignSelf: "flex-start",
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1C1E21",
  },
  username: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0a84ff",
  },
  videoCard: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#000",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  video: {
    width: "100%",
    height: 210,
    backgroundColor: "#000",
  },
  videoOverlay: {
    position: "relative",
  },
  navSection: {
    marginTop: 10,
  },
  navCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  navText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#1C1E21",
    marginLeft: 12,
  },
  devButton: {
    marginTop: 30,
    backgroundColor: "#34c759",
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  devButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

});
