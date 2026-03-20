import { createClient } from "@/lib/supabase/server";
import { GanttClient } from "./gantt-client";

export default async function GanttPage() {
  const supabase = await createClient();

  const [{ data: zone }, { data: lavorazioni }, { data: tasks }, { data: materiali }, { data: operazioni }] = await Promise.all([
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
    supabase
      .from("operazioni")
      .select("id, materiale_id, titolo, tipologia, stato, stato_calcolato, data_inizio, data_fine, fornitore_id, fornitore:fornitori!operazioni_fornitore_id_fkey(nome, stato)")
      .order("ordine"),
  ]);

  // Group operazioni by materiale_id
  type OpInfo = { id: string; materiale_id: string; titolo: string; tipologia: string | null; stato: string; stato_calcolato: string; data_inizio: string | null; data_fine: string | null; fornitore_id: string | null; fornitore: { nome: string; stato: string } | null };
  const allOps = (operazioni ?? []) as unknown as OpInfo[];
  const opsByMat: Record<string, OpInfo[]> = {};
  allOps.forEach((op) => {
    if (!opsByMat[op.materiale_id]) opsByMat[op.materiale_id] = [];
    opsByMat[op.materiale_id].push(op);
  });

  return (
    <GanttClient
      zone={zone ?? []}
      lavorazioni={lavorazioni ?? []}
      tasks={tasks ?? []}
      materiali={materiali ?? []}
      opsByMat={opsByMat}
    />
  );
}
