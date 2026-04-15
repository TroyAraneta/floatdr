export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || "",
    SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
    REVENUECAT_IOS_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || "",
    REVENUECAT_ANDROID_API_KEY:
      process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || "",
    REVENUECAT_ACTIVE_ENTITLEMENT_ID:
      process.env.EXPO_PUBLIC_REVENUECAT_ACTIVE_ENTITLEMENT_ID || "",
  },
});
