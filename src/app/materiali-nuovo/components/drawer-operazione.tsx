"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { aggiornaOperazione } from "../actions";

const STATO_OPTIONS = [
  { value: "da_fare", label: "Da fare" },
  { value: "organizzato", label: "Organizzato" },
  { value: "in_corso", label: "In corso" },
  { value: "completata", label: "Completata" },
  { value: "bloccata", label: "Bloccata" },
];

const STATO_COLORS: Record<string, string> = {
  da_fare: "bg-gray-100 text-gray-700",
  organizzato: "bg-blue-100 text-blue-700",
  in_corso: "bg-yellow-100 text-yellow-700",
  completata: "bg-green-100 text-green-700",
  bloccata: "bg-red-100 text-red-700",
};

const TIPOLOGIA_OPTIONS = [
  { value: "trasporto", label: "Trasporto" },
  { value: "acquisto", label: "Acquisto" },
  { value: "acquisto_e_trasporto", label: "Acquisto e trasporto" },
  { value: "noleggio", label: "Noleggio" },
  { value: "scarico", label: "Scarico" },
  { value: "installazione", label: "Installazione" },
  { value: "pulizia", label: "Pulizia" },
  { value: "altro", label: "Altro" },
];

interface OperazioneData {
  id: string;
  titolo: string;
  tipologia: string | null;
  stato: string;
  stato_calcolato: string | null;
  organizzato: boolean;
  data_inizio: string | null;
  data_fine: string | null;
  durata_ore: number | null;
  numero_persone: number | null;
  fornitore_id: string | null;
  fornitore_nome: string | null;
  luogo_id: string | null;
  luogo_nome: string | null;
  materiale_nome: string | null;
  materiale_id: string | null;
  note: string | null;
  motivo_blocco: string | null;
}

interface Props {
  id: string;
}

export function DrawerOperazione({ id }: Props) {
  const [op, setOp] = useState<OperazioneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("operazioni")
        .select(`
          id, titolo, tipologia, stato, stato_calcolato, organizzato,
          data_inizio, data_fine, durata_ore, numero_persone,
          fornitore_id, luogo_id, note, motivo_blocco,
          fornitore:fornitori!operazioni_fornitore_id_fkey(nome),
          luogo:luoghi!operazioni_luogo_id_fkey(nome),
          materiale:materiali!operazioni_materiale_id_fkey(
            id, nome
          )
        `)
        .eq("id", id)
        .single();

      if (cancelled) return;

      if (error || !data) {
        setOp(null);
        setLoading(false);
        return;
      }

      const row = data as Record<string, unknown>;
      const fornitore = row.fornitore as { nome: string } | null;
      const luogo = row.luogo as { nome: string } | null;
      const materiale = row.materiale as { id: string; nome: string } | null;

      setOp({
        id: row.id as string,
        titolo: row.titolo as string,
        tipologia: row.tipologia as string | null,
        stato: row.stato as string,
        stato_calcolato: row.stato_calcolato as string | null,
        organizzato: row.organizzato as boolean,
        data_inizio: row.data_inizio as string | null,
        data_fine: row.data_fine as string | null,
        durata_ore: row.durata_ore as number | null,
        numero_persone: row.numero_persone as number | null,
        fornitore_id: row.fornitore_id as string | null,
        fornitore_nome: fornitore?.nome ?? null,
        luogo_id: row.luogo_id as string | null,
        luogo_nome: luogo?.nome ?? null,
        materiale_nome: materiale?.nome ?? null,
        materiale_id: materiale?.id ?? null,
        note: row.note as string | null,
        motivo_blocco: row.motivo_blocco as string | null,
      });
      setNameDraft(row.titolo as string);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return <p className="text-[12px] text-[#86868b]">Caricamento...</p>;
  }

  if (!op) {
    return <p className="text-[12px] text-[#86868b]">Operazione non trovata</p>;
  }

  const saveField = async (campo: string, valore: string | number | boolean | null) => {
    // Optimistic update
    setOp((prev) => prev ? { ...prev, [campo]: valore } : prev);
    try {
      await aggiornaOperazione(op.id, campo, valore);
    } catch (e) {
      toast.error("Errore salvataggio", { description: (e as Error).message });
    }
  };

  const handleNameBlur = () => {
    setEditingName(false);
    if (nameDraft !== op.titolo && nameDraft.trim()) {
      saveField("titolo", nameDraft.trim());
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[9px] text-[#86868b] uppercase tracking-wide font-medium">Operazione</span>
        </div>
        {editingName ? (
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNameBlur();
              if (e.key === "Escape") { setNameDraft(op.titolo); setEditingName(false); }
            }}
            className="text-[15px] font-semibold text-[#1d1d1f] w-full border border-[#e5e5e7] rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
        ) : (
          <h3
            className="text-[15px] font-semibold text-[#1d1d1f] cursor-pointer hover:bg-[#f5f5f7] rounded px-1 -mx-1 py-0.5"
            onClick={() => { setNameDraft(op.titolo); setEditingName(true); }}
          >
            {op.titolo}
          </h3>
        )}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <select
            value={op.stato}
            onChange={(e) => saveField("stato", e.target.value)}
            className={`text-[10px] px-2 py-0.5 rounded-full border-0 cursor-pointer ${STATO_COLORS[op.stato] || "bg-gray-100 text-gray-700"}`}
          >
            {STATO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-[10px] text-[#86868b] cursor-pointer">
            <input
              type="checkbox"
              checked={op.organizzato}
              onChange={(e) => saveField("organizzato", e.target.checked)}
              className="w-3 h-3 rounded"
            />
            Organizzato
          </label>
        </div>
      </div>

      {/* Info */}
      <div className="border-t border-[#f0f0f0] pt-3">
        <h4 className="text-[10px] text-[#86868b] font-semibold uppercase tracking-wide mb-2">Info</h4>
        <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-[12px]">
          <div>
            <div className="text-[#86868b] text-[10px] mb-0.5">Tipologia</div>
            <select
              value={op.tipologia || ""}
              onChange={(e) => saveField("tipologia", e.target.value || null)}
              className="w-full text-[12px] border border-[#e5e5e7] rounded px-1 py-0.5 bg-white"
            >
              <option value="">--</option>
              {TIPOLOGIA_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-[#86868b] text-[10px] mb-0.5">Fornitore</div>
            <div className="font-medium text-[#1d1d1f]">
              {op.fornitore_nome || <span className="text-[#b0b0b5]">non assegnato</span>}
            </div>
          </div>
          <div>
            <div className="text-[#86868b] text-[10px] mb-0.5">Data inizio</div>
            <input
              type="date"
              value={op.data_inizio || ""}
              onChange={(e) => saveField("data_inizio", e.target.value || null)}
              className="w-full text-[12px] border border-[#e5e5e7] rounded px-1 py-0.5 bg-white"
            />
          </div>
          <div>
            <div className="text-[#86868b] text-[10px] mb-0.5">Data fine</div>
            <input
              type="date"
              value={op.data_fine || ""}
              onChange={(e) => saveField("data_fine", e.target.value || null)}
              className="w-full text-[12px] border border-[#e5e5e7] rounded px-1 py-0.5 bg-white"
            />
          </div>
          <div>
            <div className="text-[#86868b] text-[10px] mb-0.5">Durata ore</div>
            <input
              type="number"
              min="0"
              step="0.5"
              defaultValue={op.durata_ore ?? ""}
              onBlur={(e) => {
                const v = parseFloat(e.target.value);
                saveField("durata_ore", isNaN(v) ? null : v);
              }}
              className="w-full text-[12px] border border-[#e5e5e7] rounded px-1 py-0.5 bg-white"
            />
          </div>
          <div>
            <div className="text-[#86868b] text-[10px] mb-0.5">Persone</div>
            <input
              type="number"
              min="0"
              defaultValue={op.numero_persone ?? ""}
              onBlur={(e) => {
                const v = parseInt(e.target.value);
                saveField("numero_persone", isNaN(v) ? null : v);
              }}
              className="w-full text-[12px] border border-[#e5e5e7] rounded px-1 py-0.5 bg-white"
            />
          </div>
          <div>
            <div className="text-[#86868b] text-[10px] mb-0.5">Luogo</div>
            <div className="font-medium text-[#1d1d1f]">
              {op.luogo_nome || <span className="text-[#b0b0b5]">--</span>}
            </div>
          </div>
          <div>
            <div className="text-[#86868b] text-[10px] mb-0.5">Materiale</div>
            <div className="font-medium text-[#1d1d1f]">
              {op.materiale_nome || <span className="text-[#b0b0b5]">--</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Motivo blocco (visible only when bloccata) */}
      {op.stato === "bloccata" && (
        <div className="border-t border-[#f0f0f0] pt-3">
          <h4 className="text-[10px] text-[#86868b] font-semibold uppercase tracking-wide mb-2">Motivo blocco</h4>
          <textarea
            defaultValue={op.motivo_blocco || ""}
            onBlur={(e) => saveField("motivo_blocco", e.target.value || null)}
            placeholder="Descrivi perche questa operazione e bloccata..."
            className="w-full text-[12px] border border-[#e5e5e7] rounded px-2 py-1.5 bg-white outline-none focus:ring-1 focus:ring-ring min-h-[60px]"
          />
        </div>
      )}

      {/* Notes */}
      <div className="border-t border-[#f0f0f0] pt-3">
        <h4 className="text-[10px] text-[#86868b] font-semibold uppercase tracking-wide mb-2">Note</h4>
        <textarea
          defaultValue={op.note || ""}
          onBlur={(e) => saveField("note", e.target.value || null)}
          placeholder="Note..."
          className="w-full text-[12px] border border-[#e5e5e7] rounded px-2 py-1.5 bg-white outline-none focus:ring-1 focus:ring-ring min-h-[60px]"
        />
      </div>
    </div>
  );
}
