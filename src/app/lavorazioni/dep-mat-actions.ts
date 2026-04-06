"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ========== DIPENDENZE ==========

export async function addDipendenza(taskId: string, dipendeeDaId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_dipendenze")
    .insert({ task_id: taskId, dipende_da_id: dipendeeDaId });
  if (error) throw new Error(error.message);
  // Trigger ricalcolo stato
  await supabase.from("task").update({ updated_at: new Date().toISOString() }).eq("id", taskId);
  revalidatePath("/lavorazioni");
}

export async function removeDipendenza(taskId: string, dipendeeDaId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_dipendenze")
    .delete()
    .eq("task_id", taskId)
    .eq("dipende_da_id", dipendeeDaId);
  if (error) throw new Error(error.message);
  await supabase.from("task").update({ updated_at: new Date().toISOString() }).eq("id", taskId);
  revalidatePath("/lavorazioni");
}

export async function getDipendenze(taskId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_dipendenze")
    .select(`
      dipende_da_id,
      task:task!task_dipendenze_dipende_da_id_fkey (
        id, titolo, stato, stato_calcolato, data_inizio, data_fine,
        lavorazione:lavorazioni!task_lavorazione_id_fkey (
          nome,
          zona:zone!lavorazioni_zona_id_fkey ( nome )
        )
      )
    `)
    .eq("task_id", taskId);
  return data ?? [];
}

// ========== MATERIALI ==========

export async function getMateriali(taskId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("materiali")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at");
  return data ?? [];
}

export async function addMateriale(data: {
  task_id: string;
  nome: string;
  quantita?: number;
  unita?: string;
  prezzo_unitario?: number;
  provenienza?: string;
  giorni_consegna?: number;
  note?: string;
  catalogo_id?: string;
  _createInCatalog?: boolean;
}) {
  const supabase = await createClient();

  const { _createInCatalog, ...insertData } = data;

  // If no catalogo_id and _createInCatalog, create catalog entry first
  if (!insertData.catalogo_id && _createInCatalog) {
    const { data: catEntry, error: catErr } = await supabase
      .from("catalogo_materiali")
      .insert({
        nome: insertData.nome,
        tipologia_materiale: "consumo",
        unita_default: insertData.unita || null,
        prezzo_unitario_default: insertData.prezzo_unitario || null,
        provenienza_default: insertData.provenienza || null,
      })
      .select("id")
      .single();
    if (catErr) throw new Error(catErr.message);
    insertData.catalogo_id = catEntry.id;
  }

  const { error } = await supabase.from("materiali").insert(insertData);
  if (error) throw new Error(error.message);
  revalidatePath("/lavorazioni");
  revalidatePath("/materiali");
}

export async function updateMateriale(id: string, data: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from("materiali").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/lavorazioni");
  revalidatePath("/materiali");
}

export async function removeMateriale(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("materiali").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/lavorazioni");
  revalidatePath("/materiali");
}

export async function updateMaterialeQuantities(
  id: string,
  data: { quantita_disponibile?: number; quantita_ordinata?: number; data_ordine?: string | null }
) {
  const supabase = await createClient();
  const { error } = await supabase.from("materiali").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/lavorazioni");
  revalidatePath("/materiali");
}

export async function updateMaterialeDataNecessaria(id: string, data_necessaria: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("materiali").update({ data_necessaria }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/lavorazioni");
  revalidatePath("/gantt");
}

// ========== SEARCH TASKS (per dropdown dipendenze) ==========

// ========== CATALOGO ==========

export async function getCatalogo() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("catalogo_materiali")
    .select("*")
    .order("tipologia_materiale")
    .order("nome");
  return data ?? [];
}

// ========== OPERAZIONI (figlie dei materiali) ==========

export async function getOperazioniByMateriale(materialeId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("operazioni")
    .select("*, fornitore:fornitori!operazioni_fornitore_id_fkey(id, nome, stato)")
    .eq("materiale_id", materialeId)
    .order("ordine");
  return data ?? [];
}

export async function addOperazione(materialeId: string, titolo: string, tipologia?: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("operazioni").insert({
    materiale_id: materialeId,
    titolo,
    tipologia: tipologia || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/lavorazioni");
  revalidatePath("/materiali");
  revalidatePath("/trasporti");
}

export async function updateOperazione(id: string, data: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from("operazioni").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/lavorazioni");
  revalidatePath("/materiali");
}

export async function removeOperazione(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("operazioni").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/lavorazioni");
  revalidatePath("/materiali");
}

export async function searchTasks(query: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_task_completa")
    .select("id, titolo, zona_nome, lavorazione_nome, stato_calcolato")
    .ilike("titolo", `%${query}%`)
    .order("zona_ordine")
    .limit(30);
  return data ?? [];
}

