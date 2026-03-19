import { createClient } from "@/lib/supabase/server";
import { MaterialiClient } from "./materiali-client";

export default async function MaterialiPage() {
  const supabase = await createClient();

  const { data: materiali } = await supabase
    .from("materiali")
    .select(`
      *,
      task:task!materiali_task_id_fkey (
        id, titolo,
        lavorazione:lavorazioni!task_lavorazione_id_fkey (
          nome,
          zona:zone!lavorazioni_zona_id_fkey ( id, nome, colore )
        )
      )
    `)
    .order("created_at", { ascending: false });

  const { data: zone } = await supabase.from("zone").select("id, nome").order("ordine");

  return (
    <MaterialiClient materiali={materiali ?? []} zone={zone ?? []} />
  );
}
