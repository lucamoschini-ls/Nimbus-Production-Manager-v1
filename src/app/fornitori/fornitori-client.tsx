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
import { updateFornitore, createFornitore, updatePermesso, createPermesso } from "./actions";
import type { StatoFornitore, StatoPermesso } from "@/lib/types";

const STATO_FORNITORE_COLORS: Record<StatoFornitore, string> = {
  da_trovare: "bg-red-100 text-red-700",
  contattato: "bg-amber-100 text-amber-700",
  confermato: "bg-blue-100 text-blue-700",
  sopralluogo_fatto: "bg-indigo-100 text-indigo-700",
  materiali_definiti: "bg-violet-100 text-violet-700",
  pronto: "bg-green-100 text-green-700",
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
  da_fare: "bg-gray-100 text-gray-600", in_corso: "bg-blue-100 text-blue-700",
  completata: "bg-green-100 text-green-700", bloccata: "bg-red-100 text-red-700",
  in_attesa_fornitore: "bg-amber-100 text-amber-700", in_attesa_dipendenza: "bg-amber-100 text-amber-700",
  in_attesa_materiali: "bg-amber-100 text-amber-700", in_attesa_permesso: "bg-amber-100 text-amber-700",
};

const FORN_CYCLE: StatoFornitore[] = ["da_trovare", "contattato", "confermato", "sopralluogo_fatto", "materiali_definiti", "pronto"];

interface Props {
  fornitori: Fornitore[];
  permessi: Permesso[];
  tasksByFornitore: Record<string, TaskForFornitore[]>;
}

export function FornitoriClient({ fornitori, permessi, tasksByFornitore }: Props) {
  const [activeTab, setActiveTab] = useState<"fornitori" | "permessi">("fornitori");
  const [filterStato, setFilterStato] = useState<string>("tutti");
  const [selectedFornitore, setSelectedFornitore] = useState<Fornitore | null>(null);
  const [expandedFornitore, setExpandedFornitore] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<"tutte" | "bloccate" | "in_corso" | "completate">("tutte");
  const [selectedPermesso, setSelectedPermesso] = useState<Permesso | null>(null);
  const [isNewFornitore, setIsNewFornitore] = useState(false);
  const [isNewPermesso, setIsNewPermesso] = useState(false);

  const filteredFornitori =
    filterStato === "tutti"
      ? fornitori
      : fornitori.filter((f) => f.stato === filterStato);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#1d1d1f]">
          {activeTab === "fornitori" ? "Fornitori" : "Permessi"}
        </h1>
        <div className="flex items-center gap-3">
          {activeTab === "fornitori" && (
            <>
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
                    {fornitore.tipo && <span>{fornitore.tipo}</span>}
                    <button onClick={(e) => { e.stopPropagation(); setExpandedFornitore(isExpanded ? null : fornitore.id); }} className="hover:text-[#1d1d1f] underline-offset-2 hover:underline">
                      {fornitore.task_totali} task
                    </button>
                    {fornitore.task_bloccate_da_me > 0 && <span className="text-red-500">{fornitore.task_bloccate_da_me} bloccate</span>}
                  </div>
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
                        <div key={t.id} className="flex items-center gap-2 text-xs hover:bg-white rounded px-2 py-1.5 -mx-2 transition-colors">
                          <button onClick={(e) => { e.stopPropagation(); import("../lavorazioni/cycle-actions").then(({ cycleTaskStato }) => cycleTaskStato(t.id, t.stato_calcolato)); }}
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 cursor-pointer hover:opacity-80 ${STATO_TASK_COLORS[t.stato_calcolato] ?? "bg-gray-100 text-gray-600"}`}
                            title="Click per ciclare stato">
                            {t.stato_calcolato.replace(/_/g, " ")}
                          </button>
                          <a href={`/lavorazioni?task=${t.id}`} className="flex-1 min-w-0 hover:underline">
                            <span className="text-[#1d1d1f] truncate block">{t.titolo}</span>
                            <span className="text-[10px] text-[#86868b]">{t.zona_nome} &gt; {t.lavorazione_nome}</span>
                            {t.via && <span className="text-[10px] text-violet-500 block">{t.via}</span>}
                          </a>
                          {t.stato_calcolato.startsWith("in_attesa") && (
                            <span className="text-[10px] text-red-500 flex-shrink-0">{t.stato_calcolato.replace(/_/g, " ")}</span>
                          )}
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
    </div>
  );
}
