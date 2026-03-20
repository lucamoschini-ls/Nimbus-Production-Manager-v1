import { createClient } from "@/lib/supabase/server";
import { MaterialiClient } from "./materiali-client";

export default async function MaterialiPage() {
  const supabase = await createClient();

  const [{ data: materiali }, { data: zone }, { data: operazioni }, { data: fornitori }, { data: luoghi }, { data: catalogo }] = await Promise.all([
    supabase.from("materiali").select(`*, task:task!materiali_task_id_fkey(id, titolo, lavorazione:lavorazioni!task_lavorazione_id_fkey(nome, zona:zone!lavorazioni_zona_id_fkey(id, nome, colore)))`).order("created_at", { ascending: false }),
    supabase.from("zone").select("id, nome").order("ordine"),
    supabase.from("operazioni").select("*, fornitore:fornitori!operazioni_fornitore_id_fkey(id, nome, stato), luogo:luoghi!operazioni_luogo_id_fkey(id, nome)").order("ordine"),
    supabase.from("fornitori").select("id, nome").order("nome"),
    supabase.from("luoghi").select("id, nome").order("ordine"),
    supabase.from("catalogo_materiali").select("*").order("tipologia_materiale").order("nome"),
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

  // Aggregate per catalogo
  type CatItem = { id: string; nome: string; tipologia_materiale: string; unita_default: string | null; prezzo_unitario_default: number | null; provenienza_default: string | null; note: string | null };
  const allMats = (materiali ?? []) as unknown as { catalogo_id: string | null; quantita: number | null; quantita_disponibile: number | null; task: { id: string; titolo: string; data_inizio: string | null; data_fine: string | null } }[];
  type CatAgg = CatItem & { task_count: number; qty_totale: number; qty_disponibile: number; tasks: { id: string; titolo: string; data_inizio: string | null; data_fine: string | null }[] };
  const catAgg: CatAgg[] = ((catalogo ?? []) as CatItem[]).map(c => {
    const linked = allMats.filter(m => m.catalogo_id === c.id);
    const tasks = linked.map(m => m.task).filter(Boolean);
    return {
      ...c,
      task_count: tasks.length,
      qty_totale: linked.reduce((s, m) => s + (m.quantita ?? 0), 0),
      qty_disponibile: linked.reduce((s, m) => s + (m.quantita_disponibile ?? 0), 0),
      tasks,
    };
  });

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
