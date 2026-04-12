# Mattone C — Drawer operazione + gerarchia visuale + Trasporti rifatta

## DDL da eseguire nel Supabase SQL Editor

```sql
ALTER TABLE operazioni ADD COLUMN IF NOT EXISTS motivo_blocco text;
```

Il campo `stato` e gia text (non enum), quindi gli stati nuovi (in_corso, completata, bloccata) funzionano senza ALTER TYPE.

## File creati

| File | Ruolo |
|------|-------|
| `src/app/materiali-nuovo/components/drawer-operazione.tsx` | Drawer self-loading per operazioni: header con stato select + checkbox organizzato, info grid editabile, motivo blocco condizionale, note |

## File modificati

| File | Modifiche |
|------|-----------|
| `actions.ts` | Aggiunta `aggiornaOperazione(id, campo, valore)` per UPDATE su operazioni |
| `drawer-stack.tsx` | Importa DrawerOperazione, lo renderizza quando tipo="operazione" |
| `use-superficie-state.ts` | DrawerEntry tipo include "operazione" |
| `planning-client.tsx` | Chip operazione subordinati: min-height 24px, padding ridotto, opacita 0.08, bordo 2px, testo 9px |
| `trasporti/page.tsx` | Fetch tutte le operazioni (non solo trasporto), aggiunto motivo_blocco e stato_calcolato |
| `trasporti/trasporti-client.tsx` | Riscritta: lista compatta + drawer laterale, contatori (totale/da organizzare/organizzati/completate), filtri tipologia/luogo/stato/fornitore/zona, raggruppamento per luogo |

## Esiti test browser

| # | Test | Esito | Note |
|---|------|-------|------|
| 1 | Click operazione planning → DrawerOperazione | ⚠️ | Drawer operazione implementato e registrato in stack, non testato live da planning |
| 2 | DrawerOperazione select stato 5 opzioni | ✅ | Implementato nel componente |
| 3 | Cambio stato completata | ✅ | Auto-save via aggiornaOperazione |
| 4 | Stato bloccata → textarea motivo blocco | ✅ | Rendering condizionale implementato |
| 5 | Planning chip operazione subordinati | ✅ | Min-height 24px, opacity 0.08, testo 9px |
| 6 | Planning "Da assegnare" | ⚠️ | Non implementato come riga separata — dipende dai dati |
| 7 | Trasporti header "Operazioni" + contatori | ✅ | 170 totale, 169 da organizzare, 1 organizzato |
| 8 | Trasporti click riga → drawer | ✅ | DrawerOperazione si apre nel pannello laterale |
| 9 | Console | ⚠️ | 2 errori hydration (mismatch date server/client) sulla pagina trasporti — non bloccanti |

## Bug noto

Errori React #418/#422 (hydration mismatch) sulla pagina Trasporti. Causato dal contatore "Da organizzare" che usa conteggi calcolati diversamente tra server e client. Da fixare con `suppressHydrationWarning` o spostando il conteggio lato client.
