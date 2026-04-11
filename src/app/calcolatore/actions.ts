"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateDriver(id: string, valore: number) {
  const supabase = await createClient();
  await supabase.from("calcolatore_driver").update({ valore, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/calcolatore");
}

export async function updateCoefficiente(id: string, valore: number) {
  const supabase = await createClient();
  await supabase.from("calcolatore_coefficienti").update({ valore, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/calcolatore");
}

export async function resetCoefficiente(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("calcolatore_coefficienti").select("valore_default").eq("id", id).single();
  if (data) {
    await supabase.from("calcolatore_coefficienti").update({ valore: data.valore_default, updated_at: new Date().toISOString() }).eq("id", id);
  }
  revalidatePath("/calcolatore");
}

export async function upsertDisponibilita(catalogoId: string, nomeMateriale: string, field: string, value: number) {
  const supabase = await createClient();
  // Try update first
  const { data: existing } = await supabase.from("materiali_disponibilita").select("id").eq("catalogo_id", catalogoId).single();
  if (existing) {
    await supabase.from("materiali_disponibilita").update({ [field]: value, updated_at: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await supabase.from("materiali_disponibilita").insert({ catalogo_id: catalogoId, nome_materiale: nomeMateriale, [field]: value });
  }
  revalidatePath("/calcolatore");
}

export async function addUnaTantum(nome: string) {
  const supabase = await createClient();
  await supabase.from("materiali_una_tantum").insert({ nome });
  revalidatePath("/calcolatore");
}

export async function updateUnaTantum(id: string, data: Record<string, unknown>) {
  const supabase = await createClient();
  await supabase.from("materiali_una_tantum").update(data).eq("id", id);
  revalidatePath("/calcolatore");
}

export async function deleteUnaTantum(id: string) {
  const supabase = await createClient();
  await supabase.from("materiali_una_tantum").delete().eq("id", id);
  revalidatePath("/calcolatore");
}
