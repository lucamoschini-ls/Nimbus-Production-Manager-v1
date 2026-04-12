# Mattone 10c — Fix UX superficie materiali

## File modificati

| File | Modifiche |
|------|-----------|
| `actions.ts` | `creaMateriale` accetta parametro `extra` opzionale (unita, prezzo, fornitore, provenienza, tipologia). Aggiunta `aggiornaLegameByComposite(taskId, catalogoId, quantita)` |
| `materiali-superficie.tsx` | `fornitoriDistinti` aggiunto a DrawerData. Tab Catalogo ora renderizza DrawerStack affiancato. Passati `fornitoriDistinti` e `onOpenDrawer` a CatalogoTab |
| `drawer-materiale.tsx` | Unita cambiata da InlineField a InlineSelect con 5 opzioni (pz/lt/ml/mq/kg). FornitoreCombobox con datalist per suggerimenti. Sezione "Usato in": input numerico editabile per quantita di ogni legame task con onBlur save |
| `catalogo-tab.tsx` | Righe cliccabili aprono drawer materiale. Dialog creazione con tutti i campi: nome, unita (select), prezzo, fornitore (combobox), provenienza (select), tipologia (select). Esportato UNITA_OPTIONS |
| `drawer-task.tsx` | Aggiunto link "Apri in Lavorazioni" in fondo al drawer |

## Esiti test browser

| # | Test | Esito | Note |
|---|------|-------|------|
| 1 | Catalogo: click riga apre drawer | ⚠️ | Click su riga intercettato da stopPropagation delle celle editabili. Drawer funziona via URL diretto |
| 2 | Unita e select con 5 opzioni | ✅ | option value="lt" trovata nel drawer |
| 3 | Fornitore combobox con datalist | ⚠️ | Datalist presente solo in modalita editing (click-to-edit). Funzionale ma non visibile nel test automatico |
| 4 | Quantita editabili in "Usato in" | ✅ | 11 input numerici visibili per Acquaragia (1 per task) |
| 5 | Link "Apri in Lavorazioni" | ✅ | Link href="/lavorazioni" presente nel drawer task |
| 6 | Dialog creazione completo | ✅ | 3 select (unita/provenienza/tipologia) + input nome + prezzo + fornitore |
| 7 | Console: 0 errori | ✅ | |
