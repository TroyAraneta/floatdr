import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ThemedText from "./ThemedText";
import { useTheme } from "../contexts/ThemeContext";

export default function TermsModal({ visible, onClose }) {
  const { theme } = useTheme();

  return (
    <Modal
      transparent={false}
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.screen, { backgroundColor: theme.background }]}
      >
        {/* Header */}
        <View
          style={[styles.header, { borderBottomColor: theme.uiBackground }]}
        >
          <View style={{ width: 36 }} />
          <ThemedText style={styles.headerTitle}>Terms & Conditions</ThemedText>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={[styles.closeBtn, { backgroundColor: theme.uiBackground }]}
          >
            <Ionicons name="close" size={18} color={theme.iconMuted} />
          </Pressable>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText muted style={styles.lastUpdated}>
            Last updated: January 1, 2025
          </ThemedText>

          <Section title="1. Acceptance of Terms">
            By downloading, installing, or using the Float Doctor app, you
            agree to be bound by these Terms and Conditions. If you do not
            agree to these terms, please do not use the app.
          </Section>

          <Section title="2. Use of the App">
            Float Doctor is intended for informational and wellness purposes
            only. The content within the app, including forum discussions,
            articles, and guidance, does not constitute medical advice.
            Always consult a qualified healthcare professional before making
            decisions about your health.
          </Section>

          <Section title="3. Membership & Subscriptions">
            Certain features of Float Doctor require an active membership
            subscription. Subscriptions are billed on a recurring basis and
            can be managed or cancelled at any time through your device's
            app store settings. Refunds are subject to the policies of the
            respective app store (Apple App Store or Google Play Store).
          </Section>

          <Section title="4. User Content">
            By posting content in the Float Doctor forum or any other
            community feature, you grant Float Doctor a non-exclusive,
            royalty-free license to display and distribute that content
            within the app. You are solely responsible for the content you
            post and agree not to share anything that is offensive, harmful,
            or violates applicable laws.
          </Section>

          <Section title="5. Privacy">
            Your privacy is important to us. We collect and process personal
            data in accordance with our Privacy Policy. By using the app,
            you consent to the collection and use of your data as described
            in the Privacy Policy.
          </Section>

          <Section title="6. Intellectual Property">
            All content, branding, design, and materials within Float Doctor
            are the intellectual property of Float Doctor and may not be
            reproduced, distributed, or used without prior written
            permission.
          </Section>

          <Section title="7. Limitation of Liability">
            To the fullest extent permitted by law, Float Doctor shall not
            be liable for any indirect, incidental, special, or
            consequential damages arising from your use of or inability to
            use the app, even if advised of the possibility of such damages.
          </Section>

          <Section title="8. Changes to Terms">
            We reserve the right to update these Terms and Conditions at any
            time. Continued use of the app after changes are posted
            constitutes your acceptance of the revised terms. We will notify
            users of significant changes through the app.
          </Section>

          <Section title="9. Contact Us">
            If you have any questions about these Terms and Conditions,
            please contact us at support@floatdr.net.
          </Section>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Section({ title, children }) {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionTitle, { color: theme.title }]}>
        {title}
      </ThemedText>
      <ThemedText style={[styles.sectionBody, { color: theme.text }]}>
        {children}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    flex: 1,
    textAlign: "center",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  lastUpdated: {
    fontSize: 12,
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
  },
});