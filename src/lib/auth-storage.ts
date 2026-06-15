// Persistência local dos dados do usuário/conta vindos do panel-login.
// Esses dados NÃO são autoridade — são apenas cache para `user_data.uuid`
// e `account_id` que o backend exige nos payloads. A sessão real fica no
// supabase client.

const KEY = "wr-vistoria-identity";

export type AppUser = {
  uuid: string;
  account_uuid: string | null;
  name?: string;
  email?: string;
  role?: string;
  is_super_admin?: boolean;
  branch_uuids?: string[] | null;
  principals_uuids?: string[] | null;
};

export type AppAccount = {
  id: string;
  name?: string;
  logo_url?: string | null;
  primary_color?: string | null;
};

export type Identity = {
  user: AppUser;
  account: AppAccount | null;
};

export function saveIdentity(identity: Identity) {
  try {
    localStorage.setItem(KEY, JSON.stringify(identity));
  } catch {
    // ignore
  }
}

export function readIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Identity;
  } catch {
    return null;
  }
}

export function clearIdentity() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
