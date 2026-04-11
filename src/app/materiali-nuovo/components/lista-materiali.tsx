"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import type { SuperficieState } from "../hooks/use-superficie-state";
import type { MaterialeArricchito } from "../materiali-superficie";

const SEMAFORO_COLORS = {
  rosso: "bg-red-500",
  giallo: "bg-yellow-400",
  verde: "bg-green-500",
};

interface Props {
  state: SuperficieState;
  materiali: MaterialeArricchito[];
  onOpenDrawer: (tipo: "materiale" | "task" | "calcoli", id: string) => void;
}

export function ListaMateriali({ state, materiali, onOpenDrawer }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const isGrouped =
    state.raggruppa !== "nessuno" && state.raggruppa !== "data";

  const groups = useMemo(() => {
    if (!isGrouped) return null;
    const map = new Map<string, MaterialeArricchito[]>();
    for (const m of materiali) {
      let k: string;
      switch (state.raggruppa) {
        case "fornitore":
          k = m.fornitore;
          break;
        case "categoria_comp":
          k = m.categoria_comp || "Senza categoria";
          break;
        case "categoria_tech":
          k = m.tipologia || "Non classificato";
          break;
        case "zona":
          k = "Tutte le zone";
          break;
        default:
          k = "—";
      }
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(m);
    }
    return map;
  }, [materiali, state.raggruppa, isGrouped]);

  const toggleGroup = (k: string) => {
    setCollapsed((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  };

  const showCategoriaWarning = state.raggruppa === "categoria_comp";

  const renderItem = (m: MaterialeArricchito) => (
    <button
      key={m.id}
      onClick={() => onOpenDrawer("materiale", m.id)}
      className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-[#f5f5f7] transition-colors border-b border-[#f0f0f0] last:border-0"
    >
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${SEMAFORO_COLORS[m.stato_semaforo]}`}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-[#1d1d1f] font-medium truncate">
          {m.nome}
        </div>
        <div className="text-[10px] text-[#86868b]">
          {m.fornitore} · {m.categoria_comp || "non classificato"}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-[13px] font-medium text-[#1d1d1f]">
          {m.fabbisogno_calcolato.toLocaleString("it-IT")} {m.unita}
        </div>
        {m.da_comprare > 0 && (
          <div className="text-[10px] text-red-500 font-medium">
            da comprare: {m.da_comprare.toLocaleString("it-IT")}
          </div>
        )}
      </div>
      <div className="text-[11px] text-[#86868b] w-16 text-right flex-shrink-0">
        {m.costo_da_comprare > 0
          ? `${m.costo_da_comprare.toLocaleString("it-IT", { maximumFractionDigits: 0 })} €`
          : "0 €"}
      </div>
    </button>
  );

  const sortedGroups = groups
    ? Array.from(groups.entries()).sort((a, b) => {
        if (a[0] === "Senza categoria" || a[0] === "Non classificato")
          return 1;
        if (b[0] === "Senza categoria" || b[0] === "Non classificato")
          return -1;
        return a[0].localeCompare(b[0]);
      })
    : null;

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      {showCategoriaWarning && (
        <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border-b border-amber-200 text-[12px] text-amber-800">
          <AlertTriangle
            size={14}
            className="flex-shrink-0 mt-0.5 text-amber-500"
          />
          <span>
            I materiali non sono ancora classificati per categoria
            comportamentale. Il filtro per categoria mostrera risultati
            incompleti finche non saranno classificati.
          </span>
        </div>
      )}

      {isGrouped && sortedGroups ? (
        sortedGroups.map(([groupName, items]) => {
          const groupCost = items.reduce(
            (sum, m) => sum + m.costo_da_comprare,
            0
          );
          return (
            <div key={groupName}>
              <button
                onClick={() => toggleGroup(groupName)}
                className="w-full flex items-center gap-2 px-4 py-2 bg-[#f5f5f7] border-b border-[#e5e5e7] sticky top-0 z-10 hover:bg-[#ebebed] transition-colors"
              >
                {collapsed.has(groupName) ? (
                  <ChevronRight size={14} className="text-[#86868b]" />
                ) : (
                  <ChevronDown size={14} className="text-[#86868b]" />
                )}
                <span className="text-[12px] font-semibold text-[#1d1d1f] uppercase">
                  {groupName}
                </span>
                <span className="text-[10px] text-[#86868b]">
                  ({items.length})
                </span>
                {groupCost > 0 && (
                  <span className="text-[10px] text-[#86868b] ml-auto">
                    {groupCost.toLocaleString("it-IT", {
                      maximumFractionDigits: 0,
                    })}{" "}
                    €
                  </span>
                )}
              </button>
              {!collapsed.has(groupName) && items.map(renderItem)}
            </div>
          );
        })
      ) : (
        materiali.map(renderItem)
      )}

      {materiali.length === 0 && (
        <div className="flex items-center justify-center h-32 text-[13px] text-[#86868b]">
          Nessun materiale corrisponde ai filtri
        </div>
      )}
    </div>
  );
}
