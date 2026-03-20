# ============================================================
# NIMBUS 2026 — Batch Fix & Features
# Prompt per Claude Code — 3 blocchi sequenziali
# ============================================================
# Istruzioni: dai a Claude Code UN BLOCCO alla volta.
# Aspetta che finisca, pusha, testa, poi passa al successivo.
# ============================================================
#
# STATO ARCHITETTURA ATTUALE (aggiornato 2026-03-20):
# - Alberatura: Zona > Lavorazione > Task > Materiale > Operazioni
# - Task ha fornitore singolo (chi esegue)
# - Materiale ha quantita parziali (quantita_disponibile, quantita_ordinata, quantita_da_acquistare calc)
# - Operazioni sono figlie dei materiali (per portare il materiale in cantiere)
# - Tabella tipologie (text, non enum) — editabile da /impostazioni
# - durata_ore (non giorni) — giornata 7-18 = 11h
# - operazioni.luogo_partenza (text) per raggruppare trasporti
# - Pagina /impostazioni con zone, tipologie, stati fornitore
# - Tab Trasporti nella pagina Materiali (raggruppati per luogo)
# ============================================================


# ████████████████████████████████████████████████████████████
# BLOCCO A — Bug critici e quick fix
# ████████████████████████████████████████████████████████████
# Punti: 1, 3, 6, 8, 13, 17, 19, 20
# Stima: 1 sessione Claude Code
# ████████████████████████████████████████████████████████████

"""
Leggi CLAUDE.md per il contesto.

OBIETTIVO: Fix di 8 bug e quick fix.

--- FIX 1: Aggiunta materiale/operazione riporta alla home --- [PARZIALMENTE RISOLTO]
Il modulo-level _savedLavId preserva la selezione dopo revalidatePath.
RESTA DA FARE:
- Verificare che anche aggiunta operazione e modifica materiale nel pannello dettaglio task non perda la selezione
- Se il problema persiste, convertire le server action del pannello dettaglio in chiamate Supabase client-side (createClient da @supabase/ssr browser) per evitare revalidatePath
- TESTA: aggiungi materiale, aggiungi operazione, modifica quantita → la pagina NON deve cambiare

--- FIX 3: Mobile — audit completo --- [DA FARE]
La vista mobile (< 768px) ha elementi mancanti o malfunzionanti:
- Il cestino per eliminare lavorazioni non appare (su mobile non c'e' hover)
- Il pannello dettaglio task potrebbe non aprirsi correttamente
- I dropdown potrebbero essere troppo piccoli
SOLUZIONE:
- Su mobile, mostra il cestino sempre (piccolo, grigio, angolo destro) per lavorazioni e task
- Il pannello dettaglio task deve aprirsi come sheet bottom (slide-up dal basso, full width)
- I dropdown devono avere dimensione minima touch-friendly (min-height 44px)
- Testa TUTTA l'app a 375px di larghezza e fixa ogni elemento rotto

--- FIX 6: Provenienza "Con fornitore" → "In loco" --- [DA FARE]
Nel dropdown provenienza dei materiali, rinomina "Con fornitore" in "In loco".
Aggiorna:
- Il dropdown nel pannello dettaglio task (MaterialiSection)
- Il dropdown nella pagina Materiali (materiali-client.tsx)
- I filtri nella pagina Materiali
- Le costanti PROVENIENZA_OPTIONS e PROVENIENZA_COLORS ovunque appaiono
- Aggiorna il valore stringa da "con_fornitore" a "in_loco" in tutti i file
- NON toccare i record esistenti nel DB per ora — aggiorna solo il codice

--- FIX 8: Gantt — sezioni sempre aperte --- [DA FARE]
Nel Gantt, tutte le lavorazioni devono essere ESPANSE di default.
In gantt-client.tsx, cambia:
  const [expandedLav, setExpandedLav] = useState<Set<string>>(new Set());
in:
  const [expandedLav, setExpandedLav] = useState<Set<string>>(new Set(lavorazioni.map(l => l.id)));
Mantieni la possibilita' di chiudere cliccando sull'header (toggle).

--- FIX 13: Materiali completamente editabili nel pannello dettaglio --- [PARZIALMENTE FATTO]
Il pannello dettaglio task ha gia' campi editabili per quantita disponibile/ordinata.
RESTA DA FARE:
- Nome materiale: click → diventa input → salva su blur
- Provenienza: dropdown editabile
- Data necessaria: date picker editabile
- Data ordine: date picker editabile
- Giorni consegna: number input editabile
- Note: text input editabile
- Prezzo unitario: number input editabile
Ogni campo salva su blur. Deve funzionare come nella pagina /materiali.

--- FIX 17: Tipologia operazione "Acquisto e trasporto" --- [DA FARE]
Le tipologie operazione leggono dalla tabella tipologie del DB.
Aggiungi un record:
INSERT INTO tipologie (nome, colore, ordine) VALUES ('acquisto_e_trasporto', '#8b5cf6', 13);
Oppure: se le operazioni usano le stesse tipologie delle task, il record e' gia' accessibile.
Se il dropdown operazione ha una lista separata hardcoded, aggiungilo anche li'.

--- FIX 19: Noleggio → stato corretto --- [DA FARE]
Aggiorna la funzione matStato (presente in 3 file: lavorazioni-client, materiali-client, task-detail-sheet) per considerare la provenienza:
- provenienza = "acquisto" e disponibile < totale → "Da acquistare" (rosso)
- provenienza = "noleggio" e disponibile < totale → "Da noleggiare" (rosso)
- provenienza = "magazzino" → "In magazzino" (ambra) se disponibile < totale
- provenienza = "in_loco" → "In loco" (verde) sempre
- provenienza null o altro → logica attuale
Aggiorna contatori e filtri nella pagina Materiali.

--- FIX 20: Nome lavorazione modificabile --- [DA FARE]
Nella pagina Lavorazioni:
- Sidebar sinistra: click sul nome lavorazione → diventa input, salva su blur con updateLavorazione
- Header area task a destra: il titolo h1 diventa input su click, salva su blur
- Server action updateLavorazione gia' esiste in actions.ts
"""


# ████████████████████████████████████████████████████████████
# BLOCCO B — UX e visualizzazione
# ████████████████████████████████████████████████████████████
# Punti: 4, 5, 7, 9, 10, 11, 12, 14
# Stima: 1-2 sessioni Claude Code
# ████████████████████████████████████████████████████████████

"""
Leggi CLAUDE.md per il contesto.

OBIETTIVO: Migliorare l'esperienza di input e visualizzazione. Ogni dato deve essere visibile E modificabile dalla vista in cui lo trovi.

--- PUNTO 4: Operazioni — inserimento snello --- [PARZIALMENTE FATTO]
L'OperazioniSubSection nel task-detail-sheet ha gia' una riga compatta.
RESTA DA FARE:
- Quando si aggiunge una nuova operazione, il primo campo deve essere il dropdown tipologia (non il titolo)
- Il titolo si auto-genera dalla tipologia scelta (es: "Trasporto", "Acquisto", "Noleggio")
- L'utente puo' modificare il titolo dopo se vuole
- Layout riga: [Tipologia dropdown] [Fornitore dropdown] [Organizzato checkbox] [X]
- Dettagli secondari (durata, costi, luogo, note) solo su click/expand

--- PUNTO 5: Operazioni visibili nella card task --- [DA RIFARE]
La vecchia implementazione mostrava operazioni a livello task.
Ora le operazioni sono sotto i materiali. Aggiorna la card task per mostrare:
Per ogni materiale con operazioni:
  [Package icon] Nome materiale (Xpz) — [chip stato]
    [indent] Tipologia: Fornitore [chip organizzato/non organizzato]
    [indent] Tipologia: Fornitore [chip organizzato]
Usa icone Lucide (Package, Truck, ShoppingCart), NO emoji.
Se non ci sono materiali, non mostrare nulla.
NOTA: i dati dei materiali sono gia' fetchati (materialiByTask). Per le operazioni serve un fetch aggiuntivo o un join nel fetch materiali.

--- PUNTO 7: Pagina Materiali — operazioni inline --- [DA FARE]
Nella pagina Materiali, ogni card materiale mostra SOTTO i campi esistenti:
- Sezione "Operazioni" con lista compatta delle operazioni di quel materiale
- Per ogni operazione: [chip tipologia] [fornitore nome + stato chip] [toggle organizzato]
- Bottone "+ Operazione" per aggiungerne dalla pagina Materiali
- Lo stato del materiale considera le operazioni incomplete (il trigger DB gia' lo fa)
NOTA: serve fetch operazioni nella pagina materiali/page.tsx, oppure un join nel select materiali.

--- PUNTO 9: Gantt — click su barra apre dettaglio --- [DA FARE]
Click su una barra task nel Gantt → si apre il pannello dettaglio task (TaskDetailSheet).
Bisogna passare la task selezionata dal Gantt al sheet, che gia' esiste.
Per le frecce di dipendenza: troppo complesso per ora. Usa il tooltip: hover su barra mostra le dipendenze come lista testuale.
NOTA: il Gantt gia' mostra barre materiale e operazione. Per il click serve solo collegare il sheet.

--- PUNTO 10: Fornitori — riepilogo espandibile --- [DA FARE]
Pagina Fornitori: click su "X task assegnate" → espande lista task sotto la card.
Ogni task: titolo, zona > lavorazione, stato calcolato (chip).
Click su task → naviga a /lavorazioni con quella lavorazione selezionata.
Il fetch gia' usa v_fornitori_riepilogo. Serve un fetch aggiuntivo delle task per fornitore_id + task che hanno operazioni con quel fornitore.

--- PUNTO 11: Pagina Trasporti standalone (/trasporti) --- [DA FARE]
Crea pagina /trasporti con i contenuti della tab Trasporti dalla pagina Materiali.
- Aggiungi voce "Trasporti" nella sidebar (icona Truck), tra Materiali e Costi
- Filtra operazioni con tipologia "trasporto" o "acquisto_e_trasporto"
- Raggruppate per luogo_partenza
- Rimuovi la tab Trasporti dalla pagina Materiali
NOTA: il codice TrasportiSection esiste gia' in materiali-client.tsx — spostalo in un file condiviso o copialo nella nuova pagina.

--- PUNTO 12: Tutto editabile ovunque --- [DA FARE]
Audit:
- Card task: click su chip stato → cicla da_fare → in_corso → completata (server action updateTask)
- Card fornitore: click su chip stato → cicla attraverso i 6 stati (server action updateFornitore)
- Dashboard task urgenti: chip stato cliccabile
- Dashboard stato fornitori: chip stato cliccabile
- Pagina Materiali: gia' tutto editabile

--- PUNTO 14: Luoghi di partenza — dropdown gestito --- [DA FARE]
Attualmente luogo_partenza e' text libero. Convertire in tabella luoghi.

Database:
CREATE TABLE luoghi (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome text NOT NULL UNIQUE,
  indirizzo text,
  note text,
  ordine integer DEFAULT 0
);
INSERT INTO luoghi (nome, ordine) VALUES
  ('Monterosi', 0), ('Guidonia', 1), ('Casa Ale', 2),
  ('In loco (cantiere)', 3), ('Fornitore diretto', 4);

Modifica operazioni.luogo_partenza: da text a uuid FK → luoghi(id).
Migra i dati: per ogni valore text unico, crea un record in luoghi e aggiorna l'FK.
UI: dropdown con luoghi + "+ Aggiungi luogo" inline.
Pagina Impostazioni: sezione "Luoghi" per gestire la lista.
Pagina Trasporti: raggruppa per luogo.nome.
"""


# ████████████████████████████████████████████████████████████
# BLOCCO C — Struttura dati avanzata
# ████████████████████████████████████████████████████████████
# Punti: 2, 15, 16, 18
# Stima: 2 sessioni Claude Code
# ████████████████████████████████████████████████████████████

"""
Leggi CLAUDE.md per il contesto.

OBIETTIVO: Evoluzione del modello dati per catalogo materiali, fornitore supporto, presenze e attrezzi.

--- PUNTO 2: Catalogo materiali condivisi --- [DA FARE]

CREATE TABLE catalogo_materiali (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome text NOT NULL,
  tipologia_materiale text NOT NULL DEFAULT 'materiale',
  unita_default text,
  prezzo_unitario_default numeric,
  provenienza_default text,
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE materiali ADD COLUMN catalogo_id uuid REFERENCES catalogo_materiali(id) ON DELETE SET NULL;

UI: dropdown con search quando aggiungi materiale → lista dal catalogo + "Nuovo materiale".
Pagina Materiali: tab "Catalogo" con lista materiali unici, quantita' totale aggregata.

--- PUNTO 15: Fornitore supporto sulla task --- [DA FARE]
NOTA: le operazioni sotto i materiali gestiscono gia' fornitori multipli per la supply chain.
Il fornitore supporto sulla task serve per l'ESECUZIONE della task stessa (non per i materiali).
Es: montaggio swing = Squadra strutture (primario) + Facchini (supporto per sollevamento).

ALTER TABLE task ADD COLUMN fornitore_supporto_id uuid REFERENCES fornitori(id);
ALTER TABLE task ADD COLUMN stato_fornitore_supporto_minimo stato_fornitore DEFAULT 'pronto';
ALTER TABLE task ADD COLUMN supporto_ore_lavoro numeric;
ALTER TABLE task ADD COLUMN supporto_costo_ora numeric;
ALTER TABLE task ADD COLUMN supporto_numero_persone integer;

Aggiorna trigger: check anche fornitore_supporto_id.
Drop e ricrea v_task_completa (dipende da task.*).
UI: sezione "Supporto" sotto il fornitore primario nel pannello dettaglio.
Card task: "Squadra strutture + Facchini".
Costi: totale = manodopera primaria + manodopera supporto.

--- PUNTO 16: Consuntivo ore cantiere (presenze) --- [DA FARE]

CREATE TABLE presenze (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  data date NOT NULL,
  fornitore_id uuid NOT NULL REFERENCES fornitori(id) ON DELETE CASCADE,
  task_id uuid REFERENCES task(id) ON DELETE SET NULL,
  numero_persone integer NOT NULL DEFAULT 1,
  ore numeric NOT NULL,
  costo_ora numeric,
  costo_totale numeric GENERATED ALWAYS AS (
    CASE WHEN numero_persone IS NOT NULL AND ore IS NOT NULL AND costo_ora IS NOT NULL
    THEN numero_persone * ore * costo_ora ELSE NULL END
  ) STORED,
  note text,
  created_at timestamptz DEFAULT now()
);

Pagina /presenze: vista per giorno, inserimento rapido, totale giornaliero.
Pagina Costi: tab Preventivo / Consuntivo / Confronto.
Sidebar: voce "Presenze" con icona ClipboardList.

--- PUNTO 18: Tipologie materiali e attrezzi riutilizzabili --- [DA FARE]
Dipende dal PUNTO 2 (catalogo materiali).
tipologia_materiale: "strutturale", "consumo", "attrezzo"
Per attrezzi: check conflitti nel Gantt (stesso attrezzo su task sovrapposte).
Segnalazione visiva, non blocco automatico.
"""
