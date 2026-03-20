// Tipi TypeScript per il database Nimbus 2026
// Verranno generati da Supabase con: npx supabase gen types typescript

export type StatoFornitore =
  | "da_trovare"
  | "contattato"
  | "confermato"
  | "sopralluogo_fatto"
  | "materiali_definiti"
  | "pronto";

export type StatoPermesso =
  | "da_presentare"
  | "presentato"
  | "in_attesa"
  | "ottenuto";

export type TipologiaTask =
  | "carpenteria"
  | "verniciatura"
  | "elettrico"
  | "idraulico"
  | "trasporto"
  | "acquisto"
  | "montaggio"
  | "audio_luci"
  | "giardinaggio"
  | "pulizia_manutenzione"
  | "decisione"
  | "amministrativo"
  | "misure_rilievo";

export type StatoTask = "da_fare" | "in_corso" | "completata" | "bloccata";

export type StatoCalcolato =
  | "da_fare"
  | "in_corso"
  | "completata"
  | "bloccata"
  | "in_attesa_fornitore"
  | "in_attesa_dipendenza"
  | "in_attesa_materiali"
  | "in_attesa_permesso";

export interface Zona {
  id: string;
  nome: string;
  colore: string;
  ordine: number;
  created_at: string;
}

export interface Fornitore {
  id: string;
  nome: string;
  tipo: string | null;
  specializzazione: string | null;
  contatto: string | null;
  stato: StatoFornitore;
  costo_ora: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Permesso {
  id: string;
  nome: string;
  stato: StatoPermesso;
  data_scadenza: string | null;
  responsabile: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lavorazione {
  id: string;
  zona_id: string;
  nome: string;
  descrizione: string | null;
  ordine: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  lavorazione_id: string;
  titolo: string;
  tipologia: TipologiaTask | null;
  fornitore_id: string | null;
  stato_fornitore_minimo: StatoFornitore;
  stato: StatoTask;
  stato_calcolato: string;
  motivo_blocco: string | null;
  data_inizio: string | null;
  data_fine: string | null;
  durata_giorni: number | null;
  numero_persone: number | null;
  ore_lavoro: number | null;
  costo_ora: number | null;
  costo_manodopera: number | null;
  note: string | null;
  ordine: number;
  created_at: string;
  updated_at: string;
}

export interface TaskCompleta extends Task {
  lavorazione_nome: string;
  zona_id: string;
  zona_nome: string;
  zona_colore: string;
  zona_ordine: number;
  fornitore_nome: string | null;
  fornitore_stato: StatoFornitore | null;
  materiali_mancanti: number;
  materiali_totali: number;
  dipendenze_incomplete: number;
  dipendenze_totali: number;
}

export interface Materiale {
  id: string;
  task_id: string;
  nome: string;
  quantita: number | null;
  unita: string | null;
  prezzo_unitario: number | null;
  costo_totale: number | null;
  provenienza: string | null;
  quantita_disponibile: number | null;
  quantita_ordinata: number | null;
  quantita_da_acquistare: number | null;
  giorni_consegna: number | null;
  data_ordine: string | null;
  data_consegna_prevista: string | null;
  data_necessaria: string | null;
  note: string | null;
  created_at: string;
}

export interface TaskDipendenza {
  task_id: string;
  dipende_da_id: string;
}

export interface TaskPermesso {
  task_id: string;
  permesso_id: string;
}
