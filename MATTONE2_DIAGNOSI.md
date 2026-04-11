# Mattone 2 — Diagnosi pre-estrazione

## Funzioni di calcolo in calcolatore-client.tsx

Una sola funzione: `calcolaMateriali()` alle righe 52-129. Prende `driverMap` e `coeffMap` (Record<string,number>), produce `CalcResult[]`.

### Formule identificate (per gruppo)

**CARPENTERIA (righe 64-81)**
- `mq_tavola = m_tavola_lunghezza * m_tavola_larghezza`
- `mq_pedane = sum(5 driver pedane)`
- `n_tavole = ceil((mq_pedane / mq_tavola) * scarto)` dove scarto = 1 + scarto_perc_default/100
- `viti_5x50 = n_tavole * viti_5x50_per_tavola`
- `viti_6x120 = n_tavole * viti_6x120_per_tavola`
- `ml_ped = mq_pedane / m_tavola_larghezza` (fallback 0.15)
- `morali = ceil(ml_ped * morali_per_ml_pedana)`
- `legno_vasi = ceil(ml_vasi_tot * legno_per_ml_vaso)` (se > 0)
- `viti_vasi = ceil(ml_vasi_tot * viti_per_ml_vaso)` (se > 0)

**VERNICIATURA (righe 83-102)**
- `L_tdm = ceil(mq_vern_testa_di_moro / resa_testa_di_moro * scarto)` (scarto 1.1)
- `L_imp = ceil(mq_vern_impregnante / resa_impregnante * 1.1)`
- `L_nera = ceil(mq_vern_nera / resa_vernice_nera * 1.1)`
- `L_oro = ceil(mq_vern_oro / resa_vernice_oro * 1.1)`
- `acquaragia = ceil(L_totale * perc_acquaragia / 100)`
- `pennelli = n_pax * 4`
- `rulli = n_pax * 4`

Nota: L_tdm usa `scarto` (da scarto_perc_default), ma L_imp/L_nera/L_oro usano 1.1 hardcoded. Incoerenza.

**STRIPLED (righe 104-110)**
- `profilo = ceil(ml_stripled_lineari)`
- `viti_profilo = ceil(ml_strip * viti_per_ml_profilo)`
- `box = ceil(ml_strip / ml_stripled_per_box)`

**ELETTRICO NUVOLE (righe 112-120)**
- `n_tot_nuvole = n_nuvole_pedana + n_round_totali + n_nuvole_altre`
- `dist = m_distanza_nuvola_regia + m_cavo_citofonico_per_nuvola`
- `cavo_citofonico = ceil(n_tot * dist)`
- `corrugato = ceil(n_tot * dist)` (= cavo citofonico)
- `strip_rgbw = ceil(n_tot * m_strip_rgbw_per_nuvola)`
- `wago = ceil(n_tot * wago_per_nuvola)`

**PRATO (righe 122-126)**
- `picchetti = ceil((n_rotoli - 1) * 25 * picchetti_per_ml_giunzione)`
- Costante hardcoded: `25` (lunghezza rotolo default 25m). NON è nel DB.

## Costanti hardcoded non nel DB

1. `1.1` — moltiplicatore scarto verniciatura per impregnante/nera/oro (righe 85-87). Dovrebbe usare `scarto_perc_default` come fa testa-di-moro.
2. `25` — lunghezza rotolo prato in metri (riga 125). Non esiste come driver né coefficiente.
3. `4` — moltiplicatore pennelli/rulli per pax (righe 100-101). "4 tipi vernice". Hardcoded.
4. `0.15` — fallback larghezza tavola (riga 72). Redundante col coefficiente `m_tavola_larghezza`.

## Output atteso con dati attuali del DB

Con mq_pedana_centrale=350 (unico driver >0 significativo):
- mq_tavola = 4 * 0.15 = 0.6
- n_tavole = ceil((350/0.6) * 1.1) = ceil(583.33 * 1.1) = ceil(641.67) = 642
- viti_5x50 = 642 * 15 = 9630
- viti_6x120 = 642 * 5 = 3210
- ml_ped = 350 / 0.15 = 2333.33
- morali = ceil(2333.33 * 1.7) = ceil(3966.67) = 3967

Con n_nuvole=11+3+0=14, dist=0+5=5:
- cavo = ceil(14*5) = 70
- corrugato = 70
- strip_rgbw = ceil(14*2) = 28
- wago = ceil(14*4) = 56

Con n_pax=4: pennelli=16, rulli=16
Con n_rotoli=9: picchetti = ceil(8*25*5) = ceil(1000) = 1000
