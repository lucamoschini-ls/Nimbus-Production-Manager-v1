import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const supabase = createClient(
  "https://puueppahkwnlpkxeygxr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1dWVwcGFoa3dubHBreGV5Z3hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTMzMTUsImV4cCI6MjA4OTQyOTMxNX0.l9McNJsvd7_h07tH-IzDaJb9hffOR1Jxrw_DWUAuiFw"
);

// Inline the pure calc function (can't import TS from MJS directly)
function calcolaMateriali(driverMap, coeffMap) {
  const d = (k) => driverMap[k] ?? 0;
  const c = (k) => coeffMap[k] ?? 0;
  const scarto = 1 + c("scarto_perc_default") / 100;
  const results = [];
  const add = (nome, qty, unita) => { if (qty > 0) results.push({ nome, quantita: Math.ceil(qty), unita }); };

  // CARPENTERIA
  const mq_tavola = c("m_tavola_lunghezza") * c("m_tavola_larghezza");
  const mq_pedane = d("mq_pedana_centrale") + d("mq_pedana_chiosco") + d("mq_pedana_banconi") + d("mq_pedana_swing") + d("mq_anfiteatri");
  if (mq_tavola > 0 && mq_pedane > 0) {
    const n_tavole = Math.ceil((mq_pedane / mq_tavola) * scarto);
    add("Tavole legno pedane", n_tavole, "pz");
    add("Viti 5x50", n_tavole * c("viti_5x50_per_tavola"), "pz");
    add("Viti 6x120", n_tavole * c("viti_6x120_per_tavola"), "pz");
    const ml_ped = mq_pedane / (c("m_tavola_larghezza") || 0.15);
    add("Morali", Math.ceil(ml_ped * c("morali_per_ml_pedana")), "pz");
  }
  const ml_vasi_tot = d("ml_vasi_4m") + d("ml_vasi_2m");
  if (ml_vasi_tot > 0 && c("legno_per_ml_vaso") > 0) add("Legno sottomisure vasi", Math.ceil(ml_vasi_tot * c("legno_per_ml_vaso")), "m");
  if (ml_vasi_tot > 0 && c("viti_per_ml_vaso") > 0) add("Viti vasi", Math.ceil(ml_vasi_tot * c("viti_per_ml_vaso")), "pz");

  // VERNICIATURA
  const L_tdm = d("mq_vern_testa_di_moro") > 0 && c("resa_testa_di_moro") > 0 ? Math.ceil(d("mq_vern_testa_di_moro") / c("resa_testa_di_moro") * scarto) : 0;
  const L_imp = d("mq_vern_impregnante") > 0 && c("resa_impregnante") > 0 ? Math.ceil(d("mq_vern_impregnante") / c("resa_impregnante") * 1.1) : 0;
  const L_nera = d("mq_vern_nera") > 0 && c("resa_vernice_nera") > 0 ? Math.ceil(d("mq_vern_nera") / c("resa_vernice_nera") * 1.1) : 0;
  const L_oro = d("mq_vern_oro") > 0 && c("resa_vernice_oro") > 0 ? Math.ceil(d("mq_vern_oro") / c("resa_vernice_oro") * 1.1) : 0;
  if (L_tdm > 0) add("Vernice testa di moro", L_tdm, "lt");
  if (L_imp > 0) add("Impregnante", L_imp, "lt");
  if (L_nera > 0) add("Vernice nera", L_nera, "lt");
  if (L_oro > 0) add("Vernice oro", L_oro, "lt");
  const L_tot = L_tdm + L_imp + L_nera + L_oro;
  if (L_tot > 0) add("Acquaragia", Math.ceil(L_tot * c("perc_acquaragia") / 100), "lt");
  const n_pax = d("n_pax_verniciatura_max");
  if (n_pax > 0) { add("Pennelli (set)", n_pax * 4, "pz"); add("Rulli (set)", n_pax * 4, "pz"); }

  // STRIPLED
  const ml_strip = d("ml_stripled_lineari");
  if (ml_strip > 0) {
    add("Profilo alluminio stripled", Math.ceil(ml_strip), "ml");
    add("Viti fissaggio profilo", Math.ceil(ml_strip * c("viti_per_ml_profilo")), "pz");
    if (c("ml_stripled_per_box") > 0) add("Box controllo stripled", Math.ceil(ml_strip / c("ml_stripled_per_box")), "pz");
  }

  // ELETTRICO NUVOLE
  const n_tot = d("n_nuvole_pedana") + d("n_round_totali") + d("n_nuvole_altre");
  if (n_tot > 0) {
    const dist = d("m_distanza_nuvola_regia") + c("m_cavo_citofonico_per_nuvola");
    add("Cavo citofonico", Math.ceil(n_tot * dist), "m");
    add("Corrugato", Math.ceil(n_tot * dist), "m");
    add("Strip RGBW nuvole", Math.ceil(n_tot * c("m_strip_rgbw_per_nuvola")), "m");
    add("Wago connettori", Math.ceil(n_tot * c("wago_per_nuvola")), "pz");
  }

  // PRATO
  const n_rotoli = d("n_rotoli_prato");
  if (n_rotoli > 1) add("Picchetti prato", Math.ceil((n_rotoli - 1) * 25 * c("picchetti_per_ml_giunzione")), "pz");

  return results;
}

async function main() {
  // Read DB
  const { data: drivers } = await supabase.from("calcolatore_driver").select("chiave, valore");
  const { data: coefficienti } = await supabase.from("calcolatore_coefficienti").select("chiave, valore, valore_default");

  const driverMap = {};
  drivers.forEach(d => { driverMap[d.chiave] = d.valore ?? 0; });
  const coeffMap = {};
  coefficienti.forEach(c => { coeffMap[c.chiave] = (c.valore || c.valore_default) ?? 0; });

  // Calculate
  const output = calcolaMateriali(driverMap, coeffMap);

  // Read snapshot
  const snapshot = JSON.parse(readFileSync("src/lib/calcolo-materiali.snapshot.json", "utf8"));
  const atteso = snapshot.output_atteso;

  // Compare
  let ok = 0;
  let diff = 0;

  for (const a of atteso) {
    const found = output.find(o => o.nome === a.nome);
    if (!found) {
      console.log(`MANCANTE: ${a.nome} (atteso ${a.quantita} ${a.unita})`);
      diff++;
    } else if (found.quantita !== a.quantita) {
      console.log(`DIFFERENZA: ${a.nome} — atteso ${a.quantita}, calcolato ${found.quantita}`);
      diff++;
    } else {
      ok++;
    }
  }

  // Check for extra output not in snapshot
  for (const o of output) {
    if (!atteso.find(a => a.nome === o.nome)) {
      console.log(`EXTRA (non nel snapshot): ${o.nome} = ${o.quantita} ${o.unita}`);
    }
  }

  console.log(`\n=== RISULTATO: ${ok}/${atteso.length} OK, ${diff} differenze ===`);
  if (diff === 0) console.log("TEST EQUIVALENZA SUPERATO");
  else console.log("TEST EQUIVALENZA FALLITO");
}

main().catch(console.error);
