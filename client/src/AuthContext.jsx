import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { getMe } from "./api";


const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  async function loadProfile() {
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    // Initial session, then keep in sync with Supabase auth state.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadProfile();
      else { setUser(null); setLoading(false); }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) loadProfile();
      else { setUser(null); setLoading(false); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);


  async function refresh() {
    await loadProfile();
  }
  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }


  return (
    <AuthContext.Provider value={{ user, setUser, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}


