import { createClient } from "@/lib/supabase/server";
import { LavorazioniClient } from "./lavorazioni-client";

export default async function LavorazioniPage({ searchParams }: { searchParams: Promise<{ task?: string }> }) {
  const supabase = await createClient();
  const params = await searchParams;

  const [{ data: zone }, { data: lavorazioni }, { data: tasks }, { data: fornitori }, { data: tipologie }, { data: materiali }, { data: luoghi }, { data: dipendenze }] =
    await Promise.all([
      supabase.from("zone").select("*").order("ordine"),
      supabase.from("lavorazioni").select("*").order("ordine"),
      supabase.from("v_task_completa").select("*").order("ordine"),
      supabase.from("fornitori").select("id, nome, stato").order("nome"),
      supabase.from("tipologie").select("nome, colore").order("ordine"),
      supabase.from("materiali").select("id, task_id, nome, quantita, unita, quantita_disponibile, quantita_ordinata, provenienza, data_necessaria, giorni_consegna, catalogo_id, operazioni:operazioni(id, titolo, tipologia, organizzato, stato, fornitore:fornitori!operazioni_fornitore_id_fkey(nome))").order("created_at"),
      supabase.from("luoghi").select("id, nome").order("ordine"),
      supabase.from("task_dipendenze").select("task_id, dipende_da_id"),
    ]);

  // Calcola conflitti attrezzi: materiale_id -> "Nome attrezzo usato anche in TaskX (date)"
  const attrezziConflicts: Record<string, string> = {};
  const allMats = (materiali ?? []) as unknown as { id: string; task_id: string; nome: string; catalogo_id: string | null }[];
  const allTasks = (tasks ?? []) as unknown as { id: string; titolo: string; data_inizio: string | null; data_fine: string | null }[];
  // Group by catalogo_id
  const byCat: Record<string, typeof allMats> = {};
  allMats.forEach(m => { if (m.catalogo_id) { if (!byCat[m.catalogo_id]) byCat[m.catalogo_id] = []; byCat[m.catalogo_id].push(m); } });

  // Check for attrezzi (need to know which catalogo_id are attrezzi)
  const { data: attrezziCat } = await supabase.from("catalogo_materiali").select("id, nome").eq("tipologia_materiale", "attrezzo");
  const attrezziIds = new Set((attrezziCat ?? []).map(a => a.id));
  const attrezziNomi: Record<string, string> = {};
  (attrezziCat ?? []).forEach(a => { attrezziNomi[a.id] = a.nome; });

  for (const [catId, catMats] of Object.entries(byCat)) {
    if (!attrezziIds.has(catId) || catMats.length < 2) continue;
    for (let i = 0; i < catMats.length; i++) {
      const ti = allTasks.find(t => t.id === catMats[i].task_id);
      if (!ti?.data_inizio || !ti?.data_fine) continue;
      for (let j = 0; j < catMats.length; j++) {
        if (i === j) continue;
        const tj = allTasks.find(t => t.id === catMats[j].task_id);
        if (!tj?.data_inizio || !tj?.data_fine) continue;
        if (ti.data_inizio <= tj.data_fine && tj.data_inizio <= ti.data_fine) {
          attrezziConflicts[catMats[i].id] = `${attrezziNomi[catId]} usato anche in ${tj.titolo}`;
        }
      }
    }
  }

  return (
    <LavorazioniClient
      zone={zone ?? []}
      lavorazioni={lavorazioni ?? []}
      tasks={tasks ?? []}
      fornitori={fornitori ?? []}
      tipologie={tipologie ?? []}
      materiali={(materiali ?? []) as unknown as import("./lavorazioni-client").MaterialeInline[]}
      luoghi={luoghi ?? []}
      initialTaskId={params.task}
      attrezziConflicts={attrezziConflicts}
      dipendenze={(dipendenze ?? []) as { task_id: string; dipende_da_id: string }[]}
    />
  );
}
