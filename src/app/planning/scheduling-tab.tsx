"use client";

import { useState, useMemo, useCallback } from "react";
import { startOfWeek, addDays, format, parseISO, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Check, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { fetchDependencyGraph, analyzeImpact, type ImpactedTask } from "@/lib/dependency-utils";

const HPD = 11;

interface Task {
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

interface DateRange {
  start: string;
  end: string;
}

interface Props {
  tasks: Task[];
  fornitori: { id: string; nome: string }[];
  tipColorMap: Record<string, string>;
}

export function SchedulingTab({ tasks, fornitori, tipColorMap }: Props) {
  const router = useRouter();
  const [selectedFornId, setSelectedFornId] = useState("");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date("2026-04-13"), { weekStartsOn: 1 }));
  // Assignments: taskId → { start, end } or null (unassigned)
  const [assignments, setAssignments] = useState<Map<string, DateRange | null>>(new Map());
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const [dragOverLeft, setDragOverLeft] = useState(false);
  const [conflicts, setConflicts] = useState<ImpactedTask[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [verified, setVerified] = useState(false);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const dayLabels = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

  const fornTasks = useMemo(() =>
    selectedFornId ? tasks.filter(t => t.fornitore_id === selectedFornId) : [],
    [tasks, selectedFornId]
  );

  // Effective dates for a task (local assignment overrides DB)
  const getDates = useCallback((t: Task): DateRange | null => {
    if (assignments.has(t.id)) return assignments.get(t.id) ?? null;
    if (t.data_inizio) return { start: t.data_inizio, end: t.data_fine || t.data_inizio };
    return null;
  }, [assignments]);

  // LEFT panel: unassigned tasks
  const unassigned = useMemo(() =>
    fornTasks.filter(t => getDates(t) === null),
    [fornTasks, getDates]
  );

  const unassignedByZona = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of unassigned) {
      const z = t.zona_nome || "Altro";
      if (!map.has(z)) map.set(z, []);
      map.get(z)!.push(t);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [unassigned]);

  // RIGHT panel: tasks that overlap each day
  const dayTasks = useMemo(() =>
    weekDays.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      return fornTasks.filter(t => {
        const d = getDates(t);
        if (!d) return false;
        return d.start <= dayStr && d.end >= dayStr;
      });
    }),
    [fornTasks, getDates, weekDays]
  );

  // Hours per day (proportional for multi-day tasks)
  const dayHours = useMemo(() =>
    dayTasks.map(dt => dt.reduce((s, t) => {
      const d = getDates(t);
      if (!d) return s;
      const span = differenceInDays(parseISO(d.end), parseISO(d.start)) + 1;
      const orePerDay = (t.durata_ore ?? 0) / Math.max(span, 1);
      return s + orePerDay;
    }, 0)),
    [dayTasks, getDates]
  );

  // Count tasks assigned to other weeks (for indicator)
  const otherWeekCount = useMemo(() => {
    const wStart = format(weekDays[0], "yyyy-MM-dd");
    const wEnd = format(weekDays[6], "yyyy-MM-dd");
    return fornTasks.filter(t => {
      const d = getDates(t);
      if (!d) return false;
      return d.end < wStart || d.start > wEnd;
    }).length;
  }, [fornTasks, getDates, weekDays]);

  const dirty = assignments.size > 0;

  // Drag: drop on a day → set start=that day, end=that day (single day)
  const onDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDropDay = (e: React.DragEvent, dayIdx: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    const dayStr = format(weekDays[dayIdx], "yyyy-MM-dd");
    // Preserve existing span if just moving, otherwise single day
    const task = fornTasks.find(t => t.id === taskId);
    const current = task ? getDates(task) : null;
    const span = current ? differenceInDays(parseISO(current.end), parseISO(current.start)) : 0;
    const end = format(addDays(weekDays[dayIdx], span), "yyyy-MM-dd");
    setAssignments(prev => new Map(prev).set(taskId, { start: dayStr, end }));
    setDragOverDay(null);
    setConflicts(null);
    setVerified(false);
  };

  const onDropLeft = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    setAssignments(prev => new Map(prev).set(taskId, null));
    setDragOverLeft(false);
    setConflicts(null);
    setVerified(false);
  };

  // Extend/shrink a task's end date by 1 day
  const extendTask = (taskId: string, delta: number) => {
    const task = fornTasks.find(t => t.id === taskId);
    if (!task) return;
    const d = getDates(task);
    if (!d) return;
    const newEnd = format(addDays(parseISO(d.end), delta), "yyyy-MM-dd");
    if (newEnd < d.start) return; // can't shrink past start
    setAssignments(prev => new Map(prev).set(taskId, { start: d.start, end: newEnd }));
    setConflicts(null);
    setVerified(false);
  };

  // Verify
  const handleVerify = async () => {
    const graph = await fetchDependencyGraph(createClient());
    const allConflicts: ImpactedTask[] = [];
    for (const [taskId, range] of Array.from(assignments.entries())) {
      if (!range) continue;
      const impacts = analyzeImpact(taskId, range.end, graph);
      for (const imp of impacts) {
        if (!allConflicts.some(c => c.id === imp.id)) allConflicts.push(imp);
      }
    }
    setConflicts(allConflicts);
    setVerified(true);
  };

  // Apply
  const handleApply = async () => {
    setSaving(true);
    const sb = createClient();
    for (const [taskId, range] of Array.from(assignments.entries())) {
      if (range) {
        await sb.from("task").update({ data_inizio: range.start, data_fine: range.end }).eq("id", taskId);
      } else {
        await sb.from("task").update({ data_inizio: null, data_fine: null }).eq("id", taskId);
      }
    }
    setAssignments(new Map());
    setConflicts(null);
    setVerified(false);
    setSaving(false);
    router.refresh();
  };

  // Clear all
  const handleClearAll = () => {
    const next = new Map<string, DateRange | null>();
    for (const t of fornTasks) next.set(t.id, null);
    setAssignments(next);
    setConflicts(null);
    setVerified(false);
  };

  // Reset
  const handleReset = () => {
    setAssignments(new Map());
    setConflicts(null);
    setVerified(false);
  };

  // Task card
  const renderCard = (task: Task, inCalendar: boolean) => {
    const tipColor = task.tipologia ? tipColorMap[task.tipologia] : null;
    const zonaColor = task.zona_colore || "#ccc";
    const isModified = assignments.has(task.id);
    const ore = task.durata_ore ?? 0;
    const pax = task.numero_persone ?? 1;
    const dates = getDates(task);
    const span = dates ? differenceInDays(parseISO(dates.end), parseISO(dates.start)) + 1 : 1;
    const isMultiDay = span > 1;

    return (
      <div
        key={task.id}
        draggable
        onDragStart={(e) => onDragStart(e, task.id)}
        className={`rounded-lg border px-2.5 py-1.5 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md ${isModified ? "border-blue-400 bg-blue-50/50" : "border-[#e5e5e7] bg-white"}`}
        style={{ borderLeftWidth: 3, borderLeftColor: tipColor || zonaColor }}
      >
        <div className="text-[12px] font-medium text-[#1d1d1f] leading-tight">{task.titolo}</div>
        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[#86868b]">
          {ore > 0 && <span>{ore}h</span>}
          {pax > 1 && <span>{pax}p</span>}
          {isMultiDay && <span className="text-blue-500 font-medium">{span}gg</span>}
          {!inCalendar && task.zona_nome && <span className="truncate">{task.zona_nome}</span>}
          {inCalendar && (
            <div className="ml-auto flex items-center gap-0.5">
              <button
                onClick={(e) => { e.stopPropagation(); extendTask(task.id, -1); }}
                className="w-4 h-4 flex items-center justify-center rounded text-[9px] font-bold text-[#86868b] hover:bg-[#e5e5e7] hover:text-[#1d1d1f]"
                title="Riduci 1 giorno"
              >-</button>
              <button
                onClick={(e) => { e.stopPropagation(); extendTask(task.id, 1); }}
                className="w-4 h-4 flex items-center justify-center rounded text-[9px] font-bold text-[#86868b] hover:bg-[#e5e5e7] hover:text-[#1d1d1f]"
                title="Estendi 1 giorno"
              >+</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={selectedFornId}
          onChange={(e) => { setSelectedFornId(e.target.value); handleReset(); }}
          className="text-sm font-medium text-[#1d1d1f] bg-white border border-[#e5e5e7] rounded-[10px] px-3 py-2 outline-none"
        >
          <option value="">Seleziona fornitore...</option>
          {fornitori.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>

        <div className="flex items-center gap-1 bg-white border border-[#e5e5e7] rounded-[10px] px-1 py-1">
          <button onClick={() => setWeekStart(d => addDays(d, -7))} className="p-1.5 rounded-lg hover:bg-[#f5f5f7]">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-[#1d1d1f] px-2 min-w-[160px] text-center">
            {format(weekDays[0], "d MMM", { locale: it })} — {format(weekDays[6], "d MMM yyyy", { locale: it })}
          </span>
          <button onClick={() => setWeekStart(d => addDays(d, 7))} className="p-1.5 rounded-lg hover:bg-[#f5f5f7]">
            <ChevronRight size={16} />
          </button>
        </div>

        {otherWeekCount > 0 && (
          <span className="text-[11px] text-[#86868b]">{otherWeekCount} task in altre settimane</span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {selectedFornId && (
            <button onClick={handleClearAll} className="text-xs text-[#86868b] hover:text-[#1d1d1f] px-3 py-2 rounded-[10px] border border-[#e5e5e7]">
              Pulisci calendario
            </button>
          )}
          {dirty && (
            <button onClick={handleReset} className="text-xs text-[#86868b] hover:text-[#1d1d1f] px-3 py-2 rounded-[10px] border border-[#e5e5e7]">
              Reset
            </button>
          )}
          <button
            onClick={handleVerify}
            disabled={!dirty}
            className={`text-xs font-medium px-3 py-2 rounded-[10px] border transition-colors ${dirty ? "text-[#1d1d1f] border-[#e5e5e7] hover:bg-[#f5f5f7]" : "text-[#d1d1d6] border-[#e5e5e7] cursor-not-allowed"}`}
          >
            Verifica dipendenze
          </button>
          <button
            onClick={handleApply}
            disabled={!dirty || saving}
            className={`text-xs font-medium px-4 py-2 rounded-[10px] transition-colors ${dirty ? "bg-[#1d1d1f] text-white hover:bg-[#333]" : "bg-[#e5e5e7] text-[#86868b] cursor-not-allowed"}`}
          >
            {saving ? "Salvataggio..." : "Applica"}
          </button>
        </div>
      </div>

      {!selectedFornId ? (
        <div className="flex items-center justify-center h-64 text-[#86868b] text-sm">
          Seleziona un fornitore per iniziare lo scheduling
        </div>
      ) : (
        <div className="flex gap-4" style={{ height: "calc(100vh - 220px)" }}>
          {/* LEFT PANEL */}
          <div
            className={`w-72 flex-shrink-0 rounded-[12px] border overflow-y-auto transition-colors ${dragOverLeft ? "border-blue-400 bg-blue-50/30" : "border-[#e5e5e7] bg-[#f5f5f7]"}`}
            onDragOver={(e) => { e.preventDefault(); setDragOverLeft(true); }}
            onDragLeave={() => setDragOverLeft(false)}
            onDrop={onDropLeft}
          >
            <div className="sticky top-0 bg-[#f5f5f7] z-10 px-4 py-3 border-b border-[#e5e5e7]">
              <span className="text-xs font-semibold text-[#86868b]">
                Da assegnare ({unassigned.length})
              </span>
            </div>
            <div className="p-3 space-y-4">
              {unassignedByZona.map(([zona, ztasks]) => (
                <div key={zona}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ztasks[0]?.zona_colore || "#ccc" }} />
                    <span className="text-[11px] font-semibold text-[#86868b]">{zona}</span>
                    <span className="text-[10px] text-[#86868b]">({ztasks.length})</span>
                  </div>
                  <div className="space-y-1.5">{ztasks.map(t => renderCard(t, false))}</div>
                </div>
              ))}
              {unassigned.length === 0 && (
                <div className="text-center text-[11px] text-[#86868b] py-8">Tutte le task sono assegnate</div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-2 min-w-[700px] h-full">
              {weekDays.map((day, di) => {
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const hours = dayHours[di];
                const overLimit = hours > HPD;
                const pct = Math.min((hours / HPD) * 100, 100);

                return (
                  <div
                    key={di}
                    className={`flex-1 rounded-[12px] border flex flex-col transition-colors min-w-[90px] ${dragOverDay === di ? "border-blue-400 bg-blue-50/30" : isWeekend ? "border-[#e5e5e7] bg-[#F9F9F9]" : "border-[#e5e5e7] bg-white"}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOverDay(di); }}
                    onDragLeave={() => setDragOverDay(null)}
                    onDrop={(e) => onDropDay(e, di)}
                  >
                    <div className="px-3 py-2 border-b border-[#e5e5e7] flex-shrink-0">
                      <div className="text-[11px] font-semibold text-[#1d1d1f]">
                        {dayLabels[di]} {format(day, "dd/MM")}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-[#e5e5e7] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: overLimit ? "#ef4444" : hours > HPD * 0.8 ? "#f59e0b" : "#34C759",
                            }}
                          />
                        </div>
                        <span className={`text-[10px] font-medium whitespace-nowrap ${overLimit ? "text-red-500" : "text-[#86868b]"}`}>
                          {Math.round(hours * 10) / 10}h
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
                      {dayTasks[di].map(t => renderCard(t, true))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Verification results */}
      {verified && conflicts !== null && (
        <div className={`rounded-[12px] border p-4 ${conflicts.length === 0 ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}`}>
          {conflicts.length === 0 ? (
            <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
              <Check size={16} /> Nessun conflitto di dipendenze
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-orange-700 text-sm font-medium mb-2">
                <AlertTriangle size={16} /> {conflicts.length} conflitt{conflicts.length === 1 ? "o" : "i"} di dipendenze
              </div>
              <div className="space-y-1">
                {conflicts.map(c => (
                  <div key={c.id} className="text-xs text-orange-800">
                    <strong>{c.titolo}</strong>
                    {c.fornitore_nome && <span className="text-orange-600"> ({c.fornitore_nome})</span>}
                    : {c.currentDataInizio?.slice(5).replace("-", "/")} → deve spostarsi a {c.newDataInizio.slice(5).replace("-", "/")}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
