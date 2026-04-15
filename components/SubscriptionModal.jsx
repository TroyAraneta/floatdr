import { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import ThemedText from "./ThemedText";
import { useMembership } from "../contexts/MembershipContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  presentRevenueCatPaywall,
  restoreRevenueCatPurchases,
} from "../lib/revenuecat";

export default function SubscriptionModal({
  visible,
  onClose,
  onCloseToMemberGate,
}) {
  const {
    isMember,
    loading,
    error,
    refreshMembership,
  } = useMembership();
  const { theme } = useTheme();
  const [actionLoading, setActionLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const closeModal = () => {
    if (typeof onCloseToMemberGate === "function") {
      onCloseToMemberGate();
      return;
    }
    onClose?.();
  };

  const handlePurchase = async () => {
    if (actionLoading) return;

    try {
      setActionLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user ?? null;

      if (!user) {
        Alert.alert("Login required", "Please log in to continue.");
        return;
      }

      const activated = await presentRevenueCatPaywall(user.id);

      if (!activated) {
        return;
      }

      const membershipState = await refreshMembership();
      const isActive = !!membershipState?.isMember;

      if (isActive) {
        Alert.alert("Success", "Membership is now active.");
        closeModal();
      } else {
        Alert.alert(
          "Purchase received",
          "Your purchase was received but membership is not active yet. Please try again in a moment."
        );
      }
    } catch (err) {
      console.error("Purchase flow error:", err);
      Alert.alert(
        "Unable to open subscription",
        "We couldn't open the subscription paywall right now. Please try again."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    if (actionLoading || restoreLoading) return;

    try {
      setRestoreLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user ?? null;

      if (!user) {
        Alert.alert("Login required", "Please log in to continue.");
        return;
      }

      await restoreRevenueCatPurchases(user.id);
      const membershipState = await refreshMembership();
      const isActive = !!membershipState?.isMember;

      if (isActive) {
        Alert.alert("Success", "Your purchases were restored.");
        closeModal();
      } else {
        Alert.alert(
          "No active purchase found",
          "We couldn't find an active membership to restore for this account."
        );
      }
    } catch (err) {
      console.error("Restore flow error:", err);
      Alert.alert(
        "Restore failed",
        "We couldn't restore purchases right now. Please try again."
      );
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={closeModal}
    >
      <Pressable style={styles.overlay} onPress={closeModal}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            style={[
              styles.popup,
              {
                backgroundColor: theme.surface,
                shadowColor: theme.shadow,
              },
            ]}
          >
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Ionicons name="close" size={24} color={theme.textMuted} />
            </TouchableOpacity>

            <ThemedText style={styles.header}>
              Membership Subscription
            </ThemedText>
            <ThemedText muted style={styles.subHeader}>
              Benefits
            </ThemedText>

            <View style={[styles.card, { backgroundColor: theme.uiBackground }]}>
              <Benefit
                icon="chatbubbles-outline"
                text="Members-only forum access"
                iconColor={theme.icon}
              />
              <Benefit
                icon="book-outline"
                text="Premium educational content"
                iconColor={theme.icon}
              />
              <Benefit
                icon="bookmark-outline"
                text="Save & bookmark discussions"
                iconColor={theme.icon}
              />
              <Benefit
                icon="heart-outline"
                text="Support ongoing app development"
                iconColor={theme.icon}
              />
            </View>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator />
                <ThemedText muted style={styles.loadingText}>
                  Checking membership...
                </ThemedText>
              </View>
            ) : isMember ? (
              <View style={styles.memberBox}>
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={theme.success}
                />
                <ThemedText
                  style={[styles.memberText, { color: theme.success }]}
                >
                  You're already a member
                </ThemedText>
              </View>
            ) : error ? (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle"
                  size={20}
                  color={theme.textMuted}
                />
                <ThemedText muted style={styles.errorText}>
                  Can't verify membership right now. Check your connection.
                </ThemedText>

                <TouchableOpacity
                  style={[
                    styles.button,
                    { backgroundColor: theme.primary, marginTop: 12 },
                  ]}
                  onPress={refreshMembership}
                  disabled={restoreLoading}
                >
                  <ThemedText
                    style={[styles.buttonText, { color: theme.surface }]}
                  >
                    Retry
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.restoreButton}
                  onPress={handleRestore}
                  disabled={actionLoading || restoreLoading}
                >
                  {restoreLoading ? (
                    <ActivityIndicator color={theme.primary} />
                  ) : (
                    <ThemedText
                      style={[styles.restoreText, { color: theme.primary }]}
                    >
                      Restore Purchases
                    </ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: theme.primary }]}
                  onPress={handlePurchase}
                  disabled={actionLoading || restoreLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color={theme.surface} />
                  ) : (
                    <ThemedText
                      style={[styles.buttonText, { color: theme.surface }]}
                    >
                      Purchase Membership
                    </ThemedText>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.restoreButton}
                  onPress={handleRestore}
                  disabled={actionLoading || restoreLoading}
                >
                  {restoreLoading ? (
                    <ActivityIndicator color={theme.primary} />
                  ) : (
                    <ThemedText
                      style={[styles.restoreText, { color: theme.primary }]}
                    >
                      Restore Purchases
                    </ThemedText>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Benefit({ icon, text, iconColor }) {
  return (
    <View style={styles.benefitRow}>
      <Ionicons name={icon} size={20} color={iconColor} />
      <ThemedText style={styles.benefitText}>{text}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  popup: {
    borderRadius: 20,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 1,
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
    marginTop: 8,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    marginLeft: 10,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  subHeader: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  memberBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  memberText: {
    fontWeight: "600",
    fontSize: 15,
    marginLeft: 6,
  },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
  },
  errorBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    textAlign: "center",
  },
  restoreButton: {
    marginTop: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 22,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
