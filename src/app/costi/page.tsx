import { createClient } from "@/lib/supabase/server";
import { CostiClient } from "./costi-client";

export default async function CostiPage() {
  const supabase = await createClient();

  const [{ data: costiZona }, { data: taskConCosti }, { data: presenze }] = await Promise.all([
    supabase.from("v_costi_zona").select("*"),
    supabase.from("v_task_completa")
      .select("id, titolo, zona_nome, zona_colore, zona_ordine, lavorazione_nome, costo_manodopera, fornitore_id, fornitore_nome, ore_lavoro, numero_persone, data_inizio, durata_ore, supporto_numero_persone, supporto_ore_lavoro, supporto_costo_ora, fornitore_supporto_nome")
      .not("fornitore_id", "is", null)
      .order("zona_ordine"),
    supabase.from("presenze")
      .select("*, fornitore:fornitori!presenze_fornitore_id_fkey(nome)")
      .order("data", { ascending: false }),
  ]);

  return (
    <CostiClient
      costiZona={costiZona ?? []}
      taskConCosti={taskConCosti ?? []}
      presenze={(presenze ?? []) as unknown as import("./costi-client").PresenzaCosto[]}
    />
  );
}
