# Fix unita — lettura corretta del campo unita

## Diagnosi

Colonne "unit*" trovate nel DB:

| Tabella | Colonna | Valori |
|---------|---------|--------|
| `catalogo_materiali` | `unita_default` | "pz" per quasi tutti (default di auto-popolamento iniziale) |
| `materiali` (legami task) | `unita` | Valori reali: pz, lt, ml, mq, kg |
| `v_catalogo_acquisti` (vista) | `unita` | Alias di `catalogo_materiali.unita_default` |

La colonna `catalogo_materiali.unita` NON esiste. La colonna `catalogo_materiali.prezzo_unitario` NON esiste. Le migration documentate in CATALOGO_ACQUISTI.md (ALTER TABLE ADD COLUMN) non sono state applicate al DB.

Esempio concreto — "Vernice Bianca":
- `catalogo_materiali.unita_default` = "pz" (sbagliato)
- `materiali.unita` = "lt" (corretto)
- `v_catalogo_acquisti.unita` = "pz" (eredita da catalogo, sbagliato)

## Caso scelto: B

L'unita corretta vive in `materiali` (tabella legami task-materiale). Per ogni catalogo_id, si raccolgono tutti i valori di `materiali.unita` e si prende il piu frequente (moda). Fallback: `catalogo_materiali.unita_default`, poi "pz".

Motivazione: l'unita fu inserita correttamente quando i materiali vennero assegnati alle task (data entry originale). Il catalogo fu auto-popolato con "pz" come default generico.

## File patchati

| File | Modifica |
|------|----------|
| `src/app/materiali-nuovo/page.tsx` | Aggiunto `unita` al select di `materiali`: `.select("id, task_id, catalogo_id, quantita, unita")` |
| `src/app/materiali-nuovo/materiali-superficie.tsx` | Aggiunto `unita: string \| null` a `MaterialeTaskRow`. Rimossi `unita` e `prezzo_unitario` da `CatalogoRow` (non esistono nella tabella). Aggiunta logica moda: per ogni catalogo_id, conta le occorrenze di ogni unita nei legami task, prende la piu frequente. Usata in enrichment: `unitaMap.get(c.id) \|\| c.unita_default \|\| "pz"` |

## Esito test browser

Unita diverse rilevate nella lista su Vercel:

| Unita | Esempi |
|-------|--------|
| pz | Sottomisure legno, Vernice, Stripled |
| lt | Vernice Bianca, Acquaragia, Vernice Nera |
| ml | Tubo in Gomma, tubo pvc 32 pn16, tubo Carrabile 35 |
| mq | pavimento bullonato |

✅ 4 unita diverse su 192 materiali. Non piu "pz" ovunque.

Nota: `kg` non trovato tra i primi 201 item visibili. Potrebbe essere presente in item fuori scroll o non ancora assegnato a nessuna task.

## Sorprese

1. `v_catalogo_acquisti.unita` e aliasata da `unita_default`, quindi riporta valori sbagliati ("pz" anche per vernici). La vista NON e una fonte affidabile per l'unita.
2. `catalogo_materiali.prezzo_unitario` non esiste neanche. Il prezzo ora viene solo da `prezzo_unitario_default`, che e NULL per quasi tutti gli item (da qui i "0 €" nel mattone 4).
3. Le migration CATALOGO_ACQUISTI.md non sono mai state eseguite sul DB Supabase.
