"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addPresenza(data: { data: string; fornitore_id: string; numero_persone: number; ore: number; costo_ora?: number; task_id?: string; note?: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("presenze").insert(data);
  if (error) throw new Error(error.message);
  revalidatePath("/presenze");
  revalidatePath("/costi");
}

export async function updatePresenza(id: string, data: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from("presenze").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/presenze");
  revalidatePath("/costi");
}

export async function deletePresenza(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("presenze").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/presenze");
  revalidatePath("/costi");
}
