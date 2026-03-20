"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateOperazioneField(id: string, data: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from("operazioni").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/trasporti");
  revalidatePath("/lavorazioni");
}
