"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { ChevronDown, ChevronRight, RotateCcw, Plus, Trash2, HelpCircle, Copy, Check } from "lucide-react";
import { updateDriver, updateCoefficiente, resetCoefficiente, upsertDisponibilita, addUnaTantum, updateUnaTantum, deleteUnaTantum } from "./actions";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { calcolaMateriali as calcolaMaterialiPuro } from "@/lib/calcolo-materiali";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Driver { id: string; chiave: string; label: string; valore: number; unita: string | null; gruppo: string | null; ordine: number; tooltip: string | null; }
interface Coeff { id: string; chiave: string; label: string; valore: number; valore_default: number; unita: string | null; gruppo: string | null; ordine: number; tooltip: string | null; }
interface Disp { id: string; catalogo_id: string | null; nome_materiale: string | null; qta_magazzino: number; qta_recupero: number; qta_ordinata: number; note: string | null; }
interface UnaTantum { id: string; nome: string; unita_default: string | null; prezzo_unitario_default: number | null; fornitore_preferito: string | null; note: string | null; quantita_disponibile_globale: number; }
interface CatItem { id: string; nome: string; prezzo_unitario: number | null; unita: string | null; fornitore_preferito: string | null; quantita_disponibile_globale: number; }

interface CalcResult { nome: string; quantita: number; unita: string; fornitore: string; prezzo: number | null; disponibile: number; ordinato: number; da_comprare: number; costo: number | null; }

interface Props { drivers: Driver[]; coefficienti: Coeff[]; disponibilita: Disp[]; unaTantum: UnaTantum[]; catalogo: CatItem[]; }

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function groupBy<T>(arr: T[], key: (t: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const item of arr) { const k = key(item) || "Altro"; if (!map.has(k)) map.set(k, []); map.get(k)!.push(item); }
  return Array.from(map.entries());
}

function CollapsibleSection({ title, count, defaultOpen = true, children }: { title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#e5e5e7] rounded-[12px] bg-white mb-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-4 py-3 text-left">
        {open ? <ChevronDown size={14} className="text-[#86868b]" /> : <ChevronRight size={14} className="text-[#86868b]" />}
        <span className="text-sm font-semibold text-[#1d1d1f]">{title}</span>
        {count !== undefined && <span className="text-xs text-[#86868b]">({count})</span>}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function Tip({ text }: { text: string | null }) {
  if (!text) return null;
  return <span title={text} className="text-[#86868b] hover:text-[#1d1d1f] cursor-help"><HelpCircle size={12} /></span>;
}

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export function CalcolatoreClient({ drivers: driversInit, coefficienti: coeffInit, disponibilita: dispInit, unaTantum: utInit, catalogo }: Props) {
  const [drivers, setDrivers] = useState(driversInit);
  const [coefficienti, setCoefficienti] = useState(coeffInit);
  const [disponibilita] = useState(dispInit);
  const [ut, setUt] = useState(utInit);
  const [dispFilter, setDispFilter] = useState("");
  const [newUtNome, setNewUtNome] = useState("");
  const [copiedGroup, setCopiedGroup] = useState<string | null>(null);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const debounce = useCallback((key: string, fn: () => void) => {
    if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
    debounceTimers.current[key] = setTimeout(fn, 500);
  }, []);

  // Build maps
  const driverMap = useMemo(() => { const m: Record<string, number> = {}; drivers.forEach(d => { m[d.chiave] = d.valore ?? 0; }); return m; }, [drivers]);
  const coeffMap = useMemo(() => { const m: Record<string, number> = {}; coefficienti.forEach(c => { m[c.chiave] = (c.valore || c.valore_default) ?? 0; }); return m; }, [coefficienti]);
  const dispMap = useMemo(() => { const m: Record<string, Disp> = {}; disponibilita.forEach(d => { if (d.catalogo_id) m[d.catalogo_id] = d; }); return m; }, [disponibilita]);

  // Calculate
  const calcResults = useMemo(() => calcolaMaterialiPuro({ driverMap, coeffMap }), [driverMap, coeffMap]);

  // Apply disponibilita to results
  const finalResults = useMemo(() => {
    return calcResults.map(r => {
      // Try match to catalogo by name
      const cat = catalogo.find(c => c.nome.toLowerCase() === r.nome.toLowerCase());
      const disp = cat ? dispMap[cat.id] : null;
      const mag = disp?.qta_magazzino ?? 0;
      const rec = disp?.qta_recupero ?? 0;
      const ord = disp?.qta_ordinata ?? 0;
      const da_comprare = Math.max(0, r.quantita - mag - rec);
      const prezzo = cat?.prezzo_unitario ?? r.prezzo;
      const fornitore = cat?.fornitore_preferito ?? r.fornitore;
      return { ...r, disponibile: mag + rec, ordinato: ord, da_comprare, fornitore, prezzo, costo: prezzo ? da_comprare * prezzo : null };
    });
  }, [calcResults, catalogo, dispMap]);

  // Add una tantum to output
  const allResults = useMemo(() => {
    const combined = [...finalResults];
    for (const u of ut) {
      const qty = u.quantita_disponibile_globale || 1;
      combined.push({
        nome: u.nome, quantita: qty, unita: u.unita_default || "pz",
        fornitore: u.fornitore_preferito || "Da assegnare", prezzo: u.prezzo_unitario_default,
        disponibile: 0, ordinato: 0,
        da_comprare: qty,
        costo: u.prezzo_unitario_default ? qty * u.prezzo_unitario_default : null,
      });
    }
    return combined;
  }, [finalResults, ut]);

  // Group output by fornitore
  const outputGrouped = useMemo(() => groupBy(allResults, r => r.fornitore), [allResults]);
  const totalDaComprare = allResults.filter(r => r.da_comprare > 0).length;
  const totalCosto = allResults.reduce((s, r) => s + (r.costo ?? 0), 0);

  // Handlers
  const setDriverVal = (id: string, chiave: string, val: number) => {
    setDrivers(prev => prev.map(d => d.id === id ? { ...d, valore: val } : d));
    debounce("d_" + id, () => updateDriver(id, val));
  };
  const setCoeffVal = (id: string, chiave: string, val: number) => {
    setCoefficienti(prev => prev.map(c => c.id === id ? { ...c, valore: val } : c));
    debounce("c_" + id, () => updateCoefficiente(id, val));
  };
  const handleResetCoeff = async (id: string) => {
    const c = coefficienti.find(x => x.id === id);
    if (c) { setCoefficienti(prev => prev.map(x => x.id === id ? { ...x, valore: x.valore_default } : x)); await resetCoefficiente(id); }
  };

  const copyGroupList = (groupName: string, items: CalcResult[]) => {
    const lines = items.filter(r => r.da_comprare > 0).map(r => `${r.nome}: ${r.da_comprare} ${r.unita}${r.costo ? ` (${r.costo.toFixed(0)}€)` : ""}`);
    navigator.clipboard.writeText(`${groupName}\n${lines.join("\n")}`);
    setCopiedGroup(groupName);
    setTimeout(() => setCopiedGroup(null), 2000);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#1d1d1f]">Calcolatore Materiali</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-[#86868b]">{totalDaComprare} materiali da comprare</span>
          <span className="font-semibold text-[#1d1d1f]">{totalCosto.toLocaleString("it-IT", { minimumFractionDigits: 0 })} &euro;</span>
        </div>
      </div>

      <div className="flex gap-6">
        {/* LEFT: Inputs (60%) */}
        <div className="w-[60%] flex-shrink-0">

          {/* SEZIONE A — Driver */}
          <CollapsibleSection title="Driver geometrici" count={drivers.length}>
            {groupBy(drivers, d => d.gruppo || "").map(([gruppo, items]) => (
              <div key={gruppo} className="mb-4">
                <h3 className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide mb-2">{gruppo}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {items.map(d => (
                    <div key={d.id} className="flex items-center gap-2">
                      <label className="text-[12px] text-[#1d1d1f] flex-1 truncate flex items-center gap-1">
                        {d.label} <Tip text={d.tooltip} />
                        {d.chiave === "n_rotoli_prato" && <InfoTooltip variant="warning" text="Il calcolo dei picchetti assume che ogni rotolo sia lungo 25 metri. Questo valore e fissato nel codice e non si puo modificare da qui. Se i rotoli sono di lunghezza diversa, il conteggio picchetti sara impreciso." />}
                        {d.chiave === "n_pax_verniciatura_max" && <InfoTooltip variant="warning" text="Pennelli e rulli vengono moltiplicati per 4 (i quattro tipi di vernice: testa di moro, impregnante, nera, oro). Se aggiungi o togli tipi di vernice, questo numero non si aggiorna da solo." />}
                      </label>
                      <input type="number" step="any" value={d.valore || ""} placeholder="0"
                        onChange={(e) => setDriverVal(d.id, d.chiave, parseFloat(e.target.value) || 0)}
                        className="w-20 text-[12px] text-right border border-[#e5e5e7] rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-ring" />
                      {d.unita && <span className="text-[10px] text-[#86868b] w-6">{d.unita}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CollapsibleSection>

          {/* SEZIONE B — Coefficienti */}
          <CollapsibleSection title="Coefficienti" count={coefficienti.length}>
            {groupBy(coefficienti, c => c.gruppo || "").map(([gruppo, items]) => (
              <div key={gruppo} className="mb-4">
                <h3 className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide mb-2">{gruppo}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {items.map(c => (
                    <div key={c.id} className="flex items-center gap-1">
                      <label className="text-[12px] text-[#1d1d1f] flex-1 truncate flex items-center gap-1">
                        {c.label} <Tip text={c.tooltip} />
                        {c.chiave === "scarto_perc_default" && <InfoTooltip variant="warning" text="Questo scarto viene applicato solo alla vernice testa di moro. Per impregnante, nera e oro lo scarto e fissato al 10% nel codice e non cambia se modifichi questo valore." />}
                        {c.chiave === "m_tavola_larghezza" && <InfoTooltip variant="warning" text="Se questo valore non viene letto correttamente, il calcolo usa 0.15m come valore di sicurezza senza avvisarti. I numeri sembreranno normali ma potrebbero essere imprecisi." />}
                      </label>
                      <input type="number" step="any" value={c.valore || ""} placeholder={String(c.valore_default)}
                        onChange={(e) => setCoeffVal(c.id, c.chiave, parseFloat(e.target.value) || 0)}
                        className="w-16 text-[12px] text-right border border-[#e5e5e7] rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-ring" />
                      {c.unita && <span className="text-[9px] text-[#86868b] w-8 truncate">{c.unita}</span>}
                      {c.valore !== c.valore_default && (
                        <button onClick={() => handleResetCoeff(c.id)} className="text-[#86868b] hover:text-[#1d1d1f]" title="Ripristina default"><RotateCcw size={10} /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CollapsibleSection>

          {/* SEZIONE C — Disponibilità */}
          <CollapsibleSection title="Disponibilita materiali" count={catalogo.length} defaultOpen={false}>
            <input value={dispFilter} onChange={e => setDispFilter(e.target.value)} placeholder="Filtra per nome..."
              className="w-full text-xs border border-[#e5e5e7] rounded-lg px-2.5 py-1.5 mb-3 outline-none focus:ring-1 focus:ring-ring" />
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {catalogo.filter(c => !dispFilter || c.nome.toLowerCase().includes(dispFilter.toLowerCase())).map(cat => {
                const d = dispMap[cat.id];
                return (
                  <div key={cat.id} className="flex items-center gap-2 text-[11px]">
                    <span className="flex-1 truncate text-[#1d1d1f]">{cat.nome}</span>
                    <input type="number" defaultValue={d?.qta_magazzino ?? 0} placeholder="Mag"
                      onBlur={e => { const v = parseFloat(e.target.value) || 0; upsertDisponibilita(cat.id, cat.nome, "qta_magazzino", v); }}
                      className="w-14 text-right border border-[#e5e5e7] rounded px-1 py-0.5" title="Magazzino" />
                    <input type="number" defaultValue={d?.qta_recupero ?? 0} placeholder="Rec"
                      onBlur={e => { const v = parseFloat(e.target.value) || 0; upsertDisponibilita(cat.id, cat.nome, "qta_recupero", v); }}
                      className="w-14 text-right border border-[#e5e5e7] rounded px-1 py-0.5" title="Recupero" />
                    <input type="number" defaultValue={d?.qta_ordinata ?? 0} placeholder="Ord"
                      onBlur={e => { const v = parseFloat(e.target.value) || 0; upsertDisponibilita(cat.id, cat.nome, "qta_ordinata", v); }}
                      className="w-14 text-right border border-[#e5e5e7] rounded px-1 py-0.5" title="Ordinata" />
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>

          {/* SEZIONE E — Una tantum */}
          <CollapsibleSection title="Materiali una tantum" count={ut.length}>
            <div className="space-y-1.5">
              {ut.map(u => (
                <div key={u.id} className="flex items-center gap-2 text-[11px]">
                  <input defaultValue={u.nome} onBlur={e => updateUnaTantum(u.id, { nome: e.target.value })}
                    className="flex-1 border border-[#e5e5e7] rounded px-2 py-1 text-[#1d1d1f]" />
                  <input defaultValue={u.fornitore_preferito ?? ""} onBlur={e => updateUnaTantum(u.id, { fornitore_preferito: e.target.value || null })}
                    className="w-24 border border-[#e5e5e7] rounded px-2 py-1 text-[#86868b]" placeholder="Fornitore" />
                  <input type="number" step="0.01" defaultValue={u.prezzo_unitario_default ?? ""} onBlur={e => updateUnaTantum(u.id, { prezzo_unitario_default: parseFloat(e.target.value) || null })}
                    className="w-16 text-right border border-[#e5e5e7] rounded px-1 py-1" placeholder="Prezzo" />
                  <button onClick={() => { setUt(prev => prev.filter(x => x.id !== u.id)); deleteUnaTantum(u.id); }}
                    className="text-[#d2d2d7] hover:text-red-500"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input value={newUtNome} onChange={e => setNewUtNome(e.target.value)} placeholder="Nome materiale..."
                onKeyDown={e => { if (e.key === "Enter" && newUtNome.trim()) { addUnaTantum(newUtNome.trim()); setNewUtNome(""); } }}
                className="flex-1 text-xs border border-[#e5e5e7] rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-ring" />
              <button onClick={() => { if (newUtNome.trim()) { addUnaTantum(newUtNome.trim()); setNewUtNome(""); } }}
                className="text-xs text-[#86868b] hover:text-[#1d1d1f] flex items-center gap-1"><Plus size={12} /> Aggiungi</button>
            </div>
          </CollapsibleSection>
        </div>

        {/* RIGHT: Output (40%, sticky) */}
        <div className="w-[40%]">
          <div className="sticky top-4">
            <div className="border border-[#e5e5e7] rounded-[12px] bg-white p-4 max-h-[calc(100vh-120px)] overflow-y-auto">
              <h2 className="text-sm font-semibold text-[#1d1d1f] mb-3">Lista materiali calcolati</h2>

              {allResults.length === 0 ? (
                <p className="text-xs text-[#86868b] py-8 text-center">Inserisci i driver geometrici per calcolare i materiali</p>
              ) : (
                <div className="space-y-4">
                  {outputGrouped.map(([fornitore, items]) => {
                    const groupCosto = items.reduce((s, r) => s + (r.costo ?? 0), 0);
                    const groupDaComprare = items.filter(r => r.da_comprare > 0).length;
                    return (
                      <div key={fornitore}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-semibold text-[#86868b] uppercase">{fornitore}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#86868b]">{groupDaComprare} voci · {groupCosto.toLocaleString("it-IT")} &euro;</span>
                            <button onClick={() => copyGroupList(fornitore, items)}
                              className="text-[#86868b] hover:text-[#1d1d1f]" title="Copia lista">
                              {copiedGroup === fornitore ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          {items.map((r, i) => (
                            <div key={i} className={`flex items-center gap-2 text-[11px] px-2 py-1 rounded ${r.da_comprare > 0 && r.ordinato < r.da_comprare ? "bg-red-50" : r.ordinato >= r.da_comprare && r.da_comprare > 0 ? "bg-green-50" : ""}`}>
                              <span className="flex-1 text-[#1d1d1f] truncate">{r.nome}</span>
                              <span className="text-[#86868b] w-16 text-right">{r.quantita} {r.unita}</span>
                              {r.da_comprare > 0 ? (
                                <span className="font-semibold text-red-600 w-16 text-right">{r.da_comprare}</span>
                              ) : (
                                <span className="text-green-600 w-16 text-right">OK</span>
                              )}
                              {r.costo != null && <span className="text-[#86868b] w-14 text-right">{r.costo.toFixed(0)}&euro;</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Totale */}
                  <div className="border-t border-[#e5e5e7] pt-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1d1d1f]">TOTALE</span>
                    <span className="text-lg font-bold text-[#1d1d1f]">{totalCosto.toLocaleString("it-IT", { minimumFractionDigits: 0 })} &euro;</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
