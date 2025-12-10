import { Stack } from "expo-router"
import CustomHeader from "../../components/CustomHeader" // ✅ adjust path if needed

export default function StackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "center",
        animation: "slide_from_right",
        header: () => <CustomHeader />, // ✅ global custom header
      }}
    >
      {/* Existing screens */}
      <Stack.Screen
        name="profileDetails"
        options={{
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="editProfile"
        options={{
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="userProfile"
        options={{
          headerShown: true,
        }}
      />

      {/* ✅ New Create Post page */}
      <Stack.Screen
        name="createThread"
        options={{
          title: "Create Thread",
          headerShown: true,
          animation: "slide_from_bottom", // 💫 feels more natural for posting
        }}
      />
    </Stack>
  )
}
