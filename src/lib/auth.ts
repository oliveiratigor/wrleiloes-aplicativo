import { supabase } from "./supabase";
import { apiCall } from "./api";

export type LoginStage1Result =
  | { ok: true; needs_2fa: true; temp_token: string; message?: string }
  | { ok: true; needs_2fa: false; access_token: string; refresh_token: string; user: unknown }
  | { ok: false; message: string };

export type LoginStage2Result =
  | { ok: true; access_token: string; refresh_token: string; user: unknown }
  | { ok: false; message: string };

/** Stage 1 — email + senha → temp_token (se 2FA) ou sessão direta. */
export async function loginWithPassword(email: string, password: string) {
  const { data, error } = await apiCall<
    { email: string; password: string },
    LoginStage1Result
  >("panel-login", { email, password });
  if (error || !data) return { ok: false as const, message: error ?? "Falha na conexão." };
  return data;
}

/** Stage 2 — temp_token + TOTP → sessão Supabase. */
export async function loginWithTotp(temp_token: string, totp_code: string) {
  const { data, error } = await apiCall<
    { temp_token: string; totp_code: string },
    LoginStage2Result
  >("panel-login", { temp_token, totp_code });
  if (error || !data) return { ok: false as const, message: error ?? "Falha na conexão." };
  return data;
}

/** Aplica a sessão retornada pelo panel-login no client Supabase local. */
export async function applySession(access_token: string, refresh_token: string) {
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  await supabase.auth.signOut();
}
