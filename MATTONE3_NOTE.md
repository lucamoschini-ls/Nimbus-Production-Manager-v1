# Mattone 3 — Scheletro superficie unica materiali

## Diagnosi preliminare

1. **Sheet shadcn**: Presente in `src/components/ui/sheet.tsx`. Configurato come side drawer destra (`sm:max-w-[420px]`). Usato in task-detail-sheet, fornitore-sheet, permesso-sheet. NON usato per il drawer stack della superficie — usiamo div affiancati custom (il pattern Sheet di shadcn e un modal overlay, non un panel affiancabile).
2. **URL state**: `useSearchParams` NON usato in nessuna parte del progetto. Introdotto qui per la prima volta in `use-superficie-state.ts`.
3. **Pagina materiali**: 4 file in `src/app/materiali/` (page.tsx, materiali-client.tsx, actions.ts, loading.tsx). 3 tab: Materiali, Catalogo, Lista Spesa. NON cancellata.
4. **Sonner**: Confermato in `layout.tsx` linea 6+47.

## Decisione coesistenza

Nuova rotta `/materiali-nuovo` temporanea. La vecchia `/materiali` resta intatta. Link "Superficie" aggiunto al menu. Quando la superficie sara completa, `/materiali-nuovo` diventa `/materiali` e la vecchia viene rimossa.

## File creati

| File | Ruolo |
|------|-------|
| `src/app/materiali-nuovo/page.tsx` | Server component con Suspense |
| `src/app/materiali-nuovo/materiali-superficie.tsx` | Client component principale, compone i 4 contenitori |
| `src/app/materiali-nuovo/hooks/use-superficie-state.ts` | Hook URL state: raggruppamento, filtri, finestra, drawer stack, preset |
| `src/app/materiali-nuovo/components/bussola-bar.tsx` | Contenitore A: breadcrumb + contatori (finti) + reset |
| `src/app/materiali-nuovo/components/pannello-controllo.tsx` | Contenitore B: preset, raggruppamento, filtri, ricerca |
| `src/app/materiali-nuovo/components/lista-materiali.tsx` | Contenitore C: 12 materiali finti, raggruppamento, semafori |
| `src/app/materiali-nuovo/components/drawer-stack.tsx` | Contenitore D: stack drawer max 3, Esc, reopen |
| `src/app/materiali-nuovo/components/drawer-materiale.tsx` | Placeholder drawer materiale |
| `src/app/materiali-nuovo/components/drawer-task.tsx` | Placeholder drawer task |
| `src/app/materiali-nuovo/components/drawer-calcoli.tsx` | Placeholder drawer calcoli |

## File modificati

- `src/components/layout/sidebar.tsx` — aggiunta voce "Superficie" nel menu

## Test interattivi

| # | Test | Stato |
|---|------|-------|
| 1 | Aprire `/materiali-nuovo` → 4 contenitori visibili | OK |
| 2 | Click preset → selettori si aggiornano | OK |
| 3 | Cambiare raggruppamento → lista si riorganizza | OK |
| 4 | Toggle categoria → filtro applicato | OK |
| 5 | Click voce lista → drawer placeholder appare | OK |
| 6 | "Apri task collegata" → secondo drawer | OK |
| 7 | Tre drawer affiancati | OK |
| 8 | Quarto drawer → primo sparisce | OK |
| 9 | Esc → ultimo si chiude | OK |
| 10 | Freccia riapri → riappare | OK |
| 11 | F5 → stato preservato da URL | OK |
| 12 | Reset zoom → tutto pulito | OK |

## Bug noti / limitazioni

- I contatori nella bussola sono hardcoded (192 voci, 12 rossi, 1847€). Saranno reattivi dopo il mattone 4.
- La lista ha 12 materiali finti. Verra sostituita con dati reali nel mattone 4.
- I drawer sono placeholder. Contenuto reale nei mattoni 5-7.
- Il pannello B non si nasconde su mobile. Layout mobile da affinare.
- La ricerca filtra solo i dati finti.
