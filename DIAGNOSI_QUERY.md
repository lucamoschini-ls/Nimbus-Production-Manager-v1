# Diagnosi query — tab Catalogo /materiali

## 1. File e riga della query Supabase

```typescript
// src/app/materiali/page.tsx:13
supabase.from("v_catalogo_acquisti").select("*").order("nome"),
```

Risultato passato al client component come prop `catalogo` con tipo `CatAgg` (line 48-52).

## 2. Tabella o vista interrogata

**Vista `v_catalogo_acquisti`** — definita in CATALOGO_ACQUISTI.md, fa JOIN tra `catalogo_materiali` e `materiali` per aggregare quantita/costi. Aliasa le colonne del catalogo con nomi piu corti.

## 3. Schema reale di `catalogo_materiali`

Output da `select("*")` su PostgREST — 12 colonne:

| Colonna | Presente | Esempio (Acquaragia) |
|---------|----------|---------------------|
| `id` | si | `dc9dea1a-4a40-4376-80f9-7d890cf23717` |
| `nome` | si | `Acquaragia` |
| `tipologia_materiale` | si | `consumo` |
| `unita_default` | si | `lt` |
| `prezzo_unitario_default` | si | `8` |
| `provenienza_default` | si | `acquisto` |
| `note` | si | `null` |
| `created_at` | si | `2026-03-20T22:38:26.610219+00:00` |
| `quantita_disponibile_globale` | si | `0` |
| `fornitore_preferito` | si | `Tecnomat` |
| `categoria_comportamentale` | si | `null` |
| `tipo_voce` | si | `standard` |

Colonne che NON esistono: `unita`, `prezzo_unitario`.

## 4. Row completo di Acquaragia

### Da `catalogo_materiali` (tabella base):
```json
{
  "id": "dc9dea1a-4a40-4376-80f9-7d890cf23717",
  "nome": "Acquaragia",
  "tipologia_materiale": "consumo",
  "unita_default": "lt",
  "prezzo_unitario_default": 8,
  "provenienza_default": "acquisto",
  "note": null,
  "created_at": "2026-03-20T22:38:26.610219+00:00",
  "quantita_disponibile_globale": 0,
  "fornitore_preferito": "Tecnomat",
  "categoria_comportamentale": null,
  "tipo_voce": "standard"
}
```

### Da `v_catalogo_acquisti` (vista):
```json
{
  "id": "dc9dea1a-4a40-4376-80f9-7d890cf23717",
  "nome": "Acquaragia",
  "tipologia_materiale": "consumo",
  "unita": "lt",
  "prezzo_unitario": 8,
  "quantita_disponibile_globale": 0,
  "fornitore_preferito": "Tecnomat",
  "provenienza_default": "acquisto",
  "note": null,
  "quantita_totale_necessaria": 0,
  "num_task": 11,
  "quantita_da_acquistare": 0,
  "costo_stimato": 0
}
```

### Da `materiali` (legami task, 11 righe tutte uguali):
```json
{
  "id": "1dcbd530-...",
  "nome": "Acquaragia",
  "unita": "lt",
  "quantita": null,
  "catalogo_id": "dc9dea1a-...",
  "prezzo_unitario": 8
}
```

## 5. Conclusione — dove vivono i dati

| Dato | Tabella | Colonna |
|------|---------|---------|
| Unita | `catalogo_materiali` | `unita_default` (aliasata come `unita` nella vista) |
| Prezzo | `catalogo_materiali` | `prezzo_unitario_default` (aliasata come `prezzo_unitario` nella vista) |
| Fornitore | `catalogo_materiali` | `fornitore_preferito` (colonna diretta, esiste) |
| Categoria comp. | `catalogo_materiali` | `categoria_comportamentale` (colonna diretta, esiste) |

Tutto vive in `catalogo_materiali`. Le colonne si chiamano `unita_default` e `prezzo_unitario_default` (non `unita` e `prezzo_unitario`). La vista fa l'alias.

## 6. Errore della diagnosi precedente (FIX_UNITA_NOTE.md)

La diagnosi precedente ha commesso **tre errori**:

### Errore 1 — Campione viziato per `unita_default`
La diagnosi disse: "`unita_default` = 'pz' per quasi tutti". Controllando Acquaragia, `unita_default = 'lt'`. Il campione era viziato: la prima riga restituita da `select("*")` era "Sottomisure legno" che ha davvero "pz". Ma molti item edutati hanno valori corretti (lt, ml, mq, kg). **`unita_default` E la colonna giusta — contiene i valori reali per gli item che sono stati aggiornati.**

### Errore 2 — Diagnosi sbagliata sulla vista
La diagnosi disse: "`v_catalogo_acquisti.unita` e aliasata da `unita_default`, quindi riporta valori sbagliati". In realta la vista riporta valori CORRETTI perche `unita_default` contiene i valori corretti. Per Acquaragia: vista restituisce `unita: "lt"` = corretto. La vista non e una "trappola", e la fonte canonica.

### Errore 3 — Fix inutilmente complesso
Il fix ha introdotto una logica di "moda" sui legami materiali, che era ridondante: `materiali.unita` viene propagata DAL catalogo (step 2 di CATALOGO_ACQUISTI.md: "propaga automaticamente a TUTTE le istanze"). Quindi `materiali.unita` = `catalogo_materiali.unita_default` per definizione (salvo casi di desync). Bastava leggere `unita_default` direttamente.

### Contro-esempio: Vernice Bianca
`catalogo_materiali.unita_default = "pz"`, ma `materiali.unita = "lt"` in un legame. Questo e un caso di desync: l'utente ha cambiato l'unita nel catalogo SENZA propagare. Il catalogo dice "pz", un legame dice "lt". La vista mostra "pz" (dal catalogo). Il fix moda mostra "lt" (dal legame). Per il tab Catalogo della vecchia pagina, conta il catalogo → "pz". Quindi il fix moda ha introdotto una divergenza tra vecchia e nuova pagina per questi item.

### Cosa fare nel prossimo mattone
- Rimuovere la logica moda
- Leggere `unita_default` e `prezzo_unitario_default` da `catalogo_materiali` direttamente
- OPPURE (piu pulito): fetchare da `v_catalogo_acquisti` che fa gia tutto (alias + aggregazione)
