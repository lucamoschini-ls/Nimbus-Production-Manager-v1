import { createClient } from "@/lib/supabase/server";
import { LavorazioniClient } from "./lavorazioni-client";

export default async function LavorazioniPage() {
  const supabase = await createClient();

  const [{ data: zone }, { data: lavorazioni }, { data: tasks }, { data: fornitori }, { data: tipologie }] =
    await Promise.all([
      supabase.from("zone").select("*").order("ordine"),
      supabase.from("lavorazioni").select("*").order("ordine"),
      supabase.from("v_task_completa").select("*").order("ordine"),
      supabase.from("fornitori").select("id, nome, stato").order("nome"),
      supabase.from("tipologie").select("nome, colore").order("ordine"),
    ]);

  return (
    <LavorazioniClient
      zone={zone ?? []}
      lavorazioni={lavorazioni ?? []}
      tasks={tasks ?? []}
      fornitori={fornitori ?? []}
      tipologie={tipologie ?? []}
    />
  );
}
