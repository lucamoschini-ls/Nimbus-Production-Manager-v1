import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";

export default async function Dashboard() {
  const supabase = await createClient();

  const [
    { data: zoneRiepilogo },
    { data: taskUrgenti },
    { data: fornitoriRiepilogo },
    { data: allTasks },
  ] = await Promise.all([
    supabase.from("v_zona_riepilogo").select("*").order("ordine"),
    supabase
      .from("v_task_completa")
      .select("id, titolo, zona_nome, zona_colore, fornitore_nome, stato_calcolato, data_fine")
      .or("stato_calcolato.like.in_attesa%,stato_calcolato.eq.bloccata")
      .order("data_fine", { ascending: true, nullsFirst: false })
      .limit(10),
    supabase
      .from("v_fornitori_riepilogo")
      .select("id, nome, stato, task_totali, task_bloccate_da_me")
      .neq("stato", "pronto")
      .order("task_bloccate_da_me", { ascending: false }),
    supabase.from("task").select("stato, stato_calcolato", { count: "exact" }),
  ]);

  const totalTasks = allTasks?.length ?? 0;
  const completedTasks = allTasks?.filter((t) => t.stato === "completata").length ?? 0;
  const blockedTasks = allTasks?.filter((t) =>
    t.stato_calcolato.startsWith("in_attesa") || t.stato_calcolato === "bloccata"
  ).length ?? 0;
  const fornitoriDaTrovare = fornitoriRiepilogo?.filter((f) => f.stato === "da_trovare").length ?? 0;

  return (
    <DashboardClient
      zoneRiepilogo={zoneRiepilogo ?? []}
      taskUrgenti={taskUrgenti ?? []}
      fornitoriNonPronti={fornitoriRiepilogo ?? []}
      totalTasks={totalTasks}
      completedTasks={completedTasks}
      blockedTasks={blockedTasks}
      fornitoriDaTrovare={fornitoriDaTrovare}
    />
  );
}
