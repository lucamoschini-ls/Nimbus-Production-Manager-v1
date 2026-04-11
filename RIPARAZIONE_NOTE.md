# Riparazione Mutazioni Supabase — Note

## File modificati

| File | Righe cambiate | Mutazioni riparate |
|------|---------------|-------------------|
| `src/app/gantt/gantt-client.tsx` | +25 | 4 mutazioni |
| `src/app/planning/scheduling-tab.tsx` | +15 | 2 mutazioni |
| `src/app/materiali/materiali-client.tsx` | +8 | 3 mutazioni |
| `src/hooks/use-impact-analysis.ts` | +12 | 2 mutazioni (task + operazioni cascade) |
| **Totale** | **+60 righe** | **11 mutazioni** |

## Mutazioni riparate

- OK `gantt-client.tsx:479` — drag save no-impact: `.then()` → `await` + `{error}` check + rollback `localTaskOverrides`
- OK `gantt-client.tsx:1144` — onSingleOnly: `.then()` → `await` + `{error}` check + rollback
- OK `gantt-client.tsx:1151` — onCascade task principale: `await` → `{error}` check con stop
- OK `gantt-client.tsx:1156` — onCascade dipendenti: `await` → `{error}` check con break + conteggio salvate/fallite
- OK `scheduling-tab.tsx:189` — apply (range set): `await` → `{error}` check + conteggio
- OK `scheduling-tab.tsx:191` — apply (null set): `await` → `{error}` check + conteggio
- OK `materiali-client.tsx:765` — FornitoreCombobox create: `await` → `{error}` check + alert
- OK `materiali-client.tsx:832` — catalogo delete materiali: `await` → `{error}` check + early return
- OK `materiali-client.tsx:833` — catalogo scollega materiali: `await` → `{error}` check + early return
- OK `materiali-client.tsx:835` — catalogo delete voce: `await` → `{error}` check + early return
- OK `use-impact-analysis.ts:93-102` — cascade tasks + operazioni: `await` → `{error}` check con break + alert conteggio

## Mutazioni NON riparate

Nessuna. Tutte le 11 mutazioni identificate dall'audit sono state riparate.

## Pattern usato

**Nessuna libreria toast installata.** Il progetto non ha sonner, react-hot-toast o simili. Pattern usati:
- **Gantt**: stato `saveError` + banner rosso dismissibile in cima al Gantt
- **Scheduling**: stato `applyError` + banner rosso dismissibile
- **Materiali**: `alert()` nativo (3 punti isolati, non vale la pena di un banner)
- **use-impact-analysis**: `alert()` nativo (cascade è un'azione rara e critica)
- **Tutti**: `console.error()` con errore originale Supabase per debug

**Rollback UI**: Applicato dove l'UI era stata aggiornata ottimisticamente prima della mutazione (Gantt drag). Nel Gantt, il `localTaskOverrides` viene rimosso in caso di errore, riportando la barra alla posizione originale.

## Bug notati durante il fix (NON riparati)

1. **gantt-client.tsx:467** — Il `.then(async (graph) => { ... })` chain nel drag handler non ha `.catch()`. Se `impact.getGraph()` fallisce (es. network error durante fetch del grafo), l'errore viene swallowed silenziosamente e il drag non salva né mostra errore.

2. **scheduling-tab.tsx:189** — Se `handleApply` fallisce parzialmente (alcune task salvate, altre no), le `assignments` non vengono pulite (solo se failed=0). Questo è intenzionale (l'utente può riprovare), ma potrebbe confondere.

## Test manuali consigliati

1. **Gantt drag con network offline**: Apri DevTools → Network → Offline. Fai drag di una barra task. Deve apparire banner rosso "Errore salvataggio" e la barra deve tornare alla posizione originale.

2. **Gantt drag cascade con offline**: Sposta una task che ha dipendenti (modal "Sposta tutto"). Con network offline, clicca "Sposta tutto". Deve apparire banner con conteggio "Cascade interrotto: 0 task salvate su N."

3. **Scheduling apply con offline**: Tab Scheduling, sposta qualche task, clicca "Applica" con network offline. Deve apparire banner rosso con conteggio fallite.

4. **Catalogo elimina con offline**: Tab Catalogo, clicca cestino su una voce, conferma. Con offline deve apparire alert "Errore eliminazione."

5. **Verifica che il caso normale funzioni ancora**: Con network online, tutti i flow sopra devono continuare a funzionare come prima senza banner di errore.
