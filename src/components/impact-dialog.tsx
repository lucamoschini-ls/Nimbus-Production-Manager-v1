"use client";

import { type ImpactedTask } from "@/lib/dependency-utils";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

interface ImpactDialogProps {
  open: boolean;
  taskTitle: string;
  newDate: string;
  impactedTasks: ImpactedTask[];
  onCascade: () => void;
  onSingleOnly: () => void;
  onCancel: () => void;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return format(parseISO(d), "dd/MM", { locale: it });
}

export function ImpactDialog({
  open,
  taskTitle,
  newDate,
  impactedTasks,
  onCascade,
  onSingleOnly,
  onCancel,
}: ImpactDialogProps) {
  const changed = impactedTasks.filter((t) => t.changed);
  const totalOps = changed.reduce((s, t) => s + t.ops.length, 0);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[15px] font-semibold text-[#1d1d1f]">
            Spostamento date
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-[13px] text-[#86868b]">
              Spostamento &ldquo;{taskTitle}&rdquo; al {fmtDate(newDate)}.
              {changed.length > 0 && (
                <span>
                  {" "}Questa modifica impatta{" "}
                  <strong className="text-[#1d1d1f]">
                    {changed.length} task
                    {totalOps > 0 && ` + ${totalOps} operazion${totalOps === 1 ? "e" : "i"}`}
                  </strong>
                  :
                </span>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {changed.length > 0 && (
          <div className="max-h-72 overflow-y-auto -mx-1 px-1 space-y-2 my-2">
            {changed.map((t) => (
              <div
                key={t.id}
                className="rounded-lg bg-[#f5f5f7] px-3 py-2"
                style={{ marginLeft: (t.depth - 1) * 12 }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-orange-500 text-[11px] font-bold">!</span>
                  <span className="text-[13px] font-medium text-[#1d1d1f] truncate">
                    {t.titolo}
                  </span>
                </div>
                <div className="text-[11px] text-[#86868b] mt-0.5">
                  {t.fornitore_nome && <span>{t.fornitore_nome} · </span>}
                  <span className="line-through">
                    {fmtDate(t.currentDataInizio)}–{fmtDate(t.currentDataFine)}
                  </span>
                  <span className="mx-1.5 text-[#1d1d1f]">&rarr;</span>
                  <span className="font-semibold text-[#1d1d1f]">
                    {fmtDate(t.newDataInizio)}–{fmtDate(t.newDataFine)}
                  </span>
                </div>
                {/* Impacted operazioni */}
                {t.ops.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {t.ops.map((op) => (
                      <div key={op.id} className="text-[10px] text-[#86868b] flex items-start gap-1">
                        <span className="text-[#0ea5e9] mt-px flex-shrink-0">└</span>
                        <span className="truncate">
                          {op.label}
                          <span className="mx-1">·</span>
                          <span className="line-through">{fmtDate(op.currentDataInizio)}</span>
                          <span className="mx-0.5">&rarr;</span>
                          <span className="font-medium text-[#1d1d1f]">{fmtDate(op.newDataInizio)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <AlertDialogFooter className="mt-4 gap-2">
          <AlertDialogCancel
            onClick={onCancel}
            className="text-[13px] font-medium"
          >
            Annulla
          </AlertDialogCancel>
          <button
            onClick={onSingleOnly}
            className="inline-flex h-10 items-center justify-center rounded-md border border-[#e5e5e7] bg-white px-4 text-[13px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
          >
            Sposta solo questa
          </button>
          <button
            onClick={onCascade}
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#1d1d1f] px-4 text-[13px] font-medium text-white hover:bg-[#333] transition-colors"
          >
            Sposta tutto ({changed.length + totalOps})
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
