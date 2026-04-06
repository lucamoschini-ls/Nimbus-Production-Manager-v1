"use client";

import { useState, useMemo } from "react";
import {
  startOfWeek,
  addDays,
  format,
  parseISO,
  isBefore,
  isAfter,
  startOfDay,
} from "date-fns";
import { it } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TaskDetailOverlay } from "@/components/task-detail-overlay";
import { useRouter } from "next/navigation";
import { SchedulingTab } from "./scheduling-tab";
import { AppTooltip } from "@/components/ui/app-tooltip";

const HOURS_PER_DAY = 11;
const WEEK_DAYS = 7; // Mon–Sun

interface PlanningTask {
  id: string;
  titolo: string;
  tipologia: string | null;
  fornitore_nome: string | null;
  fornitore_id: string | null;
  data_inizio: string | null;
  data_fine: string | null;
  durata_ore: number | null;
  numero_persone: number | null;
  zona_nome: string | null;
  zona_colore: string | null;
  lavorazione_nome: string | null;
  stato_calcolato: string | null;
}

interface TransportOp {
  id: string;
  matNome: string;
  taskId: string;
  taskTitolo: string;
  zonaNome: string;
  lavNome: string;
  fornitoreNome: string;
  luogoNome: string | null;
  data_inizio: string;
  data_fine: string;
}

interface Props {
  tasks: PlanningTask[];
  zone: { id: string; nome: string }[];
  tipologie: { nome: string }[];
  transportOps?: TransportOp[];
  tipColorMap?: Record<string, string>;
  fornitori?: { id: string; nome: string }[];
}

const TIPOLOGIA_SHORT: Record<string, string> = {
  carpenteria: "CARP",
  allestimento: "ALLES",
  verniciatura: "VERN",
  elettrico: "ELET",
  idraulico: "IDRA",
  manutenzione: "MAN",
  audio_luci: "A/L",
  giardinaggio: "GIAR",
  pianificazione: "PLAN",
  amministrativo: "AMM",
  trasporto: "TRAS",
  acquisto: "ACQ",
  acquisto_e_trasporto: "A+T",
};

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getTaskDays(
  task: PlanningTask,
  weekMonday: Date,
  weekSaturday: Date
): Date[] {
  if (!task.data_inizio) return [];

  const taskStart = startOfDay(parseISO(task.data_inizio));
  let taskEnd: Date;

  if (task.data_fine) {
    taskEnd = startOfDay(parseISO(task.data_fine));
  } else {
    const days =
      task.durata_ore && task.durata_ore > HOURS_PER_DAY
        ? Math.ceil(task.durata_ore / HOURS_PER_DAY)
        : 1;
    taskEnd = addDays(taskStart, days - 1);
  }

  const days: Date[] = [];
  const clampStart = isBefore(taskStart, weekMonday) ? weekMonday : taskStart;
  const clampEnd = isAfter(taskEnd, weekSaturday) ? weekSaturday : taskEnd;

  if (isAfter(clampStart, clampEnd)) return [];

  let current = clampStart;
  while (
    isBefore(current, addDays(clampEnd, 1)) &&
    days.length <= WEEK_DAYS
  ) {
    // Only include Mon–Sat (0=Sun, 1=Mon ... 6=Sat)
    const dow = current.getDay();
    if (dow >= 0 && dow <= 6) {
      days.push(current);
    }
    current = addDays(current, 1);
  }

  return days;
}

export function PlanningClient({ tasks, zone, tipologie, transportOps = [], tipColorMap = {}, fornitori = [] }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"planning" | "scheduling">("planning");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Default week: the Monday of the week containing April 14, 2026
  const [weekStart, setWeekStart] = useState<Date>(
    () => new Date("2026-04-13")
  );
  const [filterZona, setFilterZona] = useState<string>("");
  const [filterTipologia, setFilterTipologia] = useState<string>("");

  // Compute week days (Mon–Sat)
  const weekDays = useMemo(() => {
    return Array.from({ length: WEEK_DAYS }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const weekSaturday = weekDays[weekDays.length - 1];

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.fornitore_nome || !t.data_inizio) return false;
      if (filterZona && t.zona_nome !== filterZona) return false;
      if (filterTipologia && t.tipologia !== filterTipologia) return false;
      // Must overlap with the current week
      const taskDays = getTaskDays(t, weekStart, weekSaturday);
      return taskDays.length > 0;
    });
  }, [tasks, filterZona, filterTipologia, weekStart, weekSaturday]);

  // Filter transport ops for current week
  const filteredOps = useMemo(() => {
    return transportOps.filter((op) => {
      const opDate = format(startOfDay(parseISO(op.data_inizio)), "yyyy-MM-dd");
      const wStart = format(weekStart, "yyyy-MM-dd");
      const wEnd = format(weekSaturday, "yyyy-MM-dd");
      return opDate >= wStart && opDate <= wEnd;
    });
  }, [transportOps, weekStart, weekSaturday]);

  // Group by fornitore
  const fornitoreMap = useMemo(() => {
    const map = new Map<
      string,
      { tasks: PlanningTask[]; ops: TransportOp[]; totalHours: number }
    >();

    for (const task of filteredTasks) {
      const name = task.fornitore_nome!;
      if (!map.has(name)) {
        map.set(name, { tasks: [], ops: [], totalHours: 0 });
      }
      const entry = map.get(name)!;
      entry.tasks.push(task);

      const taskDays = getTaskDays(task, weekStart, weekSaturday);
      const daysCount = taskDays.length;
      if (task.durata_ore) {
        const totalTaskDaysRaw =
          task.durata_ore > HOURS_PER_DAY
            ? Math.ceil(task.durata_ore / HOURS_PER_DAY)
            : 1;
        const hoursPerTaskDay = task.durata_ore / totalTaskDaysRaw;
        entry.totalHours += hoursPerTaskDay * daysCount;
      } else {
        entry.totalHours += daysCount * HOURS_PER_DAY;
      }
    }

    // Add transport ops to their fornitore
    for (const op of filteredOps) {
      const name = op.fornitoreNome;
      if (!map.has(name)) {
        map.set(name, { tasks: [], ops: [], totalHours: 0 });
      }
      map.get(name)!.ops.push(op);
    }

    // Sort by fornitore name
    return new Map(
      Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    );
  }, [filteredTasks, filteredOps, weekStart, weekSaturday]);

  // Compute day totals
  const dayTotals = useMemo(() => {
    const totals = weekDays.map(() => 0);
    for (const task of filteredTasks) {
      const taskDays = getTaskDays(task, weekStart, weekSaturday);
      const totalTaskDaysRaw =
        task.durata_ore && task.durata_ore > HOURS_PER_DAY
          ? Math.ceil(task.durata_ore / HOURS_PER_DAY)
          : 1;
      const hoursPerDay = task.durata_ore
        ? task.durata_ore / totalTaskDaysRaw
        : HOURS_PER_DAY;

      for (const day of taskDays) {
        const idx = weekDays.findIndex(
          (wd) => format(wd, "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
        );
        if (idx >= 0) {
          totals[idx] += hoursPerDay;
        }
      }
    }
    return totals;
  }, [filteredTasks, weekDays, weekStart, weekSaturday]);

  const grandTotal = dayTotals.reduce((a, b) => a + b, 0);

  // Navigation
  const goToPrevWeek = () => setWeekStart((d) => addDays(d, -7));
  const goToNextWeek = () => setWeekStart((d) => addDays(d, 7));
  const goToToday = () =>
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const dayLabels = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

  return (
    <div className="space-y-4">
      {/* Header + Tab toggle */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-[#1d1d1f]">Planning</h1>
        <div className="flex gap-1 bg-[#f5f5f7] rounded-lg p-1">
          <button onClick={() => setActiveTab("planning")} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${activeTab === "planning" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"}`}>Settimanale</button>
          <button onClick={() => setActiveTab("scheduling")} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${activeTab === "scheduling" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"}`}>Scheduling</button>
        </div>
      </div>

      {activeTab === "scheduling" ? (
        <SchedulingTab
          tasks={tasks}
          fornitori={fornitori}
          tipColorMap={tipColorMap}
        />
      ) : (
      <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Week navigation */}
        <div className="flex items-center gap-1 bg-white border border-[#e5e5e7] rounded-[10px] px-1 py-1">
          <button
            onClick={goToPrevWeek}
            className="p-1.5 rounded-lg hover:bg-[#f5f5f7] transition-colors"
          >
            <ChevronLeft size={16} className="text-[#1d1d1f]" />
          </button>
          <input
            type="date"
            value={format(weekStart, "yyyy-MM-dd")}
            onChange={(e) => {
              if (e.target.value) {
                const d = parseISO(e.target.value);
                setWeekStart(startOfWeek(d, { weekStartsOn: 1 }));
              }
            }}
            className="text-sm font-medium text-[#1d1d1f] bg-transparent border-none outline-none px-2 w-[140px]"
          />
          <button
            onClick={goToNextWeek}
            className="p-1.5 rounded-lg hover:bg-[#f5f5f7] transition-colors"
          >
            <ChevronRight size={16} className="text-[#1d1d1f]" />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="text-xs font-medium text-[#86868b] hover:text-[#1d1d1f] bg-white border border-[#e5e5e7] rounded-[10px] px-3 py-2 transition-colors"
        >
          Oggi
        </button>

        {/* Filters */}
        <select
          value={filterZona}
          onChange={(e) => setFilterZona(e.target.value)}
          className="text-xs font-medium text-[#1d1d1f] bg-white border border-[#e5e5e7] rounded-[10px] px-3 py-2 outline-none"
        >
          <option value="">Tutte le zone</option>
          {zone.map((z) => (
            <option key={z.id} value={z.nome}>
              {z.nome}
            </option>
          ))}
        </select>
        <select
          value={filterTipologia}
          onChange={(e) => setFilterTipologia(e.target.value)}
          className="text-xs font-medium text-[#1d1d1f] bg-white border border-[#e5e5e7] rounded-[10px] px-3 py-2 outline-none"
        >
          <option value="">Tutte le tipologie</option>
          {tipologie.map((t) => (
            <option key={t.nome} value={t.nome}>
              {t.nome}
            </option>
          ))}
        </select>

        {/* Week summary */}
        <div className="ml-auto text-xs text-[#86868b] font-medium">
          {format(weekStart, "d MMM", { locale: it })} -{" "}
          {format(weekSaturday, "d MMM yyyy", { locale: it })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e5e5e7] rounded-[12px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-[#f5f5f7] text-left text-xs font-medium text-[#86868b] px-4 py-3 border-b border-r border-[#e5e5e7]" style={{ width: 180, minWidth: 180 }}>
                  Fornitore
                </th>
                {weekDays.map((day, i) => (
                  <th
                    key={i}
                    className={`text-center text-xs font-medium text-[#86868b] px-2 py-3 border-b border-r border-[#e5e5e7] last:border-r-0 ${i === 6 ? "bg-[#F9F9F9]" : "bg-[#f5f5f7]"}`}
                  >
                    {dayLabels[i]} {format(day, "dd/MM")}
                  </th>
                ))}
                <th className="bg-[#f5f5f7] text-center text-xs font-medium text-[#86868b] px-3 py-3 border-b border-[#e5e5e7]" style={{ width: 70 }}>
                  Ore
                </th>
              </tr>
            </thead>
            <tbody>
              {fornitoreMap.size === 0 && (
                <tr>
                  <td
                    colSpan={WEEK_DAYS + 2}
                    className="text-center text-sm text-[#86868b] py-12"
                  >
                    Nessuna task con fornitore e date in questa settimana
                  </td>
                </tr>
              )}
              {Array.from(fornitoreMap.entries()).map(
                ([fornitoreName, { tasks: fTasks, ops: fOps, totalHours }]) => {
                  // Build day -> tasks map
                  const dayTasksMap = weekDays.map((day) => {
                    const dayStr = format(day, "yyyy-MM-dd");
                    return fTasks.filter((t) => {
                      const taskDays = getTaskDays(t, weekStart, weekSaturday);
                      return taskDays.some(
                        (td) => format(td, "yyyy-MM-dd") === dayStr
                      );
                    });
                  });

                  // Build day -> ops map
                  const dayOpsMap = weekDays.map((day) => {
                    const dayStr = format(day, "yyyy-MM-dd");
                    return fOps.filter((op) => op.data_inizio === dayStr);
                  });

                  return (
                    <tr key={fornitoreName} className="border-b border-[#e5e5e7] last:border-b-0">
                      <td className="sticky left-0 z-10 bg-white text-sm font-semibold text-[#1d1d1f] px-4 py-2 border-r border-[#e5e5e7] align-top" style={{ width: 180, minWidth: 180 }}>
                        {fornitoreName}
                      </td>
                      {dayTasksMap.map((dayTasks, dayIdx) => {
                        const dayOps = dayOpsMap[dayIdx];
                        const hasContent = dayTasks.length > 0 || dayOps.length > 0;
                        return (
                        <td
                          key={dayIdx}
                          className={`px-1 py-1 border-r border-[#e5e5e7] last:border-r-0 align-top ${dayIdx === 6 ? "bg-[#F9F9F9]" : ""}`}
                          style={{ minHeight: 60 }}
                        >
                          <div className="flex flex-col gap-1 min-h-[52px]">
                            {!hasContent && (
                              <span className="text-[10px] text-[#d1d1d6] text-center leading-[52px]">
                                -
                              </span>
                            )}
                            {dayOps.map((op) => (
                              <AppTooltip
                                key={op.id}
                                content={<>
                                  <strong>Trasporto: {op.matNome}</strong>
                                  {op.luogoNome && <><br />Da: {op.luogoNome}</>}
                                  <br />Task: {op.taskTitolo}
                                  <br />{op.zonaNome} / {op.lavNome}
                                </>}
                              >
                                <button
                                  onClick={() => setSelectedTaskId(op.taskId)}
                                  className="w-full text-left rounded-md px-2 py-1 transition-opacity hover:opacity-80 cursor-pointer"
                                  style={{
                                    backgroundColor: "rgba(14, 165, 233, 0.15)",
                                    borderLeft: "3px solid #0ea5e9",
                                  }}
                                >
                                  <div className="text-[10px] font-medium text-[#0ea5e9] truncate max-w-[120px]">
                                    TRAS {op.matNome}
                                  </div>
                                </button>
                              </AppTooltip>
                            ))}
                            {dayTasks.map((task) => (
                              <AppTooltip
                                key={task.id}
                                content={<>
                                  <strong>{task.titolo}</strong>
                                  <br />{task.zona_nome} / {task.lavorazione_nome}
                                  {task.fornitore_nome && <><br />Fornitore: {task.fornitore_nome}</>}
                                  {task.tipologia && <><br />Tipo: {task.tipologia.replace(/_/g, " ")}</>}
                                  {task.stato_calcolato && <><br />Stato: {task.stato_calcolato.replace(/_/g, " ")}</>}
                                </>}
                              >
                                <button
                                  onClick={() => setSelectedTaskId(task.id)}
                                  className="text-left rounded-md px-2 py-1 transition-opacity hover:opacity-80"
                                  style={{
                                    backgroundColor: task.tipologia && tipColorMap[task.tipologia]
                                      ? hexToRgba(tipColorMap[task.tipologia], 0.2)
                                      : task.zona_colore
                                        ? hexToRgba(task.zona_colore, 0.15)
                                        : "rgba(0,0,0,0.05)",
                                    borderLeft: `3px solid ${(task.tipologia && tipColorMap[task.tipologia]) || task.zona_colore || "#ccc"}`,
                                  }}
                                >
                                  <div className="text-[10px] font-medium text-[#1d1d1f] truncate max-w-[120px]">
                                    {task.tipologia
                                      ? TIPOLOGIA_SHORT[task.tipologia] ||
                                        task.tipologia.slice(0, 4).toUpperCase()
                                      : ""}{" "}
                                    {task.titolo}
                                  </div>
                                </button>
                              </AppTooltip>
                            ))}
                          </div>
                        </td>
                        );
                      })}
                      <td className="text-center text-xs font-medium text-[#1d1d1f] px-2 py-2 align-top">
                        {Math.round(totalHours)}h
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
            {fornitoreMap.size > 0 && (
              <tfoot>
                <tr className="border-t border-[#e5e5e7]">
                  <td className="sticky left-0 z-10 bg-[#f5f5f7] text-xs font-semibold text-[#1d1d1f] px-4 py-3 border-r border-[#e5e5e7]">
                    Totale
                  </td>
                  {dayTotals.map((total, i) => (
                    <td
                      key={i}
                      className={`text-center text-xs font-semibold text-[#1d1d1f] px-2 py-3 border-r border-[#e5e5e7] last:border-r-0 ${i === 6 ? "bg-[#F9F9F9]" : "bg-[#f5f5f7]"}`}
                    >
                      {Math.round(total)}h
                    </td>
                  ))}
                  <td className="bg-[#f5f5f7] text-center text-xs font-bold text-[#1d1d1f] px-2 py-3">
                    {Math.round(grandTotal)}h
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Task Detail Overlay */}
      <TaskDetailOverlay
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={() => router.refresh()}
      />
      </>
      )}
    </div>
  );
}
