"use client";

import { Search } from "lucide-react";
import type {
  Raggruppamento,
  FinestraTemporale,
  SuperficieState,
} from "../hooks/use-superficie-state";

const RAGGRUPPAMENTI: { value: Raggruppamento; label: string }[] = [
  { value: "nessuno", label: "Nessuno" },
  { value: "fornitore", label: "Fornitore" },
  { value: "categoria_comp", label: "Categoria" },
  { value: "categoria_tech", label: "Tipologia" },
  { value: "zona", label: "Zona" },
  { value: "data", label: "Data" },
];

const CATEGORIE = ["strutturale", "consumo", "attrezzo", "recupero", "servizio"];

const FINESTRE: { value: FinestraTemporale; label: string }[] = [
  { value: "oggi", label: "Oggi" },
  { value: "settimana", label: "Questa settimana" },
  { value: "stagione", label: "Fino al 1 maggio" },
];

const CAT_COLORS: Record<string, string> = {
  strutturale: "bg-orange-100 text-orange-700 border-orange-200",
  consumo: "bg-blue-100 text-blue-700 border-blue-200",
  attrezzo: "bg-purple-100 text-purple-700 border-purple-200",
  recupero: "bg-teal-100 text-teal-700 border-teal-200",
  servizio: "bg-gray-100 text-gray-700 border-gray-200",
};

interface Props {
  state: SuperficieState;
  fornitori: string[];
  onRaggruppa: (v: Raggruppamento) => void;
  onToggleCat: (cat: string) => void;
  onToggleForn: (forn: string) => void;
  onFinestra: (v: FinestraTemporale) => void;
  onCerca: (v: string) => void;
  onPreset: (p: "acquisti" | "cantiere" | "catalogo") => void;
}

export function PannelloControllo({
  state,
  fornitori,
  onRaggruppa,
  onToggleCat,
  onToggleForn,
  onFinestra,
  onCerca,
  onPreset,
}: Props) {
  const presetMatch = (p: string) => {
    if (p === "acquisti")
      return state.raggruppa === "fornitore" && state.finestra === "settimana";
    if (p === "cantiere")
      return state.raggruppa === "zona" && state.finestra === "oggi";
    if (p === "catalogo")
      return (
        state.raggruppa === "nessuno" &&
        state.finestra === "stagione" &&
        state.filtriCat.length === 0
      );
    return false;
  };

  return (
    <div className="w-[280px] flex-shrink-0 bg-[#fafafa] border-r border-[#e5e5e7] overflow-y-auto p-4 space-y-5">
      {/* Preset */}
      <div>
        <div className="text-[10px] text-[#86868b] font-semibold uppercase tracking-wide mb-2">
          Preset
        </div>
        <div className="flex gap-1.5">
          {(["acquisti", "cantiere", "catalogo"] as const).map((p) => (
            <button
              key={p}
              onClick={() => onPreset(p)}
              className={`flex-1 text-[11px] font-medium px-2 py-1.5 rounded-lg border transition-colors capitalize ${presetMatch(p) ? "bg-[#1d1d1f] text-white border-[#1d1d1f]" : "bg-white text-[#86868b] border-[#e5e5e7] hover:text-[#1d1d1f]"}`}
            >
              {p === "cantiere"
                ? "Cantiere"
                : p === "acquisti"
                  ? "Acquisti"
                  : "Catalogo"}
            </button>
          ))}
        </div>
      </div>

      {/* Raggruppa per */}
      <div>
        <div className="text-[10px] text-[#86868b] font-semibold uppercase tracking-wide mb-2">
          Raggruppa per
        </div>
        <div className="space-y-1">
          {RAGGRUPPAMENTI.map((r) => (
            <label key={r.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="raggruppa"
                checked={state.raggruppa === r.value}
                onChange={() => onRaggruppa(r.value)}
                className="w-3.5 h-3.5 text-[#1d1d1f]"
              />
              <span className="text-[12px] text-[#1d1d1f]">{r.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Categorie comportamentali */}
      <div>
        <div className="text-[10px] text-[#86868b] font-semibold uppercase tracking-wide mb-2">
          Categoria
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIE.map((cat) => {
            const active = state.filtriCat.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => onToggleCat(cat)}
                className={`text-[10px] font-medium px-2 py-1 rounded-full border transition-colors capitalize ${active ? CAT_COLORS[cat] : "bg-white text-[#86868b] border-[#e5e5e7]"}`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fornitori multi-select */}
      <div>
        <div className="text-[10px] text-[#86868b] font-semibold uppercase tracking-wide mb-2">
          Fornitore
          {state.filtriForn.length > 0 && (
            <span className="ml-1 text-[#1d1d1f]">
              ({state.filtriForn.length})
            </span>
          )}
        </div>
        <div className="max-h-[160px] overflow-y-auto space-y-0.5 border border-[#e5e5e7] rounded-lg p-2 bg-white">
          {fornitori.map((f) => {
            const active = state.filtriForn.includes(f);
            return (
              <label
                key={f}
                className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-[#f5f5f7] px-1 rounded"
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => onToggleForn(f)}
                  className="w-3 h-3 rounded"
                />
                <span
                  className={`text-[11px] truncate ${active ? "text-[#1d1d1f] font-medium" : "text-[#86868b]"}`}
                >
                  {f}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Finestra temporale */}
      <div>
        <div className="text-[10px] text-[#86868b] font-semibold uppercase tracking-wide mb-2">
          Finestra
        </div>
        <div className="space-y-1">
          {FINESTRE.map((f) => (
            <label key={f.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="finestra"
                checked={state.finestra === f.value}
                onChange={() => onFinestra(f.value)}
                className="w-3.5 h-3.5 text-[#1d1d1f]"
              />
              <span className="text-[12px] text-[#1d1d1f]">{f.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Ricerca */}
      <div>
        <div className="text-[10px] text-[#86868b] font-semibold uppercase tracking-wide mb-2">
          Cerca
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2 text-[#86868b]" />
          <input
            value={state.cerca}
            onChange={(e) => onCerca(e.target.value)}
            placeholder="Cerca materiale..."
            className="w-full text-[12px] border border-[#e5e5e7] rounded-lg pl-8 pr-3 py-1.5 outline-none focus:ring-1 focus:ring-ring bg-white"
          />
        </div>
      </div>
    </div>
  );
}
