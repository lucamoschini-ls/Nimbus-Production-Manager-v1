# ============================================================
# NIMBUS 2026 — CATALOGO CENTRO ACQUISTI
# ============================================================
# Questa feature trasforma il catalogo materiali nella fonte
# di verità per prezzi, disponibilità e acquisti.
# TESTA OGNI STEP prima di procedere al successivo.
# ============================================================

"""
Leggi CLAUDE.md per il contesto.

OBIETTIVO: Il catalogo materiali diventa il centro di controllo acquisti. Prezzo, unità e disponibilità si gestiscono nel catalogo e si propagano a tutte le istanze nelle task. Nuova tab "Lista Spesa" per la lista acquisti aggregata.

=================================================================
STEP 1 — DATABASE
=================================================================

ALTER TABLE catalogo_materiali ADD COLUMN IF NOT EXISTS unita text;
ALTER TABLE catalogo_materiali ADD COLUMN IF NOT EXISTS prezzo_unitario numeric;
ALTER TABLE catalogo_materiali ADD COLUMN IF NOT EXISTS quantita_disponibile_globale numeric DEFAULT 0;
ALTER TABLE catalogo_materiali ADD COLUMN IF NOT EXISTS fornitore_preferito text;

Aggiungi "mc" alla lista delle unità di misura ovunque appaiano i dropdown unità nell'app (nei materiali, nel catalogo, ecc). Lista completa: pz, mq, ml, kg, lt, mc, set, kit, rotolo.

Crea una vista per i dati aggregati:
CREATE OR REPLACE VIEW v_catalogo_acquisti AS
SELECT 
  c.id,
  c.nome,
  c.tipologia_materiale,
  c.unita,
  c.prezzo_unitario,
  c.quantita_disponibile_globale,
  c.fornitore_preferito,
  c.provenienza_default,
  c.note,
  COALESCE(SUM(m.quantita), 0) as quantita_totale_necessaria,
  COUNT(DISTINCT m.task_id) as num_task,
  GREATEST(COALESCE(SUM(m.quantita), 0) - COALESCE(c.quantita_disponibile_globale, 0), 0) as quantita_da_acquistare,
  CASE 
    WHEN c.prezzo_unitario IS NOT NULL 
    THEN GREATEST(COALESCE(SUM(m.quantita), 0) - COALESCE(c.quantita_disponibile_globale, 0), 0) * c.prezzo_unitario
    ELSE NULL 
  END as costo_stimato
FROM catalogo_materiali c
LEFT JOIN materiali m ON m.catalogo_id = c.id
GROUP BY c.id;

TESTA: SELECT * FROM v_catalogo_acquisti LIMIT 5; — deve mostrare i dati aggregati.

=================================================================
STEP 2 — PROPAGAZIONE PREZZO E UNITÀ
=================================================================

Quando l'utente modifica prezzo_unitario o unita nel catalogo:
- Aggiorna il catalogo
- Propaga automaticamente a TUTTE le istanze in materiali:
  UPDATE materiali SET prezzo_unitario = [nuovo prezzo], unita = [nuova unita] WHERE catalogo_id = [id catalogo]
- Questo avviene nella stessa server action / chiamata Supabase

Non sovrascrivere istanze che hanno un prezzo custom diverso? NO — per semplicità, il catalogo è la fonte di verità. Il prezzo nel catalogo sovrascrive tutto. Se in futuro servono override, li aggiungiamo.

=================================================================
STEP 3 — UI CATALOGO RIPENSATA
=================================================================

Riscrivi completamente la tab "Catalogo" nella pagina /materiali.

HEADER:
┌──────────────┬───────────────────┬──────────────┬──────────────┐
│ Voci: 86     │ Da acquistare: 45 │ Completi: 12 │ Costo totale │
│              │ (rosso)           │ (verde)      │ 3.200 €      │
└──────────────┴───────────────────┴──────────────┴──────────────┘

FILTRI (con label fissa sopra):
[Tipologia: Tutte ▾]  [Stato: Tutti ▾]  [🔍 Cerca...]

Stato: "Da acquistare" (quantita_da_acquistare > 0) / "Completo" (quantita_da_acquistare = 0) / "Prezzo mancante" (prezzo_unitario IS NULL)

CARD CATALOGO — Layout pulito in 3 sezioni:

┌──────────────────────────────────────────────────────────────┐
│ Vernice per legno esterno                      [consumo] [🗑]│
│                                                              │
│ ─── Dettagli ──────────────────────────────────────────────  │
│ Unità         Prezzo unitario      Fornitore preferito       │
│ [lt ▾]        [12,00] €/lt         [Tecnomat          ]     │
│                                                              │
│ ─── Quantità ─────────────────────────────────────────────   │
│ Necessario        Disponibile        Da acquistare           │
│ 25 lt (6 task)    [8] lt             17 lt                   │
│                                                              │
│ ─── Costo ────────────────────────────────────────────────   │
│ Costo stimato acquisto: 204,00 €                             │
│ (17 lt × 12,00 €/lt)                                        │
│                                                              │
│ ─── Usato in (click per espandere) ──────────────────────    │
│ ▸ Ingresso > Vialetto > Verniciatura vialetto      5 lt      │
│ ▸ Aperitivo > Swing > Verniciatura pedana swing    3 lt      │
│ ▸ Chiosco > Manut. > Verniciatura lati             4 lt      │
│ ▸ Pedana > Manut. > Riverniciatura pedana          8 lt      │
│ ▸ Generale > Vasi > Verniciatura vasi              5 lt      │
└──────────────────────────────────────────────────────────────┘

CAMPI EDITABILI (auto-save su blur):
- Unità (dropdown)
- Prezzo unitario (number input con €)
- Fornitore preferito (text input)
- Disponibile (number input)
- Tipologia (dropdown: consumo/strutturale/attrezzo)
- Nome (editabile con doppio click)

CAMPI CALCOLATI (read-only, aggiornati in tempo reale):
- Necessario: SUM di quantita da tutte le istanze
- Da acquistare: Necessario - Disponibile
- Costo stimato: Da acquistare × Prezzo unitario
- Num task: conteggio istanze

"Usato in": sezione collassabile (chiusa di default). Click espande la lista task.
Ogni riga task è cliccabile → apre il pannello dettaglio task.

I contatori in alto si aggiornano in tempo reale quando modifico un campo.

DESIGN:
- Card con sfondo bianco, border-radius 12px, border 1px #e5e5e7
- Sezioni dentro la card separate da linee sottili #f0f0f0
- Label in grigio #86868b, 10px, Outfit 500
- Valori in nero #1d1d1f, 13px, Outfit 400
- "Da acquistare" in rosso se > 0, verde se = 0
- "Costo stimato" in grassetto
- Padding generoso: 16px dentro la card, 12px tra le sezioni

=================================================================
STEP 4 — TAB "LISTA SPESA"
=================================================================

Aggiungi una terza tab nella pagina /materiali: [Materiali] [Catalogo] [Lista Spesa]

La Lista Spesa mostra SOLO i materiali con quantita_da_acquistare > 0.

DUE VISTE (toggle): [Per fornitore] [Per tipologia]

VISTA "PER FORNITORE":
Raggruppa per fornitore_preferito del catalogo.

┌──────────────────────────────────────────────────────────────┐
│ TECNOMAT                                    3 voci  241 €   │
│ ─────────────────────────────────────────────────────────── │
│ Vernice per legno esterno    17 lt    12 €/lt     204 €     │
│ Acquaragia                    5 lt     5 €/lt      25 €     │
│ Viti 4x35                   200 pz    0,06 €/pz   12 €     │
├──────────────────────────────────────────────────────────────┤
│ LEROY MERLIN                                1 voce  350 €   │
│ ─────────────────────────────────────────────────────────── │
│ Prato sintetico              50 mq    7 €/mq     350 €     │
├──────────────────────────────────────────────────────────────┤
│ DA DEFINIRE                                 8 voci  420 €   │
│ ─────────────────────────────────────────────────────────── │
│ Terra                        20 mc    10 €/mc    200 €      │
│ Sabbia                       15 kg     2 €/kg     30 €      │
│ ...                                                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│          TOTALE ACQUISTI: 1.011 €                            │
│                                                              │
│          [Stampa lista] [Esporta CSV]                        │
└──────────────────────────────────────────────────────────────┘

Materiali senza fornitore_preferito vanno nel gruppo "DA DEFINIRE".

VISTA "PER TIPOLOGIA":
Stessa struttura ma raggruppata per tipologia_materiale (consumo/strutturale/attrezzo).

FUNZIONALITÀ:
- Ogni riga è cliccabile → espande i dettagli (su quali task serve, quando serve)
- "Stampa lista" → apre window.print() con layout ottimizzato per stampa (nasconde sidebar, header, mostra solo la lista)
- "Esporta CSV" → download CSV con colonne: nome, quantità, unità, prezzo, costo, fornitore
- Il fornitore_preferito è editabile inline anche dalla lista spesa

=================================================================
STEP 5 — TEST COMPLETO
=================================================================

Dopo aver implementato tutto, TESTA:

1. Vai nel Catalogo, trova un materiale usato in più task (es. "Acquaragia")
2. Imposta: unità = lt, prezzo = 8 €/lt, disponibile = 2, fornitore = Tecnomat
3. Verifica che "Necessario" mostri la somma corretta da tutte le task
4. Verifica che "Da acquistare" = Necessario - 2
5. Verifica che "Costo stimato" = Da acquistare × 8
6. Vai nella tab Materiali (prima tab) e verifica che le istanze di Acquaragia abbiano prezzo 8 €/lt e unità lt
7. Vai nella tab Lista Spesa e verifica che Acquaragia appaia sotto "Tecnomat" con la quantità e il costo corretti
8. Cambia il prezzo nel catalogo a 10 €/lt → il costo stimato si aggiorna → le istanze nelle task si aggiornano
9. Verifica i contatori in alto (voci, da acquistare, costo totale)
10. Click su "Esporta CSV" → scarica il file

Se anche UNO di questi step fallisce, fixa prima di dichiarare completato.
"""
