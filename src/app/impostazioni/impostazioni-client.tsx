"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  updateZona,
  createZona,
  deleteZona,
  updateTipologia,
  createTipologia,
  deleteTipologia,
} from "./actions";

interface Zona {
  id: string;
  nome: string;
  colore: string;
  ordine: number;
}

interface Tipologia {
  id: string;
  nome: string;
  colore: string;
  ordine: number;
}

interface Luogo { id: string; nome: string; indirizzo: string | null; note: string | null; ordine: number; }

interface Props {
  zone: Zona[];
  tipologie: Tipologia[];
  zonaLavCount: Record<string, number>;
  tipTaskCount: Record<string, number>;
  luoghi: Luogo[];
}

const STATI_FORNITORE = [
  {
    nome: "da_trovare",
    label: "Da trovare",
    colore: "bg-red-100 text-red-700",
    desc: "Il fornitore non e' stato ancora individuato. Fase iniziale di ricerca.",
  },
  {
    nome: "contattato",
    label: "Contattato",
    colore: "bg-amber-100 text-amber-700",
    desc: "Primo contatto avvenuto. In attesa di riscontro o preventivo.",
  },
  {
    nome: "confermato",
    label: "Confermato",
    colore: "bg-blue-100 text-blue-700",
    desc: "Il fornitore ha confermato la disponibilita'. Accordo di massima raggiunto.",
  },
  {
    nome: "sopralluogo_fatto",
    label: "Sopralluogo fatto",
    colore: "bg-indigo-100 text-indigo-700",
    desc: "Il fornitore ha visitato il cantiere e conosce il contesto operativo.",
  },
  {
    nome: "materiali_definiti",
    label: "Materiali definiti",
    colore: "bg-violet-100 text-violet-700",
    desc: "Lista materiali e specifiche tecniche concordate con il fornitore.",
  },
  {
    nome: "pronto",
    label: "Pronto",
    colore: "bg-green-100 text-green-700",
    desc: "Il fornitore e' pronto a operare. Tutte le task associate vengono sbloccate.",
  },
];

export function ImpostazioniClient({
  zone,
  tipologie,
  zonaLavCount,
  tipTaskCount,
  luoghi,
}: Props) {
  const [activeTab, setActiveTab] = useState<"zone" | "tipologie" | "luoghi" | "stati">("zone");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#1d1d1f] mb-6">Impostazioni</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#f5f5f7] rounded-lg p-1 w-fit">
        {(
          [
            { key: "zone", label: "Zone" },
            { key: "tipologie", label: "Tipologie" },
            { key: "luoghi", label: "Luoghi" },
            { key: "stati", label: "Stati fornitore" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-[#86868b] hover:text-[#1d1d1f]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "zone" && (
        <ZoneSection zone={zone} zonaLavCount={zonaLavCount} />
      )}
      {activeTab === "tipologie" && (
        <TipologieSection tipologie={tipologie} tipTaskCount={tipTaskCount} />
      )}
      {activeTab === "luoghi" && <LuoghiSection luoghi={luoghi} />}
      {activeTab === "stati" && <StatiFornitoreSection />}
    </div>
  );
}

// ========== ZONE SECTION ==========

function ZoneSection({
  zone,
  zonaLavCount,
}: {
  zone: Zona[];
  zonaLavCount: Record<string, number>;
}) {
  const [editing, setEditing] = useState<Record<string, Partial<Zona>>>({});
  const [adding, setAdding] = useState(false);
  const [newZona, setNewZona] = useState({ nome: "", colore: "#86868b" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const startEdit = (z: Zona) => {
    setEditing((prev) => ({ ...prev, [z.id]: { nome: z.nome, colore: z.colore } }));
  };

  const saveEdit = async (z: Zona) => {
    const edits = editing[z.id];
    if (!edits) return;
    setSaving(z.id);
    try {
      await updateZona(z.id, edits);
      setEditing((prev) => {
        const next = { ...prev };
        delete next[z.id];
        return next;
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const handleMove = async (z: Zona, direction: "up" | "down") => {
    const idx = zone.findIndex((x) => x.id === z.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= zone.length) return;
    const other = zone[swapIdx];
    await Promise.all([
      updateZona(z.id, { ordine: other.ordine }),
      updateZona(other.id, { ordine: z.ordine }),
    ]);
  };

  const handleDelete = async (z: Zona) => {
    const lavCount = zonaLavCount[z.id] || 0;
    if (lavCount > 0) {
      setError(`Impossibile eliminare "${z.nome}": ha ${lavCount} lavorazioni collegate`);
      return;
    }
    if (!confirm(`Eliminare la zona "${z.nome}"?`)) return;
    try {
      await deleteZona(z.id);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleAdd = async () => {
    if (!newZona.nome.trim()) return;
    try {
      await createZona({
        nome: newZona.nome.trim(),
        colore: newZona.colore,
        ordine: zone.length,
      });
      setNewZona({ nome: "", colore: "#86868b" });
      setAdding(false);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="bg-white rounded-[12px] border border-[#e5e5e7]">
      <div className="px-5 py-4 border-b border-[#e5e5e7] flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#1d1d1f]">Zone ({zone.length})</h2>
        <Button size="sm" className="gap-1.5" onClick={() => setAdding(true)}>
          <Plus size={14} /> Aggiungi
        </Button>
      </div>

      {error && (
        <div className="mx-5 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Chiudi
          </button>
        </div>
      )}

      {/* Header */}
      <div className="grid grid-cols-[1fr_80px_60px_80px_40px] gap-3 px-5 py-2 text-[10px] font-medium text-[#86868b] border-b border-[#e5e5e7]">
        <span>Nome</span>
        <span>Colore</span>
        <span>Ordine</span>
        <span>Lavorazioni</span>
        <span></span>
      </div>

      {zone.map((z) => {
        const isEditing = !!editing[z.id];
        const edits = editing[z.id] || {};

        return (
          <div
            key={z.id}
            className="grid grid-cols-[1fr_80px_60px_80px_40px] gap-3 px-5 py-2.5 items-center border-b border-[#e5e5e7] last:border-0"
          >
            {isEditing ? (
              <input
                value={edits.nome ?? z.nome}
                onChange={(e) =>
                  setEditing((prev) => ({
                    ...prev,
                    [z.id]: { ...prev[z.id], nome: e.target.value },
                  }))
                }
                onBlur={() => saveEdit(z)}
                onKeyDown={(e) => e.key === "Enter" && saveEdit(z)}
                className="text-sm border border-[#e5e5e7] rounded px-2 py-1 outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
            ) : (
              <button
                onClick={() => startEdit(z)}
                className="text-sm text-[#1d1d1f] font-medium text-left hover:text-blue-600 flex items-center gap-2"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: z.colore }}
                />
                {z.nome}
              </button>
            )}

            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={edits.colore ?? z.colore}
                onChange={async (e) => {
                  await updateZona(z.id, { colore: e.target.value });
                }}
                className="w-7 h-7 rounded cursor-pointer border border-[#e5e5e7] p-0.5"
              />
            </div>

            <div className="flex items-center gap-0.5">
              <button
                onClick={() => handleMove(z, "up")}
                className="p-0.5 text-[#86868b] hover:text-[#1d1d1f]"
                disabled={z.ordine === 0}
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => handleMove(z, "down")}
                className="p-0.5 text-[#86868b] hover:text-[#1d1d1f]"
                disabled={z.ordine === zone.length - 1}
              >
                <ChevronDown size={14} />
              </button>
            </div>

            <span className="text-xs text-[#86868b]">{zonaLavCount[z.id] || 0}</span>

            <button
              onClick={() => handleDelete(z)}
              className="p-1 text-[#86868b] hover:text-red-500 disabled:opacity-30"
              disabled={!!saving}
            >
              <Trash2 size={14} />
            </button>
          </div>
        );
      })}

      {/* Add row */}
      {adding && (
        <div className="grid grid-cols-[1fr_80px_60px_80px_40px] gap-3 px-5 py-3 items-center bg-[#f5f5f7]/50">
          <input
            autoFocus
            value={newZona.nome}
            onChange={(e) => setNewZona((p) => ({ ...p, nome: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Nome zona"
            className="text-sm border border-[#e5e5e7] rounded px-2 py-1 outline-none focus:ring-1 focus:ring-ring"
          />
          <input
            type="color"
            value={newZona.colore}
            onChange={(e) => setNewZona((p) => ({ ...p, colore: e.target.value }))}
            className="w-7 h-7 rounded cursor-pointer border border-[#e5e5e7] p-0.5"
          />
          <span></span>
          <Button size="sm" onClick={handleAdd} className="text-xs">
            Salva
          </Button>
          <button
            onClick={() => setAdding(false)}
            className="text-xs text-[#86868b] hover:text-[#1d1d1f]"
          >
            Annulla
          </button>
        </div>
      )}
    </div>
  );
}

// ========== TIPOLOGIE SECTION ==========

function TipologieSection({
  tipologie,
  tipTaskCount,
}: {
  tipologie: Tipologia[];
  tipTaskCount: Record<string, number>;
}) {
  const [editing, setEditing] = useState<Record<string, Partial<Tipologia>>>({});
  const [adding, setAdding] = useState(false);
  const [newTip, setNewTip] = useState({ nome: "", colore: "#86868b" });
  const [error, setError] = useState<string | null>(null);

  const startEdit = (t: Tipologia) => {
    setEditing((prev) => ({ ...prev, [t.id]: { nome: t.nome, colore: t.colore } }));
  };

  const saveEdit = async (t: Tipologia) => {
    const edits = editing[t.id];
    if (!edits) return;
    try {
      await updateTipologia(t.id, edits);
      setEditing((prev) => {
        const next = { ...prev };
        delete next[t.id];
        return next;
      });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleMove = async (t: Tipologia, direction: "up" | "down") => {
    const idx = tipologie.findIndex((x) => x.id === t.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= tipologie.length) return;
    const other = tipologie[swapIdx];
    await Promise.all([
      updateTipologia(t.id, { ordine: other.ordine }),
      updateTipologia(other.id, { ordine: t.ordine }),
    ]);
  };

  const handleDelete = async (t: Tipologia) => {
    const taskCount = tipTaskCount[t.nome] || 0;
    if (taskCount > 0) {
      setError(`Impossibile eliminare "${t.nome}": ${taskCount} task la usano`);
      return;
    }
    if (!confirm(`Eliminare la tipologia "${t.nome}"?`)) return;
    try {
      await deleteTipologia(t.id, t.nome);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleAdd = async () => {
    if (!newTip.nome.trim()) return;
    try {
      await createTipologia({
        nome: newTip.nome.trim().toLowerCase().replace(/\s+/g, "_"),
        colore: newTip.colore,
        ordine: tipologie.length,
      });
      setNewTip({ nome: "", colore: "#86868b" });
      setAdding(false);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="bg-white rounded-[12px] border border-[#e5e5e7]">
      <div className="px-5 py-4 border-b border-[#e5e5e7] flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#1d1d1f]">
          Tipologie task ({tipologie.length})
        </h2>
        <Button size="sm" className="gap-1.5" onClick={() => setAdding(true)}>
          <Plus size={14} /> Aggiungi
        </Button>
      </div>

      {error && (
        <div className="mx-5 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Chiudi
          </button>
        </div>
      )}

      {/* Header */}
      <div className="grid grid-cols-[1fr_80px_60px_80px_40px] gap-3 px-5 py-2 text-[10px] font-medium text-[#86868b] border-b border-[#e5e5e7]">
        <span>Nome</span>
        <span>Colore</span>
        <span>Ordine</span>
        <span>Task</span>
        <span></span>
      </div>

      {tipologie.map((t) => {
        const isEditing = !!editing[t.id];
        const edits = editing[t.id] || {};
        const taskCount = tipTaskCount[t.nome] || 0;

        return (
          <div
            key={t.id}
            className="grid grid-cols-[1fr_80px_60px_80px_40px] gap-3 px-5 py-2.5 items-center border-b border-[#e5e5e7] last:border-0"
          >
            {isEditing ? (
              <input
                value={edits.nome ?? t.nome}
                onChange={(e) =>
                  setEditing((prev) => ({
                    ...prev,
                    [t.id]: { ...prev[t.id], nome: e.target.value },
                  }))
                }
                onBlur={() => saveEdit(t)}
                onKeyDown={(e) => e.key === "Enter" && saveEdit(t)}
                className="text-sm border border-[#e5e5e7] rounded px-2 py-1 outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
            ) : (
              <button
                onClick={() => startEdit(t)}
                className="text-sm text-[#1d1d1f] font-medium text-left hover:text-blue-600 flex items-center gap-2"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: t.colore }}
                />
                {t.nome.replace(/_/g, " ")}
              </button>
            )}

            <input
              type="color"
              value={edits.colore ?? t.colore}
              onChange={async (e) => {
                await updateTipologia(t.id, { colore: e.target.value });
              }}
              className="w-7 h-7 rounded cursor-pointer border border-[#e5e5e7] p-0.5"
            />

            <div className="flex items-center gap-0.5">
              <button
                onClick={() => handleMove(t, "up")}
                className="p-0.5 text-[#86868b] hover:text-[#1d1d1f]"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => handleMove(t, "down")}
                className="p-0.5 text-[#86868b] hover:text-[#1d1d1f]"
              >
                <ChevronDown size={14} />
              </button>
            </div>

            <span className="text-xs text-[#86868b]">{taskCount}</span>

            <button
              onClick={() => handleDelete(t)}
              className="p-1 text-[#86868b] hover:text-red-500"
            >
              <Trash2 size={14} />
            </button>
          </div>
        );
      })}

      {/* Add row */}
      {adding && (
        <div className="grid grid-cols-[1fr_80px_60px_80px_40px] gap-3 px-5 py-3 items-center bg-[#f5f5f7]/50">
          <input
            autoFocus
            value={newTip.nome}
            onChange={(e) => setNewTip((p) => ({ ...p, nome: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Nome tipologia"
            className="text-sm border border-[#e5e5e7] rounded px-2 py-1 outline-none focus:ring-1 focus:ring-ring"
          />
          <input
            type="color"
            value={newTip.colore}
            onChange={(e) => setNewTip((p) => ({ ...p, colore: e.target.value }))}
            className="w-7 h-7 rounded cursor-pointer border border-[#e5e5e7] p-0.5"
          />
          <span></span>
          <Button size="sm" onClick={handleAdd} className="text-xs">
            Salva
          </Button>
          <button
            onClick={() => setAdding(false)}
            className="text-xs text-[#86868b] hover:text-[#1d1d1f]"
          >
            Annulla
          </button>
        </div>
      )}
    </div>
  );
}

// ========== STATI FORNITORE SECTION ==========

function StatiFornitoreSection() {
  return (
    <div className="bg-white rounded-[12px] border border-[#e5e5e7]">
      <div className="px-5 py-4 border-b border-[#e5e5e7]">
        <h2 className="text-sm font-semibold text-[#1d1d1f]">
          Ciclo di vita fornitore
        </h2>
        <p className="text-xs text-[#86868b] mt-1">
          Il ciclo di vita è fisso e determina quando le task vengono sbloccate
          automaticamente. Ogni task con fornitore ha un campo
          &ldquo;stato fornitore minimo&rdquo; che indica quale stato deve
          raggiungere il fornitore per sbloccarla.
        </p>
      </div>

      <div className="p-5 space-y-3">
        {STATI_FORNITORE.map((stato, i) => (
          <div key={stato.nome} className="flex items-start gap-4">
            {/* Step indicator */}
            <div className="flex flex-col items-center flex-shrink-0 w-8">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${stato.colore}`}
              >
                {i + 1}
              </div>
              {i < STATI_FORNITORE.length - 1 && (
                <div className="w-px h-6 bg-[#e5e5e7] my-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2">
                <Badge className={stato.colore}>{stato.label}</Badge>
                {i < STATI_FORNITORE.length - 1 && (
                  <ArrowRight size={12} className="text-[#86868b]" />
                )}
              </div>
              <p className="text-xs text-[#86868b] mt-1">{stato.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========== LUOGHI SECTION ==========

function LuoghiSection({ luoghi }: { luoghi: Luogo[] }) {
  const [adding, setAdding] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newNome.trim()) return;
    try {
      const { createLuogo } = await import("./actions");
      await createLuogo({ nome: newNome.trim(), ordine: luoghi.length });
      setNewNome(""); setAdding(false);
    } catch (e) { setError((e as Error).message); }
  };

  const handleDelete = async (l: Luogo) => {
    if (!confirm(`Eliminare "${l.nome}"?`)) return;
    try {
      const { deleteLuogo } = await import("./actions");
      await deleteLuogo(l.id);
    } catch (e) { setError((e as Error).message); }
  };

  return (
    <div className="bg-white rounded-[12px] border border-[#e5e5e7]">
      <div className="px-5 py-4 border-b border-[#e5e5e7] flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#1d1d1f]">Luoghi di partenza ({luoghi.length})</h2>
        <Button size="sm" className="gap-1.5" onClick={() => setAdding(true)}><Plus size={14} /> Aggiungi</Button>
      </div>
      {error && <div className="mx-5 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error} <button onClick={() => setError(null)} className="ml-2 underline">Chiudi</button></div>}
      <div className="divide-y divide-[#e5e5e7]">
        {luoghi.map((l) => (
          <div key={l.id} className="flex items-center justify-between px-5 py-3">
            <div>
              <input
                defaultValue={l.nome}
                onBlur={async (e) => { if (e.target.value !== l.nome) { const { updateLuogo } = await import("./actions"); await updateLuogo(l.id, { nome: e.target.value }); } }}
                className="text-sm text-[#1d1d1f] font-medium bg-transparent border-0 outline-none focus:bg-white focus:border focus:border-[#e5e5e7] focus:rounded focus:px-2"
              />
              {l.indirizzo && <p className="text-xs text-[#86868b]">{l.indirizzo}</p>}
            </div>
            <button onClick={() => handleDelete(l)} className="p-1 text-[#d2d2d7] hover:text-red-500"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      {adding && (
        <div className="px-5 py-3 flex gap-2 border-t border-[#e5e5e7]">
          <input autoFocus value={newNome} onChange={(e) => setNewNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} placeholder="Nome luogo" className="flex-1 text-sm border border-[#e5e5e7] rounded px-2 py-1 outline-none focus:ring-1 focus:ring-ring" />
          <Button size="sm" onClick={handleAdd} disabled={!newNome.trim()}>Salva</Button>
          <button onClick={() => setAdding(false)} className="text-xs text-[#86868b]">Annulla</button>
        </div>
      )}
    </div>
  );
}
