import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { apiCall } from "@/lib/api";
import type { LookupItem, PhotoType, VerificationStatus } from "./types";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

async function selectLookup(
  table: string,
  filterDeleted = false,
): Promise<LookupItem[]> {
  let q = supabase.from(table).select("id, name").order("name");
  if (filterDeleted) q = q.is("deleted_at", null);
  else q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { id: string; name: string }) => ({
    value: r.id,
    label: capitalize(r.name),
  }));
}

export const tiposQuery = queryOptions({
  queryKey: ["lookup", "tipos"],
  queryFn: () => selectLookup("types"),
  staleTime: 5 * 60_000,
});
export const coresQuery = queryOptions({
  queryKey: ["lookup", "cores"],
  queryFn: () => selectLookup("colors"),
  staleTime: 5 * 60_000,
});
export const marcasQuery = queryOptions({
  queryKey: ["lookup", "marcas"],
  queryFn: async (): Promise<LookupItem[]> => {
    const { data, error } = await supabase
      .from("brands")
      .select("id, name")
      .eq("active", true)
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map((b: { id: string; name: string }) => ({
      value: b.name,
      label: b.name,
    }));
  },
  staleTime: 5 * 60_000,
});
export const filiaisQuery = queryOptions({
  queryKey: ["lookup", "filiais"],
  queryFn: () => selectLookup("branches", true),
  staleTime: 5 * 60_000,
});

/**
 * Filiais restritas ao usuário logado. Super admin vê tudo; demais usuários
 * veem apenas as filiais em `branch_uuids` retornadas pelo `panel-login`.
 */
export function filiaisQueryFor(user: {
  is_super_admin?: boolean;
  branch_uuids?: string[] | null;
} | null) {
  const allowed = user?.branch_uuids ?? null;
  const isAdmin = !!user?.is_super_admin;
  return queryOptions({
    queryKey: ["lookup", "filiais", isAdmin ? "all" : (allowed ?? []).slice().sort().join(",")],
    queryFn: async () => {
      const all = await selectLookup("branches", true);
      if (isAdmin || !allowed || allowed.length === 0) return all;
      const set = new Set(allowed);
      return all.filter((o) => set.has(o.value));
    },
    staleTime: 5 * 60_000,
  });
}

export const depositosQuery = queryOptions({
  queryKey: ["lookup", "depositos"],
  queryFn: () => selectLookup("deposits", true),
  staleTime: 5 * 60_000,
});

/** Depósitos filtrados pela filial selecionada. */
export function depositosQueryFor(branchId: string | null | undefined) {
  return queryOptions({
    queryKey: ["lookup", "depositos", branchId ?? "all"],
    queryFn: async (): Promise<LookupItem[]> => {
      let q = supabase
        .from("deposits")
        .select("id, name, branch_id")
        .is("deleted_at", null)
        .order("name");
      if (branchId) q = q.eq("branch_id", branchId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []).map((r: { id: string; name: string }) => ({
        value: r.id,
        label: capitalize(r.name),
      }));
    },
    staleTime: 5 * 60_000,
  });
}
export const comitentesQuery = queryOptions({
  queryKey: ["lookup", "comitentes"],
  queryFn: () => selectLookup("principals", true),
  staleTime: 5 * 60_000,
});

/** Comitentes restritos ao usuário logado (mesma regra das filiais). */
export function comitentesQueryFor(user: {
  is_super_admin?: boolean;
  principals_uuids?: string[] | null;
} | null) {
  const allowed = user?.principals_uuids ?? null;
  const isAdmin = !!user?.is_super_admin;
  return queryOptions({
    queryKey: ["lookup", "comitentes", isAdmin ? "all" : (allowed ?? []).slice().sort().join(",")],
    queryFn: async () => {
      const all = await selectLookup("principals", true);
      if (isAdmin || !allowed || allowed.length === 0) return all;
      const set = new Set(allowed);
      return all.filter((o) => set.has(o.value));
    },
    staleTime: 5 * 60_000,
  });
}
export const tiposEntradaQuery = queryOptions({
  queryKey: ["lookup", "tipos-entrada"],
  queryFn: () => selectLookup("entry_types"),
  staleTime: 5 * 60_000,
});

export const tiposFotosQuery = queryOptions({
  queryKey: ["lookup", "tipos-fotos"],
  queryFn: async (): Promise<PhotoType[]> => {
    const { data, error } = await apiCall<undefined, PhotoType[]>("tipos-fotos");
    if (error) throw new Error(error);
    return (data ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
  },
  staleTime: 5 * 60_000,
});

export const verificationStatusQuery = queryOptions({
  queryKey: ["lookup", "verification-status"],
  queryFn: async (): Promise<VerificationStatus[]> => {
    const { data, error } = await supabase
      .from("verification_status")
      .select("id, name, applies_to, usage_context")
      .eq("active", true)
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as VerificationStatus[];
  },
  staleTime: 5 * 60_000,
});
