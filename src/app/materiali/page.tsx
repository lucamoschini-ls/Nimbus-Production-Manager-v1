import { createClient } from "@/lib/supabase/server";
import { MaterialiClient } from "./materiali-client";

export default async function MaterialiPage() {
  const supabase = await createClient();

  const [{ data: materiali }, { data: zone }, { data: operazioni }, { data: fornitori }, { data: luoghi }] = await Promise.all([
    supabase.from("materiali").select(`*, task:task!materiali_task_id_fkey(id, titolo, lavorazione:lavorazioni!task_lavorazione_id_fkey(nome, zona:zone!lavorazioni_zona_id_fkey(id, nome, colore)))`).order("created_at", { ascending: false }),
    supabase.from("zone").select("id, nome").order("ordine"),
    supabase.from("operazioni").select("*, fornitore:fornitori!operazioni_fornitore_id_fkey(id, nome, stato), luogo:luoghi!operazioni_luogo_id_fkey(id, nome)").order("ordine"),
    supabase.from("fornitori").select("id, nome").order("nome"),
    supabase.from("luoghi").select("id, nome").order("ordine"),
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

  return (
    <MaterialiClient
      materiali={materiali ?? []}
      zone={zone ?? []}
      opsByMat={opsByMat}
      fornitori={(fornitori ?? []) as { id: string; nome: string }[]}
      luoghi={(luoghi ?? []) as { id: string; nome: string }[]}
    />
  );
}
