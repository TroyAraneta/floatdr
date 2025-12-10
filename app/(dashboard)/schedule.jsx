import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
} from "react-native";
import ThemedText from "../../components/ThemedText";
import Spacer from "../../components/Spacer";

const Schedule = () => {
  const handleOpenLink = async (url) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
  };

  const ServiceCard = ({ title, tagline, desc, points, image, links }) => (
    <View style={styles.card}>
      <ThemedText title style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText style={styles.tagline}>{tagline}</ThemedText>
      <ThemedText style={styles.desc}>{desc}</ThemedText>

      {points?.map((point, i) => (
        <ThemedText key={i} style={styles.point}>
          ✅ {point}
        </ThemedText>
      ))}

      {image && <Image source={image} style={styles.image} resizeMode="cover" />}

      <Spacer height={3} />
      <View style={styles.buttonRow}>
        {links.map((link, i) => (
          <TouchableOpacity
            key={i}
            style={styles.button}
            onPress={() => handleOpenLink(link.url)}
          >
            <ThemedText style={styles.buttonText}>{link.label}</ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText title style={styles.pageTitle}>
          Services
        </ThemedText>

        <Spacer height={25} />

        {/* Float Therapy */}
        <ServiceCard
          title="Float Therapy"
          tagline="Feel weightless, think clearly, and breathe deeper."
          desc='Float therapy (also known as "sensory deprivation", "isolation therapy", or "REST") places your body in a gravity-free, soundproof Float Lab tank filled with 1200 pounds of Epsom salt, allowing your mind and muscles to release fully.'
          points={[
            "Reduces anxiety, stress, and mental overwhelm",
            "Relieves tension, joint pain, and inflammation",
            "Promotes restful sleep and mental clarity",
            "Triggers the body’s natural healing response",
          ]}
          image={require("../../assets/img/FloatTherapy.jpg")}
          links={[
            { label: "Book 90-min Float", url: "https://floatdoctorbooking.as.me/schedule/c8ab2b35/appointment/4388609/calendar/any?appointmentTypeIds[]=4388609" },
            { label: "Book 60-min Float", url: "https://floatdoctorbooking.as.me/schedule/c8ab2b35/appointment/4746050/calendar/any?appointmentTypeIds[]=4746050" },
          ]}
        />

        {/* Infrared Sauna */}
        <ServiceCard
          title="Infrared Sauna"
          tagline="Heat your body from the inside out."
          desc="Our full-spectrum infrared sauna uses gentle heat to detox your system, reduce inflammation, and boost circulation. Unlike traditional steam saunas, it works deeper without overwhelming your lungs or senses."
          points={[
            "Flushes toxins and heavy metals",
            "Eases chronic inflammation and joint pain",
            "Supports metabolism, skin clarity, and stress relief",
            "Perfect before a float for maximum relaxation",
          ]}
          image={require("../../assets/img/FDLogo.png")}
          links={[{ label: "Book Sauna", url: "https://floatdoctorbooking.as.me/schedule/c8ab2b35/appointment/12484135/calendar/any?appointmentTypeIds[]=12484135" }]}
        />

        {/* Zero-Gravity Massage */}
        <ServiceCard
          title="Zero-Gravity Massage"
          tagline="Deep relief. No therapist required."
          desc="Our high-tech zero-gravity massage chair mimics real hands using rollers, vibration, and body scanning tech to relieve tension and improve circulation. You’ll leave feeling loose, grounded, and recharged."
          points={[
            "Scanning Technology",
            "Targets back, neck, legs, and hips",
            "Enhances blood flow and lymph drainage",
            "Perfect for stress, tension, and recovery",
          ]}
          image={require("../../assets/img/FDLogo.png")}
          links={[{ label: "Book Massage", url: "https://floatdoctorbooking.as.me/schedule/c8ab2b35/appointment/8813986/calendar/any?appointmentTypeIds[]=8813986" }]}
        />

        {/* 1:1 Private Consultation */}
        <ServiceCard
          title="1:1 Private Consultation"
          tagline="Not sure where to start? Get a personalized plan for healing."
          desc="Meet Elizabeth Heitzmann, MA, LPC — licensed psychotherapist and certified integrative mental health practitioner. Together, explore what’s weighing on you and build a custom healing path."
          points={[
            "Personalized emotional and physical wellness support",
            "Guidance for stress, anxiety, burnout, or trauma",
            "A safe space to be seen, heard, and helped",
            "Tools and techniques for everyday life",
          ]}
          image={require("../../assets/img/Consultation.jpg")}
          links={[
            { label: "Book Consultation", url: "https://www.floatdr.net/float-club" },
          ]}
        />

        {/* Therapeutic Supplements */}
        <ServiceCard
          title="Therapeutic Supplements"
          tagline="The right support can make all the difference."
          desc="Through our partnership with Fullscript, order therapist-approved supplements shipped right to your door for better sleep, focus, and energy."
          points={[
            "Only top-tier, clean, and effective products",
            "Great for sleep, focus, stress, and energy",
            "Safe, tested, and curated by professionals",
            "Auto-delivery options + reward points",
          ]}
          image={require("../../assets/img/FDLogo.png")}
          links={[
            { label: "Order Now", url: "https://us.fullscript.com/welcome/floatdoctor/store-start" },
          ]}
        />

        {/* The Trifecta Combo */}
        <ServiceCard
          title="The Trifecta Combo"
          tagline="Experience the ultimate Float Doctor reset."
          desc="Combining Float Therapy, Infrared Sauna, and Zero-Gravity Massage for complete body and mind rejuvenation."
          points={[
            "Deep physical & mental relaxation",
            "Enhanced recovery & circulation",
            "Ideal for stress, fatigue, and pain",
          ]}
          image={require("../../assets/img/Trifecta.jpg")}
          links={[
            { label: "Book The Trifecta", url: "https://floatdoctorbooking.as.me/schedule/c8ab2b35/appointment/24834294/calendar/any?appointmentTypeIds[]=24834294" },
          ]}
        />

        <Spacer height={40} />
      </ScrollView>
    </View>
  );
};

export default Schedule;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#e6f4f9",
  },
  scrollView: {
    backgroundColor: "#e6f4f9",
  },
  scroll: {
    padding: 20,
    paddingBottom: 100,
  },
  pageTitle: {
    fontSize: 22, 
    fontWeight: "800",
    color: "#1c1e21",
    textAlign: "left",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 25,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1c1e21",
    marginBottom: 6,
  },
  tagline: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0a84ff",
    marginBottom: 10,
  },
  desc: {
    fontSize: 14,
    color: "#555",
    marginBottom: 10,
  },
  point: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  image: {
    width: "100%",
    height: 310,
    borderRadius: 14,
    marginTop: 12,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  button: {
    flex: 1,
    backgroundColor: "#0a84ff",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 4,
    marginTop: 6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
