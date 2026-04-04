import { createClient } from "@/lib/supabase/server";
import { FornitoriClient } from "./fornitori-client";

export default async function FornitoriPage() {
  const supabase = await createClient();

  const [{ data: fornitori }, { data: permessi }, { data: taskPerFornitore }, { data: opsPerFornitore }, { data: tipologieFornitore }, { data: taskCosts }] = await Promise.all([
    supabase.from("v_fornitori_riepilogo").select("*").order("nome"),
    supabase.from("permessi").select("*").order("nome"),
    supabase.from("v_task_completa").select("id, titolo, zona_nome, lavorazione_nome, lavorazione_id, stato_calcolato, fornitore_id").not("fornitore_id", "is", null),
    supabase.from("operazioni").select("fornitore_id, materiale:materiali!operazioni_materiale_id_fkey(task:task!materiali_task_id_fkey(id, titolo, stato_calcolato, lavorazione:lavorazioni!task_lavorazione_id_fkey(nome, zona:zone!lavorazioni_zona_id_fkey(nome))))").not("fornitore_id", "is", null),
    supabase.from("tipologie_fornitore").select("nome").order("ordine"),
    supabase.from("v_task_completa")
      .select("fornitore_id, ore_lavoro, numero_persone, costo_manodopera, fornitore_supporto_id, supporto_ore_lavoro, supporto_numero_persone, supporto_costo_ora")
      .not("fornitore_id", "is", null),
  ]);

  type TaskEntry = { id: string; titolo: string; zona_nome: string; lavorazione_nome: string; lavorazione_id: string; stato_calcolato: string; via?: string };
  const tasksByFornitore: Record<string, TaskEntry[]> = {};
  const seen = new Set<string>();

  // From direct fornitore_id
  taskPerFornitore?.forEach((t) => {
    if (!t.fornitore_id) return;
    if (!tasksByFornitore[t.fornitore_id]) tasksByFornitore[t.fornitore_id] = [];
    const key = `${t.fornitore_id}:${t.id}`;
    if (!seen.has(key)) { seen.add(key); tasksByFornitore[t.fornitore_id].push(t); }
  });

  // From operazioni → materiali → task
  (opsPerFornitore as unknown as { fornitore_id: string; materiale: { task: { id: string; titolo: string; stato_calcolato: string; lavorazione: { nome: string; zona: { nome: string } } } } }[])?.forEach((op) => {
    if (!op.fornitore_id || !op.materiale?.task) return;
    const t = op.materiale.task;
    if (!tasksByFornitore[op.fornitore_id]) tasksByFornitore[op.fornitore_id] = [];
    const key = `${op.fornitore_id}:${t.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      tasksByFornitore[op.fornitore_id].push({
        id: t.id, titolo: t.titolo, zona_nome: t.lavorazione?.zona?.nome ?? "",
        lavorazione_nome: t.lavorazione?.nome ?? "", lavorazione_id: "", stato_calcolato: t.stato_calcolato,
        via: "(via operazione)",
      });
    }
  });

  // Aggregate hours and costs per fornitore
  type FornCostData = { oreTotali: number; costoTotale: number };
  const fornCosts: Record<string, FornCostData> = {};

  taskCosts?.forEach((t: { fornitore_id: string | null; ore_lavoro: number | null; numero_persone: number | null; costo_manodopera: number | null; fornitore_supporto_id: string | null; supporto_ore_lavoro: number | null; supporto_numero_persone: number | null; supporto_costo_ora: number | null }) => {
    // As primary fornitore
    if (t.fornitore_id) {
      if (!fornCosts[t.fornitore_id]) fornCosts[t.fornitore_id] = { oreTotali: 0, costoTotale: 0 };
      const ore = (t.ore_lavoro ?? 0) * (t.numero_persone ?? 0);
      fornCosts[t.fornitore_id].oreTotali += ore;
      fornCosts[t.fornitore_id].costoTotale += t.costo_manodopera ?? 0;
    }
    // As support fornitore
    if (t.fornitore_supporto_id) {
      if (!fornCosts[t.fornitore_supporto_id]) fornCosts[t.fornitore_supporto_id] = { oreTotali: 0, costoTotale: 0 };
      const oreSup = (t.supporto_ore_lavoro ?? 0) * (t.supporto_numero_persone ?? 0);
      fornCosts[t.fornitore_supporto_id].oreTotali += oreSup;
      const costoSup = (t.supporto_numero_persone ?? 0) * (t.supporto_ore_lavoro ?? 0) * (t.supporto_costo_ora ?? 0);
      fornCosts[t.fornitore_supporto_id].costoTotale += costoSup;
    }
  });

  return (
    <FornitoriClient
      fornitori={fornitori ?? []}
      permessi={permessi ?? []}
      tasksByFornitore={tasksByFornitore}
      tipologieFornitore={tipologieFornitore ?? []}
      fornCosts={fornCosts}
    />
  );
}
