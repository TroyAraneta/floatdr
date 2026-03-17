import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext();

export const SupabaseAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getVerifiedFlag = (u) => {
    // Supabase may expose one of these depending on version/provider
    return !!(u?.email_confirmed_at || u?.confirmed_at);
  };

  const isEmailVerified = useMemo(() => getVerifiedFlag(user), [user]);

  const refreshUser = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const nextUser = data?.session?.user ?? null;
    setUser(nextUser);
    return nextUser;
  }, []);

  useEffect(() => {
    let mounted = true;

    // Initial session check
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setUser(data.session?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
        setLoading(false);
      });

    // Listen for auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      // Note: don't flip loading here; loading is only for initial boot
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // Optional: ensure user state is fresh immediately after login
    // (auth state change listener will usually handle this)
    await refreshUser();
  }

  async function register(email, password) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isEmailVerified,
        refreshUser,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
