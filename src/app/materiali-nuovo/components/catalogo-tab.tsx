"use client";

import { useMemo, useState, useDeferredValue, useRef } from "react";
import { Search, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { MaterialeArricchito, CatalogoViewRow, CatalogoExtraRow } from "../materiali-superficie";
import type { DrawerEntry } from "../hooks/use-superficie-state";
import { aggiornaMateriale, creaMateriale, eliminaMateriale } from "../actions";
import { UNITA_OPTIONS } from "./drawer-materiale";
import { GRUPPI_MERCEOLOGICI } from "../utils/gruppi";

const SEMAFORO_COLORS = {
  rosso: "bg-red-500",
  giallo: "bg-yellow-400",
  verde: "bg-green-500",
};

interface Props {
  materiali: MaterialeArricchito[];
  fornitoriDistinti: string[];
  onUpdateCatalogo: (id: string, campo: string, valore: string | number | null) => void;
  onAddMateriale: (newCatalogo: CatalogoViewRow, newExtra: CatalogoExtraRow) => void;
  onRemoveMateriale: (id: string) => void;
  onOpenDrawer: (tipo: DrawerEntry["tipo"], id: string) => void;
}

function FornitoreComboboxInline({ value, fornitori, onChange }: { value: string; fornitori: string[]; onChange: (v: string) => void }) {
  return (
    <div className="relative flex-1">
      <input
        list="fornitori-list-catalogo"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Fornitore"
        className="w-full text-[12px] border border-[#e5e5e7] rounded px-2 py-1.5 bg-white outline-none focus:ring-1 focus:ring-ring"
      />
      <datalist id="fornitori-list-catalogo">
        {fornitori.filter(f => f !== "Da assegnare").map(f => <option key={f} value={f} />)}
      </datalist>
    </div>
  );
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
        onClick={(e) => {
          e.stopPropagation();
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

export function CatalogoTab({ materiali, fornitoriDistinti, onUpdateCatalogo, onAddMateriale, onRemoveMateriale, onOpenDrawer }: Props) {
  const [cerca, setCerca] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUnita, setNewUnita] = useState("pz");
  const [newPrezzo, setNewPrezzo] = useState("");
  const [newFornitore, setNewFornitore] = useState("");
  const [newProvenienza, setNewProvenienza] = useState("acquisto");
  const [newTipologia, setNewTipologia] = useState("consumo");
  const [newGruppo, setNewGruppo] = useState("");
  const newInputRef = useRef<HTMLInputElement>(null);

  const resetDialog = () => {
    setShowNewDialog(false);
    setNewName("");
    setNewUnita("pz");
    setNewPrezzo("");
    setNewFornitore("");
    setNewProvenienza("acquisto");
    setNewTipologia("consumo");
    setNewGruppo("");
  };

  const deferredCerca = useDeferredValue(cerca);

  const filtrati = useMemo(() => {
    if (!deferredCerca) return materiali;
    const q = deferredCerca.toLowerCase();
    return materiali.filter((m) => m.nome.toLowerCase().includes(q));
  }, [materiali, deferredCerca]);

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
    const extra = {
      unita: newUnita || undefined,
      prezzo: newPrezzo ? parseFloat(newPrezzo) : undefined,
      fornitore: newFornitore || undefined,
      provenienza: newProvenienza || undefined,
      tipologia: newTipologia || undefined,
      gruppo: newGruppo || undefined,
    };
    resetDialog();
    try {
      const newId = await creaMateriale(nome, extra);
      const newCatalogo: CatalogoViewRow = {
        id: newId,
        nome,
        tipologia_materiale: extra.tipologia || "consumo",
        unita: extra.unita || null,
        prezzo_unitario: extra.prezzo || null,
        quantita_disponibile_globale: 0,
        fornitore_preferito: extra.fornitore || null,
        provenienza_default: extra.provenienza || null,
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
        gruppo_merceologico: extra.gruppo || null,
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
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-200 space-y-2">
          <div className="flex items-center gap-2">
            <input
              ref={newInputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") resetDialog();
              }}
              placeholder="Nome materiale (obbligatorio)"
              className="flex-1 text-[12px] border border-[#e5e5e7] rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-ring bg-white"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2">
            <select value={newUnita} onChange={e => setNewUnita(e.target.value)} className="text-[12px] border border-[#e5e5e7] rounded px-2 py-1.5 bg-white outline-none focus:ring-1 focus:ring-ring">
              {UNITA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input
              type="number"
              value={newPrezzo}
              onChange={(e) => setNewPrezzo(e.target.value)}
              placeholder="Prezzo €"
              className="w-24 text-[12px] border border-[#e5e5e7] rounded px-2 py-1.5 bg-white outline-none focus:ring-1 focus:ring-ring"
            />
            <FornitoreComboboxInline value={newFornitore} fornitori={fornitoriDistinti} onChange={setNewFornitore} />
            <select value={newProvenienza} onChange={e => setNewProvenienza(e.target.value)} className="text-[12px] border border-[#e5e5e7] rounded px-2 py-1.5 bg-white outline-none focus:ring-1 focus:ring-ring">
              <option value="acquisto">Acquisto</option>
              <option value="in_loco">In loco</option>
              <option value="magazzino">Magazzino</option>
              <option value="noleggio">Noleggio</option>
            </select>
            <select value={newTipologia} onChange={e => setNewTipologia(e.target.value)} className="text-[12px] border border-[#e5e5e7] rounded px-2 py-1.5 bg-white outline-none focus:ring-1 focus:ring-ring">
              <option value="consumo">consumo</option>
              <option value="strutturale">strutturale</option>
              <option value="attrezzo">attrezzo</option>
            </select>
            <select value={newGruppo} onChange={e => setNewGruppo(e.target.value)} className="text-[12px] border border-[#e5e5e7] rounded px-2 py-1.5 bg-white outline-none focus:ring-1 focus:ring-ring">
              <option value="">Gruppo (opzionale)</option>
              {GRUPPI_MERCEOLOGICI.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-[#1d1d1f] text-white hover:bg-[#333]"
            >
              Crea
            </button>
            <button
              onClick={() => resetDialog()}
              className="text-[11px] text-[#86868b] hover:text-[#1d1d1f] px-2 py-1.5"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Table header */}
      <div className="grid grid-cols-[auto_1fr_60px_80px_120px_120px_80px_80px_80px_32px] gap-2 px-6 py-2 bg-[#fafafa] border-b border-[#e5e5e7] text-[10px] text-[#86868b] font-semibold uppercase tracking-wide">
        <div className="w-3" />
        <div>Nome</div>
        <div>Unita</div>
        <div className="text-right">Prezzo</div>
        <div>Fornitore</div>
        <div>Gruppo</div>
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
            onClick={() => onOpenDrawer("materiale", m.id)}
            className="grid grid-cols-[auto_1fr_60px_80px_120px_120px_80px_80px_80px_32px] gap-2 px-6 py-2 border-b border-[#f0f0f0] text-[12px] hover:bg-[#f5f5f7] transition-colors group cursor-pointer"
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
            <div className="min-w-0" onClick={(e) => e.stopPropagation()}>
              <select
                value={m.gruppo_merceologico || ""}
                onChange={(e) => handleFieldSave(m.id, "gruppo_merceologico", e.target.value)}
                className="w-full text-[11px] border border-transparent hover:border-[#e5e5e7] rounded px-1 py-0.5 bg-transparent outline-none focus:ring-1 focus:ring-ring focus:border-[#e5e5e7] truncate"
              >
                <option value="">—</option>
                {GRUPPI_MERCEOLOGICI.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
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
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(m.id, m.nome); }}
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
