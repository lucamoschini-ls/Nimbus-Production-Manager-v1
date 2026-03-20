import { createClient } from "@/lib/supabase/server";
import { MaterialiClient } from "./materiali-client";

export default async function MaterialiPage() {
  const supabase = await createClient();

  const [{ data: materiali }, { data: zone }, { data: trasportoOps }] = await Promise.all([
    supabase
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
      .order("created_at", { ascending: false }),
    supabase.from("zone").select("id, nome").order("ordine"),
    supabase
      .from("operazioni")
      .select(`
        id, titolo, organizzato, stato, data_inizio, data_fine, note, luogo_partenza,
        fornitore:fornitori!operazioni_fornitore_id_fkey(nome, stato),
        materiale:materiali!operazioni_materiale_id_fkey(
          nome,
          task:task!materiali_task_id_fkey(
            titolo,
            lavorazione:lavorazioni!task_lavorazione_id_fkey(
              nome,
              zona:zone!lavorazioni_zona_id_fkey(nome, colore)
            )
          )
        )
      `)
      .eq("tipologia", "trasporto")
      .order("data_fine", { ascending: true, nullsFirst: false }),
  ]);

  return (
    <MaterialiClient
      materiali={materiali ?? []}
      zone={zone ?? []}
      trasportoOps={(trasportoOps ?? []) as unknown as import("./materiali-client").TrasportoOp[]}
    />
  );
}
