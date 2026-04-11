import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { MaterialiSuperficie } from "./materiali-superficie";

async function MaterialiData() {
  const supabase = await createClient();

  const [
    { data: catalogo },
    { data: materialiTask },
    { data: disponibilita },
    { data: driver },
    { data: coefficienti },
    , // fornitori — fetched, reserved for future mattoni
    { data: tasks },
  ] = await Promise.all([
    supabase.from("catalogo_materiali").select("*"),
    supabase.from("materiali").select("id, task_id, catalogo_id, quantita"),
    supabase
      .from("materiali_disponibilita")
      .select("catalogo_id, qta_magazzino, qta_recupero, qta_ordinata"),
    supabase.from("calcolatore_driver").select("chiave, valore").order("ordine"),
    supabase
      .from("calcolatore_coefficienti")
      .select("chiave, valore")
      .order("ordine"),
    supabase.from("fornitori").select("id, nome"),
    supabase.from("task").select("id, data_inizio"),
  ]);

  return (
    <MaterialiSuperficie
      catalogo={catalogo || []}
      materialiTask={materialiTask || []}
      disponibilita={disponibilita || []}
      driver={driver || []}
      coefficienti={coefficienti || []}
      tasks={tasks || []}
    />
  );
}

export default function MaterialiNuovoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64 text-[#86868b]">
          Caricamento...
        </div>
      }
    >
      <MaterialiData />
    </Suspense>
  );
}
