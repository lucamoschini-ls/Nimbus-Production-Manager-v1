"use server";

import { createClient } from "@/lib/supabase/server";

export async function aggiornaDisponibilita(
  catalogoId: string,
  campo: "qta_magazzino" | "qta_recupero" | "qta_ordinata",
  valore: number
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("materiali_disponibilita")
    .update({ [campo]: valore })
    .eq("catalogo_id", catalogoId);

  if (error) throw new Error(error.message);
}

export async function aggiornaDriver(id: string, valore: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("calcolatore_driver")
    .update({ valore, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function aggiornaCoefficiente(id: string, valore: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("calcolatore_coefficienti")
    .update({ valore, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
