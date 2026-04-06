"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, Package, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AppTooltip } from "@/components/ui/app-tooltip";
// Button removed — quick add doesn't need form
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskDetailSheet } from "./task-detail-sheet";
import { updateTask, createTask, createLavorazione, deleteLavorazione, deleteTask, updateLavorazione } from "./actions";
import { cycleTaskStato } from "./cycle-actions";
import type { Zona, StatoFornitore } from "@/lib/types";

// FIX 2: module-level variable survives re-mounts from loading.tsx
let _savedLavId: string | null = null;

const STATO_COLORS: Record<string, string> = {
  da_fare: "bg-[#86868B]/10 text-[#86868B]", in_corso: "bg-[#0071E3]/10 text-[#0071E3]",
  completata: "bg-[#34C759]/10 text-[#34C759]", bloccata: "bg-[#FF3B30]/10 text-[#FF3B30]",
  in_attesa_fornitore: "bg-[#FF9F0A]/10 text-[#FF9F0A]", in_attesa_dipendenza: "bg-[#FF9F0A]/10 text-[#FF9F0A]",
  in_attesa_materiali: "bg-[#FF9F0A]/10 text-[#FF9F0A]", in_attesa_permesso: "bg-[#FF9F0A]/10 text-[#FF9F0A]",
};
const STATO_LABELS: Record<string, string> = {
  da_fare: "Da fare", in_corso: "In corso", completata: "Completata", bloccata: "Bloccata",
  in_attesa_fornitore: "Attesa fornitore", in_attesa_dipendenza: "Attesa dipendenza",
  in_attesa_materiali: "Attesa materiali", in_attesa_permesso: "Attesa permesso",
};
const TIPOLOGIA_COLORS: Record<string, string> = {
  carpenteria: "bg-orange-100 text-orange-700", verniciatura: "bg-purple-100 text-purple-700",
  elettrico: "bg-yellow-100 text-yellow-700", idraulico: "bg-cyan-100 text-cyan-700",
  trasporto: "bg-stone-100 text-stone-600", acquisto: "bg-pink-100 text-pink-700",
  montaggio: "bg-indigo-100 text-indigo-700", audio_luci: "bg-fuchsia-100 text-fuchsia-700",
  giardinaggio: "bg-lime-100 text-lime-700", pulizia_manutenzione: "bg-teal-100 text-teal-700",
  decisione: "bg-sky-100 text-sky-700", amministrativo: "bg-slate-100 text-slate-600",
  misure_rilievo: "bg-emerald-100 text-emerald-700",
};

interface Lavorazione { id: string; zona_id: string; nome: string; ordine: number; }
interface TaskCompleta {
  id: string; lavorazione_id: string; titolo: string; tipologia: string | null;
  fornitore_id: string | null; fornitore_nome: string | null; fornitore_stato: StatoFornitore | null;
  stato_fornitore_minimo: StatoFornitore; stato: string; stato_calcolato: string;
  motivo_blocco: string | null; data_inizio: string | null; data_fine: string | null;
  durata_ore: number | null; numero_persone: number | null; ore_lavoro: number | null;
  costo_ora: number | null; costo_manodopera: number | null; note: string | null;
  ordine: number; zona_nome: string; zona_colore: string; lavorazione_nome: string;
  materiali_mancanti: number; materiali_totali: number;
  dipendenze_incomplete: number; dipendenze_totali: number;
}
interface FornitoreMin { id: string; nome: string; stato: StatoFornitore; }
interface TipologiaDb { nome: string; colore: string; }
export interface OpInCard { id: string; titolo: string; tipologia: string | null; organizzato: boolean; stato: string; fornitore: { nome: string } | null; }
export interface MaterialeInline {
  id: string; task_id: string; nome: string; quantita: number | null; unita: string | null;
  quantita_disponibile: number | null; quantita_ordinata: number | null;
  provenienza: string | null; data_necessaria: string | null; giorni_consegna: number | null;
  catalogo_id: string | null; operazioni: OpInCard[];
}
interface DeleteConfirm { type: "lavorazione" | "task"; id: string; title: string; hasChildren: boolean; }

interface LuogoMin { id: string; nome: string; }

interface Props {
  zone: Zona[]; lavorazioni: Lavorazione[]; tasks: TaskCompleta[];
  fornitori: FornitoreMin[]; tipologie: TipologiaDb[]; materiali: MaterialeInline[];
  luoghi: LuogoMin[]; initialTaskId?: string;
  attrezziConflicts?: Record<string, string>;
  dipendenze?: { task_id: string; dipende_da_id: string }[];
}

export function LavorazioniClient({ zone, lavorazioni, tasks, fornitori, tipologie, materiali, luoghi, initialTaskId, attrezziConflicts = {}, dipendenze = [] }: Props) {
  const tipColorMap: Record<string, string> = {};
  tipologie.forEach((t) => { tipColorMap[t.nome] = t.colore; });

  // Build dependency lookup maps
  const depsOfTask: Record<string, string[]> = {};  // "Dipende da"
  const blocksTask: Record<string, string[]> = {};  // "Blocca"
  for (const d of dipendenze) {
    if (!depsOfTask[d.task_id]) depsOfTask[d.task_id] = [];
    depsOfTask[d.task_id].push(d.dipende_da_id);
    if (!blocksTask[d.dipende_da_id]) blocksTask[d.dipende_da_id] = [];
    blocksTask[d.dipende_da_id].push(d.task_id);
  }
  const taskTitleMap: Record<string, string> = {};
  tasks.forEach(t => { taskTitleMap[t.id] = t.titolo; });

  // Group materiali by task_id
  const materialiByTask: Record<string, MaterialeInline[]> = {};
  materiali.forEach((m) => {
    if (!materialiByTask[m.task_id]) materialiByTask[m.task_id] = [];
    materialiByTask[m.task_id].push(m);
  });

  const [expandedZone, setExpandedZone] = useState<Set<string>>(new Set(zone.map((z) => z.id)));

  // FIX 2: restore from module-level var
  const [selectedLav, setSelectedLav] = useState<string | null>(() => {
    if (_savedLavId && lavorazioni.some((l) => l.id === _savedLavId)) return _savedLavId;
    return lavorazioni[0]?.id ?? null;
  });

  // Keep module var in sync
  useEffect(() => { _savedLavId = selectedLav; }, [selectedLav]);

  // Restore after revalidation re-mount
  useEffect(() => {
    if (_savedLavId && lavorazioni.some((l) => l.id === _savedLavId)) {
      setSelectedLav(_savedLavId);
    }
  }, [lavorazioni]);

  const selectLav = (id: string) => {
    _savedLavId = id;
    setSelectedLav(id);
  };

  // FIX 1: scroll using getElementById on the actual scrollable container
  useEffect(() => {
    requestAnimationFrame(() => {
      const el = document.getElementById("task-scroll-area");
      if (el) el.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, [selectedLav]);

  const [selectedTask, setSelectedTask] = useState<TaskCompleta | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [filterFornitore, setFilterFornitore] = useState<string>("");
  const [addingLavTo, setAddingLavTo] = useState<string | null>(null);
  const [newLavName, setNewLavName] = useState("");

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      return next;
    });
  };

  // PUNTO 9: auto-select task from URL param
  useEffect(() => {
    if (initialTaskId) {
      const t = tasks.find((tk) => tk.id === initialTaskId);
      if (t) {
        selectLav(t.lavorazione_id);
        setSelectedTask(t);
      }
    }
  }, [initialTaskId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);
  const [editingLavName, setEditingLavName] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingLavName && editInputRef.current) {
      setTimeout(() => editInputRef.current?.focus(), 50);
    }
  }, [editingLavName]);

  const saveLavName = async (lavId: string, newName: string) => {
    if (newName.trim()) {
      _savedLavId = selectedLav;
      await updateLavorazione(lavId, { nome: newName.trim() });
    }
    setEditingLavName(null);
  };

  const toggleZone = (id: string) => {
    const next = new Set(expandedZone);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedZone(next);
  };

  const selectedLavData = lavorazioni.find((l) => l.id === selectedLav);
  const selectedLavTasksAll = tasks.filter((t) => t.lavorazione_id === selectedLav);
  const selectedLavTasks = filterFornitore
    ? selectedLavTasksAll.filter((t) => t.fornitore_id === filterFornitore || (t as unknown as Record<string, unknown>).fornitore_supporto_id === filterFornitore)
    : selectedLavTasksAll;
  const selectedZona = selectedLavData ? zone.find((z) => z.id === selectedLavData.zona_id) : null;

  // When filtering by fornitore: all tasks of that fornitore across all zones
  const fornitoreAllTasks = filterFornitore
    ? tasks.filter((t) => t.fornitore_id === filterFornitore || (t as unknown as Record<string, unknown>).fornitore_supporto_id === filterFornitore)
    : [];
  const fornitoreName = filterFornitore ? fornitori.find((f) => f.id === filterFornitore)?.nome : null;

  const handleDeleteLav = (lav: Lavorazione) => {
    const lavTasks = tasks.filter((t) => t.lavorazione_id === lav.id);
    if (lavTasks.length === 0) { deleteLavorazione(lav.id); if (selectedLav === lav.id) { _savedLavId = null; setSelectedLav(null); } }
    else setDeleteConfirm({ type: "lavorazione", id: lav.id, title: lav.nome, hasChildren: true });
  };
  const handleDeleteTask = (task: TaskCompleta) => {
    setDeleteConfirm({ type: "task", id: task.id, title: task.titolo, hasChildren: false });
  };
  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "lavorazione") {
      await deleteLavorazione(deleteConfirm.id);
      if (selectedLav === deleteConfirm.id) { _savedLavId = null; setSelectedLav(null); }
    } else await deleteTask(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  const handleMoveZona = async (newZonaId: string) => {
    if (!selectedLavData || newZonaId === selectedLavData.zona_id) return;
    _savedLavId = selectedLavData.id;
    await updateLavorazione(selectedLavData.id, { zona_id: newZonaId });
  };

  const [mobileView, setMobileView] = useState<"zone" | "lavorazioni" | "tasks">("zone");
  const [mobileZona, setMobileZona] = useState<string | null>(null);

  function matStato(m: MaterialeInline) {
    const disp = m.quantita_disponibile ?? 0;
    const ord = m.quantita_ordinata ?? 0;
    const tot = m.quantita ?? 0;
    const prov = m.provenienza;
    if (prov === "in_loco") return { label: "In loco", cls: "bg-violet-100 text-violet-700" };
    if (tot > 0 && disp >= tot) return { label: "Completo", cls: "bg-green-100 text-green-700" };
    if (prov === "magazzino") return { label: "In magazzino", cls: "bg-amber-100 text-amber-700" };
    if (ord > 0 && disp > 0) return { label: "Parziale", cls: "bg-amber-100 text-amber-700" };
    if (ord > 0) return { label: "Ordinato", cls: "bg-amber-100 text-amber-700" };
    if (prov === "noleggio") return { label: "Da noleggiare", cls: "bg-red-100 text-red-700" };
    return { label: "Da acquistare", cls: "bg-red-100 text-red-700" };
  }

  // Render the add-task form or button
  const [creatingTask, setCreatingTask] = useState(false);
  const handleQuickAddTask = async () => {
    if (!selectedLav || creatingTask) return;
    setCreatingTask(true);
    _savedLavId = selectedLav;
    await createTask({ lavorazione_id: selectedLav, titolo: "Nuova task" });
    setCreatingTask(false);
  };

  const renderAddTask = (position: "top" | "bottom") => {
    const cls = position === "top" ? "mb-3" : "mt-3";
    return (
      <button
        onClick={handleQuickAddTask}
        disabled={creatingTask}
        className={`${cls} flex items-center gap-1.5 text-sm text-[#86868b] hover:text-[#1d1d1f] transition-colors disabled:opacity-50`}
      >
        <Plus size={16} /> {creatingTask ? "Creazione..." : "Aggiungi task"}
      </button>
    );
  };

  // Compact card for fornitore cross-zona view
  const renderTaskCard = (task: TaskCompleta) => {
    const statoColors: Record<string, string> = {
      da_fare: "#d1d5db", in_corso: "#3b82f6", completata: "#22c55e",
      in_attesa_fornitore: "#f59e0b", in_attesa_dipendenza: "#f59e0b",
      in_attesa_materiali: "#f59e0b", in_attesa_permesso: "#f59e0b",
    };
    const sColor = statoColors[task.stato_calcolato] ?? "#d1d5db";
    const tipColor = tipColorMap[task.tipologia ?? ""] ?? "#d1d5db";
    return (
      <button
        key={task.id}
        onClick={() => setSelectedTask(task)}
        className="w-full text-left bg-white rounded-[10px] border border-[#e5e5e7] px-3 py-2 hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: tipColor }} />
          <span className="text-[13px] font-medium text-[#1d1d1f] truncate flex-1">{task.titolo}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
            style={{ backgroundColor: sColor + "25", color: sColor }}>
            {task.stato_calcolato.replace(/_/g, " ")}
          </span>
        </div>
        {(task.data_inizio || task.tipologia) && (
          <div className="flex items-center gap-2 mt-1 text-[11px] text-[#86868b]">
            {task.tipologia && <span>{task.tipologia.replace(/_/g, " ")}</span>}
            {task.data_inizio && <span>{task.data_inizio.slice(5).replace("-", "/")}{task.data_fine && task.data_fine !== task.data_inizio ? ` – ${task.data_fine.slice(5).replace("-", "/")}` : ""}</span>}
            {task.durata_ore && <span>· {task.durata_ore}h</span>}
          </div>
        )}
      </button>
    );
  };

  return (
    <div>
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirm?.type === "lavorazione" ? `Eliminare ${deleteConfirm?.title}?` : "Eliminare task?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === "lavorazione"
                ? `La lavorazione "${deleteConfirm?.title}" e tutte le sue task verranno eliminate.`
                : `La task "${deleteConfirm?.title}" verrà eliminata con materiali e dipendenze.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* FIX 1: h-screen + overflow-hidden forces inner panels to scroll */}
      <div className="hidden md:flex gap-0 -mx-6 -mt-6 h-screen overflow-hidden">
        {/* Left sidebar */}
        <div className="w-[280px] min-w-[280px] border-r border-[#e5e5e7] bg-white overflow-y-auto">
          <div className="p-4 border-b border-[#e5e5e7]">
            <h2 className="text-sm font-semibold text-[#1d1d1f]">Zone e Lavorazioni</h2>
          </div>
          {zone.map((z) => {
            const zoneLav = lavorazioni.filter((l) => l.zona_id === z.id);
            const zoneTasks = tasks.filter((t) => zoneLav.some((l) => l.id === t.lavorazione_id));
            const completed = zoneTasks.filter((t) => t.stato_calcolato === "completata").length;
            const pct = zoneTasks.length > 0 ? Math.round((completed / zoneTasks.length) * 100) : 0;
            const isExpanded = expandedZone.has(z.id);
            return (
              <div key={z.id}>
                <button onClick={() => toggleZone(z.id)} className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-[#f5f5f7] transition-colors">
                  {isExpanded ? <ChevronDown size={14} className="text-[#86868b]" /> : <ChevronRight size={14} className="text-[#86868b]" />}
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: z.colore }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[#1d1d1f] truncate">{z.nome}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1 bg-[#e5e5e7] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: z.colore }} />
                      </div>
                      <span className="text-[10px] text-[#86868b]">{completed}/{zoneTasks.length}</span>
                    </div>
                  </div>
                </button>
                {isExpanded && (
                  <div className="ml-4">
                    {zoneLav.map((lav) => {
                      const lavTasks = tasks.filter((t) => t.lavorazione_id === lav.id);
                      const isSelected = selectedLav === lav.id;
                      return (
                        <div key={lav.id} className={`group/lav flex items-center pr-1 transition-colors ${isSelected ? "bg-[#f5f5f7] text-[#1d1d1f]" : "text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]/50"}`}>
                          <div className={`flex-1 flex items-center justify-between px-4 py-2 text-xs ${isSelected ? "font-medium" : ""}`}>
                            {editingLavName === lav.id ? (
                              <input
                                ref={editInputRef}
                                defaultValue={lav.nome}
                                onBlur={(e) => { const val = e.target.value; setTimeout(() => saveLavName(lav.id, val), 150); }}
                                onKeyDown={(e) => { if (e.key === "Enter") saveLavName(lav.id, (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingLavName(null); }}
                                className="flex-1 min-w-0 text-xs border border-[#e5e5e7] rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-ring"
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <button onClick={() => selectLav(lav.id)} onDoubleClick={(e) => { e.stopPropagation(); setEditingLavName(lav.id); }} className="flex-1 truncate text-left" title="Doppio click per rinominare">
                                {lav.nome}
                              </button>
                            )}
                            <span className="text-[10px] ml-2 flex-shrink-0">{lavTasks.length}</span>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteLav(lav); }} className="p-1 rounded text-[#d2d2d7] opacity-0 group-hover/lav:opacity-100 hover:!text-red-500 hover:bg-red-50 transition-all flex-shrink-0">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                    {addingLavTo === z.id ? (
                      <form className="px-4 py-2 flex gap-1" onSubmit={async (e) => { e.preventDefault(); if (newLavName.trim()) { await createLavorazione({ zona_id: z.id, nome: newLavName.trim() }); setNewLavName(""); setAddingLavTo(null); } }}>
                        <input autoFocus value={newLavName} onChange={(e) => setNewLavName(e.target.value)} placeholder="Nome lavorazione" className="flex-1 text-xs border border-[#e5e5e7] rounded px-2 py-1 outline-none focus:ring-1 focus:ring-ring" onBlur={() => { if (!newLavName.trim()) setAddingLavTo(null); }} />
                      </form>
                    ) : (
                      <button onClick={() => setAddingLavTo(z.id)} className="w-full flex items-center gap-1 px-4 py-1.5 text-[10px] text-[#86868b] hover:text-[#1d1d1f]">
                        <Plus size={10} /> Aggiungi
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* FIX 1: this div now actually scrolls because parent is h-screen overflow-hidden */}
        <div className="flex-1 overflow-y-auto p-6" id="task-scroll-area">
          {/* Fornitore filter — shown in ALL modes */}
          {filterFornitore ? (
            /* ========== FORNITORE CROSS-ZONA VIEW ========== */
            <>
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-semibold text-[#1d1d1f]">
                    {fornitoreName}
                  </h1>
                  <div className="flex items-center gap-1.5">
                    <Filter size={12} className="text-[#86868b]" />
                    <select
                      value={filterFornitore}
                      onChange={(e) => setFilterFornitore(e.target.value)}
                      className="text-xs text-[#86868b] bg-transparent border border-[#e5e5e7] rounded-lg px-2 py-1 outline-none hover:text-[#1d1d1f] focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Tutti i fornitori</option>
                      {fornitori.map((f) => (
                        <option key={f.id} value={f.id}>{f.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1 max-w-xs h-1.5 bg-[#e5e5e7] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#34C759] transition-all" style={{ width: `${fornitoreAllTasks.length > 0 ? Math.round((fornitoreAllTasks.filter((t) => t.stato_calcolato === "completata").length / fornitoreAllTasks.length) * 100) : 0}%` }} />
                  </div>
                  <span className="text-xs text-[#86868b]">
                    {fornitoreAllTasks.filter((t) => t.stato_calcolato === "completata").length}/{fornitoreAllTasks.length} completate
                  </span>
                </div>
              </div>

              {/* Tasks grouped by zona > lavorazione */}
              {zone.map((z) => {
                const zoneLav = lavorazioni.filter((l) => l.zona_id === z.id);
                const zoneFornitTasks = fornitoreAllTasks.filter((t) => zoneLav.some((l) => l.id === t.lavorazione_id));
                if (zoneFornitTasks.length === 0) return null;
                return (
                  <div key={z.id} className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: z.colore }} />
                      <span className="text-sm font-semibold text-[#1d1d1f]">{z.nome}</span>
                      <span className="text-xs text-[#86868b]">({zoneFornitTasks.length})</span>
                    </div>
                    {zoneLav.map((lav) => {
                      const lavFornitTasks = fornitoreAllTasks.filter((t) => t.lavorazione_id === lav.id);
                      if (lavFornitTasks.length === 0) return null;
                      return (
                        <div key={lav.id} className="mb-3">
                          <button
                            onClick={() => { setFilterFornitore(""); selectLav(lav.id); }}
                            className="text-xs text-[#86868b] font-medium mb-1 ml-5 hover:text-[#1d1d1f] transition-colors"
                          >
                            {lav.nome}
                          </button>
                          <div className="space-y-1.5">{lavFornitTasks.map((task) => renderTaskCard(task))}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {fornitoreAllTasks.length === 0 && (
                <div className="flex items-center justify-center h-32 text-[#86868b] text-sm">Nessuna task per questo fornitore</div>
              )}
            </>
          ) : selectedLavData ? (
            /* ========== SINGLE LAVORAZIONE VIEW (default) ========== */
            <>
              <div className="mb-6">
                <div className="flex items-center gap-2 text-xs text-[#86868b] mb-1">
                  {selectedZona && (
                    <>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedZona.colore }} />
                      <Select value={selectedLavData.zona_id} onValueChange={handleMoveZona}>
                        <SelectTrigger className="h-auto border-0 bg-transparent p-0 text-xs text-[#86868b] hover:text-[#1d1d1f] gap-1 w-auto shadow-none focus:ring-0 ring-0 ring-offset-0 focus:ring-offset-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {zone.map((z) => (
                            <SelectItem key={z.id} value={z.id}>
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: z.colore }} />
                                {z.nome}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span>/</span>
                    </>
                  )}
                  <span className="text-[#1d1d1f] font-medium">{selectedLavData.nome}</span>
                </div>
                {editingLavName === selectedLavData.id ? (
                  <input
                    ref={editInputRef}
                    defaultValue={selectedLavData.nome}
                    onBlur={(e) => { const val = e.target.value; setTimeout(() => saveLavName(selectedLavData.id, val), 150); }}
                    onKeyDown={(e) => { if (e.key === "Enter") saveLavName(selectedLavData.id, (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingLavName(null); }}
                    className="text-xl font-semibold text-[#1d1d1f] border border-[#e5e5e7] rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-ring w-full"
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                ) : (
                  <h1 className="text-xl font-semibold text-[#1d1d1f] cursor-pointer hover:text-blue-600" onDoubleClick={() => setEditingLavName(selectedLavData.id)} title="Doppio click per rinominare">
                    {selectedLavData.nome}
                  </h1>
                )}
                <div className="flex items-center gap-3 mt-2">
                  {selectedLavTasks.length > 0 && (
                    <>
                      <div className="flex-1 max-w-xs h-1.5 bg-[#e5e5e7] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#34C759] transition-all" style={{ width: `${Math.round((selectedLavTasks.filter((t) => t.stato_calcolato === "completata").length / selectedLavTasks.length) * 100)}%` }} />
                      </div>
                      <span className="text-xs text-[#86868b]">
                        {selectedLavTasks.filter((t) => t.stato_calcolato === "completata").length}/{selectedLavTasks.length} completate
                      </span>
                    </>
                  )}
                  <div className="ml-auto flex items-center gap-1.5">
                    <Filter size={12} className="text-[#86868b]" />
                    <select
                      value={filterFornitore}
                      onChange={(e) => setFilterFornitore(e.target.value)}
                      className="text-xs text-[#86868b] bg-transparent border border-[#e5e5e7] rounded-lg px-2 py-1 outline-none hover:text-[#1d1d1f] focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Tutti i fornitori</option>
                      {fornitori.map((f) => (
                        <option key={f.id} value={f.id}>{f.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* + Aggiungi task — TOP */}
              {renderAddTask("top")}

              <div className="space-y-1.5">
                {selectedLavTasks.map((task) => {
                  const taskMat = materialiByTask[task.id] || [];
                  const isTaskExpanded = expandedTasks.has(task.id);

                  // Summary calculations for collapsed view
                  const matMissing = taskMat.filter((m) => {
                    const s = matStato(m);
                    return s.label === "Da acquistare" || s.label === "Da noleggiare";
                  }).length;
                  const taskAllOps = taskMat.flatMap((m) => m.operazioni || []);
                  const opsToOrganize = taskAllOps.filter((op) => !op.organizzato).length;

                  return (
                    <div key={task.id} className="group/card relative bg-white rounded-[12px] border border-[#e5e5e7] hover:shadow-md transition-shadow">
                      {/* LEVEL 1 — Collapsed row */}
                      <div className="flex items-center gap-2 p-3 pr-10">
                        {/* Expand arrow */}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleTaskExpand(task.id); }}
                          className="p-0.5 rounded hover:bg-[#f5f5f7] text-[#86868b] flex-shrink-0 transition-colors"
                        >
                          {isTaskExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>

                        {/* Title (click opens detail sheet) */}
                        <button
                          onClick={() => setSelectedTask(task)}
                          className="flex-1 min-w-0 text-left"
                        >
                          <h3 className="text-[13px] font-semibold text-[#1d1d1f] truncate leading-tight">{task.titolo}</h3>
                        </button>

                        {/* Fornitore name on the right */}
                        {task.fornitore_nome && (
                          <span className="text-[11px] text-[#86868b] flex-shrink-0 max-w-[120px] truncate">
                            {task.fornitore_nome}{(task as unknown as Record<string, unknown>).fornitore_supporto_nome ? ` + ${(task as unknown as Record<string, unknown>).fornitore_supporto_nome}` : ""}
                          </span>
                        )}
                      </div>

                      {/* Chips + summary line */}
                      <div className="px-3 pb-3 -mt-1 ml-[30px]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {task.tipologia && (
                            <Badge
                              style={tipColorMap[task.tipologia] ? { backgroundColor: tipColorMap[task.tipologia] + "20", color: tipColorMap[task.tipologia] } : undefined}
                              className={`text-[10px] px-2 py-0 h-5 ${!tipColorMap[task.tipologia] ? (TIPOLOGIA_COLORS[task.tipologia] ?? "bg-gray-100 text-gray-600") : ""}`}
                            >{task.tipologia.replace(/_/g, " ")}</Badge>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); if (["da_fare","in_corso","completata"].includes(task.stato)) { _savedLavId = selectedLav; cycleTaskStato(task.id, task.stato); } }}
                            className={`px-2 py-0 h-5 rounded-full text-[10px] font-medium transition-colors cursor-pointer hover:opacity-80 inline-flex items-center ${STATO_COLORS[task.stato_calcolato] ?? "bg-gray-100 text-gray-600"}`}
                            title="Click per cambiare stato"
                          >
                            {STATO_LABELS[task.stato_calcolato] ?? task.stato_calcolato}
                          </button>
                        </div>

                        {/* Summary line */}
                        {(taskMat.length > 0 || opsToOrganize > 0) && (
                          <div className="flex flex-wrap items-center gap-3 mt-1.5">
                            {taskMat.length > 0 && (
                              <span className={`text-[11px] ${matMissing > 0 ? "text-[#FF3B30] font-medium" : "text-[#86868b]"}`}>
                                {taskMat.length} material{taskMat.length === 1 ? "e" : "i"}{matMissing > 0 ? ` (${matMissing} mancant${matMissing === 1 ? "e" : "i"})` : ""}
                              </span>
                            )}
                            {opsToOrganize > 0 && (
                              <span className="text-[11px] text-[#FF9F0A] font-medium">
                                {opsToOrganize} op. da organizzare
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* LEVEL 2 — Dependencies */}
                      {isTaskExpanded && (depsOfTask[task.id]?.length > 0 || blocksTask[task.id]?.length > 0) && (
                        <div className="mx-3 ml-[30px] pt-2 border-t border-[#e5e5e7]/60 space-y-0.5">
                          {depsOfTask[task.id]?.length > 0 && (
                            <p className="text-[11px] text-[#86868b]">
                              <span className="font-medium">Dipende da:</span>{" "}
                              {depsOfTask[task.id].map(id => taskTitleMap[id] || id).join(", ")}
                            </p>
                          )}
                          {blocksTask[task.id]?.length > 0 && (
                            <p className="text-[11px] text-[#86868b]">
                              <span className="font-medium">Blocca:</span>{" "}
                              {blocksTask[task.id].map(id => taskTitleMap[id] || id).join(", ")}
                            </p>
                          )}
                        </div>
                      )}

                      {/* LEVEL 2 — Expanded materials list (read-only, no editable fields) */}
                      {isTaskExpanded && taskMat.length > 0 && (
                        <div className="mx-3 mb-3 ml-[30px] pt-2 border-t border-[#e5e5e7]/60 space-y-1.5">
                          {taskMat.map((m) => {
                            const stato = matStato(m);
                            const tot = m.quantita ?? 0;
                            return (
                              <div key={m.id} className="text-[11px]">
                                <div className="flex items-center gap-2">
                                  <Package size={11} className="text-[#86868b] flex-shrink-0" />
                                  <span className="text-[#1d1d1f] truncate">
                                    {m.nome}
                                    {tot > 0 && <span className="text-[#86868b] ml-1">{tot}{m.unita ? ` ${m.unita}` : ""}</span>}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${stato.cls}`}>{stato.label}</span>
                                </div>
                                {attrezziConflicts[m.id] && (
                                  <p className="text-[10px] text-orange-600 mt-0.5 ml-5 font-medium">Conflitto: {attrezziConflicts[m.id]}</p>
                                )}
                                {/* Operazioni sotto il materiale */}
                                {(m.operazioni || []).length > 0 && (
                                  <div className="ml-5 mt-0.5 space-y-0.5">
                                    {(m.operazioni || []).map((op) => (
                                      <div key={op.id} className="flex items-center gap-1.5 text-[10px]">
                                        <span className="text-[#d2d2d7]">└</span>
                                        <span className="text-[#86868b]">{op.tipologia ? op.tipologia.replace(/_/g, " ") : op.titolo}</span>
                                        {op.fornitore && <span className="text-[#1d1d1f]"> — </span>}
                                        {op.fornitore && <span className="text-[#1d1d1f] font-medium">{op.fornitore.nome}</span>}
                                        <AppTooltip content={op.organizzato ? "Organizzato" : "Non organizzato"}>
                                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${op.organizzato ? "bg-[#34C759]" : "bg-[#d2d2d7]"}`} />
                                        </AppTooltip>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {isTaskExpanded && taskMat.length === 0 && (
                        <div className="mx-3 mb-3 ml-[30px] pt-2 border-t border-[#e5e5e7]/60">
                          <p className="text-[11px] text-[#86868b]">Nessun materiale</p>
                        </div>
                      )}

                      {/* Delete button — visible on hover */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteTask(task); }}
                        className="absolute top-3 right-3 p-1 rounded text-[#d2d2d7] opacity-0 group-hover/card:opacity-100 hover:!text-red-500 hover:bg-red-50 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* + Aggiungi task — BOTTOM */}
              {renderAddTask("bottom")}
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-[#86868b] text-sm">Seleziona una lavorazione dalla sidebar</div>
          )}
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        {mobileView === "zone" && (
          <div>
            <h1 className="text-xl font-semibold text-[#1d1d1f] mb-4">Lavorazioni</h1>
            <div className="space-y-2">
              {zone.map((z) => {
                const zt = tasks.filter((t) => lavorazioni.filter((l) => l.zona_id === z.id).some((l) => l.id === t.lavorazione_id));
                const c = zt.filter((t) => t.stato_calcolato === "completata").length;
                const p = zt.length > 0 ? Math.round((c / zt.length) * 100) : 0;
                return (
                  <button key={z.id} onClick={() => { setMobileZona(z.id); setMobileView("lavorazioni"); }} className="w-full bg-white rounded-[12px] border border-[#e5e5e7] p-4 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: z.colore }} />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-[#1d1d1f]">{z.nome}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-[#e5e5e7] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: z.colore }} /></div>
                          <span className="text-[10px] text-[#86868b]">{c}/{zt.length}</span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-[#86868b]" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {mobileView === "lavorazioni" && mobileZona && (
          <div>
            <button onClick={() => setMobileView("zone")} className="text-xs text-[#86868b] mb-3 hover:text-[#1d1d1f]">← Zone</button>
            <h1 className="text-xl font-semibold text-[#1d1d1f] mb-4">{zone.find((z) => z.id === mobileZona)?.nome}</h1>
            <div className="space-y-2">
              {lavorazioni.filter((l) => l.zona_id === mobileZona).map((lav) => {
                const lt = tasks.filter((t) => t.lavorazione_id === lav.id);
                return (<div key={lav.id} className="relative bg-white rounded-[12px] border border-[#e5e5e7] p-4 pr-10 flex items-center justify-between cursor-pointer" onClick={() => { selectLav(lav.id); setMobileView("tasks"); }}>
                  <span className="text-sm font-medium text-[#1d1d1f]">{lav.nome}</span><span className="text-xs text-[#86868b]">{lt.length} task</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteLav(lav); }} className="absolute top-3.5 right-3 p-1 rounded text-[#d2d2d7] hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                </div>);
              })}
            </div>
          </div>
        )}
        {mobileView === "tasks" && selectedLav && (
          <div>
            <button onClick={() => setMobileView("lavorazioni")} className="text-xs text-[#86868b] mb-3 hover:text-[#1d1d1f]">← {zone.find((z) => z.id === mobileZona)?.nome}</button>
            <h1 className="text-xl font-semibold text-[#1d1d1f] mb-4">{selectedLavData?.nome}</h1>
            <div className="space-y-2">
              {selectedLavTasks.map((task) => (
                <div key={task.id} className="relative bg-white rounded-[12px] border border-[#e5e5e7] p-4 pr-10 cursor-pointer" onClick={() => setSelectedTask(task)}>
                  <h3 className="text-sm font-medium text-[#1d1d1f]">{task.titolo}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge className={STATO_COLORS[task.stato_calcolato] ?? "bg-gray-100 text-gray-600"}>{STATO_LABELS[task.stato_calcolato] ?? task.stato_calcolato}</Badge>
                    {task.fornitore_nome && <span className="text-xs text-[#86868b]">{task.fornitore_nome}</span>}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task); }} className="absolute top-3.5 right-3 p-1 rounded text-[#d2d2d7] hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <TaskDetailSheet task={selectedTask} fornitori={fornitori} tipologieDb={tipologie} zone={zone} lavorazioni={lavorazioni} luoghi={luoghi} open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onSave={async (data) => { if (selectedTask) { _savedLavId = selectedLav; await updateTask(selectedTask.id, data); } }}
      />
    </div>
  );
}
