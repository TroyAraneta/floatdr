import React from "react";
import {
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  View,
  Image,
} from "react-native";
import Spacer from "../../components/Spacer";
import ThemedText from "../../components/ThemedText";
import ThemedView from "../../components/ThemedView";

const Library = () => {
  const podcasts = [
    { id: 1, title: "Floating for Anxiety Relief" },
    { id: 2, title: "Mindfulness and Sensory Deprivation" },
  ];

  const articles = [
    { id: 1, title: "Top 5 Benefits of Float Therapy" },
    { id: 2, title: "Understanding the Science Behind Floating" },
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 🎧 Podcasts Section */}
        <View style={styles.sectionCard}>
          <ThemedText title style={styles.sectionTitle}>
            Podcasts
          </ThemedText>
          <ThemedText style={styles.sectionDesc}>
            Dive into relaxing talks and expert insights on mindfulness,
            floating, and self-care.
          </ThemedText>

          <Spacer height={12} />

          {podcasts.map((podcast) => (
            <TouchableOpacity key={podcast.id} style={styles.card}>
              <Image
                source={require("../../assets/img/FDLogo.png")}
                style={styles.cardImage}
              />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.cardTitle}>{podcast.title}</ThemedText>
                <ThemedText style={styles.cardSubtitle}>
                  Listen and unwind
                </ThemedText>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Spacer height={20} />

        {/* 📘 Articles Section */}
        <View style={styles.sectionCard}>
          <ThemedText title style={styles.sectionTitle}>
            Articles
          </ThemedText>
          <ThemedText style={styles.sectionDesc}>
            Learn about the science and philosophy behind float therapy.
          </ThemedText>

          <Spacer height={12} />

          {articles.map((article) => (
            <TouchableOpacity key={article.id} style={styles.articleCard}>
              <ThemedText style={styles.articleTitle}>
                {article.title}
              </ThemedText>
              <ThemedText style={styles.articleSubtitle}>
                Read more →
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <Spacer height={20} />

        {/* 🌿 Wellness Tips */}
        <View style={styles.tipsCard}>
          <ThemedText title style={styles.sectionTitle}>
            Wellness Tips
          </ThemedText>

          <Spacer height={10} />

          <ThemedText style={styles.tip}>
            🧘 Try floating once a week to maintain consistent relaxation
            benefits.
          </ThemedText>
          <ThemedText style={styles.tip}>
            💧 Stay hydrated before and after each float session.
          </ThemedText>
          <ThemedText style={styles.tip}>
            🌙 Practice mindfulness breathing before entering the float tank.
          </ThemedText>
        </View>

        <Spacer height={60} />
      </ScrollView>
    </ThemedView>
  );
};

export default Library;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e6f4f9",
  },
  scroll: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1c1e21",
    marginBottom: 6,
  },
  sectionDesc: {
    fontSize: 14,
    color: "#555",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fbff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cardImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1c1e21",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#777",
    marginTop: 3,
  },
  articleCard: {
    backgroundColor: "#f9fbff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  articleTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1c1e21",
  },
  articleSubtitle: {
    fontSize: 13,
    color: "#0a84ff",
    marginTop: 3,
  },
  tipsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  tip: {
    fontSize: 14,
    color: "#444",
    marginBottom: 8,
  },
});
