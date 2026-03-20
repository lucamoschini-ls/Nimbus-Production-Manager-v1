"use client";

import { useState } from "react";
import { Package, Filter } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { updateMaterialeField } from "./actions";

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

export interface TrasportoOp {
  id: string; titolo: string; organizzato: boolean; stato: string;
  data_inizio: string | null; data_fine: string | null; note: string | null;
  luogo_partenza: string | null;
  fornitore: { nome: string; stato: string } | null;
  materiale: {
    nome: string;
    task: { titolo: string; lavorazione: { nome: string; zona: { nome: string; colore: string } } };
  };
}

interface Props {
  materiali: Materiale[]; zone: Zona[];
  trasportoOps: TrasportoOp[];
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

export function MaterialiClient({ materiali, zone, trasportoOps }: Props) {
  const [activeTab, setActiveTab] = useState<"materiali" | "trasporti">("materiali");
  const [filterZona, setFilterZona] = useState("tutti");
  const [filterStato, setFilterStato] = useState("tutti");
  const [filterProvenienza, setFilterProvenienza] = useState("tutti");

  const filtered = materiali.filter((m) => {
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
      <h1 className="text-2xl font-semibold text-[#1d1d1f] mb-4">Materiali e Logistica</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#f5f5f7] rounded-lg p-1 w-fit">
        <button onClick={() => setActiveTab("materiali")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "materiali" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"}`}>
          Materiali ({totale})
        </button>
        <button onClick={() => setActiveTab("trasporti")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "trasporti" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"}`}>
          Trasporti ({trasportoOps.length})
        </button>
      </div>

      {activeTab === "trasporti" && (
        <TrasportiSection ops={trasportoOps} />
      )}

      {activeTab === "materiali" && <>
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
                {/* ROW 1: Nome + task */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[#1d1d1f]">{m.nome}</h3>
                    <p className="text-[11px] text-[#86868b] mt-0.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ backgroundColor: m.task?.lavorazione?.zona?.colore }} />
                      {m.task?.lavorazione?.zona?.nome} &gt; {m.task?.lavorazione?.nome} &gt; {m.task?.titolo}
                    </p>
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
              </div>
            );
          })}
        </div>
      )}
      </>}
    </div>
  );
}

// ========== TRASPORTI SECTION ==========

const STATO_FORN_CLS: Record<string, string> = {
  da_trovare: "bg-red-100 text-red-700", contattato: "bg-amber-100 text-amber-700",
  confermato: "bg-blue-100 text-blue-700", sopralluogo_fatto: "bg-indigo-100 text-indigo-700",
  materiali_definiti: "bg-violet-100 text-violet-700", pronto: "bg-green-100 text-green-700",
};

function TrasportiSection({ ops }: { ops: TrasportoOp[] }) {
  const daOrganizzare = ops.filter((o) => !o.organizzato).length;

  // Raggruppa per luogo_partenza
  const grouped: Record<string, TrasportoOp[]> = {};
  ops.forEach((op) => {
    const key = op.luogo_partenza?.trim() || "Da definire";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(op);
  });
  const luoghi = Object.keys(grouped).sort((a, b) => {
    if (a === "Da definire") return 1;
    if (b === "Da definire") return -1;
    return a.localeCompare(b);
  });
  const numLuoghi = luoghi.filter((l) => l !== "Da definire").length;

  return (
    <div>
      {/* Contatori */}
      <div className="flex flex-wrap gap-3 mb-4">
        {daOrganizzare > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-[12px] px-4 py-3">
            <p className="text-sm font-medium text-amber-800">{daOrganizzare} trasport{daOrganizzare === 1 ? "o" : "i"} da organizzare</p>
          </div>
        )}
        {numLuoghi > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-[12px] px-4 py-3">
            <p className="text-sm font-medium text-blue-800">{numLuoghi} luogh{numLuoghi === 1 ? "o" : "i"} di partenza</p>
          </div>
        )}
      </div>

      {ops.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[#86868b]">
          <Package size={40} strokeWidth={1.2} />
          <p className="text-sm mt-3 font-medium">Nessuna operazione di trasporto</p>
          <p className="text-xs mt-1">Aggiungi operazioni con tipologia &ldquo;trasporto&rdquo; nei materiali</p>
        </div>
      ) : (
        <div className="space-y-6">
          {luoghi.map((luogo) => (
            <div key={luogo}>
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-2">
                {luogo}
                <span className="text-[#86868b] font-normal ml-2">({grouped[luogo].length} trasport{grouped[luogo].length === 1 ? "o" : "i"})</span>
              </h3>
              <div className="space-y-2">
                {grouped[luogo].map((op) => (
                  <div key={op.id} className="bg-white rounded-[12px] border border-[#e5e5e7] p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-[#1d1d1f]">{op.titolo}</h4>
                        <p className="text-[10px] text-[#86868b] mt-0.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ backgroundColor: op.materiale?.task?.lavorazione?.zona?.colore }} />
                          {op.materiale?.task?.lavorazione?.zona?.nome} &gt; {op.materiale?.task?.titolo} &gt; {op.materiale?.nome}
                        </p>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={op.organizzato}
                          onChange={(e) => {
                            import("@/lib/supabase/client").then(({ createClient }) => {
                              const sb = createClient();
                              sb.from("operazioni").update({ organizzato: e.target.checked }).eq("id", op.id).then(() => window.location.reload());
                            });
                          }}
                          className="rounded border-[#e5e5e7] w-4 h-4"
                        />
                        <span className={op.organizzato ? "text-green-700 font-medium" : "text-[#86868b]"}>
                          {op.organizzato ? "Organizzato" : "Da organizzare"}
                        </span>
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {op.fornitore && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATO_FORN_CLS[op.fornitore.stato] ?? "bg-gray-100 text-gray-600"}`}>
                          {op.fornitore.nome} — {op.fornitore.stato.replace(/_/g, " ")}
                        </span>
                      )}
                      {op.data_fine && <span className="text-[#86868b]">{new Date(op.data_fine).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}</span>}
                      {op.note && <span className="text-[#86868b] truncate">{op.note}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
