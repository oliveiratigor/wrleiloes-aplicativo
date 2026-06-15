import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type AuthState = {
  session: Session | null;
  loading: boolean;
};

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ session: null, loading: true });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, loading: false });
    });
    supabase.auth.getSession().then(({ data }) => {
      setState({ session: data.session, loading: false });
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
