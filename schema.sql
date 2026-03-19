-- ============================================================
-- NIMBUS 2026 — Production Manager
-- Schema PostgreSQL per Supabase
-- ============================================================

-- Abilita UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ZONE
-- ============================================================
CREATE TABLE zone (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome text NOT NULL UNIQUE,
  colore text NOT NULL DEFAULT '#86868B',
  ordine integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

INSERT INTO zone (nome, colore, ordine) VALUES
  ('Pre-Cantiere', '#0A84FF', 0),
  ('Permessi', '#FF3B30', 1),
  ('Ingresso', '#5E5CE6', 2),
  ('Aperitivo', '#BF5AF2', 3),
  ('Area Bagni', '#30D158', 4),
  ('Locali Tecnici', '#FF9F0A', 5),
  ('Chiosco', '#FFD60A', 6),
  ('Pedana', '#FF375F', 7),
  ('Generale', '#86868B', 8);

-- ============================================================
-- FORNITORI
-- ============================================================
CREATE TYPE stato_fornitore AS ENUM (
  'da_trovare',
  'contattato', 
  'confermato',
  'sopralluogo_fatto',
  'materiali_definiti',
  'pronto'
);

CREATE TABLE fornitori (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome text NOT NULL,
  tipo text, -- Fornitore, Socio, Consulente, Manodopera
  specializzazione text,
  contatto text,
  stato stato_fornitore NOT NULL DEFAULT 'da_trovare',
  costo_ora numeric,
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fornitori_updated_at
  BEFORE UPDATE ON fornitori
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- PERMESSI
-- ============================================================
CREATE TYPE stato_permesso AS ENUM (
  'da_presentare',
  'presentato',
  'in_attesa',
  'ottenuto'
);

CREATE TABLE permessi (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome text NOT NULL,
  stato stato_permesso NOT NULL DEFAULT 'da_presentare',
  data_scadenza date,
  responsabile text,
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER permessi_updated_at
  BEFORE UPDATE ON permessi
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- LAVORAZIONI
-- ============================================================
CREATE TABLE lavorazioni (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  zona_id uuid NOT NULL REFERENCES zone(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descrizione text,
  ordine integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER lavorazioni_updated_at
  BEFORE UPDATE ON lavorazioni
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TASK
-- ============================================================
CREATE TYPE tipologia_task AS ENUM (
  'carpenteria',
  'verniciatura',
  'elettrico',
  'idraulico',
  'trasporto',
  'acquisto',
  'montaggio',
  'audio_luci',
  'giardinaggio',
  'pulizia_manutenzione',
  'decisione',
  'amministrativo',
  'misure_rilievo'
);

CREATE TYPE stato_task AS ENUM (
  'da_fare',
  'in_corso',
  'completata',
  'bloccata'
);

-- Ordine numerico degli stati fornitore per confronto
CREATE OR REPLACE FUNCTION stato_fornitore_ordine(s stato_fornitore)
RETURNS integer AS $$
BEGIN
  RETURN CASE s
    WHEN 'da_trovare' THEN 0
    WHEN 'contattato' THEN 1
    WHEN 'confermato' THEN 2
    WHEN 'sopralluogo_fatto' THEN 3
    WHEN 'materiali_definiti' THEN 4
    WHEN 'pronto' THEN 5
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE TABLE task (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lavorazione_id uuid NOT NULL REFERENCES lavorazioni(id) ON DELETE CASCADE,
  titolo text NOT NULL,
  tipologia tipologia_task,
  
  -- Fornitore
  fornitore_id uuid REFERENCES fornitori(id) ON DELETE SET NULL,
  stato_fornitore_minimo stato_fornitore NOT NULL DEFAULT 'pronto',
  
  -- Stato
  stato stato_task NOT NULL DEFAULT 'da_fare',
  stato_calcolato text NOT NULL DEFAULT 'da_fare',
  motivo_blocco text,
  
  -- Date
  data_inizio date,
  data_fine date,
  durata_giorni integer,
  
  -- Costi
  numero_persone integer,
  ore_lavoro numeric,
  costo_ora numeric,
  costo_manodopera numeric GENERATED ALWAYS AS (
    CASE WHEN numero_persone IS NOT NULL AND ore_lavoro IS NOT NULL AND costo_ora IS NOT NULL
    THEN numero_persone * ore_lavoro * costo_ora
    ELSE NULL END
  ) STORED,
  
  -- Meta
  note text,
  ordine integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER task_updated_at
  BEFORE UPDATE ON task
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indici
CREATE INDEX idx_task_lavorazione ON task(lavorazione_id);
CREATE INDEX idx_task_fornitore ON task(fornitore_id);
CREATE INDEX idx_task_stato ON task(stato);
CREATE INDEX idx_task_stato_calcolato ON task(stato_calcolato);

-- ============================================================
-- DIPENDENZE TASK
-- ============================================================
CREATE TABLE task_dipendenze (
  task_id uuid NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  dipende_da_id uuid NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, dipende_da_id),
  CHECK (task_id != dipende_da_id)
);

CREATE INDEX idx_deps_task ON task_dipendenze(task_id);
CREATE INDEX idx_deps_dipende ON task_dipendenze(dipende_da_id);

-- ============================================================
-- MATERIALI
-- ============================================================
CREATE TABLE materiali (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  nome text NOT NULL,
  quantita numeric,
  unita text, -- pz, mq, ml, kg, kit, lt, set
  prezzo_unitario numeric,
  costo_totale numeric GENERATED ALWAYS AS (
    CASE WHEN quantita IS NOT NULL AND prezzo_unitario IS NOT NULL
    THEN quantita * prezzo_unitario
    ELSE NULL END
  ) STORED,
  provenienza text, -- acquisto, magazzino, noleggio, con_fornitore
  ordinato boolean NOT NULL DEFAULT false,
  in_cantiere boolean NOT NULL DEFAULT false,
  giorni_consegna integer,
  data_ordine date,
  data_consegna_prevista date GENERATED ALWAYS AS (
    CASE WHEN data_ordine IS NOT NULL AND giorni_consegna IS NOT NULL
    THEN data_ordine + giorni_consegna
    ELSE NULL END
  ) STORED,
  note text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_materiali_task ON materiali(task_id);

-- ============================================================
-- TASK_PERMESSI (relazione molti a molti)
-- ============================================================
CREATE TABLE task_permessi (
  task_id uuid NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  permesso_id uuid NOT NULL REFERENCES permessi(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, permesso_id)
);

-- ============================================================
-- FUNZIONE: Calcolo stato task
-- ============================================================
CREATE OR REPLACE FUNCTION calcola_stato_task(p_task_id uuid)
RETURNS text AS $$
DECLARE
  v_task task%ROWTYPE;
  v_fornitore fornitori%ROWTYPE;
  v_deps_incomplete integer;
  v_mat_missing integer;
  v_perm_missing integer;
BEGIN
  SELECT * INTO v_task FROM task WHERE id = p_task_id;
  
  -- Override manuale
  IF v_task.stato = 'completata' THEN RETURN 'completata'; END IF;
  IF v_task.stato = 'bloccata' THEN RETURN 'bloccata'; END IF;
  
  -- Check fornitore
  IF v_task.fornitore_id IS NOT NULL THEN
    SELECT * INTO v_fornitore FROM fornitori WHERE id = v_task.fornitore_id;
    IF stato_fornitore_ordine(v_fornitore.stato) < stato_fornitore_ordine(v_task.stato_fornitore_minimo) THEN
      RETURN 'in_attesa_fornitore';
    END IF;
  END IF;
  
  -- Check dipendenze
  SELECT COUNT(*) INTO v_deps_incomplete
  FROM task_dipendenze td
  JOIN task t ON t.id = td.dipende_da_id
  WHERE td.task_id = p_task_id
  AND t.stato != 'completata';
  
  IF v_deps_incomplete > 0 THEN
    RETURN 'in_attesa_dipendenza';
  END IF;
  
  -- Check materiali
  SELECT COUNT(*) INTO v_mat_missing
  FROM materiali m
  WHERE m.task_id = p_task_id
  AND m.in_cantiere = false
  AND m.provenienza != 'magazzino';
  
  IF v_mat_missing > 0 THEN
    RETURN 'in_attesa_materiali';
  END IF;
  
  -- Check permessi
  SELECT COUNT(*) INTO v_perm_missing
  FROM task_permessi tp
  JOIN permessi p ON p.id = tp.permesso_id
  WHERE tp.task_id = p_task_id
  AND p.stato != 'ottenuto';
  
  IF v_perm_missing > 0 THEN
    RETURN 'in_attesa_permesso';
  END IF;
  
  -- Tutto OK: usa stato manuale
  RETURN v_task.stato::text;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGER: Aggiorna stato_calcolato quando cambia la task
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_ricalcola_stato_task()
RETURNS TRIGGER AS $$
BEGIN
  NEW.stato_calcolato = calcola_stato_task(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_ricalcola_stato
  BEFORE INSERT OR UPDATE ON task
  FOR EACH ROW EXECUTE FUNCTION trigger_ricalcola_stato_task();

-- ============================================================
-- TRIGGER: Quando cambia stato fornitore, ricalcola tutte le task
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_fornitore_changed()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stato != NEW.stato THEN
    UPDATE task SET updated_at = now()
    WHERE fornitore_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fornitore_stato_changed
  AFTER UPDATE ON fornitori
  FOR EACH ROW EXECUTE FUNCTION trigger_fornitore_changed();

-- ============================================================
-- TRIGGER: Quando cambia stato task, ricalcola task dipendenti
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_task_stato_changed()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stato != NEW.stato THEN
    UPDATE task SET updated_at = now()
    WHERE id IN (SELECT task_id FROM task_dipendenze WHERE dipende_da_id = NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_stato_propagate
  AFTER UPDATE ON task
  FOR EACH ROW EXECUTE FUNCTION trigger_task_stato_changed();

-- ============================================================
-- TRIGGER: Quando cambia materiale, ricalcola task padre
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_materiale_changed()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE task SET updated_at = now() WHERE id = COALESCE(NEW.task_id, OLD.task_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER materiale_changed
  AFTER INSERT OR UPDATE OR DELETE ON materiali
  FOR EACH ROW EXECUTE FUNCTION trigger_materiale_changed();

-- ============================================================
-- TRIGGER: Quando cambia permesso, ricalcola task collegate
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_permesso_changed()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stato != NEW.stato THEN
    UPDATE task SET updated_at = now()
    WHERE id IN (SELECT task_id FROM task_permessi WHERE permesso_id = NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER permesso_stato_changed
  AFTER UPDATE ON permessi
  FOR EACH ROW EXECUTE FUNCTION trigger_permesso_changed();

-- ============================================================
-- VISTE UTILI
-- ============================================================

-- Vista task completa con joins
CREATE OR REPLACE VIEW v_task_completa AS
SELECT 
  t.*,
  l.nome AS lavorazione_nome,
  l.zona_id,
  z.nome AS zona_nome,
  z.colore AS zona_colore,
  z.ordine AS zona_ordine,
  f.nome AS fornitore_nome,
  f.stato AS fornitore_stato,
  (SELECT COUNT(*) FROM materiali m WHERE m.task_id = t.id AND m.in_cantiere = false AND m.provenienza != 'magazzino') AS materiali_mancanti,
  (SELECT COUNT(*) FROM materiali m WHERE m.task_id = t.id) AS materiali_totali,
  (SELECT COUNT(*) FROM task_dipendenze td JOIN task t2 ON t2.id = td.dipende_da_id WHERE td.task_id = t.id AND t2.stato != 'completata') AS dipendenze_incomplete,
  (SELECT COUNT(*) FROM task_dipendenze td WHERE td.task_id = t.id) AS dipendenze_totali
FROM task t
JOIN lavorazioni l ON l.id = t.lavorazione_id
JOIN zone z ON z.id = l.zona_id
LEFT JOIN fornitori f ON f.id = t.fornitore_id;

-- Vista riepilogo per zona
CREATE OR REPLACE VIEW v_zona_riepilogo AS
SELECT 
  z.id, z.nome, z.colore, z.ordine,
  COUNT(t.id) AS task_totali,
  COUNT(t.id) FILTER (WHERE t.stato = 'completata') AS task_completate,
  COUNT(t.id) FILTER (WHERE t.stato = 'in_corso') AS task_in_corso,
  COUNT(t.id) FILTER (WHERE t.stato_calcolato LIKE 'in_attesa%') AS task_bloccate,
  CASE WHEN COUNT(t.id) > 0 THEN ROUND(100.0 * COUNT(t.id) FILTER (WHERE t.stato = 'completata') / COUNT(t.id)) ELSE 0 END AS percentuale
FROM zone z
LEFT JOIN lavorazioni l ON l.zona_id = z.id
LEFT JOIN task t ON t.lavorazione_id = l.id
GROUP BY z.id, z.nome, z.colore, z.ordine
ORDER BY z.ordine;

-- Vista riepilogo fornitori
CREATE OR REPLACE VIEW v_fornitori_riepilogo AS
SELECT 
  f.*,
  COUNT(t.id) AS task_totali,
  COUNT(t.id) FILTER (WHERE t.stato = 'completata') AS task_completate,
  COUNT(t.id) FILTER (WHERE t.stato_calcolato = 'in_attesa_fornitore') AS task_bloccate_da_me
FROM fornitori f
LEFT JOIN task t ON t.fornitore_id = f.id
GROUP BY f.id;

-- Vista costi per zona
CREATE OR REPLACE VIEW v_costi_zona AS
SELECT 
  z.nome AS zona,
  COALESCE(SUM(t.costo_manodopera), 0) AS costo_manodopera,
  COALESCE((SELECT SUM(m.costo_totale) FROM materiali m JOIN task t2 ON t2.id = m.task_id JOIN lavorazioni l2 ON l2.id = t2.lavorazione_id WHERE l2.zona_id = z.id), 0) AS costo_materiali
FROM zone z
LEFT JOIN lavorazioni l ON l.zona_id = z.id
LEFT JOIN task t ON t.lavorazione_id = l.id
GROUP BY z.id, z.nome, z.ordine
ORDER BY z.ordine;

-- ============================================================
-- RLS (Row Level Security) — disabilitato per ora, singolo utente
-- ============================================================
-- Se in futuro servisse auth, abilitare RLS su tutte le tabelle
-- e creare policy basate su auth.uid()
