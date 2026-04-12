import { createClient } from "@/lib/supabase/server";
import { OggiClient } from "./oggi-client";

export default async function OggiPage() {
  const supabase = await createClient();

  // Use Italy timezone for "today"
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Rome",
  }); // "YYYY-MM-DD"
  const threeDaysFromNow = new Date(
    new Date(today).getTime() + 3 * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .split("T")[0];

  const [
    { data: todayTasks },
    { data: todayOps },
    { data: blockedTasks },
    { data: fornitori },
  ] = await Promise.all([
    // Tasks active today: data_inizio <= today AND (data_fine >= today OR data_fine IS NULL)
    supabase
      .from("v_task_completa")
      .select(
        "id, titolo, tipologia, stato, stato_calcolato, data_inizio, data_fine, durata_ore, numero_persone, fornitore_id, fornitore_nome, fornitore_stato, zona_nome, zona_colore, lavorazione_nome"
      )
      .lte("data_inizio", today)
      .or(`data_fine.gte.${today},data_fine.is.null`),

    // Operazioni active today
    supabase
      .from("operazioni")
      .select(
        `id, titolo, tipologia, data_inizio, data_fine,
        fornitore:fornitori!operazioni_fornitore_id_fkey(id, nome, stato),
        materiale:materiali!operazioni_materiale_id_fkey(nome)`
      )
      .lte("data_inizio", today)
      .or(`data_fine.gte.${today},data_fine.is.null`),

    // Tasks to unblock: in_attesa_* with data_inizio in next 3 days
    supabase
      .from("v_task_completa")
      .select(
        "id, titolo, stato_calcolato, data_inizio, fornitore_nome, zona_nome, lavorazione_nome"
      )
      .like("stato_calcolato", "in_attesa%")
      .lte("data_inizio", threeDaysFromNow)
      .order("data_inizio", { ascending: true })
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
