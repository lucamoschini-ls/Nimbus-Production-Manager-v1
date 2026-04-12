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
import { ChevronDown, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { TaskDetailOverlay } from "@/components/task-detail-overlay";
import { DrawerOperazione } from "@/app/materiali-nuovo/components/drawer-operazione";
import { useRouter } from "next/navigation";
import { SchedulingTab } from "./scheduling-tab";
import { AppTooltip } from "@/components/ui/app-tooltip";

const HOURS_PER_DAY = 11;
const WEEK_DAYS = 7; // Mon–Sun

interface PlanningTask {
  id: string;
  titolo: string;
  tipologia: string | null;
  stato: string | null;
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
  persone: number | null;
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

const STATO_BORDER: Record<string, string> = {
  completata: "#34C759",
  in_corso: "#FFD60A",
  bloccata: "#FF3B30",
  da_fare: "#C7C7CC",
  in_attesa_fornitore: "#FF9500",
  in_attesa_dipendenza: "#FF9500",
  in_attesa_materiali: "#FF9500",
  in_attesa_permesso: "#FF9500",
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeTab, _setActiveTab] = useState<"planning" | "scheduling">("scheduling");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
  const [daAssegnareOpen, setDaAssegnareOpen] = useState(false);
  const [daAssegnareExpanded, setDaAssegnareExpanded] = useState<Set<string>>(new Set());
  const [daAssegnareSearch, setDaAssegnareSearch] = useState("");

  // Default week: current week's Monday (local timezone, consistent with parseISO)
  const [weekStart, setWeekStart] = useState<Date>(
    () => startOfWeek(new Date(), { weekStartsOn: 1 })
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

  // Unassigned tasks & ops
  const unassignedTasks = useMemo(() => tasks.filter(t => !t.fornitore_id || !t.data_inizio), [tasks]);
  const unassignedOps = useMemo(() => transportOps.filter(o => !o.data_inizio), [transportOps]);

  const unassignedGroups = useMemo(() => {
    const groups = new Map<string, PlanningTask[]>();
    const search = daAssegnareSearch.toLowerCase();

    for (const t of unassignedTasks) {
      if (search && !t.titolo.toLowerCase().includes(search)) continue;
      const key = t.tipologia || "altro";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }
    return groups;
  }, [unassignedTasks, daAssegnareSearch]);

  const filteredUnassignedOps = useMemo(() => {
    if (!daAssegnareSearch) return unassignedOps;
    const s = daAssegnareSearch.toLowerCase();
    return unassignedOps.filter(o => o.matNome?.toLowerCase().includes(s) || o.taskTitolo?.toLowerCase().includes(s));
  }, [unassignedOps, daAssegnareSearch]);

  // Navigation
  const goToPrevWeek = () => setWeekStart((d) => addDays(d, -7));
  const goToNextWeek = () => setWeekStart((d) => addDays(d, 7));
  const goToToday = () =>
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const dayLabels = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-[#1d1d1f]">Planning</h1>
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
                {weekDays.map((day, i) => {
                  const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                  return (
                  <th
                    key={i}
                    className={`text-center text-xs font-medium px-2 py-3 border-b border-r border-[#e5e5e7] last:border-r-0 ${i === 6 ? "bg-[#F9F9F9]" : "bg-[#f5f5f7]"} ${isToday ? "border-x-2 border-x-blue-400 text-blue-600 font-bold" : "text-[#86868b]"}`}
                  >
                    {dayLabels[i]} {format(day, "dd/MM")}
                  </th>
                  );
                })}
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
                        const isTodayCol = format(weekDays[dayIdx], "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                        return (
                        <td
                          key={dayIdx}
                          className={`px-1 py-1 border-r border-[#e5e5e7] last:border-r-0 align-top ${dayIdx === 6 ? "bg-[#F9F9F9]" : ""} ${isTodayCol ? "border-x-2 border-x-blue-400 bg-blue-50/30" : ""}`}
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
                                  onClick={() => { setSelectedTaskId(null); setSelectedOpId(op.id); }}
                                  className="w-full text-left rounded-md px-1.5 py-0.5 transition-opacity hover:opacity-80 cursor-pointer"
                                  style={{
                                    minHeight: "24px",
                                    backgroundColor: "rgba(14, 165, 233, 0.08)",
                                    borderLeft: "2px solid rgba(14, 165, 233, 0.5)",
                                  }}
                                >
                                  <div className="text-[9px] font-medium text-[#0ea5e9]/70 truncate max-w-[120px]">
                                    TRAS {op.matNome}{op.persone ? ` (${op.persone} pax)` : ""}
                                  </div>
                                </button>
                              </AppTooltip>
                            ))}
                            {dayTasks.map((task) => {
                              const todayStr = format(new Date(), "yyyy-MM-dd");
                              const isOverdue = !!(task.data_fine && task.data_fine < todayStr && task.stato !== "completata" && task.stato_calcolato !== "completata");
                              return (
                              <AppTooltip
                                key={task.id}
                                content={<>
                                  <strong>{task.titolo}</strong>
                                  <br />{task.zona_nome} / {task.lavorazione_nome}
                                  {task.fornitore_nome && <><br />Fornitore: {task.fornitore_nome}</>}
                                  {task.tipologia && <><br />Tipo: {task.tipologia.replace(/_/g, " ")}</>}
                                  {task.stato_calcolato && <><br />Stato: {task.stato_calcolato.replace(/_/g, " ")}</>}
                                  {isOverdue && <><br /><span className="text-red-500 font-medium">In ritardo</span></>}
                                </>}
                              >
                                <button
                                  onClick={() => { setSelectedOpId(null); setSelectedTaskId(task.id); }}
                                  className="relative text-left rounded-md px-2 py-1 transition-opacity hover:opacity-80"
                                  style={{
                                    minHeight: "32px",
                                    height: `${Math.max(32, (task.durata_ore || 1) * 12)}px`,
                                    backgroundColor: task.tipologia && tipColorMap[task.tipologia]
                                      ? hexToRgba(tipColorMap[task.tipologia], 0.2)
                                      : task.zona_colore
                                        ? hexToRgba(task.zona_colore, 0.15)
                                        : "rgba(0,0,0,0.05)",
                                    borderLeft: `4px solid ${STATO_BORDER[task.stato_calcolato || task.stato || ""] || "#C7C7CC"}`,
                                    border: isOverdue ? "2px solid #FF3B30" : undefined,
                                    borderLeftWidth: isOverdue ? "4px" : undefined,
                                    borderLeftColor: isOverdue ? "#FF3B30" : undefined,
                                  }}
                                >
                                  {isOverdue && (
                                    <div className="absolute top-0.5 right-0.5">
                                      <Clock size={10} className="text-red-500" />
                                    </div>
                                  )}
                                  <div className="text-[10px] font-medium text-[#1d1d1f] truncate max-w-[120px]">
                                    {task.tipologia
                                      ? TIPOLOGIA_SHORT[task.tipologia] ||
                                        task.tipologia.slice(0, 4).toUpperCase()
                                      : ""}{" "}
                                    {task.titolo}
                                  </div>
                                </button>
                              </AppTooltip>
                              );
                            })}
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
                  {dayTotals.map((total, i) => {
                    const isTodayFooter = format(weekDays[i], "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                    return (
                    <td
                      key={i}
                      className={`text-center text-xs font-semibold text-[#1d1d1f] px-2 py-3 border-r border-[#e5e5e7] last:border-r-0 ${i === 6 ? "bg-[#F9F9F9]" : "bg-[#f5f5f7]"} ${isTodayFooter ? "border-x-2 border-x-blue-400" : ""}`}
                    >
                      {Math.round(total)}h
                    </td>
                    );
                  })}
                  <td className="bg-[#f5f5f7] text-center text-xs font-bold text-[#1d1d1f] px-2 py-3">
                    {Math.round(grandTotal)}h
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Da assegnare accordion */}
      <div className="mt-4 border-t border-[#e5e5e7]">
        <button
          onClick={() => setDaAssegnareOpen(!daAssegnareOpen)}
          className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-[#f5f5f7] transition-colors"
        >
          {daAssegnareOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="text-[12px] font-semibold text-[#1d1d1f]">Da assegnare</span>
          <span className="text-[11px] text-[#86868b]">
            — {unassignedTasks.length} task, {unassignedOps.length} operazioni
          </span>
        </button>

        {daAssegnareOpen && (
          <div className="px-4 pb-4">
            {/* Mini search */}
            <input
              value={daAssegnareSearch}
              onChange={e => setDaAssegnareSearch(e.target.value)}
              placeholder="Cerca nelle non assegnate..."
              className="w-full text-[11px] border border-[#e5e5e7] rounded-lg px-3 py-1.5 mb-3 outline-none focus:ring-1 focus:ring-ring bg-white"
            />

            {/* Groups by tipologia */}
            {Array.from(unassignedGroups.entries()).sort((a, b) => b[1].length - a[1].length).map(([tipo, grpTasks]) => (
              <div key={tipo} className="mb-2">
                <button
                  onClick={() => {
                    const next = new Set(daAssegnareExpanded);
                    if (next.has(tipo)) next.delete(tipo); else next.add(tipo);
                    setDaAssegnareExpanded(next);
                  }}
                  className="flex items-center gap-1.5 py-1.5 text-left w-full hover:bg-[#f5f5f7] rounded px-2 -mx-2"
                >
                  {daAssegnareExpanded.has(tipo) ? <ChevronDown size={12} className="text-[#86868b]" /> : <ChevronRight size={12} className="text-[#86868b]" />}
                  <span className="text-[11px] font-semibold text-[#1d1d1f] uppercase">{TIPOLOGIA_SHORT[tipo] || tipo} {tipo}</span>
                  <span className="text-[10px] text-[#86868b]">({grpTasks.length})</span>
                </button>

                {daAssegnareExpanded.has(tipo) && (
                  <div className="pl-4 space-y-1 mt-1">
                    {grpTasks.map(task => (
                      <button
                        key={task.id}
                        onClick={() => { setSelectedOpId(null); setSelectedTaskId(task.id); }}
                        className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#f5f5f7] transition-colors border-l-2"
                        style={{ borderLeftColor: STATO_BORDER[task.stato_calcolato || task.stato || ""] || "#C7C7CC" }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] text-[#1d1d1f] font-medium">{task.titolo}</div>
                          <div className="text-[10px] text-[#86868b]">{task.zona_nome} · {task.lavorazione_nome} {task.durata_ore ? `· ${task.durata_ore}h` : ""}</div>
                        </div>
                        <span className="text-[9px] text-[#86868b]">Apri</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Operazioni senza data */}
            {filteredUnassignedOps.length > 0 && (
              <div className="mb-2">
                <button
                  onClick={() => {
                    const next = new Set(daAssegnareExpanded);
                    if (next.has("_ops")) next.delete("_ops"); else next.add("_ops");
                    setDaAssegnareExpanded(next);
                  }}
                  className="flex items-center gap-1.5 py-1.5 text-left w-full hover:bg-[#f5f5f7] rounded px-2 -mx-2"
                >
                  {daAssegnareExpanded.has("_ops") ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <span className="text-[11px] font-semibold text-[#0ea5e9]/70 uppercase">Operazioni</span>
                  <span className="text-[10px] text-[#86868b]">({filteredUnassignedOps.length})</span>
                </button>
                {daAssegnareExpanded.has("_ops") && (
                  <div className="pl-4 space-y-1 mt-1">
                    {filteredUnassignedOps.map(op => (
                      <button key={op.id} onClick={() => { setSelectedTaskId(null); setSelectedOpId(op.id); }}
                        className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#f0f9ff] transition-colors border-l-2 border-[#0ea5e9]/30">
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-[#0ea5e9]/70 font-medium">TRAS {op.matNome}</div>
                        </div>
                        <span className="text-[9px] text-[#86868b]">Apri</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Operazione drawer */}
      {selectedOpId && (
        <div className="fixed right-0 top-0 h-screen w-[380px] bg-white border-l border-[#e5e5e7] z-40 overflow-y-auto p-4 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] text-[#86868b] font-medium uppercase">Operazione</span>
            <button onClick={() => setSelectedOpId(null)} className="text-[#86868b] hover:text-[#1d1d1f] p-0.5 rounded hover:bg-[#f0f0f0]">
              <X size={14} />
            </button>
          </div>
          <DrawerOperazione id={selectedOpId} />
        </div>
      )}

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
