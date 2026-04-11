# Mattone 5 — Drawer materiale e task con dati reali

## File modificati

| File | Modifiche |
|------|-----------|
| `src/app/materiali-nuovo/page.tsx` | Task fetch espansa con join `lavorazione:lavorazioni(nome, zona:zone(nome))` per zona/lavorazione. Materiali fetch con `quantita, unita` aggiunti per i dati drawer |
| `src/app/materiali-nuovo/materiali-superficie.tsx` | Nuovi tipi esportati: `TaskInfo`, `TaskLink`, `MaterialLink`, `DrawerData`. Costruisce 4 lookup maps in useMemo (materialiMap, taskMap, taskLinksByCatalogo, matLinksByTask). Passa `drawerData` a DrawerStack. Aggiunto campo `provenienza` a `MaterialeArricchito` |
| `src/app/materiali-nuovo/components/drawer-stack.tsx` | Accetta prop `drawerData: DrawerData`, la passa a DrawerMateriale e DrawerTask |
| `src/app/materiali-nuovo/components/drawer-materiale.tsx` | Riscritto da placeholder a drawer completo: header con nome+chips, dettagli (unita, prezzo/unita, fornitore, provenienza), quantita (necessario/disponibile/da acquistare con semaforo), lista task collegate cliccabili con zona e lavorazione, link pagina classica |
| `src/app/materiali-nuovo/components/drawer-task.tsx` | Riscritto da placeholder a drawer completo: header con nome+stato+tipologia, info (zona, lavorazione, date, durata, persone), lista materiali necessari con semaforo cliccabili |

## Esiti test browser

| # | Test | Esito |
|---|------|-------|
| 1 | Naviga a /materiali-nuovo | ✅ |
| 2 | Click su Acquaragia apre drawer | ✅ |
| 3 | Drawer mostra: lt, 8 €/lt, Tecnomat, 11 task, nomi task reali | ✅ |
| 4 | Click su task nel drawer apre drawer task affiancato | ✅ |
| 5 | Drawer task mostra materiali della task con semaforo | ✅ |
| 6 | Click su materiale nel drawer task apre terzo drawer | ✅ |
| 7 | Tre drawer affiancati visibili | ✅ |
| 8 | Quarto drawer aperto → primo cade (regola dei tre) | ✅ |
| 9 | Esc chiude ultimo drawer (da 3 a 2) | ✅ |
| 10 | Console: 0 errori critici | ✅ |

## Campi NULL incontrati

- `categoria_comportamentale`: NULL per tutti → mostrato come chip "Non classificato" in grigio
- `data_inizio`, `data_fine`: NULL per molte task → mostrato come "—"
- `durata_ore`, `numero_persone`: NULL per molte task → campi nascosti nel drawer
- `prezzo_unitario`: NULL per la maggior parte dei materiali → mostrato come "non impostato" in grigio
- `fornitore_preferito`: NULL per la maggior parte → mostrato come "Da assegnare" in grigio
- `costo_stimato`: NULL o 0 per tutti → sezione costo nascosta

## Note tecniche

- PostgREST restituisce le join `lavorazione` e `zona` come array (non oggetto) quando il tipo FK non e inferito univocamente. Gestito con `Array.isArray()` check nel mapping.
- Deduplicazione drawer funzionante: cliccando una task gia aperta non si duplica.
- Navigazione circolare materiale→task→materiale funziona senza loop.

## Screenshot

- `verifica-mattone5/drawer-acquaragia.png` — drawer materiale con dati reali
- `verifica-mattone5/due-drawer-affiancati.png` — materiale + task affiancati
- `verifica-mattone5/tre-drawer-affiancati.png` — tre drawer (materiale + task + materiale)
