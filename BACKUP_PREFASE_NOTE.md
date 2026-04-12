# Backup prefase catalogo — 12 aprile 2026

## Stato

Le tabelle backup devono essere create manualmente nel Supabase Dashboard SQL Editor (PostgREST non supporta DDL).

## SQL da eseguire nel Dashboard

```sql
CREATE TABLE catalogo_materiali_backup_prefase AS SELECT * FROM catalogo_materiali;
CREATE TABLE materiali_backup_prefase AS SELECT * FROM materiali;
CREATE TABLE materiali_disponibilita_backup_prefase AS SELECT * FROM materiali_disponibilita;
```

## Conteggi attesi

| Tabella | Righe attese |
|---------|-------------|
| catalogo_materiali / backup | 192 |
| materiali / backup | 396 |
| materiali_disponibilita / backup | 192 |

## Verifica post-creazione

```sql
SELECT 
  (SELECT COUNT(*) FROM catalogo_materiali) AS cat_orig,
  (SELECT COUNT(*) FROM catalogo_materiali_backup_prefase) AS cat_bk,
  (SELECT COUNT(*) FROM materiali) AS leg_orig,
  (SELECT COUNT(*) FROM materiali_backup_prefase) AS leg_bk,
  (SELECT COUNT(*) FROM materiali_disponibilita) AS disp_orig,
  (SELECT COUNT(*) FROM materiali_disponibilita_backup_prefase) AS disp_bk;
```

Tutte le coppie orig/bk devono coincidere.

## Piano di rollback (NON eseguire ora)

Se in futuro serve ripristinare lo stato pre-fase:

```sql
TRUNCATE materiali CASCADE;
TRUNCATE materiali_disponibilita;
TRUNCATE catalogo_materiali CASCADE;
INSERT INTO catalogo_materiali SELECT * FROM catalogo_materiali_backup_prefase;
INSERT INTO materiali_disponibilita SELECT * FROM materiali_disponibilita_backup_prefase;
INSERT INTO materiali SELECT * FROM materiali_backup_prefase;
```
