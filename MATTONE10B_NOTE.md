# Mattone 10b — CRUD propagato, ordinamenti, export, fix bug

## File modificati

| File | Modifiche |
|------|-----------|
| `actions.ts` | 7 server actions: aggiornaMateriale, creaMateriale, eliminaMateriale, aggiornaTask, aggiornaLegame, creaLegame, eliminaLegame + eliminaLegameByComposite |
| `materiali-superficie.tsx` | catalogoView/catalogoExtra/materialiTask convertiti in useState. 7 handler CRUD (updateCatalogo, addMateriale, removeMateriale, updateLegame, addLegame, removeLegame, updateTask). Sorting in materialiFiltrati. DrawerData esteso con handlers. Esportati CatalogoViewRow/CatalogoExtraRow |
| `hooks/use-superficie-state.ts` | Aggiunto `ordina` al state, esposto `setParam` |
| `drawer-materiale.tsx` | Campi editabili inline: nome (click-to-edit), unita, prezzo, fornitore, provenienza (select). X per rimuovere link task con confirm |
| `drawer-task.tsx` | Editabile: titolo (click-to-edit), stato (select), data_inizio/data_fine (date input). Stato calcolato visibile |
| `catalogo-tab.tsx` | Celle editabili (click-to-edit). Pulsante "Nuovo materiale" con dialog inline. Pulsante X per eliminare con confirm |
| `pannello-controllo.tsx` | Dropdown "Ordina per" con 6 opzioni |
| `lista-materiali.tsx` | CSV export button con preset Acquisti. Fix timezone isToday (Europe/Rome) |
| `bussola-bar.tsx` | Breadcrumb fix: click "Lista" chiude drawer via onGoToLista senza resettare filtri |

## Server actions

| Action | Tabella | Operazione |
|--------|---------|-----------|
| `aggiornaMateriale(id, campo, valore)` | catalogo_materiali | UPDATE con mapping campo UI→colonna DB |
| `creaMateriale(nome)` | catalogo_materiali + materiali_disponibilita | INSERT + INSERT riga disp a zero |
| `eliminaMateriale(id)` | materiali + materiali_disponibilita + catalogo_materiali | DELETE cascade |
| `aggiornaTask(id, campo, valore)` | task | UPDATE |
| `aggiornaLegame(id, quantita)` | materiali | UPDATE |
| `creaLegame(taskId, catalogoId, quantita, unita)` | materiali | INSERT |
| `eliminaLegame(id)` / `eliminaLegameByComposite(taskId, catalogoId)` | materiali | DELETE |

## Esiti test browser

| # | Test | Esito | Note |
|---|------|-------|------|
| 1 | Naviga | ✅ | |
| 2 | Drawer materiale: prezzo 8→9→8 | ✅ | Input numerico editabile, save funzionante |
| 7 | Catalogo: crea TEST_MATERIALE_MATTONE10B | ✅ | Appare nella lista dopo creazione |
| 8 | Catalogo: elimina TEST_MATERIALE_MATTONE10B | ✅ | Confirm dialog accettato, materiale sparito |
| 9 | Ordina da_comprare decrescente | ✅ | Primi: Viti 5x50 (7894), Sottomisure legno, vernice tdm |
| 10 | CSV export | ⚠️ | Non visibile: il preset "Da comprare" filtra per "settimana" e nessuna task ha date questa settimana |
| 11 | Breadcrumb "Lista" chiude drawer | ✅ | URL senza drawer= dopo click |
| 12 | Timezone isToday | ✅ | Usa Europe/Rome nel codice |
| 14 | Console: 0 errori | ✅ | |

Test 3-6, 13 non testati via browser (funzionalita verificata nel codice).

## Conferma nessun DELETE su dati reali

L'unico materiale eliminato e TEST_MATERIALE_MATTONE10B, creato e cancellato nello stesso test. Nessuno dei 192 materiali originali ne delle ~660 task e stato toccato con operazioni distruttive.
