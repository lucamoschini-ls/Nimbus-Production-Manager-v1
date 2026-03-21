# ============================================================
# NIMBUS 2026 — ROUND DI MIGLIORAMENTI
# 3 prompt separati. Esegui uno alla volta.
# ============================================================


# ████████████████████████████████████████████████████████████
# PROMPT 1 — Fix urgenti + Tab Materiali ripensata
# ████████████████████████████████████████████████████████████

"""
Leggi CLAUDE.md per il contesto.

PARTE A — 3 FIX URGENTI

FIX 1: Duplicare una task in un'altra area/lavorazione
Nel pannello dettaglio task (task-detail-sheet), aggiungi un bottone "Duplica in..." sotto il titolo o nel menu azioni.
Click → apre dropdown con tutte le lavorazioni raggruppate per zona (stesso formato del dropdown "Lavorazione" già esistente).
Seleziono la destinazione → il sistema crea una COPIA della task (stesso titolo + " (copia)", stessa tipologia, stesso fornitore, stessi materiali copiati) nella lavorazione scelta.
I materiali vengono duplicati come nuove istanze collegate allo stesso catalogo_id. Le operazioni sui materiali vengono copiate.
Le dipendenze NON vengono copiate (non avrebbe senso).
Dopo la duplicazione, apri il dettaglio della nuova task.

FIX 2: Nome lavorazione — doppio click si richiude subito
Il problema è che il blur event scatta immediatamente dopo il focus. Probabilmente il doppio click causa: click1 → focus input, click2 → blur (perde focus) → si chiude.
SOLUZIONE: dopo che l'input appare, metti un setTimeout di 100ms prima di aggiungere il listener onBlur. Oppure usa un flag isEditing con un piccolo delay. L'input deve rimanere aperto finché l'utente non preme Enter o clicca FUORI dalla riga.
TESTA: doppio click → input appare → posso digitare → Enter salva → oppure click fuori salva.

FIX 3: Fornitori — tipologie editabili e filtro
A) Nella pagina Impostazioni, sezione "Tipologie Fornitore" (nuova sezione):
   Lista editabile: Fornitore, Socio, Consulente, Manodopera, Noleggio, Negozio/Rivendita
   Possibilità di aggiungere/eliminare tipologie.
   Database: CREATE TABLE tipologie_fornitore (id uuid PK, nome text, ordine int);
   Modifica fornitori.tipo da text libero a FK o almeno dropdown che legge da questa tabella.

B) Nella pagina Fornitori, aggiungi filtro dropdown "Tipologia" accanto al filtro stato esistente:
   Tutte / Fornitore / Socio / Consulente / Manodopera / Noleggio / Negozio

PARTE B — TAB MATERIALI RIPENSATA

La pagina /materiali tab "Materiali" va completamente ripensata. L'utente ha 156 materiali — serve chiarezza, non una lista infinita di card identiche.

NUOVA STRUTTURA PAGINA MATERIALI:

In alto: i contatori cliccabili che già ci sono (Da acquistare, Da noleggiare, Da trasportare, In loco, Completi)

Sotto: TOGGLE VISTA: [Per materiale] [Per area]

--- VISTA "PER MATERIALE" (default) ---

I materiali sono raggruppati per voce di catalogo. Cioè: tutte le istanze dello stesso materiale sono sotto lo stesso header.

Esempio:

┌──────────────────────────────────────────────────────────┐
│ Acquaragia                                    4 task     │
│ consumo · totale: 8 lt · disponibile: 0 · da acquistare: 8 │
│                                                           │
│  ▸ Generale > Vasi generali > Verniciatura vasi generali  │
│  ▸ Ingresso > Vialetto > Verniciatura vialetto            │
│  ▸ Aperitivo > Swing > Verniciatura pedana swing          │
│  ▸ Area Bagni > Finiture > Verniciatura rampa disabili    │
└──────────────────────────────────────────────────────────┘

Header: nome materiale dal catalogo, chip tipologia (consumo/strutturale/attrezzo), aggregati (totale quantità, disponibile, da acquistare).

Sotto: lista delle task che lo usano. Ogni riga = un'istanza:
  ▸ [Zona > Lavorazione > Task]   ← click apre il pannello dettaglio task

Click sulla freccia ▸ espande i dettagli dell'istanza per QUELLA task:
  Quantità [2] lt   Disponibile [0]   Ordinata [0]
  Entro il [15/04]  Gg consegna [3]   Data ordine [--]
  Prezzo [5] €/lt   Costo: 10€
  Operazioni: trasporto — Trasportiamo ○

Tutti i campi editabili inline (come ora, ma dentro l'espandibile).

Se un materiale non ha catalogo_id (scollegato), appare come voce singola.

--- VISTA "PER AREA" ---

I materiali raggruppati per zona. Click su una zona espande la lista materiali di quella zona.

┌──────────────────────────────────────────────────────────┐
│ ▾ Ingresso                              23 materiali      │
│                                                           │
│  Vernice per legno · 5 lt · Da acquistare                 │
│    └ Vialetto > Verniciatura vialetto                     │
│  Stripled · 10 pz · Da acquistare                         │
│    └ Vialetto > Montaggio stripled                        │
│  Terra · 50 kg · Da acquistare                            │
│    └ Vialetto > Riempimento vasi                          │
│  ...                                                      │
├──────────────────────────────────────────────────────────┤
│ ▸ Aperitivo                             31 materiali      │
│ ▸ Area Bagni                            15 materiali      │
│ ...                                                       │
└──────────────────────────────────────────────────────────┘

Ogni materiale dentro la zona mostra: nome, quantità, stato. Click espande i dettagli editabili.
Il titolo della task (Vialetto > Verniciatura vialetto) è cliccabile → apre pannello dettaglio task.
"""


# ████████████████████████████████████████████████████████████
# PROMPT 2 — Gantt rifatto
# ████████████████████████████████████████████████████████████

"""
Leggi CLAUDE.md per il contesto.

OBIETTIVO: Riscrivere il Gantt da zero. Il Gantt attuale ha problemi strutturali (colonna non sticky, barre piccole, nessuna interazione). Riscrivi il componente gantt-client.tsx completamente.

REQUISITI STRUTTURALI:

1. LAYOUT A DUE PANNELLI CON SCROLL INDIPENDENTE
   Il Gantt è un container che occupa tutta l'altezza disponibile (100vh - header).
   Due sezioni affiancate:
   - SINISTRA (280px, fixed): lista zone/lavorazioni/task. Scroll verticale proprio.
   - DESTRA (resto larghezza): griglia temporale con barre. Scroll verticale sincronizzato con sinistra. Scroll orizzontale indipendente.
   
   Lo scroll orizzontale NON deve muovere la colonna sinistra. MAI.
   Lo scroll verticale deve essere sincronizzato tra le due sezioni (scrollano insieme).
   
   Implementazione: due div affiancati, ognuno con overflow-y: auto. Sincronizza lo scroll verticale con un onScroll handler che setta scrollTop dell'altro. La sezione destra ha anche overflow-x: auto.

2. ZONE COMPRIMIBILI
   - Click sull'header zona → toggle espandi/comprimi
   - DEFAULT: zone COMPRESSE
   - Zona compressa: mostra SOLO la riga header con nome zona e una barra aggregata (inizio = min data_inizio task, fine = max data_fine task, colore = colore zona)
   - Zona espansa: mostra le lavorazioni sotto
   - NON mostrare "Tutte le lavorazioni" come testo — quando la zona è compressa si vede solo il nome

3. LAVORAZIONI COMPRIMIBILI
   - Click sulla lavorazione → toggle espandi/comprimi
   - DEFAULT: compresse
   - Lavorazione compressa: riga con nome + barra aggregata delle sue task
   - Lavorazione espansa: mostra le singole task sotto

4. BARRE TASK
   - Altezza: 28px
   - Border-radius: 6px
   - Font sulla barra: Outfit 500, 12px, colore bianco
   - Testo sulla barra: TIPOLOGIA della task (es. "carpenteria", "elettrico") — non il nome
   - Se la barra è troppo stretta per il testo: mostra solo il colore, tooltip on hover con tipologia + nome + fornitore
   - Colore: dipende dal toggle "Colora per" (Zona/Tipologia/Fornitore)

5. LEGENDA
   Fissa sopra il Gantt, sotto i toggle. Mostra pallini + nome per ogni colore usato.

6. TOGGLE E FILTRI
   - Cantiere (apr-mag) / Progetto (mar-mag)
   - Colora per: Zona / Tipologia / Fornitore
   - Filtro zona (dropdown)
   - Filtro fornitore (dropdown)
   - Filtro tipologia (dropdown)

7. LINEE TEMPORALI
   - Linea "Oggi": 2px, rossa, con label "Oggi" sopra
   - Linea "1 Maggio": 2px, verde, con label "Apertura" sopra
   - Weekend: sfondo leggermente grigio (#F9F9F9)

8. INTERAZIONE DRAG
   Le barre task sono trascinabili:
   - Drag orizzontale della barra intera → cambia data_inizio e data_fine (mantiene durata)
   - Drag del bordo sinistro → cambia data_inizio (cambia durata)
   - Drag del bordo destro → cambia data_fine (cambia durata)
   - Dopo il drag: salva le nuove date nel DB (server action updateTask)
   - Cursor: grab sulla barra, col-resize sui bordi

9. CLICK SU BARRA
   - Click → apre popup/tooltip con: titolo, tipologia, fornitore, stato, date, dipendenze
   - Link "Apri dettaglio" → naviga a /lavorazioni?task=ID

10. FONT COLONNA SINISTRA
    - Nomi zona: Outfit 600, 14px, colore #1d1d1f
    - Nomi lavorazione: Outfit 500, 13px, colore #1d1d1f
    - Nomi task: Outfit 400, 12px, colore #86868b
"""


# ████████████████████████████████████████████████████████████
# PROMPT 3 — Vista "Chi fa cosa quando" + fix fornitori
# ████████████████████████████████████████████████████████████

"""
Leggi CLAUDE.md per il contesto.

PARTE A — NUOVA PAGINA: PLANNING (/planning)

Una vista complementare al Gantt. Nel Gantt vedi le task organizzate per zona/lavorazione. Nel Planning vedi le task organizzate per CHI LE FA e QUANDO.

Aggiungi voce "Planning" nella sidebar con icona CalendarDays, tra Gantt e Fornitori.

LAYOUT:
- In alto: selettore settimana (frecce avanti/indietro + date picker) 
- Header colonne: Lun [data] | Mar [data] | Mer [data] | Gio [data] | Ven [data] | Sab [data]
- Righe: un fornitore per riga (solo fornitori che hanno task con date in quella settimana)
- Ogni cella mostra le task assegnate a quel fornitore per quel giorno:
  - Chip compatto: [tipologia] nome task troncato
  - Colore chip = colore zona
  - Click → apre dettaglio task

Esempio:
┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│ Lun 14/4 │ Mar 15/4 │ Mer 16/4 │ Gio 17/4 │ Ven 18/4 │ Sab 19/4│
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│Sq.strutt.│          │          │          │          │          │
│[carp]    │[carp]    │          │[carp]    │[carp]    │          │
│Vialetto  │Vialetto  │          │Anfiteatri│Anfiteatri│          │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│Leonardo M│          │          │          │          │          │
│[elett]   │[elett]   │[elett]   │          │          │          │
│Stripled  │Stripled  │Distribuz.│          │          │          │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│Facchini  │          │          │          │          │          │
│[trasp]   │          │          │          │          │          │
│Monterosi │          │          │          │          │          │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘

In basso: totale ore per giorno, totale ore per fornitore nella settimana.

Se un fornitore ha più task nello stesso giorno, le chip si impilano nella cella.

Filtri: per zona, per tipologia.

PARTE B — FIX FORNITORI

1. Filtro per tipologia fornitore:
   Nella pagina Fornitori, il dropdown filtro esistente filtra per stato.
   Aggiungi un SECONDO dropdown: "Tipologia" con le opzioni dalla tabella tipologie_fornitore (se creata nel prompt 1) o dalla lista unica dei valori di fornitori.tipo.

2. Nella card fornitore, il campo "tipo" (Fornitore, Socio, Consulente, Manodopera) deve essere editabile con dropdown — come lo stato. Non serve aprire il pannello dettaglio per cambiarlo.
"""
