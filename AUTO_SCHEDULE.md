# ============================================================
# NIMBUS 2026 — AUTO-SCHEDULING
# ============================================================
# ATTENZIONE: Questo script tocca SOLO data_inizio e data_fine.
# NON modifica nessun altro campo.
# Backup già fatto: tabella task_backup_20260321
# ============================================================

"""
Leggi CLAUDE.md per il contesto.

OBIETTIVO: Creare uno script Node.js (scripts/auto-schedule.ts) che calcola le date per tutte le task basandosi sulle finestre di disponibilità dei fornitori, le dipendenze e le durate. Lo script genera un report, NON scrive nel DB finché non si conferma.

STEP 1 — Lo script legge dal DB:
- Tutte le task con: id, titolo, lavorazione, zona, fornitore, fornitore_supporto, dipendenze, durata_ore, data_inizio, data_fine, stato
- Tutte le dipendenze (task_dipendenze)
- La costante HOURS_PER_DAY = 11

STEP 2 — Finestre di disponibilità dei fornitori:

const FINESTRE = {
  // Nome fornitore (come nel DB) → { start, end, days_per_week, note }
  "All Service OR Carnaru": { start: "2026-04-10", end: "2026-04-15", note: "allestitori strutture" },
  "Squadra finiture": { start: "2026-04-15", end: "2026-04-28", excludeWeekends: true, persone: 2, note: "Pasquale, 2 pax, no weekend" },
  "Leonardo Mikhail": { start: "2026-04-10", end: "2026-04-30", minimize: true, costoGiorno: 100, note: "MINIMIZZARE giornate, accorpare task" },
  "Mastroianni": { start: "2026-04-20", end: "2026-04-22", note: "idraulico, fornitore TBD" },
  "Rinalduzzi": { start: "2026-04-10", end: "2026-04-10", note: "solo scarico telai+gazebo" },
  "Sebach": { 
    windows: [
      { start: "2026-04-10", end: "2026-04-10", note: "bagno chimico" },
      { start: "2026-04-18", end: "2026-04-18", note: "bagni + ufficio" }
    ]
  },
  "Trasportiamo": {
    windows: [
      { start: "2026-04-09", end: "2026-04-09", note: "trasporto casa Ale" },
      { start: "2026-04-13", end: "2026-04-13", note: "trasporti Guidonia + Monterosi" }
    ]
  },
  "Facchini": { start: "2026-04-09", end: "2026-04-30", note: "disponibili tutto il periodo, da organizzare" },
  "Lumiroma": { start: "2026-04-27", end: "2026-04-27", note: "portale" },
  "Giardiniere": { start: "2026-04-29", end: "2026-04-29", note: "irrigazione" },
  "Davino": { start: "2026-04-12", end: "2026-04-14", note: "AVL stativi" },
  "Tecnoconference OR AMG OR Pierpaolo": { 
    windows: [
      { start: "2026-04-12", end: "2026-04-14", note: "consegna stativi" },
      { start: "2026-04-30", end: "2026-04-30", note: "montaggio finale" }
    ]
  },
  "Costruzione Metalliche": { start: "2026-04-10", end: "2026-04-10", note: "scarico gazebo con Rinalduzzi" },
  "Ingegnere": { start: "2026-04-01", end: "2026-04-30", note: "disponibile per pratiche" },
  "Luca": { start: "2026-03-20", end: "2026-04-30", note: "sempre" },
  "Alessandro": { start: "2026-03-20", end: "2026-04-30", note: "sempre" },
};

// Task con date fisse (eventi puntuali dagli appunti cantiere)
const DATE_FISSE = {
  // Pattern nel titolo o fornitore → date forzate
  "verniciatura": { preferredStart: "2026-04-16", preferredEnd: "2026-04-17", note: "verniciature tutte insieme" },
  "prato sintetico": { preferredStart: "2026-04-28", preferredEnd: "2026-04-28" },
  "prato nero": { preferredStart: "2026-04-28", preferredEnd: "2026-04-28" },
  "irrigazione": { preferredStart: "2026-04-29", preferredEnd: "2026-04-29" },
  "allori": { preferredStart: "2026-04-30", preferredEnd: "2026-04-30", note: "messa a dimora" },
  "terra": { preferredStart: "2026-04-30", preferredEnd: "2026-04-30", note: "riempimento vasi" },
};

STEP 3 — Algoritmo di scheduling:

Per ogni task senza data (o con data da ricalcolare):

1. Determina la finestra del fornitore assegnato
2. Determina la data più presto possibile (earliest start):
   - MAX tra:
     - Inizio finestra fornitore
     - Data fine di tutte le task da cui dipende + 1 giorno (se la dipendenza non ha data, schedulala prima — ricorsione)
     - Oggi (non schedulare nel passato)
3. Calcola data_fine = data_inizio + ceil(durata_ore / 11) - 1 giorni
   Se durata_ore è NULL, assume 11 (1 giorno)
4. Se la task ha una data preferita (da DATE_FISSE), usa quella SE rispetta le dipendenze

Per Leonardo Mikhail — OTTIMIZZAZIONE:
- Raccogli tutte le sue task
- Ordinale per dipendenze (prima quelle che sbloccano altre task)
- Accorpale nel minor numero di giornate: se il totale ore di tutte le sue task è 35h, servono ceil(35/11) = 4 giornate
- Posiziona le giornate il più vicino possibile alle date in cui il suo lavoro sblocca le task successive
- Le giornate non devono essere consecutive — possono essere sparse (es. 10-11 apr per cavi pedana, poi 20 apr per distribuzione, poi 27 apr per portale)

Per le task con fornitore NULL: schedulale nella prima data disponibile che rispetta le dipendenze.

Per Squadra finiture (Pasquale): escludi weekend (sabato e domenica). 2 persone = possono fare task in parallelo se non hanno dipendenze tra loro. Calcola quante ore/giorno disponibili: 2 × 11 = 22 ore/giorno.

STEP 4 — Output: REPORT (non scrivere nel DB!)

Lo script stampa in console:

=== AUTO-SCHEDULING REPORT ===

LEONARDO MIKHAIL — 4 giornate (35h totali):
  10/04 gio: Cavi DMX pedana (3h), Smontaggio stripled (2h), Passaggio cavi (3h) = 8h
  11/04 ven: Stripled gradini (3h), Stripled vialetto (3h), Stripled chiosco (2h) = 8h  
  20/04 lun: Distribuzione elettrica (6h), Illuminazione (3h) = 9h
  27/04 lun: Impianto archi portale (2h), Predisposizione swing (0.5h) = 2.5h
  
ALL SERVICE — 10-15 aprile:
  10/04: Smontaggio anfiteatri (7h)
  11/04: Rimozione rampa (2h), Costruzione gradini (4h) ...
  ...

SQUADRA FINITURE — 15-28 aprile (no weekend):
  15/04 mar: Pulizia porfido (2h), Posizionamento swing (1h) ...
  ...

TASK SENZA FORNITORE:
  Presentare OSP — nessun fornitore, data suggerita: prima possibile
  ...

CONFLITTI:
  ⚠ Task X dipende da Y ma Y finisce il 16/04 e X è schedulata il 15/04
  ...

RIEPILOGO:
  Task schedulate: 160/183
  Task non schedulabili: 23 (motivo: ...)
  Giornate Leonardo Mikhail: 4 (costo: 400€)
  Giornate cantiere totali: 21 (9 apr - 30 apr)

=== FINE REPORT ===

STEP 5 — Conferma e scrittura

Dopo che l'utente ha visto il report e conferma, lo script scrive nel DB:
- UPDATE task SET data_inizio = $1, data_fine = $2 WHERE id = $3
- SOLO i campi data_inizio e data_fine
- NESSUN altro campo viene toccato

Lo script deve essere eseguibile con: npx ts-node scripts/auto-schedule.ts --report (solo report) e npx ts-node scripts/auto-schedule.ts --apply (scrive nel DB).

STEP 6 — Integrazione nell'app (opzionale, dopo il test)

Aggiungi un bottone "Auto-schedule" nella pagina Gantt che:
1. Chiama un API endpoint /api/auto-schedule
2. Mostra il report in un modal
3. Bottone "Applica" per confermare
4. Bottone "Annulla" per cancellare

Ma PRIMA facciamo lo script da terminale per testare.
"""
