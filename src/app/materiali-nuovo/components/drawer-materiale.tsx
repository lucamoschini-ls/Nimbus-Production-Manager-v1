"use client";

import { useState, useRef } from "react";
import { Calculator, X } from "lucide-react";
import { toast } from "sonner";
import type { DrawerData } from "../materiali-superficie";
import { aggiornaMateriale, eliminaLegameByComposite, aggiornaLegameByComposite } from "../actions";

const SEMAFORO_COLORS = {
  rosso: "bg-red-500",
  giallo: "bg-yellow-400",
  verde: "bg-green-500",
};

const PROV_OPTIONS = [
  { value: "", label: "—" },
  { value: "acquisto", label: "Acquisto" },
  { value: "in_loco", label: "In loco" },
  { value: "magazzino", label: "Magazzino" },
  { value: "noleggio", label: "Noleggio" },
];

export const UNITA_OPTIONS = [
  { value: "pz", label: "pz" },
  { value: "lt", label: "lt" },
  { value: "ml", label: "ml" },
  { value: "mq", label: "mq" },
  { value: "kg", label: "kg" },
];

interface Props {
  id: string;
  drawerData: DrawerData;
  onOpenTask: (taskId: string) => void;
  onOpenCalcoli: () => void;
}

function InlineField({
  label,
  value,
  onSave,
  type = "text",
}: {
  label: string;
  value: string | number;
  onSave: (v: string) => void;
  type?: "text" | "number";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  const handleBlur = () => {
    setEditing(false);
    if (draft !== String(value)) {
      onSave(draft);
    }
  };

  if (!editing) {
    return (
      <div>
        <div className="text-[#86868b] text-[10px] mb-0.5">{label}</div>
        <div
          className="font-medium text-[#1d1d1f] cursor-pointer hover:bg-[#f5f5f7] rounded px-1 -mx-1 py-0.5 text-[12px]"
          onClick={() => {
            setDraft(String(value));
            setEditing(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
        >
          {value || <span className="text-[#b0b0b5]">non impostato</span>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-[#86868b] text-[10px] mb-0.5">{label}</div>
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => { if (e.key === "Enter") handleBlur(); if (e.key === "Escape") { setDraft(String(value)); setEditing(false); } }}
        className="w-full text-[12px] border border-[#e5e5e7] rounded px-1 py-0.5 bg-white outline-none focus:ring-1 focus:ring-ring"
        autoFocus
      />
    </div>
  );
}

function InlineSelect({
  label,
  value,
  options,
  onSave,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onSave: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-[#86868b] text-[10px] mb-0.5">{label}</div>
      <select
        value={value}
        onChange={(e) => onSave(e.target.value)}
        className="w-full text-[12px] border border-[#e5e5e7] rounded px-1 py-0.5 bg-white outline-none focus:ring-1 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function FornitoreCombobox({ value, fornitori, onSave }: { value: string; fornitori: string[]; onSave: (v: string | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");

  if (!editing) {
    return (
      <div>
        <div className="text-[#86868b] text-[10px] mb-0.5">Fornitore</div>
        <div
          className="font-medium text-[#1d1d1f] cursor-pointer hover:bg-[#f5f5f7] rounded px-1 -mx-1 py-0.5 text-[12px]"
          onClick={() => { setDraft(value || ""); setEditing(true); }}
        >
          {value || <span className="text-[#b0b0b5]">non impostato</span>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-[#86868b] text-[10px] mb-0.5">Fornitore</div>
      <div className="relative">
        <input
          list="fornitori-list-drawer"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { setEditing(false); if (draft !== (value || "")) onSave(draft || null); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { setEditing(false); if (draft !== (value || "")) onSave(draft || null); }
            if (e.key === "Escape") { setDraft(value || ""); setEditing(false); }
          }}
          className="w-full text-[12px] border border-[#e5e5e7] rounded px-1 py-0.5 bg-white outline-none focus:ring-1 focus:ring-ring"
          autoFocus
        />
        <datalist id="fornitori-list-drawer">
          {fornitori.filter(f => f !== "Da assegnare").map(f => <option key={f} value={f} />)}
        </datalist>
      </div>
    </div>
  );
}

export function DrawerMateriale({ id, drawerData, onOpenTask, onOpenCalcoli }: Props) {
  const mat = drawerData.materialiMap.get(id);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(mat?.nome || "");

  if (!mat) {
    return (
      <p className="text-[12px] text-[#86868b]">Materiale non trovato</p>
    );
  }

  const taskLinks = drawerData.taskLinksByCatalogo.get(id) || [];

  const saveField = async (campo: string, valore: string | number | null) => {
    drawerData.onUpdateCatalogo(id, campo, valore);
    try {
      await aggiornaMateriale(id, campo, valore);
    } catch (e) {
      toast.error("Errore salvataggio", { description: (e as Error).message });
    }
  };

  const handleNameBlur = () => {
    setEditingName(false);
    if (nameDraft !== mat.nome && nameDraft.trim()) {
      saveField("nome", nameDraft.trim());
    }
  };

  const handleRemoveLink = async (link: { task_id: string; quantita: number | null; unita: string | null }) => {
    if (!window.confirm("Rimuovere questo collegamento task-materiale?")) return;
    drawerData.onRemoveLegame(link.task_id, id);
    try {
      await eliminaLegameByComposite(link.task_id, id);
    } catch (e) {
      toast.error("Errore eliminazione", { description: (e as Error).message });
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        {editingName ? (
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={(e) => { if (e.key === "Enter") handleNameBlur(); if (e.key === "Escape") { setNameDraft(mat.nome); setEditingName(false); } }}
            className="text-[15px] font-semibold text-[#1d1d1f] w-full border border-[#e5e5e7] rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
        ) : (
          <h3
            className="text-[15px] font-semibold text-[#1d1d1f] cursor-pointer hover:bg-[#f5f5f7] rounded px-1 -mx-1 py-0.5"
            onClick={() => { setNameDraft(mat.nome); setEditingName(true); }}
          >
            {mat.nome}
          </h3>
        )}
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
          <InlineSelect
            label="Unita"
            value={mat.unita}
            options={UNITA_OPTIONS}
            onSave={(v) => saveField("unita", v || null)}
          />
          <InlineField
            label="Prezzo"
            value={mat.prezzo_unitario > 0 ? mat.prezzo_unitario : ""}
            type="number"
            onSave={(v) => saveField("prezzo", v ? parseFloat(v) : null)}
          />
          <FornitoreCombobox
            value={mat.fornitore === "Da assegnare" ? "" : mat.fornitore}
            fornitori={drawerData.fornitoriDistinti}
            onSave={(v) => saveField("fornitore", v)}
          />
          <InlineSelect
            label="Provenienza"
            value={mat.provenienza === "—" ? "" : mat.provenienza}
            options={PROV_OPTIONS}
            onSave={(v) => saveField("provenienza", v || null)}
          />
        </div>
      </div>

      {/* Quantita */}
      <div className="border-t border-[#f0f0f0] pt-3">
        <h4 className="text-[10px] text-[#86868b] font-semibold uppercase tracking-wide mb-2">
          Quantita
        </h4>
        <div className="space-y-1.5 text-[12px]">
          <div className="flex justify-between items-center">
            <span className="text-[#86868b] flex items-center gap-1">
              Necessario
              <button
                onClick={onOpenCalcoli}
                className="text-[#b0b0b5] hover:text-[#1d1d1f] p-0.5 rounded hover:bg-[#f0f0f0]"
                title="Apri driver e coefficienti"
              >
                <Calculator size={11} />
              </button>
            </span>
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
                <div
                  key={`${link.task_id}-${i}`}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#f5f5f7] transition-colors group"
                >
                  <button
                    onClick={() => onOpenTask(link.task_id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="text-[12px] text-[#1d1d1f] truncate">
                      {task.titolo}
                    </div>
                    <div className="text-[10px] text-[#86868b]">
                      {task.zona_nome} · {task.lavorazione_nome}
                    </div>
                  </button>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    defaultValue={link.quantita ?? 0}
                    onBlur={async (e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (val !== (link.quantita ?? 0)) {
                        drawerData.onUpdateLegame(link.task_id, id, val);
                        try {
                          await aggiornaLegameByComposite(link.task_id, id, val);
                        } catch (err) {
                          toast.error("Errore aggiornamento quantita", { description: (err as Error).message });
                        }
                      }
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    className="w-16 text-[12px] text-right border border-[#e5e5e7] rounded px-2 py-0.5 bg-white outline-none focus:ring-1 focus:ring-ring"
                  />
                  <span className="text-[10px] text-[#86868b] w-6">{link.unita || mat.unita}</span>
                  <button
                    onClick={() => handleRemoveLink(link)}
                    className="opacity-0 group-hover:opacity-100 text-[#b0b0b5] hover:text-red-500 p-0.5 rounded transition-opacity"
                    title="Rimuovi collegamento"
                  >
                    <X size={12} />
                  </button>
                </div>
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
