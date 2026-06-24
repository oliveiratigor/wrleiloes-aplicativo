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
};

/**
 * Estratégia: limpamos linhas anteriores da entrada (por type) e reinserimos.
 * Em paralelo, atualizamos `product_entries` APENAS com status final da vistoria.
 * Cobrança (charge_tow) e KM de guincho são responsabilidade do backoffice — a
 * vistoria nunca escreve esses campos.
 *
 * IMPORTANTE: writes em tabelas com RLS retornam 0 rows sem erro quando a policy
 * bloqueia. Usamos `.select()` em todos os writes críticos para detectar bloqueio
 * silencioso e lançar erro explícito para o usuário.
 */
export async function salvarVistoria(v: VistoriaInput) {
  const { entryId } = v;

  // 1. apaga divergências/condições anteriores desta entrada
  const { error: delErr } = await supabase
    .from("product_divergences")
    .delete()
    .eq("product_entry_id", entryId);
  if (delErr) throw new Error(`Erro ao limpar divergências anteriores: ${delErr.message}`);

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
    const { data: inserted, error: insErr } = await supabase
      .from("product_divergences")
      .insert(rows)
      .select("id");
    if (insErr) throw new Error(`Erro ao salvar divergências: ${insErr.message}`);
    if (!inserted || inserted.length === 0) {
      throw new Error(
        "Divergências não puderam ser salvas. Verifique se você tem permissão para esta filial ou tente novamente.",
      );
    }
  }

  // 3. atualiza entrada — usa .select() para detectar bloqueio RLS silencioso
  const { data: updated, error: updErr } = await supabase
    .from("product_entries")
    .update({
      final_approval_status: v.finalApproval, // null | 'approved' | 'rejected'
      rejection_notes: v.finalApproval === "rejected" ? v.rejectionNotes ?? null : null,
    })
    .eq("id", entryId)
    .select("id, product_id, account_id");
  if (updErr) throw new Error(`Erro ao salvar vistoria: ${updErr.message}`);
  if (!updated || updated.length === 0) {
    throw new Error(
      "Vistoria não pôde ser salva. Verifique se você tem permissão para esta filial ou tente novamente.",
    );
  }

  // 4. registra evento de telemetria — falha silenciosa, não derruba o fluxo
  try {
    const entry = updated[0];
    const { data: authData } = await supabase.auth.getUser();
    let appUserId: string | null = null;
    if (authData?.user?.id) {
      const { data: appUser } = await supabase
        .from("app_users")
        .select("id")
        .eq("auth_user_id", authData.user.id)
        .maybeSingle();
      appUserId = appUser?.id ?? null;
    }

    await supabase.from("product_events").insert({
      product_id: entry.product_id,
      product_entry_id: entryId,
      account_id: entry.account_id,
      user_id: appUserId,
      event_type: "inspection_updated",
      payload: {
        final_approval_status: v.finalApproval,
        final_classification_uuid: v.finalClassificationUuid ?? null,
        initial_status_uuid: v.initialConditionUuid ?? null,
        engine_discrepancies: v.engineDiscrepancies,
        chassis_discrepancies: v.chassisDiscrepancies,
        rejection_reasons: v.rejectionReasons,
        rejection_notes: v.rejectionNotes ?? null,
        notes: v.notes ?? null,
      },
    });
  } catch (e) {
    console.error("[vistoria] falha ao registrar product_events (telemetria):", e);
  }
}
