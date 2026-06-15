import { supabase } from "@/lib/supabase";

export type VistoriaInput = {
  entryId: string;
  engineNumberVehicle?: string | null;
  engineNumberBase?: string | null;
  chassisNumberVehicle?: string | null;
  chassisNumberBase?: string | null;
  engineDiscrepancies: string[]; // verification_status.id[]
  chassisDiscrepancies: string[];
  rejectionReasons: string[];
  initialConditionUuid?: string | null;
  finalClassificationUuid?: string | null;
  finalApproval: "approved" | "rejected" | null;
  rejectionNotes?: string | null;
  notes?: string | null;
  chargeTow?: boolean | null;
  kmInitial?: number | null;
  kmFinal?: number | null;
};

/**
 * Estratégia: limpamos linhas anteriores da entrada (por type) e reinserimos.
 * Em paralelo, atualizamos `product_entries` com status final e dados de guincho.
 */
export async function salvarVistoria(v: VistoriaInput) {
  const { entryId } = v;

  // 1. apaga divergências/condições anteriores desta entrada
  const { error: delErr } = await supabase
    .from("product_divergences")
    .delete()
    .eq("product_entry_id", entryId);
  if (delErr) throw new Error(delErr.message);

  // 2. monta inserts
  const rows: Record<string, unknown>[] = [];
  const notes = v.notes?.trim() || null;
  for (const id of v.engineDiscrepancies) {
    rows.push({
      product_entry_id: entryId,
      verification_status_id: id,
      type: "engine",
      number_vehicle: v.engineNumberVehicle || null,
      number_base: v.engineNumberBase || null,
      notes,
    });
  }
  for (const id of v.chassisDiscrepancies) {
    rows.push({
      product_entry_id: entryId,
      verification_status_id: id,
      type: "chassis",
      number_vehicle: v.chassisNumberVehicle || null,
      number_base: v.chassisNumberBase || null,
      notes,
    });
  }
  for (const id of v.rejectionReasons) {
    rows.push({
      product_entry_id: entryId,
      verification_status_id: id,
      type: "rejection",
      notes,
    });
  }
  if (v.initialConditionUuid) {
    rows.push({
      product_entry_id: entryId,
      verification_status_id: v.initialConditionUuid,
      type: "initial_condition",
      notes,
    });
  }
  if (v.finalClassificationUuid) {
    rows.push({
      product_entry_id: entryId,
      verification_status_id: v.finalClassificationUuid,
      type: "final_classification",
      notes,
    });
  }

  if (rows.length > 0) {
    const { error: insErr } = await supabase.from("product_divergences").insert(rows);
    if (insErr) throw new Error(insErr.message);
  }

  // 3. atualiza entrada
  const { error: updErr } = await supabase
    .from("product_entries")
    .update({
      final_approval_status: v.finalApproval, // null | 'approved' | 'rejected'
      rejection_notes: v.finalApproval === "rejected" ? v.rejectionNotes ?? null : null,
      charge_tow: v.chargeTow ?? null,
      km_initial: v.kmInitial ?? null,
      km_final: v.kmFinal ?? null,
    })
    .eq("id", entryId);
  if (updErr) throw new Error(updErr.message);
}
