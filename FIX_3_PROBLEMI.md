# ============================================================
# NIMBUS 2026 — FIX 3 PROBLEMI SPECIFICI
# ============================================================
# Principio: ogni pagina è una vista diversa degli stessi dati.
# Da ogni vista si può editare tutto. Mai tornare indietro.
# ============================================================

"""
Leggi CLAUDE.md per il contesto.

PROBLEMA GENERALE: Le pagine Materiali, Trasporti e Fornitori mostrano i dati in modo cosmetico — poche info, nulla editabile. Devono diventare centri di controllo completi.

=================================================================
FIX 1 — PAGINA MATERIALI: operazioni visibili E editabili
=================================================================

Attualmente: sotto ogni card materiale la sezione "Operazioni" mostra solo "trasporto" in piccolo con "Non org." — inutile.

DEVE DIVENTARE: per ogni operazione collegata al materiale, una riga completa editabile. Stessa logica del pannello dettaglio task ma inline nella card materiale.

Per ogni operazione sotto il materiale mostrare su UNA RIGA:
[Titolo editabile] [Dropdown tipologia] [Dropdown fornitore] [Chip stato fornitore colorato] [Dropdown stato operazione] [Toggle Organizzato] [Dropdown luogo partenza] [X elimina]

Sotto la riga, espandibile con click:
[Durata ore] [Numero persone] [Costo/ora] [Note]

Bottone "+ Operazione" in fondo.

OGNI campo si salva su blur/change — nessun bottone salva.
Se cambio il fornitore da qui, si aggiorna anche nel pannello dettaglio task.
Se cambio "Organizzato" da qui, si aggiorna ovunque.

I dati sono gli stessi — è solo una vista diversa.

=================================================================
FIX 2 — PAGINA TRASPORTI: centro di controllo completo
=================================================================

Attualmente: mostra solo il nome dell'operazione, un chip "trasporto" e "Da organizzare". Nulla editabile, nulla utile.

La pagina Trasporti deve essere come la pagina Materiali ma filtrata sulle operazioni di tipo trasporto. Ogni card operazione di trasporto deve mostrare:

HEADER CARD:
[Titolo operazione editabile] [Chip tipologia] [Chip stato operazione colorato]

INFO MATERIALE (read-only, per contesto):
"Materiale: [nome materiale] ([quantità] [unità]) — Task: [zona] > [lavorazione] > [task]"

CAMPI EDITABILI (tutti su una o due righe):
[Dropdown fornitore] [Chip stato fornitore — CLICCABILE per ciclare] 
[Dropdown luogo partenza] [Toggle Organizzato con label "Organizzato" / "Da organizzare"]
[Date picker: data prevista] [Input: durata ore] [Input: numero persone]
[Input: costo/ora] [Costo totale calcolato]
[Note editabili]

RAGGRUPPAMENTO:
- Default: raggruppati per luogo di partenza (Monterosi, Guidonia, ecc)
- Ogni gruppo ha header: "Monterosi (4 trasporti — 2 organizzati, 2 da organizzare)"
- Operazioni senza luogo: gruppo "Da definire"

FILTRI in alto:
- Per luogo di partenza (dropdown)
- Per stato: Tutti / Da organizzare / Organizzati
- Per fornitore (dropdown)
- Per zona (dropdown)

CONTATORI in alto:
- Totale trasporti
- Da organizzare (rosso/ambra)
- Organizzati (verde)
- Luoghi di partenza (numero)
- Costo totale trasporti

Tutto si salva su blur/change. È bidirezionale: se cambio qualcosa qui, si riflette ovunque nell'app.

=================================================================
FIX 3 — PAGINA FORNITORI: lista task espandibile con filtro
=================================================================

Attualmente: la lista task si espande ma non è chiaro cosa si vede.

Quando clicco su "X task" di un fornitore, si espande sotto la card una sezione con:

FILTRO in alto nella sezione espansa:
[Tutte] [Bloccate] [In corso] [Completate]
(Bottoni/chip cliccabili per filtrare)

LISTA TASK — per ogni task:
[Chip stato_calcolato CLICCABILE — cicla lo stato]
[Titolo task]
[Zona > Lavorazione — in grigio piccolo]
[Se bloccata: motivo in rosso — "Attesa: Squadra finiture (da_trovare → pronto)"]

Click sul titolo della task → naviga a /lavorazioni con quella lavorazione e task selezionate.

La lista include TUTTE le task dove il fornitore appare:
- Come fornitore primario della task (task.fornitore_id)
- Come fornitore di supporto (task.fornitore_supporto_id se esiste)
- Come fornitore di un'operazione su un materiale di una task

Per il terzo caso il percorso è: operazione.fornitore_id → operazione.materiale_id → materiale.task_id → task
Mostra queste task con nota "(via operazione: [nome operazione] su [nome materiale])"

=================================================================
NOTA GENERALE
=================================================================

Il pannello dettaglio task (task-detail-sheet) resta il posto dove crei e strutturi i dati. Le altre pagine (Materiali, Trasporti, Fornitori) sono VISTE OPERATIVE dove monitori e modifichi velocemente senza navigare.

Ogni campo editabile in queste pagine chiama la stessa server action che usa il pannello dettaglio. Non duplicare la logica — riusa le stesse funzioni.

TESTA OGNI PAGINA dopo le modifiche. Crea un'operazione trasporto su un materiale, poi:
1. Verifica che appaia nella pagina Materiali con tutti i campi editabili
2. Verifica che appaia nella pagina Trasporti con tutti i campi editabili
3. Modifica il fornitore dalla pagina Trasporti → ricarica pagina Materiali → deve essere aggiornato
4. Nella pagina Fornitori espandi il fornitore → la task deve apparire → filtra per "Bloccate" → deve filtrare
"""
