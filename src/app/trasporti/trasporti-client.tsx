"use client";

import { Truck } from "lucide-react";
import { updateOperazioneField } from "./actions";

export interface TrasportoOp {
  id: string; titolo: string; organizzato: boolean; stato: string; tipologia: string | null;
  data_inizio: string | null; data_fine: string | null; note: string | null;
  luogo_id: string | null;
  luogo: { id: string; nome: string } | null;
  fornitore: { nome: string; stato: string } | null;
  materiale: {
    nome: string;
    task: { titolo: string; lavorazione: { nome: string; zona: { nome: string; colore: string } } };
  };
}

const STATO_FORN_CLS: Record<string, string> = {
  da_trovare: "bg-red-100 text-red-700", contattato: "bg-amber-100 text-amber-700",
  confermato: "bg-blue-100 text-blue-700", sopralluogo_fatto: "bg-indigo-100 text-indigo-700",
  materiali_definiti: "bg-violet-100 text-violet-700", pronto: "bg-green-100 text-green-700",
};

export function TrasportiClient({ ops }: { ops: TrasportoOp[] }) {
  const daOrganizzare = ops.filter((o) => !o.organizzato).length;

  const grouped: Record<string, TrasportoOp[]> = {};
  ops.forEach((op) => {
    const key = op.luogo?.nome ?? "Da definire";
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
      <h1 className="text-2xl font-semibold text-[#1d1d1f] mb-6">Trasporti e Logistica</h1>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-4">
          <p className="text-xs text-[#86868b] font-medium">Totale trasporti</p>
          <p className="text-xl font-semibold text-[#1d1d1f] mt-1">{ops.length}</p>
        </div>
        {daOrganizzare > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-[12px] p-4">
            <p className="text-xs text-amber-700 font-medium">Da organizzare</p>
            <p className="text-xl font-semibold text-amber-700 mt-1">{daOrganizzare}</p>
          </div>
        )}
        {numLuoghi > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-[12px] p-4">
            <p className="text-xs text-blue-700 font-medium">Luoghi di partenza</p>
            <p className="text-xl font-semibold text-blue-700 mt-1">{numLuoghi}</p>
          </div>
        )}
      </div>

      {ops.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[#86868b]">
          <Truck size={40} strokeWidth={1.2} />
          <p className="text-sm mt-3 font-medium">Nessuna operazione di trasporto</p>
          <p className="text-xs mt-1">Aggiungi operazioni con tipologia trasporto nei materiali</p>
        </div>
      ) : (
        <div className="space-y-6">
          {luoghi.map((luogo) => (
            <div key={luogo}>
              <h3 className="text-sm font-semibold text-[#1d1d1f] mb-2">
                {luogo}
                <span className="text-[#86868b] font-normal ml-2">({grouped[luogo].length})</span>
              </h3>
              <div className="space-y-2">
                {grouped[luogo].map((op) => (
                  <div key={op.id} className="bg-white rounded-[12px] border border-[#e5e5e7] p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-[#1d1d1f]">{op.titolo}</h4>
                          {op.tipologia && (
                            <span className="text-[10px] text-[#86868b] bg-[#f5f5f7] px-1.5 py-0.5 rounded">
                              {op.tipologia.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#86868b] mt-0.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ backgroundColor: op.materiale?.task?.lavorazione?.zona?.colore }} />
                          {op.materiale?.task?.lavorazione?.zona?.nome} &gt; {op.materiale?.task?.titolo} &gt; {op.materiale?.nome}
                        </p>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={op.organizzato}
                          onChange={(e) => updateOperazioneField(op.id, { organizzato: e.target.checked })}
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
                      {op.note && <span className="text-[#86868b] truncate max-w-[200px]">{op.note}</span>}
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
