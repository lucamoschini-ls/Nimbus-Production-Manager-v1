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

// ---- CRUD Catalogo materiali ----

const CAMPO_MAP: Record<string, string> = {
  nome: "nome",
  unita: "unita_default",
  prezzo: "prezzo_unitario_default",
  fornitore: "fornitore_preferito",
  provenienza: "provenienza_default",
  tipologia: "tipologia_materiale",
  categoria: "categoria_comportamentale",
  note: "note",
};

export async function aggiornaMateriale(
  id: string,
  campo: string,
  valore: string | number | null
) {
  const dbColumn = CAMPO_MAP[campo];
  if (!dbColumn) throw new Error(`Campo non valido: ${campo}`);
  const supabase = await createClient();
  const { error } = await supabase
    .from("catalogo_materiali")
    .update({ [dbColumn]: valore })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function creaMateriale(nome: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catalogo_materiali")
    .insert({ nome, tipologia_materiale: "consumo" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const newId = data.id as string;

  const { error: errDisp } = await supabase
    .from("materiali_disponibilita")
    .insert({
      catalogo_id: newId,
      nome_materiale: nome,
      qta_magazzino: 0,
      qta_recupero: 0,
      qta_ordinata: 0,
    });
  if (errDisp) throw new Error(errDisp.message);

  return newId;
}

export async function eliminaMateriale(id: string) {
  const supabase = await createClient();

  // 1. Delete links (materiali table)
  const { error: errLinks } = await supabase
    .from("materiali")
    .delete()
    .eq("catalogo_id", id);
  if (errLinks) throw new Error(errLinks.message);

  // 2. Delete disponibilita
  const { error: errDisp } = await supabase
    .from("materiali_disponibilita")
    .delete()
    .eq("catalogo_id", id);
  if (errDisp) throw new Error(errDisp.message);

  // 3. Delete from catalogo
  const { error: errCat } = await supabase
    .from("catalogo_materiali")
    .delete()
    .eq("id", id);
  if (errCat) throw new Error(errCat.message);
}

// ---- CRUD Task ----

export async function aggiornaTask(
  id: string,
  campo: string,
  valore: string | number | null
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("task")
    .update({ [campo]: valore })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ---- CRUD Legami (materiali link rows) ----

export async function aggiornaLegame(legameId: string, quantita: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("materiali")
    .update({ quantita })
    .eq("id", legameId);
  if (error) throw new Error(error.message);
}

export async function creaLegame(
  taskId: string,
  catalogoId: string,
  quantita: number,
  unita: string
): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materiali")
    .insert({ task_id: taskId, catalogo_id: catalogoId, quantita, unita })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function eliminaLegame(legameId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("materiali")
    .delete()
    .eq("id", legameId);
  if (error) throw new Error(error.message);
}

export async function eliminaLegameByComposite(taskId: string, catalogoId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("materiali")
    .delete()
    .eq("task_id", taskId)
    .eq("catalogo_id", catalogoId);
  if (error) throw new Error(error.message);
}
