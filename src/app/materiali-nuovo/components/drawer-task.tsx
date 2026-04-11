"use client";

interface Props { id: string; onOpenMateriale: (matId: string) => void; }

export function DrawerTask({ id, onOpenMateriale }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Task {id}</h3>
      <p className="text-[12px] text-[#86868b]">Contenuto in arrivo nel mattone 7</p>
      <div className="border-t border-[#f0f0f0] pt-3">
        <button onClick={() => onOpenMateriale("m1")}
          className="text-[12px] text-blue-600 hover:underline">
          Apri materiale collegato (test stack)
        </button>
      </div>
    </div>
  );
}
