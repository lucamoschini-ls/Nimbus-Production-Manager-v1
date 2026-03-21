-- Migration: Create tipologie_fornitore table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS tipologie_fornitore (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ordine integer NOT NULL DEFAULT 0
);

-- Seed with initial values from existing fornitori.tipo values
INSERT INTO tipologie_fornitore (nome, ordine) VALUES
  ('Fornitore', 0),
  ('Socio', 1),
  ('Consulente', 2),
  ('Manodopera', 3),
  ('Noleggio', 4),
  ('Negozio/Rivendita', 5)
ON CONFLICT (nome) DO NOTHING;

-- Enable RLS (same pattern as other tables)
ALTER TABLE tipologie_fornitore ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (no auth)
CREATE POLICY "Allow all on tipologie_fornitore" ON tipologie_fornitore
  FOR ALL USING (true) WITH CHECK (true);
