import { createClient } from "@/lib/supabase/server";
import { OggiClient } from "./oggi-client";

export const revalidate = 30;

export default async function OggiPage() {
  const supabase = await createClient();

  const [
    { data: todayTasks },
    { data: todayOps },
    { data: blockedTasks },
    { data: fornitori },
  ] = await Promise.all([
    // Tutte le task non completate, indipendentemente dalla data
    supabase
      .from("v_task_completa")
      .select(
        "id, titolo, tipologia, stato, stato_calcolato, data_inizio, data_fine, durata_ore, numero_persone, fornitore_id, fornitore_nome, fornitore_stato, zona_nome, zona_colore, lavorazione_nome"
      )
      .neq("stato", "completata"),

    // Tutte le operazioni non completate
    supabase
      .from("operazioni")
      .select(
        `id, titolo, tipologia, stato, data_inizio, data_fine,
        fornitore:fornitori!operazioni_fornitore_id_fkey(id, nome, stato),
        materiale:materiali!operazioni_materiale_id_fkey(nome)`
      )
      .neq("stato", "completata"),

    // Task da sbloccare: in_attesa_* (qualsiasi data)
    supabase
      .from("v_task_completa")
      .select(
        "id, titolo, stato_calcolato, data_inizio, fornitore_nome, zona_nome, lavorazione_nome"
      )
      .like("stato_calcolato", "in_attesa%")
      .order("data_inizio", { ascending: true, nullsFirst: false })
      .limit(8),

    // All fornitori for reference
    supabase.from("fornitori").select("id, nome, stato").order("nome"),
  ]);

  return (
    <OggiClient
      todayTasks={(todayTasks ?? []) as OggiTask[]}
      todayOps={(todayOps ?? []) as OggiOp[]}
      blockedTasks={(blockedTasks ?? []) as BlockedTask[]}
      fornitori={(fornitori ?? []) as OggiFornitore[]}
    />
  );
}

// Types exported for the client
export interface OggiTask {
  id: string;
  titolo: string;
  tipologia: string | null;
  stato: string;
  stato_calcolato: string;
  data_inizio: string | null;
  data_fine: string | null;
  durata_ore: number | null;
  numero_persone: number | null;
  fornitore_id: string | null;
  fornitore_nome: string | null;
  fornitore_stato: string | null;
  zona_nome: string | null;
  zona_colore: string | null;
  lavorazione_nome: string | null;
}

export interface OggiOp {
  id: string;
  titolo: string | null;
  tipologia: string | null;
  stato: string | null;
  data_inizio: string | null;
  data_fine: string | null;
  fornitore: { id: string; nome: string; stato: string } | { id: string; nome: string; stato: string }[] | null;
  materiale: { nome: string } | { nome: string }[] | null;
}

export interface BlockedTask {
  id: string;
  titolo: string;
  stato_calcolato: string;
  data_inizio: string | null;
  fornitore_nome: string | null;
  zona_nome: string | null;
  lavorazione_nome: string | null;
}

export interface OggiFornitore {
  id: string;
  nome: string;
  stato: string;
}
