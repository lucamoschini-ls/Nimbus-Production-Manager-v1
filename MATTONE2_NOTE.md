# Mattone 2 — Estrazione funzione di calcolo pura

## File creati

| File | Cosa fa |
|------|---------|
| `src/lib/calcolo-materiali.ts` | Funzione pura `calcolaMateriali()` + 5 funzioni interne |
| `src/lib/calcolo-materiali.snapshot.json` | Snapshot output atteso per test equivalenza |
| `scripts/verifica-calcolo.mjs` | Script di verifica equivalenza (legge DB, calcola, confronta) |
| `MATTONE2_DIAGNOSI.md` | Diagnosi pre-estrazione |

## File modificati

| File | Modifiche |
|------|-----------|
| `src/app/calcolatore/calcolatore-client.tsx` | Rimossa funzione inline `calcolaMateriali` (75 righe), importata da `@/lib/calcolo-materiali`, adattata chiamata useMemo |
| `CLAUDE.md` | Aggiunta sezione "Funzione di calcolo materiali — post mattone 2" |

## Esito test equivalenza

```
=== RISULTATO: 11/11 OK, 0 differenze ===
TEST EQUIVALENZA SUPERATO
```

11 materiali confrontati, 11 OK, 0 differenze.

## Funzioni interne in calcolo-materiali.ts

| Funzione | Cosa calcola |
|----------|-------------|
| `calcolaCarpenteria` | Tavole, viti 5x50, viti 6x120, morali, legno vasi, viti vasi |
| `calcolaVerniciatura` | Vernice tdm/impregnante/nera/oro, acquaragia, pennelli, rulli |
| `calcolaStripled` | Profilo alluminio, viti profilo, box controllo |
| `calcolaElettricoNuvole` | Cavo citofonico, corrugato, strip RGBW, wago |
| `calcolaPrato` | Picchetti |

## Costanti hardcoded non nel DB

| Costante | Valore | Dove | Nota |
|----------|--------|------|------|
| `1.1` | ×1.1 | Verniciatura impregnante/nera/oro | Dovrebbe usare `scarto_perc_default` come testa-di-moro |
| `25` | 25m | Prato, lunghezza rotolo | Non esiste come driver/coefficiente |
| `4` | ×4 | Pennelli/rulli per pax | "4 tipi vernice", hardcoded |
| `0.15` | 0.15m | Fallback larghezza tavola | Ridondante col coefficiente `m_tavola_larghezza` |

Da affrontare in un mattone di correzione formule.

## Test manuale consigliato

1. Aprire `/calcolatore` — deve caricare
2. Cambiare `mq_pedana_centrale` da 350 a 400 → i numeri carpenteria devono aggiornarsi
3. Riportare a 350 → devono tornare uguali allo snapshot
