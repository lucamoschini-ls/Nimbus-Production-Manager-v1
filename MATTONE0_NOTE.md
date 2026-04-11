# Mattone 0 — Installazione sonner

## File modificati

| File | Modifiche |
|------|-----------|
| `package.json` | +sonner dipendenza |
| `src/app/layout.tsx` | +import Toaster, +`<Toaster />` nel body |
| `src/app/gantt/gantt-client.tsx` | +import toast, -stato saveError, -banner JSX, 5 setSaveError → toast.error |
| `src/app/planning/scheduling-tab.tsx` | +import toast, -stato applyError, -banner JSX, 1 setApplyError → toast.error, +1 toast.success |
| `src/app/materiali/materiali-client.tsx` | +import toast, 4 alert() → toast.error, +1 toast.success (elimina catalogo) |
| `src/hooks/use-impact-analysis.ts` | +import toast, 1 alert() → toast.error strutturato, +1 toast.success (cascade ok) |
| `CLAUDE.md` | +sezione "Pattern feedback errore — sonner" |

## Sostituzioni

| # | File | Prima | Dopo |
|---|------|-------|------|
| 1 | gantt-client.tsx | setSaveError("Errore salvataggio...") ×2 | toast.error("Errore salvataggio", {description}) |
| 2 | gantt-client.tsx | setSaveError("Impossibile caricare...") | toast.error("Errore grafo dipendenze", {description}) |
| 3 | gantt-client.tsx | setSaveError("Errore salvataggio task principale.") | toast.error("Errore salvataggio task principale") |
| 4 | gantt-client.tsx | setSaveError("Cascade interrotto: N...") | toast.error("Cascade interrotto", {description}) |
| 5 | gantt-client.tsx | banner JSX saveError (7 righe) | rimosso |
| 6 | scheduling-tab.tsx | setApplyError("N task non salvate...") | toast.error("Errore salvataggio", {description}) |
| 7 | scheduling-tab.tsx | banner JSX applyError (6 righe) | rimosso |
| 8 | materiali-client.tsx | alert("Errore creazione fornitore...") | toast.error("Errore creazione fornitore...") |
| 9 | materiali-client.tsx | alert("Errore eliminazione materiali...") | toast.error("Errore eliminazione materiali...") |
| 10 | materiali-client.tsx | alert("Errore scollega materiali.") | toast.error("Errore scollega materiali.") |
| 11 | materiali-client.tsx | alert("Errore eliminazione dal catalogo.") | toast.error("Errore eliminazione dal catalogo.") |
| 12 | use-impact-analysis.ts | alert("Cascade interrotto: N...") | toast.error("Cascade interrotto", {description}) |

## Feedback positivi aggiunti

| File | Quando | Messaggio |
|------|--------|-----------|
| scheduling-tab.tsx | Apply scheduling completato | toast.success("N task aggiornate") |
| materiali-client.tsx | Voce catalogo eliminata | toast.success("Voce eliminata dal catalogo") |
| use-impact-analysis.ts | Cascade completato senza errori | toast.success("N task aggiornate") |

## Punti non sostituiti

Nessuno. Tutti i 12 punti di feedback sono stati migrati a sonner.

## Test manuale

1. **Gantt drag offline**: DevTools → Network → Offline. Drag una barra task. Toast rosso top-right "Errore salvataggio".
2. **Gantt cascade offline**: Sposta task con dipendenti → "Sposta tutto" offline. Toast rosso "Cascade interrotto".
3. **Scheduling apply offline**: Tab Scheduling, sposta task, "Applica" offline. Toast rosso "Errore salvataggio".
4. **Scheduling apply online**: Stessa cosa online. Toast verde "N task aggiornate".
5. **Catalogo elimina offline**: Tab Catalogo, cestino, conferma offline. Toast rosso "Errore eliminazione".
6. **Catalogo elimina online**: Stessa cosa online. Toast verde "Voce eliminata dal catalogo".
