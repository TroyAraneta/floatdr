import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Colors } from "../constants/colors";
import { supabase } from "../lib/supabase";

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [userId, setUserId] = useState(null);
  const [isDark, setIsDark] = useState(false);

  // Ensure row exists + return preference
  const ensureAndGetPreference = async (uid) => {
    const { data, error } = await supabase
      .from("user_settings")
      .select("theme_preference")
      .eq("user_id", uid)
      .maybeSingle(); // ✅ avoids throwing on "no rows"

    // No row yet → create default
    if (!data && !error) {
      await supabase.from("user_settings").insert({
        user_id: uid,
        theme_preference: "light",
      });
      return "light";
    }

    return data?.theme_preference || "light";
  };

  const applyPreference = async (uid) => {
    const pref = await ensureAndGetPreference(uid);
    setIsDark(pref === "dark");
  };

  // ✅ Load initial + react to login/logout changes
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data?.session?.user?.id || null;

      if (!mounted) return;

      setUserId(uid);

      if (!uid) {
        setIsDark(false); // logged out => light UI
        return;
      }

      await applyPreference(uid);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const uid = session?.user?.id || null;

        if (!mounted) return;

        setUserId(uid);

        if (!uid) {
          // logged out => light UI (DO NOT write to DB here)
          setIsDark(false);
          return;
        }

        // logged in => restore saved preference
        await applyPreference(uid);
      }
    );

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const theme = useMemo(() => {
    return {
      ...Colors.light,
      ...(isDark ? Colors.dark : Colors.light),
    };
  }, [isDark]);

  // ✅ This is used by Settings toggle (and DOES save)
  const toggleDarkMode = async (value) => {
    setIsDark(value);

    if (!userId) return;

    await supabase
      .from("user_settings")
      .upsert({
        user_id: userId,
        theme_preference: value ? "dark" : "light",
        updated_at: new Date(),
      });
  };

  // ✅ This is used during logout to force light UI ONLY (no DB write)
  const forceLightForAuth = () => {
    setIsDark(false);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        toggleDarkMode,
        forceLightForAuth,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
};
