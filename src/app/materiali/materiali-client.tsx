"use client";

import { useState } from "react";
import { Package, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const PROVENIENZA_COLORS: Record<string, string> = {
  acquisto: "bg-pink-100 text-pink-700",
  magazzino: "bg-gray-100 text-gray-600",
  noleggio: "bg-blue-100 text-blue-700",
  con_fornitore: "bg-violet-100 text-violet-700",
};

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
  data_consegna_prevista: string | null;
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
interface Props { materiali: Materiale[]; zone: Zona[]; }

function matStato(m: Materiale) {
  const disp = m.quantita_disponibile ?? 0;
  const ord = m.quantita_ordinata ?? 0;
  const tot = m.quantita ?? 0;
  if (tot > 0 && disp >= tot) return { label: "Completo", cls: "bg-green-100 text-green-700" };
  if (ord > 0 && disp > 0) return { label: "Parziale", cls: "bg-amber-100 text-amber-700" };
  if (ord > 0) return { label: "Ordinato", cls: "bg-amber-100 text-amber-700" };
  return { label: "Da acquistare", cls: "bg-red-100 text-red-700" };
}

function matStatoKey(m: Materiale): string {
  const disp = m.quantita_disponibile ?? 0;
  const ord = m.quantita_ordinata ?? 0;
  const tot = m.quantita ?? 0;
  if (tot > 0 && disp >= tot) return "completo";
  if (ord > 0) return "ordinato";
  return "da_acquistare";
}

export function MaterialiClient({ materiali, zone }: Props) {
  const [filterZona, setFilterZona] = useState("tutti");
  const [filterStato, setFilterStato] = useState("tutti");
  const [filterProvenienza, setFilterProvenienza] = useState("tutti");

  const filtered = materiali.filter((m) => {
    if (filterZona !== "tutti" && m.task?.lavorazione?.zona?.id !== filterZona) return false;
    if (filterStato !== "tutti" && matStatoKey(m) !== filterStato) return false;
    if (filterProvenienza !== "tutti" && m.provenienza !== filterProvenienza) return false;
    return true;
  });

  const totale = materiali.length;
  const daAcquistare = materiali.filter((m) => matStatoKey(m) === "da_acquistare").length;
  const ordinati = materiali.filter((m) => matStatoKey(m) === "ordinato").length;
  const completi = materiali.filter((m) => matStatoKey(m) === "completo").length;
  const costoTotale = materiali.reduce((sum, m) => sum + (m.costo_totale ?? 0), 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#1d1d1f] mb-6">Materiali</h1>

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
          <p className="text-xs text-[#86868b] font-medium">Ordinati</p>
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
            <SelectItem value="tutti">Tutti gli stati</SelectItem>
            <SelectItem value="da_acquistare">Da acquistare</SelectItem>
            <SelectItem value="ordinato">Ordinato</SelectItem>
            <SelectItem value="completo">Completo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterProvenienza} onValueChange={setFilterProvenienza}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Provenienza" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutte</SelectItem>
            <SelectItem value="acquisto">Acquisto</SelectItem>
            <SelectItem value="magazzino">Magazzino</SelectItem>
            <SelectItem value="noleggio">Noleggio</SelectItem>
            <SelectItem value="con_fornitore">Con fornitore</SelectItem>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((m) => {
            const stato = matStato(m);
            const disp = m.quantita_disponibile ?? 0;
            const tot = m.quantita ?? 0;
            return (
              <div key={m.id} className="bg-white rounded-[12px] border border-[#e5e5e7] p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-medium text-[#1d1d1f]">{m.nome}</h3>
                  <Badge className={`${stato.cls} text-[10px]`}>{stato.label}</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-[#86868b] mb-2">
                  {tot > 0 && (
                    <span className="font-medium text-[#1d1d1f]">
                      {disp}/{tot}{m.unita ? ` ${m.unita}` : ""}
                    </span>
                  )}
                  {(m.quantita_ordinata ?? 0) > 0 && (
                    <span>({m.quantita_ordinata} ordinat{(m.quantita_ordinata ?? 0) === 1 ? "o" : "i"})</span>
                  )}
                  {m.costo_totale != null && (
                    <span>{m.costo_totale.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}</span>
                  )}
                  {m.provenienza && (
                    <Badge className={`text-[10px] ${PROVENIENZA_COLORS[m.provenienza] ?? ""}`}>
                      {m.provenienza.replace("_", " ")}
                    </Badge>
                  )}
                </div>

                <div className="text-[10px] text-[#86868b] border-t border-[#e5e5e7] pt-2 mt-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: m.task?.lavorazione?.zona?.colore }} />
                  {m.task?.lavorazione?.zona?.nome} &gt; {m.task?.titolo}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
