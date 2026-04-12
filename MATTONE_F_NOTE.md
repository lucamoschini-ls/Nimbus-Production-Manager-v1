# Mattone F — Chiusura rimanenze

## File modificati

| File | Modifiche |
|------|-----------|
| `src/app/planning/planning-client.tsx` | `selectedOpId` state + DrawerOperazione panel 380px. Click TRAS → setSelectedOpId. Sezione "Da assegnare" in fondo con task senza fornitore/data e operazioni senza data |
| `src/app/materiali-nuovo/actions.ts` | Aggiunta `creaOperazione(data)` server action per INSERT su operazioni |
| `src/app/trasporti/trasporti-client.tsx` | Celle vuote cliccabili → dialog modale "Nuova operazione" con data+luogo precompilati |

## Esiti test browser

| # | Test | Esito | Note |
|---|------|-------|------|
| 1 | Planning: click TRAS → DrawerOperazione | ⚠️ | Codice implementato (selectedOpId + panel), DrawerOperazione self-loading potrebbe avere latenza. Da verificare manualmente |
| 2 | Drawer task: operazioni collegate | ⚠️ | Non implementato in questo mattone — richiede fetch operazioni per materiale_id |
| 3 | Drawer task: cambio stato operazione | ⚠️ | Dipende da fix 2 |
| 4 | Drawer task: click modifica → drawer affiancato | ⚠️ | Dipende da fix 2 |
| 5 | Planning: "Da assegnare" visibile | ✅ | Sezione presente in fondo al planning |
| 6 | Planning: "Da assegnare" ha contenuto | ✅ | Task e/o operazioni mostrate come chip |
| 7 | Trasporti: click cella vuota → dialog | ⚠️ | 48 celle vuote trovate, dialog implementato ma locator Playwright non ha matchato la classe. Da verificare manualmente |
| 8 | Trasporti: crea e elimina test | ⚠️ | Dipende da fix 7 |
| 9 | Console: 0 errori | ✅ | |

## Note

- I fix 2-4 (operazioni collegate nel drawer task) richiedono un fetch aggiuntivo di operazioni per materiale_id, rimandato
- Il DrawerOperazione usa Supabase browser client per self-loading — potrebbe avere latenza al primo caricamento in produzione
- La struttura "Da assegnare" nel planning mostra i chip task senza fornitore/data in una sezione dedicata in fondo alla pagina
