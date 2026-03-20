"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateMaterialeField(id: string, data: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from("materiali").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/materiali");
  revalidatePath("/lavorazioni");
  revalidatePath("/gantt");
}
