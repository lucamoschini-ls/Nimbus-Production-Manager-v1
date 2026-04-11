"use client";

import { useState, useEffect, useMemo } from "react";
import { Package, Filter, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { updateMaterialeField, updateOperazioneFromMateriali, deleteOperazioneFromMateriali, addOperazioneFromMateriali, addCatalogoItem, updateCatalogoItem } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { TaskDetailOverlay } from "@/components/task-detail-overlay";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  catalogo_id: string | null;
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
  id: string; nome: string; tipologia_materiale: string;
  unita: string | null; prezzo_unitario: number | null;
  quantita_disponibile_globale: number; fornitore_preferito: string | null;
  provenienza_default: string | null; note: string | null;
  quantita_totale_necessaria: number; num_task: number;
  quantita_da_acquistare: number; costo_stimato: number | null;
  tasks: { id: string; titolo: string; zona: string; lav: string; quantita: number }[];
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

// ========== EXPANDED MATERIAL FIELDS (shared by both views) ==========

function ExpandedMaterialFields({
  m, opsByMat, fornitori, luoghi,
}: {
  m: Materiale;
  opsByMat: Record<string, OpFull[]>;
  fornitori: { id: string; nome: string }[];
  luoghi: { id: string; nome: string }[];
}) {
  const daAcq = m.quantita_da_acquistare ?? 0;

  return (
    <div className="pt-3 space-y-3">
      {/* Quantita e stato */}
      <div className="flex flex-wrap items-end gap-3">
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

      {/* Date e costi */}
      <div className="flex flex-wrap items-end gap-3 border-t border-[#e5e5e7] pt-3">
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
          <label className="text-[9px] text-[#86868b] block mb-0.5">Gg consegna</label>
          <Num id={m.id} field="giorni_consegna" val={m.giorni_consegna} w="w-[60px]" />
        </div>
        <div>
          <label className="text-[9px] text-[#86868b] block mb-0.5">Costo totale</label>
          <div className="text-xs font-medium text-[#1d1d1f] px-2 py-1">
            {m.costo_totale != null ? m.costo_totale.toLocaleString("it-IT", { style: "currency", currency: "EUR" }) : "-"}
          </div>
        </div>
      </div>

      {/* Date */}
      <div className="flex flex-wrap items-end gap-3 border-t border-[#e5e5e7] pt-3">
        <div>
          <label className="text-[9px] text-[#86868b] block mb-0.5">Necessaria entro</label>
          <DateField id={m.id} field="data_necessaria" val={m.data_necessaria} />
        </div>
        <div>
          <label className="text-[9px] text-[#86868b] block mb-0.5">Data ordine</label>
          <DateField id={m.id} field="data_ordine" val={m.data_ordine} />
        </div>
      </div>

      {/* Note */}
      <div>
        <input
          defaultValue={m.note ?? ""}
          onBlur={(e) => save(m.id, "note", e.target.value, "string")}
          placeholder="Note..."
          className="w-full text-xs text-[#86868b] border-0 border-b border-[#e5e5e7] bg-transparent px-0 py-1 outline-none focus:border-[#1d1d1f] placeholder:text-[#d2d2d7]"
        />
      </div>

      {/* Operazioni */}
      <div className="pt-2 border-t border-[#e5e5e7]">
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
}

// ========== TIPOLOGIA COLORS ==========

const TIP_MAT_COLORS: Record<string, string> = {
  strutturale: "bg-orange-100 text-orange-700",
  consumo: "bg-blue-100 text-blue-700",
  attrezzo: "bg-purple-100 text-purple-700",
};

// ========== MAIN COMPONENT ==========

export function MaterialiClient({ materiali, zone, opsByMat, fornitori, luoghi, catalogo }: Props) {
  const router = useRouter();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"materiali" | "catalogo" | "spesa">("materiali");
  const [viewMode, setViewMode] = useState<"materiale" | "area">("materiale");
  const [filterZona, setFilterZona] = useState("tutti");
  const [filterStato, setFilterStato] = useState("tutti");
  const [filterProvenienza, setFilterProvenienza] = useState("tutti");
  const [filterTipMat, setFilterTipMat] = useState("tutti");
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [expandedMats, setExpandedMats] = useState<Set<string>>(new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleMat = (id: string) => {
    setExpandedMats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Lookup catalogo_id → tipologia_materiale
  const catTipMap: Record<string, string> = {};
  catalogo.forEach(c => { catTipMap[c.id] = c.tipologia_materiale; });

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
    if (filterTipMat !== "tutti" && (m.catalogo_id ? catTipMap[m.catalogo_id] : null) !== filterTipMat) return false;
    return true;
  });

  const totale = materiali.length;
  const daAcquistare = materiali.filter((m) => ["da_acquistare", "da_noleggiare"].includes(matStato(m).key)).length;
  const ordinati = materiali.filter((m) => ["ordinato", "parziale", "magazzino"].includes(matStato(m).key)).length;
  const completi = materiali.filter((m) => ["completo", "in_loco"].includes(matStato(m).key)).length;
  const costoTotale = materiali.reduce((sum, m) => sum + (m.costo_totale ?? 0), 0);

  // Build catalogo lookup for "Per materiale" view
  const catalogoMap = new Map(catalogo.map(c => [c.id, c]));

  // Group by catalogo_id for "Per materiale" view
  const matByCatalog: Record<string, Materiale[]> = {};
  const noCatalog: Materiale[] = [];
  filtered.forEach(m => {
    if (m.catalogo_id) {
      if (!matByCatalog[m.catalogo_id]) matByCatalog[m.catalogo_id] = [];
      matByCatalog[m.catalogo_id].push(m);
    } else {
      noCatalog.push(m);
    }
  });

  // Group by zona for "Per area" view
  const matByZona: Record<string, Materiale[]> = {};
  filtered.forEach(m => {
    const zona = m.task?.lavorazione?.zona?.nome ?? "Senza zona";
    if (!matByZona[zona]) matByZona[zona] = [];
    matByZona[zona].push(m);
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#1d1d1f] mb-4">Materiali</h1>

      <div className="flex gap-1 mb-6 bg-[#f5f5f7] rounded-lg p-1 w-fit">
        <button onClick={() => setActiveTab("materiali")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "materiali" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"}`}>Materiali ({totale})</button>
        <button onClick={() => setActiveTab("catalogo")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "catalogo" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"}`}>Catalogo ({catalogo.length})</button>
        <button onClick={() => setActiveTab("spesa")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "spesa" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"}`}>Lista Spesa ({catalogo.filter(c => c.quantita_da_acquistare > 0).length})</button>
      </div>

      {activeTab === "catalogo" && <CatalogoTab catalogo={catalogo} fornitori={fornitori} onOpenTask={setSelectedTaskId} />}
      {activeTab === "spesa" && <ListaSpesaTab catalogo={catalogo} fornitori={fornitori} onOpenTask={setSelectedTaskId} />}

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
      <div className="flex flex-wrap gap-3 mb-4">
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
        <div>
          <span className="text-[9px] text-[#86868b] block mb-0.5">Tipologia materiale</span>
          <Select value={filterTipMat} onValueChange={setFilterTipMat}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tipologia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutte</SelectItem>
              <SelectItem value="consumo">Consumo</SelectItem>
              <SelectItem value="strutturale">Strutturale</SelectItem>
              <SelectItem value="attrezzo">Attrezzo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* View mode toggle */}
      <div className="flex gap-1 bg-[#f5f5f7] rounded-lg p-1 w-fit mb-6">
        <button
          onClick={() => setViewMode("materiale")}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === "materiale" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"}`}
        >
          Per materiale
        </button>
        <button
          onClick={() => setViewMode("area")}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === "area" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"}`}
        >
          Per area
        </button>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[#86868b]">
          <Package size={40} strokeWidth={1.2} />
          <p className="text-sm mt-3 font-medium">Nessun materiale trovato</p>
          <p className="text-xs mt-1">Aggiungi materiali dalle singole task nella sezione Lavorazioni</p>
        </div>
      ) : viewMode === "materiale" ? (
        /* ==================== VIEW: Per materiale ==================== */
        <div className="space-y-3">
          {/* Grouped by catalogo */}
          {Object.entries(matByCatalog).map(([catId, items]) => {
            const catInfo = catalogoMap.get(catId);
            const catNome = catInfo?.nome ?? items[0].nome;
            const catTipologia = catInfo?.tipologia_materiale ?? null;
            const totalQty = items.reduce((s, m) => s + (m.quantita ?? 0), 0);
            const totalDisp = items.reduce((s, m) => s + (m.quantita_disponibile ?? 0), 0);
            const isSectionCollapsed = collapsedSections.has(catId);

            return (
              <div key={catId} className="bg-white rounded-[12px] border border-[#e5e5e7] overflow-hidden">
                {/* Card header */}
                <button
                  onClick={() => toggleSection(catId)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-[#fafafa] transition-colors"
                >
                  {isSectionCollapsed
                    ? <ChevronRight size={14} className="text-[#86868b] flex-shrink-0" />
                    : <ChevronDown size={14} className="text-[#86868b] flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-[#1d1d1f]">{catNome}</h3>
                      {catTipologia && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TIP_MAT_COLORS[catTipologia] ?? "bg-gray-100 text-gray-600"}`}>
                          {catTipologia}
                        </span>
                      )}
                      <span className="text-[11px] text-[#86868b]">
                        {items.length} {items.length === 1 ? "istanza" : "istanze"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-0.5 text-[11px] text-[#86868b]">
                      <span>Totale: <span className="text-[#1d1d1f] font-medium">{totalQty}</span></span>
                      <span>Disponibile: <span className="text-[#1d1d1f] font-medium">{totalDisp}</span></span>
                      {totalQty - totalDisp > 0 && (
                        <span className="text-red-600 font-medium">Da acquistare: {totalQty - totalDisp}</span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Instances */}
                {!isSectionCollapsed && (
                  <div className="border-t border-[#e5e5e7]">
                    {items.map((m) => {
                      const stato = matStato(m);
                      const isExpanded = expandedMats.has(m.id);
                      return (
                        <div key={m.id} className="border-b border-[#e5e5e7] last:border-b-0">
                          <button
                            onClick={() => toggleMat(m.id)}
                            className="w-full px-4 py-2.5 flex items-center gap-2 text-left hover:bg-[#fafafa] transition-colors"
                          >
                            {isExpanded
                              ? <ChevronDown size={12} className="text-[#86868b] flex-shrink-0" />
                              : <ChevronRight size={12} className="text-[#86868b] flex-shrink-0" />
                            }
                            <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.task?.lavorazione?.zona?.colore }} />
                            <span className="text-xs text-[#1d1d1f] flex-1 min-w-0 truncate">
                              {m.task?.lavorazione?.zona?.nome} &gt; {m.task?.lavorazione?.nome} &gt; {m.task?.titolo}
                            </span>
                            <span className="text-[11px] text-[#86868b] flex-shrink-0 mr-2">
                              {m.quantita ?? 0} {m.unita ?? "pz"}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${stato.cls}`}>
                              {stato.label}
                            </span>
                          </button>
                          {isExpanded && (
                            <div className="px-4 pb-4 pl-9">
                              <ExpandedMaterialFields m={m} opsByMat={opsByMat} fornitori={fornitori} luoghi={luoghi} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Materials without catalogo */}
          {noCatalog.map((m) => {
            const stato = matStato(m);
            const isExpanded = expandedMats.has(m.id);
            return (
              <div key={m.id} className="bg-white rounded-[12px] border border-[#e5e5e7] overflow-hidden">
                <button
                  onClick={() => toggleMat(m.id)}
                  className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-[#fafafa] transition-colors"
                >
                  {isExpanded
                    ? <ChevronDown size={14} className="text-[#86868b] flex-shrink-0" />
                    : <ChevronRight size={14} className="text-[#86868b] flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-[#1d1d1f]">{m.nome}</h3>
                      <span className="text-[11px] text-[#86868b]">
                        {m.quantita ?? 0} {m.unita ?? "pz"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#86868b] mt-0.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ backgroundColor: m.task?.lavorazione?.zona?.colore }} />
                      {m.task?.lavorazione?.zona?.nome} &gt; {m.task?.lavorazione?.nome} &gt; {m.task?.titolo}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${stato.cls}`}>
                    {stato.label}
                  </span>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[#e5e5e7]">
                    <ExpandedMaterialFields m={m} opsByMat={opsByMat} fornitori={fornitori} luoghi={luoghi} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ==================== VIEW: Per area ==================== */
        <div className="space-y-3">
          {Object.entries(matByZona).map(([zonaNome, items]) => {
            const zonaColore = items[0]?.task?.lavorazione?.zona?.colore;
            const isSectionCollapsed = collapsedSections.has(`zona-${zonaNome}`);

            return (
              <div key={zonaNome} className="bg-white rounded-[12px] border border-[#e5e5e7] overflow-hidden">
                {/* Zona header */}
                <button
                  onClick={() => toggleSection(`zona-${zonaNome}`)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-[#fafafa] transition-colors"
                >
                  {isSectionCollapsed
                    ? <ChevronRight size={14} className="text-[#86868b] flex-shrink-0" />
                    : <ChevronDown size={14} className="text-[#86868b] flex-shrink-0" />
                  }
                  {zonaColore && (
                    <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: zonaColore }} />
                  )}
                  <h3 className="text-sm font-semibold text-[#1d1d1f]">{zonaNome}</h3>
                  <span className="text-[11px] text-[#86868b]">
                    {items.length} {items.length === 1 ? "materiale" : "materiali"}
                  </span>
                </button>

                {/* Materials in zona */}
                {!isSectionCollapsed && (
                  <div className="border-t border-[#e5e5e7]">
                    {items.map((m) => {
                      const stato = matStato(m);
                      const isExpanded = expandedMats.has(m.id);
                      return (
                        <div key={m.id} className="border-b border-[#e5e5e7] last:border-b-0">
                          <button
                            onClick={() => toggleMat(m.id)}
                            className="w-full px-4 py-2.5 flex items-center gap-2 text-left hover:bg-[#fafafa] transition-colors"
                          >
                            {isExpanded
                              ? <ChevronDown size={12} className="text-[#86868b] flex-shrink-0" />
                              : <ChevronRight size={12} className="text-[#86868b] flex-shrink-0" />
                            }
                            <span className="text-xs font-medium text-[#1d1d1f] flex-1 min-w-0 truncate">
                              {m.nome}
                            </span>
                            <span className="text-[11px] text-[#86868b] flex-shrink-0 mr-2">
                              {m.quantita ?? 0} {m.unita ?? "pz"}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${stato.cls}`}>
                              {stato.label}
                            </span>
                          </button>
                          {isExpanded && (
                            <div className="px-4 pb-4 pl-9">
                              {/* Show task path in area view since we're grouped by zona */}
                              <p className="text-[11px] text-[#86868b] mb-2 pt-2">
                                {m.task?.lavorazione?.nome} &gt; {m.task?.titolo}
                              </p>
                              <ExpandedMaterialFields m={m} opsByMat={opsByMat} fornitori={fornitori} luoghi={luoghi} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </>}
      <TaskDetailOverlay
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={() => router.refresh()}
      />
    </div>
  );
}

// ========== FORNITORE COMBOBOX ==========

function FornitoreCombobox({ value, fornitori, onChange }: {
  value: string;
  fornitori: { id: string; nome: string }[];
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [creating, setCreating] = useState(false);

  useEffect(() => { setSearch(value); }, [value]);

  const filtered = search
    ? fornitori.filter(f => f.nome.toLowerCase().includes(search.toLowerCase()))
    : fornitori;
  const exactMatch = fornitori.some(f => f.nome.toLowerCase() === search.toLowerCase());

  const handleCreate = async () => {
    if (!search.trim() || creating) return;
    setCreating(true);
    const sb = createClient();
    const { error } = await sb.from("fornitori").insert({ nome: search.trim(), tipo: "Negozio" });
    if (error) { console.error("Errore creazione fornitore:", error); toast.error("Errore creazione fornitore. Riprova."); setCreating(false); return; }
    onChange(search.trim());
    setOpen(false);
    setCreating(false);
  };

  return (
    <div className="relative">
      <input
        value={search}
        onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="w-full text-[13px] border border-[#e5e5e7] rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-ring"
        placeholder="Cerca fornitore..."
      />
      {open && (search || filtered.length > 0) && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#e5e5e7] rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.slice(0, 10).map(f => (
            <button key={f.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(f.nome); setSearch(f.nome); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#f5f5f7] border-b border-[#f0f0f0] last:border-0">
              {f.nome}
            </button>
          ))}
          {search.trim() && !exactMatch && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreate}
              className="w-full text-left px-3 py-1.5 text-[12px] text-blue-600 font-medium hover:bg-blue-50">
              + Crea: {search.trim()}
            </button>
          )}
          {filtered.length === 0 && exactMatch && (
            <div className="px-3 py-1.5 text-[11px] text-[#86868b]">Nessun risultato</div>
          )}
        </div>
      )}
    </div>
  );
}

// ========== CATALOGO TAB (RIPENSATA) ==========

const UNITA_LIST = ["pz", "mq", "ml", "kg", "lt", "mc", "set", "kit", "rotolo"];

function CatalogoTab({ catalogo: catalogoInitial, fornitori, onOpenTask }: { catalogo: CatAgg[]; fornitori: { id: string; nome: string }[]; onOpenTask: (id: string) => void }) {
  const [catalogo, setCatalogo] = useState(catalogoInitial);
  const [filterTip, setFilterTip] = useState("tutti");
  const [filterStato, setFilterStato] = useState("tutti");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [expandedUsato, setExpandedUsato] = useState<Set<string>>(new Set());

  useEffect(() => { setCatalogo(catalogoInitial); }, [catalogoInitial]);

  const saveCatField = async (id: string, field: string, value: unknown) => {
    setCatalogo(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    await updateCatalogoItem(id, { [field]: value });
  };

  const handleDelete = async (c: CatAgg) => {
    const msg = c.num_task > 0 ? `"${c.nome}" usato in ${c.num_task} task. Eliminare tutto?` : `Eliminare "${c.nome}" dal catalogo?`;
    if (!window.confirm(msg)) return;
    const sb = createClient();
    if (c.num_task > 0) {
      const { error } = await sb.from("materiali").delete().eq("catalogo_id", c.id);
      if (error) { console.error("Errore eliminazione materiali:", error); toast.error("Errore eliminazione materiali collegati."); return; }
    } else {
      const { error } = await sb.from("materiali").update({ catalogo_id: null }).eq("catalogo_id", c.id);
      if (error) { console.error("Errore scollega materiali:", error); toast.error("Errore scollega materiali."); return; }
    }
    const { error: e2 } = await sb.from("catalogo_materiali").delete().eq("id", c.id);
    if (e2) { console.error("Errore eliminazione catalogo:", e2); toast.error("Errore eliminazione dal catalogo."); return; }
    toast.success("Voce eliminata dal catalogo");
    setCatalogo(prev => prev.filter(x => x.id !== c.id));
  };

  // Filters
  const filtered = catalogo.filter(c => {
    if (filterTip !== "tutti" && c.tipologia_materiale !== filterTip) return false;
    if (filterStato === "da_acquistare" && c.quantita_da_acquistare <= 0) return false;
    if (filterStato === "completo" && c.quantita_da_acquistare > 0) return false;
    if (filterStato === "prezzo_mancante" && c.prezzo_unitario != null) return false;
    if (search && !c.nome.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Counters
  const daAcqCount = catalogo.filter(c => c.quantita_da_acquistare > 0).length;
  const completiCount = catalogo.filter(c => c.quantita_da_acquistare <= 0 && c.num_task > 0).length;
  const costoTotale = catalogo.reduce((s, c) => s + (c.costo_stimato ?? 0), 0);

  return (
    <div>
      {/* Header counters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="bg-white rounded-[10px] border border-[#e5e5e7] px-4 py-2">
          <div className="text-[10px] text-[#86868b] font-medium">Voci</div>
          <div className="text-lg font-semibold text-[#1d1d1f]">{catalogo.length}</div>
        </div>
        <div className="bg-white rounded-[10px] border border-[#e5e5e7] px-4 py-2">
          <div className="text-[10px] text-[#86868b] font-medium">Da acquistare</div>
          <div className="text-lg font-semibold text-red-600">{daAcqCount}</div>
        </div>
        <div className="bg-white rounded-[10px] border border-[#e5e5e7] px-4 py-2">
          <div className="text-[10px] text-[#86868b] font-medium">Completi</div>
          <div className="text-lg font-semibold text-green-600">{completiCount}</div>
        </div>
        <div className="bg-white rounded-[10px] border border-[#e5e5e7] px-4 py-2">
          <div className="text-[10px] text-[#86868b] font-medium">Costo totale stimato</div>
          <div className="text-lg font-semibold text-[#1d1d1f]">{costoTotale.toLocaleString("it-IT", { minimumFractionDigits: 0 })} &euro;</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select value={filterTip} onChange={(e) => setFilterTip(e.target.value)} className="text-xs border border-[#e5e5e7] rounded-lg px-2.5 py-1.5 bg-white">
          <option value="tutti">Tutte le tipologie</option>
          <option value="strutturale">Strutturale</option>
          <option value="consumo">Consumo</option>
          <option value="attrezzo">Attrezzo</option>
        </select>
        <select value={filterStato} onChange={(e) => setFilterStato(e.target.value)} className="text-xs border border-[#e5e5e7] rounded-lg px-2.5 py-1.5 bg-white">
          <option value="tutti">Tutti gli stati</option>
          <option value="da_acquistare">Da acquistare</option>
          <option value="completo">Completo</option>
          <option value="prezzo_mancante">Prezzo mancante</option>
        </select>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca..." className="text-xs border border-[#e5e5e7] rounded-lg px-2.5 py-1.5 bg-white w-48 outline-none focus:ring-1 focus:ring-ring" />
        <button onClick={() => setAdding(true)} className="text-xs text-[#86868b] hover:text-[#1d1d1f] flex items-center gap-1 ml-auto">+ Aggiungi</button>
      </div>

      {adding && (
        <div className="flex gap-2 mb-4 items-center">
          <input autoFocus value={newNome} onChange={(e) => setNewNome(e.target.value)} placeholder="Nome materiale" className="flex-1 text-xs border border-[#e5e5e7] rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-ring"
            onKeyDown={(e) => { if (e.key === "Enter" && newNome.trim()) { addCatalogoItem({ nome: newNome.trim() }); setNewNome(""); setAdding(false); } }} />
          <button onClick={async () => { if (newNome.trim()) { await addCatalogoItem({ nome: newNome.trim() }); setNewNome(""); setAdding(false); } }} className="text-xs bg-[#1d1d1f] text-white rounded px-3 py-1.5">Salva</button>
          <button onClick={() => setAdding(false)} className="text-xs text-[#86868b]">Annulla</button>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-3">
        {filtered.map((c) => {
          const isExpanded = expandedUsato.has(c.id);
          return (
            <div key={c.id} className="bg-white rounded-[12px] border border-[#e5e5e7] p-4">
              {/* Header: nome + tipologia + delete */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[14px] font-semibold text-[#1d1d1f] flex-1">{c.nome}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${TIP_MAT_COLORS[c.tipologia_materiale] ?? "bg-gray-100"}`}>{c.tipologia_materiale}</span>
                <select value={c.tipologia_materiale} onChange={(e) => saveCatField(c.id, "tipologia_materiale", e.target.value)}
                  className="text-[10px] border border-[#e5e5e7] rounded px-1.5 py-0.5 bg-white">
                  <option value="strutturale">strutturale</option><option value="consumo">consumo</option><option value="attrezzo">attrezzo</option>
                </select>
                <button onClick={() => handleDelete(c)} className="p-1 text-[#d2d2d7] hover:text-red-500"><Trash2 size={14} /></button>
              </div>

              {/* Dettagli */}
              <div className="border-t border-[#f0f0f0] pt-3 mb-3">
                <div className="text-[10px] text-[#86868b] font-medium mb-2">Dettagli</div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-[#86868b] block mb-1">Unita</label>
                    <select value={c.unita ?? ""} onChange={(e) => saveCatField(c.id, "unita_default", e.target.value || null)}
                      className="w-full text-[13px] border border-[#e5e5e7] rounded-lg px-2 py-1.5 bg-white">
                      <option value="">—</option>
                      {UNITA_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#86868b] block mb-1">Prezzo unitario</label>
                    <div className="relative">
                      <input type="number" step="0.01" defaultValue={c.prezzo_unitario ?? ""}
                        onBlur={(e) => saveCatField(c.id, "prezzo_unitario_default", e.target.value ? parseFloat(e.target.value) : null)}
                        className="w-full text-[13px] border border-[#e5e5e7] rounded-lg px-2 py-1.5 pr-12 outline-none focus:ring-1 focus:ring-ring" placeholder="0.00" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#86868b]">&euro;/{c.unita || "pz"}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#86868b] block mb-1">Fornitore preferito</label>
                    <FornitoreCombobox
                      value={c.fornitore_preferito ?? ""}
                      fornitori={fornitori}
                      onChange={(val) => saveCatField(c.id, "fornitore_preferito", val || null)}
                    />
                  </div>
                </div>
              </div>

              {/* Quantita */}
              <div className="border-t border-[#f0f0f0] pt-3 mb-3">
                <div className="text-[10px] text-[#86868b] font-medium mb-2">Quantita</div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-[#86868b] block mb-1">Necessario</label>
                    <div className="text-[13px] text-[#1d1d1f] font-medium">{c.quantita_totale_necessaria} {c.unita || ""} <span className="text-[10px] text-[#86868b] font-normal">({c.num_task} task)</span></div>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#86868b] block mb-1">Disponibile</label>
                    <input type="number" step="0.1" defaultValue={c.quantita_disponibile_globale ?? 0}
                      onBlur={(e) => saveCatField(c.id, "quantita_disponibile_globale", e.target.value ? parseFloat(e.target.value) : 0)}
                      className="w-full text-[13px] border border-[#e5e5e7] rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#86868b] block mb-1">Da acquistare</label>
                    <div className={`text-[13px] font-semibold ${c.quantita_da_acquistare > 0 ? "text-red-600" : "text-green-600"}`}>
                      {c.quantita_da_acquistare} {c.unita || ""}
                    </div>
                  </div>
                </div>
              </div>

              {/* Costo */}
              {c.prezzo_unitario != null && c.quantita_da_acquistare > 0 && (
                <div className="border-t border-[#f0f0f0] pt-3 mb-3">
                  <div className="text-[10px] text-[#86868b] font-medium mb-1">Costo stimato acquisto</div>
                  <div className="text-[15px] font-bold text-[#1d1d1f]">
                    {(c.costo_stimato ?? 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })} &euro;
                  </div>
                  <div className="text-[10px] text-[#86868b]">
                    ({c.quantita_da_acquistare} {c.unita || "pz"} &times; {c.prezzo_unitario?.toLocaleString("it-IT", { minimumFractionDigits: 2 })} &euro;/{c.unita || "pz"})
                  </div>
                </div>
              )}

              {/* Usato in */}
              {c.tasks.length > 0 && (
                <div className="border-t border-[#f0f0f0] pt-2">
                  <button onClick={() => setExpandedUsato(prev => { const n = new Set(prev); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })}
                    className="text-[10px] text-[#86868b] font-medium hover:text-[#1d1d1f] flex items-center gap-1">
                    {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                    Usato in ({c.tasks.length} task)
                  </button>
                  {isExpanded && (
                    <div className="mt-1.5 space-y-1">
                      {c.tasks.map(t => (
                        <button key={t.id} onClick={() => onOpenTask(t.id)}
                          className="w-full text-left text-[11px] text-[#86868b] flex items-center gap-1.5 hover:text-[#1d1d1f] hover:bg-[#f5f5f7] rounded px-1 -mx-1 py-0.5 transition-colors">
                          <span className="text-[#d2d2d7]">&#9656;</span>
                          <span className="truncate">{t.zona} &gt; {t.lav} &gt; <span className="text-[#1d1d1f]">{t.titolo}</span></span>
                          <span className="ml-auto flex-shrink-0 text-[#1d1d1f] font-medium">{t.quantita} {c.unita || ""}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ========== LISTA SPESA TAB ==========

function ListaSpesaTab({ catalogo, fornitori, onOpenTask }: { catalogo: CatAgg[]; fornitori: { id: string; nome: string }[]; onOpenTask: (id: string) => void }) {
  void fornitori; void onOpenTask; // available for future use
  const [viewMode, setViewMode] = useState<"fornitore" | "tipologia">("fornitore");

  const toBuy = catalogo.filter(c => c.quantita_da_acquistare > 0);
  const totalCosto = toBuy.reduce((s, c) => s + (c.costo_stimato ?? 0), 0);

  // Group by fornitore or tipologia
  const grouped = useMemo(() => {
    const map = new Map<string, CatAgg[]>();
    for (const c of toBuy) {
      const key = viewMode === "fornitore"
        ? (c.fornitore_preferito || "DA DEFINIRE")
        : (c.tipologia_materiale || "altro");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === "DA DEFINIRE") return 1;
      if (b[0] === "DA DEFINIRE") return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [toBuy, viewMode]);

  const handleExportCSV = () => {
    const rows = [["Nome", "Quantita", "Unita", "Prezzo unitario", "Costo stimato", "Fornitore"]];
    for (const c of toBuy) {
      rows.push([c.nome, String(c.quantita_da_acquistare), c.unita || "", String(c.prezzo_unitario ?? ""), String(c.costo_stimato ?? ""), c.fornitore_preferito || ""]);
    }
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "lista_spesa_nimbus.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Toggle + actions */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1 bg-[#f5f5f7] rounded-lg p-1">
          <button onClick={() => setViewMode("fornitore")} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === "fornitore" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"}`}>Per fornitore</button>
          <button onClick={() => setViewMode("tipologia")} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === "tipologia" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"}`}>Per tipologia</button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => window.print()} className="text-xs text-[#86868b] hover:text-[#1d1d1f] px-3 py-1.5 border border-[#e5e5e7] rounded-lg">Stampa lista</button>
          <button onClick={handleExportCSV} className="text-xs text-[#86868b] hover:text-[#1d1d1f] px-3 py-1.5 border border-[#e5e5e7] rounded-lg">Esporta CSV</button>
        </div>
      </div>

      {toBuy.length === 0 ? (
        <div className="text-center text-sm text-[#86868b] py-12">Nessun materiale da acquistare</div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([groupName, items]) => {
            const groupCosto = items.reduce((s, c) => s + (c.costo_stimato ?? 0), 0);
            return (
              <div key={groupName} className="bg-white rounded-[12px] border border-[#e5e5e7] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-[#f5f5f7] border-b border-[#e5e5e7]">
                  <span className="text-sm font-semibold text-[#1d1d1f] uppercase">{groupName}</span>
                  <span className="text-xs text-[#86868b]">
                    {items.length} voc{items.length === 1 ? "e" : "i"} · <span className="font-semibold text-[#1d1d1f]">{groupCosto.toLocaleString("it-IT", { minimumFractionDigits: 0 })} &euro;</span>
                  </span>
                </div>
                <div className="divide-y divide-[#f0f0f0]">
                  {items.map(c => (
                    <div key={c.id} className="flex items-center gap-4 px-4 py-2.5 text-[13px]">
                      <span className="flex-1 text-[#1d1d1f] truncate">{c.nome}</span>
                      <span className="text-[#86868b] w-20 text-right">{c.quantita_da_acquistare} {c.unita || ""}</span>
                      <span className="text-[#86868b] w-24 text-right">{c.prezzo_unitario != null ? `${c.prezzo_unitario.toLocaleString("it-IT")} \u20AC/${c.unita || "pz"}` : "—"}</span>
                      <span className="font-semibold text-[#1d1d1f] w-20 text-right">{c.costo_stimato != null ? `${c.costo_stimato.toLocaleString("it-IT")} \u20AC` : "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Total */}
          <div className="flex items-center justify-center py-4">
            <div className="text-center">
              <div className="text-[10px] text-[#86868b] font-medium mb-1">TOTALE ACQUISTI</div>
              <div className="text-2xl font-bold text-[#1d1d1f]">{totalCosto.toLocaleString("it-IT", { minimumFractionDigits: 2 })} &euro;</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
