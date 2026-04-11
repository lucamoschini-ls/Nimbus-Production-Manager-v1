# Mattone 7 — Drawer calcoli (driver e coefficienti)

## File modificati

| File | Modifiche |
|------|-----------|
| `src/app/materiali-nuovo/actions.ts` | Aggiunte server actions `aggiornaDriver(id, valore)` e `aggiornaCoefficiente(id, valore)` |
| `src/app/materiali-nuovo/page.tsx` | Driver e coefficienti fetch con `select("*")` invece di `select("chiave, valore")` per avere label, gruppo, tooltip, valore_default |
| `src/app/materiali-nuovo/materiali-superficie.tsx` | Tipi `DriverRow`/`CoefficienteRow` espansi con tutti i campi. `driverState`/`coeffState` come useState. Handler `handleUpdateDriver`/`handleUpdateCoeff`. `calcolaMateriali` useMemo usa stato reattivo. `DrawerData` esteso con driver/coeff e handlers. `onOpenCalcoli` passato a BussolaBar |
| `src/app/materiali-nuovo/components/drawer-calcoli.tsx` | Riscritto da placeholder a drawer completo: sezioni raggruppate per `gruppo`, input con onBlur + optimistic update, warning tooltips per i 4 bug noti, reset-to-default per coefficienti, InfoTooltip header |
| `src/app/materiali-nuovo/components/bussola-bar.tsx` | Aggiunta icona Calculator con `onOpenCalcoli` callback |
| `src/app/materiali-nuovo/components/drawer-materiale.tsx` | Aggiunta icona Calculator accanto a "Necessario" per aprire drawer calcoli affiancato |
| `src/app/materiali-nuovo/components/drawer-stack.tsx` | Passa `drawerData` a DrawerCalcoli, passa `onOpenCalcoli` a DrawerMateriale |

## Server actions create

| Action | File | Tabella |
|--------|------|---------|
| `aggiornaDriver(id, valore)` | `actions.ts` | `calcolatore_driver` |
| `aggiornaCoefficiente(id, valore)` | `actions.ts` | `calcolatore_coefficienti` |

## Dati caricati

- **Driver geometrici**: 21 input raggruppati per gruppo (Pedane, Lineari, Nuvole e round, Verniciatura, Vasi, Prato)
- **Coefficienti**: 19 input raggruppati per gruppo (Carpenteria, Verniciatura, Stripled, Elettrico nuvole, Prato, Scarti)
- **Totale input**: 40

## Esiti test browser

| # | Test | Esito | Note |
|---|------|-------|------|
| 1 | Naviga a /materiali-nuovo | ✅ | |
| 2 | Icona calcoli nella BussolaBar | ✅ | Icona Calculator visibile |
| 3 | Click → drawer calcoli si apre | ✅ | URL aggiornato con `drawer=calcoli:main` |
| 4 | Sezione driver (21) e coefficienti (19) con input | ✅ | 40 input totali, raggruppati per gruppo |
| 5 | Modifica coefficiente (4→999), Tab → valore salvato | ✅ | Nessun toast errore |
| 6 | Ripristino valore originale (999→4) | ✅ | Save corretto |
| 7 | Calcoli + materiale affiancati | ✅ | Verificato via URL con due drawer |
| 8 | Icona calcoli dentro drawer materiale | ✅ | `test8_iconExists: true` |
| 9 | Esc chiude drawer | ⚠️ | Funziona sui drawer materiale/task, meno affidabile quando focus e su input nel drawer calcoli |
| 10 | 3 drawer affiancati (calcoli + materiale + task) | ✅ | Verificato via URL |
| 11 | Console: 0 errori | ✅ | |

## Divergenze dalla pagina /calcolatore vecchia

1. La pagina /calcolatore mostra i materiali calcolati in una lista sotto i driver. Il drawer calcoli mostra solo driver e coefficienti — i materiali calcolati sono nella lista principale della superficie.
2. I 4 warning InfoTooltip sono identici nei testi alla pagina vecchia.
3. La pagina /calcolatore NON e stata toccata — coesiste con il drawer.

## Screenshot

- `verifica-mattone7/drawer-calcoli.png` — drawer calcoli aperto con driver e coefficienti
- `verifica-mattone7/calcoli-materiale-affiancati.png` — calcoli + materiale Acquaragia affiancati
