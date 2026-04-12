"use client";

import { useState, useMemo } from "react";
import { Truck, Filter, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DrawerOperazione } from "@/app/materiali-nuovo/components/drawer-operazione";
import { updateOperazioneField, cycleFornitoreStatoFromTrasporti } from "./actions";

export interface TrasportoOp {
  id: string; titolo: string; organizzato: boolean; stato: string; stato_calcolato: string | null; tipologia: string | null;
  fornitore_id: string | null; luogo_id: string | null;
  data_inizio: string | null; data_fine: string | null; note: string | null;
  durata_ore: number | null; numero_persone: number | null; persone_necessarie: number | null; costo_ora: number | null;
  motivo_blocco: string | null;
  luogo: { id: string; nome: string } | null;
  fornitore: { id: string; nome: string; stato: string } | null;
  materiale: { id: string; nome: string; quantita: number | null; unita: string | null; task: { titolo: string; lavorazione: { nome: string; zona: { id: string; nome: string; colore: string } } } } | null;
}

const STATO_COLORS: Record<string, string> = {
  da_fare: "bg-gray-100 text-gray-600",
  organizzato: "bg-blue-50 text-blue-600",
  in_corso: "bg-yellow-50 text-yellow-700",
  completata: "bg-green-50 text-green-600",
  bloccata: "bg-red-50 text-red-600",
};

const STATO_FORN_CLS: Record<string, string> = {
  da_trovare: "bg-[#FF3B30]/10 text-[#FF3B30]", contattato: "bg-[#FF9F0A]/10 text-[#FF9F0A]",
  confermato: "bg-[#0071E3]/10 text-[#0071E3]", sopralluogo_fatto: "bg-[#5856D6]/10 text-[#5856D6]",
  materiali_definiti: "bg-[#AF52DE]/10 text-[#AF52DE]", pronto: "bg-[#34C759]/10 text-[#34C759]",
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

function formatShortDate(d: string | null): string {
  if (!d) return "--";
  return d.slice(5).replace("-", "/");
}

interface Props {
  ops: TrasportoOp[];
  fornitori: { id: string; nome: string }[];
  luoghi: { id: string; nome: string }[];
  zone: { id: string; nome: string }[];
}

export function TrasportiClient({ ops, fornitori, luoghi, zone }: Props) {
  const [filterLuogo, setFilterLuogo] = useState("tutti");
  const [filterStato, setFilterStato] = useState("tutti");
  const [filterFornitore, setFilterFornitore] = useState("tutti");
  const [filterZona, setFilterZona] = useState("tutti");
  const [filterTipologia, setFilterTipologia] = useState("tutti");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => ops.filter((op) => {
    if (filterLuogo !== "tutti" && (op.luogo?.id ?? "none") !== filterLuogo) return false;
    if (filterStato === "organizzati" && !op.organizzato) return false;
    if (filterStato === "da_organizzare" && op.organizzato) return false;
    if (filterStato === "completata" && op.stato !== "completata") return false;
    if (filterStato === "bloccata" && op.stato !== "bloccata") return false;
    if (filterFornitore !== "tutti" && op.fornitore_id !== filterFornitore) return false;
    if (filterZona !== "tutti" && op.materiale?.task?.lavorazione?.zona?.id !== filterZona) return false;
    if (filterTipologia !== "tutti" && op.tipologia !== filterTipologia) return false;
    return true;
  }), [ops, filterLuogo, filterStato, filterFornitore, filterZona, filterTipologia]);

  const daOrganizzare = ops.filter((o) => !o.organizzato).length;
  const organizzati = ops.filter((o) => o.organizzato).length;
  const completate = ops.filter((o) => o.stato === "completata").length;

  // Group by luogo
  const grouped = useMemo(() => {
    const map: Record<string, TrasportoOp[]> = {};
    filtered.forEach((op) => {
      const k = op.luogo?.nome ?? "Da definire";
      if (!map[k]) map[k] = [];
      map[k].push(op);
    });
    return map;
  }, [filtered]);
  const luoghiKeys = Object.keys(grouped).sort((a, b) => a === "Da definire" ? 1 : b === "Da definire" ? -1 : a.localeCompare(b));

  // Distinct tipologie in data
  const tipologieInData = useMemo(() => {
    const set = new Set<string>();
    ops.forEach((op) => { if (op.tipologia) set.add(op.tipologia); });
    return Array.from(set).sort();
  }, [ops]);

  return (
    <div className="flex h-full">
      {/* Main list */}
      <div className={`flex-1 min-w-0 overflow-y-auto ${selectedId ? "" : ""}`}>
        <h1 className="text-2xl font-semibold text-[#1d1d1f] mb-4">Operazioni</h1>

        {/* Contatori */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="bg-white rounded-[12px] border border-[#e5e5e7] px-4 py-3">
            <p className="text-[10px] text-[#86868b] font-medium">Totale</p>
            <p className="text-lg font-semibold text-[#1d1d1f] mt-0.5">{ops.length}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-[12px] px-4 py-3">
            <p className="text-[10px] text-amber-700 font-medium">Da organizzare</p>
            <p className="text-lg font-semibold text-amber-700 mt-0.5">{daOrganizzare}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-[12px] px-4 py-3">
            <p className="text-[10px] text-green-700 font-medium">Organizzati</p>
            <p className="text-lg font-semibold text-green-700 mt-0.5">{organizzati}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-[12px] px-4 py-3">
            <p className="text-[10px] text-blue-700 font-medium">Completate</p>
            <p className="text-lg font-semibold text-blue-700 mt-0.5">{completate}</p>
          </div>
        </div>

        {/* Filtri */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div>
            <span className="text-[9px] text-[#86868b] block mb-0.5">Tipologia</span>
            <Select value={filterTipologia} onValueChange={setFilterTipologia}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tipologia" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutte</SelectItem>
                {tipologieInData.map((t) => <SelectItem key={t} value={t}>{TIPOLOGIA_LABELS[t] || t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <span className="text-[9px] text-[#86868b] block mb-0.5">Luogo</span>
            <Select value={filterLuogo} onValueChange={setFilterLuogo}>
              <SelectTrigger className="w-[150px]"><Filter size={14} className="mr-1.5 text-[#86868b]" /><SelectValue placeholder="Luogo" /></SelectTrigger>
              <SelectContent><SelectItem value="tutti">Tutti i luoghi</SelectItem><SelectItem value="none">Da definire</SelectItem>{luoghi.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <span className="text-[9px] text-[#86868b] block mb-0.5">Stato</span>
            <Select value={filterStato} onValueChange={setFilterStato}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Stato" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutti</SelectItem>
                <SelectItem value="da_organizzare">Da organizzare</SelectItem>
                <SelectItem value="organizzati">Organizzati</SelectItem>
                <SelectItem value="completata">Completate</SelectItem>
                <SelectItem value="bloccata">Bloccate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <span className="text-[9px] text-[#86868b] block mb-0.5">Fornitore</span>
            <Select value={filterFornitore} onValueChange={setFilterFornitore}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Fornitore" /></SelectTrigger>
              <SelectContent><SelectItem value="tutti">Tutti</SelectItem>{fornitori.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <span className="text-[9px] text-[#86868b] block mb-0.5">Zona</span>
            <Select value={filterZona} onValueChange={setFilterZona}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Zona" /></SelectTrigger>
              <SelectContent><SelectItem value="tutti">Tutte le zone</SelectItem>{zone.map((z) => <SelectItem key={z.id} value={z.id}>{z.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#86868b]">
            <Truck size={40} strokeWidth={1.2} />
            <p className="text-sm mt-3 font-medium">Nessuna operazione trovata</p>
          </div>
        ) : (
          <div className="space-y-5">
            {luoghiKeys.map((luogo) => {
              const grp = grouped[luogo];
              const orgCount = grp.filter((o) => o.organizzato).length;
              return (
                <div key={luogo}>
                  <h3 className="text-xs font-semibold text-[#86868b] uppercase tracking-wide mb-2">
                    {luogo}{" "}
                    <span className="font-normal">
                      ({grp.length} -- {orgCount} organizzati)
                    </span>
                  </h3>
                  <div className="bg-white rounded-[12px] border border-[#e5e5e7] divide-y divide-[#f0f0f0]">
                    {grp.map((op) => {
                      const isSelected = selectedId === op.id;
                      return (
                        <button
                          key={op.id}
                          onClick={() => setSelectedId(isSelected ? null : op.id)}
                          className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors hover:bg-[#fafafa] ${isSelected ? "bg-[#f0f4ff]" : ""}`}
                        >
                          {/* Checkbox organizzato */}
                          <input
                            type="checkbox"
                            checked={op.organizzato}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateOperazioneField(op.id, { organizzato: e.target.checked })}
                            className="w-4 h-4 rounded border-[#e5e5e7] flex-shrink-0"
                          />

                          {/* Zona dot */}
                          {op.materiale?.task?.lavorazione?.zona?.colore && (
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: op.materiale.task.lavorazione.zona.colore }}
                            />
                          )}

                          {/* Main info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-medium text-[#1d1d1f] truncate">
                                {op.titolo}
                              </span>
                              {op.tipologia && (
                                <span className="text-[9px] text-[#86868b] bg-[#f5f5f7] px-1.5 py-0.5 rounded flex-shrink-0">
                                  {TIPOLOGIA_LABELS[op.tipologia] || op.tipologia}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#86868b] mt-0.5 truncate">
                              {op.materiale?.task?.lavorazione?.zona?.nome && (
                                <>{op.materiale.task.lavorazione.zona.nome} &gt; </>
                              )}
                              {op.materiale?.nome || "—"}
                              {op.materiale?.quantita != null && (
                                <span className="ml-1">({op.materiale.quantita}{op.materiale.unita ? ` ${op.materiale.unita}` : ""})</span>
                              )}
                            </div>
                          </div>

                          {/* Fornitore + stato */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {op.fornitore && (
                              <button
                                onClick={(e) => { e.stopPropagation(); cycleFornitoreStatoFromTrasporti(op.fornitore!.id, op.fornitore!.stato); }}
                                className={`px-2 py-0.5 rounded-full text-[9px] font-medium cursor-pointer hover:opacity-80 ${STATO_FORN_CLS[op.fornitore.stato] ?? "bg-gray-100"}`}
                                title={`${op.fornitore.nome} — click per avanzare`}
                              >
                                {op.fornitore.nome}
                              </button>
                            )}
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${STATO_COLORS[op.stato] || "bg-gray-100 text-gray-600"}`}>
                              {op.stato.replace(/_/g, " ")}
                            </span>
                          </div>

                          {/* Date */}
                          <div className="text-[10px] text-[#86868b] w-[50px] text-right flex-shrink-0">
                            {formatShortDate(op.data_fine)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selectedId && (
        <div className="w-[380px] flex-shrink-0 border-l border-[#e5e5e7] bg-white flex flex-col overflow-hidden ml-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e7] bg-[#fafafa]">
            <span className="text-[11px] text-[#86868b] font-medium uppercase">Dettaglio</span>
            <button
              onClick={() => setSelectedId(null)}
              className="text-[#86868b] hover:text-[#1d1d1f] p-0.5 rounded hover:bg-[#f0f0f0]"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <DrawerOperazione key={selectedId} id={selectedId} />
          </div>
        </div>
      )}
    </div>
  );
}
