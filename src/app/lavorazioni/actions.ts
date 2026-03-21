"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateTask(id: string, data: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from("task").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/lavorazioni");
}

export async function createTask(data: {
  lavorazione_id: string;
  titolo: string;
  tipologia?: string;
  stato?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("task").insert(data);
  if (error) throw new Error(error.message);
  revalidatePath("/lavorazioni");
}

export async function createLavorazione(data: {
  zona_id: string;
  nome: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("lavorazioni").insert(data);
  if (error) throw new Error(error.message);
  revalidatePath("/lavorazioni");
}

export async function deleteLavorazione(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("lavorazioni").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/lavorazioni");
}

export async function deleteTask(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("task").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/lavorazioni");
}

export async function updateLavorazione(id: string, data: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from("lavorazioni").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/lavorazioni");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function omitKeys<T extends Record<string, any>>(obj: T, keys: string[]): Partial<T> {
  const result = { ...obj };
  for (const key of keys) delete result[key];
  return result;
}

export async function duplicateTask(taskId: string, targetLavorazioneId: string) {
  const supabase = await createClient();
  // Get original task
  const { data: orig } = await supabase.from("task").select("*").eq("id", taskId).single();
  if (!orig) throw new Error("Task not found");
  // Create copy (omit generated/computed fields)
  const taskData = omitKeys(orig, ["id", "created_at", "updated_at", "stato_calcolato", "costo_manodopera"]);
  const { data: newTask, error } = await supabase.from("task").insert({
    ...taskData,
    lavorazione_id: targetLavorazioneId,
    titolo: orig.titolo + " (copia)",
    stato: "da_fare",
  }).select("id").single();
  if (error) throw new Error(error.message);
  // Copy materiali
  const { data: mats } = await supabase.from("materiali").select("*").eq("task_id", taskId);
  if (mats && mats.length > 0) {
    for (const m of mats) {
      const mId = m.id;
      const matData = omitKeys(m, ["id", "created_at", "costo_totale", "quantita_da_acquistare", "data_consegna_prevista"]);
      const { data: newMat } = await supabase.from("materiali").insert({ ...matData, task_id: newTask!.id }).select("id").single();
      // Copy operazioni for this materiale
      if (newMat) {
        const { data: ops } = await supabase.from("operazioni").select("*").eq("materiale_id", mId);
        if (ops && ops.length > 0) {
          for (const op of ops) {
            const opData = omitKeys(op, ["id", "created_at", "updated_at", "stato_calcolato", "costo_manodopera"]);
            await supabase.from("operazioni").insert({ ...opData, materiale_id: newMat.id });
          }
        }
      }
    }
  }
  revalidatePath("/lavorazioni");
  return newTask!.id;
}
