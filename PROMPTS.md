# ============================================================
# NIMBUS 2026 — Production Manager
# Prompt per Claude Code — Tutti i moduli
# ============================================================
# Istruzioni: copia-incolla UN modulo alla volta in Claude Code.
# Ogni modulo presuppone che i precedenti siano completati.
# Prima di iniziare, assicurati che CLAUDE.md e schema.sql siano
# nella root del progetto.
# ============================================================


# ████████████████████████████████████████████████████████████
# MODULO 0 — Setup progetto e database
# ████████████████████████████████████████████████████████████

"""
Leggi CLAUDE.md per il contesto completo del progetto.

OBIETTIVO: Setup del progetto Next.js e dello schema database su Supabase.

STEP 1 — Progetto Next.js
- Crea progetto Next.js 14 con App Router, TypeScript, Tailwind CSS
- Installa dipendenze: @supabase/supabase-js, @supabase/ssr, lucide-react, date-fns
- Configura shadcn/ui con tema custom (vedi design system in CLAUDE.md)
- Aggiungi Google Font Outfit nel layout root
- Crea .env.local con NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (placeholder)
- Crea lib/supabase/client.ts e lib/supabase/server.ts

STEP 2 — Schema database
- Esegui schema.sql su Supabase (SQL Editor nel dashboard)
- Verifica che tutte le tabelle, trigger, viste e funzioni siano create
- Genera i tipi TypeScript con: npx supabase gen types typescript --project-id <id> > src/lib/types.ts

STEP 3 — Layout base
- Root layout con Outfit font, sfondo #f5f5f7
- Sidebar desktop (240px, fissa a sinistra, sfondo bianco, bordo destro #e5e5e7)
  - Logo "Nimbus 2026" in alto
  - Link navigazione con icone Lucide: Dashboard, Lavorazioni, Gantt, Fornitori, Materiali, Costi
  - Link attivo: sfondo #f5f5f7, testo #1d1d1f. Inattivo: testo #86868b
- Tab bar mobile (bottom, 6 icone, stessa navigazione)
- Area contenuto a destra della sidebar con padding 24px
- Pagina dashboard placeholder con testo "Dashboard — coming in Module 4"

STEP 4 — Verifica
- npm run dev funziona senza errori
- La sidebar/tab bar si vede
- La connessione Supabase funziona (testa con un semplice fetch dalla tabella zone)

OUTPUT ATTESO: Progetto Next.js funzionante con navigazione, connesso a Supabase con schema completo.
"""


# ████████████████████████████████████████████████████████████
# MODULO 1 — Fornitori e Zone
# ████████████████████████████████████████████████████████████

"""
Leggi CLAUDE.md per il contesto.

OBIETTIVO: Pagina Fornitori completa e seed data.

STEP 1 — Seed data fornitori
Inserisci questi fornitori nel database (seed.sql o direttamente):

| Nome | Tipo | Specializzazione | Stato |
|------|------|-----------------|-------|
| Luca | Socio | Gestionale / PM | pronto |
| Alessandro | Socio | Tecnico / Cantiere | pronto |
| Facchini | Manodopera | Carico/scarico, movimentazione | da_trovare |
| Ingegnere | Consulente | Licenza PS, sicurezza | contattato |
| Leonardo Mikhail | Fornitore | Elettricista — distribuzione, stripled, DMX, quadri | contattato |
| Squadra strutture | Fornitore | Pedane, vialetti, anfiteatri, camminamenti, cassoni | da_trovare |
| Squadra finiture | Fornitore | Manutenzioni, vasi, verniciature, piccoli lavori | da_trovare |
| Mastroianni | Fornitore | Idraulico — cisterne, sanitrit, autoclave, reflue | contattato |
| Sebach | Fornitore | Container bagni | contattato |
| NOLEGGIO UFFICIO | Fornitore | Container ufficio | da_trovare |
| Chef (Danilo) | Fornitore | Cucina, attrezzatura, gazebo | confermato |
| Davino | Fornitore | Tecnico audio/luci setup | contattato |
| Fornitore AVL | Fornitore | Pedana stage | da_trovare |
| NOLEGGIO TELAI | Fornitore | Telai anfiteatri | da_trovare |
| Trasportiamo | Fornitore | Trasporto pesante | contattato |
| Trasporto leggero | Fornitore | Trasporto leggero | da_trovare |
| Giardiniere | Fornitore | Irrigazione, piante | da_trovare |
| Tecnico audio/luci stagione | Fornitore | Audio/luci per la stagione | da_trovare |
| Fornitore distrib. elettrica | Fornitore | Distribuzione elettrica generale | da_trovare |
| Rinalduzzi | Fornitore | Noleggio strutture metalliche | contattato |
| Lumiroma | Fornitore | Illuminazione, luci emergenza | confermato |
| Costruzione Metalliche | Fornitore | Strutture metalliche | contattato |
| Teti Acque | Fornitore | Cisterne acqua | contattato |
| Fornitore allori | Fornitore | Piante allori all'ingrosso | da_trovare |
| Fornitore portale | Fornitore | Portale archi ingresso | da_trovare |

Inserisci anche i permessi:
| Nome | Stato | Responsabile |
|------|-------|-------------|
| OSP | da_presentare | Luca |
| SCIA | da_presentare | Luca |
| Licenza PS | da_presentare | Ingegnere |
| Accordo Municipio | da_presentare | Luca |
| Assicurazione RC | da_presentare | Luca |
| HACCP | da_presentare | Luca |

STEP 2 — Pagina Fornitori (/fornitori)
- Lista fornitori in card bianche
- Ogni card mostra: nome, specializzazione, stato (chip colorato), numero task associate
- Il chip stato ha colori: da_trovare=rosso, contattato=ambra, confermato=blu, sopralluogo_fatto=indaco, materiali_definiti=viola, pronto=verde
- Click sulla card apre pannello laterale con:
  - Tutti i campi editabili (nome, tipo, specializzazione, contatto, costo/ora, note)
  - Dropdown stato con i 6 valori del ciclo di vita
  - Lista delle task associate a questo fornitore (read-only per ora, link in futuro)
- Bottone "+" per aggiungere nuovo fornitore
- Filtro per stato (dropdown in alto)
- Salvare le modifiche con Server Action

STEP 3 — Sezione Permessi (sotto la pagina Fornitori, o come tab)
- Lista permessi con stato, responsabile, data scadenza
- Chip stato colorati: da_presentare=rosso, presentato=ambra, in_attesa=blu, ottenuto=verde
- Click per editare

DESIGN: Segui rigorosamente il design system in CLAUDE.md. Font Outfit, card bianche border-radius 12px, sfondo pagina #f5f5f7, nessun emoji.

OUTPUT ATTESO: Pagina fornitori funzionante con CRUD, seed data caricati, stati editabili.
"""


# ████████████████████████████████████████████████████████████
# MODULO 2 — Lavorazioni e Task
# ████████████████████████████████████████████████████████████

"""
Leggi CLAUDE.md per il contesto.

OBIETTIVO: Vista principale Lavorazioni con CRUD task. Questa è la vista dove l'utente passa la maggior parte del tempo.

STEP 1 — Seed data lavorazioni
Crea le lavorazioni per ogni zona. Ecco la struttura (crea un seed.sql):

INGRESSO: Vialetto, Portale archi, Vasi ingresso, Allori ingresso, Stripled ingresso, Luci piante ingresso, Irrigazione ingresso
APERITIVO: Terreno aperitivo, Swing, Round aperitivo, Prato sintetico, Arredi aperitivo, Luci e audio aperitivo, Varie aperitivo
AREA BAGNI: Container bagni, Cisterne e impianto idrico, Sanitrit, Autoclave, Elettrico bagni, Finiture bagni
LOCALI TECNICI: Container ufficio, Cucina e magazzino, Impianto reflue, Elettrico locali tecnici, Finiture locali tecnici
CHIOSCO: Nuvola grande, Manutenzione struttura chiosco, Banconi e bar chiosco, Bottigliera, Scaffalature, Camminamento chiosco-pedana, Stripled chiosco
PEDANA: Anfiteatri, Gradini pedana, Manutenzione pedana, Nuvole pedana, Cablaggio DMX, Stage, Service audio, Service luci, Regia, Bar pedana, Arredi pedana, Round pedana, Vasi pedana
GENERALE: Distribuzione elettrica, Sicurezza elettrica, Sicurezza e evacuazione, Oscuramento via Gramsci, Area rifiuti, Contatore, Vasi generali, Allori generali, Irrigazione generale, Trasporto Monterosi
PRE-CANTIERE: Ricerca fornitori, Sopralluoghi, Materiali e ordini, Budget
PERMESSI: Pratiche

STEP 2 — Pagina Lavorazioni (/lavorazioni)
Layout a due colonne (desktop):
- SINISTRA (280px): lista zone espandibili. Click su zona per espandere/collassare le lavorazioni dentro.
  Ogni zona mostra: nome, numero task, barra progresso (% completate)
  Ogni lavorazione mostra: nome, numero task, chip stato riassuntivo
  
- DESTRA: dettaglio della lavorazione selezionata
  - Header: nome lavorazione, zona, barra progresso
  - Lista task ordinate con drag-and-drop (usare un semplice sort con bottoni su/giù se il drag è troppo complesso)
  - Ogni task card mostra:
    - Titolo
    - Chip tipologia (colorato secondo la tipologia)
    - Chip stato_calcolato (con colore: da_fare=grigio, in_corso=blu, completata=verde, in_attesa_*=ambra, bloccata=rosso)
    - Se in_attesa: motivo specifico (es. "In attesa: Leonardo Mikhail (contattato → pronto)")
    - Fornitore assegnato (se presente)
  - Bottone "+" per aggiungere task alla lavorazione
  - Bottone "+" per aggiungere lavorazione alla zona (nella sidebar sinistra)

Su mobile: lista zona → tap → lista lavorazioni → tap → lista task (navigazione a drill-down).

STEP 3 — Pannello dettaglio task
Click su una task card apre un pannello laterale (desktop: slide-in da destra, 420px) o pagina (mobile):

- Titolo (editabile inline)
- Tipologia (dropdown con le 13 tipologie)
- Fornitore (dropdown con search — lista tutti i fornitori)
- Stato fornitore minimo (dropdown: confermato, sopralluogo_fatto, materiali_definiti, pronto)
- Stato (dropdown: da_fare, in_corso, completata, bloccata)
- Se bloccata: campo motivo blocco
- Stato calcolato (read-only, con spiegazione del perché)
- Date: data inizio, data fine, durata giorni
- Costi: numero persone, ore lavoro, costo/ora → costo manodopera (calcolato)
- Note (textarea)
- Sezione DIPENDENZE (vedi Modulo 3)
- Sezione MATERIALI (vedi Modulo 3)

Tutte le modifiche salvate con Server Action su blur/change.

STEP 4 — Seed delle 213 task
Importa le task dal file Excel di Luca nel database. Ho preparato il JSON in tasks_seed.json.
Mappa ogni task alla lavorazione corretta usando le keyword nel titolo.
Per le task che hanno dipendenze già compilate (campo "dip" nel JSON), crea i record in task_dipendenze.
Per le task con fornitore ("quale" nel JSON), cerca il fornitore per nome e collegalo.

OUTPUT ATTESO: Vista lavorazioni funzionante con tutte le 213 task, organizzate in lavorazioni per zona, editabili.
"""


# ████████████████████████████████████████████████████████████
# MODULO 3 — Dipendenze e Materiali
# ████████████████████████████████████████████████████████████

"""
Leggi CLAUDE.md per il contesto.

OBIETTIVO: Completare il pannello dettaglio task con gestione dipendenze e materiali. Pagina Materiali.

STEP 1 — Dipendenze nel pannello task
Nel pannello dettaglio task (creato nel Modulo 2), aggiungi sezione DIPENDENZE:

- Mostra lista dipendenze attuali: per ognuna mostra titolo task, zona, lavorazione, stato
- Bottone "Aggiungi dipendenza" apre un dropdown con SEARCH:
  - L'utente digita testo libero (es. "vialetto" o "swing")
  - Il dropdown mostra tutte le task che matchano, raggruppate per Zona > Lavorazione
  - Formato: "Ingresso > Vialetto > Costruzione nuovo vialetto"
  - Click per aggiungere la dipendenza
  - Il record viene creato in task_dipendenze
- Bottone X per rimuovere una dipendenza
- Lo stato_calcolato si aggiorna automaticamente (trigger database)

STEP 2 — Materiali nel pannello task
Nel pannello dettaglio task, aggiungi sezione MATERIALI:

- Lista materiali attuali della task, ognuno con:
  - Nome, quantità + unità, prezzo unitario → costo totale
  - Provenienza (chip: acquisto/magazzino/noleggio/con fornitore)
  - Stato: ordinato? in cantiere? (toggle)
  - Giorni consegna, data ordine → data consegna prevista
  - Bottone X per rimuovere
- Bottone "Aggiungi materiale" apre un mini-form inline:
  - Nome (text), Quantità (number), Unità (dropdown), Prezzo unitario (number)
  - Provenienza (dropdown), Giorni consegna (number), Note
  - Bottone Salva
- Quando un materiale viene marcato "in cantiere", lo stato_calcolato della task si aggiorna

STEP 3 — Pagina Materiali (/materiali)
Vista di tutti i materiali del progetto:
- Filtri: per zona, per stato (da ordinare / ordinato / in cantiere / tutto), per provenienza
- Lista con card: nome materiale, quantità, costo, task associata, zona, stato
- Click apre il pannello della task padre
- In alto: contatori (totale materiali, da ordinare, ordinati, in cantiere) e costo totale materiali

OUTPUT ATTESO: Dipendenze e materiali funzionanti nel pannello task. Pagina materiali con filtri e contatori.
"""


# ████████████████████████████████████████████████████████████
# MODULO 4 — Dashboard e Gantt
# ████████████████████████████████████████████████████████████

"""
Leggi CLAUDE.md per il contesto.

OBIETTIVO: Dashboard operativa e vista Gantt.

STEP 1 — Dashboard (/ pagina root)
Layout con card informative:

ROW 1 — Contatori principali (4 card):
- Giorni all'apertura (countdown da oggi al 1 maggio 2026)
- Task completate / totali (con barra progresso)
- Task bloccate (numero, colore rosso se > 0)
- Fornitori da trovare (numero)

ROW 2 — Progresso per zona:
- Card per ogni zona con: nome, barra progresso, conteggio task (completate/totali)
- Usa colore della zona per la barra

ROW 3 — Task urgenti:
- Lista delle prime 10 task con stato_calcolato che inizia con "in_attesa" o con data_fine vicina
- Ogni task mostra: titolo, zona, motivo attesa, fornitore

ROW 4 — Stato fornitori:
- Mini-card per ogni fornitore con stato != pronto
- Mostra nome, stato attuale, quante task bloccate

STEP 2 — Vista Gantt (/gantt)
Due modalità (toggle in alto): "Cantiere" (dal 1 aprile) e "Progetto" (dal 1 marzo).

Struttura:
- Colonna sinistra (200px, sticky): lista lavorazioni raggruppate per zona
  - Ogni zona è un header colorato
  - Sotto, le lavorazioni (espandibili per mostrare singole task)
- Area destra: griglia temporale
  - Header: giorni con numero, abbreviazione giorno settimana (Lu, Ma...), mese quando cambia
  - Weekend con sfondo leggermente grigio
  - Barre per lavorazione: inizio = data_inizio della prima task, fine = data_fine dell'ultima task
  - Barre per task (quando lavorazione espansa): colorate per tipologia o zona
  - Linea verticale rossa: oggi
  - Linea verticale verde: 1 maggio (apertura)

Click su barra apre il pannello dettaglio task.

Il Gantt deve essere scrollabile orizzontalmente e verticalmente.
Larghezza colonna giorno: 40px in modalità Cantiere, 18px in modalità Progetto.

STEP 3 — Pagina Costi (/costi)
- Tabella riepilogo per zona: manodopera, materiali, totale
- Riga totale in fondo
- Dettaglio espandibile per zona: lista task con costi > 0
- In alto: totale cantiere grande e colorato

OUTPUT ATTESO: Dashboard con dati live dal database. Gantt funzionante con barre posizionate. Pagina costi.
"""


# ████████████████████████████████████████████████████████████
# MODULO 5 — Import dati e rifinitura
# ████████████████████████████████████████████████████████████

"""
Leggi CLAUDE.md per il contesto.

OBIETTIVO: Importare tutti i dati dal foglio Excel di Luca e rifinire l'app.

STEP 1 — Script di import
Crea uno script Node.js (scripts/import-excel.ts) che:
- Legge il file Excel tasks_seed.json (già estratto)
- Per ogni task:
  - Trova o crea la lavorazione corretta nella zona corretta
  - Crea la task con tutti i campi compilati (tipologia, fornitore, stato, deadline, note)
  - Se ha dipendenze (campo "dip"), crea i record in task_dipendenze
  - Mappa i nomi fornitori ai record nel database
- Log di tutte le operazioni

STEP 2 — Rifinitura UX
- Loading states su tutte le pagine (skeleton loader, non spinner)
- Ottimistic updates: quando l'utente cambia stato task, il UI si aggiorna subito senza aspettare il database
- Breadcrumb nella vista lavorazioni: Zona > Lavorazione > Task
- Responsive: tutte le pagine devono funzionare su iPhone (min 375px)
- Tasto "Aggiorna" che forza refetch dati
- Empty states carini quando non ci sono dati (illustrazione Lucide + testo)

STEP 3 — PWA
- Manifest.json per installazione su iPhone
- Meta tag apple-mobile-web-app-capable
- Icona app 192x192 e 512x512 (generala semplice: sfondo bianco, testo "N" in Outfit bold)
- Theme color bianco

STEP 4 — Test
- Verifica che tutte le 213 task siano importate
- Verifica che le dipendenze funzionino (cambiare stato fornitore sblocca task)
- Verifica che i materiali si aggiungano e lo stato si aggiorni
- Verifica Gantt con date reali
- Testa su iPhone Safari

OUTPUT ATTESO: App completa con tutti i dati reali, funzionante su desktop e mobile, installabile come PWA.
"""


# ████████████████████████████████████████████████████████████
# MODULO 6 (OPZIONALE) — Features avanzate
# ████████████████████████████████████████████████████████████

"""
Leggi CLAUDE.md per il contesto.

OBIETTIVO: Features aggiuntive richieste dopo il go-live.

POSSIBILI FEATURES:
- Notifiche: task in scadenza, fornitori da sollecitare
- Export PDF del Gantt
- Vista "Chi fa cosa oggi": filtra task per persona/fornitore per la giornata
- Storico modifiche: log di chi ha cambiato cosa e quando
- Foto cantiere: upload foto collegate a task
- Template: salvare la struttura del progetto come template per la stagione successiva

Da definire con Luca dopo i primi giorni di utilizzo.
"""
