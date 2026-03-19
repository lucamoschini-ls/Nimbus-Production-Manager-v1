"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface CostoZona {
  zona: string;
  costo_manodopera: number;
  costo_materiali: number;
}

interface TaskConCosto {
  id: string;
  titolo: string;
  zona_nome: string;
  zona_colore: string;
  zona_ordine: number;
  lavorazione_nome: string;
  costo_manodopera: number | null;
}

interface Props {
  costiZona: CostoZona[];
  taskConCosti: TaskConCosto[];
}

function eur(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export function CostiClient({ costiZona, taskConCosti }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const totaleManodopera = costiZona.reduce((s, z) => s + z.costo_manodopera, 0);
  const totaleMateriali = costiZona.reduce((s, z) => s + z.costo_materiali, 0);
  const totaleGenerale = totaleManodopera + totaleMateriali;

  const toggleZona = (nome: string) => {
    const next = new Set(expanded);
    if (next.has(nome)) next.delete(nome);
    else next.add(nome);
    setExpanded(next);
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#1d1d1f] mb-6">Costi</h1>

      {/* Totale grande */}
      <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-6 mb-6">
        <p className="text-xs text-[#86868b] font-medium">Totale cantiere</p>
        <p className="text-4xl font-bold text-[#1d1d1f] mt-1">{eur(totaleGenerale)}</p>
        <div className="flex gap-6 mt-3 text-sm text-[#86868b]">
          <span>Manodopera: <span className="text-[#1d1d1f] font-medium">{eur(totaleManodopera)}</span></span>
          <span>Materiali: <span className="text-[#1d1d1f] font-medium">{eur(totaleMateriali)}</span></span>
        </div>
      </div>

      {/* Tabella per zona */}
      <div className="bg-white rounded-[12px] border border-[#e5e5e7] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-[#e5e5e7] bg-[#f5f5f7]">
          <span className="text-xs font-semibold text-[#1d1d1f]">Zona</span>
          <span className="text-xs font-semibold text-[#1d1d1f] text-right">Manodopera</span>
          <span className="text-xs font-semibold text-[#1d1d1f] text-right">Materiali</span>
          <span className="text-xs font-semibold text-[#1d1d1f] text-right">Totale</span>
        </div>

        {costiZona.map((z) => {
          const totZona = z.costo_manodopera + z.costo_materiali;
          const zonaTasks = taskConCosti.filter((t) => t.zona_nome === z.zona);
          const isExpanded = expanded.has(z.zona);

          return (
            <div key={z.zona}>
              <button
                onClick={() => toggleZona(z.zona)}
                className="w-full grid grid-cols-4 gap-4 px-4 py-3 border-b border-[#e5e5e7] hover:bg-[#f5f5f7]/50 text-left"
              >
                <span className="text-sm text-[#1d1d1f] font-medium flex items-center gap-2">
                  {zonaTasks.length > 0 ? (
                    isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
                  ) : (
                    <span className="w-3" />
                  )}
                  {z.zona}
                </span>
                <span className="text-sm text-[#1d1d1f] text-right">{eur(z.costo_manodopera)}</span>
                <span className="text-sm text-[#1d1d1f] text-right">{eur(z.costo_materiali)}</span>
                <span className="text-sm font-medium text-[#1d1d1f] text-right">{eur(totZona)}</span>
              </button>

              {isExpanded && zonaTasks.length > 0 && (
                <div className="bg-[#f5f5f7]/30">
                  {zonaTasks.map((t) => (
                    <div
                      key={t.id}
                      className="grid grid-cols-4 gap-4 px-4 py-2 border-b border-[#e5e5e7]/50 pl-10"
                    >
                      <span className="text-xs text-[#86868b] truncate">{t.titolo}</span>
                      <span className="text-xs text-[#86868b] text-right">
                        {t.costo_manodopera ? eur(t.costo_manodopera) : "-"}
                      </span>
                      <span className="text-xs text-[#86868b] text-right">-</span>
                      <span className="text-xs text-[#86868b] text-right">
                        {t.costo_manodopera ? eur(t.costo_manodopera) : "-"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Totale */}
        <div className="grid grid-cols-4 gap-4 px-4 py-3 bg-[#f5f5f7]">
          <span className="text-sm font-bold text-[#1d1d1f]">TOTALE</span>
          <span className="text-sm font-bold text-[#1d1d1f] text-right">{eur(totaleManodopera)}</span>
          <span className="text-sm font-bold text-[#1d1d1f] text-right">{eur(totaleMateriali)}</span>
          <span className="text-sm font-bold text-[#1d1d1f] text-right">{eur(totaleGenerale)}</span>
        </div>
      </div>
    </div>
  );
}
