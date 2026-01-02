import { createContext, useEffect, useState } from "react"
import { supabase } from "../lib/supabase"  // your initialized client

export const UserContext = createContext()

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  // -------------------------------
  // LOGIN
  // -------------------------------
  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw Error(error.message)

    setUser(data.user)
  }

  // -------------------------------
  // REGISTER
  // -------------------------------
  async function register(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) throw Error(error.message)

    // Supabase auto-signs in only if email confirmation is disabled.
    setUser(data.user)
  }

  // -------------------------------
  // LOGOUT
  // -------------------------------
  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
  }

  // -------------------------------
  // CHECK EXISTING USER SESSION
  // -------------------------------
  async function getInitialUserValue() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (!error) setUser(user)
    else setUser(null)

    setAuthChecked(true)
  }

  // Check on mount
  useEffect(() => {
    getInitialUserValue()

    // 👇 also optional: realtime auth event listener
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <UserContext.Provider value={{
      user,
      login,
      register,
      logout,
      authChecked,
    }}>
      {children}
    </UserContext.Provider>
  )
}
