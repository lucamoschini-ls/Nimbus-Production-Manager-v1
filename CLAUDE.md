# CLAUDE.md — Nimbus Production Manager

## Progetto
App web per la gestione della produzione di Nimbus 2026, club esperienziale open-air stagionale (maggio-ottobre) nel Giardino del Diamante, Roma. Sostituisce un sistema Excel non funzionale.

## Utente
Luca — production manager, competenza tecnica intermedia. Usa l'app da Mac e iPhone. L'altro utente è il socio Alessandro (tecnico/cantiere).

## Stack
- **Framework**: Next.js 14 App Router + TypeScript
- **Database**: Supabase (PostgreSQL) — progetto già creato, URL e chiavi in `.env.local`
- **UI**: Tailwind CSS + shadcn/ui
- **Font**: Outfit (Google Fonts)
- **Deploy**: Vercel

## Design System
- **Tema**: Light. Sfondo pagina `#f5f5f7`, card bianche `#ffffff`, bordi `#e5e5e7`
- **Font**: Outfit. Titoli 600-700, body 400, small/label 500
- **Colori**: testo `#1d1d1f`, secondario `#86868b`, accento minimo
- **Componenti**: shadcn/ui con override Outfit
- **Icone**: Lucide React, monochrome, 16-20px
- **No emoji** nel UI
- **Stile**: Apple/Things 3. Card con border-radius 12px, padding generoso, whitespace abbondante

## Modello dati

### Concetti chiave
1. **Lavorazione**: pacchetto di lavoro (es. "Vialetto ingresso") che contiene sotto-task
2. **Task**: singola operazione eseguibile, appartiene a una lavorazione
3. **Fornitore come vincolo automatico**: se una task ha un fornitore assegnato, è automaticamente bloccata finché il fornitore non raggiunge lo stato minimo richiesto. Zero dipendenze manuali per i fornitori.
4. **Materiali integrati**: ogni materiale è figlio di una task, non in una tabella separata scollegata
5. **Dipendenze esplicite**: solo tra task (non verso fornitori). Si settano con dropdown, non con ID numerici.

### Tabelle PostgreSQL
Vedi `schema.sql` per lo schema completo. Tabelle principali:
- `zone` — 9 zone fisiche (Ingresso, Aperitivo, Area Bagni, Locali Tecnici, Chiosco, Pedana, Generale, Pre-Cantiere, Permessi)
- `fornitori` — 22 fornitori con ciclo di vita a 6 stati
- `lavorazioni` — pacchetti di lavoro dentro le zone
- `task` — operazioni singole dentro le lavorazioni
- `task_dipendenze` — relazione molti-a-molti
- `materiali` — figli delle task
- `permessi` + `task_permessi` — permessi collegati a task

### Stato calcolato task
Trigger PostgreSQL `calcola_stato_task()` che ricalcola `stato_calcolato` quando cambiano:
- Stato del fornitore → `in_attesa_fornitore`
- Stato delle dipendenze → `in_attesa_dipendenza`
- Stato dei materiali → `in_attesa_materiali`
- Stato dei permessi → `in_attesa_permesso`
- Se tutto OK → usa `stato` manuale (da_fare, in_corso, completata)

### Fornitori — ciclo di vita
`da_trovare` → `contattato` → `confermato` → `sopralluogo_fatto` → `materiali_definiti` → `pronto`

Ogni task ha un campo `stato_fornitore_minimo` (default: `pronto`) che indica quale stato deve raggiungere il fornitore per sbloccare la task.

## Schema materiali — stato post-mattone 1

- `catalogo_materiali` ha colonne `categoria_comportamentale` (text, 5 valori + NULL) e `tipo_voce` (text, standard/una_tantum, default standard)
- `materiali_disponibilita` popolata 1:1 col catalogo, valori a zero
- `materiali_una_tantum` non esiste piu — le voci una_tantum sono in `catalogo_materiali` con `tipo_voce='una_tantum'`
- `materiali` (396 righe, legami task-materiale) NON e ancora stata rinominata in `materiali_task` — rinvio a mattone dedicato
- Backup di sicurezza in `catalogo_materiali_backup_mattone1` e `materiali_una_tantum_backup_mattone1`

## Superficie unica materiali — post mattone 3

- Nuova rotta `/materiali-nuovo` ospita lo scheletro della superficie unica secondo FARO sezione 6
- 4 contenitori: BussolaBar, PannelloControllo, ListaMateriali, DrawerStack
- Stato in URL via hook `use-superficie-state.ts` (raggruppamento, filtri, finestra, drawer aperti)
- Regola dei tre drawer implementata: max 3 affiancati, quarto scaccia il primo
- Dati ancora FINTI: la lista e hard-coded, i drawer sono placeholder
- Pagina /materiali classica conservata per ora
- DA FARE nei mattoni 4-9: dati veri, lista dinamica, drawer reali, calcoli, preset funzionanti

## Browser testing — Playwright MCP

Claude Code ha accesso a un browser headless via `@playwright/mcp` per testare l'app deployata su Vercel.

- URL produzione: `https://nimbus-production-manager-v1.vercel.app`
- Configurato in `.mcp.json` nella root del progetto
- Modalita di default: headless
- Per debug visivo: modificare `--headless` in `--headed` nel `.mcp.json` e riavviare Claude Code

Pattern d'uso: dopo aver completato il lavoro, Claude Code esegue test browser sull'URL Vercel e riporta l'esito nelle note. Niente mattone si chiude se i test browser falliscono senza spiegazione.

## Convenzione UI — InfoTooltip

Componente: `src/components/ui/info-tooltip.tsx`

Due varianti:
- `variant="info"` (icona ? grigia): per spiegazioni didattiche neutre
- `variant="warning"` (icona triangolo arancione): per bug noti, valori fissati nel codice, debito tecnico visibile

Regola: ogni compromesso, valore non parametrico o decisione non ovvia va marcato con un InfoTooltip. Non si nascondono i compromessi nei commenti — si dichiarano nell'interfaccia. Testo sempre in italiano semplice.

## Debito tecnico noto — formule calcolatore

Vedi `MATTONE2_NOTE.md` per dettaglio. 4 costanti hardcoded da spostare nel DB:
- Scarto verniciature non-tdm (1.1 fisso vs coefficiente reale)
- Lunghezza rotolo prato (25m hardcoded)
- Moltiplicatore pennelli/rulli (4 fisso)
- Fallback larghezza tavola (0.15 ridondante)

## Funzione di calcolo materiali — post mattone 2

Le formule del calcolatore sono in `src/lib/calcolo-materiali.ts` come funzione pura `calcolaMateriali(input): CalcoloResult[]`.
- Input: driverMap, coeffMap (Record<string, number>)
- Output: array di {nome, quantita, unita, fornitore, prezzo}
- Nessuna dipendenza React, nessuna chiamata Supabase
- Chiamabile da qualsiasi pagina/componente dell'app
- Snapshot di verita in `src/lib/calcolo-materiali.snapshot.json`
- 5 funzioni interne: calcolaCarpenteria, calcolaVerniciatura, calcolaStripled, calcolaElettricoNuvole, calcolaPrato

`calcolatore-client.tsx` ora importa e usa questa funzione invece di formule inline.

## Pattern feedback errore — sonner (obbligatorio)

Il pattern unico per feedback errore/successo è `sonner`. Niente banner inline, niente alert nativi, niente console.error visibili all'utente.

Uso standard:
- `toast.error("Messaggio breve")` per errori
- `toast.error("Titolo", { description: "Dettaglio" })` per errori con dettaglio
- `toast.success("Messaggio")` per conferme positive importanti
- `console.error(originalError)` resta per debug, non come feedback utente

## Convenzioni codice
- File componenti: `kebab-case.tsx`
- Server Components di default, Client Components solo quando necessario
- Server Actions per mutazioni database
- Supabase client: `@supabase/ssr` con cookie-based auth (anche se per ora non c'è auth)
- Queries: usare Supabase client JS, non raw SQL
- Validazione: zod
- Nessun ORM oltre Supabase

## Struttura directory
```
src/
  app/
    layout.tsx          # Root layout con Outfit font
    page.tsx            # Dashboard
    lavorazioni/
      page.tsx          # Vista lavorazioni per zona
    gantt/
      page.tsx          # Vista Gantt
    fornitori/
      page.tsx          # Lista fornitori
    materiali/
      page.tsx          # Lista materiali
    costi/
      page.tsx          # Riepilogo costi
  components/
    ui/                 # shadcn/ui components
    layout/
      sidebar.tsx       # Navigazione desktop
      mobile-nav.tsx    # Tab bar mobile
    task/
      task-card.tsx
      task-detail.tsx
      task-deps.tsx
    lavorazione/
      lavorazione-card.tsx
      lavorazione-list.tsx
    fornitore/
      fornitore-card.tsx
      fornitore-status.tsx
    materiale/
      materiale-form.tsx
      materiale-list.tsx
    gantt/
      gantt-chart.tsx
      gantt-bar.tsx
  lib/
    supabase/
      client.ts
      server.ts
    utils.ts
    types.ts            # Tipi TypeScript generati da Supabase
```

## Dati seed
213 task reali, 22 fornitori, 9 zone. Vedi `seed.sql`.
