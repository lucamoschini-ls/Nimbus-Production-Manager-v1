"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowUp, ArrowDown, Filter, X, Search } from "lucide-react";
import { toast } from "sonner";
import { updateTask } from "./actions";
import type { StatoFornitore } from "@/lib/types";

interface Lavorazione { id: string; zona_id: string; nome: string; ordine: number; }
interface FornitoreMin { id: string; nome: string; stato: StatoFornitore; }
interface ZonaMin { id: string; nome: string; colore: string; ordine?: number; }
interface TaskRow {
  id: string;
  titolo: string;
  stato: string;
  stato_calcolato: string;
  motivo_blocco: string | null;
  tipologia: string | null;
  fornitore_id: string | null;
  fornitore_nome: string | null;
  fornitore_supporto_id: string | null;
  fornitore_supporto_nome: string | null;
  lavorazione_id: string;
  lavorazione_nome: string;
  zona_nome: string;
  data_inizio: string | null;
  data_fine: string | null;
  durata_ore: number | null;
  numero_persone: number | null;
}

interface Props {
  tasks: TaskRow[];
  fornitori: FornitoreMin[];
  tipologie: { nome: string; colore: string }[];
  zone: ZonaMin[];
  lavorazioni: Lavorazione[];
  dipendenze: { task_id: string; dipende_da_id: string }[];
  onSelectTask: (taskId: string) => void;
}

type SortDir = "asc" | "desc";
type SortSpec = { col: ColKey; dir: SortDir };

type ColKey =
  | "titolo" | "stato" | "fornitore" | "fornitore_supporto" | "tipologia"
  | "lavorazione" | "zona" | "data_inizio" | "data_fine" | "durata_ore"
  | "numero_persone" | "stato_calcolato" | "motivo_blocco" | "dipendenze";

const COLUMNS: { key: ColKey; label: string; width: number; type: "text" | "select" | "number" | "date" | "deps"; editable: boolean }[] = [
  { key: "titolo", label: "Titolo", width: 260, type: "text", editable: false },
  { key: "stato", label: "Stato", width: 140, type: "select", editable: true },
  { key: "fornitore", label: "Fornitore", width: 160, type: "select", editable: true },
  { key: "fornitore_supporto", label: "Fornitore supporto", width: 160, type: "select", editable: true },
  { key: "tipologia", label: "Tipologia", width: 140, type: "select", editable: true },
  { key: "lavorazione", label: "Lavorazione", width: 180, type: "text", editable: false },
  { key: "zona", label: "Zona", width: 140, type: "text", editable: false },
  { key: "data_inizio", label: "Data inizio", width: 140, type: "date", editable: true },
  { key: "data_fine", label: "Data fine", width: 140, type: "date", editable: true },
  { key: "durata_ore", label: "Durata ore", width: 110, type: "number", editable: true },
  { key: "numero_persone", label: "Persone", width: 100, type: "number", editable: true },
  { key: "stato_calcolato", label: "Stato calcolato", width: 160, type: "text", editable: false },
  { key: "motivo_blocco", label: "Motivo blocco", width: 200, type: "text", editable: false },
  { key: "dipendenze", label: "Dipendenze", width: 220, type: "deps", editable: false },
];

const STATO_OPTIONS = ["da_fare", "in_corso", "completata", "bloccata"];
const STATO_LABELS: Record<string, string> = {
  da_fare: "Da fare", in_corso: "In corso", completata: "Completata", bloccata: "Bloccata",
  in_attesa_fornitore: "Attesa fornitore", in_attesa_dipendenza: "Attesa dipendenza",
  in_attesa_materiali: "Attesa materiali", in_attesa_permesso: "Attesa permesso",
};
const STATO_COLORS: Record<string, string> = {
  da_fare: "#86868b", in_corso: "#0071E3", completata: "#34C759", bloccata: "#FF3B30",
  in_attesa_fornitore: "#FF9F0A", in_attesa_dipendenza: "#FF9F0A",
  in_attesa_materiali: "#FF9F0A", in_attesa_permesso: "#FF9F0A",
};

type SelectFilter = { type: "select"; values: Set<string> };
type NumberFilter = { type: "number"; min: number | null; max: number | null };
type DateFilter = { type: "date"; from: string | null; to: string | null };
type ColFilter = SelectFilter | NumberFilter | DateFilter;

function getCellValue(t: TaskRow, k: ColKey): string | number | null {
  switch (k) {
    case "titolo": return t.titolo;
    case "stato": return t.stato;
    case "fornitore": return t.fornitore_nome ?? "—";
    case "fornitore_supporto": return t.fornitore_supporto_nome ?? "—";
    case "tipologia": return t.tipologia ?? "—";
    case "lavorazione": return t.lavorazione_nome;
    case "zona": return t.zona_nome;
    case "data_inizio": return t.data_inizio;
    case "data_fine": return t.data_fine;
    case "durata_ore": return t.durata_ore;
    case "numero_persone": return t.numero_persone;
    case "stato_calcolato": return t.stato_calcolato;
    case "motivo_blocco": return t.motivo_blocco ?? "";
    case "dipendenze": return null;
  }
}

function compareValues(a: string | number | null, b: string | number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "it", { sensitivity: "base" });
}

function fmtDate(s: string | null): string {
  if (!s) return "";
  return s.slice(5).replace("-", "/") + "/" + s.slice(2, 4);
}

export function TabellaTaskView({
  tasks, fornitori, tipologie, onSelectTask, dipendenze,
}: Props) {
  const [sortStack, setSortStack] = useState<SortSpec[]>([]);
  const [filters, setFilters] = useState<Partial<Record<ColKey, ColFilter>>>({});
  const [openFilter, setOpenFilter] = useState<ColKey | null>(null);

  const taskTitleMap = useMemo(() => {
    const m: Record<string, string> = {};
    tasks.forEach(t => { m[t.id] = t.titolo; });
    return m;
  }, [tasks]);

  const depsByTask = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const d of dipendenze) {
      if (!m[d.task_id]) m[d.task_id] = [];
      m[d.task_id].push(d.dipende_da_id);
    }
    return m;
  }, [dipendenze]);

  const filteredSorted = useMemo(() => {
    let out = tasks.slice();
    // Filter
    for (const [k, f] of Object.entries(filters) as [ColKey, ColFilter][]) {
      if (!f) continue;
      out = out.filter(t => {
        const v = getCellValue(t, k);
        if (f.type === "select") {
          const key = v === null ? "—" : String(v);
          return f.values.has(key);
        }
        if (f.type === "number") {
          const num = typeof v === "number" ? v : null;
          if (num === null) return false;
          if (f.min !== null && num < f.min) return false;
          if (f.max !== null && num > f.max) return false;
          return true;
        }
        if (f.type === "date") {
          const s = typeof v === "string" ? v : null;
          if (!s) return false;
          if (f.from && s < f.from) return false;
          if (f.to && s > f.to) return false;
          return true;
        }
        return true;
      });
    }
    // Sort
    if (sortStack.length > 0) {
      out = out.slice().sort((a, b) => {
        for (const s of sortStack) {
          const r = compareValues(getCellValue(a, s.col), getCellValue(b, s.col));
          if (r !== 0) return s.dir === "asc" ? r : -r;
        }
        return 0;
      });
    }
    return out;
  }, [tasks, filters, sortStack]);

  const activeFilterCount = Object.keys(filters).filter(k => filters[k as ColKey]).length;

  const handleSortClick = (col: ColKey, shiftKey: boolean) => {
    setSortStack(prev => {
      const existing = prev.find(s => s.col === col);
      if (!shiftKey) {
        // primary sort
        if (!existing) return [{ col, dir: "asc" }];
        if (existing.dir === "asc") return [{ col, dir: "desc" }];
        return [];
      }
      // multi-sort with shift
      if (!existing) return [...prev, { col, dir: "asc" }];
      const next = prev.filter(s => s.col !== col);
      if (existing.dir === "asc") return [...next, { col, dir: "desc" }];
      return next;
    });
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredSorted.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 36,
    overscan: 10,
  });

  const totalWidth = COLUMNS.reduce((s, c) => s + c.width, 0);

  const save = async (taskId: string, field: string, value: unknown) => {
    try {
      await updateTask(taskId, { [field]: value });
      toast.success("Salvato");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Errore";
      toast.error("Errore nel salvataggio", { description: msg });
    }
  };

  const clearAllFilters = () => {
    setFilters({});
    setOpenFilter(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#e5e5e7] bg-white">
        <div className="text-xs text-[#86868b]">
          Visualizzate <span className="font-medium text-[#1d1d1f]">{filteredSorted.length}</span> di <span className="font-medium text-[#1d1d1f]">{tasks.length}</span> task
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-[#0071E3] hover:text-[#0071E3]/80 flex items-center gap-1"
          >
            <X size={12} /> Rimuovi tutti i filtri ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Table scroll container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto relative bg-white"
        style={{ scrollbarGutter: "stable" }}
      >
        <div style={{ width: totalWidth, position: "relative" }}>
          {/* Header */}
          <div
            className="flex border-b border-[#e5e5e7] bg-[#f5f5f7] text-[11px] font-semibold text-[#1d1d1f] sticky top-0"
            style={{ zIndex: 20, width: totalWidth }}
          >
            {COLUMNS.map((c, idx) => {
              const sortSpec = sortStack.find(s => s.col === c.key);
              const hasFilter = !!filters[c.key];
              const isStickyCol = idx === 0;
              return (
                <div
                  key={c.key}
                  className={`px-2 py-2 border-r border-[#e5e5e7] flex items-center gap-1 ${isStickyCol ? "sticky left-0 bg-[#f5f5f7]" : ""}`}
                  style={{ width: c.width, minWidth: c.width, zIndex: isStickyCol ? 25 : undefined }}
                >
                  <button
                    onClick={(e) => handleSortClick(c.key, e.shiftKey)}
                    className="flex-1 flex items-center gap-1 text-left hover:text-[#0071E3] truncate"
                    title="Click per ordinare (shift+click per ordinamento multiplo)"
                  >
                    <span className="truncate">{c.label}</span>
                    {sortSpec && (sortSpec.dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                  </button>
                  {c.type !== "deps" && (
                    <button
                      onClick={() => setOpenFilter(openFilter === c.key ? null : c.key)}
                      className={`p-0.5 rounded hover:bg-white ${hasFilter ? "text-[#0071E3]" : "text-[#86868b]"}`}
                      title="Filtra"
                    >
                      <Filter size={11} />
                    </button>
                  )}
                  {openFilter === c.key && (
                    <FilterPopover
                      col={c}
                      tasks={tasks}
                      filter={filters[c.key]}
                      fornitori={fornitori}
                      tipologie={tipologie}
                      onApply={(f) => {
                        setFilters(prev => ({ ...prev, [c.key]: f }));
                        setOpenFilter(null);
                      }}
                      onClear={() => {
                        setFilters(prev => { const n = { ...prev }; delete n[c.key]; return n; });
                        setOpenFilter(null);
                      }}
                      onClose={() => setOpenFilter(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Virtualized rows */}
          <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
            {rowVirtualizer.getVirtualItems().map(vRow => {
              const task = filteredSorted[vRow.index];
              return (
                <div
                  key={task.id}
                  className="flex border-b border-[#f0f0f2] text-[12px] hover:bg-[#fafafb]"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: totalWidth,
                    height: vRow.size,
                    transform: `translateY(${vRow.start}px)`,
                  }}
                >
                  {COLUMNS.map((c, idx) => {
                    const isStickyCol = idx === 0;
                    return (
                      <div
                        key={c.key}
                        className={`px-2 py-1 border-r border-[#f0f0f2] flex items-center overflow-hidden ${isStickyCol ? "sticky left-0 bg-white" : ""}`}
                        style={{ width: c.width, minWidth: c.width, zIndex: isStickyCol ? 5 : undefined }}
                      >
                        <Cell
                          col={c}
                          task={task}
                          fornitori={fornitori}
                          tipologie={tipologie}
                          depsByTask={depsByTask}
                          taskTitleMap={taskTitleMap}
                          onSave={save}
                          onSelectTask={onSelectTask}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Cell ============

interface CellProps {
  col: typeof COLUMNS[number];
  task: TaskRow;
  fornitori: FornitoreMin[];
  tipologie: { nome: string; colore: string }[];
  depsByTask: Record<string, string[]>;
  taskTitleMap: Record<string, string>;
  onSave: (taskId: string, field: string, value: unknown) => Promise<void>;
  onSelectTask: (taskId: string) => void;
}

function Cell({ col, task, fornitori, tipologie, depsByTask, taskTitleMap, onSave, onSelectTask }: CellProps) {
  if (col.key === "titolo") {
    return (
      <button
        onClick={() => onSelectTask(task.id)}
        className="text-left text-[#1d1d1f] hover:text-[#0071E3] font-medium truncate w-full"
      >
        {task.titolo}
      </button>
    );
  }
  if (col.key === "stato") {
    const color = STATO_COLORS[task.stato] ?? "#86868b";
    return (
      <select
        value={task.stato}
        onChange={(e) => onSave(task.id, "stato", e.target.value)}
        className="w-full bg-transparent text-[11px] font-medium rounded px-1 py-0.5 outline-none hover:bg-[#f5f5f7] focus:ring-1 focus:ring-ring"
        style={{ color }}
      >
        {STATO_OPTIONS.map(s => (
          <option key={s} value={s}>{STATO_LABELS[s] ?? s}</option>
        ))}
      </select>
    );
  }
  if (col.key === "fornitore" || col.key === "fornitore_supporto") {
    const field = col.key === "fornitore" ? "fornitore_id" : "fornitore_supporto_id";
    const val = col.key === "fornitore" ? task.fornitore_id : task.fornitore_supporto_id;
    return (
      <select
        value={val ?? ""}
        onChange={(e) => onSave(task.id, field, e.target.value === "" ? null : e.target.value)}
        className="w-full bg-transparent text-[12px] rounded px-1 py-0.5 outline-none hover:bg-[#f5f5f7] focus:ring-1 focus:ring-ring text-[#1d1d1f] truncate"
      >
        <option value="">—</option>
        {fornitori.map(f => (
          <option key={f.id} value={f.id}>{f.nome}</option>
        ))}
      </select>
    );
  }
  if (col.key === "tipologia") {
    return (
      <select
        value={task.tipologia ?? ""}
        onChange={(e) => onSave(task.id, "tipologia", e.target.value === "" ? null : e.target.value)}
        className="w-full bg-transparent text-[11px] rounded px-1 py-0.5 outline-none hover:bg-[#f5f5f7] focus:ring-1 focus:ring-ring text-[#1d1d1f] truncate"
      >
        <option value="">—</option>
        {tipologie.map(t => (
          <option key={t.nome} value={t.nome}>{t.nome.replace(/_/g, " ")}</option>
        ))}
      </select>
    );
  }
  if (col.key === "data_inizio" || col.key === "data_fine") {
    const field = col.key;
    const val = col.key === "data_inizio" ? task.data_inizio : task.data_fine;
    return (
      <input
        type="date"
        defaultValue={val ?? ""}
        onBlur={(e) => {
          const newVal = e.target.value || null;
          if (newVal !== val) onSave(task.id, field, newVal);
        }}
        className="w-full bg-transparent text-[11px] rounded px-1 py-0.5 outline-none hover:bg-[#f5f5f7] focus:ring-1 focus:ring-ring text-[#1d1d1f]"
      />
    );
  }
  if (col.key === "durata_ore" || col.key === "numero_persone") {
    const field = col.key;
    const val = col.key === "durata_ore" ? task.durata_ore : task.numero_persone;
    return (
      <input
        type="number"
        step={col.key === "durata_ore" ? "0.5" : "1"}
        min="0"
        defaultValue={val ?? ""}
        onBlur={(e) => {
          const raw = e.target.value;
          const newVal = raw === "" ? null : Number(raw);
          if (newVal !== val) onSave(task.id, field, newVal);
        }}
        className="w-full bg-transparent text-[12px] rounded px-1 py-0.5 outline-none hover:bg-[#f5f5f7] focus:ring-1 focus:ring-ring text-[#1d1d1f]"
      />
    );
  }
  if (col.key === "stato_calcolato") {
    const color = STATO_COLORS[task.stato_calcolato] ?? "#86868b";
    return (
      <span
        className="text-[11px] font-medium truncate"
        style={{ color }}
      >
        {STATO_LABELS[task.stato_calcolato] ?? task.stato_calcolato.replace(/_/g, " ")}
      </span>
    );
  }
  if (col.key === "dipendenze") {
    const predIds = depsByTask[task.id] ?? [];
    if (predIds.length === 0) return <span className="text-[11px] text-[#c7c7cc]">—</span>;
    const names = predIds.map(id => taskTitleMap[id] ?? "?").join(", ");
    return <span className="text-[11px] text-[#86868b] truncate" title={names}>{names}</span>;
  }
  // Plain text
  const v = getCellValue(task, col.key);
  return <span className="text-[12px] text-[#1d1d1f] truncate">{v === null || v === "" ? <span className="text-[#c7c7cc]">—</span> : String(v)}</span>;
}

// ============ FilterPopover ============

interface FilterPopoverProps {
  col: typeof COLUMNS[number];
  tasks: TaskRow[];
  filter: ColFilter | undefined;
  fornitori: FornitoreMin[];
  tipologie: { nome: string; colore: string }[];
  onApply: (f: ColFilter) => void;
  onClear: () => void;
  onClose: () => void;
}

function FilterPopover({ col, tasks, filter, onApply, onClear, onClose }: FilterPopoverProps) {
  const popRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Distinct values for select-type columns
  const distinctValues = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => {
      const v = getCellValue(t, col.key);
      set.add(v === null ? "—" : String(v));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "it"));
  }, [tasks, col.key]);

  const isSelectLike = col.type === "select" || col.type === "text";
  const isNumber = col.type === "number";
  const isDate = col.type === "date";

  // State for select/text
  const initialSelected = filter?.type === "select" ? filter.values : new Set(distinctValues);
  const [selected, setSelected] = useState<Set<string>>(initialSelected);
  const [search, setSearch] = useState("");

  // State for number
  const [numMin, setNumMin] = useState<string>(filter?.type === "number" && filter.min !== null ? String(filter.min) : "");
  const [numMax, setNumMax] = useState<string>(filter?.type === "number" && filter.max !== null ? String(filter.max) : "");

  // State for date
  const [dateFrom, setDateFrom] = useState<string>(filter?.type === "date" ? filter.from ?? "" : "");
  const [dateTo, setDateTo] = useState<string>(filter?.type === "date" ? filter.to ?? "" : "");

  const filteredValues = useMemo(() => {
    if (!search.trim()) return distinctValues;
    const q = search.toLowerCase();
    return distinctValues.filter(v => v.toLowerCase().includes(q));
  }, [distinctValues, search]);

  const applySelect = () => onApply({ type: "select", values: new Set(selected) });
  const applyNumber = () => onApply({
    type: "number",
    min: numMin === "" ? null : Number(numMin),
    max: numMax === "" ? null : Number(numMax),
  });
  const applyDate = () => onApply({
    type: "date",
    from: dateFrom || null,
    to: dateTo || null,
  });

  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  })();
  const twoWeekEnd = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  })();

  return (
    <div
      ref={popRef}
      className="absolute top-full left-0 mt-1 bg-white border border-[#e5e5e7] rounded-lg shadow-lg p-3 text-[12px] font-normal text-[#1d1d1f]"
      style={{ zIndex: 50, minWidth: 240 }}
    >
      {isSelectLike && (
        <div>
          <div className="flex items-center gap-1 mb-2 bg-[#f5f5f7] rounded px-2 py-1">
            <Search size={12} className="text-[#86868b]" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca..."
              className="flex-1 bg-transparent outline-none text-[11px]"
            />
          </div>
          <div className="flex items-center gap-2 mb-2 text-[11px]">
            <button onClick={() => setSelected(new Set(distinctValues))} className="text-[#0071E3]">Seleziona tutti</button>
            <span className="text-[#c7c7cc]">|</span>
            <button onClick={() => setSelected(new Set())} className="text-[#0071E3]">Deseleziona tutti</button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 mb-2">
            {filteredValues.map(v => (
              <label key={v} className="flex items-center gap-2 cursor-pointer hover:bg-[#f5f5f7] rounded px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={selected.has(v)}
                  onChange={(e) => {
                    setSelected(prev => {
                      const n = new Set(prev);
                      if (e.target.checked) n.add(v); else n.delete(v);
                      return n;
                    });
                  }}
                />
                <span className="truncate text-[11px]">{v}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#f0f0f2]">
            <button onClick={onClear} className="text-[11px] text-[#86868b]">Rimuovi filtro</button>
            <button onClick={applySelect} className="bg-[#1d1d1f] text-white text-[11px] px-3 py-1 rounded">Applica</button>
          </div>
        </div>
      )}

      {isNumber && (
        <div className="space-y-2">
          <div>
            <label className="text-[11px] text-[#86868b] block mb-1">Da</label>
            <input type="number" value={numMin} onChange={(e) => setNumMin(e.target.value)} className="w-full border border-[#e5e5e7] rounded px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-[11px] text-[#86868b] block mb-1">A</label>
            <input type="number" value={numMax} onChange={(e) => setNumMax(e.target.value)} className="w-full border border-[#e5e5e7] rounded px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#f0f0f2]">
            <button onClick={onClear} className="text-[11px] text-[#86868b]">Rimuovi filtro</button>
            <button onClick={applyNumber} className="bg-[#1d1d1f] text-white text-[11px] px-3 py-1 rounded">Applica</button>
          </div>
        </div>
      )}

      {isDate && (
        <div className="space-y-2">
          <div className="flex items-center gap-1 flex-wrap">
            <button onClick={() => { setDateFrom(today); setDateTo(today); }} className="text-[10px] px-2 py-0.5 border border-[#e5e5e7] rounded hover:bg-[#f5f5f7]">Oggi</button>
            <button onClick={() => { setDateFrom(today); setDateTo(weekEnd); }} className="text-[10px] px-2 py-0.5 border border-[#e5e5e7] rounded hover:bg-[#f5f5f7]">Questa settimana</button>
            <button onClick={() => { setDateFrom(today); setDateTo(twoWeekEnd); }} className="text-[10px] px-2 py-0.5 border border-[#e5e5e7] rounded hover:bg-[#f5f5f7]">Prossime 2 sett.</button>
          </div>
          <div>
            <label className="text-[11px] text-[#86868b] block mb-1">Da</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full border border-[#e5e5e7] rounded px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-[11px] text-[#86868b] block mb-1">A</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full border border-[#e5e5e7] rounded px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#f0f0f2]">
            <button onClick={onClear} className="text-[11px] text-[#86868b]">Rimuovi filtro</button>
            <button onClick={applyDate} className="bg-[#1d1d1f] text-white text-[11px] px-3 py-1 rounded">Applica</button>
          </div>
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _fmtDate = fmtDate;
