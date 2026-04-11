# Faro architetturale — Sistema Materiali Nimbus

> Documento vivo. Cresce sezione per sezione. Va riletto ogni volta che si decide se una feature è coerente con la direzione, o quando si scrive un prompt per Claude Code che tocca i materiali.

---

## Sezione 1 — Principio guida

### Il problema in una frase

Gestire le centinaia di materiali di Nimbus richiede di muoversi continuamente tra il quadro generale e il singolo dettaglio, senza perdere il filo né essere costretti a cambiare schermata per cambiare livello di pensiero.

### Il principio in una frase

**Una sola superficie, quattro dimensioni di rotazione, cinque categorie di comportamento, tutti i livelli di zoom — sempre tutti accessibili dalla stessa pagina.**

### Le quattro dimensioni del cubo

1. **Materiale** — il cosa (dal singolo tipo all'intero catalogo)
2. **Task / Lavorazione / Zona** — il dove e il perché (dal singolo task al cantiere intero)
3. **Fornitore** — il chi vende (dal singolo ordine alla spesa totale)
4. **Tempo** — il quando (dal singolo giorno all'intera stagione, con scadenze derivate dalle date task)

Le quattro dimensioni si incrociano liberamente. La superficie permette di "ruotare" il cubo scegliendo come raggruppare e cosa filtrare, senza mai cambiare pagina.

### Le cinque categorie comportamentali (filtri permanenti)

1. **Strutturale** — compri una volta, dura tutta la stagione (tavole, telai, profili)
2. **Consumo** — si esaurisce mentre lavori (viti, vernice, silicone, fascette)
3. **Attrezzo** — porta-e-ritrova, non si compra (trapani, scale, prolunghe)
4. **Recupero** — verifica e ripara, già esiste (nuvole, container, arredi vecchi)
5. **Servizio** — non è un materiale ma un intervento esterno (gru, scarico, allaccio)

Vivono in parallelo alla classificazione tecnica (carpenteria, verniciatura, elettrico). Un materiale ha entrambe le etichette.

### Tre cose da cui questo principio difende

1. **Dalla pagina-isola**: nessuna nuova pagina materiali può essere creata se gli stessi dati esistono già altrove.
2. **Dal cambio di mentalità**: non devi pensare "ora apro X" — pensi "ora voglio vedere X raggruppato per Y", e lo fai dove sei.
3. **Dal perdersi nei dettagli**: a qualunque livello di zoom, il numero di "cose da decidere adesso" deve entrare in uno schermo senza scroll.

### Emendamento — il principio della bussola

**In qualsiasi momento dell'uso, l'utente vede il livello di zoom corrente insieme al riferimento al livello immediatamente superiore.** Mai una schermata di soli dettagli senza contesto. Mai una schermata di soli aggregati senza accesso al dettaglio. La posizione nel cubo è sempre leggibile, come una bussola persistente. Cliccare un aggregato non porta a una pagina nuova: espande inline o apre un drawer affiancato. Nessun take-over a schermo intero.

---

## Sezione 2 — Le quattro entità e i loro livelli di zoom

### Entità 1 — Materiale (il cosa)

Il tipo astratto. Una riga per tipo, indipendente dagli usi.

- **Micro**: scheda del singolo materiale (nome, fornitore, prezzo, unità, categoria, note, lista task che lo usano).
- **Macro**: totale catalogo (N materiali, € valore, € da comprare, semafori).
- **Intermedi**: per categoria comportamentale, per categoria tecnica, per fornitore.
- **Navigazione**: selettore "raggruppa per" sempre visibile, filtri laterali sempre visibili. Cliccare un aggregato espande inline. Cliccare una voce singola apre drawer affiancato.
- **Bussola nel micro**: breadcrumb cliccabile (Materiali → Carpenteria → Tecnomat → Vite 5x50) + dato di contesto ("3% della spesa Tecnomat").
- **Si tiene per mano con**: entità 2 (la scheda mostra le task d'uso, cliccabili → secondo drawer affiancato).

### Entità 2 — Uso del materiale (il legame materiale↔task)

Il connettore che fa girare il cubo. "Questo materiale serve a questa task in questa quantità in questa data".

- **Micro**: il singolo legame (45 viti per la task X, il 14 aprile).
- **Macro**: fabbisogno totale calcolato per ogni materiale (2.847 viti totali, di cui X in magazzino, Y da comprare).
- **Intermedi**: per task/lavorazione/zona ("cosa serve perché questa cosa accada") e per materiale ("a cosa serve questa cosa"). Sono i due lati della stessa entità.
- **Navigazione**: non è una pagina propria. Vive dentro la scheda materiale e dentro la scheda task. Stesso dato, due ingressi.
- **Bussola nel micro**: contesto in grigio sotto l'uso ("1,5% del totale stagionale") + semaforo di scadenza derivato dalla data della task.
- **Si tiene per mano con**: tutte. È l'entità connettiva. Ogni transizione cross-dimensione del cubo passa da qui.
- **Nota tecnica**: oggi è la tabella `materiali` (396 righe). Il nome è sbagliato, va rinominata in `materiali_task`.

### Entità 3 — Disponibilità (lo stato vivo)

Quanto ho davvero, qui e ora. Tre numeri per ogni materiale: magazzino, recuperato, ordinato. 1:1 col catalogo.

- **Micro**: i tre numeri di un singolo materiale + note + data ultimo aggiornamento.
- **Macro**: semaforo generale del cantiere (X verdi, Y gialli, Z rossi) + soldi necessari per chiudere il rosso.
- **Intermedi**: per categoria comportamentale, per fornitore, per finestra temporale (cosa manca per la prossima settimana, cosa manca per il 1 maggio).
- **Navigazione**: non è una pagina, è uno strato di colore sopra la lista materiali. Pallino verde/giallo/rosso accanto a ogni voce. Click sul pallino → editor inline dei tre numeri, auto-save.
- **Bussola nel micro**: accanto ai tre numeri editabili, sempre il fabbisogno calcolato e il delta in grigio sulla stessa riga.
- **Si tiene per mano con**: aggiorna in tempo reale tutti i totali sopra (materiale, fornitore, semaforo macro). Niente "ricalcola", niente conferme. È quello che fa sentire l'app viva.
- **Nota tecnica**: tabella `materiali_disponibilita` esiste vuota. Va popolata con 192 righe a zero.

### Entità 4 — Driver e Coefficienti (il motore di calcolo)

I parametri che fanno esistere i numeri. ~40 valori in tutto. Si impostano una volta, raramente cambiano.

- **Micro**: singolo coefficiente con valore, default, unità, lista materiali che lo usano nella formula.
- **Macro**: pannello completo (driver a sinistra, coefficienti a destra), una sola schermata, niente paginazione.
- **Intermedi**: per gruppo logico (pedane, lineari, vasi / carpenteria, verniciatura, elettrico). Servono solo a non vedere 40 input in colonna.
- **Navigazione**: questa entità NON vive nella superficie unica come voce primaria. Vive come drawer richiamabile da qualsiasi punto, con icona accanto a ogni numero calcolato. "Perché 245 viti?" → click → vedi il coefficiente, modifichi, vedi il fabbisogno aggiornarsi, chiudi.
- **Bussola nel micro**: il drawer mostra sempre, sopra il coefficiente, l'effetto del cambiamento sul totale ("resa da 8 a 7 → fabbisogno da 12L a 14L → +38€"). Anteprima prima di confermare.
- **Si tiene per mano con**: alimenta l'entità 2 (fabbisogno), che alimenta l'entità 3 (semafori), che alimenta l'entità 1 (totali). Catena reattiva.
- **Nota tecnica**: tabelle `calcolatore_driver` (21) e `calcolatore_coefficienti` (19) esistono. Pagina `/calcolatore` va smantellata, componenti riusati come drawer, formule estratte in `lib/calcolo-materiali.ts`.

### Riepilogo in una frase

Quattro entità: il **cosa**, il **legame**, lo **stato vivo**, il **motore**. Tutte hanno almeno tre livelli di zoom. Nessuna vive in una pagina sua. Tutte accessibili dalla stessa superficie. Si tengono per mano tramite drawer affiancabili, mai in sostituzione l'uno dell'altro.

### Appendice tecnica — interventi sullo schema DB

In ordine di rischio crescente:

1. **Popolare `materiali_disponibilita`** con 192 righe a zero. Migration banale.
2. **Aggiungere `categoria_comportamentale` e `tipo_voce` a `catalogo_materiali`**. Migrare `materiali_una_tantum` dentro con `tipo_voce='una_tantum'`. Droppare `materiali_una_tantum`. Rischio medio, va verificato che `/calcolatore` esistente non si rompa.
3. **Rinominare `materiali` in `materiali_task`**. Tocca tutto il codice che la riferisce. Refactor dedicato, non di sfuggita. Rinviabile.

---

## Sezione 6 — Macro↔micro nell'interfaccia

### Le tre regole d'oro

1. **Niente take-over a schermo intero.** Aprire un dettaglio non sostituisce mai quello che c'era prima — lo affianca o lo espande sotto.
2. **La bussola è sempre visibile.** In alto, sempre, una riga che dice dove sei nel cubo.
3. **Lo stato della superficie è sempre uno stato URL.** Se ricarichi, ritrovi tutto: raggruppamento, filtri, drawer aperti, scroll.

### I quattro contenitori della superficie

- **A — Barra di bussola** (alto, fissa): breadcrumb cliccabile, contatori del livello corrente ("192 voci · 12 in rosso · 1.847€ da comprare"), pulsante reset zoom.
- **B — Pannello di controllo** (sinistra, fisso): selettore "raggruppa per" (nessuno / fornitore / categoria comportamentale / categoria tecnica / zona / data), filtri permanenti (5 toggle categorie + multi-select fornitori + finestra temporale), ricerca testuale. Niente "applica", agisce immediatamente.
- **C — Lista principale** (centro, scrollabile): voci raggruppate o piatte. Header gruppo cliccabili → espansione inline. Voci singole cliccabili → drawer in D.
- **D — Stack di drawer** (destra): drawer affiancabili, mai sovrapposti.

### Lo stack di drawer — la regola dei tre

Massimo 3 drawer aperti contemporaneamente. Quarto drawer → il più vecchio si chiude da solo. Lo stack ha una freccia "indietro" che riapre l'ultimo chiuso, esattamente com'era. Vincolo cognitivo, non tecnico: oltre tre la mente collassa.

### Tabella delle azioni

| Click su... | Azione |
|---|---|
| Header di gruppo nella lista | Espande/collassa inline |
| Voce singola materiale | Apre drawer materiale (D1) |
| Task dentro drawer materiale | Drawer task affiancato (D2) |
| Materiale dentro drawer task | Drawer materiale affiancato |
| Icona "calcoli" accanto a numero | Drawer driver+coefficienti |
| Pallino disponibilità | Editor inline 3 numeri sulla riga (no drawer) |
| Parola della bussola | Risale al livello, chiude i drawer sotto |
| Reset zoom | Chiude tutto, vista macro pulita |
| Esc | Chiude drawer più recente |

### Le quattro decisioni fissate

1. Drawer affiancati a destra (non sovrapposti) → da qui la regola dei tre.
2. Editor disponibilità inline (non drawer) → azione più frequente, attrito zero.
3. Bussola chiude i drawer sotto al livello a cui torni → mitigato da freccia "riapri ultimo chiuso".
4. Tutto lo stato in URL (non localStorage) → condivisibile, back/forward del browser, multi-tab.

### Filtro temporale e finestre operative

La finestra temporale nel pannello B è un **filtro**, non un raggruppamento. Imposti "oggi" / "questa settimana" / range custom → la lista mostra solo materiali che servono a task con `data_inizio` in quella finestra. Si combina con tutti gli altri assi del cubo. Esempio operativo: "finestra=oggi + raggruppa per fornitore + filtro categoria=consumo" = lista della spesa di oggi organizzata per chi visitare. È la query del mattino.

In più, "data" è anche un'opzione del selettore raggruppa-per (vista calendario materiali, giorno per giorno).

### Domande aperte per Claude Code (da chiedere prima del refactor)

1. Il componente shadcn `Sheet` è già usato? Si presta come "drawer affiancabile" o è configurato solo come modal?
2. Esiste un pattern URL-state nel progetto (`useSearchParams` Next.js sistematico) o lo stato è in `useState` non sincronizzato?

---

## Sezione 3 — Le tre configurazioni operative

Non "tre viste come pagine separate" (modello vecchio), ma **tre preset di stato** della superficie unica.

### Configurazione 1 — Vista Acquisti
- **Stato**: raggruppa per fornitore + filtro consumo + finestra "prossimi 7 giorni"
- **Domanda**: "cosa compro questa settimana e a chi?"
- **Uso**: lunedì mattina prima delle telefonate, sabato sera per piano settimana
- **Azione tipica**: copia lista del gruppo fornitore → WhatsApp

### Configurazione 2 — Vista Cantiere oggi
- **Stato**: raggruppa per task + filtro finestra "oggi"
- **Domanda**: "cosa serve oggi a chi sta lavorando?"
- **Uso**: mattina presto, prima del cantiere
- **Azione tipica**: identifica task in rosso (non possono partire), telefona o sposta

### Configurazione 3 — Vista Catalogo
- **Stato**: nessun raggruppamento, nessun filtro, ricerca attiva
- **Domanda**: "questa cosa esiste? quanto serve? a cosa?"
- **Uso**: dubbi puntuali, aggiunta nuovi materiali, verifica duplicati
- **Azione tipica**: ricerca testuale, scheda dettaglio

### Commutazione

Tre pulsanti preset sopra il pannello di controllo. Click = stato impostato. Lo stato resta modificabile a mano dopo il click. Quarto pulsante "Personalizza" salva uno stato corrente come preset utente (slot futuro, non priorità immediata).

---

## Sezione 4 — Il motore di calcolo come servizio invisibile

### Principio
Il calcolatore non è pagina, vista o feature separata. È **una funzione TypeScript pura** in `lib/calcolo-materiali.ts` che alimenta tutte le viste e tutti i drawer.

### Dove vive
Lato client, TypeScript. Tre motivi: feedback immediato, debuggabilità, reversibilità (no migration per cambiare formule).

### Architettura
```
calcolaMateriali({ driver, coefficienti, catalogo, legami, disponibilita }) 
  → catalogo arricchito con: fabbisogno_calcolato, da_comprare, costo, stato_semaforo
```
Funzione **pura**, no side effect, no Supabase. Le chiamate Supabase vivono fuori (useEffect / server actions) e passano i dati.

### Cascata reattiva
1. Modifica coefficiente nel drawer → stato locale cambia
2. Anteprima `calcolaMateriali` con nuovo valore → delta visibile sopra il campo
3. onBlur → Supabase update + stato globale aggiornato
4. Tutti i consumatori si aggiornano

### Formule
Tutte in `lib/calcolo-materiali.ts` come funzioni piccole nominate (`calcolaTavolePedana`, `calcolaVernice`, `calcolaCavoCitofonico`, etc). Una `aggregaPerMateriale` mappa i risultati sulle voci catalogo. Il CSV `coefficienti_materiali_nimbus.csv` è la fonte iniziale per popolare `calcolatore_coefficienti`, poi diventa storia.

### Cosa NON fa
- Non decide cosa comprare (raccomandazione, non ordine)
- Non considera tempi consegna fornitori
- Non gestisce sconti quantità
- Non sa di sostituti/varianti (futura colonna `sostituto_di`, non formula)

---

## Sezione 5 — La regola anti-ansia

### Tre principi
1. **Niente campi obbligatori bloccanti.** Default sensato, nota "stima", procede. "Sconosciuto" è valore valido.
2. **Default ovunque.** Ogni driver/coefficiente/quantità ha un default precaricato.
3. **Feedback errore unificato.** Una sola libreria toast: **sonner**. Due livelli (errore rosso, avviso giallo), azione "annulla/riprova" dove sensato.

### Passo 0 obbligatorio prima di nuovo codice materiali
- Installare `sonner`
- Aggiungere `<Toaster />` nel layout root
- Sostituire banner inline e `alert()` del passo 1 di riparazione con `toast.error()` / `toast.success()`
- Documentare in `CLAUDE.md` che sonner è il pattern unico

Senza questo intervento, ogni nuova feature reintroduce frammentazione.

### Anti-pattern da rifiutare
- **Doppi campi simili** (es. `durata_ore` vs `ore_lavoro`). Se non riesci a darli nomi inequivocabili, sono lo stesso campo.
- **Modal bloccanti** durante il pensiero. Conferme distruttive solo per cancellazioni vere.
- **Numeri senza unità visibile** (€, mq, ml, pezzi sempre accanto)
- **Stati lowercase non capitalizzati**. Sempre `STATO_LABELS[stato]`.

---

## Sezioni successive

Tutte le sezioni del faro sono scritte. Prossimi passi operativi (non sezioni del faro):
- Mockup HTML statico via Claude Code (lettura `materiali-client.tsx` esistente)
- Pulizia debito audit (37 violazioni dipendenze, drop 12 backup tables)
- Passo 0 sezione 5 (installazione sonner)
- Implementazione effettiva del sistema materiali secondo il faro
