import { createClient } from "@/lib/supabase/server";
import { PlanningClient } from "./planning-client";

export default async function PlanningPage() {
  const supabase = await createClient();

  const [{ data: tasks }, { data: zone }, { data: tipologie }] =
    await Promise.all([
      supabase
        .from("v_task_completa")
        .select(
          "id, titolo, tipologia, fornitore_nome, fornitore_id, data_inizio, data_fine, durata_ore, zona_nome, zona_colore, lavorazione_nome, stato_calcolato"
        ),
      supabase.from("zone").select("id, nome").order("ordine"),
      supabase.from("tipologie").select("nome").order("ordine"),
    ]);

  return (
    <PlanningClient
      tasks={tasks ?? []}
      zone={zone ?? []}
      tipologie={tipologie ?? []}
    />
  );
}
