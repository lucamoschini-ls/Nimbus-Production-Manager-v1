import { createClient } from "@/lib/supabase/server";
import { LavorazioniClient } from "./lavorazioni-client";

export default async function LavorazioniPage() {
  const supabase = await createClient();

  const [{ data: zone }, { data: lavorazioni }, { data: tasks }, { data: fornitori }, { data: tipologie }, { data: materiali }, { data: operazioni }] =
    await Promise.all([
      supabase.from("zone").select("*").order("ordine"),
      supabase.from("lavorazioni").select("*").order("ordine"),
      supabase.from("v_task_completa").select("*").order("ordine"),
      supabase.from("fornitori").select("id, nome, stato").order("nome"),
      supabase.from("tipologie").select("nome, colore").order("ordine"),
      supabase.from("materiali").select("id, task_id, nome, quantita, unita, quantita_disponibile, quantita_ordinata, data_necessaria, giorni_consegna").order("created_at"),
      supabase.from("operazioni").select("id, task_id, titolo, fornitore_id, organizzato, stato, fornitore:fornitori!operazioni_fornitore_id_fkey(nome, stato)").order("ordine"),
    ]);

  return (
    <LavorazioniClient
      zone={zone ?? []}
      lavorazioni={lavorazioni ?? []}
      tasks={tasks ?? []}
      fornitori={fornitori ?? []}
      tipologie={tipologie ?? []}
      materiali={materiali ?? []}
      operazioni={(operazioni ?? []) as unknown as { id: string; task_id: string; titolo: string; fornitore_id: string | null; organizzato: boolean; stato: string; fornitore: { nome: string; stato: string } | null }[]}
    />
  );
}
