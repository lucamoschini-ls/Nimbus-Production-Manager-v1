import { createClient } from "@/lib/supabase/server";
import { LavorazioniClient } from "./lavorazioni-client";

export default async function LavorazioniPage({ searchParams }: { searchParams: Promise<{ task?: string }> }) {
  const supabase = await createClient();
  const params = await searchParams;

  const [{ data: zone }, { data: lavorazioni }, { data: tasks }, { data: fornitori }, { data: tipologie }, { data: materiali }, { data: luoghi }] =
    await Promise.all([
      supabase.from("zone").select("*").order("ordine"),
      supabase.from("lavorazioni").select("*").order("ordine"),
      supabase.from("v_task_completa").select("*").order("ordine"),
      supabase.from("fornitori").select("id, nome, stato").order("nome"),
      supabase.from("tipologie").select("nome, colore").order("ordine"),
      supabase.from("materiali").select("id, task_id, nome, quantita, unita, quantita_disponibile, quantita_ordinata, provenienza, data_necessaria, giorni_consegna, operazioni:operazioni(id, titolo, tipologia, organizzato, stato, fornitore:fornitori!operazioni_fornitore_id_fkey(nome))").order("created_at"),
      supabase.from("luoghi").select("id, nome").order("ordine"),
    ]);

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
    />
  );
}
