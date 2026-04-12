# Mattone I — Unifica Planning in Scheduling + multi-fornitore

## File modificati

| File | Modifiche |
|------|-----------|
| `src/app/planning/planning-client.tsx` | Rimossi bottoni tab Settimanale/Scheduling, default a scheduling |
| `src/app/planning/scheduling-tab.tsx` | 6 modifiche: "Tutti i fornitori" nel select, vista multi-row, Da assegnare raggruppata per fornitore con ricerca, drop assegna fornitore_id, auto-save toggle |

## Dettaglio modifiche scheduling-tab.tsx

1. **Tab rimosso**: Scheduling e l'unica vista, header semplificato
2. **"Tutti i fornitori"**: opzione `value="tutti"` nel select. Mostra tabella righe=fornitori x colonne=giorni
3. **Da assegnare per fornitore**: raggruppamento primario per `fornitore_nome`, ordinato per conteggio decrescente. Ricerca mini per titolo. Chip con titolo completo (line-clamp-2) + zona + ore
4. **Drop + fornitore_id**: in modalita "tutti", drop su cella include `fornitore_id` nel payload di update
5. **+/- durata**: gia presente nel codice originale (extendTask/shrinkTask)
6. **Auto-save**: toggle "Salva auto" accanto ad Applica. Se attivo, `handleApply()` chiamato dopo ogni drop/extend/shrink

## Esiti test browser

| # | Test | Esito |
|---|------|-------|
| 1 | Tab "Settimanale" non visibile | ✅ |
| 2 | Select ha "Tutti i fornitori" | ✅ |
| 3 | "Tutti i fornitori": righe Pasquale + Facchini visibili | ✅ |
| 4 | "Da assegnare" raggruppata per fornitore | ✅ |
| 5 | Campo ricerca presente | ✅ |
| 6 | Drag&drop | ⚠️ Non testabile via Playwright headless |
| 7 | +/- durata | ⚠️ Gia presente, non testato live |
| 8 | — | — |
| 9 | Toggle "Salva auto" presente | ✅ |
| 10 | — | — |
| 11 | Console: 0 errori | ✅ |
