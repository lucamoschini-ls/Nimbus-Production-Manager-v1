"use client";

import { useState, useMemo } from "react";
import { Truck, X, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { DrawerOperazione } from "@/app/materiali-nuovo/components/drawer-operazione";
import { creaOperazione } from "@/app/materiali-nuovo/actions";

export interface Operazione {
  id: string;
  titolo: string;
  tipologia: string | null;
  stato: string;
  organizzato: boolean;
  fornitore_id: string | null;
  luogo_id: string | null;
  materiale_id: string | null;
  data_inizio: string | null;
  data_fine: string | null;
  durata_ore: number | null;
  numero_persone: number | null;
  note: string | null;
  fornitore: { id: string; nome: string } | { id: string; nome: string }[] | null;
  luogo: { id: string; nome: string } | { id: string; nome: string }[] | null;
  materiale_ref: { nome: string; catalogo_id: string | null } | { nome: string; catalogo_id: string | null }[] | null;
}

interface Luogo {
  id: string;
  nome: string;
}

interface Props {
  ops: Operazione[];
  luoghi: Luogo[];
}

const STATO_BORDER: Record<string, string> = {
  da_fare: "#C7C7CC",
  organizzato: "#007AFF",
  in_corso: "#FFD60A",
  completata: "#34C759",
  bloccata: "#FF3B30",
};

const STATO_FILTRI = ["tutti", "da_fare", "organizzato", "in_corso", "completata"] as const;
const STATO_LABELS: Record<string, string> = {
  tutti: "Tutti",
  da_fare: "Da organizzare",
  organizzato: "Organizzati",
  in_corso: "In corso",
  completata: "Completati",
};

const TIPOLOGIA_LABELS: Record<string, string> = {
  trasporto: "Trasporto",
  acquisto: "Acquisto",
  acquisto_e_trasporto: "Acq. + Trasp.",
  noleggio: "Noleggio",
  scarico: "Scarico",
  installazione: "Installazione",
  pulizia: "Pulizia",
  altro: "Altro",
};

// Helpers to normalize PostgREST join results
function normalizeOne<T>(val: T | T[] | null): T | null {
  if (val == null) return null;
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
}

function getToday(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(dateStr: string, today: string): string {
  const [, m, d] = dateStr.split("-");
  const label = `${d}/${m}`;
  if (dateStr === today) return `OGGI ${label}`;
  if (dateStr === addDays(today, 1)) return `Domani ${label}`;
  return label;
}

export function TrasportiClient({ ops, luoghi }: Props) {
  const [filterStato, setFilterStato] = useState<string>("tutti");
  const [filterTipologia, setFilterTipologia] = useState<string>("tutti");
  const [filterFornitore, setFilterFornitore] = useState<string>("tutti");
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
  const [expandedSenzaData, setExpandedSenzaData] = useState<Set<string>>(new Set());
  const [newOpDialog, setNewOpDialog] = useState<{ date: string; luogoId: string; luogoNome: string } | null>(null);
  const [newOpTitle, setNewOpTitle] = useState("");

  const today = getToday();
  const nextWeekStr = addDays(today, 7);

  // Distinct tipologie and fornitori for filter dropdowns
  const tipologieInData = useMemo(() => {
    const set = new Set<string>();
    ops.forEach((op) => { if (op.tipologia) set.add(op.tipologia); });
    return Array.from(set).sort();
  }, [ops]);

  const fornitoriInData = useMemo(() => {
    const map = new Map<string, string>();
    ops.forEach((op) => {
      const f = normalizeOne(op.fornitore);
      if (f) map.set(f.id, f.nome);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [ops]);

  // Filtered ops
  const filtered = useMemo(() => ops.filter((op) => {
    if (filterStato === "da_fare" && op.organizzato) return false;
    if (filterStato === "da_fare" && op.stato === "completata") return false;
    if (filterStato === "organizzato" && !op.organizzato) return false;
    if (filterStato === "in_corso" && op.stato !== "in_corso") return false;
    if (filterStato === "completata" && op.stato !== "completata") return false;
    if (filterTipologia !== "tutti" && op.tipologia !== filterTipologia) return false;
    if (filterFornitore !== "tutti") {
      const f = normalizeOne(op.fornitore);
      if (f?.id !== filterFornitore) return false;
    }
    return true;
  }), [ops, filterStato, filterTipologia, filterFornitore]);

  // Narrative header data
  const narrativeHeader = useMemo(() => {
    const oggiOps = ops.filter((o) => o.data_inizio === today);
    const prossimi7 = ops.filter(
      (o) => o.data_inizio && o.data_inizio >= today && o.data_inizio <= nextWeekStr
    );
    const daOrganizzare = ops.filter((o) => !o.organizzato && o.stato !== "completata").length;

    const parts: string[] = [];
    if (prossimi7.length > 0) {
      parts.push(`Prossimi 7 giorni: ${prossimi7.length} operazioni schedulat${prossimi7.length === 1 ? "a" : "e"}.`);
    }
    if (oggiOps.length > 0) {
      // Group today's ops by luogo
      const luoghiOggi = new Set<string>();
      oggiOps.forEach((o) => {
        const l = normalizeOne(o.luogo);
        if (l) luoghiOggi.add(l.nome);
      });
      const luoghiStr = Array.from(luoghiOggi).join(", ");
      parts.push(`Oggi ${oggiOps.length} operazion${oggiOps.length === 1 ? "e" : "i"}${luoghiStr ? ` (${luoghiStr})` : ""}.`);
    }
    if (daOrganizzare > 0) {
      parts.push(`${daOrganizzare} da organizzare.`);
    }
    if (parts.length === 0) {
      parts.push("Nessuna operazione schedulata nei prossimi 7 giorni.");
    }
    return parts.join(" ");
  }, [ops, today, nextWeekStr]);

  // Build matrix data: dates (sorted) and "senza data"
  const { dateRows, senzaDataByLuogo } = useMemo(() => {
    const dateSet = new Set<string>();
    const senzaData: Record<string, Operazione[]> = {};

    // Initialize senza data buckets for all luoghi + "no_luogo"
    luoghi.forEach((l) => { senzaData[l.id] = []; });
    senzaData["no_luogo"] = [];

    // Always include today
    dateSet.add(today);

    filtered.forEach((op) => {
      const luogoId = normalizeOne(op.luogo)?.id ?? "no_luogo";
      if (op.data_inizio) {
        dateSet.add(op.data_inizio);
      } else {
        if (!senzaData[luogoId]) senzaData[luogoId] = [];
        senzaData[luogoId].push(op);
      }
    });

    const sortedDates = Array.from(dateSet).sort();

    // Build rows: for each date, for each luogo, find ops
    const rows = sortedDates.map((date) => {
      const cells: Record<string, Operazione[]> = {};
      luoghi.forEach((l) => { cells[l.id] = []; });
      cells["no_luogo"] = [];

      filtered.forEach((op) => {
        if (op.data_inizio === date) {
          const luogoId = normalizeOne(op.luogo)?.id ?? "no_luogo";
          if (!cells[luogoId]) cells[luogoId] = [];
          cells[luogoId].push(op);
        }
      });

      return { date, cells };
    });

    return { dateRows: rows, senzaDataByLuogo: senzaData };
  }, [filtered, luoghi, today]);

  // Check if "no_luogo" column has any data
  const hasNoLuogoColumn = useMemo(() => {
    const hasInDates = dateRows.some((row) => (row.cells["no_luogo"]?.length ?? 0) > 0);
    const hasInSenza = (senzaDataByLuogo["no_luogo"]?.length ?? 0) > 0;
    return hasInDates || hasInSenza;
  }, [dateRows, senzaDataByLuogo]);

  const columns = useMemo(() => {
    const cols = [...luoghi];
    if (hasNoLuogoColumn) {
      cols.push({ id: "no_luogo", nome: "Senza luogo" });
    }
    return cols;
  }, [luoghi, hasNoLuogoColumn]);

  const totalSenzaData = useMemo(() => {
    return Object.values(senzaDataByLuogo).reduce((sum, arr) => sum + arr.length, 0);
  }, [senzaDataByLuogo]);

  const toggleSenzaData = (luogoId: string) => {
    setExpandedSenzaData((prev) => {
      const next = new Set(prev);
      if (next.has(luogoId)) next.delete(luogoId);
      else next.add(luogoId);
      return next;
    });
  };

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <h1 className="text-2xl font-semibold text-[#1d1d1f] mb-2">Operazioni</h1>

        {/* Narrative header */}
        <p className="text-[13px] text-[#86868b] mb-5" suppressHydrationWarning>
          {narrativeHeader}
        </p>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          {/* Stato segmented control */}
          <div className="flex bg-[#f5f5f7] rounded-lg p-0.5">
            {STATO_FILTRI.map((s) => (
              <button
                key={s}
                onClick={() => setFilterStato(s)}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors ${
                  filterStato === s
                    ? "bg-white text-[#1d1d1f] shadow-sm"
                    : "text-[#86868b] hover:text-[#1d1d1f]"
                }`}
              >
                {STATO_LABELS[s]}
              </button>
            ))}
          </div>

          {/* Tipologia select */}
          <select
            value={filterTipologia}
            onChange={(e) => setFilterTipologia(e.target.value)}
            className="text-[11px] border border-[#e5e5e7] rounded-md px-2 py-1.5 bg-white text-[#1d1d1f]"
          >
            <option value="tutti">Tutte le tipologie</option>
            {tipologieInData.map((t) => (
              <option key={t} value={t}>{TIPOLOGIA_LABELS[t] || t}</option>
            ))}
          </select>

          {/* Fornitore select */}
          <select
            value={filterFornitore}
            onChange={(e) => setFilterFornitore(e.target.value)}
            className="text-[11px] border border-[#e5e5e7] rounded-md px-2 py-1.5 bg-white text-[#1d1d1f]"
          >
            <option value="tutti">Tutti i fornitori</option>
            {fornitoriInData.map(([id, nome]) => (
              <option key={id} value={id}>{nome}</option>
            ))}
          </select>
        </div>

        {/* Matrix */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#86868b]">
            <Truck size={40} strokeWidth={1.2} />
            <p className="text-sm mt-3 font-medium">Nessuna operazione trovata</p>
          </div>
        ) : (
          <div className="bg-white rounded-[12px] border border-[#e5e5e7] overflow-x-auto">
            <table className="w-full border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-[#e5e5e7]">
                  <th className="text-left text-[10px] font-semibold text-[#86868b] uppercase tracking-wide px-3 py-2 w-[80px]">
                    Data
                  </th>
                  {columns.map((l) => (
                    <th
                      key={l.id}
                      className="text-left text-[10px] font-semibold text-[#86868b] uppercase tracking-wide px-3 py-2"
                    >
                      {l.nome}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dateRows.map((row) => {
                  const isToday = row.date === today;
                  const hasAnyOps = columns.some((l) => (row.cells[l.id]?.length ?? 0) > 0);
                  if (!hasAnyOps && !isToday) return null;

                  return (
                    <tr
                      key={row.date}
                      className={`border-b border-[#f0f0f0] ${isToday ? "border-l-4 border-l-blue-400" : ""}`}
                    >
                      <td
                        className={`px-3 py-2 align-top text-[11px] whitespace-nowrap ${
                          isToday ? "font-bold text-[#1d1d1f]" : "text-[#86868b]"
                        }`}
                        suppressHydrationWarning
                      >
                        {formatDateLabel(row.date, today)}
                      </td>
                      {columns.map((l) => {
                        const cellOps = row.cells[l.id] ?? [];
                        return (
                          <td
                            key={l.id}
                            className={`px-2 py-2 align-top ${cellOps.length === 0 ? "bg-[#fafafa] cursor-pointer hover:bg-[#f0f0f0]" : ""}`}
                            onClick={cellOps.length === 0 ? () => setNewOpDialog({ date: row.date, luogoId: l.id, luogoNome: l.nome }) : undefined}
                          >
                            {cellOps.map((op) => (
                              <OpChip
                                key={op.id}
                                op={op}
                                isSelected={selectedOpId === op.id}
                                onClick={() => setSelectedOpId(selectedOpId === op.id ? null : op.id)}
                              />
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Senza data row */}
                {totalSenzaData > 0 && (
                  <tr className="border-t border-[#e5e5e7]">
                    <td className="px-3 py-2 align-top text-[11px] text-[#86868b] font-medium whitespace-nowrap">
                      Senza data
                    </td>
                    {columns.map((l) => {
                      const cellOps = senzaDataByLuogo[l.id] ?? [];
                      const isExpanded = expandedSenzaData.has(l.id);
                      if (cellOps.length === 0) {
                        return <td key={l.id} className="px-2 py-2 align-top bg-[#fafafa]" />;
                      }
                      return (
                        <td key={l.id} className="px-2 py-2 align-top">
                          <button
                            onClick={() => toggleSenzaData(l.id)}
                            className="flex items-center gap-1 text-[11px] text-[#86868b] hover:text-[#1d1d1f] font-medium mb-1"
                          >
                            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            {cellOps.length} operazion{cellOps.length === 1 ? "e" : "i"}
                          </button>
                          {isExpanded && cellOps.map((op) => (
                            <OpChip
                              key={op.id}
                              op={op}
                              isSelected={selectedOpId === op.id}
                              onClick={() => setSelectedOpId(selectedOpId === op.id ? null : op.id)}
                            />
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer */}
      {selectedOpId && (
        <div className="w-[380px] flex-shrink-0 border-l border-[#e5e5e7] bg-white flex flex-col overflow-hidden ml-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e7] bg-[#fafafa]">
            <span className="text-[11px] text-[#86868b] font-medium uppercase">Dettaglio</span>
            <button
              onClick={() => setSelectedOpId(null)}
              className="text-[#86868b] hover:text-[#1d1d1f] p-0.5 rounded hover:bg-[#f0f0f0]"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <DrawerOperazione key={selectedOpId} id={selectedOpId} />
          </div>
        </div>
      )}

      {/* New operation dialog */}
      {newOpDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setNewOpDialog(null)}>
          <div className="fixed inset-0 bg-black/20" />
          <div className="relative bg-white rounded-xl shadow-2xl border border-[#e5e5e7] w-[420px] p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">
              Nuova operazione — {newOpDialog.luogoNome} il {new Date(newOpDialog.date + "T00:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "long" })}
            </h3>
            <div className="space-y-3">
              <input value={newOpTitle} onChange={e => setNewOpTitle(e.target.value)}
                placeholder="Titolo operazione (obbligatorio)" autoFocus
                className="w-full text-[13px] border border-[#e5e5e7] rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setNewOpDialog(null); setNewOpTitle(""); }}
                className="text-[12px] text-[#86868b] px-3 py-1.5">Annulla</button>
              <button onClick={async () => {
                if (!newOpTitle.trim()) return;
                try {
                  await creaOperazione({ titolo: newOpTitle.trim(), data_inizio: newOpDialog.date, luogo_id: newOpDialog.luogoId, tipologia: "trasporto" });
                  setNewOpDialog(null); setNewOpTitle("");
                  window.location.reload();
                } catch (e) { toast.error("Errore", { description: (e as Error).message }); }
              }}
                className="text-[12px] font-medium px-4 py-1.5 rounded-lg bg-[#1d1d1f] text-white hover:bg-[#333]"
                disabled={!newOpTitle.trim()}>Crea operazione</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- OpChip sub-component ---

function OpChip({
  op,
  isSelected,
  onClick,
}: {
  op: Operazione;
  isSelected: boolean;
  onClick: () => void;
}) {
  const fornitore = normalizeOne(op.fornitore);
  const materiale = normalizeOne(op.materiale_ref);
  const borderColor = STATO_BORDER[op.stato] ?? "#C7C7CC";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded px-2 py-1 mb-1 text-[11px] transition-colors ${
        isSelected ? "bg-[#f0f4ff] ring-1 ring-blue-200" : "hover:bg-[#f5f5f7]"
      }`}
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      <div className="font-medium truncate text-[#1d1d1f]">
        {materiale?.nome || op.titolo}
      </div>
      <div className="text-[9px] text-[#86868b] truncate">
        {op.tipologia ? (TIPOLOGIA_LABELS[op.tipologia] || op.tipologia) : ""}
        {fornitore ? ` · ${fornitore.nome}` : ""}
        {!op.tipologia && !fornitore ? "—" : ""}
      </div>
    </button>
  );
}
