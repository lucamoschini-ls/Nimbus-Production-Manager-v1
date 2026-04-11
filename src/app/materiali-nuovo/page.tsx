import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { MaterialiSuperficie } from "./materiali-superficie";

async function MaterialiData() {
  const supabase = await createClient();

  const [
    { data: catalogoView },
    { data: catalogoExtra },
    { data: materialiTask },
    { data: disponibilita },
    { data: driver },
    { data: coefficienti },
    , // fornitori — reserved for future mattoni
    { data: tasks },
  ] = await Promise.all([
    supabase.from("v_catalogo_acquisti").select("*").order("nome"),
    supabase
      .from("catalogo_materiali")
      .select("id, categoria_comportamentale, tipo_voce"),
    supabase.from("materiali").select("task_id, catalogo_id, quantita, unita"),
    supabase
      .from("materiali_disponibilita")
      .select("catalogo_id, qta_magazzino, qta_recupero, qta_ordinata"),
    supabase.from("calcolatore_driver").select("chiave, valore").order("ordine"),
    supabase
      .from("calcolatore_coefficienti")
      .select("chiave, valore")
      .order("ordine"),
    supabase.from("fornitori").select("id, nome"),
    supabase
      .from("task")
      .select(
        "id, titolo, tipologia, stato, stato_calcolato, data_inizio, data_fine, durata_ore, numero_persone, fornitore_id, lavorazione:lavorazioni(nome, zona:zone(nome))"
      ),
  ]);

  return (
    <MaterialiSuperficie
      catalogoView={catalogoView || []}
      catalogoExtra={catalogoExtra || []}
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
