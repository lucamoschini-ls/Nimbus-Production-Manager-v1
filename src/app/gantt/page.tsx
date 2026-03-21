import { createClient } from "@/lib/supabase/server";
import { GanttClient } from "./gantt-client";

export default async function GanttPage() {
  const supabase = await createClient();

  const [{ data: zone }, { data: lavorazioni }, { data: tasks }, { data: materiali }, { data: operazioni }, { data: tipologie }] = await Promise.all([
    supabase.from("zone").select("*").order("ordine"),
    supabase.from("lavorazioni").select("*").order("ordine"),
    supabase
      .from("v_task_completa")
      .select("id, titolo, lavorazione_id, zona_nome, zona_colore, zona_ordine, lavorazione_nome, data_inizio, data_fine, stato_calcolato, tipologia, fornitore_nome")
      .order("ordine"),
    supabase
      .from("materiali")
      .select("id, task_id, nome, quantita, quantita_disponibile, quantita_ordinata, data_necessaria, giorni_consegna")
      .not("data_necessaria", "is", null),
    supabase
      .from("operazioni")
      .select("id, materiale_id, titolo, tipologia, stato, stato_calcolato, data_inizio, data_fine, fornitore_id, fornitore:fornitori!operazioni_fornitore_id_fkey(nome, stato)")
      .order("ordine"),
    supabase.from("tipologie").select("nome, colore").order("ordine"),
  ]);

  // Build tipologia color map
  const tipColorMap: Record<string, string> = {};
  tipologie?.forEach((t: { nome: string; colore: string }) => { tipColorMap[t.nome] = t.colore; });

  // Group operazioni by materiale_id
  type OpInfo = { id: string; materiale_id: string; titolo: string; tipologia: string | null; stato: string; stato_calcolato: string; data_inizio: string | null; data_fine: string | null; fornitore_id: string | null; fornitore: { nome: string; stato: string } | null };
  const allOps = (operazioni ?? []) as unknown as OpInfo[];
  const opsByMat: Record<string, OpInfo[]> = {};
  allOps.forEach((op) => {
    if (!opsByMat[op.materiale_id]) opsByMat[op.materiale_id] = [];
    opsByMat[op.materiale_id].push(op);
  });

  // Calcola task con conflitti attrezzi
  const { data: attCat } = await supabase.from("catalogo_materiali").select("id").eq("tipologia_materiale", "attrezzo");
  const attIds = new Set((attCat ?? []).map(a => a.id));
  const { data: allMatsFull } = await supabase.from("materiali").select("task_id, catalogo_id");
  const byCat2: Record<string, string[]> = {};
  (allMatsFull ?? []).forEach((m: { task_id: string; catalogo_id: string | null }) => {
    if (m.catalogo_id && attIds.has(m.catalogo_id)) {
      if (!byCat2[m.catalogo_id]) byCat2[m.catalogo_id] = [];
      byCat2[m.catalogo_id].push(m.task_id);
    }
  });
  const conflictDescriptions: Record<string, string> = {};
  const allTasksG = (tasks ?? []) as unknown as { id: string; titolo: string; data_inizio: string | null; data_fine: string | null }[];
  for (const tids of Object.values(byCat2)) {
    if (tids.length < 2) continue;
    for (let i = 0; i < tids.length; i++) {
      const ti = allTasksG.find(t => t.id === tids[i]);
      if (!ti?.data_inizio || !ti?.data_fine) continue;
      for (let j = i + 1; j < tids.length; j++) {
        const tj = allTasksG.find(t => t.id === tids[j]);
        if (!tj?.data_inizio || !tj?.data_fine) continue;
        if (ti.data_inizio <= tj.data_fine && tj.data_inizio <= ti.data_fine) {
          conflictDescriptions[tids[i]] = `Attrezzo usato anche in: ${tj.titolo}`;
          conflictDescriptions[tids[j]] = `Attrezzo usato anche in: ${ti.titolo}`;
        }
      }
    }
  }

  return (
    <GanttClient
      zone={zone ?? []}
      lavorazioni={lavorazioni ?? []}
      tasks={tasks ?? []}
      materiali={materiali ?? []}
      opsByMat={opsByMat}
      tipColorMap={tipColorMap}
      conflictDescriptions={conflictDescriptions}
    />
  );
}
