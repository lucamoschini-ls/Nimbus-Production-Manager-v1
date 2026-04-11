"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { ChevronDown, ChevronRight, RotateCcw, Plus, Trash2, HelpCircle, Copy, Check } from "lucide-react";
import { updateDriver, updateCoefficiente, resetCoefficiente, upsertDisponibilita, addUnaTantum, updateUnaTantum, deleteUnaTantum } from "./actions";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Driver { id: string; chiave: string; label: string; valore: number; unita: string | null; gruppo: string | null; ordine: number; tooltip: string | null; }
interface Coeff { id: string; chiave: string; label: string; valore: number; valore_default: number; unita: string | null; gruppo: string | null; ordine: number; tooltip: string | null; }
interface Disp { id: string; catalogo_id: string | null; nome_materiale: string | null; qta_magazzino: number; qta_recupero: number; qta_ordinata: number; note: string | null; }
interface UnaTantum { id: string; nome: string; quantita: number; unita: string | null; fornitore: string | null; costo_unitario: number | null; ordinato: boolean; note: string | null; }
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
/* Calculation engine                                                  */
/* ------------------------------------------------------------------ */

function calcolaMateriali(driverMap: Record<string, number>, coeffMap: Record<string, number>): CalcResult[] {
  const d = (k: string) => driverMap[k] ?? 0;
  const c = (k: string) => coeffMap[k] ?? 0;
  const scarto = 1 + c("scarto_perc_default") / 100;
  const results: CalcResult[] = [];

  const add = (nome: string, qty: number, unita: string, fornitore = "Da assegnare", prezzo: number | null = null) => {
    if (qty > 0) results.push({ nome, quantita: Math.ceil(qty), unita, fornitore, prezzo, disponibile: 0, ordinato: 0, da_comprare: Math.ceil(qty), costo: prezzo ? Math.ceil(qty) * prezzo : null });
  };

  // CARPENTERIA
  const mq_tavola = c("m_tavola_lunghezza") * c("m_tavola_larghezza");
  const mq_pedane = d("mq_pedana_centrale") + d("mq_pedana_chiosco") + d("mq_pedana_banconi") + d("mq_pedana_swing") + d("mq_anfiteatri");
  if (mq_tavola > 0 && mq_pedane > 0) {
    const n_tavole = Math.ceil((mq_pedane / mq_tavola) * scarto);
    add("Tavole legno pedane", n_tavole, "pz", "Da assegnare");
    add("Viti 5x50", n_tavole * c("viti_5x50_per_tavola"), "pz", "Da assegnare");
    add("Viti 6x120", n_tavole * c("viti_6x120_per_tavola"), "pz", "Da assegnare");
    const ml_ped = mq_pedane / (c("m_tavola_larghezza") || 0.15);
    add("Morali", Math.ceil(ml_ped * c("morali_per_ml_pedana")), "pz", "Da assegnare");
  }
  const ml_vasi_tot = d("ml_vasi_4m") + d("ml_vasi_2m");
  if (ml_vasi_tot > 0 && c("legno_per_ml_vaso") > 0) {
    add("Legno sottomisure vasi", Math.ceil(ml_vasi_tot * c("legno_per_ml_vaso")), "m", "Da assegnare");
  }
  if (ml_vasi_tot > 0 && c("viti_per_ml_vaso") > 0) {
    add("Viti vasi", Math.ceil(ml_vasi_tot * c("viti_per_ml_vaso")), "pz", "Da assegnare");
  }

  // VERNICIATURA
  const L_tdm = d("mq_vern_testa_di_moro") > 0 && c("resa_testa_di_moro") > 0 ? Math.ceil(d("mq_vern_testa_di_moro") / c("resa_testa_di_moro") * scarto) : 0;
  const L_imp = d("mq_vern_impregnante") > 0 && c("resa_impregnante") > 0 ? Math.ceil(d("mq_vern_impregnante") / c("resa_impregnante") * 1.1) : 0;
  const L_nera = d("mq_vern_nera") > 0 && c("resa_vernice_nera") > 0 ? Math.ceil(d("mq_vern_nera") / c("resa_vernice_nera") * 1.1) : 0;
  const L_oro = d("mq_vern_oro") > 0 && c("resa_vernice_oro") > 0 ? Math.ceil(d("mq_vern_oro") / c("resa_vernice_oro") * 1.1) : 0;

  if (L_tdm > 0) add("Vernice testa di moro", L_tdm, "lt", "Da assegnare");
  if (L_imp > 0) add("Impregnante", L_imp, "lt", "Da assegnare");
  if (L_nera > 0) add("Vernice nera", L_nera, "lt", "Da assegnare");
  if (L_oro > 0) add("Vernice oro", L_oro, "lt", "Da assegnare");

  const L_totale_vern = L_tdm + L_imp + L_nera + L_oro;
  if (L_totale_vern > 0) {
    add("Acquaragia", Math.ceil(L_totale_vern * c("perc_acquaragia") / 100), "lt", "Da assegnare");
  }
  const n_pax = d("n_pax_verniciatura_max");
  if (n_pax > 0) {
    add("Pennelli (set)", n_pax * 4, "pz", "Da assegnare");
    add("Rulli (set)", n_pax * 4, "pz", "Da assegnare");
  }

  // STRIPLED
  const ml_strip = d("ml_stripled_lineari");
  if (ml_strip > 0) {
    add("Profilo alluminio stripled", Math.ceil(ml_strip), "ml", "Da assegnare");
    add("Viti fissaggio profilo", Math.ceil(ml_strip * c("viti_per_ml_profilo")), "pz", "Da assegnare");
    if (c("ml_stripled_per_box") > 0) add("Box controllo stripled", Math.ceil(ml_strip / c("ml_stripled_per_box")), "pz", "Da assegnare");
  }

  // ELETTRICO NUVOLE
  const n_tot_nuvole = d("n_nuvole_pedana") + d("n_round_totali") + d("n_nuvole_altre");
  if (n_tot_nuvole > 0) {
    const dist = d("m_distanza_nuvola_regia") + c("m_cavo_citofonico_per_nuvola");
    add("Cavo citofonico", Math.ceil(n_tot_nuvole * dist), "m", "Da assegnare");
    add("Corrugato", Math.ceil(n_tot_nuvole * dist), "m", "Da assegnare");
    add("Strip RGBW nuvole", Math.ceil(n_tot_nuvole * c("m_strip_rgbw_per_nuvola")), "m", "Da assegnare");
    add("Wago connettori", Math.ceil(n_tot_nuvole * c("wago_per_nuvola")), "pz", "Da assegnare");
  }

  // PRATO
  const n_rotoli = d("n_rotoli_prato");
  if (n_rotoli > 1) {
    add("Picchetti prato", Math.ceil((n_rotoli - 1) * 25 * c("picchetti_per_ml_giunzione")), "pz", "Da assegnare");
  }

  return results;
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
  const calcResults = useMemo(() => calcolaMateriali(driverMap, coeffMap), [driverMap, coeffMap]);

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
      if (u.quantita > 0) {
        combined.push({
          nome: u.nome, quantita: u.quantita, unita: u.unita || "pz",
          fornitore: u.fornitore || "Da assegnare", prezzo: u.costo_unitario,
          disponibile: 0, ordinato: u.ordinato ? u.quantita : 0,
          da_comprare: u.ordinato ? 0 : u.quantita,
          costo: u.costo_unitario ? u.quantita * u.costo_unitario : null,
        });
      }
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
                  <input type="number" defaultValue={u.quantita} onBlur={e => { setUt(prev => prev.map(x => x.id === u.id ? { ...x, quantita: parseFloat(e.target.value) || 0 } : x)); updateUnaTantum(u.id, { quantita: parseFloat(e.target.value) || 0 }); }}
                    className="w-14 text-right border border-[#e5e5e7] rounded px-1 py-1" title="Qty" />
                  <input defaultValue={u.fornitore ?? ""} onBlur={e => updateUnaTantum(u.id, { fornitore: e.target.value || null })}
                    className="w-24 border border-[#e5e5e7] rounded px-2 py-1 text-[#86868b]" placeholder="Fornitore" />
                  <input type="number" step="0.01" defaultValue={u.costo_unitario ?? ""} onBlur={e => updateUnaTantum(u.id, { costo_unitario: parseFloat(e.target.value) || null })}
                    className="w-16 text-right border border-[#e5e5e7] rounded px-1 py-1" placeholder="Prezzo" />
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={u.ordinato} onChange={e => { setUt(prev => prev.map(x => x.id === u.id ? { ...x, ordinato: e.target.checked } : x)); updateUnaTantum(u.id, { ordinato: e.target.checked }); }}
                      className="rounded border-[#e5e5e7] w-3.5 h-3.5" />
                    <span className="text-[#86868b]">Ord</span>
                  </label>
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
