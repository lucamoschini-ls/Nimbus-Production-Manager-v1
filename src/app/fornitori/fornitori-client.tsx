"use client";

import { useState } from "react";
import { Plus, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FornitoreSheet } from "./fornitore-sheet";
import { PermessoSheet } from "./permesso-sheet";
import { TaskDetailOverlay } from "@/components/task-detail-overlay";
import { updateFornitore, createFornitore, updatePermesso, createPermesso } from "./actions";
import type { StatoFornitore, StatoPermesso } from "@/lib/types";

const STATO_FORNITORE_COLORS: Record<StatoFornitore, string> = {
  da_trovare: "bg-[#FF3B30]/10 text-[#FF3B30]",
  contattato: "bg-[#FF9F0A]/10 text-[#FF9F0A]",
  confermato: "bg-[#0071E3]/10 text-[#0071E3]",
  sopralluogo_fatto: "bg-[#5856D6]/10 text-[#5856D6]",
  materiali_definiti: "bg-[#AF52DE]/10 text-[#AF52DE]",
  pronto: "bg-[#34C759]/10 text-[#34C759]",
};

const STATO_FORNITORE_LABELS: Record<StatoFornitore, string> = {
  da_trovare: "Da trovare",
  contattato: "Contattato",
  confermato: "Confermato",
  sopralluogo_fatto: "Sopralluogo fatto",
  materiali_definiti: "Materiali definiti",
  pronto: "Pronto",
};

const STATO_PERMESSO_COLORS: Record<StatoPermesso, string> = {
  da_presentare: "bg-red-100 text-red-700",
  presentato: "bg-amber-100 text-amber-700",
  in_attesa: "bg-blue-100 text-blue-700",
  ottenuto: "bg-green-100 text-green-700",
};

const STATO_PERMESSO_LABELS: Record<StatoPermesso, string> = {
  da_presentare: "Da presentare",
  presentato: "Presentato",
  in_attesa: "In attesa",
  ottenuto: "Ottenuto",
};

interface Fornitore {
  id: string;
  nome: string;
  tipo: string | null;
  specializzazione: string | null;
  contatto: string | null;
  stato: StatoFornitore;
  costo_ora: number | null;
  note: string | null;
  task_totali: number;
  task_completate: number;
  task_bloccate_da_me: number;
}

interface Permesso {
  id: string;
  nome: string;
  stato: StatoPermesso;
  data_scadenza: string | null;
  responsabile: string | null;
  note: string | null;
}

interface TaskForFornitore {
  id: string; titolo: string; zona_nome: string; lavorazione_nome: string; lavorazione_id: string; stato_calcolato: string;
  via?: string;
}

const STATO_TASK_COLORS: Record<string, string> = {
  da_fare: "bg-[#86868B]/10 text-[#86868B]", in_corso: "bg-[#0071E3]/10 text-[#0071E3]",
  completata: "bg-[#34C759]/10 text-[#34C759]", bloccata: "bg-[#FF3B30]/10 text-[#FF3B30]",
  in_attesa_fornitore: "bg-[#FF9F0A]/10 text-[#FF9F0A]", in_attesa_dipendenza: "bg-[#FF9F0A]/10 text-[#FF9F0A]",
  in_attesa_materiali: "bg-[#FF9F0A]/10 text-[#FF9F0A]", in_attesa_permesso: "bg-[#FF9F0A]/10 text-[#FF9F0A]",
};

const FORN_CYCLE: StatoFornitore[] = ["da_trovare", "contattato", "confermato", "sopralluogo_fatto", "materiali_definiti", "pronto"];

interface TipologiaFornitore {
  nome: string;
}

interface Props {
  fornitori: Fornitore[];
  permessi: Permesso[];
  tasksByFornitore: Record<string, TaskForFornitore[]>;
  tipologieFornitore: TipologiaFornitore[];
  fornCosts: Record<string, { oreTotali: number; costoTotale: number }>;
}

export function FornitoriClient({ fornitori, permessi, tasksByFornitore, tipologieFornitore, fornCosts }: Props) {
  const [activeTab, setActiveTab] = useState<"fornitori" | "permessi">("fornitori");
  const [filterStato, setFilterStato] = useState<string>("tutti");
  const [filterTipologia, setFilterTipologia] = useState<string>("tutti");
  const [selectedFornitore, setSelectedFornitore] = useState<Fornitore | null>(null);
  const [expandedFornitore, setExpandedFornitore] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<"tutte" | "bloccate" | "in_corso" | "completate">("tutte");
  const [selectedPermesso, setSelectedPermesso] = useState<Permesso | null>(null);
  const [isNewFornitore, setIsNewFornitore] = useState(false);
  const [isNewPermesso, setIsNewPermesso] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const STATO_ORDER: Record<string, number> = { da_trovare: 0, contattato: 1, confermato: 2, sopralluogo_fatto: 3, materiali_definiti: 4, pronto: 5 };

  const filteredFornitori = (() => {
    let base = filterStato === "tutti"
      ? fornitori
      : fornitori.filter((f) => f.stato === filterStato);
    if (filterTipologia !== "tutti") {
      base = base.filter((f) => f.tipo === filterTipologia);
    }
    return [...base].sort((a, b) => {
      const oa = STATO_ORDER[a.stato] ?? 9;
      const ob = STATO_ORDER[b.stato] ?? 9;
      if (oa !== ob) return oa - ob;
      return (b.task_bloccate_da_me ?? 0) - (a.task_bloccate_da_me ?? 0);
    });
  })();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#1d1d1f]">
          {activeTab === "fornitori" ? "Fornitori" : "Permessi"}
        </h1>
        <div className="flex items-center gap-3">
          {activeTab === "fornitori" && (
            <>
              <div>
                <span className="text-[9px] text-[#86868b] block mb-0.5">Tipologia</span>
                <Select value={filterTipologia} onValueChange={setFilterTipologia}>
                  <SelectTrigger className="w-[160px]">
                    <Filter size={16} className="mr-2 text-[#86868b]" />
                    <SelectValue placeholder="Filtra per tipologia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutti">Tutte</SelectItem>
                    {tipologieFornitore.map((t) => (
                      <SelectItem key={t.nome} value={t.nome}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <span className="text-[9px] text-[#86868b] block mb-0.5">Stato</span>
                <Select value={filterStato} onValueChange={setFilterStato}>
                  <SelectTrigger className="w-[180px]">
                    <Filter size={16} className="mr-2 text-[#86868b]" />
                    <SelectValue placeholder="Filtra per stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutti">Tutti</SelectItem>
                    {Object.entries(STATO_FORNITORE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => setIsNewFornitore(true)}
                size="sm"
                className="gap-1.5"
              >
                <Plus size={16} />
                Aggiungi
              </Button>
            </>
          )}
          {activeTab === "permessi" && (
            <Button
              onClick={() => setIsNewPermesso(true)}
              size="sm"
              className="gap-1.5"
            >
              <Plus size={16} />
              Aggiungi
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#f5f5f7] rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("fornitori")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === "fornitori"
              ? "bg-white text-[#1d1d1f] shadow-sm"
              : "text-[#86868b] hover:text-[#1d1d1f]"
          }`}
        >
          Fornitori ({fornitori.length})
        </button>
        <button
          onClick={() => setActiveTab("permessi")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === "permessi"
              ? "bg-white text-[#1d1d1f] shadow-sm"
              : "text-[#86868b] hover:text-[#1d1d1f]"
          }`}
        >
          Permessi ({permessi.length})
        </button>
      </div>

      {/* Fornitori Grid */}
      {activeTab === "fornitori" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFornitori.map((fornitore) => {
            const fornTasks = tasksByFornitore[fornitore.id] || [];
            const isExpanded = expandedFornitore === fornitore.id;
            return (
              <div key={fornitore.id} className="bg-white rounded-[12px] border border-[#e5e5e7] overflow-hidden">
                <div className="p-5 cursor-pointer hover:bg-[#f5f5f7]/30 transition-colors" onClick={() => setSelectedFornitore(fornitore)}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#1d1d1f]">{fornitore.nome}</h3>
                      {fornitore.specializzazione && <p className="text-xs text-[#86868b] mt-0.5 line-clamp-1">{fornitore.specializzazione}</p>}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const idx = FORN_CYCLE.indexOf(fornitore.stato);
                        const next = FORN_CYCLE[(idx + 1) % FORN_CYCLE.length];
                        updateFornitore(fornitore.id, { stato: next });
                      }}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 ${STATO_FORNITORE_COLORS[fornitore.stato]}`}
                      title="Click per avanzare stato"
                    >
                      {STATO_FORNITORE_LABELS[fornitore.stato]}
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#86868b]">
                    <select
                      value={fornitore.tipo ?? ""}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateFornitore(fornitore.id, { tipo: e.target.value || null });
                      }}
                      className="text-xs text-[#86868b] bg-transparent border-0 outline-none cursor-pointer hover:text-[#1d1d1f] -ml-1 pr-4 py-0"
                    >
                      <option value="">Nessun tipo</option>
                      {tipologieFornitore.map((t) => (
                        <option key={t.nome} value={t.nome}>{t.nome}</option>
                      ))}
                    </select>
                    <button onClick={(e) => { e.stopPropagation(); setExpandedFornitore(isExpanded ? null : fornitore.id); }} className="hover:text-[#1d1d1f] underline-offset-2 hover:underline">
                      {fornitore.task_totali} task
                    </button>
                    {fornitore.task_bloccate_da_me > 0 && <span className="text-red-500">{fornitore.task_bloccate_da_me} bloccate</span>}
                  </div>
                  {(() => {
                    const fc = fornCosts[fornitore.id];
                    if (!fc || (fc.oreTotali === 0 && fc.costoTotale === 0)) {
                      return <p className="text-[10px] text-[#d2d2d7] mt-0.5">Ore e costi da compilare</p>;
                    }
                    return (
                      <p className="text-[10px] text-[#86868b] mt-0.5">
                        ~{Math.round(fc.oreTotali)} ore · {fc.costoTotale.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                      </p>
                    );
                  })()}
                </div>
                {isExpanded && fornTasks.length > 0 && (
                  <div className="border-t border-[#e5e5e7] bg-[#f5f5f7]/30 px-5 py-3">
                    {/* Filtri */}
                    <div className="flex gap-1 mb-2">
                      {(["tutte", "bloccate", "in_corso", "completate"] as const).map((f) => (
                        <button key={f} onClick={(e) => { e.stopPropagation(); setTaskFilter(f); }}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${taskFilter === f ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b] hover:text-[#1d1d1f]"}`}>
                          {f === "tutte" ? "Tutte" : f === "bloccate" ? "Bloccate" : f === "in_corso" ? "In corso" : "Completate"}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-1">
                      {fornTasks.filter((t) => {
                        if (taskFilter === "bloccate") return t.stato_calcolato.startsWith("in_attesa") || t.stato_calcolato === "bloccata";
                        if (taskFilter === "in_corso") return t.stato_calcolato === "in_corso";
                        if (taskFilter === "completate") return t.stato_calcolato === "completata";
                        return true;
                      }).map((t) => (
                        <div key={t.id} className="flex items-start gap-3 text-xs hover:bg-white rounded px-2 py-2 -mx-2 transition-colors">
                          <button onClick={() => setSelectedTaskId(t.id)} className="flex-1 min-w-0 hover:underline text-left">
                            <span className="text-[#1d1d1f] block" style={{ whiteSpace: "normal" }}>{t.titolo}</span>
                            <span className="text-[10px] text-[#86868b] block mt-0.5">{t.zona_nome} &gt; {t.lavorazione_nome}</span>
                            {t.via && <span className="text-[10px] text-violet-500 block">{t.via}</span>}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); import("../lavorazioni/cycle-actions").then(({ cycleTaskStato }) => cycleTaskStato(t.id, t.stato_calcolato)); }}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 cursor-pointer hover:opacity-80 whitespace-nowrap ${STATO_TASK_COLORS[t.stato_calcolato] ?? "bg-gray-100 text-gray-600"}`}
                            title="Click per ciclare stato">
                            {t.stato_calcolato.replace(/_/g, " ")}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Permessi Grid */}
      {activeTab === "permessi" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {permessi.map((permesso) => (
            <button
              key={permesso.id}
              onClick={() => setSelectedPermesso(permesso)}
              className="bg-white rounded-[12px] border border-[#e5e5e7] p-5 text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#1d1d1f]">
                  {permesso.nome}
                </h3>
                <Badge
                  className={STATO_PERMESSO_COLORS[permesso.stato]}
                >
                  {STATO_PERMESSO_LABELS[permesso.stato]}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#86868b]">
                {permesso.responsabile && (
                  <span>Resp: {permesso.responsabile}</span>
                )}
                {permesso.data_scadenza && (
                  <span>Scad: {new Date(permesso.data_scadenza).toLocaleDateString("it-IT")}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Sheet Fornitore */}
      <FornitoreSheet
        fornitore={selectedFornitore}
        open={!!selectedFornitore || isNewFornitore}
        onClose={() => {
          setSelectedFornitore(null);
          setIsNewFornitore(false);
        }}
        onSave={async (data) => {
          if (selectedFornitore) {
            await updateFornitore(selectedFornitore.id, data);
          } else {
            await createFornitore(data as Parameters<typeof createFornitore>[0]);
          }
          setSelectedFornitore(null);
          setIsNewFornitore(false);
        }}
      />

      {/* Sheet Permesso */}
      <PermessoSheet
        permesso={selectedPermesso}
        open={!!selectedPermesso || isNewPermesso}
        onClose={() => {
          setSelectedPermesso(null);
          setIsNewPermesso(false);
        }}
        onSave={async (data) => {
          if (selectedPermesso) {
            await updatePermesso(selectedPermesso.id, data);
          } else {
            await createPermesso(data as Parameters<typeof createPermesso>[0]);
          }
          setSelectedPermesso(null);
          setIsNewPermesso(false);
        }}
      />

      {/* Task Detail Overlay */}
      <TaskDetailOverlay taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </div>
  );
}
