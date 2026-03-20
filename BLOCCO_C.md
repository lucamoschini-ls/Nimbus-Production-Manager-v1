# ============================================================
# NIMBUS 2026 — BLOCCO C — Struttura dati avanzata
# ============================================================
# 3 feature, in ordine. Fai una alla volta, verifica, poi la successiva.
# ============================================================

"""
Leggi CLAUDE.md per il contesto.

=================================================================
FEATURE 1 — CATALOGO MATERIALI + TIPOLOGIE + ATTREZZI (punti 2 e 18)
=================================================================

PROBLEMA: Lo stesso materiale (es. "vernice per legno esterno") serve in più task e zone. Ogni istanza è indipendente — non si possono raggruppare gli acquisti. Inoltre gli attrezzi (zappa, idropulitrice) sono riutilizzabili tra task ma il sistema non lo sa.

STEP 1 — Database

CREATE TABLE catalogo_materiali (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome text NOT NULL,
  tipologia_materiale text NOT NULL DEFAULT 'consumo',
  -- 'strutturale' = legno, tubi, viti, cisterne. Ogni task ha il suo.
  -- 'consumo' = vernice, terra, sabbia. Si consuma, comprabile in blocco.
  -- 'attrezzo' = zappa, idropulitrice, trapano. Riutilizzabile tra task.
  unita_default text,
  prezzo_unitario_default numeric,
  provenienza_default text,
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE materiali ADD COLUMN catalogo_id uuid REFERENCES catalogo_materiali(id) ON DELETE SET NULL;

Auto-popola il catalogo: per ogni nome materiale unico già presente nella tabella materiali, crea un record in catalogo_materiali con tipologia_materiale = 'consumo' (default). L'utente cambierà manualmente la tipologia dove serve.

STEP 2 — UI: Aggiunta materiale dal catalogo

Quando l'utente clicca "+ Aggiungi materiale" su una task (nel pannello dettaglio):
- Si apre un dropdown con SEARCH (combobox)
- Mostra i materiali dal catalogo, raggruppati per tipologia_materiale:
  --- Attrezzi ---
  Zappa
  Idropulitrice
  --- Strutturale ---
  Legno tavole
  --- Consumo ---
  Vernice per legno
  Terra
  --- 
  [+ Nuovo materiale]

- Se sceglie dal catalogo: crea il record in materiali con catalogo_id collegato, pre-compila nome, unità, prezzo, provenienza dai default del catalogo
- Se sceglie "Nuovo materiale": crea sia il record nel catalogo (con i dati inseriti) che l'istanza in materiali

STEP 3 — Pagina Materiali: tab Catalogo

Nella pagina /materiali, aggiungi una tab "Catalogo" (accanto alla tab principale "Materiali"):

La tab Catalogo mostra:
- Lista di tutti i materiali nel catalogo
- Per ognuno:
  - Nome (editabile inline)
  - Tipologia (dropdown: strutturale/consumo/attrezzo — editabile)
  - Unità default, prezzo default (editabili)
  - Quante task lo usano (conteggio calcolato)
  - Quantità totale necessaria (SUM di materiali.quantita dove catalogo_id = questo)
  - Quantità totale disponibile (SUM di materiali.quantita_disponibile)
  - Da acquistare totale (differenza)
  
- Filtro per tipologia (strutturale/consumo/attrezzo)
- Bottone "+ Aggiungi al catalogo"

Questo è utile per capire: "serve vernice? In totale ne servono 25 lt su 6 task diverse — compro tutto insieme"

STEP 4 — Attrezzi: rilevamento conflitti

Per i materiali con tipologia_materiale = 'attrezzo':
- Un attrezzo può essere assegnato a più task (tramite catalogo_id condiviso)
- Se due task usano lo stesso attrezzo E hanno date che si sovrappongono nel Gantt → CONFLITTO
- Il sistema deve segnalare il conflitto

Dove mostrare i conflitti:
A) Nella tab Catalogo: per ogni attrezzo, mostra le task che lo usano. Se ci sono sovrapposizioni di date, mostra warning arancione: "Attenzione: usato da 'Pulizia porfido' (15/04) e 'Pulizia nuvole' (15/04) — servono 2 o schedulare in giorni diversi"

B) Nella card task (pagina lavorazioni): se un materiale-attrezzo ha conflitto, mostra chip arancione "Conflitto attrezzo"

C) Nel Gantt: le barre di task con conflitto attrezzi hanno bordo arancione tratteggiato

La logica di check:
- Per ogni materiale con catalogo_id che punta a un attrezzo
- Cerca altri materiali con lo stesso catalogo_id in task diverse
- Confronta date_inizio/date_fine delle task
- Se si sovrappongono → conflitto

Per ora NON bloccare automaticamente — segnala solo. L'utente decide.

STEP 5 — Pagina Impostazioni: tipologie materiale

Nella pagina /impostazioni, aggiungi sezione "Tipologie Materiale":
- Lista: strutturale, consumo, attrezzo
- Per ora read-only (sono fisse), ma visualizzate con spiegazione di cosa significano

=================================================================
FEATURE 2 — FORNITORE SUPPORTO SULLA TASK (punto 15)
=================================================================

PROBLEMA: Alcune task richiedono due fornitori per l'esecuzione. Es: montaggio swing = Squadra strutture (monta) + Facchini (sollevano). Questo è diverso dalle operazioni sui materiali — qui si parla di chi ESEGUE la task.

STEP 1 — Database

ALTER TABLE task ADD COLUMN fornitore_supporto_id uuid REFERENCES fornitori(id) ON DELETE SET NULL;
ALTER TABLE task ADD COLUMN stato_fornitore_supporto_minimo stato_fornitore DEFAULT 'pronto';
ALTER TABLE task ADD COLUMN supporto_numero_persone integer;
ALTER TABLE task ADD COLUMN supporto_ore_lavoro numeric;
ALTER TABLE task ADD COLUMN supporto_costo_ora numeric;

Nota: NON usare GENERATED ALWAYS per il costo supporto — calcolalo nella vista o nell'app.

Aggiorna la vista v_task_completa: DROP e ricrea includendo i nuovi campi + il join su fornitori per fornitore_supporto_id.

Aggiorna trigger calcola_stato_task: se fornitore_supporto_id è popolato E il fornitore supporto non ha raggiunto stato_fornitore_supporto_minimo → in_attesa_fornitore (specificando quale dei due).

STEP 2 — UI: Pannello dettaglio task

Sotto la sezione "Fornitore" (primario), aggiungi sezione "Fornitore supporto":
- Dropdown fornitore (con search, come il primario)
- Stato minimo (dropdown)
- Chip stato attuale del fornitore supporto
- Numero persone, ore lavoro, costo/ora (editabili inline)
- Bottone "Rimuovi supporto" per svuotare i campi

Se non serve supporto, la sezione mostra solo un bottone "+ Aggiungi fornitore supporto" che la espande.

STEP 3 — UI: Card task e altre viste

- Card task (lista lavorazioni): se c'è supporto, mostra "Fornitore primario + Supporto" (es: "Squadra strutture + Facchini")
- Gantt: barra task mostra entrambi i nomi nel tooltip
- Costi: costo manodopera totale = (persone × ore × costo primario) + (persone × ore × costo supporto)
- Fornitori: nella lista task espandibile, le task dove il fornitore è supporto appaiono con nota "(supporto)"

=================================================================
FEATURE 3 — PRESENZE / CONSUNTIVO ORE CANTIERE (punto 16)
=================================================================

PROBLEMA: Serve tracciare a consuntivo chi ha effettivamente lavorato, quante ore, e quanto è costato. Separato dal preventivo (che è nelle task).

STEP 1 — Database

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

CREATE INDEX idx_presenze_data ON presenze(data);
CREATE INDEX idx_presenze_fornitore ON presenze(fornitore_id);

STEP 2 — Pagina /presenze

Aggiungi voce "Presenze" nella sidebar con icona ClipboardList, tra Trasporti e Costi.

Layout pagina:
- In alto: selettore data (date picker per scegliere il giorno, frecce avanti/indietro per navigare tra giorni)
- Sotto: lista presenze di quel giorno
- Per ogni presenza una riga editabile:
  [Dropdown fornitore] [Input numero persone] [Input ore] [Input costo/ora] [Costo totale calcolato] [Dropdown task opzionale] [Input note] [X elimina]
- Bottone "+ Aggiungi presenza" in fondo
- Totale giornaliero in fondo: ore totali, costo totale, numero fornitori

Ogni campo salva su blur/change.

STEP 3 — Pagina Costi aggiornata

La pagina /costi attuale mostra il preventivo (dalle task). Aggiungi 3 tab:

TAB "Preventivo" (come ora):
- Riepilogo per zona: manodopera + materiali + totale
- Include il costo del fornitore supporto

TAB "Consuntivo":
- Riepilogo per giorno: data, fornitori che hanno lavorato, ore totali, costo totale
- Riepilogo per fornitore: nome fornitore, giorni lavorati, ore totali, costo totale
- Totale consuntivo

TAB "Confronto":
- Per ogni fornitore: preventivo (dalle task) vs consuntivo (dalle presenze)
- Differenza: sopra budget / sotto budget
- Totale: preventivo totale vs consuntivo totale

=================================================================
VERIFICA FINALE BLOCCO C
=================================================================

1. Aggiungi "Zappa" al catalogo come attrezzo
2. Assegnala a due task diverse con date sovrapposte
3. Verifica che appaia il warning conflitto nella card task e nel Gantt
4. Aggiungi fornitore supporto a una task, verifica che la task si blocchi se il supporto non è pronto
5. Aggiungi presenze per un giorno, verifica il totale nella pagina Costi tab Consuntivo
"""
