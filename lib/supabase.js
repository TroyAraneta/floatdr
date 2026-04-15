import Constants from "expo-constants";
import { createClient } from "@supabase/supabase-js";

const extra = Constants.expoConfig?.extra ?? {};

// Temporary fallback so local testing still works before env vars are wired.
const SUPABASE_URL =
  extra.SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://wjidxazuxzhcvjthepuj.supabase.co";

const SUPABASE_ANON_KEY =
  extra.SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqaWR4YXp1eHpoY3ZqdGhlcHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NzM1MjAsImV4cCI6MjA4MTQ0OTUyMH0.9PFpOpIekrg3gOe5chP7n5Xs_aeb2wLAgE8lm0FiVdQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
