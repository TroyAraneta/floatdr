import React from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  Pressable,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import Spacer from "../../components/Spacer";
import ThemedText from "../../components/ThemedText";
import ThemedView from "../../components/ThemedView";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";

/* -------------------- VIDEO DATA -------------------- */

const VIDEOS = [
  {
    id: "ldD3hLoYoUA",
    title: "ADK Vitamins Explained",
    desc: "Vitamins A, D, and K work together to support immune health, bone strength, cardiovascular function, and overall balance in the body. When taken thoughtfully, these fat-soluble vitamins can play an important role in long-term wellness.",
  },
  {
    id: "MrI4DpuqrUM",
    title: "Why Magnesium Matters for Your Body",
    desc: "Magnesium is an essential mineral involved in hundreds of processes in the body, including muscle function, nervous system support, sleep, stress response, and energy production.",
  },
  {
    id: "U1fvrrtwDDc",
    title: "Small Changes That Support Natural Healing | Float Doctor",
    desc: "Small, intentional changes can have a meaningful impact on how your body feels and functions. Float Doctor shares a whole-body, integrative approach to wellness that focuses on understanding root causes, not just managing symptoms.",
  },
  {
    id: "j2sSEqPS92s",
    title: "What Is Functional Medicine",
    desc: "Functional medicine looks at root causes, not just symptoms.",
  },
];

/* -------------------- THUMBNAILS (NO API KEY) -------------------- */

const getYouTubeThumb = (id, quality = "hq") => {
  const file =
    quality === "max"
      ? "maxresdefault.jpg"
      : quality === "hq"
      ? "hqdefault.jpg"
      : "mqdefault.jpg";
  return `https://img.youtube.com/vi/${id}/${file}`;
};

const YouTubeThumb = ({ videoId }) => {
  const [src, setSrc] = React.useState(getYouTubeThumb(videoId, "hq"));
  const triedFallbackRef = React.useRef(false);

  return (
    <Image
      source={{ uri: src }}
      style={styles.thumbImg}
      resizeMode="cover"
      onError={() => {
        if (triedFallbackRef.current) return;
        triedFallbackRef.current = true;
        setSrc(getYouTubeThumb(videoId, "mq"));
      }}
    />
  );
};

/* -------------------- INLINE YOUTUBE PLAYER -------------------- */

const WEBVIEW_BASE_URL = "https://floatdoctor.app"; // use your real domain if you have one; any stable https origin is fine

const buildYouTubeHtml = (videoId) => {
  const src = `https://www.youtube.com/embed/${videoId}?controls=1&modestbranding=1&rel=0&playsinline=1`;
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style>
      html, body { margin:0; padding:0; height:100%; background:#000; }
      .wrap { position:absolute; top:0; left:0; right:0; bottom:0; }
      iframe { width:100%; height:100%; border:0; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <iframe
        src="${src}"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </div>
  </body>
</html>`;
};

const InlineYouTubePlayer = ({ videoId }) => {
  const html = React.useMemo(() => buildYouTubeHtml(videoId), [videoId]);

  return (
    <WebView
      source={{ html, baseUrl: WEBVIEW_BASE_URL }}
      style={styles.inlineWebView}
      javaScriptEnabled
      domStorageEnabled
      allowsFullscreenVideo
      mediaPlaybackRequiresUserAction
      originWhitelist={["*"]}
      // These two help YouTube embeds in many Android cases:
      thirdPartyCookiesEnabled
      sharedCookiesEnabled
    />
  );
};

/* -------------------- COMPONENT -------------------- */

const Library = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const [showList, setShowList] = React.useState(false);
  const isNavigatingRef = React.useRef(false);

  // NEW: featured inline play state (so it plays "at it is" instead of navigating)
  const [isFeaturedPlaying, setIsFeaturedPlaying] = React.useState(false);

  /* ---------- DAILY RANDOM FEATURED ---------- */

  const featuredVideo = React.useMemo(() => {
    const todayKey = new Date().toDateString();
    const hash = todayKey
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = hash % VIDEOS.length;
    return VIDEOS[index];
  }, []);

  // NEW: if the featured video changes (new day / different build), reset play state
  React.useEffect(() => {
    setIsFeaturedPlaying(false);
  }, [featuredVideo?.id]);

  const openVideo = React.useCallback(
    (video) => {
      if (isNavigatingRef.current) return;
      isNavigatingRef.current = true;

      router.push({
        pathname: "/video/[id]",
        params: {
          id: video.id,
          title: video.title,
          desc: video.desc,
        },
      });

      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 500);
    },
    [router]
  );

  const startFeaturedInline = React.useCallback(() => {
    setIsFeaturedPlaying(true);
  }, []);

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ---------------- FEATURED ---------------- */}

        <View style={[styles.featuredCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.featuredBadge, { backgroundColor: theme.uiBackground }]}>
            <ThemedText style={[styles.featuredBadgeText, { color: theme.icon }]}>
              FEATURED
            </ThemedText>
          </View>

          <ThemedText title style={styles.featuredTitle}>
            {featuredVideo.title}
          </ThemedText>

          <ThemedText muted style={styles.featuredDesc}>
            {featuredVideo.desc}
          </ThemedText>

          <Spacer height={12} />

          {/* NEW: Inline player (tap to play in place). Fullscreen is optional via expand button. */}
          <Pressable
            onPress={startFeaturedInline}
            style={[
              styles.featuredPlaceholder,
              { backgroundColor: theme.uiBackground },
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              isFeaturedPlaying ? "Featured video player" : "Play featured video"
            }
            accessibilityHint={
              isFeaturedPlaying
                ? "Video plays inline. Use expand to open full screen."
                : "Plays the featured video inline"
            }
          >
            {isFeaturedPlaying ? (
              <View style={styles.inlinePlayerWrap}>
                <InlineYouTubePlayer videoId={featuredVideo.id} />
              </View>
            ) : (
              <>
                {/* show thumbnail + play overlay before playing */}
                <View style={styles.featuredThumbWrap}>
                  <YouTubeThumb videoId={featuredVideo.id} />
                  <View style={styles.playOverlay} pointerEvents="none">
                    <Ionicons name="play" size={34} color="#fff" />
                  </View>
                </View>

                <ThemedText muted style={styles.placeholderText}>
                  Tap to play here
                </ThemedText>
              </>
            )}

            {/* Expand button (always available) */}
            <Pressable
              onPress={(e) => {
                e?.stopPropagation?.();
                openVideo(featuredVideo);
              }}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Open full screen video"
              accessibilityHint="Opens the featured video in a full screen player"
              style={styles.featuredOverlayBtn}
            >
              <Ionicons name="expand-outline" size={20} color="#fff" />
            </Pressable>
          </Pressable>
        </View>

        <Spacer height={32} />

        {/* ---------------- VIDEOS SECTION ---------------- */}

        <View style={styles.sectionHeaderRow}>
          <ThemedText title style={styles.sectionTitle}>
            Videos
          </ThemedText>

          <Pressable onPress={() => setShowList((prev) => !prev)}>
            <ThemedText style={{ color: theme.primary, fontWeight: "700" }}>
              {showList ? "Hide List" : "View All"}
            </ThemedText>
          </Pressable>
        </View>

        <Spacer height={14} />

        {/* ✅ UPDATED: Grid layout like the reference image (2 columns) */}
        <View
          style={[
            styles.videosGridWrap,
            { backgroundColor: theme.surface },
          ]}
        >
          <View style={styles.videosGrid}>
            {VIDEOS.map((video) => (
              <TouchableOpacity
                key={video.id}
                style={styles.videoGridCard}
                activeOpacity={0.85}
                onPress={() => openVideo(video)}
                accessibilityRole="button"
                accessibilityLabel={`Play video: ${video.title}`}
                accessibilityHint="Opens the video player screen"
              >
                <View
                  style={[
                    styles.videoGridThumb,
                    { backgroundColor: theme.uiBackground },
                  ]}
                >
                  <YouTubeThumb videoId={video.id} />
                  <View style={styles.playOverlay} pointerEvents="none">
                    <Ionicons name="play" size={28} color="#fff" />
                  </View>
                </View>

                <ThemedText
                  style={styles.videoGridTitle}
                  numberOfLines={2}
                >
                  {video.title}
                </ThemedText>
              </TouchableOpacity>
            ))}

            {/* Coming Soon Card (kept, matches grid style) */}
            <View style={styles.videoGridCard} accessibilityRole="text">
              <View
                style={[
                  styles.videoGridThumb,
                  { backgroundColor: theme.uiBackground, alignItems: "center", justifyContent: "center" },
                ]}
              >
                <Ionicons name="ellipsis-horizontal" size={28} color="#c7d6dd" />
              </View>
              <ThemedText muted style={styles.videoGridTitle} numberOfLines={2}>
                More videos coming soon
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Clickable List (unchanged) */}
        {showList && (
          <>
            <Spacer height={24} />
            <View style={{ gap: 14 }}>
              {VIDEOS.map((video) => (
                <Pressable
                  key={video.id}
                  onPress={() => openVideo(video)}
                  style={[styles.listItem, { backgroundColor: theme.surface }]}
                >
                  <Ionicons
                    name="play-circle-outline"
                    size={20}
                    color={theme.icon}
                  />
                  <ThemedText style={styles.listTitle}>{video.title}</ThemedText>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Spacer height={80} />
      </ScrollView>
    </ThemedView>
  );
};

export default Library;

/* -------------------- STYLES -------------------- */

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },

  featuredCard: {
    borderRadius: 20,
    padding: 20,
  },
  featuredBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  featuredBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  featuredTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  featuredDesc: {
    fontSize: 14,
    marginTop: 6,
  },

  // Featured player container
  featuredPlaceholder: {
    marginTop: 16,
    height: 160,
    borderRadius: 14,
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },

  featuredThumbWrap: {
    width: "100%",
    height: 160,
    borderRadius: 14,
    overflow: "hidden",
  },

  inlinePlayerWrap: {
    width: "100%",
    height: 160,
    borderRadius: 14,
    overflow: "hidden",
  },

  inlineWebView: {
    flex: 1,
    backgroundColor: "#000",
  },

  featuredOverlayBtn: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  placeholderText: {
    position: "absolute",
    left: 12,
    bottom: 12,
    fontSize: 13,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },

  /* ✅ NEW: grid wrapper like reference (white rounded container feel) */
  videosGridWrap: {
    borderRadius: 20,
    padding: 14,
  },

  /* ✅ NEW: two-column grid */
  videosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14, // RN 0.71+ supports this; if it breaks, I’ll switch to marginBottom.
  },

  /* ✅ NEW: grid cards */
  videoGridCard: {
    width: "48.5%", // leaves space for gap on most screens
  },

  /* ✅ NEW: thumbnail sizing similar to screenshot */
  videoGridThumb: {
    height: 118,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    marginBottom: 10,
  },

  thumbImg: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },

  playOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.18)",
  },

  /* ✅ NEW: title rhythm like reference (slightly larger + wraps) */
  videoGridTitle: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },

  /* Existing list styles unchanged */
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
});