"use client";

import { useState, useEffect } from "react";
import { Package, Filter, Trash2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { updateMaterialeField, updateOperazioneFromMateriali, deleteOperazioneFromMateriali, addOperazioneFromMateriali, addCatalogoItem } from "./actions";

const UNITA = ["pz", "mq", "ml", "kg", "kit", "lt", "set", "rotolo"];
const PROVENIENZA = [
  { value: "acquisto", label: "Acquisto" },
  { value: "magazzino", label: "Magazzino" },
  { value: "noleggio", label: "Noleggio" },
  { value: "in_loco", label: "In loco" },
];

interface Materiale {
  id: string;
  nome: string;
  quantita: number | null;
  unita: string | null;
  prezzo_unitario: number | null;
  costo_totale: number | null;
  provenienza: string | null;
  quantita_disponibile: number | null;
  quantita_ordinata: number | null;
  quantita_da_acquistare: number | null;
  giorni_consegna: number | null;
  data_ordine: string | null;
  data_necessaria: string | null;
  note: string | null;
  task: {
    id: string;
    titolo: string;
    lavorazione: {
      nome: string;
      zona: { id: string; nome: string; colore: string };
    };
  };
}

interface Zona { id: string; nome: string; }

interface OpFull {
  id: string; materiale_id: string; titolo: string; tipologia: string | null;
  fornitore_id: string | null; luogo_id: string | null; organizzato: boolean;
  stato: string; durata_ore: number | null; note: string | null;
  fornitore: { id: string; nome: string; stato: string } | null;
  luogo: { id: string; nome: string } | null;
}

const STATO_FORN_CLS: Record<string, string> = {
  da_trovare: "bg-[#FF3B30]/10 text-[#FF3B30]", contattato: "bg-[#FF9F0A]/10 text-[#FF9F0A]",
  confermato: "bg-[#0071E3]/10 text-[#0071E3]", sopralluogo_fatto: "bg-[#5856D6]/10 text-[#5856D6]",
  materiali_definiti: "bg-[#AF52DE]/10 text-[#AF52DE]", pronto: "bg-[#34C759]/10 text-[#34C759]",
};

interface CatAgg {
  id: string; nome: string; tipologia_materiale: string; unita_default: string | null;
  prezzo_unitario_default: number | null; provenienza_default: string | null; note: string | null;
  task_count: number; qty_totale: number; qty_disponibile: number;
  tasks: { id: string; titolo: string; data_inizio: string | null; data_fine: string | null }[];
}

interface Props {
  materiali: Materiale[]; zone: Zona[];
  opsByMat: Record<string, OpFull[]>;
  fornitori: { id: string; nome: string }[];
  luoghi: { id: string; nome: string }[];
  catalogo: CatAgg[];
}

function matStato(m: Materiale) {
  const disp = m.quantita_disponibile ?? 0;
  const ord = m.quantita_ordinata ?? 0;
  const tot = m.quantita ?? 0;
  const prov = m.provenienza;
  if (prov === "in_loco") return { label: "In loco", cls: "bg-violet-100 text-violet-700", key: "in_loco" };
  if (tot > 0 && disp >= tot) return { label: "Completo", cls: "bg-green-100 text-green-700", key: "completo" };
  if (prov === "magazzino" && disp < tot) return { label: "In magazzino", cls: "bg-amber-100 text-amber-700", key: "magazzino" };
  if (ord > 0 && disp > 0) return { label: "Parziale", cls: "bg-amber-100 text-amber-700", key: "parziale" };
  if (ord > 0) return { label: "Ordinato", cls: "bg-amber-100 text-amber-700", key: "ordinato" };
  if (prov === "noleggio") return { label: "Da noleggiare", cls: "bg-red-100 text-red-700", key: "da_noleggiare" };
  return { label: "Da acquistare", cls: "bg-red-100 text-red-700", key: "da_acquistare" };
}

function save(id: string, field: string, raw: string, type: "number" | "string" | "date") {
  let value: unknown;
  if (type === "number") value = raw ? parseFloat(raw) : null;
  else if (type === "date") value = raw || null;
  else value = raw || null;
  updateMaterialeField(id, { [field]: value });
}

// Inline editable number field
function Num({ id, field, val, w = "w-[70px]" }: { id: string; field: string; val: number | null; w?: string }) {
  return (
    <input
      type="number"
      defaultValue={val ?? ""}
      onBlur={(e) => save(id, field, e.target.value, "number")}
      className={`${w} text-xs border border-[#e5e5e7] rounded px-2 py-1 outline-none focus:ring-1 focus:ring-ring bg-white text-center`}
    />
  );
}

function DateField({ id, field, val }: { id: string; field: string; val: string | null }) {
  return (
    <input
      type="date"
      defaultValue={val ?? ""}
      onChange={(e) => save(id, field, e.target.value, "date")}
      className="text-xs border border-[#e5e5e7] rounded px-2 py-1 outline-none focus:ring-1 focus:ring-ring bg-white"
    />
  );
}

function saveOp(id: string, field: string, value: unknown) {
  if (field === "_delete") { deleteOperazioneFromMateriali(id); return; }
  updateOperazioneFromMateriali(id, { [field]: value });
}

export function MaterialiClient({ materiali, zone, opsByMat, fornitori, luoghi, catalogo }: Props) {
  const [activeTab, setActiveTab] = useState<"materiali" | "catalogo">("materiali");
  const [filterZona, setFilterZona] = useState("tutti");
  const [filterStato, setFilterStato] = useState("tutti");
  const [filterProvenienza, setFilterProvenienza] = useState("tutti");
  const [quickFilter, setQuickFilter] = useState<string | null>(null);

  const filtered = materiali.filter((m) => {
    // Quick filter overrides regular filters
    if (quickFilter) {
      if (quickFilter === "da_acquistare") return m.provenienza === "acquisto" && (m.quantita_disponibile ?? 0) < (m.quantita ?? 0);
      if (quickFilter === "da_noleggiare") return m.provenienza === "noleggio" && (m.quantita_disponibile ?? 0) < (m.quantita ?? 0);
      if (quickFilter === "da_trasportare") {
        const ops = opsByMat[m.id] || [];
        return ops.some(op => (op.tipologia ?? "").includes("trasporto") && op.stato !== "completata");
      }
      if (quickFilter === "in_loco") return m.provenienza === "in_loco";
      if (quickFilter === "completi") return (m.quantita_disponibile ?? 0) >= (m.quantita ?? 0) && (m.quantita ?? 0) > 0;
      return true;
    }
    if (filterZona !== "tutti" && m.task?.lavorazione?.zona?.id !== filterZona) return false;
    if (filterStato !== "tutti") {
      const k = matStato(m).key;
      if (filterStato === "ordinato" && k !== "ordinato" && k !== "parziale" && k !== "magazzino") return false;
      if (filterStato === "da_acquistare" && k !== "da_acquistare" && k !== "da_noleggiare") return false;
      if (filterStato === "completo" && k !== "completo" && k !== "in_loco") return false;
    }
    if (filterProvenienza !== "tutti" && m.provenienza !== filterProvenienza) return false;
    return true;
  });

  const totale = materiali.length;
  const daAcquistare = materiali.filter((m) => ["da_acquistare", "da_noleggiare"].includes(matStato(m).key)).length;
  const ordinati = materiali.filter((m) => ["ordinato", "parziale", "magazzino"].includes(matStato(m).key)).length;
  const completi = materiali.filter((m) => ["completo", "in_loco"].includes(matStato(m).key)).length;
  const costoTotale = materiali.reduce((sum, m) => sum + (m.costo_totale ?? 0), 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#1d1d1f] mb-4">Materiali</h1>

      <div className="flex gap-1 mb-6 bg-[#f5f5f7] rounded-lg p-1 w-fit">
        <button onClick={() => setActiveTab("materiali")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "materiali" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"}`}>Materiali ({totale})</button>
        <button onClick={() => setActiveTab("catalogo")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "catalogo" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"}`}>Catalogo ({catalogo.length})</button>
      </div>

      {activeTab === "catalogo" && <CatalogoTab catalogo={catalogo} />}

      {activeTab === "materiali" && <>
      {/* Smart summary counters */}
      {(() => {
        const qDaAcquistare = materiali.filter(m => m.provenienza === "acquisto" && (m.quantita_disponibile ?? 0) < (m.quantita ?? 0)).length;
        const qDaNoleggiare = materiali.filter(m => m.provenienza === "noleggio" && (m.quantita_disponibile ?? 0) < (m.quantita ?? 0)).length;
        const qDaTrasportare = materiali.filter(m => {
          const ops = opsByMat[m.id] || [];
          return ops.some(op => (op.tipologia ?? "").includes("trasporto") && op.stato !== "completata");
        }).length;
        const qInLoco = materiali.filter(m => m.provenienza === "in_loco").length;
        const qCompleti = materiali.filter(m => (m.quantita_disponibile ?? 0) >= (m.quantita ?? 0) && (m.quantita ?? 0) > 0).length;
        return (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button onClick={() => setQuickFilter(quickFilter === "da_acquistare" ? null : "da_acquistare")} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${quickFilter === "da_acquistare" ? "bg-red-600 text-white" : "bg-red-100 text-red-700 hover:bg-red-200"}`}>
              Da acquistare: {qDaAcquistare}
            </button>
            <button onClick={() => setQuickFilter(quickFilter === "da_noleggiare" ? null : "da_noleggiare")} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${quickFilter === "da_noleggiare" ? "bg-red-600 text-white" : "bg-red-100 text-red-700 hover:bg-red-200"}`}>
              Da noleggiare: {qDaNoleggiare}
            </button>
            <button onClick={() => setQuickFilter(quickFilter === "da_trasportare" ? null : "da_trasportare")} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${quickFilter === "da_trasportare" ? "bg-orange-600 text-white" : "bg-orange-100 text-orange-700 hover:bg-orange-200"}`}>
              Da trasportare: {qDaTrasportare}
            </button>
            <button onClick={() => setQuickFilter(quickFilter === "in_loco" ? null : "in_loco")} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${quickFilter === "in_loco" ? "bg-green-600 text-white" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>
              In loco: {qInLoco}
            </button>
            <button onClick={() => setQuickFilter(quickFilter === "completi" ? null : "completi")} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${quickFilter === "completi" ? "bg-green-600 text-white" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>
              Completi: {qCompleti}
            </button>
            {quickFilter && (
              <button onClick={() => setQuickFilter(null)} className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#f5f5f7] text-[#86868b] hover:bg-[#e5e5e7] transition-colors">
                Mostra tutti
              </button>
            )}
          </div>
        );
      })()}

      {/* Contatori */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-4">
          <p className="text-xs text-[#86868b] font-medium">Totale</p>
          <p className="text-xl font-semibold text-[#1d1d1f] mt-1">{totale}</p>
        </div>
        <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-4">
          <p className="text-xs text-[#86868b] font-medium">Da acquistare</p>
          <p className="text-xl font-semibold text-red-600 mt-1">{daAcquistare}</p>
        </div>
        <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-4">
          <p className="text-xs text-[#86868b] font-medium">Ordinati / Parziali</p>
          <p className="text-xl font-semibold text-amber-600 mt-1">{ordinati}</p>
        </div>
        <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-4">
          <p className="text-xs text-[#86868b] font-medium">Completi</p>
          <p className="text-xl font-semibold text-green-600 mt-1">{completi}</p>
        </div>
        <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-4 col-span-2 md:col-span-1">
          <p className="text-xs text-[#86868b] font-medium">Costo totale</p>
          <p className="text-xl font-semibold text-[#1d1d1f] mt-1">
            {costoTotale.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
          </p>
        </div>
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div>
          <span className="text-[9px] text-[#86868b] block mb-0.5">Zona</span>
          <Select value={filterZona} onValueChange={setFilterZona}>
            <SelectTrigger className="w-[160px]">
              <Filter size={14} className="mr-1.5 text-[#86868b]" />
              <SelectValue placeholder="Zona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutte le zone</SelectItem>
              {zone.map((z) => (<SelectItem key={z.id} value={z.id}>{z.nome}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="text-[9px] text-[#86868b] block mb-0.5">Stato</span>
          <Select value={filterStato} onValueChange={setFilterStato}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti</SelectItem>
              <SelectItem value="da_acquistare">Da acquistare</SelectItem>
              <SelectItem value="ordinato">Ordinati / Parziali</SelectItem>
              <SelectItem value="completo">Completi</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="text-[9px] text-[#86868b] block mb-0.5">Provenienza</span>
          <Select value={filterProvenienza} onValueChange={setFilterProvenienza}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Provenienza" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutte</SelectItem>
              {PROVENIENZA.map((p) => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[#86868b]">
          <Package size={40} strokeWidth={1.2} />
          <p className="text-sm mt-3 font-medium">Nessun materiale trovato</p>
          <p className="text-xs mt-1">Aggiungi materiali dalle singole task nella sezione Lavorazioni</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const stato = matStato(m);
            const daAcq = m.quantita_da_acquistare ?? 0;
            return (
              <div key={m.id} className="bg-white rounded-[12px] border border-[#e5e5e7] p-4">
                {/* ROW 1: Nome + task + chips */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[#1d1d1f]">{m.nome}</h3>
                    <p className="text-[11px] text-[#86868b] mt-0.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ backgroundColor: m.task?.lavorazione?.zona?.colore }} />
                      {m.task?.lavorazione?.zona?.nome} &gt; {m.task?.lavorazione?.nome} &gt; {m.task?.titolo}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {/* Provenienza chip */}
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        m.provenienza === "acquisto" ? "bg-blue-100 text-blue-700" :
                        m.provenienza === "magazzino" ? "bg-amber-100 text-amber-700" :
                        m.provenienza === "noleggio" ? "bg-purple-100 text-purple-700" :
                        m.provenienza === "in_loco" ? "bg-green-100 text-green-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {PROVENIENZA.find(p => p.value === m.provenienza)?.label ?? m.provenienza ?? "N/D"}
                      </span>
                      {/* Transport chip */}
                      {(() => {
                        const ops = opsByMat[m.id] || [];
                        const transportOp = ops.find(op => op.tipologia === "trasporto" || op.tipologia === "acquisto_e_trasporto");
                        if (transportOp) {
                          return (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-100 text-orange-700">
                              Da trasportare{transportOp.luogo ? ` — ${transportOp.luogo.nome}` : ""}
                            </span>
                          );
                        }
                        if (m.provenienza === "in_loco" && !ops.some(op => op.tipologia === "trasporto" || op.tipologia === "acquisto_e_trasporto")) {
                          return (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700">
                              In loco
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${stato.cls}`}>{stato.label}</span>
                </div>

                {/* ROW 2: Quantita e stato */}
                <div className="flex flex-wrap items-end gap-3 mb-3">
                  <div>
                    <label className="text-[9px] text-[#86868b] block mb-0.5">Necessaria</label>
                    <Num id={m.id} field="quantita" val={m.quantita} />
                  </div>
                  <div>
                    <label className="text-[9px] text-[#86868b] block mb-0.5">Unita</label>
                    <select
                      defaultValue={m.unita ?? "pz"}
                      onChange={(e) => save(m.id, "unita", e.target.value, "string")}
                      className="text-xs border border-[#e5e5e7] rounded px-2 py-1 bg-white w-[65px]"
                    >
                      {UNITA.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-[#86868b] block mb-0.5">Disponibile</label>
                    <Num id={m.id} field="quantita_disponibile" val={m.quantita_disponibile} />
                  </div>
                  <div>
                    <label className="text-[9px] text-[#86868b] block mb-0.5">Ordinata</label>
                    <Num id={m.id} field="quantita_ordinata" val={m.quantita_ordinata} />
                  </div>
                  <div>
                    <label className="text-[9px] text-[#86868b] block mb-0.5">Da acquistare</label>
                    <div className={`w-[70px] text-xs border border-transparent rounded px-2 py-1 text-center font-medium ${daAcq > 0 ? "text-red-600" : "text-green-600"}`}>
                      {daAcq}
                    </div>
                  </div>
                </div>

                {/* ROW 3: Date e costi */}
                <div className="flex flex-wrap items-end gap-3 border-t border-[#e5e5e7] pt-3">
                  <div>
                    <label className="text-[9px] text-[#86868b] block mb-0.5">Necessaria entro</label>
                    <DateField id={m.id} field="data_necessaria" val={m.data_necessaria} />
                  </div>
                  <div>
                    <label className="text-[9px] text-[#86868b] block mb-0.5">Gg consegna</label>
                    <Num id={m.id} field="giorni_consegna" val={m.giorni_consegna} w="w-[60px]" />
                  </div>
                  <div>
                    <label className="text-[9px] text-[#86868b] block mb-0.5">Data ordine</label>
                    <DateField id={m.id} field="data_ordine" val={m.data_ordine} />
                  </div>
                  <div>
                    <label className="text-[9px] text-[#86868b] block mb-0.5">Provenienza</label>
                    <select
                      defaultValue={m.provenienza ?? "acquisto"}
                      onChange={(e) => save(m.id, "provenienza", e.target.value, "string")}
                      className="text-xs border border-[#e5e5e7] rounded px-2 py-1 bg-white"
                    >
                      {PROVENIENZA.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-[#86868b] block mb-0.5">Prezzo unit.</label>
                    <div className="flex items-center gap-1">
                      <Num id={m.id} field="prezzo_unitario" val={m.prezzo_unitario} w="w-[70px]" />
                      <span className="text-[10px] text-[#86868b]">EUR</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-[#86868b] block mb-0.5">Costo totale</label>
                    <div className="text-xs font-medium text-[#1d1d1f] px-2 py-1">
                      {m.costo_totale != null ? m.costo_totale.toLocaleString("it-IT", { style: "currency", currency: "EUR" }) : "-"}
                    </div>
                  </div>
                </div>

                {/* ROW 4: Note */}
                <div className="mt-3">
                  <input
                    defaultValue={m.note ?? ""}
                    onBlur={(e) => save(m.id, "note", e.target.value, "string")}
                    placeholder="Note..."
                    className="w-full text-xs text-[#86868b] border-0 border-b border-[#e5e5e7] bg-transparent px-0 py-1 outline-none focus:border-[#1d1d1f] placeholder:text-[#d2d2d7]"
                  />
                </div>

                {/* ROW 5: Operazioni editabili */}
                <div className="mt-3 pt-2 border-t border-[#e5e5e7]">
                  <p className="text-[9px] text-[#86868b] font-medium mb-1.5">Operazioni ({(opsByMat[m.id] || []).length})</p>
                  <div className="space-y-2">
                    {(opsByMat[m.id] || []).map((op) => (
                      <div key={op.id} className="bg-[#f5f5f7] rounded-lg px-2.5 py-2">
                        <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
                          <input defaultValue={op.titolo} onBlur={(e) => saveOp(op.id, "titolo", e.target.value)}
                            className="flex-1 min-w-[80px] bg-transparent border-0 outline-none text-[#1d1d1f] font-medium focus:bg-white focus:border focus:border-[#e5e5e7] focus:rounded focus:px-1 text-[11px]" />
                          <select defaultValue={op.tipologia ?? ""} onChange={(e) => saveOp(op.id, "tipologia", e.target.value || null)}
                            className="text-[10px] border border-[#e5e5e7] rounded px-1 py-0.5 bg-white">
                            <option value="">--</option>
                            <option value="trasporto">trasporto</option><option value="acquisto">acquisto</option>
                            <option value="acquisto_e_trasporto">acquisto e trasporto</option><option value="noleggio">noleggio</option>
                            <option value="montaggio">montaggio</option>
                          </select>
                          <select defaultValue={op.fornitore_id ?? ""} onChange={(e) => saveOp(op.id, "fornitore_id", e.target.value || null)}
                            className="text-[10px] border border-[#e5e5e7] rounded px-1 py-0.5 bg-white max-w-[100px]">
                            <option value="">Fornitore...</option>
                            {fornitori.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                          </select>
                          {op.fornitore && <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-medium ${STATO_FORN_CLS[op.fornitore.stato] ?? "bg-gray-100"}`}>{op.fornitore.stato.replace(/_/g, " ")}</span>}
                          <select defaultValue={op.stato} onChange={(e) => saveOp(op.id, "stato", e.target.value)}
                            className="text-[10px] border border-[#e5e5e7] rounded px-1 py-0.5 bg-white">
                            <option value="da_fare">Da fare</option><option value="in_corso">In corso</option><option value="completata">Completata</option>
                          </select>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer flex-shrink-0">
                            <input type="checkbox" checked={op.organizzato} onChange={(e) => saveOp(op.id, "organizzato", e.target.checked)} className="rounded border-[#e5e5e7] w-4 h-4" />
                            <span className="text-[#86868b]">Organizzato</span>
                          </label>
                          <select defaultValue={op.luogo_id ?? ""} onChange={(e) => saveOp(op.id, "luogo_id", e.target.value || null)}
                            className="text-[10px] border border-[#e5e5e7] rounded px-1 py-0.5 bg-white">
                            <option value="">Luogo...</option>
                            {luoghi.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
                          </select>
                          <button onClick={() => saveOp(op.id, "_delete", true)} className="text-[#d2d2d7] hover:text-red-500 flex-shrink-0"><span className="text-xs">x</span></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => addOperazioneFromMateriali(m.id)}
                    className="mt-1.5 text-[10px] text-[#86868b] hover:text-[#1d1d1f] flex items-center gap-0.5"
                  >
                    + Operazione
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>}
    </div>
  );
}

// ========== CATALOGO TAB ==========

const TIP_MAT_COLORS: Record<string, string> = {
  strutturale: "bg-orange-100 text-orange-700",
  consumo: "bg-blue-100 text-blue-700",
  attrezzo: "bg-purple-100 text-purple-700",
};

function CatalogoTab({ catalogo: catalogoInitial }: { catalogo: CatAgg[] }) {
  const [catalogo, setCatalogo] = useState(catalogoInitial);
  const [filterTip, setFilterTip] = useState("tutti");
  const [adding, setAdding] = useState(false);
  const [newNome, setNewNome] = useState("");

  // Sync with server data on re-render
  useEffect(() => { setCatalogo(catalogoInitial); }, [catalogoInitial]);

  const updateCatLocal = (id: string, field: string, value: string) => {
    setCatalogo(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    import("@/lib/supabase/client").then(({ createClient }) => {
      createClient().from("catalogo_materiali").update({ [field]: value }).eq("id", id).then(({ error }) => {
        if (error) console.error("Save error:", error);
      });
    });
  };

  const deleteCatLocal = (id: string) => {
    setCatalogo(prev => prev.filter(c => c.id !== id));
    import("@/lib/supabase/client").then(({ createClient }) => {
      createClient().from("catalogo_materiali").delete().eq("id", id);
    });
  };

  const filtered = filterTip === "tutti" ? catalogo : catalogo.filter(c => c.tipologia_materiale === filterTip);

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={filterTip} onValueChange={setFilterTip}>
          <SelectTrigger className="w-[160px]"><Filter size={14} className="mr-1.5 text-[#86868b]" /><SelectValue placeholder="Tipologia" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutte</SelectItem>
            <SelectItem value="strutturale">Strutturale</SelectItem>
            <SelectItem value="consumo">Consumo</SelectItem>
            <SelectItem value="attrezzo">Attrezzo</SelectItem>
          </SelectContent>
        </Select>
        <button onClick={() => setAdding(true)} className="text-xs text-[#86868b] hover:text-[#1d1d1f] flex items-center gap-1 ml-auto">+ Aggiungi al catalogo</button>
      </div>

      {adding && (
        <div className="flex gap-2 mb-4 items-center">
          <input autoFocus value={newNome} onChange={(e) => setNewNome(e.target.value)} placeholder="Nome materiale" className="flex-1 text-xs border border-[#e5e5e7] rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-ring" />
          <button onClick={async () => { if (newNome.trim()) { await addCatalogoItem({ nome: newNome.trim() }); setNewNome(""); setAdding(false); } }} className="text-xs bg-[#1d1d1f] text-white rounded px-3 py-1.5">Salva</button>
          <button onClick={() => setAdding(false)} className="text-xs text-[#86868b]">Annulla</button>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((c) => {
          const daAcq = Math.max(c.qty_totale - c.qty_disponibile, 0);
          // Conflict check for attrezzi
          let conflict = "";
          if (c.tipologia_materiale === "attrezzo" && c.tasks.length > 1) {
            for (let i = 0; i < c.tasks.length; i++) {
              for (let j = i + 1; j < c.tasks.length; j++) {
                const a = c.tasks[i], b = c.tasks[j];
                if (a.data_inizio && a.data_fine && b.data_inizio && b.data_fine) {
                  if (a.data_inizio <= b.data_fine && b.data_inizio <= a.data_fine) {
                    conflict = `Conflitto: ${a.titolo} e ${b.titolo} si sovrappongono`;
                    break;
                  }
                }
              }
              if (conflict) break;
            }
          }

          return (
            <div key={c.id} className={`group relative bg-white rounded-[12px] border p-4 pr-10 ${conflict ? "border-orange-300" : "border-[#e5e5e7]"}`}>
              <button
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-300 hover:text-red-500"
                onClick={() => {
                  if (c.task_count > 0) {
                    if (!confirm(`Questo materiale è usato in ${c.task_count} task. Le istanze rimangono ma perdono il collegamento. Continuare?`)) return;
                  }
                  deleteCatLocal(c.id);
                }}
              >
                <Trash2 size={14} />
              </button>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <input defaultValue={c.nome} onBlur={(e) => { if (e.target.value !== c.nome) updateCatLocal(c.id, "nome", e.target.value); }}
                  className="text-sm font-medium text-[#1d1d1f] bg-transparent border-0 outline-none flex-1 min-w-[120px] focus:bg-white focus:border focus:border-[#e5e5e7] focus:rounded focus:px-2" />
                <select value={c.tipologia_materiale} onChange={(e) => updateCatLocal(c.id, "tipologia_materiale", e.target.value)}
                  className="text-[10px] border border-[#e5e5e7] rounded px-1.5 py-0.5 bg-white">
                  <option value="strutturale">strutturale</option><option value="consumo">consumo</option><option value="attrezzo">attrezzo</option>
                </select>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TIP_MAT_COLORS[c.tipologia_materiale] ?? "bg-gray-100"}`}>{c.tipologia_materiale}</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#86868b]">
                <span>{c.task_count} task</span>
                <span>Totale: <span className="text-[#1d1d1f] font-medium">{c.qty_totale}{c.unita_default ? ` ${c.unita_default}` : ""}</span></span>
                <span>Disponibile: <span className="text-[#1d1d1f] font-medium">{c.qty_disponibile}</span></span>
                {daAcq > 0 && <span className="text-red-600 font-medium">Da acquistare: {daAcq}</span>}
              </div>
              {c.tasks.length > 0 && (
                <div className="mt-2 text-[10px] text-[#86868b]">
                  {c.tasks.map((t, i) => <span key={t.id}>{i > 0 && ", "}{t.titolo}</span>)}
                </div>
              )}
              {conflict && <p className="mt-2 text-xs text-orange-600 font-medium">{conflict}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

