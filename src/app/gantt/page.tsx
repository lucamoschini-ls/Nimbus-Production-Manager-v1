import { createClient } from "@/lib/supabase/server";
import { GanttClient } from "./gantt-client";

export default async function GanttPage() {
  const supabase = await createClient();

  const [{ data: zone }, { data: lavorazioni }, { data: tasks }] = await Promise.all([
    supabase.from("zone").select("*").order("ordine"),
    supabase.from("lavorazioni").select("*").order("ordine"),
    supabase
      .from("v_task_completa")
      .select("id, titolo, lavorazione_id, zona_nome, zona_colore, zona_ordine, lavorazione_nome, data_inizio, data_fine, stato_calcolato, tipologia")
      .order("ordine"),
  ]);

  return (
    <GanttClient
      zone={zone ?? []}
      lavorazioni={lavorazioni ?? []}
      tasks={tasks ?? []}
    />
  );
}
