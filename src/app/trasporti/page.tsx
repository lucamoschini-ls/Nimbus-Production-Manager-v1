import { createClient } from "@/lib/supabase/server";
import { TrasportiClient } from "./trasporti-client";

export default async function TrasportiPage() {
  const supabase = await createClient();

  const [{ data: ops }, { data: fornitori }, { data: luoghi }, { data: zone }] = await Promise.all([
    supabase
      .from("operazioni")
      .select(`
        *, fornitore:fornitori!operazioni_fornitore_id_fkey(id, nome, stato),
        luogo:luoghi!operazioni_luogo_id_fkey(id, nome),
        materiale:materiali!operazioni_materiale_id_fkey(
          nome, quantita, unita,
          task:task!materiali_task_id_fkey(
            titolo,
            lavorazione:lavorazioni!task_lavorazione_id_fkey(
              nome, zona:zone!lavorazioni_zona_id_fkey(id, nome, colore)
            )
          )
        )
      `)
      .or("tipologia.eq.trasporto,tipologia.eq.acquisto_e_trasporto")
      .order("data_fine", { ascending: true, nullsFirst: false }),
    supabase.from("fornitori").select("id, nome").order("nome"),
    supabase.from("luoghi").select("id, nome").order("ordine"),
    supabase.from("zone").select("id, nome").order("ordine"),
  ]);

  return (
    <TrasportiClient
      ops={(ops ?? []) as unknown as import("./trasporti-client").TrasportoOp[]}
      fornitori={(fornitori ?? []) as { id: string; nome: string }[]}
      luoghi={(luoghi ?? []) as { id: string; nome: string }[]}
      zone={(zone ?? []) as { id: string; nome: string }[]}
    />
  );
}
