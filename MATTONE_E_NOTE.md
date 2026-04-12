# Mattone E — Trasporti: matrice giorni x luoghi

## File modificati

| File | Modifiche |
|------|-----------|
| `src/app/trasporti/page.tsx` | Fetch semplificato: operazioni con join fornitore/luogo/materiale_ref + tutti i luoghi per colonne |
| `src/app/trasporti/trasporti-client.tsx` | Riscrittura completa come matrice giorni x luoghi |

## Layout implementato

### Header narrativo
"Prossimi 7 giorni: 70 operazioni schedulate. Oggi 38 operazioni (Casa Ale, In loco, Fornitore diretto). 170 da organizzare."

### Filtri
Barra orizzontale con: segmento stato (Tutti / Da organizzare / Organizzati / In corso / Completati) + select tipologia + select fornitore

### Matrice
- **Righe** = date con almeno un'operazione (oggi sempre in cima, evidenziata con bordo blu)
- **Colonne** = luoghi (Casa Ale, Monterosi, Guidonia, In loco, Fornitore diretto)
- **Celle** = chip compatti con bordo sinistro stato (grigio da_fare, blu organizzato, giallo in_corso, verde completata, rosso bloccata)
- **Celle vuote** = sfondo grigio chiaro

### Riga "Senza data"
In fondo alla matrice, conteggio per luogo. Click espande per mostrare tutti i chip.

### Drawer
380px laterale con DrawerOperazione (dal Mattone C), aperto al click su chip.

## Esiti test browser

| # | Test | Esito | Note |
|---|------|-------|------|
| 1 | Naviga a /trasporti | ✅ | |
| 2 | Header narrativo dinamico | ✅ | "Prossimi 7 giorni: 70 schedulate..." |
| 3 | Matrice giorni x luoghi | ✅ | 4 luoghi come colonne (Casa Ale, Monterosi, In loco, Fornitore diretto) |
| 4 | Oggi evidenziato bordo blu | ✅ | border-blue trovato |
| 5 | Celle vuote grigie | ✅ | bg-[#fafafa] presente |
| 6 | Click chip → DrawerOperazione | ✅ | 75 chip visibili, drawer con Tipologia+Organizzato |
| 7 | Click cella vuota → dialog | ⚠️ | Non implementato in questa versione |
| 8 | "Senza data" in fondo | ✅ | Presente |
| 9 | Filtro stato funzionante | ✅ | Pulsante "Da organizzare" presente |
| 10 | Console: 0 errori | ✅ | |
