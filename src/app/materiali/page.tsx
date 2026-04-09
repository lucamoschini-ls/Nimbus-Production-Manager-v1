import { createClient } from "@/lib/supabase/server";
import { MaterialiClient } from "./materiali-client";

export default async function MaterialiPage() {
  const supabase = await createClient();

  const [{ data: materiali }, { data: zone }, { data: operazioni }, { data: fornitori }, { data: luoghi }, { data: catalogoView }] = await Promise.all([
    supabase.from("materiali").select(`*, task:task!materiali_task_id_fkey(id, titolo, lavorazione:lavorazioni!task_lavorazione_id_fkey(nome, zona:zone!lavorazioni_zona_id_fkey(id, nome, colore)))`).order("created_at", { ascending: false }),
    supabase.from("zone").select("id, nome").order("ordine"),
    supabase.from("operazioni").select("*, fornitore:fornitori!operazioni_fornitore_id_fkey(id, nome, stato), luogo:luoghi!operazioni_luogo_id_fkey(id, nome)").order("ordine"),
    supabase.from("fornitori").select("id, nome").order("nome"),
    supabase.from("luoghi").select("id, nome").order("ordine"),
    supabase.from("v_catalogo_acquisti").select("*").order("nome"),
  ]);

  type OpFull = {
    id: string; materiale_id: string; titolo: string; tipologia: string | null;
    fornitore_id: string | null; luogo_id: string | null; organizzato: boolean;
    stato: string; durata_ore: number | null; note: string | null;
    fornitore: { id: string; nome: string; stato: string } | null;
    luogo: { id: string; nome: string } | null;
  };
  const allOps = (operazioni ?? []) as unknown as OpFull[];
  const opsByMat: Record<string, OpFull[]> = {};
  allOps.forEach((o) => { if (!opsByMat[o.materiale_id]) opsByMat[o.materiale_id] = []; opsByMat[o.materiale_id].push(o); });

  // Build task list per catalogo item (for "Usato in" section)
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const allMats = (materiali ?? []) as any[];
  const tasksByCatalogo: Record<string, { id: string; titolo: string; zona: string; lav: string; quantita: number }[]> = {};
  for (const m of allMats) {
    if (!m.catalogo_id || !m.task) continue;
    if (!tasksByCatalogo[m.catalogo_id]) tasksByCatalogo[m.catalogo_id] = [];
    const t = m.task;
    const lav = t.lavorazione;
    const zona = lav?.zona;
    tasksByCatalogo[m.catalogo_id].push({
      id: t.id,
      titolo: t.titolo,
      zona: zona?.nome ?? "",
      lav: lav?.nome ?? "",
      quantita: m.quantita ?? 0,
    });
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // Merge view data with task lists
  type CatView = { id: string; nome: string; tipologia_materiale: string; unita: string | null; prezzo_unitario: number | null; quantita_disponibile_globale: number; fornitore_preferito: string | null; provenienza_default: string | null; note: string | null; quantita_totale_necessaria: number; num_task: number; quantita_da_acquistare: number; costo_stimato: number | null };
  const catAgg = ((catalogoView ?? []) as CatView[]).map(c => ({
    ...c,
    tasks: tasksByCatalogo[c.id] || [],
  }));

  return (
    <MaterialiClient
      materiali={materiali ?? []}
      zone={zone ?? []}
      opsByMat={opsByMat}
      fornitori={(fornitori ?? []) as { id: string; nome: string }[]}
      luoghi={(luoghi ?? []) as { id: string; nome: string }[]}
      catalogo={catAgg}
    />
  );
}
