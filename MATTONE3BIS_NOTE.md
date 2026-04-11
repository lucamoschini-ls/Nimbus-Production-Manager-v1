# Mattone 3-bis — InfoTooltip + applicazione bug noti calcolatore

## Componente installato

- Tooltip shadcn installato via `npx shadcn@latest add tooltip` → `src/components/ui/tooltip.tsx` (usa `@base-ui/react/tooltip`)
- `<TooltipProvider>` aggiunto in `layout.tsx` come wrapper di tutto il body
- `src/components/ui/info-tooltip.tsx` creato con varianti `info` (? grigia) e `warning` (triangolo arancione)

## Applicazione ai 4 bug noti

| # | Bug | File:riga | Chiave | Testo tooltip |
|---|-----|-----------|--------|---------------|
| 1 | Scarto verniciature non-tdm | calcolatore-client.tsx (coeff `scarto_perc_default`) | `scarto_perc_default` | "Questo scarto viene applicato solo alla vernice testa di moro. Per impregnante, nera e oro lo scarto e fissato al 10%..." |
| 2 | Lunghezza rotolo prato | calcolatore-client.tsx (driver `n_rotoli_prato`) | `n_rotoli_prato` | "Il calcolo dei picchetti assume che ogni rotolo sia lungo 25 metri..." |
| 3 | Pennelli/rulli ×4 | calcolatore-client.tsx (driver `n_pax_verniciatura_max`) | `n_pax_verniciatura_max` | "Pennelli e rulli vengono moltiplicati per 4 (quattro tipi di vernice)..." |
| 4 | Fallback larghezza tavola | calcolatore-client.tsx (coeff `m_tavola_larghezza`) | `m_tavola_larghezza` | "Se questo valore non viene letto correttamente, il calcolo usa 0.15m come valore di sicurezza..." |

## Test manuale

1. Aprire `/calcolatore`
2. Sezione Coefficienti > Scarti: accanto a "Scarto % (default)" → icona triangolo arancione
3. Sezione Coefficienti > Carpenteria: accanto a "Tavola legno: larghezza" → icona triangolo arancione
4. Sezione Driver > Prato: accanto a "Numero rotoli prato" → icona triangolo arancione
5. Sezione Driver > Verniciatura: accanto a "Numero max pax in verniciatura simultanea" → icona triangolo arancione
6. Hover su ciascuna icona → tooltip con spiegazione in italiano
