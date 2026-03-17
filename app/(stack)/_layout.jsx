import { Stack } from "expo-router";
import CustomHeader from "../../components/CustomHeader";
import { useTheme } from "../../contexts/ThemeContext";

export default function StackLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "center",
        animation: "slide_from_right",
        header: () => <CustomHeader />,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen
        name="subscription"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />

      <Stack.Screen name="profileDetails" options={{ headerShown: true }} />
      <Stack.Screen name="editProfile" options={{ headerShown: true }} />
      <Stack.Screen name="userProfile" options={{ headerShown: true }} />
      <Stack.Screen name="labTests" options={{ headerShown: true }} />
      <Stack.Screen
        name="avatarCrop"
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
          animation: "slide_from_bottom",
        }}
      />

      <Stack.Screen
        name="createThread"
        options={{
          title: "Create Thread",
          headerShown: true,
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="editThread"
        options={{
          title: "Edit Thread",
          headerShown: true,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="manageAdmins"
        options={{
          title: "Manage Admins",
          headerShown: true,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="changePassword"
        options={{
          title: "Change Password",
          headerShown: true,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="reportThread"
        options={{
          title: "Report Thread",
          headerShown: true,
          animation: "slide_from_right",
        }}
      />
    </Stack>
  );
}