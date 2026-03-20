import { createClient } from "@/lib/supabase/server";
import { TrasportiClient } from "./trasporti-client";

export default async function TrasportiPage() {
  const supabase = await createClient();

  const { data: ops } = await supabase
    .from("operazioni")
    .select(`
      id, titolo, organizzato, stato, tipologia, data_inizio, data_fine, note, luogo_id, luogo:luoghi!operazioni_luogo_id_fkey(id, nome),
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
    .or("tipologia.eq.trasporto,tipologia.eq.acquisto_e_trasporto")
    .order("data_fine", { ascending: true, nullsFirst: false });

  return <TrasportiClient ops={(ops ?? []) as unknown as import("./trasporti-client").TrasportoOp[]} />;
}
