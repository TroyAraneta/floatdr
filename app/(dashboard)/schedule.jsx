// dashboard/contact.jsx
import { StyleSheet } from 'react-native'
import ThemedView from "../../components/ThemedView"
import ThemedText from "../../components/ThemedText"
import Spacer from "../../components/Spacer"

const Schedule = () => {
  return (
    <ThemedView style={styles.container}>
      <ThemedText title={true} style={styles.heading}>
        Contact Us
      </ThemedText>
      <Spacer />
      <ThemedText>Send us a message anytime!</ThemedText>
    </ThemedView>
  )
}

export default Schedule

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  heading: { fontSize: 18, fontWeight: "bold" }
})
