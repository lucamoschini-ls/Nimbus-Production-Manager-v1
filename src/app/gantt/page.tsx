import { createClient } from "@/lib/supabase/server";
import { GanttClient } from "./gantt-client";

export default async function GanttPage() {
  const supabase = await createClient();

  const [{ data: zone }, { data: lavorazioni }, { data: tasks }, { data: materiali }, { data: operazioni }, { data: tipologie }, { data: allMateriali }] = await Promise.all([
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
      .select("id, materiale_id, titolo, tipologia, stato, stato_calcolato, data_inizio, data_fine, fornitore_id, fornitore:fornitori!operazioni_fornitore_id_fkey(nome, stato), luogo:luoghi!operazioni_luogo_id_fkey(nome)")
      .order("ordine"),
    supabase.from("tipologie").select("nome, colore").order("ordine"),
    supabase.from("materiali").select("id, task_id, nome"),
  ]);

  // Build tipologia color map
  const tipColorMap: Record<string, string> = {};
  tipologie?.forEach((t: { nome: string; colore: string }) => { tipColorMap[t.nome] = t.colore; });

  // Group operazioni by materiale_id
  type OpInfo = { id: string; materiale_id: string; titolo: string; tipologia: string | null; stato: string; stato_calcolato: string; data_inizio: string | null; data_fine: string | null; fornitore_id: string | null; fornitore: { nome: string; stato: string } | null; luogo: { nome: string } | null };
  const allOps = (operazioni ?? []) as unknown as OpInfo[];
  const opsByMat: Record<string, OpInfo[]> = {};
  allOps.forEach((op) => {
    if (!opsByMat[op.materiale_id]) opsByMat[op.materiale_id] = [];
    opsByMat[op.materiale_id].push(op);
  });

  // Build transport ops by task_id (for Gantt bars)
  const matLookup = new Map<string, { task_id: string; nome: string }>();
  (allMateriali ?? []).forEach((m: { id: string; task_id: string; nome: string }) => matLookup.set(m.id, m));

  type TransportOp = { id: string; matNome: string; taskId: string; fornitoreNome: string | null; luogoNome: string | null; data_inizio: string; data_fine: string };
  const transportOpsByTask: Record<string, TransportOp[]> = {};
  for (const op of allOps) {
    if (!op.data_inizio) continue;
    const tipLower = (op.tipologia || op.titolo || "").toLowerCase();
    if (!tipLower.includes("trasporto")) continue;
    const mat = matLookup.get(op.materiale_id);
    if (!mat) continue;
    const tOp: TransportOp = {
      id: op.id,
      matNome: mat.nome,
      taskId: mat.task_id,
      fornitoreNome: op.fornitore?.nome ?? null,
      luogoNome: op.luogo?.nome ?? null,
      data_inizio: op.data_inizio,
      data_fine: op.data_fine || op.data_inizio,
    };
    if (!transportOpsByTask[mat.task_id]) transportOpsByTask[mat.task_id] = [];
    transportOpsByTask[mat.task_id].push(tOp);
  }

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
      transportOpsByTask={transportOpsByTask}
      tipColorMap={tipColorMap}
      conflictDescriptions={conflictDescriptions}
    />
  );
}
