import { supabase } from "./supabase";
import { apiCall } from "./api";
import { clearIdentity, saveIdentity, type AppAccount, type AppUser } from "./auth-storage";


/** Resposta bruta do edge `panel-login`. */
type PanelLoginRaw = {
  ok?: boolean;
  requires_2fa?: boolean;
  temp_token?: string;
  token?: string;
  refresh_token?: string;
  user?: AppUser;
  account?: AppAccount | null;
  message?: string;
};

export type LoginStage1Result =
  | { ok: true; token: string; refresh_token: string; user: AppUser; account: AppAccount | null }
  | { ok: false; requires_2fa: true; temp_token: string }
  | { ok: false; requires_2fa?: false; message: string };

export type LoginStage2Result =
  | { ok: true; token: string; refresh_token: string; user: AppUser; account: AppAccount | null }
  | { ok: false; message: string };

function normalize(
  data: PanelLoginRaw | null,
  error: string | null,
): LoginStage1Result {
  // Sucesso
  if (data?.ok && data.token && data.refresh_token && data.user) {
    return {
      ok: true,
      token: data.token,
      refresh_token: data.refresh_token,
      user: data.user,
      account: data.account ?? null,
    };
  }
  // 2FA requerido
  if (data?.requires_2fa && data.temp_token) {
    return { ok: false, requires_2fa: true, temp_token: data.temp_token };
  }
  // Mensagem do edge (ex.: "Credenciais inválidas.")
  if (data?.message) {
    return { ok: false, message: data.message };
  }
  // Sem corpo (supabase-js descarta body em 4xx/5xx)
  return { ok: false, message: error ?? "Credenciais inválidas ou erro de conexão." };
}

/** Stage 1 — email + senha → token (se sem 2FA) ou temp_token (se 2FA). */
export async function loginWithPassword(email: string, password: string): Promise<LoginStage1Result> {
  const { data, error } = await apiCall<
    { email: string; password: string },
    PanelLoginRaw
  >("panel-login", { email, password });
  return normalize(data, error);
}

/** Stage 2 — temp_token + TOTP → sessão Supabase. */
export async function loginWithTotp(temp_token: string, totp_code: string): Promise<LoginStage2Result> {
  const { data, error } = await apiCall<
    { temp_token: string; totp_code: string },
    PanelLoginRaw
  >("panel-login", { temp_token, totp_code });
  if (data?.ok && data.token && data.refresh_token && data.user) {
    return {
      ok: true,
      token: data.token,
      refresh_token: data.refresh_token,
      user: data.user,
      account: data.account ?? null,
    };
  }
  if (data?.message) return { ok: false, message: data.message };
  return { ok: false, message: error ?? "Código inválido ou erro de conexão." };
}

/** Aplica a sessão retornada pelo panel-login no client Supabase local. */
export async function applySession(access_token: string, refresh_token: string) {
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw new Error(error.message);
}

/** Persiste user/account vindos do panel-login para uso nos payloads. */
export function rememberIdentity(user: AppUser, account: AppAccount | null) {
  saveIdentity({ user, account });
}

export async function signOut() {
  clearIdentity();
  await supabase.auth.signOut();
}
