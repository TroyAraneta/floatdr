import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { supabase } from "./supabase";

export async function registerForPushNotifications(userId) {
  if (!Device.isDevice) return;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  await supabase.from("push_tokens").upsert({
    user_id: userId,
    token,
  });
}
