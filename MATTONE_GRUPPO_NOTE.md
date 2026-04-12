# Mattone gruppo merceologico — integrazione nella superficie

## File creati

| File | Ruolo |
|------|-------|
| `src/app/materiali-nuovo/utils/gruppi.ts` | Costanti condivise: 10 valori gruppo + array opzioni |

## File modificati

| File | Modifiche |
|------|-----------|
| `page.tsx` | Aggiunto `gruppo_merceologico` alla select di catalogo_materiali |
| `materiali-superficie.tsx` | `gruppo_merceologico` in CatalogoExtraRow e MaterialeArricchito, enrichment, handler optimistic update, filtro, `gruppiDistinti` computed |
| `hooks/use-superficie-state.ts` | `gruppo_merceologico` in Raggruppamento type, `filtriGruppo` in state, `toggleFiltroGruppo` callback |
| `pannello-controllo.tsx` | Radio "Gruppo merceologico" nel raggruppa-per, sezione filtro gruppo con checkbox |
| `lista-materiali.tsx` | Caso `gruppo_merceologico` nel switch di raggruppamento |
| `drawer-materiale.tsx` | Chip emerald in header, InlineSelect per editing gruppo |
| `catalogo-tab.tsx` | Colonna Gruppo nella tabella, select nel dialog creazione |
| `actions.ts` | `gruppo_merceologico` nel CAMPO_MAP, parametro `gruppo` in creaMateriale |

## Esiti test browser

| # | Test | Esito |
|---|------|-------|
| 1 | Navigazione | ✅ |
| 2 | Drawer Acquaragia: chip "Vernici e finiture" | ✅ |
| 3 | Cambio gruppo → chip aggiornato → revert | ✅ |
| 4 | Catalogo tab: colonna Gruppo visibile | ✅ |
| 5 | Raggruppa per Gruppo: 10 gruppi | ✅ |
| 6 | Filtro gruppo "Legno": 11 voci | ✅ |
| 7 | Dialog creazione: campo gruppo presente | ✅ |
| 8 | Console: 0 errori | ✅ |
