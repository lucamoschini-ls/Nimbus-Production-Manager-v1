"use client";

interface Props { id: string; onOpenTask: (taskId: string) => void; }

export function DrawerMateriale({ id, onOpenTask }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Materiale {id}</h3>
      <p className="text-[12px] text-[#86868b]">Contenuto in arrivo nel mattone 5</p>

      <div className="border-t border-[#f0f0f0] pt-3">
        <p className="text-[11px] text-[#86868b] mb-2">Task collegate (placeholder):</p>
        <button onClick={() => onOpenTask("fake-task-001")}
          className="text-[12px] text-blue-600 hover:underline">
          Apri task collegata (test stack)
        </button>
      </div>

      <div className="border-t border-[#f0f0f0] pt-3">
        <p className="text-[11px] text-[#86868b] mb-2">Disponibilita (placeholder):</p>
        <div className="flex gap-2">
          <div className="flex-1"><label className="text-[9px] text-[#86868b]">Magazzino</label><input type="number" defaultValue={0} className="w-full text-[12px] border border-[#e5e5e7] rounded px-2 py-1" /></div>
          <div className="flex-1"><label className="text-[9px] text-[#86868b]">Recupero</label><input type="number" defaultValue={0} className="w-full text-[12px] border border-[#e5e5e7] rounded px-2 py-1" /></div>
          <div className="flex-1"><label className="text-[9px] text-[#86868b]">Ordinato</label><input type="number" defaultValue={0} className="w-full text-[12px] border border-[#e5e5e7] rounded px-2 py-1" /></div>
        </div>
      </div>
    </div>
  );
}
