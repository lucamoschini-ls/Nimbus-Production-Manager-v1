# Fix mattone 4 — Lettura da v_catalogo_acquisti

## File modificati

| File | Modifiche |
|------|-----------|
| `src/app/materiali-nuovo/page.tsx` | Fonte primaria cambiata da `catalogo_materiali` a `v_catalogo_acquisti`. Aggiunta fetch secondaria di `catalogo_materiali` solo per `categoria_comportamentale` e `tipo_voce` (non presenti nella vista). Rimossa colonna `unita` dalla fetch di `materiali` (non serve piu). |
| `src/app/materiali-nuovo/materiali-superficie.tsx` | Tipi riscritti: `CatalogoViewRow` (vista), `CatalogoExtraRow` (categoria/tipo_voce), `MaterialeTaskRow` ridotto a `task_id, catalogo_id`. Rimossa tutta la logica moda (unitaCounts, unitaMap, fabbisognoMap). Enrichment ora legge direttamente dalla vista: `c.unita`, `c.prezzo_unitario`, `c.quantita_totale_necessaria`, `c.quantita_da_acquistare`, `c.costo_stimato`. |

## Conferma rimozione logica moda

Rimosso completamente:
- `unitaCounts` (Map di Map per conteggio unita per catalogo_id)
- `unitaMap` (risultato della moda)
- `fabbisognoMap` (aggregazione client-side delle quantita da materiali)
- Accesso `unitaMap.get(c.id)` sostituito con `c.unita` dalla vista

## Esiti test browser

| # | Test | Esito | Note |
|---|------|-------|------|
| 1 | Acquaragia mostra "lt" e fornitore "Tecnomat" | ✅ | `unita: "lt"` dalla vista, `fornitore_preferito: "Tecnomat"`. Prezzo 8€ presente nei dati ma costo = 0€ perche da_acquistare = 0 |
| 2 | Fornitori commerciali reali nel filtro | ✅ | Da assegnare, Tecnomat, Vivai Acciarri, lumiroma — nomi commerciali, non provenienza |
| 3 | Raggruppamento per categoria comportamentale | ⚠️ | "SENZA CATEGORIA (192)" — tutti i 192 item hanno `categoria_comportamentale = NULL`. Dato corretto (il catalogo non e stato classificato). Il raggruppamento per Tipologia (consumo/strutturale/attrezzo) funziona e mostra gruppi reali |
| 4 | Costo totale > 0 | ⚠️ | 0 € — gli item con prezzo impostato hanno `da_acquistare = 0`, e gli item con `da_acquistare > 0` non hanno prezzo. Dato corretto, non bug di codice |
| 5 | Console: 0 errori critici | ✅ | 0 errori, 1 warning (meta tag deprecato) |

## Dati

- **Fornitori distinti**: 4 (Da assegnare, Tecnomat, Vivai Acciarri, lumiroma)
- **Categorie comportamentali distinte**: 0 reali (tutto NULL) — la classificazione non e stata fatta
- **Tipologie materiale distinte**: 3 (consumo, strutturale, attrezzo) — via `tipologia_materiale`
- **Distribuzione unita**: pz=190, lt=1, ml=1 (dalla vista `unita_default` aliasata)
- **Costo totale da comprare**: 0 € (nessun item ha contemporaneamente prezzo E da_acquistare > 0)

## Divergenze rispetto alla pagina vecchia

1. **Categoria**: la pagina vecchia mostra chip `tipologia_materiale` (consumo/strutturale/attrezzo), la superficie mostra `categoria_comportamentale` (tutto NULL). Sono due campi diversi: `tipologia_materiale` e la classificazione originale (3 valori), `categoria_comportamentale` e quella del FARO sezione 1 (5 valori, non ancora popolata). La superficie usa il campo corretto per l'architettura futura.
2. **Ordine**: la pagina vecchia non ordina per nome; la superficie ordina A-Z (dalla vista con `.order("nome")`).
3. **Prezzo unitario visibile**: la pagina vecchia mostra "8 €/lt" accanto al nome; la superficie mostra solo il costo totale da comprare (0 €). Il prezzo unitario e nei dati (`MaterialeArricchito.prezzo_unitario`) ma non esposto nella riga della lista.
