# Fix planning settimanale — task non visibili

## Causa: sospetto (b) — finestra data con timezone mismatch

`weekStart` era inizializzato con `new Date("2026-04-13")` che crea una data **UTC** (2026-04-13T00:00:00Z).

Le date delle task vengono parsate con `parseISO(task.data_inizio)` di date-fns, che crea date in **timezone locale** (es. 2026-04-13T00:00:00+02:00 per Roma = 2026-04-12T22:00:00Z).

In `getTaskDays()`:
- `clampStart = weekMonday` = 2026-04-13T00:00:00Z
- `clampEnd = taskEnd` = 2026-04-12T22:00:00Z (locale Roma)
- `isAfter(clampStart, clampEnd)` = TRUE (00:00 UTC > 22:00 UTC del giorno prima)
- Risultato: `return []` → task non inclusa nella settimana → cella vuota

## Fix

```diff
- const [weekStart, setWeekStart] = useState<Date>(
-   () => new Date("2026-04-13")
- );
+ const [weekStart, setWeekStart] = useState<Date>(
+   () => startOfWeek(new Date(), { weekStartsOn: 1 })
+ );
```

`startOfWeek(new Date(), { weekStartsOn: 1 })` crea la data del lunedi corrente in **timezone locale**, coerente con `parseISO` e con tutti gli altri `setWeekStart` (goToToday, goToPrevWeek, date picker).

## File modificato

`src/app/planning/planning-client.tsx` — riga 148-149

## Bug simili trovati

Nessun altro `new Date("YYYY-MM-DD")` nel file. Le funzioni `goToToday`, `goToPrevWeek`, `goToNextWeek` e il date picker usano gia `startOfWeek` o `addDays` che preservano il timezone.
