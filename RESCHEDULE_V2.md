# ============================================================
# NIMBUS 2026 — RESCHEDULING COMPLETO V2
# ============================================================
# Reset date, aggiornamento fornitori, nuovo scheduling
# Backup già presente: task_backup_20260321
# ============================================================

"""
Leggi CLAUDE.md per il contesto.

OBIETTIVO: Reset completo delle date, aggiornamento fornitori, e rischeduling con le nuove finestre.

=================================================================
STEP 1 — RESET DATE
=================================================================

Esegui nel DB:
UPDATE task SET data_inizio = NULL, data_fine = NULL;
UPDATE operazioni SET data_inizio = NULL, data_fine = NULL;

Crea un nuovo backup prima:
CREATE TABLE task_backup_20260409 AS SELECT * FROM task;
CREATE TABLE operazioni_backup_20260409 AS SELECT * FROM operazioni;

=================================================================
STEP 2 — AGGIORNAMENTO FORNITORI
=================================================================

A) Rinomina "All Service OR Carnaru" in "Carnaru" ovunque:
UPDATE fornitori SET nome = 'Carnaru' WHERE nome ILIKE '%All Service%';

B) Aggiungi nuovo fornitore:
INSERT INTO fornitori (nome, tipo, specializzazione, stato, note) VALUES 
('Idroserviziambientali', 'Fornitore', 'Scarico acqua non potabile', 'confermato', 'Scarica cisterna acqua non potabile');

C) Verifica che esistano nel DB questi fornitori (aggiungi se mancano):
- Carnaru (ex All Service) — allestitori strutture
- Idroserviziambientali — scarico acqua
- FN — distribuzione elettrica (se non esiste, rinomina "Sater OR FN" in "FN")

=================================================================
STEP 3 — SCHEDULING CON NUOVE FINESTRE
=================================================================

Aggiorna lo script auto-schedule.mjs con queste finestre:

const FINESTRE = {
  "Carnaru": { start: "2026-04-11", end: "2026-04-18", note: "11 smontaggio, 14-16 6pax pedana+anfiteatri, 17 4pax vialetto+camminamento, 18 4pax swing+pedana chiosco" },
  "Squadra finiture": { start: "2026-04-16", end: "2026-04-30", note: "Pasquale: 16 2pax stage+nuvola+chiosco, 17 4pax verniciatura pedana, 18 2pax verniciatura vialetti, 19 verniciatura swing+chiosco, 20 4pax prato, 21+ 2pax resto" },
  "Leonardo Mikhail": { start: "2026-04-11", end: "2026-04-30", minimize: true, costoGiorno: 100, note: "Accorpare giornate, 100€/gg forfettario" },
  "Mastroianni": { start: "2026-04-20", end: "2026-04-22", note: "Idraulico placeholder, fornitore TBD" },
  "Rinalduzzi": { start: "2026-04-11", end: "2026-04-11", note: "Scarico telai + prato + 5 orsogrill" },
  "Idroserviziambientali": { start: "2026-04-11", end: "2026-04-13", note: "Scarico cisterna acqua, 11 o 13 aprile" },
  "Sebach": { 
    windows: [
      { start: "2026-04-11", end: "2026-04-11", note: "Mattina bagno chimico" },
      { start: "2026-04-17", end: "2026-04-17", note: "Bagni + ufficio con gru + posizionamento nuvola" }
    ]
  },
  "Trasportiamo": {
    windows: [
      { start: "2026-04-12", end: "2026-04-12", note: "Casa Ale furgone + Guidonia trasporto 1 e 2 + carico Monterosi" },
      { start: "2026-04-14", end: "2026-04-14", note: "Scarico + trasporto Monterosi" }
    ]
  },
  "Facchini": { start: "2026-04-12", end: "2026-04-30", note: "12 trasporti (2 facchini Casa Ale + scarico Guidonia), 12 dopo trasporti espiantare allori, 14 scarico Monterosi (4 facchini)" },
  "Costruzione Metalliche": { start: "2026-04-13", end: "2026-04-14", note: "Gazebo 13, max 14" },
  "FN": { start: "2026-04-20", end: "2026-04-30", note: "Distribuzione elettrica" },
  "Lumiroma": { start: "2026-04-21", end: "2026-04-28", note: "Portale, settimana dopo prato" },
  "Giardiniere": { start: "2026-04-28", end: "2026-04-29", note: "Irrigazione 1-2 giorni prima allori, da trovare" },
  "Davino": { start: "2026-04-25", end: "2026-04-30", note: "Allestimento stage 25-30" },
  "Tecnoconference OR AMG OR Pierpaolo": { start: "2026-04-25", end: "2026-04-30", note: "AVL, date da capire, allestimento stage 25-30" },
  "Alessandro": { start: "2026-04-11", end: "2026-04-30", note: "Sempre disponibile. 11: cisterna+autoclave" },
  "Luca": { start: "2026-04-11", end: "2026-04-30", note: "Sempre" },
  "Ingegnere": { start: "2026-04-01", end: "2026-04-30", note: "Pratiche" },
  "Chef (Danilo)": { start: "2026-04-20", end: "2026-04-30", note: "Allestimento cucina" },
};

DATE FISSE (eventi puntuali):
const DATE_FISSE = {
  // SPECIFICI PRIMA (pattern matching dal titolo)
  "smontaggio vialetti": { preferredStart: "2026-04-11", preferredEnd: "2026-04-11", force: true },
  "smontaggio anfiteatri": { preferredStart: "2026-04-11", preferredEnd: "2026-04-11", force: true },
  "costruzione nuovi anfiteatri": { preferredStart: "2026-04-14", preferredEnd: "2026-04-16", force: true },
  "manutenzione tavole pedana": { preferredStart: "2026-04-14", preferredEnd: "2026-04-15", force: true },
  "costruzione gradini": { preferredStart: "2026-04-14", preferredEnd: "2026-04-14", force: true },
  "costruzione nuovo vialetto": { preferredStart: "2026-04-17", preferredEnd: "2026-04-17", force: true },
  "costruzione camminamento": { preferredStart: "2026-04-17", preferredEnd: "2026-04-17", force: true },
  "costruzione pedana swing": { preferredStart: "2026-04-18", preferredEnd: "2026-04-18", force: true },
  "manutenzione pedana chiosco": { preferredStart: "2026-04-18", preferredEnd: "2026-04-18", force: true },
  
  // Nuvola assemblata entro il 16 per gru Sebach il 17
  "assemblaggio nuvola grande": { preferredStart: "2026-04-16", preferredEnd: "2026-04-16", force: true },
  "posizionamento nuvola grande": { preferredStart: "2026-04-17", preferredEnd: "2026-04-17", force: true },
  "scarico e posizionamento container bagni": { preferredStart: "2026-04-17", preferredEnd: "2026-04-17", force: true },
  "scarico e posizionamento container ufficio": { preferredStart: "2026-04-17", preferredEnd: "2026-04-17", force: true },
  
  // Pasquale
  "verniciatura pedana": { preferredStart: "2026-04-17", preferredEnd: "2026-04-17" },
  "riverniciatura completa pedana": { preferredStart: "2026-04-17", preferredEnd: "2026-04-17", force: true },
  "verniciatura vialetto": { preferredStart: "2026-04-18", preferredEnd: "2026-04-18", force: true },
  "verniciatura pedana swing": { preferredStart: "2026-04-19", preferredEnd: "2026-04-19", force: true },
  "verniciatura pedana chiosco": { preferredStart: "2026-04-19", preferredEnd: "2026-04-19", force: true },
  
  // Prato
  "stesura e picchettamento prato sintetico": { preferredStart: "2026-04-20", preferredEnd: "2026-04-20", force: true },
  "posizionamento prato nero": { preferredStart: "2026-04-20", preferredEnd: "2026-04-20", force: true },
  
  // Espiantare allori dopo trasporti del 12
  "espiantare fila allori": { preferredStart: "2026-04-12", preferredEnd: "2026-04-12", force: true },
  "espiantare due allori": { preferredStart: "2026-04-12", preferredEnd: "2026-04-12", force: true },
  
  // Gazebi
  "gazebi cucina": { preferredStart: "2026-04-13", preferredEnd: "2026-04-13", force: true },
  
  // Cisterna Alessandro
  "cisterna": { preferredStart: "2026-04-11", preferredEnd: "2026-04-11" },
  "autoclave": { preferredStart: "2026-04-11", preferredEnd: "2026-04-11" },
  
  // Idraulico
  // (usa finestra Mastroianni 20-22)
  
  // Elettrico FN
  // (usa finestra FN dal 20)
  
  // Allori e terra fine aprile
  "messa a dimora allori": { preferredStart: "2026-04-30", preferredEnd: "2026-04-30" },
  "riempimento vasi terra": { preferredStart: "2026-04-30", preferredEnd: "2026-04-30" },
  
  // Irrigazione prima degli allori
  "irrigazione": { preferredStart: "2026-04-28", preferredEnd: "2026-04-29" },
  
  // Round e arredi stessa giornata del prato
  "posizionamento e montaggio round + nuvola aperitivo": { preferredStart: "2026-04-20", preferredEnd: "2026-04-20", force: true },
  "montaggio e posizionamento arredi aperitivo": { preferredStart: "2026-04-20", preferredEnd: "2026-04-20", force: true },
};

DURATE DEFAULT per task con durata NULL (stesse di prima):
- "amministrativo" / "decisione" → 1h
- "misure_rilievo" → 2h
- Tutto il resto → 4h

SCHEDULING OPERAZIONI TRASPORTO:
Dopo aver schedulato le task, schedula le operazioni:
- Luogo "Casa Ale" → 12 aprile
- Luogo "Guidonia" → 12 aprile
- Luogo "Monterosi" → 14 aprile
- Luogo "Fornitore diretto" → data_inizio della task padre
- Luogo "In loco (cantiere)" → nessuna data

Si lavora TUTTI I GIORNI, weekend inclusi. Non escludere sabato e domenica.

LEONARDO MIKHAIL: minimizzare giornate con bin-packing. Le sue task vanno accorpate nel minor numero di giornate possibile. Posizionare le giornate dove servono per sbloccare le dipendenze.

GENERA REPORT con --report. NON applicare finché l'utente non conferma.
"""
