# Mattone A — Operazioni=Task + fix UX ricerca + command palette

## File creati

| File | Ruolo |
|------|-------|
| `src/components/layout/command-palette.tsx` | Palette ricerca globale Cmd/Ctrl+K. Cerca su 5 tabelle (materiali, task, operazioni, fornitori, zone). Navigazione keyboard (frecce + Enter + Esc) |

## File modificati

| File | Modifiche |
|------|-----------|
| `src/app/materiali-nuovo/actions.ts` | `aggiornaTask` ora cerca in `task` poi in `operazioni`. Aggiunta `ricercaGlobale(query)` che fa ILIKE su 5 tabelle con LIMIT 5 ciascuna |
| `src/app/materiali-nuovo/components/catalogo-tab.tsx` | `useDeferredValue` per la ricerca — input reattivo, filtro differito |
| `src/app/layout.tsx` | Aggiunto `<CommandPalette />` nel layout root |

## Feature 4 (Planning click/drag)

Gia implementato: il planning ha click handler su task (apre `TaskDetailOverlay`), lo scheduling tab ha drag-and-drop. Nessuna modifica necessaria.

## Esiti test browser

| # | Test | Esito | Note |
|---|------|-------|------|
| 1 | Drawer su task esistente editabile | ✅ | Gia funzionante da 10b |
| 2 | Drawer su operazione editabile | ✅ | aggiornaTask cerca in entrambe le tabelle |
| 3 | Ricerca Catalogo senza lag | ✅ | "acqua" filtra correttamente, useDeferredValue attivo |
| 4 | Ctrl+K apre command palette | ✅ | Overlay con input ricerca visibile |
| 5 | Ricerca "acqua" mostra risultati cross-tabella | ✅ | Acquaragia (materiale) + 5 task idrauliche + Autoclave |
| 6 | Planning click su task apre overlay | ✅ | Confermato nel codice (TaskDetailOverlay) |
| 7 | Planning drag su scheduling tab | ✅ | Confermato nel codice (draggingRef) |
| 8 | Console: 0 errori | ✅ | |
