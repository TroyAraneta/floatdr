import React, { useMemo, useState } from "react";
import { View, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";
import { useTheme } from "../../contexts/ThemeContext";

const WEBVIEW_BASE_URL = "https://floatdoctor.app";
const buildInlineHtml = (videoId) => {
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?controls=1&modestbranding=1&rel=0&playsinline=1`;

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

export default function VideoScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id, title } = useLocalSearchParams();
  const [failed, setFailed] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);

  const videoId = String(id || "");

  const html = useMemo(() => buildInlineHtml(videoId), [videoId]);

  const openExternal = () => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: "#000" }]}>
      {/* Simple header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#111" />
        </Pressable>

        <View style={{ flex: 1 }}>
          <ThemedText
            style={[styles.title, { color: theme.title }]}
            numberOfLines={1}
          >
            {title ? String(title) : "Video"}
          </ThemedText>
        </View>
      </View>

      <View style={styles.playerWrap}>
        <WebView
          source={{ html, baseUrl: WEBVIEW_BASE_URL }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction={true}
          startInLoadingState
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
          originWhitelist={["*"]}
          userAgent={
            "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
          }
          onLoadStart={(event) => {
            console.log("[VideoWebView] onLoadStart:", event?.nativeEvent?.url);
            setFailed(false);
            setErrorInfo(null);
          }}
          onLoadEnd={(event) => {
            console.log("[VideoWebView] onLoadEnd:", event?.nativeEvent?.url);
          }}
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator />
            </View>
          )}
          onMessage={(event) => {
            console.log("[VideoWebView] onMessage:", event?.nativeEvent?.data);
          }}
          onError={(event) => {
            const ne = event?.nativeEvent || {};
            console.error("[VideoWebView] onError:", ne);
            setErrorInfo({
              kind: "error",
              code: ne.code,
              domain: ne.domain,
              description: ne.description,
            });
            setFailed(true);
          }}
          onHttpError={(event) => {
            const ne = event?.nativeEvent || {};
            console.error("[VideoWebView] onHttpError:", ne);
            setErrorInfo({
              kind: "http",
              statusCode: ne.statusCode,
              description: ne.description,
              url: ne.url,
            });
            setFailed(true);
          }}
        />

        {failed && (
          <View style={styles.errorOverlay}>
            <ThemedText style={styles.errorTitle}>
              This video can't be played in-app.
            </ThemedText>
            <ThemedText muted style={styles.errorText}>
              Some YouTube videos are blocked from embedded playback.
            </ThemedText>
            {!!errorInfo && (
              <ThemedText muted style={styles.errorDebugText}>
                {errorInfo.kind === "http"
                  ? `HTTP ${errorInfo.statusCode || "unknown"}`
                  : `Code ${errorInfo.code || "unknown"}${errorInfo.domain ? ` (${errorInfo.domain})` : ""}`}
              </ThemedText>
            )}

            <Pressable onPress={openExternal} style={styles.externalBtn}>
              <Ionicons name="logo-youtube" size={18} color="#fff" />
              <ThemedText style={styles.externalBtnText}>Watch on YouTube</ThemedText>
            </Pressable>
          </View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#000",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
  },
  playerWrap: { flex: 1 },
  webview: { flex: 1, backgroundColor: "#000" },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 12,
  },
  errorTitle: { color: "#fff", fontWeight: "900", fontSize: 16, textAlign: "center" },
  errorText: { textAlign: "center" },
  errorDebugText: { textAlign: "center", fontSize: 12 },
  externalBtn: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#cc0000",
  },
  externalBtnText: { color: "#fff", fontWeight: "800" },
});
