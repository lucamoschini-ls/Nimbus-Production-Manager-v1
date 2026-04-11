# Mattone 1 — Migration DB sistema materiali

## SQL eseguiti (da eseguire nel Supabase SQL Editor)

```sql
-- PASSO 1: Backup
CREATE TABLE catalogo_materiali_backup_mattone1 AS SELECT * FROM catalogo_materiali;
CREATE TABLE materiali_una_tantum_backup_mattone1 AS SELECT * FROM materiali_una_tantum;

-- PASSO 2: Popolare materiali_disponibilita (192 righe a zero)
INSERT INTO materiali_disponibilita (catalogo_id, nome_materiale, qta_magazzino, qta_recupero, qta_ordinata)
SELECT id, nome, 0, 0, 0 FROM catalogo_materiali
ON CONFLICT (catalogo_id) DO NOTHING;

-- PASSO 3: Nuove colonne catalogo_materiali
ALTER TABLE catalogo_materiali
  ADD COLUMN IF NOT EXISTS categoria_comportamentale text NULL,
  ADD COLUMN IF NOT EXISTS tipo_voce text NOT NULL DEFAULT 'standard';

-- Opzionale: constraint
ALTER TABLE catalogo_materiali ADD CONSTRAINT chk_cat_comp
  CHECK (categoria_comportamentale IN ('strutturale', 'consumo', 'attrezzo', 'recupero', 'servizio') OR categoria_comportamentale IS NULL);
ALTER TABLE catalogo_materiali ADD CONSTRAINT chk_tipo_voce
  CHECK (tipo_voce IN ('standard', 'una_tantum'));

-- PASSO 6: Drop materiali_una_tantum (SOLO dopo verifica)
DROP TABLE materiali_una_tantum;
```

## Righe migrate da materiali_una_tantum a catalogo_materiali

**0 righe.** La tabella `materiali_una_tantum` era vuota (0 righe). Passo 4 (migrazione dati) saltato. Passo 6 (drop tabella) va eseguito comunque per eliminare la tabella vuota.

## File di codice patchati

| File | Modifiche |
|------|-----------|
| `src/app/calcolatore/page.tsx:12` | Query `materiali_una_tantum` → `catalogo_materiali WHERE tipo_voce='una_tantum'` |
| `src/app/calcolatore/actions.ts:41,47,53` | 3 server actions (add/update/delete) → operano su `catalogo_materiali` con `tipo_voce='una_tantum'` |
| `src/app/calcolatore/calcolatore-client.tsx:14` | Interface `UnaTantum` adattata a colonne catalogo_materiali |
| `src/app/calcolatore/calcolatore-client.tsx:175-189` | Mapping output adattato a nuovi nomi colonne |
| `src/app/calcolatore/calcolatore-client.tsx:305-325` | UI sezione una tantum adattata (rimossi qty e ordinato, adattati field names) |
| `CLAUDE.md` | Aggiunta sezione "Schema materiali — stato post-mattone 1" |

## Decisioni prese per disallineamenti

1. **Enum vs text**: Il prompt suggeriva `CREATE TYPE ... AS ENUM`. Non è possibile creare enum via anon key Supabase. Usato `text` con `CHECK` constraint per validazione. Funzionalmente equivalente.

2. **materiali_una_tantum vuota**: 0 righe da migrare. Il passo 4 (INSERT INTO catalogo FROM una_tantum) è stato saltato. Il codice è comunque patchato per leggere/scrivere dal nuovo posto.

3. **Colonne perse nella migrazione tipo**: La vecchia `materiali_una_tantum` aveva `quantita`, `ordinato`, `ordine` che non hanno corrispondenza diretta in `catalogo_materiali`. Dato che la tabella era vuota, nessun dato perso. Per le future voci una_tantum, `quantita` si gestirà via `materiali_disponibilita` e il flag `ordinato` è da ripensare.

## Stato /calcolatore post-migration

**Patchato, build OK.** La pagina compila e carica. La sezione "Una tantum" è semplificata (nome + fornitore + prezzo). Se le colonne DB non esistono ancora (passo 3 non eseguito), la query fallirà silenziosamente e la sezione sarà vuota.

## Test manuale consigliato

1. Aprire `/calcolatore` — deve caricare senza errori
2. Sezione Driver e Coefficienti — funzionano come prima
3. Sezione Disponibilita — deve mostrare 192 voci (dopo passo 2 SQL)
4. Sezione Una tantum — campo "Aggiungi", inserire un nome, verificare che appaia
5. Verificare che la voce aggiunta sia in `catalogo_materiali` con `tipo_voce='una_tantum'`
6. Eliminare la voce test — deve scomparire
