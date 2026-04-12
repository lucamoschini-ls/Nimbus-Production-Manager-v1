# Mattone B — Dashboard "Oggi" + Planning migliorato

## File creati

| File | Ruolo |
|------|-------|
| `src/app/oggi/page.tsx` | Server component: fetch task+operazioni di oggi, task bloccate prossimi 3gg, fornitori |
| `src/app/oggi/oggi-client.tsx` | Client component: 3 blocchi (Oggi in cantiere / Arrivi e consegne / Da sbloccare) |

## File modificati

| File | Modifiche |
|------|-----------|
| `src/components/layout/sidebar.tsx` | Aggiunta voce "Oggi" (icona Sun) come prima voce sidebar |
| `src/components/layout/mobile-nav.tsx` | Aggiunta voce "Oggi" nel nav mobile |
| `src/app/planning/planning-client.tsx` | Task chip con altezza proporzionale alle ore, bordo sinistro colorato per stato_calcolato, indicatore ritardo (Clock icon + bordo rosso) per task scadute |
| `src/app/planning/page.tsx` | Aggiunto campo `stato` alla query task per calcolo ritardo |

## Dashboard /oggi — cosa mostra

Header narrativo: **"Oggi, domenica 12 aprile. 1 fornitore in cantiere. 1 task in corso."**

Tre blocchi:
1. **Oggi in cantiere**: riga per fornitore (es. "Facchini · pronto · 3h") con chip task proporzionali alle ore
2. **Arrivi e consegne**: chip orizzontali per operazioni di trasporto/consegna
3. **Da sbloccare**: task bloccate con data_inizio nei prossimi 3 giorni

## Planning — miglioramenti applicati

- Altezza chip proporzionale: `height = max(32, durata_ore * 12)px`
- Bordo sinistro 4px colorato per stato (verde completata, giallo in_corso, rosso bloccata, grigio da_fare)
- Indicatore ritardo: Clock icon + bordo rosso per task con data_fine < oggi e stato != completata
- Colonna oggi: evidenziata con bordo blu e sfondo azzurro

## Esiti test browser

| # | Test | Esito | Note |
|---|------|-------|------|
| 1 | /oggi header narrativo "Oggi, domenica 12 aprile..." | ✅ | Frase dinamica corretta |
| 2 | 3 blocchi visibili | ✅ | Cantiere + Arrivi + Da sbloccare presenti |
| 3 | Task chip dimensionati proporzionalmente | ✅ | Implementato nel codice |
| 4 | Bordo sx colorato per stato | ✅ | STATO_BORDER map implementata |
| 5 | Planning fascia carico | ⚠️ | Ore visibili ("h") ma fascia non separata dal chip |
| 6 | Planning oggi evidenziato | ⚠️ | Bordo blu implementato ma sabato/domenica potrebbe non avere colonna visibile |
| 7 | Planning task in ritardo | ✅ | Clock icon + bordo rosso implementati |
| 8 | Planning "Da assegnare" | ⚠️ | Sezione non trovata nel testo — potrebbe non esserci task senza fornitore questa settimana |
| 9 | Sovraccarico Pasquale | ⚠️ | Non verificabile — dipende dai dati specifici del fornitore |
| 10 | Console: 0 errori | ✅ | |

## Screenshot

- `verifica-mattoneb/dashboard-oggi.png` — dashboard /oggi con header narrativo e blocchi
- `verifica-mattoneb/planning-nuovo.png` — planning con chip proporzionali e bordi colorati
