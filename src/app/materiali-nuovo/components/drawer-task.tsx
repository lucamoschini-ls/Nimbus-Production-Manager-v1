"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import type { DrawerData } from "../materiali-superficie";
import { aggiornaTask } from "../actions";

const STATO_COLORS: Record<string, string> = {
  da_fare: "bg-gray-100 text-gray-700",
  in_corso: "bg-blue-100 text-blue-700",
  completata: "bg-green-100 text-green-700",
  bloccata: "bg-red-100 text-red-700",
  in_attesa_fornitore: "bg-amber-100 text-amber-700",
  in_attesa_dipendenza: "bg-amber-100 text-amber-700",
  in_attesa_materiali: "bg-amber-100 text-amber-700",
  in_attesa_permesso: "bg-amber-100 text-amber-700",
};

const STATO_LABELS: Record<string, string> = {
  da_fare: "Da fare",
  in_corso: "In corso",
  completata: "Completata",
  bloccata: "Bloccata",
  in_attesa_fornitore: "Attesa fornitore",
  in_attesa_dipendenza: "Attesa dipendenza",
  in_attesa_materiali: "Attesa materiali",
  in_attesa_permesso: "Attesa permesso",
};

const STATO_OPTIONS = [
  { value: "da_fare", label: "Da fare" },
  { value: "in_corso", label: "In corso" },
  { value: "completata", label: "Completata" },
];

const SEMAFORO_COLORS = {
  rosso: "bg-red-500",
  giallo: "bg-yellow-400",
  verde: "bg-green-500",
};

interface Props {
  id: string;
  drawerData: DrawerData;
  onOpenMateriale: (matId: string) => void;
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  });
}

function EditableTaskField({
  label,
  value,
  onSave,
  type = "text",
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  type?: "text" | "date";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleBlur = () => {
    setEditing(false);
    if (draft !== value) {
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
            setDraft(value);
            setEditing(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
        >
          {type === "date" && value ? formatDate(value) : value || <span className="text-[#b0b0b5]">—</span>}
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
        onKeyDown={(e) => {
          if (e.key === "Enter") handleBlur();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className="w-full text-[12px] border border-[#e5e5e7] rounded px-1 py-0.5 bg-white outline-none focus:ring-1 focus:ring-ring"
        autoFocus
      />
    </div>
  );
}

export function DrawerTask({ id, drawerData, onOpenMateriale }: Props) {
  const task = drawerData.taskMap.get(id);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(task?.titolo || "");

  if (!task) {
    return <p className="text-[12px] text-[#86868b]">Task non trovata</p>;
  }

  const matLinks = drawerData.matLinksByTask.get(id) || [];
  const statoKey = task.stato_calcolato || task.stato;

  const saveField = async (campo: string, valore: string | number | null) => {
    drawerData.onUpdateTask(id, campo, valore);
    try {
      await aggiornaTask(id, campo, valore);
    } catch (e) {
      toast.error("Errore salvataggio", { description: (e as Error).message });
    }
  };

  const handleNameBlur = () => {
    setEditingName(false);
    if (nameDraft !== task.titolo && nameDraft.trim()) {
      saveField("titolo", nameDraft.trim());
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
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNameBlur();
              if (e.key === "Escape") { setNameDraft(task.titolo); setEditingName(false); }
            }}
            className="text-[15px] font-semibold text-[#1d1d1f] w-full border border-[#e5e5e7] rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
        ) : (
          <h3
            className="text-[15px] font-semibold text-[#1d1d1f] cursor-pointer hover:bg-[#f5f5f7] rounded px-1 -mx-1 py-0.5"
            onClick={() => { setNameDraft(task.titolo); setEditingName(true); }}
          >
            {task.titolo}
          </h3>
        )}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <select
            value={task.stato}
            onChange={(e) => saveField("stato", e.target.value)}
            className={`text-[10px] px-2 py-0.5 rounded-full border-0 cursor-pointer ${STATO_COLORS[statoKey] || "bg-gray-100 text-gray-700"}`}
          >
            {STATO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {task.tipologia && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {task.tipologia}
            </span>
          )}
          {task.stato_calcolato !== task.stato && (
            <span className="text-[9px] text-[#86868b]">
              (calcolato: {STATO_LABELS[task.stato_calcolato] || task.stato_calcolato})
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="border-t border-[#f0f0f0] pt-3">
        <h4 className="text-[10px] text-[#86868b] font-semibold uppercase tracking-wide mb-2">
          Info
        </h4>
        <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-[12px]">
          <div>
            <div className="text-[#86868b] text-[10px] mb-0.5">Zona</div>
            <div className="font-medium text-[#1d1d1f]">{task.zona_nome}</div>
          </div>
          <div>
            <div className="text-[#86868b] text-[10px] mb-0.5">
              Lavorazione
            </div>
            <div className="font-medium text-[#1d1d1f]">
              {task.lavorazione_nome}
            </div>
          </div>
          <EditableTaskField
            label="Data inizio"
            value={task.data_inizio || ""}
            type="date"
            onSave={(v) => saveField("data_inizio", v || null)}
          />
          <EditableTaskField
            label="Data fine"
            value={task.data_fine || ""}
            type="date"
            onSave={(v) => saveField("data_fine", v || null)}
          />
          {task.durata_ore != null && (
            <div>
              <div className="text-[#86868b] text-[10px] mb-0.5">
                Durata ore
              </div>
              <div className="font-medium text-[#1d1d1f]">
                {task.durata_ore} h
              </div>
            </div>
          )}
          {task.numero_persone != null && (
            <div>
              <div className="text-[#86868b] text-[10px] mb-0.5">Persone</div>
              <div className="font-medium text-[#1d1d1f]">
                {task.numero_persone}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Materiali necessari */}
      <div className="border-t border-[#f0f0f0] pt-3">
        <h4 className="text-[10px] text-[#86868b] font-semibold uppercase tracking-wide mb-2">
          Materiali necessari ({matLinks.length})
        </h4>
        {matLinks.length === 0 ? (
          <p className="text-[12px] text-[#86868b]">
            Nessun materiale associato
          </p>
        ) : (
          <div className="space-y-0.5 max-h-[280px] overflow-y-auto">
            {matLinks.map((link, i) => {
              const mat = drawerData.materialiMap.get(link.catalogo_id);
              if (!mat) return null;
              return (
                <button
                  key={`${link.catalogo_id}-${i}`}
                  onClick={() => onOpenMateriale(link.catalogo_id)}
                  className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#f5f5f7] transition-colors"
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${SEMAFORO_COLORS[mat.stato_semaforo]}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-[#1d1d1f] truncate">
                      {mat.nome}
                    </div>
                    <div className="text-[10px] text-[#86868b]">
                      {mat.fornitore}
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
    </div>
  );
}
