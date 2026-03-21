"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { format, eachDayOfInterval, isWeekend, differenceInDays, parseISO, subDays } from "date-fns";
import { it } from "date-fns/locale";

interface Zona { id: string; nome: string; colore: string; ordine: number; }
interface Lavorazione { id: string; zona_id: string; nome: string; ordine: number; }
interface Task {
  id: string; titolo: string; lavorazione_id: string; zona_nome: string; zona_colore: string;
  zona_ordine: number; lavorazione_nome: string; data_inizio: string | null;
  data_fine: string | null; stato_calcolato: string; tipologia: string | null;
  fornitore_nome: string | null;
}
interface Materiale {
  id: string; task_id: string; nome: string;
  quantita: number | null; quantita_disponibile: number | null; quantita_ordinata: number | null;
  data_necessaria: string | null; giorni_consegna: number | null;
}

interface OpInfo {
  id: string; materiale_id: string; titolo: string; tipologia: string | null; stato: string;
  stato_calcolato: string; data_inizio: string | null; data_fine: string | null;
  fornitore_id: string | null; fornitore: { nome: string; stato: string } | null;
}
interface Props { zone: Zona[]; lavorazioni: Lavorazione[]; tasks: Task[]; materiali: Materiale[]; opsByMat: Record<string, OpInfo[]>; tipColorMap: Record<string, string>; conflictDescriptions?: Record<string, string>; }

const STATO_BAR_COLORS: Record<string, string> = {
  da_fare: "#d1d5db", in_corso: "#3b82f6", completata: "#22c55e", bloccata: "#ef4444",
  in_attesa_fornitore: "#f59e0b", in_attesa_dipendenza: "#f59e0b",
  in_attesa_materiali: "#f59e0b", in_attesa_permesso: "#f59e0b",
};

const FORNITORE_PALETTE = [
  "#6366f1", "#ec4899", "#14b8a6", "#f97316", "#8b5cf6",
  "#06b6d4", "#e11d48", "#84cc16", "#eab308", "#0ea5e9",
  "#d946ef", "#10b981", "#f43f5e", "#a855f7", "#22d3ee",
];

type ColorMode = "tipologia" | "zona" | "fornitore";

export function GanttClient({ zone, lavorazioni, tasks, materiali, opsByMat, tipColorMap, conflictDescriptions = {} }: Props) {
  const conflictSet = new Set(Object.keys(conflictDescriptions));
  const [mode, setMode] = useState<"cantiere" | "progetto">("cantiere");
  const [colorMode, setColorMode] = useState<ColorMode>("tipologia");
  const [expandedLav, setExpandedLav] = useState<Set<string>>(new Set());
  const [expandedZone, setExpandedZone] = useState<Set<string>>(new Set());
  const [popupTask, setPopupTask] = useState<{ task: Task; x: number; y: number } | null>(null);

  const ZONA_COLORS: Record<string, string> = {};
  zone.forEach((z) => (ZONA_COLORS[z.id] = z.colore));

  // Build fornitore color map
  const fornitoreColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const uniqueFornitori = Array.from(new Set(tasks.filter(t => t.fornitore_nome).map(t => t.fornitore_nome!)));
    uniqueFornitori.sort().forEach((nome, i) => { map[nome] = FORNITORE_PALETTE[i % FORNITORE_PALETTE.length]; });
    return map;
  }, [tasks]);

  // Build zona name->color map for tasks
  const zonaNameColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    zone.forEach((z) => { map[z.nome] = z.colore; });
    return map;
  }, [zone]);

  // Get bar color based on current colorMode
  function getTaskBarColor(task: Task): string {
    if (colorMode === "zona") {
      return zonaNameColorMap[task.zona_nome] ?? "#d1d5db";
    }
    if (colorMode === "fornitore") {
      return task.fornitore_nome ? (fornitoreColorMap[task.fornitore_nome] ?? "#d1d5db") : "#d1d5db";
    }
    // tipologia (default)
    return (task.tipologia && tipColorMap[task.tipologia]) ? tipColorMap[task.tipologia] : (STATO_BAR_COLORS[task.stato_calcolato] ?? "#d1d5db");
  }

  // Legend entries for current color mode
  const legendEntries = useMemo(() => {
    if (colorMode === "zona") {
      const usedZone = new Set(tasks.map(t => t.zona_nome));
      return zone.filter(z => usedZone.has(z.nome)).map(z => ({ label: z.nome, color: z.colore }));
    }
    if (colorMode === "fornitore") {
      return Object.entries(fornitoreColorMap).sort((a, b) => a[0].localeCompare(b[0])).map(([nome, color]) => ({ label: nome, color }));
    }
    // tipologia
    return Object.entries(tipColorMap).map(([nome, color]) => ({ label: nome.replace(/_/g, " "), color }));
  }, [colorMode, zone, tasks, fornitoreColorMap, tipColorMap]);

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

  const toggleZone = (id: string) => {
    const next = new Set(expandedZone);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedZone(next);
  };

  type Row =
    | { type: "zona"; zona: Zona }
    | { type: "zona-bar"; zona: Zona; startDay: number; endDay: number }
    | { type: "lav"; lav: Lavorazione; zona: Zona; startDay: number; endDay: number }
    | { type: "task"; task: Task; startDay: number; endDay: number }
    | { type: "op"; op: OpInfo; startDay: number; endDay: number }
    | { type: "mat"; mat: Materiale; startDay: number; endDay: number };

  const rows: Row[] = [];
  for (const z of zone) {
    rows.push({ type: "zona", zona: z });
    const zoneLav = lavorazioni.filter((l) => l.zona_id === z.id);

    if (!expandedZone.has(z.id)) {
      // Zone collapsed: show single aggregated zona-bar row
      const allZoneTasks = tasks.filter((t) => zoneLav.some((l) => l.id === t.lavorazione_id));
      const allStarts = allZoneTasks.filter((t) => t.data_inizio).map((t) => differenceInDays(parseISO(t.data_inizio!), startDate));
      const allEnds = allZoneTasks.filter((t) => t.data_fine).map((t) => differenceInDays(parseISO(t.data_fine!), startDate));
      const zStart = allStarts.length > 0 ? Math.min(...allStarts) : -1;
      const zEnd = allEnds.length > 0 ? Math.max(...allEnds) : -1;
      rows.push({ type: "zona-bar", zona: z, startDay: zStart, endDay: zEnd });
    } else {
      // Zone expanded: show lavorazioni
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

            // Material rows + operazioni sotto ogni materiale
            const taskMat = matByTask[task.id] || [];
            for (const m of taskMat) {
              if (!m.data_necessaria) continue;
              const matEnd = differenceInDays(parseISO(m.data_necessaria), startDate);
              const ggConsegna = m.giorni_consegna ?? 3;
              const matStart = differenceInDays(subDays(parseISO(m.data_necessaria), ggConsegna), startDate);
              rows.push({ type: "mat", mat: m, startDay: matStart, endDay: matEnd });
              // Operazioni sotto questo materiale
              const matOps = opsByMat[m.id] || [];
              for (const op of matOps) {
                const opStart = op.data_inizio ? differenceInDays(parseISO(op.data_inizio), startDate) : matStart;
                const opEnd = op.data_fine ? differenceInDays(parseISO(op.data_fine), startDate) : matEnd;
                rows.push({ type: "op", op, startDay: opStart, endDay: opEnd });
              }
            }
          }
        }
      }
    }
  }

  const totalWidth = days.length * dayWidth;
  const ROW_HEIGHT = 36;
  const MAT_ROW_HEIGHT = 28;

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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-[#1d1d1f]">Gantt</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-[#f5f5f7] rounded-lg p-1">
            <button onClick={() => setMode("cantiere")} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${mode === "cantiere" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"}`}>Cantiere</button>
            <button onClick={() => setMode("progetto")} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${mode === "progetto" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"}`}>Progetto</button>
          </div>
          <div>
            <span className="text-[9px] text-[#86868b] block mb-0.5">Colora per</span>
            <div className="flex gap-1 bg-[#f5f5f7] rounded-lg p-1">
              {(["zona", "tipologia", "fornitore"] as const).map((cm) => (
                <button key={cm} onClick={() => setColorMode(cm)} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${colorMode === cm ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"}`}>
                  {cm === "zona" ? "Zona" : cm === "tipologia" ? "Tipologia" : "Fornitore"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      {legendEntries.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
          {legendEntries.map((entry) => (
            <div key={entry.label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-[10px] text-[#86868b]">{entry.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Single scrollable container */}
      <div className="border border-[#e5e5e7] rounded-[12px] bg-white overflow-auto h-[calc(100vh-180px)]">
        <div style={{ width: totalWidth + 200, minWidth: totalWidth + 200 }}>
          {/* Header row: sticky top */}
          <div className="flex sticky top-0 z-20 bg-white border-b border-[#e5e5e7]" style={{ height: 48 }}>
            {/* Top-left corner: sticky both directions */}
            <div className="w-[200px] min-w-[200px] flex items-end pb-1 px-3 bg-white border-r border-[#e5e5e7] sticky left-0 z-30" style={{ boxShadow: '2px 0 4px rgba(0,0,0,0.05)' }}>
              <span className="text-[10px] text-[#86868b] font-medium">Lavorazione</span>
            </div>
            {days.map((day, di) => {
              const isWe = isWeekend(day);
              const isFirst = di === 0 || day.getDate() === 1;
              return (
                <div key={di} className={`flex flex-col items-center justify-end pb-1 border-r border-[#e5e5e7]/50 ${isWe ? "bg-[#f5f5f7]/50" : ""}`} style={{ width: dayWidth, minWidth: dayWidth }}>
                  {isFirst && <span className="text-[8px] text-[#86868b] font-medium">{format(day, "MMM", { locale: it })}</span>}
                  <span className="text-[9px] text-[#86868b]">{day.getDate()}</span>
                  {dayWidth >= 30 && <span className="text-[8px] text-[#86868b]">{format(day, "EEEEEE", { locale: it })}</span>}
                </div>
              );
            })}
          </div>

          {/* Data rows wrapper with vertical lines */}
          <div className="relative">
            {/* Vertical lines: today + apertura */}
            {todayOffset >= 0 && todayOffset < days.length && (
              <div className="absolute top-0 bottom-0 z-[5]" style={{ left: 200 + todayOffset * dayWidth + dayWidth / 2 - 1, width: 2, backgroundColor: "#ef4444" }} />
            )}
            {aperturaOffset >= 0 && aperturaOffset < days.length && (
              <div className="absolute top-0 bottom-0 z-[5]" style={{ left: 200 + aperturaOffset * dayWidth + dayWidth / 2 - 1, width: 2, backgroundColor: "#22c55e" }} />
            )}

            {/* Data rows */}
            {rows.map((row, i) => {
              const rowH = (row.type === "mat" || row.type === "op") ? MAT_ROW_HEIGHT : ROW_HEIGHT;
              const isZona = row.type === "zona";

              // Left cell content
              let leftCell: React.ReactNode;
              if (row.type === "zona") {
                leftCell = (
                  <button onClick={() => toggleZone(row.zona.id)} className="w-full h-full flex items-center gap-1.5 px-3 cursor-pointer" style={{ backgroundColor: row.zona.colore + "15" }}>
                    {expandedZone.has(row.zona.id) ? <ChevronDown size={10} className="text-[#86868b]" /> : <ChevronRight size={10} className="text-[#86868b]" />}
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: row.zona.colore }} />
                    <span className="text-[10px] font-semibold text-[#1d1d1f] truncate">{row.zona.nome}</span>
                  </button>
                );
              } else if (row.type === "zona-bar") {
                leftCell = <div className="flex items-center px-3 pl-7 h-full"><span className="text-[10px] text-[#86868b] truncate italic">Tutte le lavorazioni</span></div>;
              } else if (row.type === "lav") {
                const hasNoDates = row.startDay < 0 && row.endDay < 0;
                leftCell = (
                  <button onClick={() => toggleLav(row.lav.id)} className="w-full h-full flex items-center gap-1.5 px-3 text-left hover:bg-[#f5f5f7]/50">
                    {expandedLav.has(row.lav.id) ? <ChevronDown size={10} className="text-[#86868b]" /> : <ChevronRight size={10} className="text-[#86868b]" />}
                    <span className="text-[10px] text-[#1d1d1f] truncate">{row.lav.nome}{hasNoDates && <span className="text-gray-400 text-[8px] ml-1">(no date)</span>}</span>
                  </button>
                );
              } else if (row.type === "task") {
                leftCell = (
                  <div className="flex items-center gap-1 px-3 pl-7 h-full">
                    <span className="text-[10px] text-[#86868b] truncate">{row.task.titolo}</span>
                    {conflictSet.has(row.task.id) && <span title={conflictDescriptions[row.task.id] ?? "Conflitto attrezzi"} className="flex-shrink-0"><AlertTriangle size={10} className="text-orange-500" /></span>}
                  </div>
                );
              } else if (row.type === "op") {
                leftCell = (
                  <div className="flex items-center px-3 pl-9 h-full">
                    <span className="text-[9px] text-[#86868b] truncate">{row.op.tipologia ? row.op.tipologia.replace(/_/g, " ") : row.op.titolo}{row.op.fornitore ? ` — ${row.op.fornitore.nome}` : ""}</span>
                  </div>
                );
              } else {
                leftCell = (
                  <div className="flex items-center px-3 pl-9 h-full">
                    <span className="text-[9px] text-[#86868b] truncate italic">Mat: {(row as { mat: Materiale }).mat.nome}</span>
                  </div>
                );
              }

              return (
                <div key={i} className="flex border-b border-[#e5e5e7]/50" style={{ height: rowH }}>
                  {/* Left cell: sticky */}
                  <div className="w-[200px] min-w-[200px] border-r border-[#e5e5e7] bg-white sticky left-0 z-10 flex-shrink-0" style={{ boxShadow: '2px 0 4px rgba(0,0,0,0.05)' }}>
                    {leftCell}
                  </div>
                  {/* Right cell: bars */}
                  <div className="relative flex-1" style={{ minWidth: totalWidth }}>
                    {/* Weekend stripes */}
                    {days.map((day, di) => isWeekend(day) ? <div key={di} className="absolute top-0 bottom-0 bg-[#f5f5f7]/40" style={{ left: di * dayWidth, width: dayWidth }} /> : null)}
                    {isZona && <div className="absolute inset-0" style={{ backgroundColor: (row as { zona: Zona }).zona.colore + "10" }} />}

                    {/* Zona aggregated bar */}
                    {row.type === "zona-bar" && row.startDay >= 0 && row.endDay >= 0 && (
                      <div className="absolute rounded-sm" style={{
                        left: row.startDay * dayWidth + 2,
                        width: Math.max((row.endDay - row.startDay + 1) * dayWidth - 4, 4),
                        top: 6, height: ROW_HEIGHT - 12,
                        backgroundColor: row.zona.colore, opacity: 0.5,
                      }} />
                    )}

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
                    {row.type === "task" && row.startDay >= 0 && row.endDay >= 0 && (() => {
                      const barWidth = Math.max((row.endDay - row.startDay + 1) * dayWidth - 4, 4);
                      const barLabel = row.task.tipologia ? row.task.tipologia.replace(/_/g, " ") : "";
                      return (
                        <div className="absolute rounded-sm cursor-pointer hover:brightness-110 overflow-hidden flex items-center" style={{
                          left: row.startDay * dayWidth + 2,
                          width: barWidth,
                          top: 4, height: ROW_HEIGHT - 8,
                          backgroundColor: getTaskBarColor(row.task),
                        }} title={`${row.task.titolo} (${row.task.stato_calcolato})`}
                          onClick={(e) => setPopupTask({ task: row.task, x: e.clientX, y: e.clientY })}
                        >
                          {barWidth > 50 && barLabel && (
                            <span className="text-[11px] text-white font-medium px-1 truncate leading-none">{barLabel}</span>
                          )}
                        </div>
                      );
                    })()}

                    {/* Operazione bar */}
                    {row.type === "op" && row.startDay >= 0 && row.endDay >= 0 && (
                      <div className="absolute rounded-sm" style={{
                        left: row.startDay * dayWidth + 2,
                        width: Math.max((row.endDay - row.startDay + 1) * dayWidth - 4, 4),
                        top: 7, height: MAT_ROW_HEIGHT - 10,
                        backgroundColor: STATO_BAR_COLORS[row.op.stato_calcolato] ?? "#d1d5db",
                        opacity: row.op.fornitore && row.op.fornitore.stato !== "pronto" ? 0.5 : 0.8,
                        ...(row.op.fornitore && row.op.fornitore.stato !== "pronto" ? { backgroundImage: "repeating-linear-gradient(90deg,transparent,transparent 3px,rgba(255,255,255,0.4) 3px,rgba(255,255,255,0.4) 6px)" } : {}),
                      }} title={`${row.op.titolo}${row.op.fornitore ? " — " + row.op.fornitore.nome : ""}`} />
                    )}

                    {/* Material bar — dashed style */}
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
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Task popup */}
      {popupTask && (
        <div className="fixed inset-0 z-50" onClick={() => setPopupTask(null)}>
          <div
            className="absolute bg-white rounded-[12px] border border-[#e5e5e7] shadow-lg p-4 w-[300px]"
            style={{ left: Math.min(popupTask.x, window.innerWidth - 320), top: Math.min(popupTask.y + 10, window.innerHeight - 200) }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">{popupTask.task.titolo}</h3>
            <p className="text-[10px] text-[#86868b] mb-2">{popupTask.task.zona_nome} &gt; {popupTask.task.lavorazione_nome}</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {popupTask.task.tipologia && <span className="text-[10px] bg-[#f5f5f7] px-1.5 py-0.5 rounded text-[#86868b]">{popupTask.task.tipologia.replace(/_/g, " ")}</span>}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: (STATO_BAR_COLORS[popupTask.task.stato_calcolato] ?? "#d1d5db") + "30", color: STATO_BAR_COLORS[popupTask.task.stato_calcolato] ?? "#86868b" }}>
                {popupTask.task.stato_calcolato.replace(/_/g, " ")}
              </span>
            </div>
            {popupTask.task.data_inizio && <p className="text-[10px] text-[#86868b]">{new Date(popupTask.task.data_inizio).toLocaleDateString("it-IT")} — {popupTask.task.data_fine ? new Date(popupTask.task.data_fine).toLocaleDateString("it-IT") : "?"}</p>}
            <a href={`/lavorazioni?task=${popupTask.task.id}`} className="mt-3 block text-xs text-blue-600 hover:underline font-medium">Apri dettaglio</a>
          </div>
        </div>
      )}
    </div>
  );
}
