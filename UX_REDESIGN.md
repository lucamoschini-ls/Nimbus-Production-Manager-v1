# ============================================================
# NIMBUS 2026 — UX REDESIGN COMPLETO
# ============================================================
# Questo non è un fix di bug. È un redesign dell'esperienza.
#
# PRINCIPI:
# 1. GERARCHIA VISIVA — non tutto è ugualmente importante
# 2. PROGRESSIVE DISCLOSURE — mostro poco, clicco per approfondire  
# 3. OGNI COLORE HA UN SIGNIFICATO — non decorazione
# 4. SPAZIO = CHIAREZZA — meglio più scroll che più densità
# 5. AZIONI, NON REPORT — l'app dice cosa fare, non solo cosa c'è
# ============================================================

"""
Leggi CLAUDE.md per il contesto.

OBIETTIVO: Ridisegnare il layout di TUTTE le sezioni dell'app. Non aggiungere feature — ripensare come le informazioni esistenti vengono presentate. L'utente lavora con 200+ task, 116 materiali, 25 fornitori. Deve capire a colpo d'occhio cosa è importante senza essere sommerso.

=================================================================
SEZIONE 1 — CARD TASK (pagina Lavorazioni)
=================================================================

STATO ATTUALE: La card mostra tutto: titolo, chip tipologia, chip stato, fornitore, TUTTI i materiali con 3 campi editabili ciascuno (Disp, Ord, Entro il), tutte le operazioni. Risultato: muro di informazioni.

REDESIGN — 3 livelli di profondità:

LIVELLO 1 — CARD CHIUSA (default):
┌──────────────────────────────────────────────────────┐
│ ▸ Verniciatura vialetto                   Sq. finit. │
│   [verniciatura]  [Attesa fornitore]                  │
│   3 materiali · 2 operazioni da organizzare           │
└──────────────────────────────────────────────────────┘

Solo: freccia espandi, titolo, fornitore a destra, chip tipologia + stato sotto, e un RIASSUNTO compatto (quanti materiali, quante operazioni non organizzate). Niente campi editabili, niente dettagli.

La riga riassunto usa colori: "2 operazioni da organizzare" in ambra se > 0. "3 materiali" in grigio se tutto ok, rosso se qualcuno manca.

LIVELLO 2 — CARD ESPANSA (click sulla freccia):
Mostra i materiali, ma in modo compatto:
┌──────────────────────────────────────────────────────┐
│ ▾ Verniciatura vialetto                   Sq. finit. │
│   [verniciatura]  [Attesa fornitore]                  │
│                                                       │
│   ● Vernice per legno  5lt  [Da acquistare]          │
│   ● Pennelli           3pz  [Completo]               │
│   ● Acquaragia         2lt  [Da acquistare]           │
└──────────────────────────────────────────────────────┘

Ogni materiale = UNA RIGA: pallino, nome, quantità, chip stato. Niente campi editabili inline (quelli stanno nel pannello dettaglio a destra o nella pagina Materiali).

Sotto ogni materiale che ha operazioni, indent leggero:
│     └ trasporto — Trasportiamo ● (organizzato)        │
│     └ acquisto — Da organizzare ○                     │

LIVELLO 3 — DETTAGLIO (click sulla task → pannello laterale):
Tutto il resto: campi editabili materiali, operazioni complete, dipendenze, costi.

Questo riduce il rumore visivo del 70%. La lista task diventa leggibile.

=================================================================
SEZIONE 2 — PANNELLO DETTAGLIO TASK (il sheet a destra)
=================================================================

STATO ATTUALE: Un lungo form verticale con sezioni che si susseguono. Le operazioni dentro i materiali sono confuse — troppi dropdown e checkbox ammassati.

REDESIGN — Sezioni con header chiari e layout ordinato:

HEADER:
[Titolo editabile - font grande]
[Zona > Lavorazione - testo piccolo grigio]
[Chip stato calcolato con sfondo colorato]
Se bloccata: motivo in rosso sotto

SEZIONE "ESECUZIONE" (collassabile):
─── Esecuzione ──────────────────────────
Fornitore      [Dropdown]     [chip stato cliccabile]
Stato minimo   [Dropdown]
Supporto       [Dropdown]     [chip stato cliccabile]
                oppure [+ Aggiungi supporto]

SEZIONE "TEMPI" (collassabile):
─── Tempi ───────────────────────────────
Stato          [Dropdown: Da fare / In corso / Completata]
Data inizio    [Date picker]    Data fine    [Date picker]
Durata         [Input ore]      (~X giorni)

SEZIONE "MATERIALI" (collassabile, APERTA di default):
─── Materiali (3) ───────────────────────  [+ Aggiungi]

Per ogni materiale, UNA CARD con bordo leggero:
┌─ Vernice per legno ──────────── Da acquistare ── ✕ ─┐
│                                                       │
│ Quantità  [5]  lt   Disponibile [0]  Ordinata [0]    │
│ Prezzo    [15] €/lt  Costo totale: 75€               │
│ Provenienza [Acquisto ▾]  Entro il [15/04 📅]        │
│                                                       │
│ ─ Operazioni ──────────────────── [+ Aggiungi] ─     │
│                                                       │
│  Trasporto                                            │
│  Fornitore [Trasportiamo ▾]  [chip contattato]       │
│  Luogo     [Monterosi ▾]    ☐ Organizzato            │
│                                                       │
│  Acquisto                                             │
│  Fornitore [Io ▾]           ☑ Organizzato            │
│                                                       │
└──────────────────────────────────────────────────────┘

Ogni operazione dentro il materiale è una SUB-CARD con:
- Riga 1: Titolo (bold, auto-generato da tipologia)
- Riga 2: Fornitore dropdown + chip stato fornitore
- Riga 3: Luogo dropdown + checkbox Organizzato
Nient'altro visibile. Durata, costi, note sono in un expand ulteriore che si apre solo cliccando sull'operazione.

SEZIONE "DIPENDENZE" (collassabile):
─── Dipende da (2) ─────────────── [+ Aggiungi]
  Costruzione vialetto  [Ingresso > Vialetto]  ✓ completata
  Acquisto vernice      [Ingresso > Vialetto]  ⏳ da fare

SEZIONE "COSTI" (collassabile):
─── Costi ───────────────────────────────
Persone [2]   Ore [8]   €/ora [25]   Totale: 400€
Supporto: Persone [1]  Ore [4]  €/ora [15]  Totale: 60€
TOTALE TASK: 460€ + 75€ materiali = 535€

SEZIONE "NOTE" (collassabile):
─── Note ────────────────────────────────
[Textarea]

=================================================================
SEZIONE 3 — DASHBOARD
=================================================================

STATO ATTUALE: 4 contatori, 9 card zona, lista task bloccate, 20+ card fornitori. Tutto alla stessa dimensione, niente cliccabile, nessuna priorità.

REDESIGN — 3 sezioni con gerarchia chiara:

HEADER (contatori):
┌────────────┬────────────┬──────────────┬───────────────┐
│ 41 giorni  │ 1/200 ✓    │ 141 bloccate │ 12 da trovare │
│ all'apertura│ completate │  → click     │  → click      │
└────────────┴────────────┴──────────────┴───────────────┘
Ogni contatore è CLICCABILE:
- "141 bloccate" → naviga a /lavorazioni con filtro "bloccate"
- "12 da trovare" → naviga a /fornitori con filtro "da_trovare"

SEZIONE "AZIONI PRIORITARIE" (la più importante, in cima):
Non una lista di task bloccate (quelle sono tutte bloccate, non serve elencarne 50). Ma le AZIONI che sbloccano più task:

┌──────────────────────────────────────────────────────┐
│ ★ Trovare Squadra finiture → sblocca 46 task        │
│   [chip Da trovare — cliccabile per avanzare]        │
├──────────────────────────────────────────────────────┤
│ ★ Trovare Leonardo Mikhail → sblocca 25 task         │
│   [chip Contattato — cliccabile per avanzare]        │
├──────────────────────────────────────────────────────┤
│ ★ Ordinare materiali: 109 da acquistare              │
│   [→ vai a Materiali]                                │
├──────────────────────────────────────────────────────┤
│ ★ Organizzare 10 trasporti                           │
│   [→ vai a Trasporti]                                │
└──────────────────────────────────────────────────────┘

Massimo 5-6 azioni. Ordinate per impatto (quante task sbloccano).

SEZIONE "PROGRESSO ZONE" (compatta):
Le 9 zone come barre orizzontali, non card:

Pre-Cantiere    ▓░░░░░░░░░░  0/22   17 bloccate
Ingresso        ▓▓░░░░░░░░░  1/11   10 bloccate
Aperitivo       ░░░░░░░░░░░  0/27   24 bloccate

Click sulla riga → naviga alla zona nelle lavorazioni.
Compatto: 9 righe, non 9 card.

SEZIONE "FORNITORI" (solo quelli che richiedono azione):
NON mostrare Alessandro (pronto) e Luca (pronto).
NON mostrare i confermati.
Solo da_trovare e contattato, ordinati per task bloccate:

Squadra finiture   [Da trovare]   46 task bloccate
Leonardo Mikhail   [Contattato]   25 task bloccate
Squadra strutture  [Da trovare]   17 task bloccate
...

Chip stato cliccabile per avanzare.
Link "Vedi tutti i fornitori →" in fondo.

=================================================================
SEZIONE 4 — GANTT
=================================================================

STATO ATTUALE: Quasi vuoto perché poche task hanno date. Le barre che ci sono sono piccole e senza etichetta.

REDESIGN:
- Sulle barre: mostra il NOME della task (testo bianco sulla barra, troncato se necessario)
- Toggle in alto: "Colora per: [Zona] [Tipologia] [Fornitore]" con legenda sotto
- Le lavorazioni senza nessuna task con date: mostrare in grigio chiaro con testo "date non compilate"
- Tooltip on hover: titolo completo, fornitore, stato, dipendenze
- Click sulla barra: apre il pannello dettaglio task
- Linea verticale rossa "OGGI" più prominente (2px, label "Oggi")
- Linea verticale verde "1 MAGGIO" con label "Apertura"

=================================================================
SEZIONE 5 — FORNITORI (pagina)
=================================================================

STATO ATTUALE: Grid 3 colonne, tutti allo stesso livello, nomi in caps inconsistenti.

REDESIGN:
- ORDINA per priorità: prima da_trovare (rosso), poi contattato (ambra), poi confermato, ecc.
- Nella lista task espansa: nomi task NON troncati (text-wrap), chip stato singolo (non duplicato)
- Il costo/ora editabile nella card fornitore si propaga a tutte le task assegnate

=================================================================
SEZIONE 6 — COLORI E TIPOGRAFIA
=================================================================

I colori devono avere significato, non essere decorativi:

STATI:
- Rosso (#FF3B30): bloccato, da trovare, da acquistare — RICHIEDE AZIONE
- Ambra (#FF9F0A): in attesa, contattato, ordinato — IN CORSO
- Verde (#34C759): completato, pronto, in cantiere — OK
- Grigio (#86868B): da fare, non iniziato — NEUTRO
- Blu (#0071E3): in corso — ATTIVO

Usare questi colori CONSISTENTEMENTE ovunque. Lo stesso stato ha lo stesso colore in ogni pagina.

TIPOGRAFIA:
- Titoli task/lavorazioni: Outfit 600, 15px, #1d1d1f
- Info secondarie (zona > lavorazione): Outfit 400, 12px, #86868b
- Contatori grandi: Outfit 700, 28px
- Label campi: Outfit 500, 10px, #86868b
- Chip testo: Outfit 500, 11px

=================================================================
SEZIONE 7 — LABEL SUI FILTRI + PROPAGAZIONE COSTI
=================================================================

FILTRI: Ogni dropdown filtro in ogni pagina ha una label fissa sopra:
"Zona" sopra "Tutte le zone"
"Stato" sopra "Tutti"
"Fornitore" sopra "Tutti"
"Luogo" sopra "Tutti i luoghi"
"Provenienza" sopra "Tutte"
"Tipologia" sopra "Tutte"

Font: Outfit 500, 9px, #86868b, sempre visibile.

COSTO/ORA FORNITORE:
Quando si imposta costo_ora nella scheda fornitore:
- UPDATE tutte le task con fornitore_id = questo fornitore SET costo_ora = nuovo valore
  SOLO dove costo_ora è NULL o uguale al vecchio valore (non sovrascrivere valori custom)
- Stessa logica per fornitore supporto

=================================================================
SEZIONE 8 — BOTTONE AGGIUNGI TASK
=================================================================

Il bottone "+ Aggiungi task" deve apparire sia in CIMA che in fondo alla lista task della lavorazione. Se la lavorazione ha 20 task non voglio scrollare fino in fondo per aggiungerne una.

=================================================================
VERIFICA
=================================================================

Dopo il redesign, l'app deve dare questa sensazione:
- Apro la Dashboard → so IMMEDIATAMENTE cosa devo fare oggi
- Apro Lavorazioni → vedo le task come lista pulita, espando solo quelle che mi interessano
- Apro il dettaglio task → le informazioni sono organizzate in sezioni logiche con spazio
- Apro Materiali/Trasporti/Fornitori → vedo e modifico tutto da lì
- Il Gantt ha barre con nomi, colori con significato, legenda

Testa a 1440px (desktop) e 375px (mobile).
"""
