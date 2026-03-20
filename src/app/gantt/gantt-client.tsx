"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { format, eachDayOfInterval, isWeekend, differenceInDays, parseISO, subDays } from "date-fns";
import { it } from "date-fns/locale";

interface Zona { id: string; nome: string; colore: string; ordine: number; }
interface Lavorazione { id: string; zona_id: string; nome: string; ordine: number; }
interface Task {
  id: string; titolo: string; lavorazione_id: string; zona_nome: string; zona_colore: string;
  zona_ordine: number; lavorazione_nome: string; data_inizio: string | null;
  data_fine: string | null; stato_calcolato: string; tipologia: string | null;
}
interface Materiale {
  id: string; task_id: string; nome: string;
  quantita: number | null; quantita_disponibile: number | null; quantita_ordinata: number | null;
  data_necessaria: string | null; giorni_consegna: number | null;
}

interface Props { zone: Zona[]; lavorazioni: Lavorazione[]; tasks: Task[]; materiali: Materiale[]; }

const STATO_BAR_COLORS: Record<string, string> = {
  da_fare: "#d1d5db", in_corso: "#3b82f6", completata: "#22c55e", bloccata: "#ef4444",
  in_attesa_fornitore: "#f59e0b", in_attesa_dipendenza: "#f59e0b",
  in_attesa_materiali: "#f59e0b", in_attesa_permesso: "#f59e0b",
};

export function GanttClient({ zone, lavorazioni, tasks, materiali }: Props) {
  const [mode, setMode] = useState<"cantiere" | "progetto">("cantiere");
  const [expandedLav, setExpandedLav] = useState<Set<string>>(new Set());

  const ZONA_COLORS: Record<string, string> = {};
  zone.forEach((z) => (ZONA_COLORS[z.id] = z.colore));

  // Group materiali by task_id
  const matByTask: Record<string, Materiale[]> = {};
  materiali.forEach((m) => { if (!matByTask[m.task_id]) matByTask[m.task_id] = []; matByTask[m.task_id].push(m); });

  const dayWidth = mode === "cantiere" ? 40 : 18;
  const startDate = useMemo(() => (mode === "cantiere" ? new Date("2026-04-01") : new Date("2026-03-01")), [mode]);
  const endDate = useMemo(() => new Date("2026-06-15"), []);
  const days = useMemo(() => eachDayOfInterval({ start: startDate, end: endDate }), [startDate, endDate]);

  const today = new Date();
  const apertura = new Date("2026-05-01");
  const todayOffset = differenceInDays(today, startDate);
  const aperturaOffset = differenceInDays(apertura, startDate);

  const toggleLav = (id: string) => {
    const next = new Set(expandedLav);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedLav(next);
  };

  type Row =
    | { type: "zona"; zona: Zona }
    | { type: "lav"; lav: Lavorazione; zona: Zona; startDay: number; endDay: number }
    | { type: "task"; task: Task; startDay: number; endDay: number }
    | { type: "mat"; mat: Materiale; startDay: number; endDay: number };

  const rows: Row[] = [];
  for (const z of zone) {
    rows.push({ type: "zona", zona: z });
    const zoneLav = lavorazioni.filter((l) => l.zona_id === z.id);
    for (const lav of zoneLav) {
      const lavTasks = tasks.filter((t) => t.lavorazione_id === lav.id);
      const datesStart = lavTasks.filter((t) => t.data_inizio).map((t) => parseISO(t.data_inizio!));
      const datesEnd = lavTasks.filter((t) => t.data_fine).map((t) => parseISO(t.data_fine!));
      const lavStart = datesStart.length > 0 ? Math.min(...datesStart.map((d) => differenceInDays(d, startDate))) : -1;
      const lavEnd = datesEnd.length > 0 ? Math.max(...datesEnd.map((d) => differenceInDays(d, startDate))) : -1;

      rows.push({ type: "lav", lav, zona: z, startDay: lavStart, endDay: lavEnd });

      if (expandedLav.has(lav.id)) {
        for (const task of lavTasks) {
          const tStart = task.data_inizio ? differenceInDays(parseISO(task.data_inizio), startDate) : -1;
          const tEnd = task.data_fine ? differenceInDays(parseISO(task.data_fine), startDate) : -1;
          rows.push({ type: "task", task, startDay: tStart, endDay: tEnd });

          // FIX 4C: material rows under the task
          const taskMat = matByTask[task.id] || [];
          for (const m of taskMat) {
            if (!m.data_necessaria) continue;
            const matEnd = differenceInDays(parseISO(m.data_necessaria), startDate);
            const matStart = m.giorni_consegna
              ? differenceInDays(subDays(parseISO(m.data_necessaria), m.giorni_consegna), startDate)
              : matEnd;
            rows.push({ type: "mat", mat: m, startDay: matStart, endDay: matEnd });
          }
        }
      }
    }
  }

  const totalWidth = days.length * dayWidth;
  const ROW_HEIGHT = 32;
  const MAT_ROW_HEIGHT = 24;

  function matBarColor(m: Materiale): string {
    const disp = m.quantita_disponibile ?? 0;
    const tot = m.quantita ?? 0;
    const ord = m.quantita_ordinata ?? 0;
    if (tot > 0 && disp >= tot) return "#22c55e";
    if (ord > 0) return "#f59e0b";
    return "#ef4444";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-[#1d1d1f]">Gantt</h1>
        <div className="flex gap-1 bg-[#f5f5f7] rounded-lg p-1">
          <button onClick={() => setMode("cantiere")} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${mode === "cantiere" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"}`}>Cantiere</button>
          <button onClick={() => setMode("progetto")} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${mode === "progetto" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"}`}>Progetto</button>
        </div>
      </div>

      <div className="flex border border-[#e5e5e7] rounded-[12px] bg-white overflow-hidden">
        {/* Left column: labels */}
        <div className="w-[200px] min-w-[200px] border-r border-[#e5e5e7] bg-white z-10">
          <div className="h-[48px] border-b border-[#e5e5e7] px-3 flex items-end pb-1">
            <span className="text-[10px] text-[#86868b] font-medium">Lavorazione</span>
          </div>
          {rows.map((row, i) => {
            if (row.type === "zona") {
              return (
                <div key={`z-${row.zona.id}`} className="flex items-center gap-2 px-3 border-b border-[#e5e5e7]" style={{ height: ROW_HEIGHT, backgroundColor: row.zona.colore + "15" }}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: row.zona.colore }} />
                  <span className="text-[10px] font-semibold text-[#1d1d1f] truncate">{row.zona.nome}</span>
                </div>
              );
            }
            if (row.type === "lav") {
              return (
                <button key={`l-${row.lav.id}`} onClick={() => toggleLav(row.lav.id)} className="w-full flex items-center gap-1.5 px-3 text-left border-b border-[#e5e5e7] hover:bg-[#f5f5f7]/50" style={{ height: ROW_HEIGHT }}>
                  {expandedLav.has(row.lav.id) ? <ChevronDown size={10} className="text-[#86868b]" /> : <ChevronRight size={10} className="text-[#86868b]" />}
                  <span className="text-[10px] text-[#1d1d1f] truncate">{row.lav.nome}</span>
                </button>
              );
            }
            if (row.type === "task") {
              return (
                <div key={`t-${row.task.id}-${i}`} className="flex items-center px-3 pl-7 border-b border-[#e5e5e7]" style={{ height: ROW_HEIGHT }}>
                  <span className="text-[10px] text-[#86868b] truncate">{row.task.titolo}</span>
                </div>
              );
            }
            // mat row
            return (
              <div key={`m-${row.mat.id}-${i}`} className="flex items-center px-3 pl-9 border-b border-[#e5e5e7]/50" style={{ height: MAT_ROW_HEIGHT }}>
                <span className="text-[9px] text-[#86868b] truncate italic">Mat: {row.mat.nome}</span>
              </div>
            );
          })}
        </div>

        {/* Right: timeline */}
        <div className="flex-1 overflow-x-auto">
          <div style={{ width: totalWidth, minWidth: totalWidth }}>
            {/* Day headers */}
            <div className="flex h-[48px] border-b border-[#e5e5e7] sticky top-0 bg-white z-10">
              {days.map((day, i) => {
                const isWe = isWeekend(day);
                const isFirst = i === 0 || day.getDate() === 1;
                return (
                  <div key={i} className={`flex flex-col items-center justify-end pb-1 border-r border-[#e5e5e7]/50 ${isWe ? "bg-[#f5f5f7]/50" : ""}`} style={{ width: dayWidth, minWidth: dayWidth }}>
                    {isFirst && <span className="text-[8px] text-[#86868b] font-medium">{format(day, "MMM", { locale: it })}</span>}
                    <span className="text-[9px] text-[#86868b]">{day.getDate()}</span>
                    {dayWidth >= 30 && <span className="text-[8px] text-[#86868b]">{format(day, "EEEEEE", { locale: it })}</span>}
                  </div>
                );
              })}
            </div>

            {/* Rows with bars */}
            <div className="relative">
              {todayOffset >= 0 && todayOffset < days.length && (
                <div className="absolute top-0 bottom-0 w-px bg-red-500 z-20" style={{ left: todayOffset * dayWidth + dayWidth / 2 }} />
              )}
              {aperturaOffset >= 0 && aperturaOffset < days.length && (
                <div className="absolute top-0 bottom-0 w-px bg-green-500 z-20" style={{ left: aperturaOffset * dayWidth + dayWidth / 2 }} />
              )}

              {rows.map((row, i) => {
                const rowH = row.type === "mat" ? MAT_ROW_HEIGHT : ROW_HEIGHT;
                const isZona = row.type === "zona";

                return (
                  <div key={i} className="relative border-b border-[#e5e5e7]/50" style={{ height: rowH }}>
                    {/* Weekend stripes */}
                    {days.map((day, di) =>
                      isWeekend(day) ? <div key={di} className="absolute top-0 bottom-0 bg-[#f5f5f7]/40" style={{ left: di * dayWidth, width: dayWidth }} /> : null
                    )}
                    {isZona && <div className="absolute inset-0" style={{ backgroundColor: (row as { zona: Zona }).zona.colore + "10" }} />}

                    {/* Lavorazione bar */}
                    {row.type === "lav" && row.startDay >= 0 && row.endDay >= 0 && (
                      <div className="absolute rounded-sm" style={{
                        left: row.startDay * dayWidth + 2,
                        width: Math.max((row.endDay - row.startDay + 1) * dayWidth - 4, 4),
                        top: 8, height: ROW_HEIGHT - 16,
                        backgroundColor: row.zona.colore, opacity: 0.7,
                      }} />
                    )}
                    {/* Task bar */}
                    {row.type === "task" && row.startDay >= 0 && row.endDay >= 0 && (
                      <div className="absolute rounded-sm" style={{
                        left: row.startDay * dayWidth + 2,
                        width: Math.max((row.endDay - row.startDay + 1) * dayWidth - 4, 4),
                        top: 9, height: ROW_HEIGHT - 18,
                        backgroundColor: STATO_BAR_COLORS[row.task.stato_calcolato] ?? "#d1d5db",
                      }} title={`${row.task.titolo} (${row.task.stato_calcolato})`} />
                    )}
                    {/* FIX 4C: Material bar — dashed style */}
                    {row.type === "mat" && row.startDay >= 0 && row.endDay >= 0 && (
                      <div className="absolute rounded-sm" style={{
                        left: row.startDay * dayWidth + 2,
                        width: Math.max((row.endDay - row.startDay + 1) * dayWidth - 4, 4),
                        top: 5, height: MAT_ROW_HEIGHT - 10,
                        backgroundColor: matBarColor(row.mat),
                        opacity: 0.5,
                        backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,255,255,0.4) 3px, rgba(255,255,255,0.4) 6px)`,
                      }} title={`Mat: ${row.mat.nome} (${(row.mat.quantita_disponibile ?? 0) >= (row.mat.quantita ?? 0) && (row.mat.quantita ?? 0) > 0 ? "completo" : (row.mat.quantita_ordinata ?? 0) > 0 ? "ordinato" : "da acquistare"})`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
