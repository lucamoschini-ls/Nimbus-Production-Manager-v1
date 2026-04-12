import { createClient } from "@/lib/supabase/server";
import { PlanningClient } from "./planning-client";

export const revalidate = 30;

export default async function PlanningPage() {
  const supabase = await createClient();

  const [{ data: tasks }, { data: zone }, { data: tipologie }, { data: rawOps }, { data: allMats }, { data: fornitori }] =
    await Promise.all([
      supabase
        .from("v_task_completa")
        .select(
          "id, titolo, tipologia, stato, fornitore_nome, fornitore_id, data_inizio, data_fine, durata_ore, numero_persone, zona_nome, zona_colore, lavorazione_nome, stato_calcolato"
        ),
      supabase.from("zone").select("id, nome").order("ordine"),
      supabase.from("tipologie").select("nome, colore").order("ordine"),
      supabase
        .from("operazioni")
        .select("id, materiale_id, titolo, tipologia, data_inizio, data_fine, persone_necessarie, fornitore:fornitori!operazioni_fornitore_id_fkey(nome), luogo:luoghi!operazioni_luogo_id_fkey(nome)")
        .not("data_inizio", "is", null),
      supabase.from("materiali").select("id, task_id, nome"),
      supabase.from("fornitori").select("id, nome").order("nome"),
    ]);

  // Build transport ops for planning: fornitore_nome + date + label
  type PlanningOp = { id: string; matNome: string; taskId: string; taskTitolo: string; zonaNome: string; lavNome: string; fornitoreNome: string; luogoNome: string | null; persone: number | null; data_inizio: string; data_fine: string };
  const matMap = new Map<string, { task_id: string; nome: string }>();
  (allMats ?? []).forEach((m: { id: string; task_id: string; nome: string }) => matMap.set(m.id, m));
  const taskLookup = new Map<string, { titolo: string; zona_nome: string | null; lavorazione_nome: string | null }>();
  (tasks ?? []).forEach((t: { id: string; titolo: string; zona_nome: string | null; lavorazione_nome: string | null }) => taskLookup.set(t.id, t));

  const transportOps: PlanningOp[] = [];
  /* eslint-disable @typescript-eslint/no-explicit-any */
  for (const op of (rawOps ?? []) as any[]) {
    const tip = (op.tipologia || op.titolo || "").toLowerCase();
    if (!tip.includes("trasporto")) continue;
    const mat = matMap.get(op.materiale_id);
    const fornNome = Array.isArray(op.fornitore) ? op.fornitore[0]?.nome : op.fornitore?.nome;
    const luogoNome = Array.isArray(op.luogo) ? op.luogo[0]?.nome : op.luogo?.nome;
    if (!mat || !fornNome) continue;
    const parentTask = taskLookup.get(mat.task_id);
    transportOps.push({
      id: op.id,
      matNome: mat.nome,
      taskId: mat.task_id,
      taskTitolo: parentTask?.titolo ?? "",
      zonaNome: parentTask?.zona_nome ?? "",
      lavNome: parentTask?.lavorazione_nome ?? "",
      fornitoreNome: fornNome,
      luogoNome: luogoNome ?? null,
      persone: op.persone_necessarie ?? null,
      data_inizio: op.data_inizio,
      data_fine: op.data_fine || op.data_inizio,
    });
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const tipColorMap: Record<string, string> = {};
  (tipologie ?? []).forEach((t: { nome: string; colore: string }) => { tipColorMap[t.nome] = t.colore; });

  return (
    <PlanningClient
      tasks={tasks ?? []}
      zone={zone ?? []}
      tipologie={tipologie ?? []}
      transportOps={transportOps}
      tipColorMap={tipColorMap}
      fornitori={(fornitori ?? []) as { id: string; nome: string }[]}
    />
  );
}
