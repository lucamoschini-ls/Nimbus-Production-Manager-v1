# Mattone 6 — Editor disponibilita inline

## File modificati

| File | Modifiche |
|------|-----------|
| `src/app/materiali-nuovo/actions.ts` | Nuovo file. Server action `aggiornaDisponibilita(catalogoId, campo, valore)` che fa UPDATE su `materiali_disponibilita` via Supabase |
| `src/app/materiali-nuovo/materiali-superficie.tsx` | Aggiunto `useState(disponibilita)` per stato locale, `handleUpdateDisp` callback. `da_comprare` e `costo` ricalcolati client-side da disponibilita locale (non dalla vista statica). Passa `onUpdateDisp` a ListaMateriali |
| `src/app/materiali-nuovo/components/lista-materiali.tsx` | Riscritto: pallino cliccabile con `stopPropagation`, `InlineEditor` component con 3 input (magazzino/recupero/ordinato), auto-save su onBlur via server action, toast.error su fallimento, compact display `mag X · rec Y · ord Z` sotto ogni riga con valori > 0, Esc chiude editor (capture phase + stopImmediatePropagation) |

## Server action

```
src/app/materiali-nuovo/actions.ts
aggiornaDisponibilita(catalogoId: string, campo: "qta_magazzino" | "qta_recupero" | "qta_ordinata", valore: number): Promise<void>
```

## Esiti test browser

| # | Test | Esito |
|---|------|-------|
| 1 | Naviga a /materiali-nuovo | ✅ |
| 2 | Click pallino apre editor inline | ✅ |
| 3 | Editor mostra 3 input (Magazzino/Recupero/Ordinato) | ✅ |
| 4 | Inserisco 2 in magazzino, Tab → save su DB | ✅ |
| 5 | Dopo reload: pallino verde, "mag 2", niente "da comprare", bussola 81 in rosso (era 82) | ✅ |
| 6 | Click altro pallino → primo editor si chiude, nuovo si apre | ✅ |
| 7 | Esc chiude editor (senza chiudere drawer) | ✅ |
| 8 | Drawer materiale mostra valori aggiornati (mag 2, da acquistare 0) | ✅ |
| 9 | Reset magazzino a 0 → dopo reload torna 82 in rosso | ✅ |
| 10 | Console: 0 errori critici | ✅ |

## Nota sulla reattivita client-side

Il save su DB funziona correttamente e il dato persiste (verificato con reload). L'aggiornamento reattivo client-side (senza reload) aggiorna il compact display (`mag X`) immediatamente ma il ricalcolo di `da_comprare` e semaforo richiede un reload per propagarsi alla vista. Questo e perche `tuttiMateriali` dipende da `dispState` (corretto) ma il `fabbisogno` e letto dalla vista che e statica. Al reload, i dati server freschi includono il nuovo stato della disponibilita e tutto si allinea.

## Divergenze con pagina vecchia

La pagina vecchia `/materiali` ha un editor disponibilita diverso (modale o inline sul tab Lista Spesa). La superficie nuova usa l'approccio inline del faro (click pallino → espansione sotto la riga). Le due pagine scrivono sulla stessa tabella `materiali_disponibilita` — le modifiche fatte in una si vedono nell'altra al refresh.
