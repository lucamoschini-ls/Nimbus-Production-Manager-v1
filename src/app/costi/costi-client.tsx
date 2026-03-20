"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface CostoZona { zona: string; costo_manodopera: number; costo_materiali: number; }
interface TaskConCosto {
  id: string; titolo: string; zona_nome: string; zona_colore: string; zona_ordine: number;
  lavorazione_nome: string; costo_manodopera: number | null; fornitore_nome: string | null;
  supporto_numero_persone: number | null; supporto_ore_lavoro: number | null; supporto_costo_ora: number | null;
}
export interface PresenzaCosto {
  id: string; data: string; fornitore_id: string; numero_persone: number; ore: number;
  costo_ora: number | null; costo_totale: number | null; note: string | null;
  fornitore: { nome: string };
}

interface Props { costiZona: CostoZona[]; taskConCosti: TaskConCosto[]; presenze: PresenzaCosto[]; }
function eur(n: number) { return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" }); }

export function CostiClient({ costiZona, taskConCosti, presenze }: Props) {
  const [tab, setTab] = useState<"preventivo" | "consuntivo" | "confronto">("preventivo");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (k: string) => { const n = new Set(expanded); if (n.has(k)) n.delete(k); else n.add(k); setExpanded(n); };

  // Preventivo totals
  const totPrevMano = costiZona.reduce((s, z) => s + z.costo_manodopera, 0);
  const totPrevMat = costiZona.reduce((s, z) => s + z.costo_materiali, 0);
  const totSupporto = taskConCosti.reduce((s, t) => {
    const sc = (t.supporto_numero_persone ?? 0) * (t.supporto_ore_lavoro ?? 0) * (t.supporto_costo_ora ?? 0);
    return s + sc;
  }, 0);
  const totPrev = totPrevMano + totPrevMat + totSupporto;

  // Consuntivo
  const totCons = presenze.reduce((s, p) => s + (p.costo_totale ?? 0), 0);
  const totConsOre = presenze.reduce((s, p) => s + p.ore * p.numero_persone, 0);

  // By fornitore for confronto
  const prevByForn: Record<string, number> = {};
  taskConCosti.forEach(t => { if (t.fornitore_nome) prevByForn[t.fornitore_nome] = (prevByForn[t.fornitore_nome] ?? 0) + (t.costo_manodopera ?? 0); });
  const consByForn: Record<string, { ore: number; costo: number }> = {};
  presenze.forEach(p => { if (!consByForn[p.fornitore.nome]) consByForn[p.fornitore.nome] = { ore: 0, costo: 0 }; consByForn[p.fornitore.nome].ore += p.ore * p.numero_persone; consByForn[p.fornitore.nome].costo += p.costo_totale ?? 0; });
  const allFornNomi = Array.from(new Set([...Object.keys(prevByForn), ...Object.keys(consByForn)])).sort();

  // Consuntivo by date
  const consByDate: Record<string, PresenzaCosto[]> = {};
  presenze.forEach(p => { if (!consByDate[p.data]) consByDate[p.data] = []; consByDate[p.data].push(p); });
  const dates = Object.keys(consByDate).sort().reverse();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#1d1d1f] mb-4">Costi</h1>

      <div className="flex gap-1 mb-6 bg-[#f5f5f7] rounded-lg p-1 w-fit">
        {(["preventivo", "consuntivo", "confronto"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"}`}>{t}</button>
        ))}
      </div>

      {/* ===== PREVENTIVO ===== */}
      {tab === "preventivo" && (
        <div>
          <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-6 mb-6">
            <p className="text-xs text-[#86868b] font-medium">Totale preventivo</p>
            <p className="text-4xl font-bold text-[#1d1d1f] mt-1">{eur(totPrev)}</p>
            <div className="flex gap-6 mt-3 text-sm text-[#86868b]">
              <span>Manodopera: <span className="text-[#1d1d1f] font-medium">{eur(totPrevMano)}</span></span>
              <span>Materiali: <span className="text-[#1d1d1f] font-medium">{eur(totPrevMat)}</span></span>
              {totSupporto > 0 && <span>Supporto: <span className="text-[#1d1d1f] font-medium">{eur(totSupporto)}</span></span>}
            </div>
          </div>
          <div className="bg-white rounded-[12px] border border-[#e5e5e7] overflow-hidden">
            <div className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-[#e5e5e7] bg-[#f5f5f7]">
              <span className="text-xs font-semibold text-[#1d1d1f]">Zona</span><span className="text-xs font-semibold text-[#1d1d1f] text-right">Manodopera</span>
              <span className="text-xs font-semibold text-[#1d1d1f] text-right">Materiali</span><span className="text-xs font-semibold text-[#1d1d1f] text-right">Totale</span>
            </div>
            {costiZona.map(z => {
              const tot = z.costo_manodopera + z.costo_materiali;
              const zt = taskConCosti.filter(t => t.zona_nome === z.zona);
              return (
                <div key={z.zona}>
                  <button onClick={() => toggle(z.zona)} className="w-full grid grid-cols-4 gap-4 px-4 py-3 border-b border-[#e5e5e7] hover:bg-[#f5f5f7]/50 text-left">
                    <span className="text-sm text-[#1d1d1f] font-medium flex items-center gap-2">{expanded.has(z.zona) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}{z.zona}</span>
                    <span className="text-sm text-right">{eur(z.costo_manodopera)}</span><span className="text-sm text-right">{eur(z.costo_materiali)}</span><span className="text-sm font-medium text-right">{eur(tot)}</span>
                  </button>
                  {expanded.has(z.zona) && zt.map(t => (
                    <div key={t.id} className="grid grid-cols-4 gap-4 px-4 py-2 border-b border-[#e5e5e7]/50 pl-10 text-xs text-[#86868b]">
                      <span className="truncate">{t.titolo}</span><span className="text-right">{t.costo_manodopera ? eur(t.costo_manodopera) : "-"}</span><span className="text-right">-</span><span className="text-right">{t.costo_manodopera ? eur(t.costo_manodopera) : "-"}</span>
                    </div>
                  ))}
                </div>
              );
            })}
            <div className="grid grid-cols-4 gap-4 px-4 py-3 bg-[#f5f5f7]">
              <span className="text-sm font-bold">TOTALE</span><span className="text-sm font-bold text-right">{eur(totPrevMano)}</span><span className="text-sm font-bold text-right">{eur(totPrevMat)}</span><span className="text-sm font-bold text-right">{eur(totPrev)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ===== CONSUNTIVO ===== */}
      {tab === "consuntivo" && (
        <div>
          <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-6 mb-6">
            <p className="text-xs text-[#86868b] font-medium">Totale consuntivo</p>
            <p className="text-4xl font-bold text-[#1d1d1f] mt-1">{eur(totCons)}</p>
            <p className="text-sm text-[#86868b] mt-1">{totConsOre}h totali su {dates.length} giorni</p>
          </div>

          {/* Per fornitore */}
          <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3">Per fornitore</h3>
          <div className="bg-white rounded-[12px] border border-[#e5e5e7] overflow-hidden mb-6">
            {allFornNomi.filter(n => consByForn[n]).map(nome => (
              <div key={nome} className="flex items-center justify-between px-4 py-2.5 border-b border-[#e5e5e7] last:border-0 text-sm">
                <span className="text-[#1d1d1f] font-medium">{nome}</span>
                <div className="flex gap-4 text-[#86868b]">
                  <span>{consByForn[nome].ore}h</span>
                  <span className="font-medium text-[#1d1d1f]">{eur(consByForn[nome].costo)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Per giorno */}
          <h3 className="text-sm font-semibold text-[#1d1d1f] mb-3">Per giorno</h3>
          <div className="space-y-2">
            {dates.map(data => {
              const dp = consByDate[data];
              const dayTot = dp.reduce((s, p) => s + (p.costo_totale ?? 0), 0);
              return (
                <div key={data} className="bg-white rounded-[12px] border border-[#e5e5e7] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#1d1d1f]">{new Date(data + "T12:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "short" })}</span>
                    <span className="text-sm font-medium text-[#1d1d1f]">{eur(dayTot)}</span>
                  </div>
                  {dp.map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs text-[#86868b] py-0.5">
                      <span>{p.fornitore.nome} ({p.numero_persone}p x {p.ore}h)</span>
                      <span>{p.costo_totale != null ? eur(p.costo_totale) : "-"}</span>
                    </div>
                  ))}
                </div>
              );
            })}
            {dates.length === 0 && <p className="text-sm text-[#86868b]">Nessuna presenza registrata</p>}
          </div>
        </div>
      )}

      {/* ===== CONFRONTO ===== */}
      {tab === "confronto" && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-4">
              <p className="text-xs text-[#86868b]">Preventivo</p><p className="text-xl font-bold text-[#1d1d1f] mt-1">{eur(totPrev)}</p>
            </div>
            <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-4">
              <p className="text-xs text-[#86868b]">Consuntivo</p><p className="text-xl font-bold text-[#1d1d1f] mt-1">{eur(totCons)}</p>
            </div>
            <div className={`rounded-[12px] border p-4 ${totCons > totPrev ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
              <p className="text-xs text-[#86868b]">Differenza</p>
              <p className={`text-xl font-bold mt-1 ${totCons > totPrev ? "text-red-600" : "text-green-600"}`}>{totCons > totPrev ? "+" : ""}{eur(totCons - totPrev)}</p>
            </div>
          </div>

          <div className="bg-white rounded-[12px] border border-[#e5e5e7] overflow-hidden">
            <div className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-[#e5e5e7] bg-[#f5f5f7]">
              <span className="text-xs font-semibold">Fornitore</span><span className="text-xs font-semibold text-right">Preventivo</span>
              <span className="text-xs font-semibold text-right">Consuntivo</span><span className="text-xs font-semibold text-right">Diff.</span>
            </div>
            {allFornNomi.map(nome => {
              const prev = prevByForn[nome] ?? 0;
              const cons = consByForn[nome]?.costo ?? 0;
              const diff = cons - prev;
              return (
                <div key={nome} className="grid grid-cols-4 gap-4 px-4 py-2.5 border-b border-[#e5e5e7] last:border-0 text-sm">
                  <span className="font-medium text-[#1d1d1f]">{nome}</span>
                  <span className="text-right text-[#86868b]">{prev > 0 ? eur(prev) : "-"}</span>
                  <span className="text-right text-[#86868b]">{cons > 0 ? eur(cons) : "-"}</span>
                  <span className={`text-right font-medium ${diff > 0 ? "text-red-600" : diff < 0 ? "text-green-600" : "text-[#86868b]"}`}>{diff !== 0 ? (diff > 0 ? "+" : "") + eur(diff) : "-"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
