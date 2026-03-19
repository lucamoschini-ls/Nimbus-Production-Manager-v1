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

interface Props {
  fornitori: Fornitore[];
  permessi: Permesso[];
}

export function FornitoriClient({ fornitori, permessi }: Props) {
  const [activeTab, setActiveTab] = useState<"fornitori" | "permessi">("fornitori");
  const [filterStato, setFilterStato] = useState<string>("tutti");
  const [selectedFornitore, setSelectedFornitore] = useState<Fornitore | null>(null);
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
          {filteredFornitori.map((fornitore) => (
            <button
              key={fornitore.id}
              onClick={() => setSelectedFornitore(fornitore)}
              className="bg-white rounded-[12px] border border-[#e5e5e7] p-5 text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#1d1d1f]">
                    {fornitore.nome}
                  </h3>
                  {fornitore.specializzazione && (
                    <p className="text-xs text-[#86868b] mt-0.5 line-clamp-1">
                      {fornitore.specializzazione}
                    </p>
                  )}
                </div>
                <Badge
                  className={STATO_FORNITORE_COLORS[fornitore.stato]}
                >
                  {STATO_FORNITORE_LABELS[fornitore.stato]}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#86868b]">
                {fornitore.tipo && <span>{fornitore.tipo}</span>}
                <span>{fornitore.task_totali} task</span>
                {fornitore.task_bloccate_da_me > 0 && (
                  <span className="text-red-500">
                    {fornitore.task_bloccate_da_me} bloccate
                  </span>
                )}
              </div>
            </button>
          ))}
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
