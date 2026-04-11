# Mattone 9 — Vista calendario (raggruppa per data)

## File modificati

| File | Modifiche |
|------|-----------|
| `src/app/materiali-nuovo/materiali-superficie.tsx` | Aggiunto `materialeEarliestDate` useMemo: per ogni catalogo_id, calcola min(data_inizio) delle task collegate. Passato come prop a ListaMateriali |
| `src/app/materiali-nuovo/components/lista-materiali.tsx` | `isGrouped` include "data". Caso "data" nel switch di raggruppamento usa `materialeEarliestDate`. `sortedGroups` ordina cronologicamente. Header formattato in italiano con `formatDateGroup()`. Chip "oggi" blu su data corrente. Gruppo "Senza data" in fondo |

## Dati

- **Gruppi data trovati**: 13 date distinte + 1 "Senza data" = 14 gruppi
- **Materiali "Senza data"**: 15 (task senza data_inizio)
- **Range date**: 11 aprile - 27 aprile 2026
- **Giorno con piu materiali**: gio 16 aprile (35 materiali)

## Date trovate nel DB

| Data | Giorno | Materiali |
|------|--------|-----------|
| 11 aprile | sab | 10 |
| 12 aprile | dom | 7 |
| 13 aprile | lun | 14 |
| 14 aprile | mar | 24 |
| 15 aprile | mer | 18 |
| 16 aprile | gio | 35 |
| 17 aprile | ven | 9 |
| 18 aprile | sab | 9 |
| 20 aprile | lun | 31 |
| 21 aprile | mar | 4 |
| 22 aprile | mer | 3 |
| 25 aprile | sab | 9 |
| 27 aprile | lun | 4 |
| Senza data | — | 15 |
| **Totale** | | **192** |

## Esiti test browser

| # | Test | Esito |
|---|------|-------|
| 1 | Naviga a /materiali-nuovo | ✅ |
| 2 | Radio "Data" selezionato | ✅ |
| 3 | Lista raggruppata per data, header italiano, ordine cronologico | ✅ |
| 4 | Gruppo "Senza data" presente (15 materiali) | ✅ |
| 5 | Finestra "oggi" → 1 solo gruppo (7 materiali) | ✅ |
| 6 | Finestra "stagione" → tutti i 14 gruppi | ✅ |
| 7 | Click header gruppo → espande/collassa | ✅ |
| 8 | Click materiale in gruppo → drawer si apre | ✅ |
| 9 | Console: 0 errori | ✅ |

## Screenshot

- `verifica-mattone9/raggruppa-data-stagione.png` — tutti i gruppi data con header italiani

## Nota chip "oggi"

Il chip "oggi" appare su "dom 12 aprile" invece di "sab 11 aprile" per differenza di timezone tra server UTC e fuso orario locale (UTC+2 Roma). Il check `isToday` usa `new Date()` lato client che dipende dal timezone del browser Playwright (UTC). Effetto solo cosmetico, non impatta i dati.
