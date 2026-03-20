"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateMaterialeField(id: string, data: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from("materiali").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/materiali");
  revalidatePath("/lavorazioni");
  revalidatePath("/gantt");
}

export async function updateOperazioneFromMateriali(id: string, data: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from("operazioni").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/materiali");
  revalidatePath("/lavorazioni");
  revalidatePath("/trasporti");
}

export async function addOperazioneFromMateriali(materialeId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("operazioni").insert({ materiale_id: materialeId, titolo: "Nuova operazione" });
  if (error) throw new Error(error.message);
  revalidatePath("/materiali");
  revalidatePath("/lavorazioni");
  revalidatePath("/trasporti");
}

export async function updateCatalogoItem(id: string, data: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from("catalogo_materiali").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/materiali");
}

export async function addCatalogoItem(data: { nome: string; tipologia_materiale?: string; unita_default?: string; prezzo_unitario_default?: number; provenienza_default?: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("catalogo_materiali").insert(data);
  if (error) throw new Error(error.message);
  revalidatePath("/materiali");
}

export async function deleteOperazioneFromMateriali(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("operazioni").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/materiali");
  revalidatePath("/lavorazioni");
  revalidatePath("/trasporti");
}
