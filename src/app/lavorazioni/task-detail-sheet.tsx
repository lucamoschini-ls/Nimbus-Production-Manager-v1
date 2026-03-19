"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Plus, Search, Package, Link } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getDipendenze,
  addDipendenza,
  removeDipendenza,
  getMateriali,
  addMateriale,
  updateMateriale,
  removeMateriale,
  searchTasks,
} from "./dep-mat-actions";
import type { StatoFornitore } from "@/lib/types";

const STATI_TASK = [
  { value: "da_fare", label: "Da fare" },
  { value: "in_corso", label: "In corso" },
  { value: "completata", label: "Completata" },
  { value: "bloccata", label: "Bloccata" },
];

const STATI_FORNITORE_MINIMO: { value: StatoFornitore; label: string }[] = [
  { value: "confermato", label: "Confermato" },
  { value: "sopralluogo_fatto", label: "Sopralluogo fatto" },
  { value: "materiali_definiti", label: "Materiali definiti" },
  { value: "pronto", label: "Pronto" },
];

const STATO_CALCOLATO_LABELS: Record<string, string> = {
  da_fare: "Da fare",
  in_corso: "In corso",
  completata: "Completata",
  bloccata: "Bloccata",
  in_attesa_fornitore: "In attesa fornitore",
  in_attesa_dipendenza: "In attesa dipendenza",
  in_attesa_materiali: "In attesa materiali",
  in_attesa_permesso: "In attesa permesso",
};

const STATO_CALCOLATO_COLORS: Record<string, string> = {
  da_fare: "bg-gray-100 text-gray-600",
  in_corso: "bg-blue-100 text-blue-700",
  completata: "bg-green-100 text-green-700",
  bloccata: "bg-red-100 text-red-700",
  in_attesa_fornitore: "bg-amber-100 text-amber-700",
  in_attesa_dipendenza: "bg-amber-100 text-amber-700",
  in_attesa_materiali: "bg-amber-100 text-amber-700",
  in_attesa_permesso: "bg-amber-100 text-amber-700",
};

interface TaskData {
  id: string;
  titolo: string;
  tipologia: string | null;
  fornitore_id: string | null;
  fornitore_nome: string | null;
  fornitore_stato: StatoFornitore | null;
  stato_fornitore_minimo: StatoFornitore;
  stato: string;
  stato_calcolato: string;
  motivo_blocco: string | null;
  data_inizio: string | null;
  data_fine: string | null;
  durata_giorni: number | null;
  numero_persone: number | null;
  ore_lavoro: number | null;
  costo_ora: number | null;
  costo_manodopera: number | null;
  note: string | null;
  zona_nome: string;
  lavorazione_nome: string;
}

interface FornitoreMin {
  id: string;
  nome: string;
  stato: StatoFornitore;
}

interface TipologiaDb {
  nome: string;
  colore: string;
}

interface Props {
  task: TaskData | null;
  fornitori: FornitoreMin[];
  tipologieDb: TipologiaDb[];
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}

export function TaskDetailSheet({ task, fornitori, tipologieDb, open, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    titolo: "",
    tipologia: "" as string,
    fornitore_id: "" as string,
    stato_fornitore_minimo: "pronto" as StatoFornitore,
    stato: "da_fare" as string,
    motivo_blocco: "",
    data_inizio: "",
    data_fine: "",
    durata_giorni: "",
    numero_persone: "",
    ore_lavoro: "",
    costo_ora: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        titolo: task.titolo,
        tipologia: task.tipologia ?? "",
        fornitore_id: task.fornitore_id ?? "",
        stato_fornitore_minimo: task.stato_fornitore_minimo,
        stato: task.stato,
        motivo_blocco: task.motivo_blocco ?? "",
        data_inizio: task.data_inizio ?? "",
        data_fine: task.data_fine ?? "",
        durata_giorni: task.durata_giorni?.toString() ?? "",
        numero_persone: task.numero_persone?.toString() ?? "",
        ore_lavoro: task.ore_lavoro?.toString() ?? "",
        costo_ora: task.costo_ora?.toString() ?? "",
        note: task.note ?? "",
      });
    }
  }, [task]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        titolo: form.titolo,
        tipologia: form.tipologia || null,
        fornitore_id: form.fornitore_id || null,
        stato_fornitore_minimo: form.stato_fornitore_minimo,
        stato: form.stato,
        motivo_blocco: form.stato === "bloccata" ? form.motivo_blocco || null : null,
        data_inizio: form.data_inizio || null,
        data_fine: form.data_fine || null,
        durata_giorni: form.durata_giorni ? parseInt(form.durata_giorni) : null,
        numero_persone: form.numero_persone ? parseInt(form.numero_persone) : null,
        ore_lavoro: form.ore_lavoro ? parseFloat(form.ore_lavoro) : null,
        costo_ora: form.costo_ora ? parseFloat(form.costo_ora) : null,
        note: form.note || null,
      });
    } finally {
      setSaving(false);
    }
  };

  const costoCalcolato =
    form.numero_persone && form.ore_lavoro && form.costo_ora
      ? (parseInt(form.numero_persone) * parseFloat(form.ore_lavoro) * parseFloat(form.costo_ora)).toFixed(2)
      : null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-[420px]">
        <SheetHeader>
          <SheetTitle className="pr-8">{task?.titolo ?? "Task"}</SheetTitle>
          <SheetDescription>
            {task?.zona_nome} / {task?.lavorazione_nome}
          </SheetDescription>
        </SheetHeader>

        {/* Stato calcolato */}
        {task && (
          <div className="mt-4 mb-2">
            <Badge
              className={`${STATO_CALCOLATO_COLORS[task.stato_calcolato] ?? "bg-gray-100 text-gray-600"} text-xs`}
            >
              {STATO_CALCOLATO_LABELS[task.stato_calcolato] ?? task.stato_calcolato}
            </Badge>
            {task.stato_calcolato.startsWith("in_attesa") && (
              <p className="text-xs text-amber-600 mt-1">
                {task.stato_calcolato === "in_attesa_fornitore" && task.fornitore_nome
                  ? `${task.fornitore_nome} deve raggiungere: ${task.stato_fornitore_minimo.replace("_", " ")}`
                  : STATO_CALCOLATO_LABELS[task.stato_calcolato]}
              </p>
            )}
          </div>
        )}

        <div className="mt-4 space-y-4">
          {/* Titolo */}
          <div>
            <label className="text-xs font-medium text-[#86868b] mb-1.5 block">Titolo</label>
            <Input
              value={form.titolo}
              onChange={(e) => setForm({ ...form, titolo: e.target.value })}
            />
          </div>

          {/* Tipologia */}
          <div>
            <label className="text-xs font-medium text-[#86868b] mb-1.5 block">Tipologia</label>
            <Select value={form.tipologia} onValueChange={(v) => setForm({ ...form, tipologia: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona..." />
              </SelectTrigger>
              <SelectContent>
                {tipologieDb.map((t) => (
                  <SelectItem key={t.nome} value={t.nome}>{t.nome.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fornitore */}
          <div>
            <label className="text-xs font-medium text-[#86868b] mb-1.5 block">Fornitore</label>
            <Select value={form.fornitore_id} onValueChange={(v) => setForm({ ...form, fornitore_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Nessuno" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessuno</SelectItem>
                {fornitori.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stato fornitore minimo */}
          {form.fornitore_id && form.fornitore_id !== "none" && (
            <div>
              <label className="text-xs font-medium text-[#86868b] mb-1.5 block">
                Stato fornitore minimo
              </label>
              <Select
                value={form.stato_fornitore_minimo}
                onValueChange={(v) => setForm({ ...form, stato_fornitore_minimo: v as StatoFornitore })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATI_FORNITORE_MINIMO.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Stato */}
          <div>
            <label className="text-xs font-medium text-[#86868b] mb-1.5 block">Stato</label>
            <Select value={form.stato} onValueChange={(v) => setForm({ ...form, stato: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATI_TASK.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Motivo blocco */}
          {form.stato === "bloccata" && (
            <div>
              <label className="text-xs font-medium text-[#86868b] mb-1.5 block">Motivo blocco</label>
              <Input
                value={form.motivo_blocco}
                onChange={(e) => setForm({ ...form, motivo_blocco: e.target.value })}
                placeholder="Motivo del blocco"
              />
            </div>
          )}

          {/* Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#86868b] mb-1.5 block">Data inizio</label>
              <Input
                type="date"
                value={form.data_inizio}
                onChange={(e) => setForm({ ...form, data_inizio: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#86868b] mb-1.5 block">Data fine</label>
              <Input
                type="date"
                value={form.data_fine}
                onChange={(e) => setForm({ ...form, data_fine: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#86868b] mb-1.5 block">Durata (giorni)</label>
            <Input
              type="number"
              value={form.durata_giorni}
              onChange={(e) => setForm({ ...form, durata_giorni: e.target.value })}
            />
          </div>

          {/* Costi */}
          <div className="border-t border-[#e5e5e7] pt-4">
            <h3 className="text-xs font-semibold text-[#1d1d1f] mb-3">Costi</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-medium text-[#86868b] mb-1 block">Persone</label>
                <Input
                  type="number"
                  value={form.numero_persone}
                  onChange={(e) => setForm({ ...form, numero_persone: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-[#86868b] mb-1 block">Ore lavoro</label>
                <Input
                  type="number"
                  value={form.ore_lavoro}
                  onChange={(e) => setForm({ ...form, ore_lavoro: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-[#86868b] mb-1 block">Costo/ora</label>
                <Input
                  type="number"
                  value={form.costo_ora}
                  onChange={(e) => setForm({ ...form, costo_ora: e.target.value })}
                />
              </div>
            </div>
            {costoCalcolato && (
              <p className="text-xs text-[#1d1d1f] mt-2 font-medium">
                Costo manodopera: {parseFloat(costoCalcolato).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
              </p>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-medium text-[#86868b] mb-1.5 block">Note</label>
            <Textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              rows={3}
            />
          </div>

          {/* DIPENDENZE */}
          {task && (
            <DipendenzeSection taskId={task.id} />
          )}

          {/* MATERIALI */}
          {task && (
            <MaterialiSection taskId={task.id} />
          )}

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={saving || !form.titolo.trim()}
            className="w-full"
          >
            {saving ? "Salvataggio..." : "Salva"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ========== DIPENDENZE SECTION ==========

interface DepTask {
  dipende_da_id: string;
  task: {
    id: string;
    titolo: string;
    stato: string;
    stato_calcolato: string;
    lavorazione: {
      nome: string;
      zona: { nome: string };
    };
  };
}

interface SearchResult {
  id: string;
  titolo: string;
  zona_nome: string;
  lavorazione_nome: string;
  stato_calcolato: string;
}

function DipendenzeSection({ taskId }: { taskId: string }) {
  const [deps, setDeps] = useState<DepTask[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  const loadDeps = useCallback(async () => {
    const data = await getDipendenze(taskId);
    setDeps(data as unknown as DepTask[]);
  }, [taskId]);

  useEffect(() => {
    loadDeps();
  }, [loadDeps]);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const results = await searchTasks(q);
    setSearchResults(
      results.filter(
        (r) => r.id !== taskId && !deps.some((d) => d.dipende_da_id === r.id)
      )
    );
    setSearching(false);
  };

  const handleAdd = async (depId: string) => {
    await addDipendenza(taskId, depId);
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    await loadDeps();
  };

  const handleRemove = async (depId: string) => {
    await removeDipendenza(taskId, depId);
    await loadDeps();
  };

  const STATO_COLORS_SMALL: Record<string, string> = {
    completata: "text-green-600",
    in_corso: "text-blue-600",
    da_fare: "text-gray-500",
    bloccata: "text-red-600",
  };

  return (
    <div className="border-t border-[#e5e5e7] pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-[#1d1d1f] flex items-center gap-1.5">
          <Link size={13} />
          Dipendenze ({deps.length})
        </h3>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="text-xs text-[#86868b] hover:text-[#1d1d1f] flex items-center gap-1"
        >
          <Plus size={12} /> Aggiungi
        </button>
      </div>

      {/* Search dropdown */}
      {showSearch && (
        <div className="mb-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-[#86868b]" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Cerca task..."
              className="w-full text-xs border border-[#e5e5e7] rounded-lg pl-8 pr-3 py-2 outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-1 border border-[#e5e5e7] rounded-lg bg-white max-h-48 overflow-y-auto">
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleAdd(r.id)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[#f5f5f7] border-b border-[#e5e5e7] last:border-0"
                >
                  <span className="text-[10px] text-[#86868b]">
                    {r.zona_nome} &gt; {r.lavorazione_nome}
                  </span>
                  <br />
                  <span className="text-[#1d1d1f]">{r.titolo}</span>
                </button>
              ))}
            </div>
          )}
          {searching && (
            <p className="text-[10px] text-[#86868b] mt-1">Ricerca...</p>
          )}
        </div>
      )}

      {/* Deps list */}
      {deps.length === 0 && !showSearch && (
        <p className="text-xs text-[#86868b]">Nessuna dipendenza</p>
      )}
      <div className="space-y-1.5">
        {deps.map((d) => (
          <div
            key={d.dipende_da_id}
            className="flex items-center gap-2 bg-[#f5f5f7] rounded-lg px-3 py-2"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#1d1d1f] truncate">{d.task.titolo}</p>
              <p className="text-[10px] text-[#86868b]">
                {d.task.lavorazione?.zona?.nome} &gt; {d.task.lavorazione?.nome}
              </p>
            </div>
            <span
              className={`text-[10px] font-medium ${
                STATO_COLORS_SMALL[d.task.stato_calcolato] ?? "text-amber-600"
              }`}
            >
              {d.task.stato_calcolato === "completata" ? "OK" : "..."}
            </span>
            <button
              onClick={() => handleRemove(d.dipende_da_id)}
              className="text-[#86868b] hover:text-red-500"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========== MATERIALI SECTION ==========

const UNITA_OPTIONS = ["pz", "mq", "ml", "kg", "kit", "lt", "set", "rotolo"];
const PROVENIENZA_OPTIONS = [
  { value: "acquisto", label: "Acquisto" },
  { value: "magazzino", label: "Magazzino" },
  { value: "noleggio", label: "Noleggio" },
  { value: "con_fornitore", label: "Con fornitore" },
];
const PROVENIENZA_COLORS: Record<string, string> = {
  acquisto: "bg-pink-100 text-pink-700",
  magazzino: "bg-gray-100 text-gray-600",
  noleggio: "bg-blue-100 text-blue-700",
  con_fornitore: "bg-violet-100 text-violet-700",
};

interface MaterialeData {
  id: string;
  nome: string;
  quantita: number | null;
  unita: string | null;
  prezzo_unitario: number | null;
  costo_totale: number | null;
  provenienza: string | null;
  ordinato: boolean;
  in_cantiere: boolean;
  giorni_consegna: number | null;
  data_ordine: string | null;
  data_consegna_prevista: string | null;
  note: string | null;
}

function MaterialiSection({ taskId }: { taskId: string }) {
  const [materiali, setMateriali] = useState<MaterialeData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newMat, setNewMat] = useState({
    nome: "",
    quantita: "",
    unita: "pz",
    prezzo_unitario: "",
    provenienza: "acquisto",
    giorni_consegna: "",
    note: "",
  });

  const loadMateriali = useCallback(async () => {
    const data = await getMateriali(taskId);
    setMateriali(data as MaterialeData[]);
  }, [taskId]);

  useEffect(() => {
    loadMateriali();
  }, [loadMateriali]);

  const handleAdd = async () => {
    if (!newMat.nome.trim()) return;
    await addMateriale({
      task_id: taskId,
      nome: newMat.nome,
      quantita: newMat.quantita ? parseFloat(newMat.quantita) : undefined,
      unita: newMat.unita || undefined,
      prezzo_unitario: newMat.prezzo_unitario ? parseFloat(newMat.prezzo_unitario) : undefined,
      provenienza: newMat.provenienza || undefined,
      giorni_consegna: newMat.giorni_consegna ? parseInt(newMat.giorni_consegna) : undefined,
      note: newMat.note || undefined,
    });
    setNewMat({ nome: "", quantita: "", unita: "pz", prezzo_unitario: "", provenienza: "acquisto", giorni_consegna: "", note: "" });
    setShowForm(false);
    await loadMateriali();
  };

  const toggleField = async (id: string, field: "ordinato" | "in_cantiere", value: boolean) => {
    const update: Record<string, unknown> = { [field]: value };
    if (field === "ordinato" && value) {
      update.data_ordine = new Date().toISOString().split("T")[0];
    }
    await updateMateriale(id, update);
    await loadMateriali();
  };

  const handleRemove = async (id: string) => {
    await removeMateriale(id);
    await loadMateriali();
  };

  return (
    <div className="border-t border-[#e5e5e7] pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-[#1d1d1f] flex items-center gap-1.5">
          <Package size={13} />
          Materiali ({materiali.length})
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-[#86868b] hover:text-[#1d1d1f] flex items-center gap-1"
        >
          <Plus size={12} /> Aggiungi
        </button>
      </div>

      {/* Lista materiali */}
      {materiali.length === 0 && !showForm && (
        <p className="text-xs text-[#86868b]">Nessun materiale</p>
      )}
      <div className="space-y-2">
        {materiali.map((m) => (
          <div key={m.id} className="bg-[#f5f5f7] rounded-lg px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#1d1d1f]">{m.nome}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {m.quantita != null && (
                    <span className="text-[10px] text-[#86868b]">
                      {m.quantita} {m.unita}
                    </span>
                  )}
                  {m.prezzo_unitario != null && (
                    <span className="text-[10px] text-[#86868b]">
                      x {m.prezzo_unitario.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                    </span>
                  )}
                  {m.costo_totale != null && (
                    <span className="text-[10px] font-medium text-[#1d1d1f]">
                      = {m.costo_totale.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                    </span>
                  )}
                  {m.provenienza && (
                    <Badge className={`text-[10px] ${PROVENIENZA_COLORS[m.provenienza] ?? "bg-gray-100 text-gray-600"}`}>
                      {m.provenienza.replace("_", " ")}
                    </Badge>
                  )}
                </div>
              </div>
              <button onClick={() => handleRemove(m.id)} className="text-[#86868b] hover:text-red-500 mt-0.5">
                <X size={12} />
              </button>
            </div>
            {/* Toggles */}
            <div className="flex items-center gap-4 mt-2">
              <label className="flex items-center gap-1.5 text-[10px] text-[#86868b] cursor-pointer">
                <input
                  type="checkbox"
                  checked={m.ordinato}
                  onChange={(e) => toggleField(m.id, "ordinato", e.target.checked)}
                  className="rounded border-[#e5e5e7]"
                />
                Ordinato
              </label>
              <label className="flex items-center gap-1.5 text-[10px] text-[#86868b] cursor-pointer">
                <input
                  type="checkbox"
                  checked={m.in_cantiere}
                  onChange={(e) => toggleField(m.id, "in_cantiere", e.target.checked)}
                  className="rounded border-[#e5e5e7]"
                />
                In cantiere
              </label>
              {m.giorni_consegna != null && (
                <span className="text-[10px] text-[#86868b]">{m.giorni_consegna}gg consegna</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Form nuovo materiale */}
      {showForm && (
        <div className="mt-3 bg-white border border-[#e5e5e7] rounded-lg p-3 space-y-2.5">
          <input
            autoFocus
            value={newMat.nome}
            onChange={(e) => setNewMat({ ...newMat, nome: e.target.value })}
            placeholder="Nome materiale"
            className="w-full text-xs border border-[#e5e5e7] rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              value={newMat.quantita}
              onChange={(e) => setNewMat({ ...newMat, quantita: e.target.value })}
              placeholder="Qty"
              className="text-xs border border-[#e5e5e7] rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-ring"
            />
            <select
              value={newMat.unita}
              onChange={(e) => setNewMat({ ...newMat, unita: e.target.value })}
              className="text-xs border border-[#e5e5e7] rounded px-2 py-1.5 bg-white"
            >
              {UNITA_OPTIONS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <input
              type="number"
              value={newMat.prezzo_unitario}
              onChange={(e) => setNewMat({ ...newMat, prezzo_unitario: e.target.value })}
              placeholder="Prezzo"
              className="text-xs border border-[#e5e5e7] rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={newMat.provenienza}
              onChange={(e) => setNewMat({ ...newMat, provenienza: e.target.value })}
              className="text-xs border border-[#e5e5e7] rounded px-2 py-1.5 bg-white"
            >
              {PROVENIENZA_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <input
              type="number"
              value={newMat.giorni_consegna}
              onChange={(e) => setNewMat({ ...newMat, giorni_consegna: e.target.value })}
              placeholder="Gg consegna"
              className="text-xs border border-[#e5e5e7] rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <input
            value={newMat.note}
            onChange={(e) => setNewMat({ ...newMat, note: e.target.value })}
            placeholder="Note..."
            className="w-full text-xs border border-[#e5e5e7] rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={!newMat.nome.trim()} className="flex-1 text-xs">
              Salva
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="text-xs">
              Annulla
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
