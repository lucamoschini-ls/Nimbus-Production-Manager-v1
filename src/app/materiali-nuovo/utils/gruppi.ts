export const GRUPPI_MERCEOLOGICI = [
  'Allestimento/strutture',
  'Consumabili e protezione',
  'Elettrico',
  'Ferramenta varia',
  'Idraulico',
  'Legno',
  'Utensili',
  'Vernici e finiture',
  'Verde e prato',
  'Viteria',
] as const;

export const GRUPPO_OPTIONS = GRUPPI_MERCEOLOGICI.map(g => ({ value: g, label: g }));
