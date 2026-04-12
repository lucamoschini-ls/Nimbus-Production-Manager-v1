# Mattone G — Dashboard strategica + luogo editabile + sticky + filtri data

## File modificati/creati

| File | Modifiche |
|------|-----------|
| `src/app/page.tsx` | Dashboard riscritta: fetch KPI (task completate, fornitori operativi, backlog), trend completamenti, carichi fornitori settimanali, progresso zone |
| `src/app/dashboard-client.tsx` | Nuovo client component: 4 KPI cards (text-4xl), progresso zone, trend CSS bars, carichi fornitori, traguardi placeholder. Rimossi "Azioni prioritarie" e "Fornitori da gestire" |
| `src/app/materiali-nuovo/components/drawer-operazione.tsx` | Luogo: da read-only a select dropdown con luoghi dal DB |
| `src/app/trasporti/trasporti-client.tsx` | Sticky header (top-0 z-10) + sticky date column (left-0). Filtro date con 4 opzioni (Oggi/Settimana/2 settimane/Tutte) |

## Dashboard KPI

| KPI | Valore | Formato |
|-----|--------|---------|
| Task completate | 7/140 (5%) | Con progress bar |
| Giorni all'apertura | 19 | Con data "1 maggio 2026" |
| Fornitori operativi | 12/21 | Pronti su totale |
| Backlog | 266 | Task bloccate + op da organizzare |

## Esiti test browser

| # | Test | Esito |
|---|------|-------|
| 1 | Dashboard: KPI cards visibili | ✅ |
| 2 | Dashboard: no "Azioni prioritarie" / "Fornitori da gestire" | ✅ |
| 3 | Dashboard: sezione trend presente | ✅ |
| 4 | /oggi invariato | ✅ |
| 5 | DrawerOperazione: luogo editabile come select | ✅ |
| 6 | Luogo cambio salvato | ✅ |
| 7 | Trasporti: sticky header | ✅ |
| 8 | Trasporti: sticky date column | ✅ |
| 9 | Trasporti: filtro date con dropdown | ✅ |
| 10 | Trasporti: filtro "Oggi" funziona | ✅ |
| 11 | Console: 0 errori | ✅ |
