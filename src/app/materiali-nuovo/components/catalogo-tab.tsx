"use client";

import { useMemo, useState, useRef } from "react";
import { Search, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { MaterialeArricchito, CatalogoViewRow, CatalogoExtraRow } from "../materiali-superficie";
import { aggiornaMateriale, creaMateriale, eliminaMateriale } from "../actions";

const SEMAFORO_COLORS = {
  rosso: "bg-red-500",
  giallo: "bg-yellow-400",
  verde: "bg-green-500",
};

interface Props {
  materiali: MaterialeArricchito[];
  onUpdateCatalogo: (id: string, campo: string, valore: string | number | null) => void;
  onAddMateriale: (newCatalogo: CatalogoViewRow, newExtra: CatalogoExtraRow) => void;
  onRemoveMateriale: (id: string) => void;
}

function EditableCell({
  value,
  onSave,
  type = "text",
  className = "",
  placeholder = "—",
}: {
  value: string | number | null;
  onSave: (v: string) => void;
  type?: "text" | "number";
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  const handleBlur = () => {
    setEditing(false);
    const newVal = draft.trim();
    if (newVal !== String(value ?? "")) {
      onSave(newVal);
    }
  };

  if (!editing) {
    return (
      <div
        className={`cursor-pointer hover:bg-[#f0f0f0] rounded px-1 -mx-1 py-0.5 min-h-[24px] ${className}`}
        onClick={() => {
          setDraft(String(value ?? ""));
          setEditing(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        {value != null && value !== "" && value !== 0 ? (
          String(value)
        ) : (
          <span className="text-[#b0b0b5]">{placeholder}</span>
        )}
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      type={type}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleBlur();
        if (e.key === "Escape") {
          setDraft(String(value ?? ""));
          setEditing(false);
        }
      }}
      className={`w-full text-[12px] border border-[#e5e5e7] rounded px-1 py-0.5 bg-white outline-none focus:ring-1 focus:ring-ring -mx-1 ${className}`}
      autoFocus
    />
  );
}

export function CatalogoTab({ materiali, onUpdateCatalogo, onAddMateriale, onRemoveMateriale }: Props) {
  const [cerca, setCerca] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const newInputRef = useRef<HTMLInputElement>(null);

  const filtrati = useMemo(() => {
    if (!cerca) return materiali;
    const q = cerca.toLowerCase();
    return materiali.filter((m) => m.nome.toLowerCase().includes(q));
  }, [materiali, cerca]);

  const handleFieldSave = async (id: string, campo: string, rawValue: string) => {
    let valore: string | number | null = rawValue || null;
    if (campo === "prezzo") {
      valore = rawValue ? parseFloat(rawValue) : null;
    }
    onUpdateCatalogo(id, campo, valore);
    try {
      await aggiornaMateriale(id, campo, valore);
    } catch (e) {
      toast.error("Errore salvataggio", { description: (e as Error).message });
    }
  };

  const handleCreate = async () => {
    const nome = newName.trim();
    if (!nome) return;
    setShowNewDialog(false);
    setNewName("");
    try {
      const newId = await creaMateriale(nome);
      const newCatalogo: CatalogoViewRow = {
        id: newId,
        nome,
        tipologia_materiale: "consumo",
        unita: null,
        prezzo_unitario: null,
        quantita_disponibile_globale: 0,
        fornitore_preferito: null,
        provenienza_default: null,
        note: null,
        quantita_totale_necessaria: 0,
        num_task: 0,
        quantita_da_acquistare: 0,
        costo_stimato: null,
      };
      const newExtra: CatalogoExtraRow = {
        id: newId,
        categoria_comportamentale: null,
        tipo_voce: "standard",
      };
      onAddMateriale(newCatalogo, newExtra);
      toast.success(`Materiale "${nome}" creato`);
    } catch (e) {
      toast.error("Errore creazione", { description: (e as Error).message });
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!window.confirm(`Eliminare "${nome}" e tutti i suoi collegamenti?`)) return;
    onRemoveMateriale(id);
    try {
      await eliminaMateriale(id);
      toast.success(`"${nome}" eliminato`);
    } catch (e) {
      toast.error("Errore eliminazione", { description: (e as Error).message });
    }
  };

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
        <button
          onClick={() => {
            setShowNewDialog(true);
            setTimeout(() => newInputRef.current?.focus(), 100);
          }}
          className="flex items-center gap-1 text-[11px] text-[#86868b] hover:text-[#1d1d1f] px-2.5 py-1.5 rounded-lg border border-[#e5e5e7] hover:bg-[#f5f5f7] transition-colors"
        >
          <Plus size={13} />
          Nuovo materiale
        </button>
      </div>

      {/* New material dialog */}
      {showNewDialog && (
        <div className="flex items-center gap-2 px-6 py-2 bg-blue-50 border-b border-blue-200">
          <input
            ref={newInputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") { setShowNewDialog(false); setNewName(""); }
            }}
            placeholder="Nome del nuovo materiale..."
            className="flex-1 text-[12px] border border-[#e5e5e7] rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-ring bg-white"
            autoFocus
          />
          <button
            onClick={handleCreate}
            className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-[#1d1d1f] text-white hover:bg-[#333]"
          >
            Crea
          </button>
          <button
            onClick={() => { setShowNewDialog(false); setNewName(""); }}
            className="text-[11px] text-[#86868b] hover:text-[#1d1d1f] px-2 py-1.5"
          >
            Annulla
          </button>
        </div>
      )}

      {/* Table header */}
      <div className="grid grid-cols-[auto_1fr_60px_80px_120px_80px_80px_80px_32px] gap-2 px-6 py-2 bg-[#fafafa] border-b border-[#e5e5e7] text-[10px] text-[#86868b] font-semibold uppercase tracking-wide">
        <div className="w-3" />
        <div>Nome</div>
        <div>Unita</div>
        <div className="text-right">Prezzo</div>
        <div>Fornitore</div>
        <div className="text-right">Necessario</div>
        <div className="text-right">Disponibile</div>
        <div className="text-right">Da comprare</div>
        <div />
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {filtrati.map((m) => (
          <div
            key={m.id}
            className="grid grid-cols-[auto_1fr_60px_80px_120px_80px_80px_80px_32px] gap-2 px-6 py-2 border-b border-[#f0f0f0] text-[12px] hover:bg-[#f5f5f7] transition-colors group"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full mt-0.5 ${SEMAFORO_COLORS[m.stato_semaforo]}`}
            />
            <div className="min-w-0">
              <EditableCell
                value={m.nome}
                onSave={(v) => handleFieldSave(m.id, "nome", v)}
                className="text-[#1d1d1f] font-medium"
              />
              <div className="text-[10px] text-[#86868b]">
                {m.tipologia || "—"}
              </div>
            </div>
            <EditableCell
              value={m.unita}
              onSave={(v) => handleFieldSave(m.id, "unita", v)}
              className="text-[#86868b]"
            />
            <EditableCell
              value={m.prezzo_unitario > 0 ? m.prezzo_unitario : null}
              onSave={(v) => handleFieldSave(m.id, "prezzo", v)}
              type="number"
              className="text-right text-[#1d1d1f]"
              placeholder="—"
            />
            <EditableCell
              value={m.fornitore === "Da assegnare" ? null : m.fornitore}
              onSave={(v) => handleFieldSave(m.id, "fornitore", v)}
              className={`truncate ${m.fornitore === "Da assegnare" ? "text-[#b0b0b5]" : "text-[#1d1d1f]"}`}
            />
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
            <button
              onClick={() => handleDelete(m.id, m.nome)}
              className="opacity-0 group-hover:opacity-100 text-[#b0b0b5] hover:text-red-500 p-1 rounded transition-opacity self-center"
              title="Elimina materiale"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
