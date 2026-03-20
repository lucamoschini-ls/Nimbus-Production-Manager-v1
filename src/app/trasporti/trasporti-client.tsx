"use client";

import { useState } from "react";
import { Truck, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateOperazioneField, cycleFornitoreStatoFromTrasporti } from "./actions";

export interface TrasportoOp {
  id: string; titolo: string; organizzato: boolean; stato: string; tipologia: string | null;
  fornitore_id: string | null; luogo_id: string | null;
  data_inizio: string | null; data_fine: string | null; note: string | null;
  durata_ore: number | null; numero_persone: number | null; costo_ora: number | null;
  luogo: { id: string; nome: string } | null;
  fornitore: { id: string; nome: string; stato: string } | null;
  materiale: { nome: string; quantita: number | null; unita: string | null; task: { titolo: string; lavorazione: { nome: string; zona: { id: string; nome: string; colore: string } } } };
}

const STATO_FORN_CLS: Record<string, string> = {
  da_trovare: "bg-red-100 text-red-700", contattato: "bg-amber-100 text-amber-700",
  confermato: "bg-blue-100 text-blue-700", sopralluogo_fatto: "bg-indigo-100 text-indigo-700",
  materiali_definiti: "bg-violet-100 text-violet-700", pronto: "bg-green-100 text-green-700",
};

function sv(id: string, field: string, raw: string, type: "number" | "string" | "date") {
  let value: unknown;
  if (type === "number") value = raw ? parseFloat(raw) : null;
  else if (type === "date") value = raw || null;
  else value = raw || null;
  updateOperazioneField(id, { [field]: value });
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

  const filtered = ops.filter((op) => {
    if (filterLuogo !== "tutti" && (op.luogo?.id ?? "none") !== filterLuogo) return false;
    if (filterStato === "organizzati" && !op.organizzato) return false;
    if (filterStato === "da_organizzare" && op.organizzato) return false;
    if (filterFornitore !== "tutti" && op.fornitore_id !== filterFornitore) return false;
    if (filterZona !== "tutti" && op.materiale?.task?.lavorazione?.zona?.id !== filterZona) return false;
    return true;
  });

  const daOrganizzare = ops.filter((o) => !o.organizzato).length;
  const organizzati = ops.filter((o) => o.organizzato).length;
  const grouped: Record<string, TrasportoOp[]> = {};
  filtered.forEach((op) => { const k = op.luogo?.nome ?? "Da definire"; if (!grouped[k]) grouped[k] = []; grouped[k].push(op); });
  const luoghiKeys = Object.keys(grouped).sort((a, b) => a === "Da definire" ? 1 : b === "Da definire" ? -1 : a.localeCompare(b));
  const numLuoghi = Array.from(new Set(ops.filter(o => o.luogo).map(o => o.luogo!.id))).length;
  const costoTot = ops.reduce((s, o) => s + ((o.numero_persone ?? 0) * (o.durata_ore ?? 0) * (o.costo_ora ?? 0)), 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#1d1d1f] mb-6">Trasporti e Logistica</h1>

      {/* Contatori */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-4"><p className="text-xs text-[#86868b] font-medium">Totale</p><p className="text-xl font-semibold text-[#1d1d1f] mt-1">{ops.length}</p></div>
        <div className="bg-amber-50 border border-amber-200 rounded-[12px] p-4"><p className="text-xs text-amber-700 font-medium">Da organizzare</p><p className="text-xl font-semibold text-amber-700 mt-1">{daOrganizzare}</p></div>
        <div className="bg-green-50 border border-green-200 rounded-[12px] p-4"><p className="text-xs text-green-700 font-medium">Organizzati</p><p className="text-xl font-semibold text-green-700 mt-1">{organizzati}</p></div>
        <div className="bg-blue-50 border border-blue-200 rounded-[12px] p-4"><p className="text-xs text-blue-700 font-medium">Luoghi</p><p className="text-xl font-semibold text-blue-700 mt-1">{numLuoghi}</p></div>
        {costoTot > 0 && <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-4"><p className="text-xs text-[#86868b] font-medium">Costo totale</p><p className="text-xl font-semibold text-[#1d1d1f] mt-1">{costoTot.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}</p></div>}
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={filterLuogo} onValueChange={setFilterLuogo}>
          <SelectTrigger className="w-[150px]"><Filter size={14} className="mr-1.5 text-[#86868b]" /><SelectValue placeholder="Luogo" /></SelectTrigger>
          <SelectContent><SelectItem value="tutti">Tutti i luoghi</SelectItem><SelectItem value="none">Da definire</SelectItem>{luoghi.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterStato} onValueChange={setFilterStato}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Stato" /></SelectTrigger>
          <SelectContent><SelectItem value="tutti">Tutti</SelectItem><SelectItem value="da_organizzare">Da organizzare</SelectItem><SelectItem value="organizzati">Organizzati</SelectItem></SelectContent>
        </Select>
        <Select value={filterFornitore} onValueChange={setFilterFornitore}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Fornitore" /></SelectTrigger>
          <SelectContent><SelectItem value="tutti">Tutti</SelectItem>{fornitori.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterZona} onValueChange={setFilterZona}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Zona" /></SelectTrigger>
          <SelectContent><SelectItem value="tutti">Tutte le zone</SelectItem>{zone.map((z) => <SelectItem key={z.id} value={z.id}>{z.nome}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[#86868b]">
          <Truck size={40} strokeWidth={1.2} />
          <p className="text-sm mt-3 font-medium">Nessun trasporto trovato</p>
        </div>
      ) : (
        <div className="space-y-6">
          {luoghiKeys.map((luogo) => {
            const grp = grouped[luogo];
            const orgCount = grp.filter(o => o.organizzato).length;
            return (
              <div key={luogo}>
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-2">
                  {luogo} <span className="text-[#86868b] font-normal">({grp.length} — {orgCount} organizzati, {grp.length - orgCount} da organizzare)</span>
                </h3>
                <div className="space-y-2">
                  {grp.map((op) => (
                    <div key={op.id} className="bg-white rounded-[12px] border border-[#e5e5e7] p-4">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <input defaultValue={op.titolo} onBlur={(e) => sv(op.id, "titolo", e.target.value, "string")}
                          className="text-sm font-medium text-[#1d1d1f] bg-transparent border-0 outline-none flex-1 min-w-[120px] focus:bg-white focus:border focus:border-[#e5e5e7] focus:rounded focus:px-2" />
                        {op.tipologia && <span className="text-[10px] text-[#86868b] bg-[#f5f5f7] px-1.5 py-0.5 rounded">{op.tipologia.replace(/_/g, " ")}</span>}
                        <select defaultValue={op.stato} onChange={(e) => sv(op.id, "stato", e.target.value, "string")}
                          className="text-[10px] border border-[#e5e5e7] rounded px-1 py-0.5 bg-white">
                          <option value="da_fare">Da fare</option><option value="in_corso">In corso</option><option value="completata">Completata</option>
                        </select>
                      </div>

                      {/* Contesto materiale */}
                      <p className="text-[10px] text-[#86868b] mb-3">
                        <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ backgroundColor: op.materiale?.task?.lavorazione?.zona?.colore }} />
                        {op.materiale?.task?.lavorazione?.zona?.nome} &gt; {op.materiale?.task?.titolo} &gt; {op.materiale?.nome}
                        {op.materiale?.quantita != null && <span className="ml-1">({op.materiale.quantita}{op.materiale.unita ? ` ${op.materiale.unita}` : ""})</span>}
                      </p>

                      {/* Campi editabili */}
                      <div className="flex flex-wrap items-end gap-3 mb-2">
                        <div>
                          <label className="text-[9px] text-[#86868b] block mb-0.5">Fornitore</label>
                          <select defaultValue={op.fornitore_id ?? ""} onChange={(e) => sv(op.id, "fornitore_id", e.target.value, "string")}
                            className="text-xs border border-[#e5e5e7] rounded px-2 py-1 bg-white">
                            <option value="">--</option>
                            {fornitori.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                          </select>
                        </div>
                        {op.fornitore && (
                          <button onClick={() => cycleFornitoreStatoFromTrasporti(op.fornitore!.id, op.fornitore!.stato)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer hover:opacity-80 self-end ${STATO_FORN_CLS[op.fornitore.stato] ?? "bg-gray-100"}`}
                            title="Click per avanzare stato fornitore">
                            {op.fornitore.stato.replace(/_/g, " ")}
                          </button>
                        )}
                        <div>
                          <label className="text-[9px] text-[#86868b] block mb-0.5">Luogo partenza</label>
                          <select defaultValue={op.luogo_id ?? ""} onChange={(e) => sv(op.id, "luogo_id", e.target.value, "string")}
                            className="text-xs border border-[#e5e5e7] rounded px-2 py-1 bg-white">
                            <option value="">--</option>
                            {luoghi.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
                          </select>
                        </div>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer self-end">
                          <input type="checkbox" checked={op.organizzato} onChange={(e) => updateOperazioneField(op.id, { organizzato: e.target.checked })}
                            className="rounded border-[#e5e5e7] w-4 h-4" />
                          <span className={op.organizzato ? "text-green-700 font-medium" : "text-[#86868b]"}>{op.organizzato ? "Organizzato" : "Da organizzare"}</span>
                        </label>
                      </div>
                      <div className="flex flex-wrap items-end gap-3">
                        <div><label className="text-[9px] text-[#86868b] block mb-0.5">Data prevista</label>
                          <input type="date" defaultValue={op.data_fine ?? ""} onChange={(e) => sv(op.id, "data_fine", e.target.value, "date")}
                            className="text-xs border border-[#e5e5e7] rounded px-2 py-1 bg-white" /></div>
                        <div><label className="text-[9px] text-[#86868b] block mb-0.5">Durata ore</label>
                          <input type="number" defaultValue={op.durata_ore ?? ""} onBlur={(e) => sv(op.id, "durata_ore", e.target.value, "number")}
                            className="text-xs border border-[#e5e5e7] rounded px-2 py-1 bg-white w-[60px]" /></div>
                        <div><label className="text-[9px] text-[#86868b] block mb-0.5">Persone</label>
                          <input type="number" defaultValue={op.numero_persone ?? ""} onBlur={(e) => sv(op.id, "numero_persone", e.target.value, "number")}
                            className="text-xs border border-[#e5e5e7] rounded px-2 py-1 bg-white w-[50px]" /></div>
                        <div><label className="text-[9px] text-[#86868b] block mb-0.5">Costo/ora</label>
                          <input type="number" defaultValue={op.costo_ora ?? ""} onBlur={(e) => sv(op.id, "costo_ora", e.target.value, "number")}
                            className="text-xs border border-[#e5e5e7] rounded px-2 py-1 bg-white w-[60px]" /></div>
                      </div>
                      <input defaultValue={op.note ?? ""} onBlur={(e) => sv(op.id, "note", e.target.value, "string")} placeholder="Note..."
                        className="w-full text-xs text-[#86868b] mt-2 border-0 border-b border-[#e5e5e7] bg-transparent px-0 py-1 outline-none focus:border-[#1d1d1f] placeholder:text-[#d2d2d7]" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
