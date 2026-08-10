import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as Linking from "expo-linking";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getMyProfile } from "../lib/profile";
import type { Profile } from "../types";

type AuthValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  recoveryMode: boolean;
  refreshProfile: () => Promise<void>;
  setProfile: (profile: Profile | null) => void;
  finishRecovery: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);

  const refreshProfile = useCallback(async () => {
    try {
      setProfile(await getMyProfile());
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) await refreshProfile();
      if (mounted) setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
      if (nextSession) setTimeout(() => void refreshProfile(), 0);
      else setProfile(null);
      setLoading(false);
    });

    const handleUrl = async (url: string | null) => {
      if (!url) return;
      if (url.includes("reset-password")) setRecoveryMode(true);
      const parsed = Linking.parse(url);
      const code = parsed.queryParams?.code;
      if (typeof code === "string" && code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) await refreshProfile();
      }
    };

    void Linking.getInitialURL().then(handleUrl);
    const urlListener = Linking.addEventListener("url", ({ url }) => void handleUrl(url));

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      urlListener.remove();
    };
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      setSession(null);
      setProfile(null);
      setRecoveryMode(false);
    }
  }, []);

  const value = useMemo<AuthValue>(() => ({
    session,
    profile,
    loading,
    recoveryMode,
    refreshProfile,
    setProfile,
    finishRecovery: () => setRecoveryMode(false),
    signOut,
  }), [session, profile, loading, recoveryMode, refreshProfile, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
