# ============================================================
# NIMBUS 2026 — FIX SCHEDULING POST-ANALISI
# ============================================================

"""
Leggi CLAUDE.md per il contesto.

Dopo l'analisi dell'export, ci sono diversi problemi nello scheduling attuale. Correggi tutto e rigenera il report.

=================================================================
FIX 1 — FACCHINI IL 12 APRILE
=================================================================
I facchini il 12 aprile devono fare SOLO:
- Trasporti Casa Ale (con il furgone, sono operazioni non task)
- Espiantare allori (DOPO i trasporti)

Rimuovi dal 12 aprile tutte le task dei facchini TRANNE:
- "Espiantare due allori all'ingresso" → resta il 12
- "Espiantare fila allori" → resta il 12

Sposta le altre task dei facchini:
- "Posizionamento cisterna reflua" → 11 aprile (Alessandro la fa con la cisterna)
- "Posizionamento cisterne acqua potabile" → 11 aprile (Alessandro)
- "scavo allaccio acqua altezza cancelli" → 13 aprile (facchini disponibili dopo Guidonia)
- "rimuovere cisterna reflue cucina" → 11 aprile (facchini presenti, prima di cisterna nuova)
- "foderare cuscineria arredi" → 25 aprile (dopo lavaggio, prima arredi 28)

Per le cisterne: cambia il fornitore di "Posizionamento cisterna reflua" e "Posizionamento cisterne acqua potabile" da Facchini ad Alessandro.

=================================================================
FIX 2 — CARNARU: CALENDARIO CORRETTO
=================================================================
Carnaru lavora: 11, 14, 15, 16, 17, 18 (NON il 12 e 13).
- 11: smontaggio (ok)
- 12: NON lavora (è domenica trasporti)
- 13: NON lavora
- 14-16: 6 pax pedana + anfiteatri
- 17: 4 pax vialetto + camminamento
- 18: 4 pax swing + pedana chiosco

Sposta le task di Carnaru dal 12 ad altri giorni:
- "Rifacimento piano tavolo round" → già spostata a Pasquale, se non fatto fallo ora
- "Costruzione pedana banconi bar" → 18 aprile (con swing + pedana chiosco)

Aggiungi task di Carnaru il 15 e 16 (continuazione pedana+anfiteatri):
Le task "Costruzione nuovi anfiteatri" (10h), "Costruzione gradini" (4h), "Manutenzione tavole pedana" (12h) attualmente sono TUTTE il 14. Sono 26h — servono 3 giorni.
- 14: Costruzione nuovi anfiteatri inizio (data_inizio=14, data_fine=16)
- 14: Manutenzione tavole pedana inizio (data_inizio=14, data_fine=15)
- 14: Costruzione gradini (data_inizio=14, data_fine=14)
Le task che durano più giorni devono avere data_fine corretta.

Aggiungi anche: "Costruzione rampa accesso disabili" → NON l'11 (giorno di smontaggio), mettila il 17 o 18

=================================================================
FIX 3 — RINALDUZZI L'11
=================================================================
Rinalduzzi non ha task schedulate l'11. Il suo task "Trovare e confermare noleggio telai anfiteatri" è nel pre-cantiere, non nel cantiere.
Verifica: c'è una task per lo scarico telai? Se non c'è, il suo lavoro è un'OPERAZIONE (scarico materiali), non una task. In quel caso va bene — le operazioni trasporto dell'11 lo copriranno se il luogo è "Fornitore diretto" per Rinalduzzi.

=================================================================
FIX 4 — SEBACH L'11
=================================================================
Sebach ha due finestre: 11 e 17. Ma nello scheduling l'11 non appare.
Verifica: le task Sebach "bagno chimico" non esistono come task separate? Lo scarico del bagno chimico è un'operazione di Sebach, non una task.
Se non esiste, crea una task: "Scarico bagno chimico" in zona "Area Bagni", fornitore Sebach, data 11 aprile, durata 1h.

=================================================================
FIX 5 — LEONARDO L'11: CONFLITTO MATERIALI
=================================================================
Leonardo l'11 ha task che richiedono tester e scala da Casa Ale, ma Casa Ale arriva il 12.
- "controllo stripled Nuvola" → richiede tester rgbw da Casa Ale → sposta al 12 (o Leo porta il tester lui)
- "Verifica quadri stripled nuvola grande" → richiede tester → sposta al 12

Il tester da "Fornitore diretto" (Leonardo) è schedulato l'11 — quello va bene. Ma il tester rgbw da Casa Ale arriva il 12.
Decisione: le verifiche stripled che richiedono tester da Casa Ale vanno al 12. Le altre task di Leo restano l'11.

=================================================================
FIX 6 — TRASPORTI: DATE OPERAZIONI
=================================================================
Le date corrette per i trasporti:
- Casa Ale → 12 aprile (SOLO il 12, furgone)
- Guidonia → 13 aprile (NON il 12)
- Monterosi → 14 aprile (andata il 13, ritorno il 14)

Correggi nel DB:
UPDATE operazioni SET data_inizio = '2026-04-13', data_fine = '2026-04-13' 
WHERE luogo_id = (SELECT id FROM luoghi WHERE nome = 'Guidonia');

Le operazioni da Guidonia erano settate al 12, devono essere al 13.

=================================================================

Rigenera il report con --report dopo tutte le correzioni.
"""
