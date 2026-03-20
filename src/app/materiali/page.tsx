import { createClient } from "@/lib/supabase/server";
import { MaterialiClient } from "./materiali-client";

export default async function MaterialiPage() {
  const supabase = await createClient();

  const [{ data: materiali }, { data: zone }, { data: operazioni }] = await Promise.all([
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
      .select("id, materiale_id, titolo, tipologia, organizzato, stato, fornitore:fornitori!operazioni_fornitore_id_fkey(nome, stato)")
      .order("ordine"),
  ]);

  // Group operazioni by materiale_id
  type OpInline = { id: string; materiale_id: string; titolo: string; tipologia: string | null; organizzato: boolean; stato: string; fornitore: { nome: string; stato: string } | null };
  const allOps = (operazioni ?? []) as unknown as OpInline[];
  const opsByMat: Record<string, OpInline[]> = {};
  allOps.forEach((o) => { if (!opsByMat[o.materiale_id]) opsByMat[o.materiale_id] = []; opsByMat[o.materiale_id].push(o); });

  return <MaterialiClient materiali={materiali ?? []} zone={zone ?? []} opsByMat={opsByMat} />;
}
