/**
 * Funzione pura di calcolo materiali Nimbus.
 * Nessuna dipendenza React, nessuna chiamata Supabase.
 * Prende driver + coefficienti → produce lista materiali con fabbisogno calcolato.
 */

// ========== TIPI ==========

export interface CalcoloResult {
  nome: string;
  quantita: number;
  unita: string;
  fornitore: string;
  prezzo: number | null;
}

export interface CalcoloInput {
  driverMap: Record<string, number>;
  coeffMap: Record<string, number>;
}

// ========== HELPERS ==========

function d(driverMap: Record<string, number>, k: string): number {
  return driverMap[k] ?? 0;
}

function c(coeffMap: Record<string, number>, k: string): number {
  return coeffMap[k] ?? 0;
}

// ========== FORMULE INTERNE ==========

function calcolaCarpenteria(
  driverMap: Record<string, number>,
  coeffMap: Record<string, number>,
  scarto: number
): CalcoloResult[] {
  const results: CalcoloResult[] = [];

  const mq_tavola = c(coeffMap, "m_tavola_lunghezza") * c(coeffMap, "m_tavola_larghezza");
  const mq_pedane =
    d(driverMap, "mq_pedana_centrale") +
    d(driverMap, "mq_pedana_chiosco") +
    d(driverMap, "mq_pedana_banconi") +
    d(driverMap, "mq_pedana_swing") +
    d(driverMap, "mq_anfiteatri");

  if (mq_tavola > 0 && mq_pedane > 0) {
    const n_tavole = Math.ceil((mq_pedane / mq_tavola) * scarto);
    results.push({ nome: "Tavole legno pedane", quantita: n_tavole, unita: "pz", fornitore: "Da assegnare", prezzo: null });
    results.push({ nome: "Viti 5x50", quantita: Math.ceil(n_tavole * c(coeffMap, "viti_5x50_per_tavola")), unita: "pz", fornitore: "Da assegnare", prezzo: null });
    results.push({ nome: "Viti 6x120", quantita: Math.ceil(n_tavole * c(coeffMap, "viti_6x120_per_tavola")), unita: "pz", fornitore: "Da assegnare", prezzo: null });
    const ml_ped = mq_pedane / (c(coeffMap, "m_tavola_larghezza") || 0.15);
    results.push({ nome: "Morali", quantita: Math.ceil(ml_ped * c(coeffMap, "morali_per_ml_pedana")), unita: "pz", fornitore: "Da assegnare", prezzo: null });
  }

  const ml_vasi_tot = d(driverMap, "ml_vasi_4m") + d(driverMap, "ml_vasi_2m");
  if (ml_vasi_tot > 0 && c(coeffMap, "legno_per_ml_vaso") > 0) {
    results.push({ nome: "Legno sottomisure vasi", quantita: Math.ceil(ml_vasi_tot * c(coeffMap, "legno_per_ml_vaso")), unita: "m", fornitore: "Da assegnare", prezzo: null });
  }
  if (ml_vasi_tot > 0 && c(coeffMap, "viti_per_ml_vaso") > 0) {
    results.push({ nome: "Viti vasi", quantita: Math.ceil(ml_vasi_tot * c(coeffMap, "viti_per_ml_vaso")), unita: "pz", fornitore: "Da assegnare", prezzo: null });
  }

  return results;
}

function calcolaVerniciatura(
  driverMap: Record<string, number>,
  coeffMap: Record<string, number>,
  scarto: number
): CalcoloResult[] {
  const results: CalcoloResult[] = [];

  const L_tdm = d(driverMap, "mq_vern_testa_di_moro") > 0 && c(coeffMap, "resa_testa_di_moro") > 0
    ? Math.ceil(d(driverMap, "mq_vern_testa_di_moro") / c(coeffMap, "resa_testa_di_moro") * scarto) : 0;
  const L_imp = d(driverMap, "mq_vern_impregnante") > 0 && c(coeffMap, "resa_impregnante") > 0
    ? Math.ceil(d(driverMap, "mq_vern_impregnante") / c(coeffMap, "resa_impregnante") * 1.1) : 0;
  const L_nera = d(driverMap, "mq_vern_nera") > 0 && c(coeffMap, "resa_vernice_nera") > 0
    ? Math.ceil(d(driverMap, "mq_vern_nera") / c(coeffMap, "resa_vernice_nera") * 1.1) : 0;
  const L_oro = d(driverMap, "mq_vern_oro") > 0 && c(coeffMap, "resa_vernice_oro") > 0
    ? Math.ceil(d(driverMap, "mq_vern_oro") / c(coeffMap, "resa_vernice_oro") * 1.1) : 0;

  if (L_tdm > 0) results.push({ nome: "Vernice testa di moro", quantita: L_tdm, unita: "lt", fornitore: "Da assegnare", prezzo: null });
  if (L_imp > 0) results.push({ nome: "Impregnante", quantita: L_imp, unita: "lt", fornitore: "Da assegnare", prezzo: null });
  if (L_nera > 0) results.push({ nome: "Vernice nera", quantita: L_nera, unita: "lt", fornitore: "Da assegnare", prezzo: null });
  if (L_oro > 0) results.push({ nome: "Vernice oro", quantita: L_oro, unita: "lt", fornitore: "Da assegnare", prezzo: null });

  const L_totale = L_tdm + L_imp + L_nera + L_oro;
  if (L_totale > 0) {
    results.push({ nome: "Acquaragia", quantita: Math.ceil(L_totale * c(coeffMap, "perc_acquaragia") / 100), unita: "lt", fornitore: "Da assegnare", prezzo: null });
  }

  const n_pax = d(driverMap, "n_pax_verniciatura_max");
  if (n_pax > 0) {
    results.push({ nome: "Pennelli (set)", quantita: n_pax * 4, unita: "pz", fornitore: "Da assegnare", prezzo: null });
    results.push({ nome: "Rulli (set)", quantita: n_pax * 4, unita: "pz", fornitore: "Da assegnare", prezzo: null });
  }

  return results;
}

function calcolaStripled(
  driverMap: Record<string, number>,
  coeffMap: Record<string, number>
): CalcoloResult[] {
  const results: CalcoloResult[] = [];
  const ml_strip = d(driverMap, "ml_stripled_lineari");

  if (ml_strip > 0) {
    results.push({ nome: "Profilo alluminio stripled", quantita: Math.ceil(ml_strip), unita: "ml", fornitore: "Da assegnare", prezzo: null });
    results.push({ nome: "Viti fissaggio profilo", quantita: Math.ceil(ml_strip * c(coeffMap, "viti_per_ml_profilo")), unita: "pz", fornitore: "Da assegnare", prezzo: null });
    if (c(coeffMap, "ml_stripled_per_box") > 0) {
      results.push({ nome: "Box controllo stripled", quantita: Math.ceil(ml_strip / c(coeffMap, "ml_stripled_per_box")), unita: "pz", fornitore: "Da assegnare", prezzo: null });
    }
  }

  return results;
}

function calcolaElettricoNuvole(
  driverMap: Record<string, number>,
  coeffMap: Record<string, number>
): CalcoloResult[] {
  const results: CalcoloResult[] = [];
  const n_tot = d(driverMap, "n_nuvole_pedana") + d(driverMap, "n_round_totali") + d(driverMap, "n_nuvole_altre");

  if (n_tot > 0) {
    const dist = d(driverMap, "m_distanza_nuvola_regia") + c(coeffMap, "m_cavo_citofonico_per_nuvola");
    results.push({ nome: "Cavo citofonico", quantita: Math.ceil(n_tot * dist), unita: "m", fornitore: "Da assegnare", prezzo: null });
    results.push({ nome: "Corrugato", quantita: Math.ceil(n_tot * dist), unita: "m", fornitore: "Da assegnare", prezzo: null });
    results.push({ nome: "Strip RGBW nuvole", quantita: Math.ceil(n_tot * c(coeffMap, "m_strip_rgbw_per_nuvola")), unita: "m", fornitore: "Da assegnare", prezzo: null });
    results.push({ nome: "Wago connettori", quantita: Math.ceil(n_tot * c(coeffMap, "wago_per_nuvola")), unita: "pz", fornitore: "Da assegnare", prezzo: null });
  }

  return results;
}

function calcolaPrato(
  driverMap: Record<string, number>,
  coeffMap: Record<string, number>
): CalcoloResult[] {
  const results: CalcoloResult[] = [];
  const n_rotoli = d(driverMap, "n_rotoli_prato");

  if (n_rotoli > 1) {
    // Costante hardcoded: 25 = lunghezza rotolo prato in metri (non nel DB)
    results.push({ nome: "Picchetti prato", quantita: Math.ceil((n_rotoli - 1) * 25 * c(coeffMap, "picchetti_per_ml_giunzione")), unita: "pz", fornitore: "Da assegnare", prezzo: null });
  }

  return results;
}

// ========== FUNZIONE PRINCIPALE ==========

/**
 * Calcola il fabbisogno materiali dato driver e coefficienti.
 * Funzione pura: nessuna dipendenza React, nessuna chiamata Supabase.
 */
export function calcolaMateriali(input: CalcoloInput): CalcoloResult[] {
  const { driverMap, coeffMap } = input;
  const scarto = 1 + (coeffMap["scarto_perc_default"] ?? 0) / 100;

  return [
    ...calcolaCarpenteria(driverMap, coeffMap, scarto),
    ...calcolaVerniciatura(driverMap, coeffMap, scarto),
    ...calcolaStripled(driverMap, coeffMap),
    ...calcolaElettricoNuvole(driverMap, coeffMap),
    ...calcolaPrato(driverMap, coeffMap),
  ];
}
