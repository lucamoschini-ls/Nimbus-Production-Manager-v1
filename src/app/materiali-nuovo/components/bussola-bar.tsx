"use client";

import { useMemo } from "react";
import { RotateCcw, Calculator } from "lucide-react";
import type { SuperficieState } from "../hooks/use-superficie-state";
import type { TabSuperficie } from "../hooks/use-superficie-state";
import type { MaterialeArricchito } from "../materiali-superficie";

interface Props {
  state: SuperficieState;
  materiali: MaterialeArricchito[];
  onReset: () => void;
  onOpenCalcoli: () => void;
  onSetTab: (tab: TabSuperficie) => void;
  onGoToLista: () => void;
}

const RAGGRUPPA_LABELS: Record<string, string> = {
  nessuno: "Tutti",
  fornitore: "Per fornitore",
  categoria_comp: "Per categoria",
  categoria_tech: "Per tipologia",
  zona: "Per zona",
  data: "Per data",
};

const TAB_LABELS: Record<string, string> = {
  lista: "Lista",
  catalogo: "Catalogo",
  calcolatore: "Calcolatore",
};

export function BussolaBar({
  state,
  materiali,
  onReset,
  onOpenCalcoli,
  onSetTab,
  onGoToLista,
}: Props) {
  // Build breadcrumb segments with click handlers
  type Segment = { label: string; onClick?: () => void };
  const segments: Segment[] = [];

  // "Materiali" — always first, click resets to lista default
  segments.push({ label: "Materiali", onClick: onReset });

  // Tab name — clicking "Lista" clears drawers without changing filters
  segments.push({
    label: TAB_LABELS[state.tab] || "Lista",
    onClick: state.tab === "lista" ? onGoToLista : () => onSetTab(state.tab),
  });

  // Rest only for Lista tab
  if (state.tab === "lista") {
    if (state.raggruppa !== "nessuno")
      segments.push({ label: RAGGRUPPA_LABELS[state.raggruppa] });
    if (state.filtriCat.length > 0)
      segments.push({ label: `Filtro: ${state.filtriCat.join(", ")}` });
    if (state.cerca) segments.push({ label: `"${state.cerca}"` });
    if (state.drawers.length > 0) {
      const last = state.drawers[state.drawers.length - 1];
      segments.push({ label: `${last.tipo}: ${last.id.slice(0, 8)}...` });
    }
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
      {/* Clickable breadcrumb */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {segments.map((s, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-[#d1d1d6]">/</span>}
            {s.onClick ? (
              <button
                onClick={s.onClick}
                className={`text-[13px] ${i === segments.length - 1 ? "text-[#1d1d1f] font-medium" : "text-[#86868b] hover:text-[#1d1d1f]"}`}
              >
                {s.label}
              </button>
            ) : (
              <span className="text-[13px] text-[#1d1d1f] font-medium">
                {s.label}
              </span>
            )}
          </span>
        ))}
      </div>

      {/* Reactive counters (lista tab only) */}
      {state.tab === "lista" && (
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
      )}

      {/* Calcoli (lista tab only) */}
      {state.tab === "lista" && (
        <button
          onClick={onOpenCalcoli}
          className="flex items-center gap-1 text-[11px] text-[#86868b] hover:text-[#1d1d1f] px-2 py-1 rounded-md hover:bg-[#f5f5f7] flex-shrink-0"
          title="Driver e coefficienti"
        >
          <Calculator size={13} />
        </button>
      )}

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
