"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { SuperficieState } from "../hooks/use-superficie-state";

// DATI FINTI per scheletro
const FAKE_MATERIALI = [
  { id: "m1", nome: "Vite 5x50 zincata", fornitore: "Tecnomat", categoria_comp: "consumo", categoria_tech: "carpenteria", zona: "Pedana", fabbisogno: 9630, disponibile: 0, ordinato: 0, unita: "pz", prezzo: 0.04, semaforo: "rosso" as const },
  { id: "m2", nome: "Vernice testa di moro 5L", fornitore: "Tecnomat", categoria_comp: "consumo", categoria_tech: "verniciatura", zona: "Pedana", fabbisogno: 12, disponibile: 3, ordinato: 0, unita: "lt", prezzo: 18, semaforo: "rosso" as const },
  { id: "m3", nome: "Profilo alluminio stripled 2m", fornitore: "Da assegnare", categoria_comp: "strutturale", categoria_tech: "elettrico", zona: "Ingresso", fabbisogno: 15, disponibile: 15, ordinato: 15, unita: "pz", prezzo: 8.5, semaforo: "verde" as const },
  { id: "m4", nome: "Morali abete 4x4", fornitore: "Leroy Merlin", categoria_comp: "strutturale", categoria_tech: "carpenteria", zona: "Pedana", fabbisogno: 3967, disponibile: 200, ordinato: 0, unita: "pz", prezzo: 2.8, semaforo: "rosso" as const },
  { id: "m5", nome: "Cavo citofonico 2x0.5", fornitore: "FN Elettrico", categoria_comp: "consumo", categoria_tech: "elettrico", zona: "Pedana", fabbisogno: 70, disponibile: 0, ordinato: 70, unita: "m", prezzo: 0.6, semaforo: "giallo" as const },
  { id: "m6", nome: "Wago 221 3 poli", fornitore: "FN Elettrico", categoria_comp: "consumo", categoria_tech: "elettrico", zona: "Pedana", fabbisogno: 56, disponibile: 56, ordinato: 0, unita: "pz", prezzo: 0.8, semaforo: "verde" as const },
  { id: "m7", nome: "Tavole legno pino 4m", fornitore: "Leroy Merlin", categoria_comp: "strutturale", categoria_tech: "carpenteria", zona: "Pedana", fabbisogno: 642, disponibile: 0, ordinato: 0, unita: "pz", prezzo: 12, semaforo: "rosso" as const },
  { id: "m8", nome: "Pennello piatto 70mm", fornitore: "Tecnomat", categoria_comp: "attrezzo", categoria_tech: "verniciatura", zona: "Generale", fabbisogno: 16, disponibile: 4, ordinato: 0, unita: "pz", prezzo: 3.5, semaforo: "rosso" as const },
  { id: "m9", nome: "Picchetti prato zincati", fornitore: "Da assegnare", categoria_comp: "consumo", categoria_tech: "giardinaggio", zona: "Aperitivo", fabbisogno: 1000, disponibile: 0, ordinato: 0, unita: "pz", prezzo: 0.15, semaforo: "rosso" as const },
  { id: "m10", nome: "Acquaragia 1L", fornitore: "Tecnomat", categoria_comp: "consumo", categoria_tech: "verniciatura", zona: "Generale", fabbisogno: 0, disponibile: 2, ordinato: 0, unita: "lt", prezzo: 5, semaforo: "verde" as const },
  { id: "m11", nome: "Gru Sebach (servizio)", fornitore: "Sebach", categoria_comp: "servizio", categoria_tech: "trasporto", zona: "Area Bagni", fabbisogno: 1, disponibile: 0, ordinato: 1, unita: "pz", prezzo: 350, semaforo: "giallo" as const },
  { id: "m12", nome: "Nuvola pedana (recupero)", fornitore: "In loco", categoria_comp: "recupero", categoria_tech: "allestimento", zona: "Pedana", fabbisogno: 11, disponibile: 11, ordinato: 0, unita: "pz", prezzo: null, semaforo: "verde" as const },
];

const SEMAFORO_COLORS = { rosso: "bg-red-500", giallo: "bg-yellow-400", verde: "bg-green-500", sconosciuto: "bg-gray-300" };

interface Props {
  state: SuperficieState;
  onOpenDrawer: (tipo: "materiale" | "task" | "calcoli", id: string) => void;
}

export function ListaMateriali({ state, onOpenDrawer }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Filter
  let filtered = FAKE_MATERIALI;
  if (state.filtriCat.length > 0) filtered = filtered.filter(m => state.filtriCat.includes(m.categoria_comp));
  if (state.cerca) filtered = filtered.filter(m => m.nome.toLowerCase().includes(state.cerca.toLowerCase()));

  // Group
  const groupKey = (m: typeof FAKE_MATERIALI[0]): string => {
    switch (state.raggruppa) {
      case "fornitore": return m.fornitore;
      case "categoria_comp": return m.categoria_comp;
      case "categoria_tech": return m.categoria_tech;
      case "zona": return m.zona;
      default: return "";
    }
  };

  const isGrouped = state.raggruppa !== "nessuno";
  const groups = new Map<string, typeof FAKE_MATERIALI>();
  if (isGrouped) {
    for (const m of filtered) {
      const k = groupKey(m);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(m);
    }
  }

  const toggleGroup = (k: string) => {
    setCollapsed(prev => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  };

  const renderItem = (m: typeof FAKE_MATERIALI[0]) => (
    <button key={m.id} onClick={() => onOpenDrawer("materiale", m.id)}
      className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-[#f5f5f7] transition-colors border-b border-[#f0f0f0] last:border-0">
      {/* Semaforo */}
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${SEMAFORO_COLORS[m.semaforo]}`} />
      {/* Nome */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-[#1d1d1f] font-medium truncate">{m.nome}</div>
        <div className="text-[10px] text-[#86868b]">{m.fornitore} · {m.categoria_comp}</div>
      </div>
      {/* Fabbisogno */}
      <div className="text-right flex-shrink-0">
        <div className="text-[13px] font-medium text-[#1d1d1f]">{m.fabbisogno.toLocaleString("it-IT")} {m.unita}</div>
        {m.fabbisogno > m.disponibile && (
          <div className="text-[10px] text-red-500 font-medium">da comprare: {Math.max(0, m.fabbisogno - m.disponibile).toLocaleString("it-IT")}</div>
        )}
      </div>
      {/* Prezzo */}
      {m.prezzo && (
        <div className="text-[11px] text-[#86868b] w-16 text-right flex-shrink-0">
          {(Math.max(0, m.fabbisogno - m.disponibile) * m.prezzo).toLocaleString("it-IT", { maximumFractionDigits: 0 })} &euro;
        </div>
      )}
    </button>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      {isGrouped ? (
        Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([groupName, items]) => (
          <div key={groupName}>
            <button onClick={() => toggleGroup(groupName)}
              className="w-full flex items-center gap-2 px-4 py-2 bg-[#f5f5f7] border-b border-[#e5e5e7] sticky top-0 z-10 hover:bg-[#ebebed] transition-colors">
              {collapsed.has(groupName) ? <ChevronRight size={14} className="text-[#86868b]" /> : <ChevronDown size={14} className="text-[#86868b]" />}
              <span className="text-[12px] font-semibold text-[#1d1d1f] uppercase">{groupName}</span>
              <span className="text-[10px] text-[#86868b]">({items.length})</span>
            </button>
            {!collapsed.has(groupName) && items.map(renderItem)}
          </div>
        ))
      ) : (
        filtered.map(renderItem)
      )}
      {filtered.length === 0 && (
        <div className="flex items-center justify-center h-32 text-[13px] text-[#86868b]">Nessun materiale corrisponde ai filtri</div>
      )}
    </div>
  );
}
