# Audit Sessione A — Nimbus Production Manager
Data: 2026-04-11

## Sintesi esecutiva
- Critici: 4
- Da sistemare: 9
- Ok: 12
- **Top 3 cose da fare prima del Calcolatore Materiali:**
  1. 🔴 Pulire le 37 violazioni dipendenze (molte obsolete dalla vecchia schedulazione)
  2. 🔴 Fissare data a "Nuvola chiosco · Posizionamento sul tetto" (unica task attiva senza data)
  3. 🔴 Aggiungere error handling alle 10+ mutazioni Supabase fire-and-forget nel Gantt e altrove

---

## Blocco 1 — Schema DB

### Tabelle principali 🟢
18 tabelle verificate, tutte accessibili e con schema coerente.

| Tabella | Righe | Nota |
|---------|-------|------|
| zone | 7 | CLAUDE.md dice 9, ma 2 zone cancellate (Pre-Cantiere, Permessi) |
| lavorazioni | 44 | |
| task | 141 | CLAUDE.md dice 213, ma molte cancellate/consolidate |
| materiali | 396 | |
| operazioni | 169 | |
| fornitori | 21 | CLAUDE.md dice 22 |
| catalogo_materiali | 192 | |
| task_dipendenze | 113 | |
| presenze | 1 | Quasi vuota |
| tipologie | 13 | |
| luoghi | 5 | |
| calcolatore_driver | 21 | Nuovo |
| calcolatore_coefficienti | 19 | Nuovo |
| materiali_disponibilita | 0 | Pronta per Calcolatore |
| materiali_una_tantum | 0 | Pronta per Calcolatore |
| permessi | 6 | Ancora presente (zona cancellata ma tabella no) |
| task_permessi | 0 | Vuota |
| tipologie_fornitore | 6 | |

**Nota**: CLAUDE.md va aggiornato (dice 213 task / 22 fornitori / 9 zone, i numeri reali sono 141 / 21 / 7).

### Viste 🟢
5 viste tutte funzionanti:

| Vista | Colonne | Status |
|-------|---------|--------|
| v_task_completa | 40 | OK |
| v_zona_riepilogo | 9 | OK |
| v_fornitori_riepilogo | 13 | OK |
| v_costi_zona | 3 | OK |
| v_catalogo_acquisti | 13 | OK |

### Tabelle backup 🟡
12 tabelle di backup presenti. Solo `task_backup_20260321` (183 righe) è esposta nell'API; le altre 11 esistono nel DB ma non sono nel schema cache PostgREST.

**Gravità: 🟡 Da sistemare** — Droppare tutte con un singolo script SQL. Non bloccanti ma inquinano lo schema.

```sql
DROP TABLE IF EXISTS task_backup_20260321, task_backup_20260409,
  task_backup_chiosco_rename, task_backup_ingresso_rename,
  task_backup_aperitivo_rename, task_backup_pedana_rename,
  task_backup_finale_rename, lavorazioni_backup_pedana,
  lavorazioni_backup_finale, lavorazioni_backup_chiosco,
  zone_backup_finale, operazioni_backup_20260409;
```

---

## Blocco 2 — Schedulazione

### Task senza data 🔴
2 task attive senza data_inizio:

| Task | Fornitore | Azione |
|------|-----------|--------|
| Cuscineria aperitivo · Lavaggio | nessuno | 🟢 Intenzionale |
| **Nuvola chiosco · Posizionamento sul tetto (gru Sebach)** | Pasquale | 🔴 **Deve essere 17/04** |

### Violazioni dipendenze 🔴 CRITICO
**37 violazioni.** Due categorie:

**Same-day (22 casi)** — Task e dipendenza nello stesso giorno. Potenzialmente intenzionali (sequenziali nello stesso giorno), ma il DB non distingue mattina/pomeriggio.

**Violazioni reali (15 casi)** — Task inizia PRIMA che la dipendenza finisca:

| Task | Inizio | Dipendenza | Fine | Gap |
|------|--------|------------|------|-----|
| Pedana centrale · Manut. tavole | 14/04 | Stativi casse (Tecnoconf.) | 25/04 | **-11gg** |
| Boiserie manutenzione | 14/04 | Autoclave allaccio | 22/04 | **-8gg** |
| Pedana swing · Verniciatura | 19/04 | Fondale nuvolette | 25/04 | **-6gg** |
| Sanitrit · Scavo buca | 12/04 | Container bagni scarico | 17/04 | **-5gg** |
| Porfido · Pulizia | 18/04 | Autoclave allaccio | 22/04 | **-4gg** |
| Casetta rossa | 16/04 | Prato tappeti tecnica | 20/04 | **-4gg** |
| Fondale paline installaz. | 21/04 | Fondale piante posiz. | 25/04 | **-4gg** |
| Fondale verniciatura paline | 19/04 | Fondale paline installaz. | 28/04 | **-9gg** |
| Pedana centrale · Manut. tavole | 14/04 | Cavi DMX | 16/04 | **-2gg** |
| Cassone costruzione | 14/04 | Serrande imp. elettrico | 16/04 | **-2gg** |
| Bottigliera sportelli | 14/04 | Bottigliera stripled | 16/04 | **-2gg** |
| Struttura swing verifica | 16/04 | Pedana swing costruzione | 18/04 | **-2gg** |
| Cancellata oscuramento | 16/04 | Container bagni | 17/04 | **-1gg** |
| Pedana chiosco verniciatura | 17/04 | Pedana chiosco manut. | 18/04 | **-1gg** |
| Nuvole pali/pulizia | 21/04 | Nuvole riposiz. | 28/04 | overlap |

**Causa**: Dipendenze create nella schedulazione automatica iniziale e non aggiornate dopo la rischedulazione manuale. Molte sono probabilmente obsolete.

**Azione consigliata**: Revisione manuale delle 113 dipendenze. Rimuovere quelle obsolete, tenere solo quelle strutturali (es. "costruzione → verniciatura").

### Finestre fornitore 🟢
0 violazioni. Tutte le task sono entro la finestra del proprio fornitore.

### Sovraccarico giornaliero 🟡

| Fornitore | Data | Ore | Note |
|-----------|------|-----|------|
| **Pasquale** | 20/04 | **31.5h** | 4 pax → 7.9h/pax OK |
| Carnaru | 14/04 | 26h | 6 pax dichiarati → 4.3h/pax OK |
| Pasquale | 14/04 | 21.5h | 2 pax → 10.75h/pax OK |
| Pasquale | 13/04 | 20h | 2 pax → 10h/pax OK |
| Pasquale | 15/04 | 17h | 2 pax → 8.5h/pax OK |
| Pasquale | 16/04 | 16h | 2 pax → 8h/pax OK |
| Leonardo | 18/04 | 15h | 1 pax → **15h/pax TROPPO** |
| Pasquale | 17/04 | 15h | 4 pax → 3.75h/pax OK |
| Carnaru | 18/04 | 13h | 4 pax → 3.25h/pax OK |

**Gravità: 🟡** — La maggior parte dei sovraccarichi è giustificata dalla parallelizzazione multi-persona. **Leonardo il 18/04 con 15h è l'unico reale overload** (lavora da solo).

---

## Blocco 3 — Razionalizzazione

### Titoli non standard 🟢
**1 sola task** non segue il formato "Elemento · Azione":
- `Scarico bagno chimico` (Sebach)

### Duplicati 🟢
0 titoli duplicati.

### Lavorazioni vuote 🟢
0 lavorazioni senza task.

### Task orfane 🟢
Tutte le task hanno lavorazione valida.

### Materiali catalogo
192 voci nel catalogo. Non verificati duplicati fuzzy in questa sessione (servirebbe query LOWER/TRIM con pattern matching).

---

## Blocco 4 — Codice frontend

### Bottoni "Salva" 🟢
6 istanze, tutte in contesti di **creazione** (non editing). Coerente con la regola auto-save.

### useEffect sospetti 🟡
- `gantt-client.tsx:494` — useEffect drag handler non include `tasks` e `impact` nelle deps. Rischio di closure stale durante drag. **Basso** in pratica (drag è breve).
- 3 eslint-disable per exhaustive-deps nel Gantt — necessari per evitare loop, accettabili.

### Supabase senza error handling 🔴 CRITICO
**10+ mutazioni client-side senza error handling** in 4 file:

| File | Linee | Tipo |
|------|-------|------|
| gantt-client.tsx | 479, 1144 | `.then()` vuoto — fire-and-forget |
| gantt-client.tsx | 1151, 1156 | `await` senza check `{error}` |
| scheduling-tab.tsx | 189, 191 | `await` senza check |
| materiali-client.tsx | 765, 832-834 | `await` senza check |
| use-impact-analysis.ts | 93-102 | Cascade updates senza check |

**Rischio**: Se il network fallisce durante un drag nel Gantt, la barra si muove localmente ma il DB resta invariato. L'utente non viene mai avvertito.

### useImpactAnalysis 🟢
Hook usato correttamente in task-detail-sheet (data_fine) e gantt (drag). scheduling-tab usa le utility raw con "Verifica dipendenze" esplicita — coerente col flusso batch.

### Gantt drag 🟢
Corretto: chiama analyzeImpact → dialog "Sposta tutto/Solo questa/Annulla" → cascade update opzionale.

### Loading states 🟡
**4 pagine senza loading.tsx**: Planning, Trasporti, Presenze, Impostazioni. Mostrano blank durante fetch.

---

## Blocco 5 — Frizioni cognitive

### 🔴 1. Confusione durata_ore vs ore_lavoro
`task-detail-sheet.tsx:479` vs `:522`

Due campi che suonano simili in sezioni diverse:
- **Durata (ore)** in "Pianificazione" = ore orologio cantiere
- **Ore lavoro** in "Costi" (collassato di default) = ore-uomo per calcolo costi

Non c'è spiegazione della differenza. `ore_lavoro` è manuale, non auto-calcolato da `durata × persone`. Luca potrebbe confonderli o non aprire mai la sezione Costi.

**Azione**: Rendere `ore_lavoro` auto-calcolato OPPURE aggiungere hint espliciti.

### 🟡 2. Sezione Costi collassata di default
`task-detail-sheet.tsx:507` — `defaultOpen={false}`

Luca potrebbe pianificare settimane senza mai compilare persone/ore_lavoro/costo_ora. Nessun warning se durata è compilata ma costi no.

### 🟡 3. Campi costo senza placeholder/EUR
6 campi costo in task-detail-sheet (`:513, :522, :531, :549, :550, :551`) — input vuoti senza placeholder, senza simbolo €, senza hint su formato.

### 🟡 4. Durate accettano decimali invisibilmente
7 input `type="number"` con `parseFloat` ma senza `step` attribute. Il browser spinner incrementa di 1, ma 0.5 è accettato. Luca potrebbe non sapere che può inserire mezz'ore.

### 🟡 5. Stato con replace invece di label
6 punti nel codice usano `.replace(/_/g, " ")` invece del pattern `STATO_LABELS[stato]` usato altrove. Produce testo lowercase non capitalizzato ("in attesa fornitore" invece di "In attesa fornitore").

File/righe: fornitori-client:367, gantt-client:1202, planning-client:439, lavorazioni-client:274, task-detail-sheet:305, trasporti-client:194.

### 🟡 6. Coefficienti calcolatore senza contesto
`calcolatore-client.tsx` — Molti coefficienti (es. "morali_per_ml_pedana = 1.7") richiedono conoscenza tecnica specifica. I tooltip aiutano ma molti `valore_default` sono 0. Luca serve un carpentiere accanto.

### 🟢 7. Date solo giornaliere
Nessun campo datetime-local o time. Tutto `type="date"`. Coerente con il modello "giornata lavorativa 7-18".

### 🟢 8. Prezzo catalogo
Ben implementato con €/unità visibile.

---

## Appendice — Query SQL usate

Tutte le query eseguite via Supabase JS client (anon key), metodo SELECT read-only.

```sql
-- Conteggi
SELECT COUNT(*) FROM [tabella]  -- per ogni tabella

-- Viste
SELECT * FROM v_task_completa LIMIT 1  -- ecc.

-- Task senza data
SELECT titolo, fornitore_nome, stato FROM v_task_completa
WHERE data_inizio IS NULL AND stato != 'completata'

-- Violazioni dipendenze
-- Per ogni riga in task_dipendenze (113 righe):
-- IF task.data_inizio <= dep.data_fine THEN violazione

-- Finestre fornitore
-- Check data_inizio vs range dichiarati nel brief

-- Ore per giorno
SELECT fornitore_nome, data_inizio, SUM(durata_ore)
FROM v_task_completa
GROUP BY fornitore_nome, data_inizio
HAVING SUM(durata_ore) > 11

-- Titoli non standard
SELECT titolo FROM task WHERE titolo NOT LIKE '%·%' AND stato != 'completata'

-- Duplicati
SELECT titolo, COUNT(*) FROM task GROUP BY titolo HAVING COUNT(*) > 1

-- Lavorazioni vuote
SELECT l.nome FROM lavorazioni l LEFT JOIN task t ON t.lavorazione_id = l.id
GROUP BY l.id HAVING COUNT(t.id) = 0

-- Backup tables
SELECT * FROM [backup_table] LIMIT 1  -- per verificare esistenza

-- Frontend checks
grep -rn "Salva" src/app/ --include="*.tsx"
grep -rn "eslint-disable.*exhaustive" src/app/ --include="*.tsx"
grep -rn "useImpactAnalysis" src/ --include="*.tsx"
grep -rn ".then()" src/app/ --include="*.tsx"
```
