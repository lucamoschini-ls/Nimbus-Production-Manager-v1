"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateFornitore(id: string, data: Record<string, unknown>) {
  const supabase = await createClient();

  // If costo_ora is being updated, propagate to tasks
  if (data.costo_ora !== undefined) {
    const newCosto = data.costo_ora as number | null;
    if (newCosto != null) {
      // Get old costo_ora
      const { data: old } = await supabase.from("fornitori").select("costo_ora").eq("id", id).single();
      const oldCosto = old?.costo_ora;

      // Update tasks where fornitore_id = this AND costo_ora is NULL or equal to old value
      await supabase.from("task").update({ costo_ora: newCosto })
        .eq("fornitore_id", id)
        .or(`costo_ora.is.null${oldCosto != null ? `,costo_ora.eq.${oldCosto}` : ""}`);

      // Same for fornitore_supporto_id → supporto_costo_ora
      await supabase.from("task").update({ supporto_costo_ora: newCosto })
        .eq("fornitore_supporto_id", id)
        .or(`supporto_costo_ora.is.null${oldCosto != null ? `,supporto_costo_ora.eq.${oldCosto}` : ""}`);
    }
  }

  const { error } = await supabase.from("fornitori").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/fornitori");
  revalidatePath("/lavorazioni");
  revalidatePath("/costi");
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
