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
export const depositosQuery = queryOptions({
  queryKey: ["lookup", "depositos"],
  queryFn: () => selectLookup("deposits", true),
  staleTime: 5 * 60_000,
});
export const comitentesQuery = queryOptions({
  queryKey: ["lookup", "comitentes"],
  queryFn: () => selectLookup("principals", true),
  staleTime: 5 * 60_000,
});
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
