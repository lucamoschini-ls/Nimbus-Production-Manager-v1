"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { MaterialeArricchito } from "../materiali-superficie";

const SEMAFORO_COLORS = {
  rosso: "bg-red-500",
  giallo: "bg-yellow-400",
  verde: "bg-green-500",
};

interface Props {
  materiali: MaterialeArricchito[];
}

export function CatalogoTab({ materiali }: Props) {
  const [cerca, setCerca] = useState("");

  const filtrati = useMemo(() => {
    if (!cerca) return materiali;
    const q = cerca.toLowerCase();
    return materiali.filter((m) => m.nome.toLowerCase().includes(q));
  }, [materiali, cerca]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[#e5e5e7] bg-white">
        <span className="text-[12px] text-[#86868b]">
          {filtrati.length} voci
        </span>
        <div className="relative flex-1 max-w-[300px]">
          <Search
            size={14}
            className="absolute left-2.5 top-2 text-[#86868b]"
          />
          <input
            value={cerca}
            onChange={(e) => setCerca(e.target.value)}
            placeholder="Cerca nel catalogo..."
            className="w-full text-[12px] border border-[#e5e5e7] rounded-lg pl-8 pr-3 py-1.5 outline-none focus:ring-1 focus:ring-ring bg-white"
          />
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[auto_1fr_60px_80px_120px_80px_80px_80px] gap-2 px-6 py-2 bg-[#fafafa] border-b border-[#e5e5e7] text-[10px] text-[#86868b] font-semibold uppercase tracking-wide">
        <div className="w-3" />
        <div>Nome</div>
        <div>Unita</div>
        <div className="text-right">Prezzo</div>
        <div>Fornitore</div>
        <div className="text-right">Necessario</div>
        <div className="text-right">Disponibile</div>
        <div className="text-right">Da comprare</div>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {filtrati.map((m) => (
          <div
            key={m.id}
            className="grid grid-cols-[auto_1fr_60px_80px_120px_80px_80px_80px] gap-2 px-6 py-2 border-b border-[#f0f0f0] text-[12px] hover:bg-[#f5f5f7] transition-colors"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full mt-0.5 ${SEMAFORO_COLORS[m.stato_semaforo]}`}
            />
            <div className="min-w-0">
              <div className="text-[#1d1d1f] font-medium truncate">
                {m.nome}
              </div>
              <div className="text-[10px] text-[#86868b]">
                {m.tipologia || "—"}
              </div>
            </div>
            <div className="text-[#86868b]">{m.unita}</div>
            <div className="text-right text-[#1d1d1f]">
              {m.prezzo_unitario > 0
                ? `${m.prezzo_unitario} €`
                : <span className="text-[#b0b0b5]">—</span>}
            </div>
            <div
              className={`truncate ${m.fornitore === "Da assegnare" ? "text-[#b0b0b5]" : "text-[#1d1d1f]"}`}
            >
              {m.fornitore}
            </div>
            <div className="text-right text-[#1d1d1f]">
              {m.fabbisogno_calcolato > 0
                ? m.fabbisogno_calcolato.toLocaleString("it-IT")
                : "—"}
            </div>
            <div className="text-right text-[#1d1d1f]">
              {m.disponibile > 0
                ? m.disponibile.toLocaleString("it-IT")
                : "—"}
            </div>
            <div
              className={`text-right font-medium ${m.da_comprare > 0 ? "text-red-500" : "text-[#1d1d1f]"}`}
            >
              {m.da_comprare > 0
                ? m.da_comprare.toLocaleString("it-IT")
                : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
