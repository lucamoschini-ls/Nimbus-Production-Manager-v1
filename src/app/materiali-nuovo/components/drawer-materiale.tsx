"use client";

import type { DrawerData } from "../materiali-superficie";

const SEMAFORO_COLORS = {
  rosso: "bg-red-500",
  giallo: "bg-yellow-400",
  verde: "bg-green-500",
};

const PROV_LABELS: Record<string, string> = {
  acquisto: "Acquisto",
  in_loco: "In loco",
  magazzino: "Magazzino",
  noleggio: "Noleggio",
};

interface Props {
  id: string;
  drawerData: DrawerData;
  onOpenTask: (taskId: string) => void;
}

export function DrawerMateriale({ id, drawerData, onOpenTask }: Props) {
  const mat = drawerData.materialiMap.get(id);
  if (!mat) {
    return (
      <p className="text-[12px] text-[#86868b]">Materiale non trovato</p>
    );
  }

  const taskLinks = drawerData.taskLinksByCatalogo.get(id) || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h3 className="text-[15px] font-semibold text-[#1d1d1f]">
          {mat.nome}
        </h3>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {mat.categoria_comp ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {mat.categoria_comp}
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-[#86868b]">
              Non classificato
            </span>
          )}
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {mat.tipologia || "—"}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${SEMAFORO_COLORS[mat.stato_semaforo]}`}
          />
        </div>
      </div>

      {/* Dettagli */}
      <div className="border-t border-[#f0f0f0] pt-3">
        <h4 className="text-[10px] text-[#86868b] font-semibold uppercase tracking-wide mb-2">
          Dettagli
        </h4>
        <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-[12px]">
          <div>
            <div className="text-[#86868b] text-[10px] mb-0.5">Unita</div>
            <div className="font-medium text-[#1d1d1f]">{mat.unita}</div>
          </div>
          <div>
            <div className="text-[#86868b] text-[10px] mb-0.5">Prezzo</div>
            <div className="font-medium text-[#1d1d1f]">
              {mat.prezzo_unitario > 0 ? (
                `${mat.prezzo_unitario} €/${mat.unita}`
              ) : (
                <span className="text-[#86868b] font-normal">
                  non impostato
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="text-[#86868b] text-[10px] mb-0.5">Fornitore</div>
            <div
              className={`font-medium ${mat.fornitore === "Da assegnare" ? "text-[#86868b]" : "text-[#1d1d1f]"}`}
            >
              {mat.fornitore}
            </div>
          </div>
          <div>
            <div className="text-[#86868b] text-[10px] mb-0.5">
              Provenienza
            </div>
            <div className="font-medium text-[#1d1d1f]">
              {PROV_LABELS[mat.provenienza] || mat.provenienza}
            </div>
          </div>
        </div>
      </div>

      {/* Quantita */}
      <div className="border-t border-[#f0f0f0] pt-3">
        <h4 className="text-[10px] text-[#86868b] font-semibold uppercase tracking-wide mb-2">
          Quantita
        </h4>
        <div className="space-y-1.5 text-[12px]">
          <div className="flex justify-between">
            <span className="text-[#86868b]">Necessario</span>
            <span className="font-medium">
              {mat.fabbisogno_calcolato.toLocaleString("it-IT")} {mat.unita}
              <span className="text-[#86868b] font-normal ml-1">
                ({taskLinks.length} task)
              </span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#86868b]">Disponibile</span>
            <span className="font-medium">
              {mat.disponibile.toLocaleString("it-IT")} {mat.unita}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#86868b]">Da acquistare</span>
            <span
              className={`font-medium ${mat.da_comprare > 0 ? "text-red-500" : ""}`}
            >
              {mat.da_comprare.toLocaleString("it-IT")} {mat.unita}
            </span>
          </div>
          {mat.costo_da_comprare > 0 && (
            <div className="flex justify-between">
              <span className="text-[#86868b]">Costo stimato</span>
              <span className="font-medium">
                {mat.costo_da_comprare.toLocaleString("it-IT", {
                  maximumFractionDigits: 0,
                })}{" "}
                €
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Usato in */}
      <div className="border-t border-[#f0f0f0] pt-3">
        <h4 className="text-[10px] text-[#86868b] font-semibold uppercase tracking-wide mb-2">
          Usato in ({taskLinks.length} task)
        </h4>
        {taskLinks.length === 0 ? (
          <p className="text-[12px] text-[#86868b]">
            Nessuna task collegata
          </p>
        ) : (
          <div className="space-y-0.5 max-h-[280px] overflow-y-auto">
            {taskLinks.map((link, i) => {
              const task = drawerData.taskMap.get(link.task_id);
              if (!task) return null;
              return (
                <button
                  key={`${link.task_id}-${i}`}
                  onClick={() => onOpenTask(link.task_id)}
                  className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#f5f5f7] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-[#1d1d1f] truncate">
                      {task.titolo}
                    </div>
                    <div className="text-[10px] text-[#86868b]">
                      {task.zona_nome} · {task.lavorazione_nome}
                    </div>
                  </div>
                  {link.quantita != null && (
                    <span className="text-[11px] text-[#86868b] flex-shrink-0">
                      {link.quantita} {link.unita || mat.unita}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Link pagina classica */}
      <div className="border-t border-[#f0f0f0] pt-3">
        <a
          href="/materiali"
          className="text-[11px] text-[#86868b] hover:text-[#1d1d1f] underline"
        >
          Apri scheda completa nella pagina classica
        </a>
      </div>
    </div>
  );
}
