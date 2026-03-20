import { createClient } from "@/lib/supabase/server";
import { FornitoriClient } from "./fornitori-client";

export default async function FornitoriPage() {
  const supabase = await createClient();

  const [{ data: fornitori }, { data: permessi }, { data: taskPerFornitore }] = await Promise.all([
    supabase.from("v_fornitori_riepilogo").select("*").order("nome"),
    supabase.from("permessi").select("*").order("nome"),
    supabase.from("v_task_completa").select("id, titolo, zona_nome, lavorazione_nome, lavorazione_id, stato_calcolato, fornitore_id").not("fornitore_id", "is", null),
  ]);

  // Group tasks by fornitore_id
  const tasksByFornitore: Record<string, { id: string; titolo: string; zona_nome: string; lavorazione_nome: string; lavorazione_id: string; stato_calcolato: string }[]> = {};
  taskPerFornitore?.forEach((t) => {
    if (!t.fornitore_id) return;
    if (!tasksByFornitore[t.fornitore_id]) tasksByFornitore[t.fornitore_id] = [];
    tasksByFornitore[t.fornitore_id].push(t);
  });

  return (
    <FornitoriClient
      fornitori={fornitori ?? []}
      permessi={permessi ?? []}
      tasksByFornitore={tasksByFornitore}
    />
  );
}
