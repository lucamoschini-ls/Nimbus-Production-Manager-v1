"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ========== ZONE ==========

export async function updateZona(id: string, data: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from("zone").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/impostazioni");
}

export async function createZona(data: { nome: string; colore: string; ordine: number }) {
  const supabase = await createClient();
  const { error } = await supabase.from("zone").insert(data);
  if (error) throw new Error(error.message);
  revalidatePath("/impostazioni");
}

export async function deleteZona(id: string) {
  const supabase = await createClient();
  // Check if zona has lavorazioni
  const { count } = await supabase
    .from("lavorazioni")
    .select("*", { count: "exact", head: true })
    .eq("zona_id", id);
  if (count && count > 0) {
    throw new Error(`Impossibile eliminare: la zona ha ${count} lavorazioni collegate`);
  }
  const { error } = await supabase.from("zone").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/impostazioni");
}

// ========== TIPOLOGIE ==========

export async function updateTipologia(id: string, data: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from("tipologie").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/impostazioni");
}

export async function createTipologia(data: { nome: string; colore: string; ordine: number }) {
  const supabase = await createClient();
  const { error } = await supabase.from("tipologie").insert(data);
  if (error) throw new Error(error.message);
  revalidatePath("/impostazioni");
}

export async function deleteTipologia(id: string, nome: string) {
  const supabase = await createClient();
  // Check if any task uses this tipologia
  const { count } = await supabase
    .from("task")
    .select("*", { count: "exact", head: true })
    .eq("tipologia", nome);
  if (count && count > 0) {
    throw new Error(`Impossibile eliminare: ${count} task usano questa tipologia`);
  }
  const { error } = await supabase.from("tipologie").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/impostazioni");
}
