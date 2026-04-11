"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { SuperficieState } from "../hooks/use-superficie-state";
import type { MaterialeArricchito } from "../materiali-superficie";
import { aggiornaDisponibilita } from "../actions";

const SEMAFORO_COLORS = {
  rosso: "bg-red-500",
  giallo: "bg-yellow-400",
  verde: "bg-green-500",
};

interface Props {
  state: SuperficieState;
  materiali: MaterialeArricchito[];
  materialeEarliestDate: Map<string, string>;
  onOpenDrawer: (tipo: "materiale" | "task" | "calcoli", id: string) => void;
  onUpdateDisp: (
    catalogoId: string,
    campo: "qta_magazzino" | "qta_recupero" | "qta_ordinata",
    valore: number
  ) => void;
}

// ---- Inline editor ----

function InlineEditor({
  mat,
  onUpdate,
}: {
  mat: MaterialeArricchito;
  onUpdate: (
    campo: "qta_magazzino" | "qta_recupero" | "qta_ordinata",
    valore: number
  ) => void;
}) {
  const [values, setValues] = useState({
    qta_magazzino: mat.qta_magazzino,
    qta_recupero: mat.qta_recupero,
    qta_ordinata: mat.qta_ordinata,
  });

  const handleBlur = async (
    campo: "qta_magazzino" | "qta_recupero" | "qta_ordinata"
  ) => {
    const val = Math.max(0, values[campo]);
    if (val === mat[campo]) return; // no change

    // Optimistic update — UI reacts immediately, no wait for network
    onUpdate(campo, val);

    try {
      await aggiornaDisponibilita(mat.id, campo, val);
    } catch (e) {
      // Revert on failure
      onUpdate(campo, mat[campo]);
      setValues((prev) => ({ ...prev, [campo]: mat[campo] }));
      toast.error("Errore salvataggio", {
        description: (e as Error).message,
      });
    }
  };

  const handleChange = (
    campo: "qta_magazzino" | "qta_recupero" | "qta_ordinata",
    raw: string
  ) => {
    setValues((prev) => ({
      ...prev,
      [campo]: raw === "" ? 0 : parseFloat(raw) || 0,
    }));
  };

  return (
    <div
      className="flex gap-3 items-end px-4 pb-3 pt-2 bg-[#fafafa]"
      onClick={(e) => e.stopPropagation()}
    >
      {(
        [
          ["qta_magazzino", "Magazzino"],
          ["qta_recupero", "Recupero"],
          ["qta_ordinata", "Ordinato"],
        ] as const
      ).map(([campo, label]) => (
        <div key={campo} className="flex-1">
          <label className="text-[9px] text-[#86868b] font-medium block mb-0.5">
            {label}
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={values[campo]}
            onChange={(e) => handleChange(campo, e.target.value)}
            onBlur={() => handleBlur(campo)}
            className="w-full text-[12px] border border-[#e5e5e7] rounded px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      ))}
      <div className="text-[10px] text-[#86868b] pb-1.5 flex-shrink-0">
        {mat.unita}
      </div>
    </div>
  );
}

// ---- Main component ----

function formatDateGroup(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function ListaMateriali({
  state,
  materiali,
  materialeEarliestDate,
  onOpenDrawer,
  onUpdateDisp,
}: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

  // Esc closes editor (capture phase, before DrawerStack handler)
  useEffect(() => {
    if (!editingId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        setEditingId(null);
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [editingId]);

  const isGrouped = state.raggruppa !== "nessuno";

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
        case "data":
          k = materialeEarliestDate.get(m.id) || "senza-data";
          break;
        default:
          k = "—";
      }
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(m);
    }
    return map;
  }, [materiali, state.raggruppa, isGrouped, materialeEarliestDate]);

  const toggleGroup = (k: string) => {
    setCollapsed((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  };

  const toggleEditor = (id: string) => {
    setEditingId((prev) => (prev === id ? null : id));
  };

  const showCategoriaWarning = state.raggruppa === "categoria_comp";

  const renderItem = (m: MaterialeArricchito) => {
    const isEditing = editingId === m.id;
    const hasDisp =
      m.qta_magazzino > 0 || m.qta_recupero > 0 || m.qta_ordinata > 0;

    return (
      <div key={m.id} className="border-b border-[#f0f0f0] last:border-0">
        {/* Row */}
        <div
          onClick={() => onOpenDrawer("materiale", m.id)}
          className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-[#f5f5f7] transition-colors cursor-pointer"
        >
          {/* Pallino cliccabile */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleEditor(m.id);
            }}
            className={`p-1 -m-1 rounded-full transition-colors ${isEditing ? "bg-gray-200" : "hover:bg-gray-200"}`}
            title="Modifica disponibilita"
          >
            <span
              className={`block w-2.5 h-2.5 rounded-full ${SEMAFORO_COLORS[m.stato_semaforo]}`}
            />
          </button>

          {/* Name + info */}
          <div className="flex-1 min-w-0">
            <div className="text-[13px] text-[#1d1d1f] font-medium truncate">
              {m.nome}
            </div>
            <div className="text-[10px] text-[#86868b]">
              {m.fornitore} · {m.categoria_comp || "non classificato"}
            </div>
            {hasDisp && (
              <div className="text-[9px] text-[#b0b0b5] mt-0.5">
                mag {m.qta_magazzino} · rec {m.qta_recupero} · ord{" "}
                {m.qta_ordinata}
              </div>
            )}
          </div>

          {/* Quantity */}
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

          {/* Cost */}
          <div className="text-[11px] text-[#86868b] w-16 text-right flex-shrink-0">
            {m.costo_da_comprare > 0
              ? `${m.costo_da_comprare.toLocaleString("it-IT", { maximumFractionDigits: 0 })} €`
              : "0 €"}
          </div>
        </div>

        {/* Inline editor */}
        {isEditing && (
          <InlineEditor
            key={m.id}
            mat={m}
            onUpdate={(campo, valore) => onUpdateDisp(m.id, campo, valore)}
          />
        )}
      </div>
    );
  };

  const isDateGrouping = state.raggruppa === "data";

  const sortedGroups = useMemo(() => {
    if (!groups) return null;
    return Array.from(groups.entries()).sort((a, b) => {
      const tailKeys = ["Senza categoria", "Non classificato", "senza-data"];
      const aIsTail = tailKeys.includes(a[0]);
      const bIsTail = tailKeys.includes(b[0]);
      if (aIsTail && !bIsTail) return 1;
      if (!aIsTail && bIsTail) return -1;
      if (isDateGrouping) {
        // Chronological sort for dates
        return a[0].localeCompare(b[0]);
      }
      return a[0].localeCompare(b[0]);
    });
  }, [groups, isDateGrouping]);

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
                  {isDateGrouping && groupName !== "senza-data"
                    ? formatDateGroup(groupName)
                    : groupName === "senza-data"
                      ? "Senza data"
                      : groupName}
                </span>
                {isDateGrouping &&
                  groupName !== "senza-data" &&
                  isToday(groupName) && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                      oggi
                    </span>
                  )}
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
