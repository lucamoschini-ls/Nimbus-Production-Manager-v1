"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskDetailSheet } from "./task-detail-sheet";
import { updateTask, createTask, createLavorazione, deleteLavorazione, deleteTask, updateLavorazione } from "./actions";
import { updateMaterialeQuantities, updateMaterialeDataNecessaria } from "./dep-mat-actions";
import { cycleTaskStato } from "./cycle-actions";
import type { Zona, StatoFornitore } from "@/lib/types";

// FIX 2: module-level variable survives re-mounts from loading.tsx
let _savedLavId: string | null = null;

const STATO_COLORS: Record<string, string> = {
  da_fare: "bg-gray-100 text-gray-600", in_corso: "bg-blue-100 text-blue-700",
  completata: "bg-green-100 text-green-700", bloccata: "bg-red-100 text-red-700",
  in_attesa_fornitore: "bg-amber-100 text-amber-700", in_attesa_dipendenza: "bg-amber-100 text-amber-700",
  in_attesa_materiali: "bg-amber-100 text-amber-700", in_attesa_permesso: "bg-amber-100 text-amber-700",
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
}

export function LavorazioniClient({ zone, lavorazioni, tasks, fornitori, tipologie, materiali, luoghi, initialTaskId, attrezziConflicts = {} }: Props) {
  const tipColorMap: Record<string, string> = {};
  tipologie.forEach((t) => { tipColorMap[t.nome] = t.colore; });

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
  const [addingTaskTo, setAddingTaskTo] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [addingLavTo, setAddingLavTo] = useState<string | null>(null);
  const [newLavName, setNewLavName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);
  const [editingLavName, setEditingLavName] = useState<string | null>(null);

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
  const selectedLavTasks = tasks.filter((t) => t.lavorazione_id === selectedLav);
  const selectedZona = selectedLavData ? zone.find((z) => z.id === selectedLavData.zona_id) : null;

  function getAttesaMotivo(t: TaskCompleta): string | null {
    if (t.stato_calcolato === "in_attesa_fornitore" && t.fornitore_nome)
      return `Attesa: ${t.fornitore_nome} (${t.fornitore_stato} → ${t.stato_fornitore_minimo})`;
    if (t.stato_calcolato === "in_attesa_dipendenza")
      return `Attesa: ${t.dipendenze_incomplete} dipendenz${t.dipendenze_incomplete === 1 ? "a" : "e"} non completat${t.dipendenze_incomplete === 1 ? "a" : "e"}`;
    if (t.stato_calcolato === "in_attesa_materiali") return `Attesa: ${t.materiali_mancanti} materiali non in cantiere`;
    if (t.stato_calcolato === "in_attesa_permesso") return "Attesa: permesso non ottenuto";
    return null;
  }

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

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedLav) return;
    _savedLavId = selectedLav;
    await createTask({ lavorazione_id: selectedLav, titolo: newTaskTitle.trim() });
    setNewTaskTitle("");
    setAddingTaskTo(null);
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
                                autoFocus
                                defaultValue={lav.nome}
                                onBlur={(e) => saveLavName(lav.id, e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") saveLavName(lav.id, (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingLavName(null); }}
                                className="flex-1 min-w-0 text-xs border border-[#e5e5e7] rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-ring"
                                onClick={(e) => e.stopPropagation()}
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
          {selectedLavData ? (
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
                    autoFocus
                    defaultValue={selectedLavData.nome}
                    onBlur={(e) => saveLavName(selectedLavData.id, e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveLavName(selectedLavData.id, (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingLavName(null); }}
                    className="text-xl font-semibold text-[#1d1d1f] border border-[#e5e5e7] rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-ring w-full"
                  />
                ) : (
                  <h1 className="text-xl font-semibold text-[#1d1d1f] cursor-pointer hover:text-blue-600" onDoubleClick={() => setEditingLavName(selectedLavData.id)} title="Doppio click per rinominare">
                    {selectedLavData.nome}
                  </h1>
                )}
                {selectedLavTasks.length > 0 && (
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 max-w-xs h-1.5 bg-[#e5e5e7] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${Math.round((selectedLavTasks.filter((t) => t.stato_calcolato === "completata").length / selectedLavTasks.length) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-[#86868b]">
                      {selectedLavTasks.filter((t) => t.stato_calcolato === "completata").length}/{selectedLavTasks.length} completate
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {selectedLavTasks.map((task) => {
                  const attesaMotivo = getAttesaMotivo(task);
                  const taskMat = materialiByTask[task.id] || [];
                  return (
                    <div key={task.id} className="group/card relative bg-white rounded-[12px] border border-[#e5e5e7] p-4 pr-10 hover:shadow-md transition-shadow">
                      <div className="cursor-pointer" onClick={() => setSelectedTask(task)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-[#1d1d1f]">{task.titolo}</h3>
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              {task.tipologia && (
                                <Badge
                                  style={tipColorMap[task.tipologia] ? { backgroundColor: tipColorMap[task.tipologia] + "20", color: tipColorMap[task.tipologia] } : undefined}
                                  className={!tipColorMap[task.tipologia] ? (TIPOLOGIA_COLORS[task.tipologia] ?? "bg-gray-100 text-gray-600") : ""}
                                >{task.tipologia.replace(/_/g, " ")}</Badge>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); if (["da_fare","in_corso","completata"].includes(task.stato)) { _savedLavId = selectedLav; cycleTaskStato(task.id, task.stato); } }}
                                className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer hover:opacity-80 ${STATO_COLORS[task.stato_calcolato] ?? "bg-gray-100 text-gray-600"}`}
                                title="Click per cambiare stato"
                              >
                                {STATO_LABELS[task.stato_calcolato] ?? task.stato_calcolato}
                              </button>
                            </div>
                            {attesaMotivo && <p className="text-xs text-amber-600 mt-1.5">{attesaMotivo}</p>}
                            {taskMat.length > 0 && (
                              <p className="text-[10px] text-[#86868b] mt-1.5">
                                {taskMat.length} material{taskMat.length === 1 ? "e" : "i"}
                              </p>
                            )}
                          </div>
                          {task.fornitore_nome && <span className="text-xs text-[#86868b] flex-shrink-0">{task.fornitore_nome}{(task as unknown as Record<string, unknown>).fornitore_supporto_nome ? ` + ${(task as unknown as Record<string, unknown>).fornitore_supporto_nome}` : ""}</span>}
                        </div>
                      </div>

                      {/* Inline materiali */}
                      {taskMat.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-[#e5e5e7]/60 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                          {taskMat.map((m) => {
                            const stato = matStato(m);
                            const disp = m.quantita_disponibile ?? 0;
                            const tot = m.quantita ?? 0;
                            return (
                              <div key={m.id} className="text-[11px]">
                                <div className="flex items-center gap-2">
                                  <Package size={11} className="text-[#86868b] flex-shrink-0" />
                                  <span className="text-[#1d1d1f] truncate">
                                    {m.nome}
                                    {tot > 0 && <span className="text-[#86868b] ml-1">{disp}/{tot}{m.unita ? ` ${m.unita}` : ""}</span>}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${stato.cls}`}>{stato.label}</span>
                                </div>
                                {attrezziConflicts[m.id] && (
                                  <p className="text-[10px] text-orange-600 mt-0.5 ml-5 font-medium">Conflitto: {attrezziConflicts[m.id]}</p>
                                )}
                                <div className="flex items-end gap-2 mt-1 ml-5">
                                  <div className="flex flex-col">
                                    <span className="text-[9px] text-[#86868b] leading-none mb-0.5">Disp.</span>
                                    <input type="number" value={m.quantita_disponibile ?? 0}
                                      onChange={(e) => updateMaterialeQuantities(m.id, { quantita_disponibile: parseFloat(e.target.value) || 0 })}
                                      className="text-[10px] text-[#1d1d1f] border border-[#e5e5e7] rounded px-1 py-0.5 w-[46px] bg-transparent text-center" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] text-[#86868b] leading-none mb-0.5">Ord.</span>
                                    <input type="number" value={m.quantita_ordinata ?? 0}
                                      onChange={(e) => updateMaterialeQuantities(m.id, { quantita_ordinata: parseFloat(e.target.value) || 0 })}
                                      className="text-[10px] text-[#1d1d1f] border border-[#e5e5e7] rounded px-1 py-0.5 w-[46px] bg-transparent text-center" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] text-[#86868b] leading-none mb-0.5">Entro il</span>
                                    <input type="date" value={m.data_necessaria ?? ""}
                                      onChange={(e) => updateMaterialeDataNecessaria(m.id, e.target.value || null)}
                                      className="text-[10px] text-[#86868b] border border-[#e5e5e7] rounded px-1 py-0.5 w-[110px] bg-transparent" />
                                  </div>
                                </div>
                                {/* Operazioni sotto il materiale */}
                                {(m.operazioni || []).length > 0 && (
                                  <div className="ml-5 mt-1 space-y-0.5">
                                    {(m.operazioni || []).map((op) => (
                                      <div key={op.id} className="flex items-center gap-1.5 text-[10px]">
                                        <span className="text-[#d2d2d7]">└</span>
                                        <span className="text-[#86868b]">{op.tipologia ? op.tipologia.replace(/_/g, " ") : op.titolo}</span>
                                        {op.fornitore && <span className="text-[#1d1d1f]">—</span>}
                                        {op.fornitore && <span className="text-[#1d1d1f] font-medium">{op.fornitore.nome}</span>}
                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${op.organizzato ? "bg-green-500" : "bg-[#d2d2d7]"}`} title={op.organizzato ? "Organizzato" : "Non organizzato"} />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteTask(task); }}
                        className="absolute top-3.5 right-3 p-1 rounded text-[#d2d2d7] opacity-0 group-hover/card:opacity-100 hover:!text-red-500 hover:bg-red-50 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {addingTaskTo === selectedLav ? (
                <form className="mt-3 flex gap-2" onSubmit={handleAddTask}>
                  <input autoFocus value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Titolo task"
                    className="flex-1 text-sm border border-[#e5e5e7] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                    onBlur={() => { if (!newTaskTitle.trim()) setAddingTaskTo(null); }} />
                  <Button type="submit" size="sm">Aggiungi</Button>
                </form>
              ) : (
                <button onClick={() => setAddingTaskTo(selectedLav)} className="mt-3 flex items-center gap-1.5 text-sm text-[#86868b] hover:text-[#1d1d1f] transition-colors">
                  <Plus size={16} /> Aggiungi task
                </button>
              )}
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
        onSave={async (data) => { if (selectedTask) { _savedLavId = selectedLav; await updateTask(selectedTask.id, data); setSelectedTask(null); } }}
      />
    </div>
  );
}
