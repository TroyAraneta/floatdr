import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // 🔐 Login
  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw Error(error.message);

    setSession(data.session);
    setUser(data.user);
  }

  // 🆕 Register
  async function register(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw Error(error.message);

    setSession(data.session);
    setUser(data.user);
  }

  // 🚪 Logout
  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  }

  // 🔄 Check initial session on app start
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setAuthChecked(true);
    };

    init();

    // 🔥 Listen for auth changes (login, logout, refresh, etc.)
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        authChecked,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Easy hook
export const useAuth = () => useContext(AuthContext);
