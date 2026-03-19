import { createClient } from "@/lib/supabase/server";
import { CostiClient } from "./costi-client";

export default async function CostiPage() {
  const supabase = await createClient();

  const [{ data: costiZona }, { data: taskConCosti }] = await Promise.all([
    supabase.from("v_costi_zona").select("*"),
    supabase
      .from("v_task_completa")
      .select("id, titolo, zona_nome, zona_colore, zona_ordine, lavorazione_nome, costo_manodopera")
      .or("costo_manodopera.gt.0")
      .order("zona_ordine"),
  ]);

  return (
    <CostiClient
      costiZona={costiZona ?? []}
      taskConCosti={taskConCosti ?? []}
    />
  );
}
