import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImageManipulator from "expo-image-manipulator";
import { useTheme } from "../../contexts/ThemeContext";
import ThemedText from "../../components/ThemedText";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CROP_SIZE = Math.min(SCREEN_WIDTH - 48, 320);
const EXPORT_SIZE = 600;
const MIN_SCALE = 1;
const MAX_SCALE = 4;

export default function AvatarCrop() {
  const router = useRouter();
  const { theme } = useTheme();
  const params = useLocalSearchParams();

  const imageUri = Array.isArray(params.imageUri) ? params.imageUri[0] : params.imageUri;
  const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const origin = Array.isArray(params.origin) ? params.origin[0] : params.origin;

  const [naturalSize, setNaturalSize] = useState(null);
  const [imageLayout, setImageLayout] = useState(null);
  const [editorLayout, setEditorLayout] = useState(null);
  const [saving, setSaving] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  const currentScaleRef = useRef(1);
  const currentTranslateRef = useRef({ x: 0, y: 0 });

  const gestureStartScaleRef = useRef(1);
  const gestureStartTranslateRef = useRef({ x: 0, y: 0 });
  const startDistanceRef = useRef(null);

  useEffect(() => {
    if (!imageUri) return;

    Image.getSize(
      imageUri,
      (width, height) => {
        const fitScale = Math.max(CROP_SIZE / width, CROP_SIZE / height);

        setNaturalSize({ width, height });
        setImageLayout({
          width: width * fitScale,
          height: height * fitScale,
        });

        currentScaleRef.current = 1;
        currentTranslateRef.current = { x: 0, y: 0 };
        gestureStartScaleRef.current = 1;
        gestureStartTranslateRef.current = { x: 0, y: 0 };

        scaleAnim.setValue(1);
        translateXAnim.setValue(0);
        translateYAnim.setValue(0);
      },
      () => {
        Alert.alert("Error", "Could not load image dimensions.");
        router.back();
      }
    );
  }, [imageUri, router, scaleAnim, translateXAnim, translateYAnim]);

  const clampTranslate = (nextX, nextY, nextScale = currentScaleRef.current) => {
    if (!imageLayout) {
      return { x: nextX, y: nextY };
    }

    const scaledWidth = imageLayout.width * nextScale;
    const scaledHeight = imageLayout.height * nextScale;

    const maxOffsetX = Math.max(0, (scaledWidth - CROP_SIZE) / 2);
    const maxOffsetY = Math.max(0, (scaledHeight - CROP_SIZE) / 2);

    return {
      x: Math.min(maxOffsetX, Math.max(-maxOffsetX, nextX)),
      y: Math.min(maxOffsetY, Math.max(-maxOffsetY, nextY)),
    };
  };

  const applyTransform = (nextScale, nextX, nextY) => {
    currentScaleRef.current = nextScale;
    currentTranslateRef.current = { x: nextX, y: nextY };

    scaleAnim.setValue(nextScale);
    translateXAnim.setValue(nextX);
    translateYAnim.setValue(nextY);
  };

  const distanceBetweenTouches = (touches) => {
    if (!touches || touches.length < 2) return 0;
    const [a, b] = touches;
    const dx = a.pageX - b.pageX;
    const dy = a.pageY - b.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !!imageLayout,
      onMoveShouldSetPanResponder: () => !!imageLayout,

      onPanResponderGrant: (evt) => {
        gestureStartScaleRef.current = currentScaleRef.current;
        gestureStartTranslateRef.current = { ...currentTranslateRef.current };

        const touches = evt.nativeEvent.touches;
        if (touches.length >= 2) {
          startDistanceRef.current = distanceBetweenTouches(touches);
        } else {
          startDistanceRef.current = null;
        }
      },

      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length >= 2) {
          const currentDistance = distanceBetweenTouches(touches);

          if (!startDistanceRef.current) {
            startDistanceRef.current = currentDistance;
            gestureStartScaleRef.current = currentScaleRef.current;
            gestureStartTranslateRef.current = { ...currentTranslateRef.current };
            return;
          }

          const pinchRatio = currentDistance / startDistanceRef.current;
          const nextScale = Math.min(
            MAX_SCALE,
            Math.max(MIN_SCALE, gestureStartScaleRef.current * pinchRatio)
          );

          const clamped = clampTranslate(
            currentTranslateRef.current.x,
            currentTranslateRef.current.y,
            nextScale
          );

          applyTransform(nextScale, clamped.x, clamped.y);
          return;
        }

        const nextX = gestureStartTranslateRef.current.x + gestureState.dx;
        const nextY = gestureStartTranslateRef.current.y + gestureState.dy;
        const clamped = clampTranslate(nextX, nextY, currentScaleRef.current);

        applyTransform(currentScaleRef.current, clamped.x, clamped.y);
      },

      onPanResponderRelease: () => {
        gestureStartScaleRef.current = currentScaleRef.current;
        gestureStartTranslateRef.current = { ...currentTranslateRef.current };
        startDistanceRef.current = null;
      },

      onPanResponderTerminate: () => {
        gestureStartScaleRef.current = currentScaleRef.current;
        gestureStartTranslateRef.current = { ...currentTranslateRef.current };
        startDistanceRef.current = null;
      },
    });
  }, [imageLayout]);

  const handleCancel = () => {
    router.back();
  };

  const handleUsePhoto = async () => {
    if (!imageUri || !imageLayout || !naturalSize || !editorLayout) {
      Alert.alert("Error", "Image is not ready yet.");
      return;
    }

    try {
      setSaving(true);

      const scale = currentScaleRef.current;
      const translate = currentTranslateRef.current;

      const displayedWidth = imageLayout.width * scale;
      const displayedHeight = imageLayout.height * scale;

      const imageLeft =
        editorLayout.x + editorLayout.width / 2 - displayedWidth / 2 + translate.x;
      const imageTop =
        editorLayout.y + editorLayout.height / 2 - displayedHeight / 2 + translate.y;

      const cropLeft = editorLayout.x + (editorLayout.width - CROP_SIZE) / 2;
      const cropTop = editorLayout.y + (editorLayout.height - CROP_SIZE) / 2;

      const originX = ((cropLeft - imageLeft) / displayedWidth) * naturalSize.width;
      const originY = ((cropTop - imageTop) / displayedHeight) * naturalSize.height;
      const cropWidth = (CROP_SIZE / displayedWidth) * naturalSize.width;
      const cropHeight = (CROP_SIZE / displayedHeight) * naturalSize.height;

      const safeOriginX = Math.max(0, originX);
      const safeOriginY = Math.max(0, originY);
      const safeCropWidth = Math.min(cropWidth, naturalSize.width - safeOriginX);
      const safeCropHeight = Math.min(cropHeight, naturalSize.height - safeOriginY);

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: Math.round(safeOriginX),
              originY: Math.round(safeOriginY),
              width: Math.round(safeCropWidth),
              height: Math.round(safeCropHeight),
            },
          },
          {
            resize: {
              width: EXPORT_SIZE,
              height: EXPORT_SIZE,
            },
          },
        ],
        {
          compress: 0.9,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      if (!result?.uri) {
        throw new Error("Failed to create cropped image.");
      }

      router.replace({
        pathname: returnTo || "/(stack)/editProfile",
        params: {
          croppedAvatarUri: result.uri,
          origin: origin || "crop",
          t: String(Date.now()),
        },
      });
    } catch (error) {
      Alert.alert("Crop failed", error.message || "Unable to crop image.");
    } finally {
      setSaving(false);
    }
  };

  if (!imageUri) {
    return (
      <View style={[styles.missingWrap, { backgroundColor: theme.background }]}>
        <ThemedText>No image selected.</ThemedText>
        <Pressable
          onPress={() => router.back()}
          style={[styles.secondaryBtn, { backgroundColor: theme.surface }]}
        >
          <ThemedText style={{ color: theme.text }}>Go Back</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={handleCancel}
          style={[styles.iconBtn, { backgroundColor: theme.surface }]}
          accessibilityRole="button"
          accessibilityLabel="Cancel cropping"
        >
          <Ionicons name="close" size={20} color={theme.icon} />
        </Pressable>

        <ThemedText style={[styles.title, { color: theme.title }]}>
          Crop Profile Photo
        </ThemedText>

        <Pressable
          onPress={handleUsePhoto}
          disabled={saving}
          style={[
            styles.doneBtn,
            { backgroundColor: saving ? theme.uiBackground : theme.primary },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Use cropped photo"
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ThemedText style={styles.doneText}>Use Photo</ThemedText>
          )}
        </Pressable>
      </View>

      <View
        style={styles.editorArea}
        onLayout={(e) => setEditorLayout(e.nativeEvent.layout)}
        {...panResponder.panHandlers}
      >
        {imageLayout ? (
          <Animated.Image
            source={{ uri: imageUri }}
            resizeMode="stretch"
            style={[
              styles.editorImage,
              {
                width: imageLayout.width,
                height: imageLayout.height,
                transform: [
                  { translateX: translateXAnim },
                  { translateY: translateYAnim },
                  { scale: scaleAnim },
                ],
              },
            ]}
          />
        ) : (
          <ActivityIndicator size="large" color={theme.primary} />
        )}

        <View pointerEvents="none" style={styles.overlay}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.cropWindowWrap}>
              <View style={styles.cropWindow}>
                <View style={styles.circleGuide} />
              </View>
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom} />
        </View>
      </View>

      <View style={styles.bottomPanel}>
        <ThemedText style={[styles.tip, { color: theme.textMuted }]}>
          Drag to move and pinch to zoom.
        </ThemedText>
      </View>
    </View>
  );
}

const overlayColor = "rgba(0,0,0,0.58)";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  topBar: {
    paddingTop: 58,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 17,
    fontWeight: "900",
  },

  doneBtn: {
    minWidth: 96,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  doneText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 13,
  },

  editorArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  editorImage: {
    position: "absolute",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
  },

  overlayTop: {
    flex: 1,
    backgroundColor: overlayColor,
  },

  overlayMiddle: {
    flexDirection: "row",
    alignItems: "center",
    height: CROP_SIZE,
  },

  overlaySide: {
    flex: 1,
    backgroundColor: overlayColor,
  },

  cropWindowWrap: {
    width: CROP_SIZE,
    height: CROP_SIZE,
  },

  cropWindow: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.92)",
    overflow: "hidden",
  },

  circleGuide: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
    backgroundColor: "transparent",
  },

  overlayBottom: {
    flex: 1,
    backgroundColor: overlayColor,
  },

  bottomPanel: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    alignItems: "center",
  },

  tip: {
    fontSize: 13,
    textAlign: "center",
  },

  missingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  secondaryBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
});