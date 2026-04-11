# Mattone 6-bis — Reattivita disponibilita senza reload

## Causa del bug

`onUpdate()` veniva chiamato DOPO `await aggiornaDisponibilita()` (server action). Il round-trip di rete (~500-1500ms) ritardava l'aggiornamento client-side. L'utente vedeva i valori vecchi finche non faceva reload.

## Fix applicato

Optimistic update: `onUpdate()` chiamato PRIMA del server action. Se il save fallisce, revert automatico + toast.error.

```typescript
// PRIMA (mattone 6):
await aggiornaDisponibilita(mat.id, campo, val);
onUpdate(campo, val);  // ← dopo il network

// DOPO (mattone 6-bis):
onUpdate(campo, val);  // ← subito, UI reagisce istantaneamente
await aggiornaDisponibilita(mat.id, campo, val);
// se fallisce: onUpdate(campo, mat[campo]) + toast.error
```

## File modificato

`src/app/materiali-nuovo/components/lista-materiali.tsx` — funzione `handleBlur` in `InlineEditor`: spostato `onUpdate()` prima di `await aggiornaDisponibilita()`, aggiunto revert su catch.

## Esiti test

Sequenza testata su "Viti 5x50 filettatura completa" (fabbisogno 7894 pz):

| Step | Azione | Risultato | Senza reload |
|------|--------|-----------|--------------|
| 1 | Stato iniziale | 7894 pz, da comprare: 7894, pallino rosso, 1 in rosso | — |
| 2 | mag = 100, Tab | da comprare scende, ancora rosso | ✅ |
| 3 | mag = 7894, Tab | da comprare sparisce, pallino VERDE, bussola "0 in rosso" | ✅ |
| 4 | mag = 0, Tab | torna tutto allo stato iniziale: rosso, da comprare: 7894, 1 in rosso | ✅ |
| 5 | Console | 0 errori | ✅ |

## Conferma

Reload non e piu necessario. La UI reagisce istantaneamente al cambio di disponibilita: da_comprare, pallino semaforo, e contatori bussola si aggiornano entro 300ms dalla pressione di Tab.

## Screenshot

`verifica-mattone6bis/pallino-verde-senza-reload.png` — pallino verde, niente "da comprare", bussola "1 voci | 0 € da comprare" dopo aver impostato mag = 7894 senza reload.
