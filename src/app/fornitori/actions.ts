"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateFornitore(id: string, data: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from("fornitori").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/fornitori");
}

export async function createFornitore(data: {
  nome: string;
  tipo?: string;
  specializzazione?: string;
  contatto?: string;
  stato?: string;
  costo_ora?: number;
  note?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("fornitori").insert(data);
  if (error) throw new Error(error.message);
  revalidatePath("/fornitori");
}

export async function updatePermesso(id: string, data: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from("permessi").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/fornitori");
}

export async function createPermesso(data: {
  nome: string;
  stato?: string;
  responsabile?: string;
  data_scadenza?: string;
  note?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("permessi").insert(data);
  if (error) throw new Error(error.message);
  revalidatePath("/fornitori");
}
