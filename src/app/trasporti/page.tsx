import { createClient } from "@/lib/supabase/server";
import { TrasportiClient } from "./trasporti-client";

export const revalidate = 30;

export default async function TrasportiPage() {
  const supabase = await createClient();

  const [{ data: ops }, { data: luoghi }] = await Promise.all([
    supabase
      .from("operazioni")
      .select(`
        id, titolo, tipologia, stato, organizzato,
        data_inizio, data_fine, durata_ore, numero_persone, note,
        fornitore_id, luogo_id, materiale_id,
        fornitore:fornitori!operazioni_fornitore_id_fkey(id, nome),
        luogo:luoghi!operazioni_luogo_id_fkey(id, nome),
        materiale_ref:materiali!operazioni_materiale_id_fkey(nome, catalogo_id)
      `)
      .order("data_inizio", { ascending: true, nullsFirst: false }),
    supabase.from("luoghi").select("id, nome").order("ordine"),
  ]);

  return (
    <TrasportiClient
      ops={(ops ?? []) as unknown as import("./trasporti-client").Operazione[]}
      luoghi={(luoghi ?? []) as { id: string; nome: string }[]}
    />
  );
}
