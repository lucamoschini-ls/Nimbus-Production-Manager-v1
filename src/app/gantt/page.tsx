import { createClient } from "@/lib/supabase/server";
import { GanttClient } from "./gantt-client";

export default async function GanttPage() {
  const supabase = await createClient();

  const [{ data: zone }, { data: lavorazioni }, { data: tasks }, { data: materiali }] = await Promise.all([
    supabase.from("zone").select("*").order("ordine"),
    supabase.from("lavorazioni").select("*").order("ordine"),
    supabase
      .from("v_task_completa")
      .select("id, titolo, lavorazione_id, zona_nome, zona_colore, zona_ordine, lavorazione_nome, data_inizio, data_fine, stato_calcolato, tipologia")
      .order("ordine"),
    supabase
      .from("materiali")
      .select("id, task_id, nome, quantita, quantita_disponibile, quantita_ordinata, data_necessaria, giorni_consegna")
      .not("data_necessaria", "is", null),
  ]);

  return (
    <GanttClient
      zone={zone ?? []}
      lavorazioni={lavorazioni ?? []}
      tasks={tasks ?? []}
      materiali={materiali ?? []}
    />
  );
}
