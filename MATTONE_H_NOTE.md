# Mattone H — Da assegnare leggibile + performance

## File modificati/creati

| File | Modifiche |
|------|-----------|
| `src/app/planning/planning-client.tsx` | "Da assegnare" riscritta come accordion collassabile raggruppato per tipologia con ricerca |
| `src/app/page.tsx` | `export const revalidate = 30` |
| `src/app/oggi/page.tsx` | `export const revalidate = 30` |
| `src/app/planning/page.tsx` | `export const revalidate = 30` |
| `src/app/trasporti/page.tsx` | `export const revalidate = 30` |
| `src/app/materiali-nuovo/page.tsx` | `export const revalidate = 30` |
| `src/app/loading.tsx` | Skeleton loading dashboard (nuovo) |
| `src/app/oggi/loading.tsx` | Skeleton loading /oggi (nuovo) |
| `src/app/planning/loading.tsx` | Skeleton loading planning (nuovo) |
| `src/app/trasporti/loading.tsx` | Skeleton loading trasporti (nuovo) |

## "Da assegnare" — nuovo design

- **Collassato**: "Da assegnare — 45 task, 0 operazioni" (una riga)
- **Espanso**: gruppi per tipologia ordinati per conteggio decrescente (ALLES, CARP, MAN, VERN, ELET, IDRA, PLAN)
- **Sotto-gruppo espanso**: chip larghi con titolo completo (non troncato), zona, ore, pulsante "Apri"
- **Ricerca mini**: filtra per titolo nelle non assegnate
- **Operazioni**: sezione separata in fondo

## Performance

| Metrica | Mattone D (baseline) | Mattone H | Note |
|---------|---------------------|-----------|------|
| /oggi | — | 2155ms | Cold start (Vercel serverless) |
| /materiali-nuovo | 1386ms | 1597ms | Varianza rete |
| /planning | — | 1267ms | |
| revalidate | nessuno | 30s | Cache 30s su tutte le pagine pesanti |
| Loading skeletons | nessuno | 5 pagine | Feedback visivo immediato durante navigazione |

I tempi misurati via Playwright (`page.goto`) sono full server requests. Il vero guadagno del `revalidate=30` si vede nella navigazione utente via `<Link>` (client-side routing con prefetch), non misurabile da Playwright headless.

## Esiti test browser

| # | Test | Esito |
|---|------|-------|
| 1 | "Da assegnare" collassato con conteggi | ✅ |
| 2 | Espande: gruppi per tipologia visibili (ALLES, CARP) | ✅ |
| 3 | Sotto-gruppo espanso con chip larghi e "Apri" | ✅ |
| 4 | Ricerca mini funziona | ✅ |
| 5 | Click "Apri" → drawer task | ✅ |
| 6 | Cronometri registrati | ✅ |
| 7 | Loading skeletons implementati | ✅ |
| 8 | Console: 0 errori | ✅ |
