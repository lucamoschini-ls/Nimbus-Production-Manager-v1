"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const TASK_CYCLE = ["da_fare", "in_corso", "completata"];

export async function cycleTaskStato(id: string, currentStato: string) {
  const idx = TASK_CYCLE.indexOf(currentStato);
  const next = TASK_CYCLE[(idx + 1) % TASK_CYCLE.length];
  const supabase = await createClient();
  await supabase.from("task").update({ stato: next }).eq("id", id);
  revalidatePath("/lavorazioni");
  revalidatePath("/");
}

const FORN_CYCLE = ["da_trovare", "contattato", "confermato", "sopralluogo_fatto", "materiali_definiti", "pronto"];

export async function cycleFornitoreStato(id: string, currentStato: string) {
  const idx = FORN_CYCLE.indexOf(currentStato);
  const next = FORN_CYCLE[(idx + 1) % FORN_CYCLE.length];
  const supabase = await createClient();
  await supabase.from("fornitori").update({ stato: next }).eq("id", id);
  revalidatePath("/fornitori");
  revalidatePath("/");
}
