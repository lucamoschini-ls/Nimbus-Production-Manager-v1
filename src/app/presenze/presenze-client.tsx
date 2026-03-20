"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";
import { addPresenza, updatePresenza, deletePresenza } from "./actions";

export interface Presenza {
  id: string; data: string; fornitore_id: string; task_id: string | null;
  numero_persone: number; ore: number; costo_ora: number | null; costo_totale: number | null;
  note: string | null;
  fornitore: { nome: string }; task: { titolo: string } | null;
}

interface Props {
  presenze: Presenza[];
  fornitori: { id: string; nome: string }[];
  tasks: { id: string; titolo: string }[];
}

function fmt(d: string) { return new Date(d + "T12:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "long", year: "numeric" }); }

export function PresenzeClient({ presenze, fornitori, tasks }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [adding, setAdding] = useState(false);
  const [newP, setNewP] = useState({ fornitore_id: "", numero_persone: "1", ore: "", costo_ora: "", task_id: "", note: "" });

  const dayPresenze = presenze.filter(p => p.data === selectedDate);
  const dayOre = dayPresenze.reduce((s, p) => s + p.ore, 0);
  const dayCosto = dayPresenze.reduce((s, p) => s + (p.costo_totale ?? 0), 0);

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleAdd = async () => {
    if (!newP.fornitore_id || !newP.ore) return;
    await addPresenza({
      data: selectedDate,
      fornitore_id: newP.fornitore_id,
      numero_persone: parseInt(newP.numero_persone) || 1,
      ore: parseFloat(newP.ore),
      costo_ora: newP.costo_ora ? parseFloat(newP.costo_ora) : undefined,
      task_id: newP.task_id || undefined,
      note: newP.note || undefined,
    });
    setNewP({ fornitore_id: "", numero_persone: "1", ore: "", costo_ora: "", task_id: "", note: "" });
    setAdding(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#1d1d1f] mb-6">Presenze</h1>

      {/* Date selector */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => shiftDate(-1)} className="p-2 rounded-lg hover:bg-[#f5f5f7]"><ChevronLeft size={18} /></button>
        <div className="flex items-center gap-2">
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="text-sm border border-[#e5e5e7] rounded-lg px-3 py-2 bg-white" />
          <span className="text-sm text-[#86868b]">{fmt(selectedDate)}</span>
        </div>
        <button onClick={() => shiftDate(1)} className="p-2 rounded-lg hover:bg-[#f5f5f7]"><ChevronRight size={18} /></button>
        <button onClick={() => setSelectedDate(today)} className="text-xs text-[#86868b] hover:text-[#1d1d1f]">Oggi</button>
      </div>

      {/* Lista presenze del giorno */}
      {dayPresenze.length === 0 && !adding ? (
        <div className="flex flex-col items-center justify-center py-16 text-[#86868b]">
          <ClipboardList size={40} strokeWidth={1.2} />
          <p className="text-sm mt-3 font-medium">Nessuna presenza per questa data</p>
          <button onClick={() => setAdding(true)} className="mt-3 text-xs text-blue-600 hover:underline">+ Aggiungi presenza</button>
        </div>
      ) : (
        <div className="space-y-2">
          {dayPresenze.map((p) => (
            <div key={p.id} className="bg-white rounded-[12px] border border-[#e5e5e7] p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-[9px] text-[#86868b] block mb-0.5">Fornitore</label>
                  <select defaultValue={p.fornitore_id} onChange={(e) => updatePresenza(p.id, { fornitore_id: e.target.value })}
                    className="text-xs border border-[#e5e5e7] rounded px-2 py-1 bg-white">
                    {fornitori.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-[#86868b] block mb-0.5">Persone</label>
                  <input type="number" defaultValue={p.numero_persone} onBlur={(e) => updatePresenza(p.id, { numero_persone: parseInt(e.target.value) || 1 })}
                    className="text-xs border border-[#e5e5e7] rounded px-2 py-1 bg-white w-[50px] text-center" />
                </div>
                <div>
                  <label className="text-[9px] text-[#86868b] block mb-0.5">Ore</label>
                  <input type="number" defaultValue={p.ore} onBlur={(e) => updatePresenza(p.id, { ore: parseFloat(e.target.value) || 0 })}
                    className="text-xs border border-[#e5e5e7] rounded px-2 py-1 bg-white w-[60px] text-center" />
                </div>
                <div>
                  <label className="text-[9px] text-[#86868b] block mb-0.5">Costo/ora</label>
                  <input type="number" defaultValue={p.costo_ora ?? ""} onBlur={(e) => updatePresenza(p.id, { costo_ora: e.target.value ? parseFloat(e.target.value) : null })}
                    className="text-xs border border-[#e5e5e7] rounded px-2 py-1 bg-white w-[60px] text-center" />
                </div>
                <div>
                  <label className="text-[9px] text-[#86868b] block mb-0.5">Totale</label>
                  <span className="text-xs font-medium text-[#1d1d1f] px-2 py-1 block">{p.costo_totale != null ? p.costo_totale.toLocaleString("it-IT", { style: "currency", currency: "EUR" }) : "-"}</span>
                </div>
                <div>
                  <label className="text-[9px] text-[#86868b] block mb-0.5">Task</label>
                  <select defaultValue={p.task_id ?? ""} onChange={(e) => updatePresenza(p.id, { task_id: e.target.value || null })}
                    className="text-xs border border-[#e5e5e7] rounded px-2 py-1 bg-white max-w-[150px]">
                    <option value="">--</option>
                    {tasks.map(t => <option key={t.id} value={t.id}>{t.titolo}</option>)}
                  </select>
                </div>
                <input defaultValue={p.note ?? ""} onBlur={(e) => updatePresenza(p.id, { note: e.target.value || null })} placeholder="Note..."
                  className="flex-1 min-w-[100px] text-xs border-0 border-b border-[#e5e5e7] bg-transparent py-1 outline-none placeholder:text-[#d2d2d7]" />
                <button onClick={() => deletePresenza(p.id)} className="text-[#d2d2d7] hover:text-red-500 self-end pb-1">x</button>
              </div>
            </div>
          ))}

          {/* Totale giornaliero */}
          {dayPresenze.length > 0 && (
            <div className="bg-[#f5f5f7] rounded-[12px] p-4 flex flex-wrap gap-6 text-sm">
              <span className="text-[#86868b]">Totale giorno:</span>
              <span className="font-medium text-[#1d1d1f]">{dayPresenze.length} fornitor{dayPresenze.length === 1 ? "e" : "i"}</span>
              <span className="font-medium text-[#1d1d1f]">{dayOre}h</span>
              <span className="font-medium text-[#1d1d1f]">{dayCosto.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}</span>
            </div>
          )}

          {/* Add button */}
          {!adding && (
            <button onClick={() => setAdding(true)} className="text-xs text-[#86868b] hover:text-[#1d1d1f] flex items-center gap-1 mt-2">+ Aggiungi presenza</button>
          )}
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-4 mt-2">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-[9px] text-[#86868b] block mb-0.5">Fornitore</label>
              <select value={newP.fornitore_id} onChange={(e) => setNewP({ ...newP, fornitore_id: e.target.value })} className="text-xs border border-[#e5e5e7] rounded px-2 py-1 bg-white">
                <option value="">Seleziona...</option>
                {fornitori.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-[#86868b] block mb-0.5">Persone</label>
              <input type="number" value={newP.numero_persone} onChange={(e) => setNewP({ ...newP, numero_persone: e.target.value })} className="text-xs border border-[#e5e5e7] rounded px-2 py-1 bg-white w-[50px] text-center" />
            </div>
            <div>
              <label className="text-[9px] text-[#86868b] block mb-0.5">Ore</label>
              <input type="number" value={newP.ore} onChange={(e) => setNewP({ ...newP, ore: e.target.value })} className="text-xs border border-[#e5e5e7] rounded px-2 py-1 bg-white w-[60px] text-center" />
            </div>
            <div>
              <label className="text-[9px] text-[#86868b] block mb-0.5">Costo/ora</label>
              <input type="number" value={newP.costo_ora} onChange={(e) => setNewP({ ...newP, costo_ora: e.target.value })} className="text-xs border border-[#e5e5e7] rounded px-2 py-1 bg-white w-[60px] text-center" />
            </div>
            <button onClick={handleAdd} disabled={!newP.fornitore_id || !newP.ore} className="text-xs bg-[#1d1d1f] text-white rounded px-3 py-1.5 disabled:opacity-50">Salva</button>
            <button onClick={() => setAdding(false)} className="text-xs text-[#86868b]">Annulla</button>
          </div>
        </div>
      )}
    </div>
  );
}
