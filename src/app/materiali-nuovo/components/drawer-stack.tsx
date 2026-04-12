"use client";

import { useEffect, useState, useCallback } from "react";
import { X, ArrowLeft } from "lucide-react";
import type { DrawerEntry } from "../hooks/use-superficie-state";
import type { DrawerData } from "../materiali-superficie";
import { DrawerMateriale } from "./drawer-materiale";
import { DrawerTask } from "./drawer-task";
import { DrawerCalcoli } from "./drawer-calcoli";
import { DrawerOperazione } from "./drawer-operazione";

interface Props {
  drawers: DrawerEntry[];
  drawerData: DrawerData;
  onClose: (idx: number) => void;
  onCloseUltimo: () => void;
  onOpenDrawer: (tipo: DrawerEntry["tipo"], id: string) => void;
}

export function DrawerStack({
  drawers,
  drawerData,
  onClose,
  onCloseUltimo,
  onOpenDrawer,
}: Props) {
  const [recentlyClosed, setRecentlyClosed] = useState<DrawerEntry[]>([]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawers.length > 0) {
        setRecentlyClosed((prev) => [
          ...prev.slice(-2),
          drawers[drawers.length - 1],
        ]);
        onCloseUltimo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [drawers, onCloseUltimo]);

  const handleClose = useCallback(
    (idx: number) => {
      setRecentlyClosed((prev) => [...prev.slice(-2), drawers[idx]]);
      onClose(idx);
    },
    [drawers, onClose]
  );

  const handleReopen = useCallback(() => {
    if (recentlyClosed.length === 0) return;
    const last = recentlyClosed[recentlyClosed.length - 1];
    setRecentlyClosed((prev) => prev.slice(0, -1));
    onOpenDrawer(last.tipo, last.id);
  }, [recentlyClosed, onOpenDrawer]);

  if (drawers.length === 0 && recentlyClosed.length === 0) return null;

  return (
    <div className="flex flex-shrink-0 border-l border-[#e5e5e7]">
      {drawers.length === 0 && recentlyClosed.length > 0 && (
        <button
          onClick={handleReopen}
          className="w-8 flex items-center justify-center bg-[#f5f5f7] hover:bg-[#ebebed] border-l border-[#e5e5e7] transition-colors"
          title="Riapri ultimo drawer chiuso"
        >
          <ArrowLeft size={14} className="text-[#86868b]" />
        </button>
      )}

      {drawers.map((d, idx) => (
        <div
          key={`${d.tipo}-${d.id}`}
          className="w-[360px] border-l border-[#e5e5e7] bg-white flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e7] flex-shrink-0 bg-[#fafafa]">
            <div className="flex items-center gap-2">
              {idx === 0 && recentlyClosed.length > 0 && (
                <button
                  onClick={handleReopen}
                  className="text-[#86868b] hover:text-[#1d1d1f]"
                  title="Riapri precedente"
                >
                  <ArrowLeft size={14} />
                </button>
              )}
              <span className="text-[11px] text-[#86868b] font-medium uppercase">
                {d.tipo}
              </span>
            </div>
            <button
              onClick={() => handleClose(idx)}
              className="text-[#86868b] hover:text-[#1d1d1f] p-0.5 rounded hover:bg-[#f0f0f0]"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {d.tipo === "materiale" && (
              <DrawerMateriale
                id={d.id}
                drawerData={drawerData}
                onOpenTask={(taskId) => onOpenDrawer("task", taskId)}
                onOpenCalcoli={() => onOpenDrawer("calcoli", "main")}
              />
            )}
            {d.tipo === "task" && (
              <DrawerTask
                id={d.id}
                drawerData={drawerData}
                onOpenMateriale={(matId) => onOpenDrawer("materiale", matId)}
              />
            )}
            {d.tipo === "calcoli" && (
              <DrawerCalcoli id={d.id} drawerData={drawerData} />
            )}
            {d.tipo === "operazione" && (
              <DrawerOperazione id={d.id} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
