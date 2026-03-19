"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StatoFornitore } from "@/lib/types";

const STATO_OPTIONS: { value: StatoFornitore; label: string }[] = [
  { value: "da_trovare", label: "Da trovare" },
  { value: "contattato", label: "Contattato" },
  { value: "confermato", label: "Confermato" },
  { value: "sopralluogo_fatto", label: "Sopralluogo fatto" },
  { value: "materiali_definiti", label: "Materiali definiti" },
  { value: "pronto", label: "Pronto" },
];

const TIPO_OPTIONS = ["Fornitore", "Socio", "Consulente", "Manodopera"];

interface Fornitore {
  id: string;
  nome: string;
  tipo: string | null;
  specializzazione: string | null;
  contatto: string | null;
  stato: StatoFornitore;
  costo_ora: number | null;
  note: string | null;
}

interface Props {
  fornitore: Fornitore | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}

export function FornitoreSheet({ fornitore, open, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    nome: "",
    tipo: "",
    specializzazione: "",
    contatto: "",
    stato: "da_trovare" as StatoFornitore,
    costo_ora: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (fornitore) {
      setForm({
        nome: fornitore.nome,
        tipo: fornitore.tipo ?? "",
        specializzazione: fornitore.specializzazione ?? "",
        contatto: fornitore.contatto ?? "",
        stato: fornitore.stato,
        costo_ora: fornitore.costo_ora?.toString() ?? "",
        note: fornitore.note ?? "",
      });
    } else {
      setForm({
        nome: "",
        tipo: "Fornitore",
        specializzazione: "",
        contatto: "",
        stato: "da_trovare",
        costo_ora: "",
        note: "",
      });
    }
  }, [fornitore]);

  const handleSave = async () => {
    if (!form.nome.trim()) return;
    setSaving(true);
    try {
      await onSave({
        nome: form.nome,
        tipo: form.tipo || null,
        specializzazione: form.specializzazione || null,
        contatto: form.contatto || null,
        stato: form.stato,
        costo_ora: form.costo_ora ? parseFloat(form.costo_ora) : null,
        note: form.note || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {fornitore ? fornitore.nome : "Nuovo fornitore"}
          </SheetTitle>
          <SheetDescription>
            {fornitore ? "Modifica i dati del fornitore" : "Aggiungi un nuovo fornitore"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Nome */}
          <div>
            <label className="text-xs font-medium text-[#86868b] mb-1.5 block">
              Nome
            </label>
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Nome fornitore"
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="text-xs font-medium text-[#86868b] mb-1.5 block">
              Tipo
            </label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona tipo" />
              </SelectTrigger>
              <SelectContent>
                {TIPO_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Specializzazione */}
          <div>
            <label className="text-xs font-medium text-[#86868b] mb-1.5 block">
              Specializzazione
            </label>
            <Input
              value={form.specializzazione}
              onChange={(e) =>
                setForm({ ...form, specializzazione: e.target.value })
              }
              placeholder="Specializzazione"
            />
          </div>

          {/* Contatto */}
          <div>
            <label className="text-xs font-medium text-[#86868b] mb-1.5 block">
              Contatto
            </label>
            <Input
              value={form.contatto}
              onChange={(e) => setForm({ ...form, contatto: e.target.value })}
              placeholder="Telefono, email..."
            />
          </div>

          {/* Stato */}
          <div>
            <label className="text-xs font-medium text-[#86868b] mb-1.5 block">
              Stato
            </label>
            <Select
              value={form.stato}
              onValueChange={(v) => setForm({ ...form, stato: v as StatoFornitore })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Costo/ora */}
          <div>
            <label className="text-xs font-medium text-[#86868b] mb-1.5 block">
              Costo/ora
            </label>
            <Input
              type="number"
              value={form.costo_ora}
              onChange={(e) => setForm({ ...form, costo_ora: e.target.value })}
              placeholder="0.00"
            />
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-medium text-[#86868b] mb-1.5 block">
              Note
            </label>
            <Textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Note..."
              rows={3}
            />
          </div>

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={saving || !form.nome.trim()}
            className="w-full"
          >
            {saving ? "Salvataggio..." : "Salva"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
