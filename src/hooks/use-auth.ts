import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { readIdentity, type AppAccount, type AppUser } from "@/lib/auth-storage";

export type AuthState = {
  session: Session | null;
  loading: boolean;
  user: AppUser | null;
  account: AppAccount | null;
};

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(() => {
    const ident = typeof window !== "undefined" ? readIdentity() : null;
    return {
      session: null,
      loading: true,
      user: ident?.user ?? null,
      account: ident?.account ?? null,
    };
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const ident = readIdentity();
      setState({
        session,
        loading: false,
        user: ident?.user ?? null,
        account: ident?.account ?? null,
      });
    });
    supabase.auth.getSession().then(({ data }) => {
      const ident = readIdentity();
      setState({
        session: data.session,
        loading: false,
        user: ident?.user ?? null,
        account: ident?.account ?? null,
      });
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
