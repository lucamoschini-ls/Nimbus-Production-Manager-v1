import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";

export default async function Dashboard() {
  const supabase = await createClient();

  const [
    { data: zoneRiepilogo },
    { data: fornitoriRiepilogo },
    { data: allTasks },
    { data: allMateriali },
    { data: trasportiOps },
  ] = await Promise.all([
    supabase.from("v_zona_riepilogo").select("*").order("ordine"),
    supabase
      .from("v_fornitori_riepilogo")
      .select("id, nome, stato, task_totali, task_bloccate_da_me")
      .order("task_bloccate_da_me", { ascending: false }),
    supabase.from("task").select("stato, stato_calcolato", { count: "exact" }),
    // Count materiali that need purchasing (no quantita_disponibile >= quantita, not in_loco, not ordered)
    supabase.from("materiali").select("id, quantita, quantita_disponibile, quantita_ordinata, provenienza"),
    // Count trasporti operations not organized
    supabase
      .from("operazioni")
      .select("id, organizzato")
      .or("tipologia.eq.trasporto,tipologia.eq.acquisto_e_trasporto")
      .eq("organizzato", false),
  ]);

  const totalTasks = allTasks?.length ?? 0;
  const completedTasks = allTasks?.filter((t) => t.stato === "completata").length ?? 0;
  const blockedTasks = allTasks?.filter((t) =>
    t.stato_calcolato.startsWith("in_attesa") || t.stato_calcolato === "bloccata"
  ).length ?? 0;
  const fornitoriDaTrovare = (fornitoriRiepilogo ?? []).filter((f) => f.stato === "da_trovare").length;
  const fornitoriNonPronti = (fornitoriRiepilogo ?? []).filter((f) => f.stato !== "pronto");

  // Count materiali da acquistare
  const materialiDaAcquistare = (allMateriali ?? []).filter((m) => {
    const prov = m.provenienza;
    if (prov === "in_loco") return false;
    const disp = m.quantita_disponibile ?? 0;
    const ord = m.quantita_ordinata ?? 0;
    const tot = m.quantita ?? 0;
    if (tot > 0 && disp >= tot) return false;
    if (ord > 0) return false;
    if (prov === "magazzino") return false;
    return true;
  }).length;

  const trasportiDaOrganizzare = trasportiOps?.length ?? 0;

  return (
    <DashboardClient
      zoneRiepilogo={zoneRiepilogo ?? []}
      fornitoriNonPronti={fornitoriNonPronti}
      totalTasks={totalTasks}
      completedTasks={completedTasks}
      blockedTasks={blockedTasks}
      fornitoriDaTrovare={fornitoriDaTrovare}
      materialiDaAcquistare={materialiDaAcquistare}
      trasportiDaOrganizzare={trasportiDaOrganizzare}
    />
  );
}
