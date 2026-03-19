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
