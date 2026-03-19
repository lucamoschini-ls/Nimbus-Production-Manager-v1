import { createClient } from "@/lib/supabase/server";
import { ImpostazioniClient } from "./impostazioni-client";

export default async function ImpostazioniPage() {
  const supabase = await createClient();

  const [{ data: zone }, { data: tipologie }] = await Promise.all([
    supabase.from("zone").select("*").order("ordine"),
    supabase.from("tipologie").select("*").order("ordine"),
  ]);

  // Count lavorazioni per zona
  const { data: lavCounts } = await supabase
    .from("lavorazioni")
    .select("zona_id");

  const zonaLavCount: Record<string, number> = {};
  lavCounts?.forEach((l) => {
    zonaLavCount[l.zona_id] = (zonaLavCount[l.zona_id] || 0) + 1;
  });

  // Count task per tipologia
  const { data: taskTipCounts } = await supabase
    .from("task")
    .select("tipologia");

  const tipTaskCount: Record<string, number> = {};
  taskTipCounts?.forEach((t) => {
    if (t.tipologia) {
      tipTaskCount[t.tipologia] = (tipTaskCount[t.tipologia] || 0) + 1;
    }
  });

  return (
    <ImpostazioniClient
      zone={zone ?? []}
      tipologie={tipologie ?? []}
      zonaLavCount={zonaLavCount}
      tipTaskCount={tipTaskCount}
    />
  );
}
