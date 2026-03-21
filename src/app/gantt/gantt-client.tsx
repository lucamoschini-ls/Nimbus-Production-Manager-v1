"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import {
  format,
  eachDayOfInterval,
  isWeekend,
  differenceInDays,
  parseISO,
  addDays,
} from "date-fns";
import { it } from "date-fns/locale";
import { updateTask } from "../lavorazioni/actions";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Zona {
  id: string;
  nome: string;
  colore: string;
  ordine: number;
}
interface Lavorazione {
  id: string;
  zona_id: string;
  nome: string;
  ordine: number;
}
interface Task {
  id: string;
  titolo: string;
  lavorazione_id: string;
  zona_nome: string;
  zona_colore: string;
  zona_ordine: number;
  lavorazione_nome: string;
  data_inizio: string | null;
  data_fine: string | null;
  stato_calcolato: string;
  tipologia: string | null;
  fornitore_nome: string | null;
}
interface Materiale {
  id: string;
  task_id: string;
  nome: string;
  quantita: number | null;
  quantita_disponibile: number | null;
  quantita_ordinata: number | null;
  data_necessaria: string | null;
  giorni_consegna: number | null;
}
interface OpInfo {
  id: string;
  materiale_id: string;
  titolo: string;
  tipologia: string | null;
  stato: string;
  stato_calcolato: string;
  data_inizio: string | null;
  data_fine: string | null;
  fornitore_id: string | null;
  fornitore: { nome: string; stato: string } | null;
}

interface Props {
  zone: Zona[];
  lavorazioni: Lavorazione[];
  tasks: Task[];
  materiali: Materiale[];
  opsByMat: Record<string, OpInfo[]>;
  tipColorMap: Record<string, string>;
  conflictDescriptions?: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATO_BAR_COLORS: Record<string, string> = {
  da_fare: "#d1d5db",
  in_corso: "#3b82f6",
  completata: "#22c55e",
  bloccata: "#ef4444",
  in_attesa_fornitore: "#f59e0b",
  in_attesa_dipendenza: "#f59e0b",
  in_attesa_materiali: "#f59e0b",
  in_attesa_permesso: "#f59e0b",
};

const FORNITORE_PALETTE = [
  "#6366f1", "#ec4899", "#14b8a6", "#f97316", "#8b5cf6",
  "#06b6d4", "#e11d48", "#84cc16", "#eab308", "#0ea5e9",
  "#d946ef", "#10b981", "#f43f5e", "#a855f7", "#22d3ee",
];

type ColorMode = "tipologia" | "zona" | "fornitore";

const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 48;
const LEFT_WIDTH = 280;

/* ------------------------------------------------------------------ */
/*  Row type                                                           */
/* ------------------------------------------------------------------ */

type Row =
  | { type: "zona"; zona: Zona; startDay: number; endDay: number }
  | { type: "lav"; lav: Lavorazione; zona: Zona; startDay: number; endDay: number }
  | { type: "task"; task: Task; startDay: number; endDay: number };

/* ------------------------------------------------------------------ */
/*  Drag state                                                         */
/* ------------------------------------------------------------------ */

interface DragState {
  taskId: string;
  dragType: "move" | "resize-left" | "resize-right";
  startX: number;
  origStart: string;
  origEnd: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function GanttClient({
  zone,
  lavorazioni,
  tasks,
  materiali: _materiali,
  opsByMat: _opsByMat,
  tipColorMap,
  conflictDescriptions = {},
}: Props) {
  // Suppress unused-var warnings for props we keep in the interface but don't use
  void _materiali;
  void _opsByMat;

  const conflictSet = new Set(Object.keys(conflictDescriptions));

  /* ---- state ---- */
  const [mode, setMode] = useState<"cantiere" | "progetto">("cantiere");
  const [colorMode, setColorMode] = useState<ColorMode>("tipologia");
  const [expandedZone, setExpandedZone] = useState<Set<string>>(new Set());
  const [expandedLav, setExpandedLav] = useState<Set<string>>(new Set());
  const [popupTask, setPopupTask] = useState<{
    task: Task;
    x: number;
    y: number;
  } | null>(null);

  /* ---- filters ---- */
  const [filterZona, setFilterZona] = useState<string>("");
  const [filterFornitore, setFilterFornitore] = useState<string>("");
  const [filterTipologia, setFilterTipologia] = useState<string>("");

  /* ---- drag ---- */
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragDelta, setDragDelta] = useState(0);

  /* ---- refs for scroll sync ---- */
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  /* ---- timeline params ---- */
  const dayWidth = mode === "cantiere" ? 40 : 18;
  const startDate = useMemo(
    () => (mode === "cantiere" ? new Date("2026-04-01") : new Date("2026-03-01")),
    [mode],
  );
  const endDate = useMemo(() => new Date("2026-06-15"), []);
  const days = useMemo(
    () => eachDayOfInterval({ start: startDate, end: endDate }),
    [startDate, endDate],
  );
  const totalWidth = days.length * dayWidth;

  const today = new Date();
  const apertura = new Date("2026-05-01");
  const todayOffset = differenceInDays(today, startDate);
  const aperturaOffset = differenceInDays(apertura, startDate);

  /* ---- color maps ---- */
  const zonaNameColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    zone.forEach((z) => {
      map[z.nome] = z.colore;
    });
    return map;
  }, [zone]);

  const fornitoreColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const unique = Array.from(
      new Set(tasks.filter((t) => t.fornitore_nome).map((t) => t.fornitore_nome!)),
    );
    unique.sort().forEach((nome, i) => {
      map[nome] = FORNITORE_PALETTE[i % FORNITORE_PALETTE.length];
    });
    return map;
  }, [tasks]);

  function getTaskBarColor(task: Task): string {
    if (colorMode === "zona") {
      return zonaNameColorMap[task.zona_nome] ?? "#d1d5db";
    }
    if (colorMode === "fornitore") {
      return task.fornitore_nome
        ? (fornitoreColorMap[task.fornitore_nome] ?? "#d1d5db")
        : "#d1d5db";
    }
    return task.tipologia && tipColorMap[task.tipologia]
      ? tipColorMap[task.tipologia]
      : (STATO_BAR_COLORS[task.stato_calcolato] ?? "#d1d5db");
  }

  /* ---- legend ---- */
  const legendEntries = useMemo(() => {
    if (colorMode === "zona") {
      const usedZone = new Set(tasks.map((t) => t.zona_nome));
      return zone
        .filter((z) => usedZone.has(z.nome))
        .map((z) => ({ label: z.nome, color: z.colore }));
    }
    if (colorMode === "fornitore") {
      return Object.entries(fornitoreColorMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([nome, color]) => ({ label: nome, color }));
    }
    return Object.entries(tipColorMap).map(([nome, color]) => ({
      label: nome.replace(/_/g, " "),
      color,
    }));
  }, [colorMode, zone, tasks, fornitoreColorMap, tipColorMap]);

  /* ---- filter option lists ---- */
  const uniqueZone = useMemo(() => zone.map((z) => z.nome).sort(), [zone]);
  const uniqueFornitori = useMemo(
    () =>
      Array.from(new Set(tasks.filter((t) => t.fornitore_nome).map((t) => t.fornitore_nome!)))
        .sort(),
    [tasks],
  );
  const uniqueTipologie = useMemo(
    () => Array.from(new Set(tasks.filter((t) => t.tipologia).map((t) => t.tipologia!))).sort(),
    [tasks],
  );

  /* ---- filtered tasks ---- */
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterZona && t.zona_nome !== filterZona) return false;
      if (filterFornitore && t.fornitore_nome !== filterFornitore) return false;
      if (filterTipologia && t.tipologia !== filterTipologia) return false;
      return true;
    });
  }, [tasks, filterZona, filterFornitore, filterTipologia]);

  /* ---- toggles ---- */
  const toggleZone = (id: string) => {
    const next = new Set(expandedZone);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedZone(next);
  };

  const toggleLav = (id: string) => {
    const next = new Set(expandedLav);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedLav(next);
  };

  /* ---- date helpers ---- */
  function dayOffset(dateStr: string): number {
    return differenceInDays(parseISO(dateStr), startDate);
  }

  /* ---- build rows ---- */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows: Row[] = useMemo(() => {
    const result: Row[] = [];

    for (const z of zone) {
      const zoneLav = lavorazioni.filter((l) => l.zona_id === z.id);
      const allZoneTasks = filteredTasks.filter((t) =>
        zoneLav.some((l) => l.id === t.lavorazione_id),
      );

      // Skip zone with no tasks after filtering
      if (allZoneTasks.length === 0 && (filterZona || filterFornitore || filterTipologia))
        continue;

      const allStarts = allZoneTasks
        .filter((t) => t.data_inizio)
        .map((t) => dayOffset(t.data_inizio!));
      const allEnds = allZoneTasks
        .filter((t) => t.data_fine)
        .map((t) => dayOffset(t.data_fine!));
      const zStart = allStarts.length > 0 ? Math.min(...allStarts) : -1;
      const zEnd = allEnds.length > 0 ? Math.max(...allEnds) : -1;

      result.push({ type: "zona", zona: z, startDay: zStart, endDay: zEnd });

      if (expandedZone.has(z.id)) {
        for (const lav of zoneLav) {
          const lavTasks = filteredTasks.filter((t) => t.lavorazione_id === lav.id);
          if (lavTasks.length === 0 && (filterZona || filterFornitore || filterTipologia))
            continue;

          const lavStarts = lavTasks
            .filter((t) => t.data_inizio)
            .map((t) => dayOffset(t.data_inizio!));
          const lavEnds = lavTasks
            .filter((t) => t.data_fine)
            .map((t) => dayOffset(t.data_fine!));
          const lStart = lavStarts.length > 0 ? Math.min(...lavStarts) : -1;
          const lEnd = lavEnds.length > 0 ? Math.max(...lavEnds) : -1;

          result.push({ type: "lav", lav, zona: z, startDay: lStart, endDay: lEnd });

          if (expandedLav.has(lav.id)) {
            for (const task of lavTasks) {
              const tStart = task.data_inizio ? dayOffset(task.data_inizio) : -1;
              const tEnd = task.data_fine ? dayOffset(task.data_fine) : -1;
              result.push({ type: "task", task, startDay: tStart, endDay: tEnd });
            }
          }
        }
      }
    }

    return result;
  }, [
    zone,
    lavorazioni,
    filteredTasks,
    expandedZone,
    expandedLav,
    filterZona,
    filterFornitore,
    filterTipologia,
    startDate,
  ]);

  /* ---- scroll sync ---- */
  const handleLeftScroll = useCallback(() => {
    if (syncing.current) return;
    syncing.current = true;
    if (rightRef.current && leftRef.current) {
      rightRef.current.scrollTop = leftRef.current.scrollTop;
    }
    syncing.current = false;
  }, []);

  const handleRightScroll = useCallback(() => {
    if (syncing.current) return;
    syncing.current = true;
    if (leftRef.current && rightRef.current) {
      leftRef.current.scrollTop = rightRef.current.scrollTop;
    }
    if (headerRef.current && rightRef.current) {
      headerRef.current.scrollLeft = rightRef.current.scrollLeft;
    }
    syncing.current = false;
  }, []);

  /* ---- drag handlers ---- */
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDragDelta(e.clientX - dragState.startX);
    };

    const handleMouseUp = async (e: MouseEvent) => {
      const delta = e.clientX - dragState.startX;
      const daysDelta = Math.round(delta / dayWidth);

      if (daysDelta !== 0) {
        const origStartDate = parseISO(dragState.origStart);
        const origEndDate = parseISO(dragState.origEnd);

        let newStart: string;
        let newEnd: string;

        if (dragState.dragType === "move") {
          newStart = format(addDays(origStartDate, daysDelta), "yyyy-MM-dd");
          newEnd = format(addDays(origEndDate, daysDelta), "yyyy-MM-dd");
        } else if (dragState.dragType === "resize-left") {
          newStart = format(addDays(origStartDate, daysDelta), "yyyy-MM-dd");
          newEnd = dragState.origEnd;
          // Don't let start go past end
          if (newStart > newEnd) newStart = newEnd;
        } else {
          newStart = dragState.origStart;
          newEnd = format(addDays(origEndDate, daysDelta), "yyyy-MM-dd");
          // Don't let end go before start
          if (newEnd < newStart) newEnd = newStart;
        }

        try {
          await updateTask(dragState.taskId, {
            data_inizio: newStart,
            data_fine: newEnd,
          });
        } catch {
          // Silently handle errors — the UI will revert on next server refresh
        }
      }

      setDragState(null);
      setDragDelta(0);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, dayWidth]);

  /* ---- drag start helpers ---- */
  function startDrag(
    e: React.MouseEvent,
    task: Task,
    dragType: "move" | "resize-left" | "resize-right",
  ) {
    if (!task.data_inizio || !task.data_fine) return;
    e.stopPropagation();
    e.preventDefault();
    setDragState({
      taskId: task.id,
      dragType,
      startX: e.clientX,
      origStart: task.data_inizio,
      origEnd: task.data_fine,
    });
  }

  /* ---- compute bar position with drag delta ---- */
  function getBarPosition(row: Row & { type: "task" }) {
    let sDay = row.startDay;
    let eDay = row.endDay;

    if (dragState && dragState.taskId === row.task.id && row.task.data_inizio && row.task.data_fine) {
      const daysDelta = Math.round(dragDelta / dayWidth);
      if (dragState.dragType === "move") {
        sDay += daysDelta;
        eDay += daysDelta;
      } else if (dragState.dragType === "resize-left") {
        sDay += daysDelta;
        if (sDay > eDay) sDay = eDay;
      } else {
        eDay += daysDelta;
        if (eDay < sDay) eDay = sDay;
      }
    }

    return { sDay, eDay };
  }

  /* ---- render ---- */
  const totalContentHeight = rows.length * ROW_HEIGHT;

  return (
    <div>
      {/* Controls row */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-[#1d1d1f]">Gantt</h1>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Mode toggle */}
          <div className="flex gap-1 bg-[#f5f5f7] rounded-lg p-1">
            <button
              onClick={() => setMode("cantiere")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${mode === "cantiere" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"}`}
            >
              Cantiere
            </button>
            <button
              onClick={() => setMode("progetto")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${mode === "progetto" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"}`}
            >
              Progetto
            </button>
          </div>

          {/* Color mode toggle */}
          <div>
            <span className="text-[9px] text-[#86868b] block mb-0.5">Colora per</span>
            <div className="flex gap-1 bg-[#f5f5f7] rounded-lg p-1">
              {(["zona", "tipologia", "fornitore"] as const).map((cm) => (
                <button
                  key={cm}
                  onClick={() => setColorMode(cm)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${colorMode === cm ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"}`}
                >
                  {cm === "zona" ? "Zona" : cm === "tipologia" ? "Tipologia" : "Fornitore"}
                </button>
              ))}
            </div>
          </div>

          {/* Filter: Zona */}
          <div>
            <span className="text-[9px] text-[#86868b] block mb-0.5">Zona</span>
            <select
              value={filterZona}
              onChange={(e) => setFilterZona(e.target.value)}
              className="text-xs border border-[#e5e5e7] rounded-md px-2 py-1 bg-white text-[#1d1d1f] min-w-[100px]"
            >
              <option value="">Tutte</option>
              {uniqueZone.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>

          {/* Filter: Fornitore */}
          <div>
            <span className="text-[9px] text-[#86868b] block mb-0.5">Fornitore</span>
            <select
              value={filterFornitore}
              onChange={(e) => setFilterFornitore(e.target.value)}
              className="text-xs border border-[#e5e5e7] rounded-md px-2 py-1 bg-white text-[#1d1d1f] min-w-[100px]"
            >
              <option value="">Tutti</option>
              {uniqueFornitori.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Filter: Tipologia */}
          <div>
            <span className="text-[9px] text-[#86868b] block mb-0.5">Tipologia</span>
            <select
              value={filterTipologia}
              onChange={(e) => setFilterTipologia(e.target.value)}
              className="text-xs border border-[#e5e5e7] rounded-md px-2 py-1 bg-white text-[#1d1d1f] min-w-[100px]"
            >
              <option value="">Tutte</option>
              {uniqueTipologie.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Legend */}
      {legendEntries.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
          {legendEntries.map((entry) => (
            <div key={entry.label} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[10px] text-[#86868b]">{entry.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Two-panel Gantt */}
      <div
        className="flex overflow-hidden border border-[#e5e5e7] rounded-[12px] bg-white"
        style={{ height: "calc(100vh - 200px)" }}
      >
        {/* LEFT PANEL — labels */}
        <div
          className="flex-shrink-0 flex flex-col"
          style={{ width: LEFT_WIDTH, minWidth: LEFT_WIDTH }}
        >
          {/* Left header */}
          <div
            className="flex items-end pb-1 px-3 border-b border-r border-[#e5e5e7] bg-white flex-shrink-0"
            style={{ height: HEADER_HEIGHT }}
          >
            <span className="text-[11px] text-[#86868b] font-medium">Lavorazione</span>
          </div>
          {/* Left body — scrollable */}
          <div
            ref={leftRef}
            onScroll={handleLeftScroll}
            className="overflow-y-auto overflow-x-hidden border-r border-[#e5e5e7] flex-1"
            style={{ scrollbarWidth: "none" }}
          >
            <div className="relative" style={{ height: totalContentHeight }}>
              {rows.map((row, i) => {
                const top = i * ROW_HEIGHT;

                if (row.type === "zona") {
                  return (
                    <div
                      key={`l-${i}`}
                      className="absolute flex items-center border-b border-[#e5e5e7]/50"
                      style={{
                        top,
                        height: ROW_HEIGHT,
                        width: LEFT_WIDTH,
                        backgroundColor: row.zona.colore + "15",
                      }}
                    >
                      <button
                        onClick={() => toggleZone(row.zona.id)}
                        className="w-full h-full flex items-center gap-1.5 px-3 cursor-pointer"
                      >
                        {expandedZone.has(row.zona.id) ? (
                          <ChevronDown size={12} className="text-[#86868b] flex-shrink-0" />
                        ) : (
                          <ChevronRight size={12} className="text-[#86868b] flex-shrink-0" />
                        )}
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: row.zona.colore }}
                        />
                        <span className="font-semibold text-[14px] text-[#1d1d1f] truncate">
                          {row.zona.nome}
                        </span>
                      </button>
                    </div>
                  );
                }

                if (row.type === "lav") {
                  return (
                    <div
                      key={`l-${i}`}
                      className="absolute flex items-center border-b border-[#e5e5e7]/50"
                      style={{ top, height: ROW_HEIGHT, width: LEFT_WIDTH }}
                    >
                      <button
                        onClick={() => toggleLav(row.lav.id)}
                        className="w-full h-full flex items-center gap-1.5 px-3 pl-7 text-left hover:bg-[#f5f5f7]/50"
                      >
                        {expandedLav.has(row.lav.id) ? (
                          <ChevronDown size={11} className="text-[#86868b] flex-shrink-0" />
                        ) : (
                          <ChevronRight size={11} className="text-[#86868b] flex-shrink-0" />
                        )}
                        <span className="font-medium text-[13px] text-[#1d1d1f] truncate">
                          {row.lav.nome}
                        </span>
                      </button>
                    </div>
                  );
                }

                // task
                return (
                  <div
                    key={`l-${i}`}
                    className="absolute flex items-center border-b border-[#e5e5e7]/50"
                    style={{ top, height: ROW_HEIGHT, width: LEFT_WIDTH }}
                  >
                    <div className="flex items-center gap-1 px-3 pl-12 h-full w-full">
                      <span className="text-[12px] text-[#86868b] truncate">
                        {row.task.titolo}
                      </span>
                      {conflictSet.has(row.task.id) && (
                        <span
                          title={conflictDescriptions[row.task.id] ?? "Conflitto attrezzi"}
                          className="flex-shrink-0"
                        >
                          <AlertTriangle size={11} className="text-orange-500" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — timeline */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Right header — scrolls horizontally only */}
          <div
            ref={headerRef}
            className="flex-shrink-0 border-b border-[#e5e5e7] bg-white overflow-hidden"
            style={{ height: HEADER_HEIGHT }}
          >
            <div
              className="flex relative"
              style={{ width: totalWidth, height: HEADER_HEIGHT }}
            >
              {/* "Oggi" label */}
              {todayOffset >= 0 && todayOffset < days.length && (
                <div
                  className="absolute top-0 z-10"
                  style={{ left: todayOffset * dayWidth + dayWidth / 2 - 12 }}
                >
                  <span className="text-[8px] font-semibold text-red-500 bg-white px-1 rounded">
                    Oggi
                  </span>
                </div>
              )}
              {/* "Apertura" label */}
              {aperturaOffset >= 0 && aperturaOffset < days.length && (
                <div
                  className="absolute top-0 z-10"
                  style={{ left: aperturaOffset * dayWidth + dayWidth / 2 - 18 }}
                >
                  <span className="text-[8px] font-semibold text-green-600 bg-white px-1 rounded">
                    Apertura
                  </span>
                </div>
              )}
              {days.map((day, di) => {
                const isWe = isWeekend(day);
                const isFirst = di === 0 || day.getDate() === 1;
                return (
                  <div
                    key={di}
                    className={`flex flex-col items-center justify-end pb-1 border-r border-[#e5e5e7]/50 flex-shrink-0 ${isWe ? "bg-[#F9F9F9]" : ""}`}
                    style={{ width: dayWidth, minWidth: dayWidth }}
                  >
                    {isFirst && (
                      <span className="text-[8px] text-[#86868b] font-medium">
                        {format(day, "MMM", { locale: it })}
                      </span>
                    )}
                    <span className="text-[9px] text-[#86868b]">{day.getDate()}</span>
                    {dayWidth >= 30 && (
                      <span className="text-[8px] text-[#86868b]">
                        {format(day, "EEEEEE", { locale: it })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right body — scrolls both ways */}
          <div
            ref={rightRef}
            onScroll={handleRightScroll}
            className="flex-1 overflow-x-auto overflow-y-auto"
          >
            <div
              className="relative"
              style={{ width: totalWidth, height: totalContentHeight }}
            >
              {/* Weekend stripe columns */}
              {days.map((day, di) =>
                isWeekend(day) ? (
                  <div
                    key={`we-${di}`}
                    className="absolute top-0 bg-[#F9F9F9]"
                    style={{
                      left: di * dayWidth,
                      width: dayWidth,
                      height: totalContentHeight,
                    }}
                  />
                ) : null,
              )}

              {/* Today line */}
              {todayOffset >= 0 && todayOffset < days.length && (
                <div
                  className="absolute top-0 z-[5]"
                  style={{
                    left: todayOffset * dayWidth + dayWidth / 2 - 1,
                    width: 2,
                    height: totalContentHeight,
                    backgroundColor: "#ef4444",
                  }}
                />
              )}

              {/* Apertura line */}
              {aperturaOffset >= 0 && aperturaOffset < days.length && (
                <div
                  className="absolute top-0 z-[5]"
                  style={{
                    left: aperturaOffset * dayWidth + dayWidth / 2 - 1,
                    width: 2,
                    height: totalContentHeight,
                    backgroundColor: "#22c55e",
                  }}
                />
              )}

              {/* Rows */}
              {rows.map((row, i) => {
                const top = i * ROW_HEIGHT;

                /* ---- Zona row ---- */
                if (row.type === "zona") {
                  return (
                    <div
                      key={`r-${i}`}
                      className="absolute border-b border-[#e5e5e7]/50"
                      style={{
                        top,
                        height: ROW_HEIGHT,
                        width: totalWidth,
                        backgroundColor: row.zona.colore + "10",
                      }}
                    >
                      {/* Aggregated bar when collapsed */}
                      {!expandedZone.has(row.zona.id) &&
                        row.startDay >= 0 &&
                        row.endDay >= 0 && (
                          <div
                            className="absolute rounded-md"
                            style={{
                              left: row.startDay * dayWidth + 2,
                              width: Math.max(
                                (row.endDay - row.startDay + 1) * dayWidth - 4,
                                4,
                              ),
                              top: 6,
                              height: ROW_HEIGHT - 12,
                              backgroundColor: row.zona.colore,
                              opacity: 0.5,
                            }}
                          />
                        )}
                    </div>
                  );
                }

                /* ---- Lavorazione row ---- */
                if (row.type === "lav") {
                  return (
                    <div
                      key={`r-${i}`}
                      className="absolute border-b border-[#e5e5e7]/50"
                      style={{ top, height: ROW_HEIGHT, width: totalWidth }}
                    >
                      {row.startDay >= 0 && row.endDay >= 0 && (
                        <div
                          className="absolute rounded-md"
                          style={{
                            left: row.startDay * dayWidth + 2,
                            width: Math.max(
                              (row.endDay - row.startDay + 1) * dayWidth - 4,
                              4,
                            ),
                            top: 8,
                            height: ROW_HEIGHT - 16,
                            backgroundColor: row.zona.colore,
                            opacity: 0.7,
                          }}
                        />
                      )}
                    </div>
                  );
                }

                /* ---- Task row ---- */
                const { sDay, eDay } = getBarPosition(row);
                if (sDay < 0 || eDay < 0) {
                  return (
                    <div
                      key={`r-${i}`}
                      className="absolute border-b border-[#e5e5e7]/50"
                      style={{ top, height: ROW_HEIGHT, width: totalWidth }}
                    />
                  );
                }

                const barLeft = sDay * dayWidth + 2;
                const barWidth = Math.max((eDay - sDay + 1) * dayWidth - 4, 4);
                const barLabel = row.task.tipologia
                  ? row.task.tipologia.replace(/_/g, " ")
                  : "";
                const isDragging =
                  dragState !== null && dragState.taskId === row.task.id;
                const barColor = getTaskBarColor(row.task);

                return (
                  <div
                    key={`r-${i}`}
                    className="absolute border-b border-[#e5e5e7]/50"
                    style={{ top, height: ROW_HEIGHT, width: totalWidth }}
                  >
                    {/* Task bar */}
                    <div
                      className="absolute flex items-center overflow-hidden select-none"
                      style={{
                        left: barLeft,
                        width: barWidth,
                        top: 4,
                        height: 28,
                        borderRadius: 6,
                        backgroundColor: barColor,
                        cursor: isDragging ? "grabbing" : "grab",
                        opacity: isDragging ? 0.85 : 1,
                        zIndex: isDragging ? 20 : 1,
                      }}
                      title={[
                        row.task.titolo,
                        row.task.tipologia
                          ? `Tipo: ${row.task.tipologia.replace(/_/g, " ")}`
                          : null,
                        row.task.fornitore_nome
                          ? `Fornitore: ${row.task.fornitore_nome}`
                          : null,
                        `Stato: ${row.task.stato_calcolato.replace(/_/g, " ")}`,
                      ]
                        .filter(Boolean)
                        .join("\n")}
                      onMouseDown={(e) => {
                        // Ignore if clicking on edge handles
                        const rect = e.currentTarget.getBoundingClientRect();
                        const relX = e.clientX - rect.left;
                        if (relX <= 4 || relX >= rect.width - 4) return;
                        startDrag(e, row.task, "move");
                      }}
                      onClick={(e) => {
                        // Only trigger popup if not dragging
                        if (dragState) return;
                        setPopupTask({ task: row.task, x: e.clientX, y: e.clientY });
                      }}
                    >
                      {/* Left resize handle */}
                      <div
                        className="absolute left-0 top-0 bottom-0 z-10"
                        style={{ width: 4, cursor: "col-resize" }}
                        onMouseDown={(e) => startDrag(e, row.task, "resize-left")}
                      />
                      {/* Bar text */}
                      {barWidth > 60 && barLabel && (
                        <span className="text-[12px] text-white font-medium px-2 truncate leading-none pointer-events-none">
                          {barLabel}
                        </span>
                      )}
                      {/* Right resize handle */}
                      <div
                        className="absolute right-0 top-0 bottom-0 z-10"
                        style={{ width: 4, cursor: "col-resize" }}
                        onMouseDown={(e) => startDrag(e, row.task, "resize-right")}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Task popup */}
      {popupTask && (
        <div className="fixed inset-0 z-50" onClick={() => setPopupTask(null)}>
          <div
            className="absolute bg-white rounded-[12px] border border-[#e5e5e7] shadow-lg p-4 w-[300px]"
            style={{
              left: Math.min(popupTask.x, window.innerWidth - 320),
              top: Math.min(popupTask.y + 10, window.innerHeight - 200),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">
              {popupTask.task.titolo}
            </h3>
            <p className="text-[10px] text-[#86868b] mb-2">
              {popupTask.task.zona_nome} &gt; {popupTask.task.lavorazione_nome}
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {popupTask.task.tipologia && (
                <span className="text-[10px] bg-[#f5f5f7] px-1.5 py-0.5 rounded text-[#86868b]">
                  {popupTask.task.tipologia.replace(/_/g, " ")}
                </span>
              )}
              {popupTask.task.fornitore_nome && (
                <span className="text-[10px] bg-[#f5f5f7] px-1.5 py-0.5 rounded text-[#86868b]">
                  {popupTask.task.fornitore_nome}
                </span>
              )}
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor:
                    (STATO_BAR_COLORS[popupTask.task.stato_calcolato] ?? "#d1d5db") +
                    "30",
                  color:
                    STATO_BAR_COLORS[popupTask.task.stato_calcolato] ?? "#86868b",
                }}
              >
                {popupTask.task.stato_calcolato.replace(/_/g, " ")}
              </span>
            </div>
            {popupTask.task.data_inizio && (
              <p className="text-[10px] text-[#86868b]">
                {new Date(popupTask.task.data_inizio).toLocaleDateString("it-IT")} —{" "}
                {popupTask.task.data_fine
                  ? new Date(popupTask.task.data_fine).toLocaleDateString("it-IT")
                  : "?"}
              </p>
            )}
            <a
              href={`/lavorazioni?task=${popupTask.task.id}`}
              className="mt-3 block text-xs text-blue-600 hover:underline font-medium"
            >
              Apri dettaglio
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
