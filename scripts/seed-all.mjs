import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const supabase = createClient(
  "https://puueppahkwnlpkxeygxr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1dWVwcGFoa3dubHBreGV5Z3hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTMzMTUsImV4cCI6MjA4OTQyOTMxNX0.l9McNJsvd7_h07tH-IzDaJb9hffOR1Jxrw_DWUAuiFw"
);

const tasks = JSON.parse(readFileSync("tasks_seed.json", "utf-8"));

// ========== LAVORAZIONI per zona ==========
const LAVORAZIONI = {
  "Pre-Cantiere": [
    "Ricerca fornitori",
    "Sopralluoghi",
    "Materiali e ordini",
    "Budget",
  ],
  Permessi: ["Pratiche"],
  Ingresso: [
    "Vialetto",
    "Portale archi",
    "Vasi ingresso",
    "Allori ingresso",
    "Stripled ingresso",
    "Luci piante ingresso",
    "Irrigazione ingresso",
  ],
  Aperitivo: [
    "Terreno aperitivo",
    "Swing",
    "Round aperitivo",
    "Prato sintetico",
    "Arredi aperitivo",
    "Luci e audio aperitivo",
    "Varie aperitivo",
  ],
  "Area Bagni": [
    "Container bagni",
    "Cisterne e impianto idrico",
    "Sanitrit",
    "Autoclave",
    "Elettrico bagni",
    "Finiture bagni",
  ],
  "Locali Tecnici": [
    "Container ufficio",
    "Cucina e magazzino",
    "Impianto reflue",
    "Elettrico locali tecnici",
    "Finiture locali tecnici",
  ],
  Chiosco: [
    "Nuvola grande",
    "Manutenzione struttura chiosco",
    "Banconi e bar chiosco",
    "Bottigliera",
    "Scaffalature",
    "Camminamento chiosco-pedana",
    "Stripled chiosco",
  ],
  Pedana: [
    "Anfiteatri",
    "Gradini pedana",
    "Manutenzione pedana",
    "Nuvole pedana",
    "Cablaggio DMX",
    "Stage",
    "Service audio",
    "Service luci",
    "Regia",
    "Bar pedana",
    "Arredi pedana",
    "Round pedana",
    "Vasi pedana",
  ],
  Generale: [
    "Distribuzione elettrica",
    "Sicurezza elettrica",
    "Sicurezza e evacuazione",
    "Oscuramento via Gramsci",
    "Area rifiuti",
    "Contatore",
    "Vasi generali",
    "Allori generali",
    "Irrigazione generale",
    "Trasporto Monterosi",
  ],
};

// ========== Mapping task -> lavorazione (by task ID) ==========
function mapTaskToLavorazione(t) {
  const title = t.task.toLowerCase();
  const zona = t.zona || "Generale";

  switch (zona) {
    case "Pre-Cantiere":
      if (title.includes("trovare") || title.includes("confermare") || title.includes("organizzare facchini"))
        return "Ricerca fornitori";
      if (title.includes("sopralluogo")) return "Sopralluoghi";
      if (title.includes("lista materiali") || title.includes("ordine materiali") || title.includes("definizione lista"))
        return "Materiali e ordini";
      if (title.includes("budget")) return "Budget";
      if (title.includes("acea")) return "Budget";
      if (title.includes("layout cucina")) return "Ricerca fornitori";
      return "Ricerca fornitori";

    case "Permessi":
      return "Pratiche";

    case "Ingresso":
      if (title.includes("vialetto") || title.includes("vialetti") || title.includes("porfido") || title.includes("rilievo misure tavole"))
        return "Vialetto";
      if (title.includes("archi") || title.includes("portale")) return "Portale archi";
      if (title.includes("vasi ingresso") || title.includes("vasi") || title.includes("legno per vasi") || title.includes("mq e mc vasi"))
        return "Vasi ingresso";
      if (title.includes("allori") || title.includes("terra ingresso"))
        return "Allori ingresso";
      if (title.includes("stripled")) return "Stripled ingresso";
      if (title.includes("luci piante") || title.includes("set up luci"))
        return "Luci piante ingresso";
      if (title.includes("irrigazione")) return "Irrigazione ingresso";
      if (title.includes("vernice vialetto")) return "Vialetto";
      return "Vialetto";

    case "Aperitivo":
      if (title.includes("terreno") || title.includes("livellamento"))
        return "Terreno aperitivo";
      if (title.includes("swing") || title.includes("nuvolette") || title.includes("scritta led") || title.includes("fondale"))
        return "Swing";
      if (title.includes("round") || title.includes("nuvola aperitivo"))
        return "Round aperitivo";
      if (title.includes("prato sintetico") || title.includes("picchett"))
        return "Prato sintetico";
      if (title.includes("arredi") || title.includes("cuscini"))
        return "Arredi aperitivo";
      if (title.includes("filodiffusione") || title.includes("audio"))
        return "Luci e audio aperitivo";
      if (title.includes("siepe") || title.includes("pannello") || title.includes("secchi"))
        return "Varie aperitivo";
      if (title.includes("impianto elettrico swing"))
        return "Swing";
      return "Varie aperitivo";

    case "Area Bagni":
      if (title.includes("container bagni") || title.includes("scarico e posizionamento container"))
        return "Container bagni";
      if (title.includes("cisterna") || title.includes("acqua potabile"))
        return "Cisterne e impianto idrico";
      if (title.includes("sanitrit")) return "Sanitrit";
      if (title.includes("autoclave") || title.includes("casotto"))
        return "Autoclave";
      if (title.includes("elettric") || title.includes("corrente") || title.includes("illuminazione zona bagni"))
        return "Elettrico bagni";
      if (title.includes("rampa") || title.includes("prato nero"))
        return "Finiture bagni";
      return "Container bagni";

    case "Locali Tecnici":
      if (title.includes("container ufficio")) return "Container ufficio";
      if (title.includes("cucina") || title.includes("magazzino") || title.includes("casetta") || title.includes("gazeb") || title.includes("beverage"))
        return "Cucina e magazzino";
      if (title.includes("reflue") || title.includes("tubo")) return "Impianto reflue";
      if (title.includes("elettric") || title.includes("distribuzione"))
        return "Elettrico locali tecnici";
      if (title.includes("prato") || title.includes("tappet") || title.includes("illuminazione") || title.includes("acqua potabile"))
        return "Finiture locali tecnici";
      return "Finiture locali tecnici";

    case "Chiosco":
      if (title.includes("nuvola grande")) return "Nuvola grande";
      if (title.includes("manutenzione") && (title.includes("pedana chiosco") || title.includes("boiserie")))
        return "Manutenzione struttura chiosco";
      if (title.includes("banconi") || title.includes("serranda") || title.includes("cassone") || title.includes("sottobanconi") || title.includes("pedana banconi") || title.includes("pozzetto"))
        return "Banconi e bar chiosco";
      if (title.includes("bottigliera") || title.includes("maniglia"))
        return "Bottigliera";
      if (title.includes("scaffal")) return "Scaffalature";
      if (title.includes("camminamento")) return "Camminamento chiosco-pedana";
      if (title.includes("stripled") && !title.includes("nuvola"))
        return "Stripled chiosco";
      if (title.includes("vernic") || title.includes("vernice")) {
        if (title.includes("legno")) return "Manutenzione struttura chiosco";
        return "Manutenzione struttura chiosco";
      }
      if (title.includes("guaina") || title.includes("copertura"))
        return "Manutenzione struttura chiosco";
      if (title.includes("elettric")) return "Banconi e bar chiosco";
      if (title.includes("quadri stripled nuvola")) return "Nuvola grande";
      return "Manutenzione struttura chiosco";

    case "Pedana":
      if (title.includes("anfiteatr") || title.includes("telai"))
        return "Anfiteatri";
      if (title.includes("gradin")) return "Gradini pedana";
      if (title.includes("manutenzione pedana") || title.includes("manutenzione tavole") || title.includes("riverniciatura") || title.includes("vernice pedana") || title.includes("verniciatura") && title.includes("pedana"))
        return "Manutenzione pedana";
      if (title.includes("nuvol") || title.includes("pali nuvol") || title.includes("stabilizzazione palo"))
        return "Nuvole pedana";
      if (title.includes("dmx") || title.includes("messa a terra"))
        return "Cablaggio DMX";
      if (title.includes("stage") || title.includes("pedana stage"))
        return "Stage";
      if (title.includes("service audio") || title.includes("allestimento service audio"))
        return "Service audio";
      if (title.includes("service luci") || title.includes("allestimento service luci") || title.includes("allestimento e luci"))
        return "Service luci";
      if (title.includes("regia") || title.includes("consolle") || title.includes("tettoia regia"))
        return "Regia";
      if (title.includes("bar pedana") || title.includes("lavandino") || title.includes("moduli bar") || title.includes("bottigliera bar"))
        return "Bar pedana";
      if (title.includes("arredi") || title.includes("round in pedana"))
        return "Arredi pedana";
      if (title.includes("round") && !title.includes("round in"))
        return "Round pedana";
      if (title.includes("vasi pedana") || title.includes("vasi") && title.includes("pedana"))
        return "Vasi pedana";
      if (title.includes("rampa")) return "Gradini pedana";
      if (title.includes("camminamento")) return "Gradini pedana";
      if (title.includes("stripled")) return "Gradini pedana";
      return "Manutenzione pedana";

    case "Generale":
      if (title.includes("distribuzione elettrica") || title.includes("distribuzione"))
        return "Distribuzione elettrica";
      if (title.includes("messa a terra") || title.includes("bobina") || title.includes("ups"))
        return "Sicurezza elettrica";
      if (title.includes("emergenza") || title.includes("evacuazione") || title.includes("estintori") || title.includes("cartelli"))
        return "Sicurezza e evacuazione";
      if (title.includes("oscuramento") || title.includes("gramsci"))
        return "Oscuramento via Gramsci";
      if (title.includes("rifiuti")) return "Area rifiuti";
      if (title.includes("contatore") || title.includes("nicchia"))
        return "Contatore";
      if (title.includes("vasi general") || title.includes("costruzione vasi") || title.includes("verniciatura vasi") || title.includes("vernice vasi") || title.includes("protezione legno") || title.includes("metri vasi"))
        return "Vasi generali";
      if (title.includes("allori") || title.includes("terra general") || title.includes("riempimento") || title.includes("messa a dimora") || title.includes("fornitore allori"))
        return "Allori generali";
      if (title.includes("irrigazione")) return "Irrigazione generale";
      if (title.includes("monterosi") || title.includes("trasporto") || title.includes("carico") || title.includes("scarico") || title.includes("legno casa"))
        return "Trasporto Monterosi";
      if (title.includes("luci su piante")) return "Distribuzione elettrica";
      if (title.includes("legno rimanente")) return "Trasporto Monterosi";
      if (title.includes("portale")) return "Vasi generali";
      if (title.includes("sabbia")) return "Vasi generali";
      return "Distribuzione elettrica";

    default:
      return Object.values(LAVORAZIONI[zona] || ["Varie"])[0];
  }
}

// ========== Tipologia mapping ==========
const TIPO_MAP = {
  "Amministrativo": "amministrativo",
  "Misure/Rilievo": "misure_rilievo",
  "Decisione": "decisione",
  "Acquisto": "acquisto",
  "Giardinaggio": "giardinaggio",
  "Carpenteria": "carpenteria",
  "Pulizia/Manut.": "pulizia_manutenzione",
  "Verniciatura": "verniciatura",
  "Elettrico": "elettrico",
  "Montaggio": "montaggio",
  "Trasporto": "trasporto",
  "Audio/Luci": "audio_luci",
  "Idraulico": "idraulico",
};

async function main() {
  // 1. Get zone
  const { data: zone } = await supabase.from("zone").select("*");
  const zoneMap = {};
  zone.forEach((z) => (zoneMap[z.nome] = z.id));
  console.log("Zone caricate:", Object.keys(zoneMap).length);

  // 2. Get fornitori
  const { data: fornitori } = await supabase.from("fornitori").select("id, nome");
  const fornitoriMap = {};
  fornitori.forEach((f) => (fornitoriMap[f.nome.toLowerCase()] = f.id));
  console.log("Fornitori caricati:", fornitori.length);

  // 3. Delete existing lavorazioni and tasks (cascade)
  console.log("Pulizia dati esistenti...");
  await supabase.from("task_dipendenze").delete().neq("task_id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("materiali").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("task").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("lavorazioni").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // 4. Create lavorazioni
  const lavorazioniMap = {}; // "zona:nome" -> id
  for (const [zonaNome, lavNames] of Object.entries(LAVORAZIONI)) {
    const zonaId = zoneMap[zonaNome];
    if (!zonaId) {
      console.log("ZONA NON TROVATA:", zonaNome);
      continue;
    }
    for (let i = 0; i < lavNames.length; i++) {
      const { data, error } = await supabase
        .from("lavorazioni")
        .insert({ zona_id: zonaId, nome: lavNames[i], ordine: i })
        .select("id")
        .single();
      if (error) {
        console.log("ERRORE lavorazione:", lavNames[i], error.message);
      } else {
        lavorazioniMap[`${zonaNome}:${lavNames[i]}`] = data.id;
      }
    }
  }
  console.log("Lavorazioni create:", Object.keys(lavorazioniMap).length);

  // 5. Insert tasks
  const taskIdMap = {}; // excel id -> supabase uuid
  let inserted = 0;
  let skipped = 0;

  for (const t of tasks) {
    const zona = t.zona || "Generale";
    const lavNome = mapTaskToLavorazione(t);
    const lavKey = `${zona}:${lavNome}`;
    const lavId = lavorazioniMap[lavKey];

    if (!lavId) {
      console.log(`LAVORAZIONE NON TROVATA: ${lavKey} per task "${t.task}" (id ${t.id})`);
      skipped++;
      continue;
    }

    // Match fornitore
    let fornitoreId = null;
    if (t.quale) {
      const searchName = t.quale.toLowerCase();
      fornitoreId = fornitoriMap[searchName] || null;
      if (!fornitoreId) {
        // Try partial match
        for (const [name, id] of Object.entries(fornitoriMap)) {
          if (name.includes(searchName) || searchName.includes(name)) {
            fornitoreId = id;
            break;
          }
        }
      }
      if (!fornitoreId) {
        console.log(`  Fornitore non trovato: "${t.quale}" per task "${t.task}"`);
      }
    }

    const tipologia = TIPO_MAP[t.tipo] || null;

    const taskData = {
      lavorazione_id: lavId,
      titolo: t.task,
      tipologia,
      fornitore_id: fornitoreId,
      stato_fornitore_minimo: fornitoreId ? "pronto" : "pronto",
      stato: "da_fare",
      data_fine: t.deadline || null,
      durata_giorni: t.gg ? Math.round(t.gg) : null,
      note: t.note || null,
      ordine: inserted,
    };

    // Calculate data_inizio from deadline - durata
    if (t.deadline && t.gg) {
      const end = new Date(t.deadline);
      const start = new Date(end);
      start.setDate(start.getDate() - Math.round(t.gg));
      taskData.data_inizio = start.toISOString().split("T")[0];
    }

    const { data, error } = await supabase
      .from("task")
      .insert(taskData)
      .select("id")
      .single();

    if (error) {
      console.log(`ERRORE task "${t.task}":`, error.message);
      skipped++;
    } else {
      taskIdMap[t.id] = data.id;
      inserted++;
    }
  }
  console.log(`\nTask inserite: ${inserted}, saltate: ${skipped}`);

  // 6. Create dependencies
  let depsCreated = 0;
  for (const t of tasks) {
    if (!t.dip || t.dip === "tutte") continue;

    const taskUuid = taskIdMap[t.id];
    if (!taskUuid) continue;

    // Parse dependencies: "11, 12, 13" or "18.0" etc
    const depIds = t.dip
      .toString()
      .split(",")
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n));

    for (const depId of depIds) {
      const depUuid = taskIdMap[depId];
      if (!depUuid) {
        console.log(`  Dipendenza non trovata: task ${t.id} -> ${depId}`);
        continue;
      }
      const { error } = await supabase
        .from("task_dipendenze")
        .insert({ task_id: taskUuid, dipende_da_id: depUuid });
      if (error) {
        console.log(`  Errore dipendenza ${t.id}->${depId}:`, error.message);
      } else {
        depsCreated++;
      }
    }
  }
  console.log(`Dipendenze create: ${depsCreated}`);

  // 7. Verify
  const { count: taskCount } = await supabase.from("task").select("*", { count: "exact", head: true });
  const { count: lavCount } = await supabase.from("lavorazioni").select("*", { count: "exact", head: true });
  const { count: depCount } = await supabase.from("task_dipendenze").select("*", { count: "exact", head: true });
  console.log(`\nVerifica finale: ${lavCount} lavorazioni, ${taskCount} task, ${depCount} dipendenze`);
}

main().catch(console.error);
