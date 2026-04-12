import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";

export default async function Dashboard() {
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  // Start of current week (Monday)
  const d = new Date();
  const dayOfWeek = d.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  const sundayEnd = new Date(monday);
  sundayEnd.setDate(monday.getDate() + 6);
  const weekStart = monday.toISOString().slice(0, 10);
  const weekEnd = sundayEnd.toISOString().slice(0, 10);

  const [
    { data: zoneRiepilogo },
    { data: fornitoriRiepilogo },
    { data: allTasks },
    { data: trasportiOps },
    { data: opsThisWeek },
  ] = await Promise.all([
    supabase.from("v_zona_riepilogo").select("*").order("ordine"),
    supabase
      .from("v_fornitori_riepilogo")
      .select("id, nome, stato, task_totali, task_bloccate_da_me")
      .order("task_bloccate_da_me", { ascending: false }),
    supabase.from("task").select("stato, stato_calcolato, updated_at", { count: "exact" }),
    // Count trasporti operations not organized
    supabase
      .from("operazioni")
      .select("id, organizzato")
      .or("tipologia.eq.trasporto,tipologia.eq.acquisto_e_trasporto")
      .eq("organizzato", false),
    // Operazioni this week for fornitore load
    supabase
      .from("operazioni")
      .select("fornitore_id, durata_ore, fornitore:fornitori!operazioni_fornitore_id_fkey(id, nome)")
      .gte("data_inizio", weekStart)
      .lte("data_inizio", weekEnd)
      .not("fornitore_id", "is", null),
  ]);

  const totalTasks = allTasks?.length ?? 0;
  const completedTasks = allTasks?.filter((t) => t.stato === "completata").length ?? 0;
  const blockedTasks = allTasks?.filter((t) =>
    t.stato_calcolato.startsWith("in_attesa") || t.stato_calcolato === "bloccata"
  ).length ?? 0;

  const totalFornitori = fornitoriRiepilogo?.length ?? 0;
  const readyFornitori = (fornitoriRiepilogo ?? []).filter((f) => f.stato === "pronto").length;

  const trasportiDaOrganizzare = trasportiOps?.length ?? 0;

  // Completions by day (last 14 days) for trend chart
  const completionsByDay: Record<string, number> = {};
  (allTasks ?? []).forEach((t) => {
    if (t.stato === "completata" && t.updated_at) {
      const day = t.updated_at.slice(0, 10);
      completionsByDay[day] = (completionsByDay[day] || 0) + 1;
    }
  });

  // Build trend data: from April 11 to today
  const trendData: { date: string; completate: number }[] = [];
  const startDate = new Date("2026-04-11");
  const endDate = new Date(today);
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    trendData.push({ date: dateStr, completate: completionsByDay[dateStr] || 0 });
  }

  // Fornitore loads this week
  const fornitoreLoadMap: Record<string, { nome: string; ore: number }> = {};
  (opsThisWeek ?? []).forEach((op) => {
    const forn = op.fornitore as { id: string; nome: string } | { id: string; nome: string }[] | null;
    const f = Array.isArray(forn) ? forn[0] : forn;
    if (f && op.durata_ore) {
      if (!fornitoreLoadMap[f.id]) {
        fornitoreLoadMap[f.id] = { nome: f.nome, ore: 0 };
      }
      fornitoreLoadMap[f.id].ore += op.durata_ore;
    }
  });

  const fornitoreLoads = Object.entries(fornitoreLoadMap)
    .map(([id, { nome, ore }]) => {
      const forn = (fornitoriRiepilogo ?? []).find((f) => f.id === id);
      return { id, nome, ore, stato: forn?.stato ?? "da_trovare" };
    })
    .sort((a, b) => b.ore - a.ore);

  return (
    <DashboardClient
      zoneRiepilogo={zoneRiepilogo ?? []}
      totalTasks={totalTasks}
      completedTasks={completedTasks}
      blockedTasks={blockedTasks}
      totalFornitori={totalFornitori}
      readyFornitori={readyFornitori}
      trasportiDaOrganizzare={trasportiDaOrganizzare}
      trendData={trendData}
      fornitoreLoads={fornitoreLoads}
    />
  );
}
