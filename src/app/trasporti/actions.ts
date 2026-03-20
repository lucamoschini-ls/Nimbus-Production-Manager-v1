"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateOperazioneField(id: string, data: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from("operazioni").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/trasporti");
  revalidatePath("/lavorazioni");
  revalidatePath("/materiali");
}

export async function cycleFornitoreStatoFromTrasporti(id: string, currentStato: string) {
  const cycle = ["da_trovare", "contattato", "confermato", "sopralluogo_fatto", "materiali_definiti", "pronto"];
  const idx = cycle.indexOf(currentStato);
  const next = cycle[(idx + 1) % cycle.length];
  const supabase = await createClient();
  await supabase.from("fornitori").update({ stato: next }).eq("id", id);
  revalidatePath("/trasporti");
  revalidatePath("/fornitori");
  revalidatePath("/");
}
