"use client";

import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import type { SuperficieState } from "../hooks/use-superficie-state";
import type { MaterialeArricchito } from "../materiali-superficie";

interface Props {
  state: SuperficieState;
  materiali: MaterialeArricchito[];
  onReset: () => void;
}

const RAGGRUPPA_LABELS: Record<string, string> = {
  nessuno: "Tutti",
  fornitore: "Per fornitore",
  categoria_comp: "Per categoria",
  categoria_tech: "Per tipologia",
  zona: "Per zona",
  data: "Per data",
};

export function BussolaBar({ state, materiali, onReset }: Props) {
  const segments: string[] = ["Materiali"];
  if (state.raggruppa !== "nessuno")
    segments.push(RAGGRUPPA_LABELS[state.raggruppa]);
  if (state.filtriCat.length > 0)
    segments.push(`Filtro: ${state.filtriCat.join(", ")}`);
  if (state.cerca) segments.push(`"${state.cerca}"`);
  if (state.drawers.length > 0) {
    const last = state.drawers[state.drawers.length - 1];
    segments.push(`${last.tipo}: ${last.id.slice(0, 8)}...`);
  }

  const counters = useMemo(() => {
    const totale = materiali.length;
    const rossi = materiali.filter(
      (m) => m.stato_semaforo === "rosso"
    ).length;
    const costo = materiali.reduce((sum, m) => sum + m.costo_da_comprare, 0);
    return { totale, rossi, costo };
  }, [materiali]);

  return (
    <div className="flex-shrink-0 h-[50px] bg-white border-b border-[#e5e5e7] flex items-center px-4 gap-4 z-30">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {segments.map((s, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-[#d1d1d6]">/</span>}
            <span
              className={`text-[13px] ${i === segments.length - 1 ? "text-[#1d1d1f] font-medium" : "text-[#86868b] hover:text-[#1d1d1f] cursor-pointer"}`}
            >
              {s}
            </span>
          </span>
        ))}
      </div>

      {/* Reactive counters */}
      <div className="flex items-center gap-3 text-[12px] text-[#86868b] flex-shrink-0">
        <span>{counters.totale} voci</span>
        {counters.rossi > 0 && (
          <span className="text-red-500 font-medium">
            {counters.rossi} in rosso
          </span>
        )}
        <span className="font-medium text-[#1d1d1f]">
          {counters.costo.toLocaleString("it-IT", {
            maximumFractionDigits: 0,
          })}{" "}
          € da comprare
        </span>
      </div>

      {/* Reset */}
      <button
        onClick={onReset}
        className="flex items-center gap-1 text-[11px] text-[#86868b] hover:text-[#1d1d1f] px-2 py-1 rounded-md hover:bg-[#f5f5f7] flex-shrink-0"
      >
        <RotateCcw size={12} /> Reset
      </button>
    </div>
  );
}
