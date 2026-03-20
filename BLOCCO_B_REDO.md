# ============================================================
# NIMBUS 2026 — BLOCCO B RIFATTO
# ============================================================
# CONTESTO PER CLAUDE CODE:
#
# Luca sta compilando 200+ task a mano per il cantiere che apre
# il 1 maggio. Ogni click in più, ogni informazione nascosta,
# ogni navigazione inutile è tempo perso × 200.
#
# Il Blocco B precedente è stato implementato in modo superficiale.
# I componenti sembrano esserci ma non funzionano davvero.
# Questo prompt richiede di VERIFICARE e FIXARE ogni punto.
#
# REGOLA: per ogni punto, PRIMA verifica che funzioni davvero
# (leggi il codice, controlla i fetch, controlla che i dati
# arrivino al componente). POI fixa se non funziona.
# Se un componente è troppo patchato, RISCRIVILO da zero.
# ============================================================

"""
Leggi CLAUDE.md per il contesto completo.

OBIETTIVO: Verificare e fixare TUTTI i punti del Blocco B. Non aggiungere codice sopra codice rotto — se un componente non funziona, riscrivilo.

Per OGNI punto sotto: prima verifica leggendo il codice, poi fixa, poi descrivi cosa hai trovato e cosa hai cambiato.

=================================================================
PUNTO 4 — OPERAZIONI: INSERIMENTO CHE FUNZIONA DAVVERO
=================================================================

Verifica nel file task-detail-sheet (o dove si gestiscono le operazioni):

A) Quando clicco "+ Operazione" su un materiale:
   - Appare una riga con dropdown tipologia
   - Il dropdown tipologia mostra TUTTE le tipologie dalla tabella DB
   - Quando seleziono "Trasporto", il campo titolo si auto-compila con "Trasporto"
   - Il campo tipologia viene SALVATO nel record operazione nel DB (non solo il titolo)
   
B) Verifica la server action / fetch che crea l'operazione:
   - Deve fare INSERT INTO operazioni (materiale_id, titolo, tipologia, ...) 
   - Il campo tipologia NON deve essere null
   - QUERY DI TEST: dopo aver creato un'operazione, SELECT * FROM operazioni WHERE id = [nuovo id] — il campo tipologia deve avere un valore

C) Layout riga operazione (in ordine):
   [Titolo auto-generato] [Dropdown fornitore --] [Dropdown stato: Da fare] [Checkbox Organizzato] [X elimina]
   Sotto (espandibile con click): Luogo partenza, Durata ore, Note

=================================================================
PUNTO 5 — OPERAZIONI VISIBILI NELLA CARD TASK (lista lavorazioni)
=================================================================

Questo è CRITICO. Luca guarda la lista task per capire lo stato di tutto.
Deve vedere A COLPO D'OCCHIO per ogni task: che materiali servono e che operazioni ci sono.

Verifica nel componente card task (nella pagina lavorazioni):

A) Il fetch che carica le task include i materiali?
   Cerca nel file lavorazioni/page.tsx o lavorazioni-client.tsx:
   - Il select deve includere: materiali(*, operazioni(*))
   - Se il join non c'è, aggiungilo
   
B) Il componente card task renderizza i materiali e le operazioni?
   Per ogni task che ha materiali, sotto il titolo deve apparire:

   Esempio visivo per "Posizionamento round aperitivo":
   ┌─────────────────────────────────────────────────────┐
   │ Posizionamento round aperitivo        Squadra finit. │
   │ [montaggio] [Attesa fornitore]                       │
   │                                                       │
   │ ○ Struttura round  0/1 pz  [Da acquistare]           │
   │   └ trasporto — Trasportiamo  ●                       │
   │ ○ Nuvola piccola  0/1 pz  [Da acquistare]            │
   │   └ trasporto — Facchini  ○                           │
   │ ○ chiave inglese  0/2 pz  [Da acquistare]            │
   │ ○ bulloneria  —  [Da acquistare]                      │
   └─────────────────────────────────────────────────────┘

   Dove:
   - ○ = icona Package (Lucide) per materiale
   - └ = indentazione per operazione
   - ● verde = organizzato, ○ grigio = non organizzato
   - "trasporto" = tipologia in minuscolo
   - "Trasportiamo" = nome fornitore

C) Se il materiale NON ha operazioni, mostra solo la riga materiale senza operazioni sotto.
D) Se la task NON ha materiali, non mostrare nulla (come ora).

=================================================================
PUNTO 7 — PAGINA MATERIALI: OPERAZIONI INLINE
=================================================================

Nella pagina /materiali, ogni card materiale deve mostrare le sue operazioni.

A) Verifica il fetch nella pagina materiali:
   - Il select dei materiali include le operazioni? 
   - Se no, aggiungi il join: materiali(*, operazioni(*, fornitori(*)))
   - Oppure fetch separato delle operazioni e raggruppale per materiale_id

B) Sotto ogni card materiale, dopo le righe di campi editabili, sezione Operazioni:
   - Per ogni operazione: [chip tipologia colorato] [nome fornitore] [chip stato fornitore] [toggle Organizzato]
   - Bottone "+ Operazione" per aggiungere
   - Stessi dati che si vedono nel pannello dettaglio task

C) TESTA: vai su un materiale che ha operazioni — devono apparire.

=================================================================
PUNTO 9 — GANTT: CLICK SU BARRA APRE DETTAGLIO
=================================================================

A) Click su una barra task nel Gantt → deve aprire qualcosa con i dettagli.
   SOLUZIONE PREFERITA: un pannello laterale (tipo il task-detail-sheet) che si apre
   senza navigare via dalla pagina Gantt. Se troppo complesso, un tooltip/popover con:
   - Titolo task, zona, lavorazione
   - Fornitore + stato
   - Dipendenze (lista nomi task)
   - Materiali (lista nomi + stato)
   - Link "Apri dettaglio" che porta a /lavorazioni?task=ID

B) Hover su barra: tooltip con titolo + fornitore + stato

=================================================================
PUNTO 10 — FORNITORI: LISTA TASK ESPANDIBILE
=================================================================

A) Nella pagina /fornitori, ogni card mostra "X task assegnate".
   Click su quel numero → SI ESPANDE una lista sotto la card.
   
B) La lista mostra tutte le task dove quel fornitore è:
   - Fornitore primario della task (task.fornitore_id)
   - Fornitore di un'operazione su un materiale di una task
   Per ogni task: titolo, zona > lavorazione, chip stato_calcolato
   
C) Click su una task nella lista → naviga a /lavorazioni con quella lavorazione selezionata

D) Verifica: il fetch delle task per fornitore funziona? Deve cercare sia in task.fornitore_id che in operazioni.fornitore_id.

=================================================================
PUNTO 11 — PAGINA TRASPORTI STANDALONE
=================================================================

A) Esiste /trasporti come pagina separata nella sidebar? Se no, creala.
B) La pagina mostra TUTTE le operazioni con tipologia che contiene "trasporto" (include "acquisto_e_trasporto")
C) Raggruppate per luogo di partenza (dal record in tabella luoghi)
D) Per ogni operazione: materiale nome, task nome (zona > lavorazione), fornitore + stato, organizzato toggle, data
E) Contatori in alto: totale trasporti, da organizzare, organizzati, luoghi di partenza
F) TESTA: crea un'operazione con tipologia "trasporto" e luogo "Monterosi" → deve apparire sotto "Monterosi" nella pagina /trasporti

=================================================================
PUNTO 12 — CHIP STATO CLICCABILI OVUNQUE
=================================================================

Ovunque nell'app appare un chip con lo stato di una task o di un fornitore, quel chip deve essere CLICCABILE per cambiare stato.

A) Card task (pagina lavorazioni): click su chip stato → cicla da_fare → in_corso → completata → da_fare
   Server action: UPDATE task SET stato = $1 WHERE id = $2
   
B) Card fornitore (pagina fornitori): click su chip stato → cicla attraverso i 6 stati nell'ordine
   Server action: UPDATE fornitori SET stato = $1 WHERE id = $2

C) Dashboard — sezione task urgenti: chip stato cliccabile (stessa logica di A)
D) Dashboard — sezione fornitori: chip stato cliccabile (stessa logica di B)

VERIFICA: ogni chip deve avere cursor:pointer e un onClick handler. Se non ce l'ha, aggiungilo.

=================================================================
PUNTO 14 — LUOGHI DI PARTENZA DROPDOWN
=================================================================

A) La tabella luoghi esiste nel DB? Se no, creala con i seed data (Monterosi, Guidonia, Casa Ale, In loco, Fornitore diretto)
B) Il campo operazioni.luogo_partenza è collegato alla tabella luoghi (FK uuid)?
   Se è ancora text, migra: per ogni valore text unico, crea record in luoghi, poi ALTER COLUMN a uuid FK
C) Il dropdown nelle operazioni mostra i luoghi dalla tabella?
D) Nella pagina Impostazioni c'è la sezione "Luoghi" per gestirli?
E) La pagina Trasporti raggruppa per luogo.nome (non per testo libero)?

=================================================================
VERIFICA FINALE
=================================================================

Dopo aver fixato tutto, fai un check completo:

1. Crea una task "Test Blocco B" nella lavorazione "Vialetto" in zona Ingresso
2. Aggiungi materiale "Vernice test" quantità 5 lt, provenienza acquisto
3. Aggiungi operazione al materiale: tipologia Trasporto, fornitore Trasportiamo, luogo Monterosi
4. Verifica che nella card task (lista lavorazioni) si veda il materiale E l'operazione
5. Vai su /materiali → il materiale deve apparire con l'operazione sotto
6. Vai su /trasporti → l'operazione deve apparire sotto "Monterosi"
7. Vai su /fornitori → Trasportiamo deve mostrare la task nella lista espandibile
8. Nel Gantt, click sulla barra della task → deve mostrare i dettagli
9. Click sul chip stato della task → deve ciclare
10. Elimina la task test

Se anche UNO di questi step fallisce, fixa prima di dichiarare completato.
"""
