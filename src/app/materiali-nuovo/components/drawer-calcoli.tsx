"use client";

interface Props { id: string; }

export function DrawerCalcoli({ id }: Props) {
  void id;
  return (
    <div className="space-y-4">
      <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Calcoli</h3>
      <p className="text-[12px] text-[#86868b]">Contenuto in arrivo nel mattone 6. Qui vivranno driver e coefficienti del calcolatore, richiamabili da qualsiasi punto della superficie.</p>
    </div>
  );
}
