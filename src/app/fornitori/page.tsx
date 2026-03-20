import { createClient } from "@/lib/supabase/server";
import { FornitoriClient } from "./fornitori-client";

export default async function FornitoriPage() {
  const supabase = await createClient();

  const [{ data: fornitori }, { data: permessi }, { data: taskPerFornitore }, { data: opsPerFornitore }] = await Promise.all([
    supabase.from("v_fornitori_riepilogo").select("*").order("nome"),
    supabase.from("permessi").select("*").order("nome"),
    supabase.from("v_task_completa").select("id, titolo, zona_nome, lavorazione_nome, lavorazione_id, stato_calcolato, fornitore_id").not("fornitore_id", "is", null),
    supabase.from("operazioni").select("fornitore_id, materiale:materiali!operazioni_materiale_id_fkey(task:task!materiali_task_id_fkey(id, titolo, stato_calcolato, lavorazione:lavorazioni!task_lavorazione_id_fkey(nome, zona:zone!lavorazioni_zona_id_fkey(nome))))").not("fornitore_id", "is", null),
  ]);

  type TaskEntry = { id: string; titolo: string; zona_nome: string; lavorazione_nome: string; lavorazione_id: string; stato_calcolato: string };
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
      });
    }
  });

  return (
    <FornitoriClient
      fornitori={fornitori ?? []}
      permessi={permessi ?? []}
      tasksByFornitore={tasksByFornitore}
    />
  );
}
