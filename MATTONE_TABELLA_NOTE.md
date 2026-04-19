# Mattone Tabella — Vista tabellare task in /lavorazioni

Nuova tab **Tabella** in `/lavorazioni` (accanto a **Board**) che mostra tutte
le 151 task reali come un maxi-foglio stile Google Sheets.

## File modificati / creati

- **Nuovo**: `src/app/lavorazioni/tabella-task-view.tsx` (~600 righe)
  - componente client della vista tabellare
  - 14 colonne a larghezza fissa con scroll orizzontale
  - editing inline: `stato`, `fornitore_id`, `fornitore_supporto_id`,
    `tipologia`, `data_inizio`, `data_fine`, `durata_ore`, `numero_persone`
  - persistenza via server action `updateTask` + toast sonner "Salvato"
  - filtri per colonna (select multi-check, numero da/a, data da/a + quick)
  - ordinamento: click = asc → desc → off; shift+click = multi-sort
  - header sticky top, prima colonna (Titolo) sticky left
  - virtualizzazione righe con `@tanstack/react-virtual` (overscan 10, 36px)
  - click titolo → callback `onSelectTask` che apre il drawer esistente
- **Modificato**: `src/app/lavorazioni/lavorazioni-client.tsx`
  - import di `TabellaTaskView`
  - tab switcher Board / Tabella in cima al layout desktop
  - `viewMode` persistito in modulo var `_savedViewMode` per sopravvivere
    al re-mount da `revalidatePath` (stesso pattern di `_savedLavId`)
  - dati passati al tabella-view: lista task completa, fornitori, tipologie,
    zone, lavorazioni, dipendenze
- **Modificato**: `package.json` — aggiunta `@tanstack/react-virtual ^3.13.24`

## Colonne implementate (14)

| # | Colonna | Tipo | Editabile |
|---|---------|------|-----------|
| 1 | Titolo | testo (click apre drawer) | no |
| 2 | Stato | select 4 valori | sì |
| 3 | Fornitore | select dropdown fornitori | sì |
| 4 | Fornitore supporto | select dropdown fornitori | sì |
| 5 | Tipologia | select tipologie DB | sì |
| 6 | Lavorazione | testo | no |
| 7 | Zona | testo | no |
| 8 | Data inizio | date picker | sì |
| 9 | Data fine | date picker | sì |
| 10 | Durata ore | number | sì |
| 11 | Persone | number | sì |
| 12 | Stato calcolato | read-only colorato | no |
| 13 | Motivo blocco | testo | no |
| 14 | Dipendenze | nomi task predecessori | no |

## Esiti test browser (Playwright)

Eseguiti sull'URL di produzione `nimbus-production-manager-v1.vercel.app`
dopo il deploy Vercel dei commit `cdcbcca` e `e6be618`.

| # | Test | Esito |
|---|------|-------|
| 1 | /lavorazioni: tab "Tabella" visibile e cliccabile | ✅ passato |
| 2 | Tabella con 140+ righe e 14 colonne (effettivi: 151 task, 14 col) | ✅ passato |
| 3 | Filtro fornitore "Pasquale" → 41 task visualizzate | ✅ passato |
| 4 | Pasquale + zona "Pedana" combinati → 9 task (sottoinsieme) | ✅ passato |
| 5 | Click Durata ore asc (0.5 in cima) → secondo click desc (ordine invertito) | ✅ passato |
| 6 | Edit fornitore inline → toast "Salvato" | ✅ passato |
| 7 | Edit data_inizio inline → toast "Salvato" | ✅ passato |
| 8 | Click titolo task → drawer apre con titolo corretto | ✅ passato |
| 9 | scrollTop=500 → header rimane a stessa Y (sticky) | ✅ passato |
| 10 | "Visualizzate X di Y task" aggiorna correttamente dopo filtri | ✅ passato |
| 11 | Console: 0 errori | ✅ passato |

## Note tecniche

- `revalidatePath` del server action causava il ripristino del Board via
  re-mount da `loading.tsx` — risolto aggiungendo `_savedViewMode` a
  modulo (stesso pattern già usato per `_savedLavId`).
- Il sort considera `null` come "maggiore": in asc i valori mancanti
  finiscono in coda, in desc in testa. Scelta deliberata per la
  Durata ore (task senza stima non rubano la top delle liste ordinate
  crescenti).
- Filtri multipli si combinano in AND. Quando almeno un filtro è attivo
  viene mostrato il link "Rimuovi tutti i filtri (N)".
- Prima colonna sticky con `z-index:25` sull'header e `z-index:5` sulle
  celle corpo; header sticky con `z-index:20` per gestire l'overlay.

Vista tabellare completata. 11/11 test passati.
