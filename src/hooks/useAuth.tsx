import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type UserId = "CP" | "JX";

interface AuthContextValue {
  session: Session | null;
  /** profiles.display_name for the signed-in user ("CP" | "JX"). */
  userId: UserId | null;
  /** auth uid, equal to profiles.id — used as user_id on writes. */
  profileId: string | null;
  /** true until the initial session check resolves. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Send a password-reset email; the link returns to /reset-password. */
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  /** Set a new password for the current (signed-in or recovery) session. */
  updatePassword: (password: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userId, setUserId] = useState<UserId | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setUserId(null);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", s.user.id)
      .single();
    if (error) {
      setUserId(null);
      return;
    }
    setUserId((data?.display_name as UserId) ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      void loadProfile(data.session).finally(() => setLoading(false));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // Defer Supabase calls out of the callback to avoid the auth deadlock.
      setTimeout(() => void loadProfile(s), 0);
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error?.message ?? null };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        userId,
        profileId: session?.user.id ?? null,
        loading,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
