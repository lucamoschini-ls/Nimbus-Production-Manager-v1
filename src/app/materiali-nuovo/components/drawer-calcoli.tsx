"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import type { DrawerData, DriverRow, CoefficienteRow } from "../materiali-superficie";
import { aggiornaDriver, aggiornaCoefficiente } from "../actions";

// Warning texts for known hardcoded bugs (from mattone 3-bis)
const WARNINGS: Record<string, string> = {
  n_rotoli_prato:
    "Il calcolo dei picchetti assume che ogni rotolo sia lungo 25 metri. Questo valore e fissato nel codice e non si puo modificare da qui.",
  n_pax_verniciatura_max:
    "Pennelli e rulli vengono moltiplicati per 4 (i quattro tipi di vernice). Se aggiungi o togli tipi di vernice, questo numero non si aggiorna da solo.",
  scarto_perc_default:
    "Questo scarto viene applicato solo alla vernice testa di moro. Per impregnante, nera e oro lo scarto e fissato al 10% nel codice.",
  m_tavola_larghezza:
    "Se questo valore non viene letto correttamente, il calcolo usa 0.15m come valore di sicurezza senza avvisarti.",
};

interface Props {
  id: string;
  drawerData: DrawerData;
}

function CalcoloInput({
  item,
  onSave,
  onReset,
}: {
  item: DriverRow | CoefficienteRow;
  onSave: (id: string, valore: number) => Promise<void>;
  onReset?: () => void;
}) {
  const [val, setVal] = useState(item.valore);
  const warning = WARNINGS[item.chiave];
  const hasDefault = "valore_default" in item && item.valore_default != null;

  const handleBlur = async () => {
    const v = Math.max(0, val);
    if (v === item.valore) return;
    try {
      await onSave(item.id, v);
    } catch (e) {
      toast.error("Errore salvataggio", {
        description: (e as Error).message,
      });
      setVal(item.valore);
    }
  };

  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-[#1d1d1f] truncate">
            {item.label || item.chiave}
          </span>
          {item.tooltip && (
            <InfoTooltip variant="info" text={item.tooltip} />
          )}
          {warning && <InfoTooltip variant="warning" text={warning} />}
        </div>
      </div>
      <input
        type="number"
        min="0"
        step="any"
        value={val}
        onChange={(e) =>
          setVal(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)
        }
        onBlur={handleBlur}
        placeholder={
          hasDefault ? String(item.valore_default) : undefined
        }
        className="w-[80px] text-[12px] text-right border border-[#e5e5e7] rounded px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-ring"
      />
      {item.unita && (
        <span className="text-[10px] text-[#86868b] w-[30px]">
          {item.unita}
        </span>
      )}
      {onReset && hasDefault && val !== item.valore_default && (
        <button
          onClick={onReset}
          className="text-[#86868b] hover:text-[#1d1d1f] p-0.5 rounded hover:bg-[#f0f0f0]"
          title={`Ripristina default (${item.valore_default})`}
        >
          <RotateCcw size={11} />
        </button>
      )}
    </div>
  );
}

function GroupSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1.5 py-1.5 text-left"
      >
        {open ? (
          <ChevronDown size={12} className="text-[#86868b]" />
        ) : (
          <ChevronRight size={12} className="text-[#86868b]" />
        )}
        <span className="text-[11px] font-semibold text-[#1d1d1f] uppercase tracking-wide">
          {title}
        </span>
      </button>
      {open && <div className="pl-4">{children}</div>}
    </div>
  );
}

export function DrawerCalcoli({ id, drawerData }: Props) {
  void id;
  const { driverItems, coeffItems, onUpdateDriver, onUpdateCoeff } =
    drawerData;

  // Group items by 'gruppo' field
  const driverGroups = groupBy(driverItems);
  const coeffGroups = groupBy(coeffItems);

  const handleSaveDriver = async (driverId: string, valore: number) => {
    onUpdateDriver(driverId, valore); // optimistic
    try {
      await aggiornaDriver(driverId, valore);
    } catch (e) {
      // revert
      const original = driverItems.find((d) => d.id === driverId);
      if (original) onUpdateDriver(driverId, original.valore);
      throw e;
    }
  };

  const handleSaveCoeff = async (coeffId: string, valore: number) => {
    onUpdateCoeff(coeffId, valore); // optimistic
    try {
      await aggiornaCoefficiente(coeffId, valore);
    } catch (e) {
      const original = coeffItems.find((c) => c.id === coeffId);
      if (original) onUpdateCoeff(coeffId, original.valore);
      throw e;
    }
  };

  const handleResetCoeff = async (item: CoefficienteRow) => {
    if (item.valore_default == null) return;
    onUpdateCoeff(item.id, item.valore_default);
    try {
      await aggiornaCoefficiente(item.id, item.valore_default);
    } catch (e) {
      onUpdateCoeff(item.id, item.valore);
      toast.error("Errore ripristino", {
        description: (e as Error).message,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-1.5">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f]">
            Driver e coefficienti
          </h3>
          <InfoTooltip
            variant="info"
            text="Questi valori alimentano i calcoli del fabbisogno materiali. Modificarli cambia tutti i numeri della lista."
          />
        </div>
      </div>

      {/* Driver geometrici */}
      <div className="border-t border-[#f0f0f0] pt-2">
        <h4 className="text-[10px] text-[#86868b] font-semibold uppercase tracking-wide mb-1">
          Driver geometrici ({driverItems.length})
        </h4>
        {driverGroups.map(([group, items]) => (
          <GroupSection key={group} title={group}>
            {items.map((d) => (
              <CalcoloInput
                key={d.id}
                item={d}
                onSave={handleSaveDriver}
              />
            ))}
          </GroupSection>
        ))}
      </div>

      {/* Coefficienti */}
      <div className="border-t border-[#f0f0f0] pt-2">
        <h4 className="text-[10px] text-[#86868b] font-semibold uppercase tracking-wide mb-1">
          Coefficienti ({coeffItems.length})
        </h4>
        {coeffGroups.map(([group, items]) => (
          <GroupSection key={group} title={group}>
            {items.map((c) => (
              <CalcoloInput
                key={c.id}
                item={c}
                onSave={handleSaveCoeff}
                onReset={() => handleResetCoeff(c)}
              />
            ))}
          </GroupSection>
        ))}
      </div>
    </div>
  );
}

function groupBy<T extends { gruppo: string | null }>(
  items: T[]
): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = item.gruppo || "Altro";
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  }
  return Array.from(map.entries());
}
