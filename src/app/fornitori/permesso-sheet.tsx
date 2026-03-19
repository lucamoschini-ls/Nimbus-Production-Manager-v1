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
import type { StatoPermesso } from "@/lib/types";

const STATO_OPTIONS: { value: StatoPermesso; label: string }[] = [
  { value: "da_presentare", label: "Da presentare" },
  { value: "presentato", label: "Presentato" },
  { value: "in_attesa", label: "In attesa" },
  { value: "ottenuto", label: "Ottenuto" },
];

interface Permesso {
  id: string;
  nome: string;
  stato: StatoPermesso;
  data_scadenza: string | null;
  responsabile: string | null;
  note: string | null;
}

interface Props {
  permesso: Permesso | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}

export function PermessoSheet({ permesso, open, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    nome: "",
    stato: "da_presentare" as StatoPermesso,
    responsabile: "",
    data_scadenza: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (permesso) {
      setForm({
        nome: permesso.nome,
        stato: permesso.stato,
        responsabile: permesso.responsabile ?? "",
        data_scadenza: permesso.data_scadenza ?? "",
        note: permesso.note ?? "",
      });
    } else {
      setForm({
        nome: "",
        stato: "da_presentare",
        responsabile: "",
        data_scadenza: "",
        note: "",
      });
    }
  }, [permesso]);

  const handleSave = async () => {
    if (!form.nome.trim()) return;
    setSaving(true);
    try {
      await onSave({
        nome: form.nome,
        stato: form.stato,
        responsabile: form.responsabile || null,
        data_scadenza: form.data_scadenza || null,
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
            {permesso ? permesso.nome : "Nuovo permesso"}
          </SheetTitle>
          <SheetDescription>
            {permesso ? "Modifica il permesso" : "Aggiungi un nuovo permesso"}
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
              placeholder="Nome permesso"
            />
          </div>

          {/* Stato */}
          <div>
            <label className="text-xs font-medium text-[#86868b] mb-1.5 block">
              Stato
            </label>
            <Select
              value={form.stato}
              onValueChange={(v) => setForm({ ...form, stato: v as StatoPermesso })}
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

          {/* Responsabile */}
          <div>
            <label className="text-xs font-medium text-[#86868b] mb-1.5 block">
              Responsabile
            </label>
            <Input
              value={form.responsabile}
              onChange={(e) =>
                setForm({ ...form, responsabile: e.target.value })
              }
              placeholder="Responsabile"
            />
          </div>

          {/* Data scadenza */}
          <div>
            <label className="text-xs font-medium text-[#86868b] mb-1.5 block">
              Data scadenza
            </label>
            <Input
              type="date"
              value={form.data_scadenza}
              onChange={(e) =>
                setForm({ ...form, data_scadenza: e.target.value })
              }
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
