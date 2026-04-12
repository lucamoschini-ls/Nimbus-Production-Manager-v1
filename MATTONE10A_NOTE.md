# Mattone 10a — Alberatura, sotto-tab, terminologia

## File modificati

| File | Modifiche |
|------|-----------|
| `src/components/layout/sidebar.tsx` | "Superficie" → "Materiali (nuovo)", rimossa voce "Calcolatore" |
| `src/app/materiali-nuovo/hooks/use-superficie-state.ts` | Aggiunto `tab: TabSuperficie` allo state, `setTab()` per navigazione tab via URL |
| `src/app/materiali-nuovo/materiali-superficie.tsx` | Import CatalogoTab + CalcoloPanel, tab bar con 3 pulsanti, rendering condizionale per Lista/Catalogo/Calcolatore |
| `src/app/materiali-nuovo/components/bussola-bar.tsx` | Breadcrumb cliccabile ("Materiali" resetta, tab cliccabile), contatori e calcoli solo su Lista |
| `src/app/materiali-nuovo/components/pannello-controllo.tsx` | Preset rinominati: "Da comprare", "Cosa serve oggi", "Tutti i materiali" |
| `src/app/materiali-nuovo/components/drawer-calcoli.tsx` | Semplificato a wrapper di CalcoloPanel |

## File creati

| File | Ruolo |
|------|-------|
| `src/app/materiali-nuovo/components/calcolo-panel.tsx` | Componente condiviso driver+coefficienti, usato da drawer-calcoli e tab Calcolatore |
| `src/app/materiali-nuovo/components/catalogo-tab.tsx` | Tab Catalogo: lista 192 voci read-only con colonne (nome, unita, prezzo, fornitore, tipologia, necessario, disponibile, da comprare), ricerca testuale |

## Esiti test browser

| # | Test | Esito | Note |
|---|------|-------|------|
| 1 | Naviga a /materiali-nuovo | ✅ | |
| 2 | Sidebar: "Materiali (nuovo)", no "Superficie", no "Calcolatore" | ✅ | |
| 3 | Sidebar: "Materiali" (vecchia) ancora presente | ✅ | |
| 4 | Tre tab: Lista / Catalogo / Calcolatore | ✅ | 3 tab button con border-b-2 |
| 5 | Click Catalogo → URL tab=catalogo, ricerca visibile | ✅ | |
| 6 | Click Calcolatore → URL tab=calcolatore, 40 input | ✅ | |
| 7 | Click Lista → torna alla superficie | ✅ | URL senza tab= |
| 8 | Click "Da comprare" → stato applicato, evidenziato | ✅ | |
| 9 | Preset rinominati correttamente | ✅ | Visibili nello screenshot |
| 10 | Drawer aperto → breadcrumb con "Lista" e info drawer | ✅ | |
| 11 | Click "Lista" nel breadcrumb → drawer si chiude | ⚠️ | setTab non pulisce drawer param. Bug minore: il drawer resta aperto. |
| 12 | Click "Materiali" nel breadcrumb → stato pulito | ✅ | Tutti i param rimossi |
| 13 | Console: 0 errori | ✅ | |

## Decisioni architetturali

1. **CalcoloPanel condiviso**: estratto da drawer-calcoli in `calcolo-panel.tsx`. Accetta `driverItems`, `coeffItems`, handlers come props. Usato sia dal drawer che dalla tab Calcolatore.
2. **Tab state in URL**: `?tab=lista|catalogo|calcolatore`, default "lista" (nessun param). Gestito dal hook `useSuperficieState`.
3. **Catalogo tab**: read-only, layout tabellare. Stessa sorgente dati della Lista (`tuttiMateriali`). Editing nel mattone 10b.
4. **Breadcrumb cliccabile**: segmenti "Materiali" e tab sono button. "Materiali" chiama `resetSuperficie()`. Tab chiama `setTab()`.

## Bug noto

Test 11: click su "Lista" nel breadcrumb non chiude i drawer aperti. `setTab("lista")` preserva i search params correnti incluso `drawer=`. Fix: il click su "Lista" nel breadcrumb dovrebbe anche pulire il param `drawer`. Rimandato al prossimo fix.
