import { Suspense } from "react";
import { MaterialiSuperficie } from "./materiali-superficie";

export default function MaterialiNuovoPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-[#86868b]">Caricamento...</div>}>
      <MaterialiSuperficie />
    </Suspense>
  );
}
