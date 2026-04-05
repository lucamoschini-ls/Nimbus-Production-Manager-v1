import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://puueppahkwnlpkxeygxr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1dWVwcGFoa3dubHBreGV5Z3hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTMzMTUsImV4cCI6MjA4OTQyOTMxNX0.l9McNJsvd7_h07tH-IzDaJb9hffOR1Jxrw_DWUAuiFw"
);

const HPD = 11;
const TODAY = "2026-04-05";
const DEADLINE = "2026-04-30";

const FINESTRE = {
  // FINESTRE TASSATIVE — non modificabili
  "All Service OR Carnaru": { start: "2026-04-10", end: "2026-04-17", persone: 1 },
  "Squadra finiture": { start: "2026-04-15", end: "2026-04-28", excludeWeekends: true, persone: 2 },
  "Leonardo Mikhail": { start: "2026-04-10", end: "2026-04-30", minimize: true, costoGiorno: 100 },
  "Mastroianni": { start: "2026-04-20", end: "2026-04-22" },
  "Rinalduzzi": { start: "2026-04-10", end: "2026-04-10" },
  "Sebach": { windows: [{ start: "2026-04-10", end: "2026-04-10" }, { start: "2026-04-18", end: "2026-04-18" }] },
  "Trasportiamo": { windows: [{ start: "2026-04-09", end: "2026-04-09" }, { start: "2026-04-13", end: "2026-04-13" }] },
  "Facchini": { start: "2026-04-09", end: "2026-04-30" },
  "Lumiroma": { start: "2026-04-27", end: "2026-04-27" },
  "Giardiniere": { start: "2026-04-29", end: "2026-04-29" },
  "Davino": { start: "2026-04-12", end: "2026-04-14" },
  "Tecnoconference OR AMG OR Pierpaolo": { windows: [{ start: "2026-04-12", end: "2026-04-14" }, { start: "2026-04-30", end: "2026-04-30" }] },
  "Costruzione Metalliche": { start: "2026-04-10", end: "2026-04-10" },
  "Ingegnere": { start: "2026-04-01", end: "2026-04-30" },
  "Luca": { start: "2026-03-20", end: "2026-04-30" },
  "Alessandro": { start: "2026-03-20", end: "2026-04-30" },
  "Chef (Danilo)": { start: "2026-04-25", end: "2026-04-30" },
  "Teti Acque": { start: "2026-04-20", end: "2026-04-22" },
  "Sater OR FN": { start: "2026-04-20", end: "2026-04-30" },
  "Tecnico audio/luci stagione": { start: "2026-04-04", end: "2026-04-30" },
};

const DATE_FISSE = {
  // PATTERN SPECIFICI PRIMA (evita che "verniciatura" generico matchi per primo)
  "verniciatura pedana swing": { preferredStart: "2026-04-28", preferredEnd: "2026-04-28", force: true },
  "verniciatura": { preferredStart: "2026-04-16", preferredEnd: "2026-04-17" },
  "prato sintetico": { preferredStart: "2026-04-28", preferredEnd: "2026-04-28" },
  "prato nero": { preferredStart: "2026-04-28", preferredEnd: "2026-04-28" },
  "irrigazione": { preferredStart: "2026-04-29", preferredEnd: "2026-04-29" },
  "messa a dimora allori": { preferredStart: "2026-04-30", preferredEnd: "2026-04-30" },
  "riempimento vasi terra": { preferredStart: "2026-04-30", preferredEnd: "2026-04-30" },
  "assemblaggio nuvola grande": { preferredStart: "2026-04-15", preferredEnd: "2026-04-15" },
  "scarico e posizionamento container bagni": { preferredStart: "2026-04-18", preferredEnd: "2026-04-18", force: true },
  "scarico e posizionamento container ufficio": { preferredStart: "2026-04-18", preferredEnd: "2026-04-18", force: true },
  "posizionamento nuvola grande": { preferredStart: "2026-04-18", preferredEnd: "2026-04-18", force: true },
  "espiantare fila allori": { preferredStart: "2026-04-09", preferredEnd: "2026-04-09", force: true },
  "espiantare due allori": { preferredStart: "2026-04-09", preferredEnd: "2026-04-09", force: true },
  "gazebi cucina": { preferredStart: "2026-04-10", preferredEnd: "2026-04-10", force: true },
  "passaggio nuovi cavi dmx": { preferredStart: "2026-04-10", preferredEnd: "2026-04-10" },
  "posizionamento e montaggio round + nuvola aperitivo": { preferredStart: "2026-04-28", preferredEnd: "2026-04-28", force: true },
  "montaggio e posizionamento arredi aperitivo": { preferredStart: "2026-04-28", preferredEnd: "2026-04-28", force: true },
  "manutenzione struttura round aperitivo": { preferredStart: "2026-04-30", preferredEnd: "2026-04-30", force: true },
  "rifacimento piano tavolo round": { preferredStart: "2026-04-17", preferredEnd: "2026-04-17", force: true },
  "costruzione nuovi anfiteatri": { preferredStart: "2026-04-17", preferredEnd: "2026-04-17", force: true },
};

// ========== HELPERS ==========
function addDays(s, n) { const x = new Date(s + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().split("T")[0]; }
function diffDays(a, b) { return Math.round((new Date(a + "T12:00:00Z") - new Date(b + "T12:00:00Z")) / 86400000); }
function isWE(s) { const day = new Date(s + "T12:00:00Z").getUTCDay(); return day === 0 || day === 6; }
function nextWD(s) { let x = s; while (isWE(x)) x = addDays(x, 1); return x; }
function dayName(s) { return new Date(s + "T12:00:00Z").toLocaleDateString("it-IT", { weekday: "short", timeZone: "UTC" }); }

function getWindow(name) {
  if (!name) return null;
  if (FINESTRE[name]) return FINESTRE[name];
  const ln = name.toLowerCase();
  for (const [k, v] of Object.entries(FINESTRE)) {
    for (const p of k.toLowerCase().split(" or ").map(s => s.trim())) {
      if (ln.includes(p) || p.includes(ln.split(" ")[0])) return v;
    }
  }
  return null;
}
function winStart(w) { return w?.windows ? w.windows[0].start : w?.start || TODAY; }
function winEnd(w) { return w?.windows ? w.windows[w.windows.length - 1].end : w?.end || DEADLINE; }

function getFixed(title) {
  const lt = title.toLowerCase();
  for (const [pat, dates] of Object.entries(DATE_FISSE)) { if (lt.includes(pat)) return dates; }
  return null;
}

function getWorkdays(start, end, exWE) {
  const days = []; let c = start;
  while (c <= end) { if (!exWE || !isWE(c)) days.push(c); c = addDays(c, 1); }
  return days;
}

// ========== FORNITORE OVERRIDES (applicate nel calcolo, non nel DB) ==========
const FORNITORE_OVERRIDE = {
  "set up luci su piante": "Leonardo Mikhail",
  "manutenzione struttura round aperitivo": "Alessandro",
};

// Task accettate fuori finestra (non segnalare come problema, escluse dal bin-packing)
const FUORI_FINESTRA_OK = [
  "set up luci su piante",
];
function getFornitore(task) {
  const lt = task.titolo.toLowerCase();
  for (const [pat, forn] of Object.entries(FORNITORE_OVERRIDE)) {
    if (lt.includes(pat)) return forn;
  }
  return task.fornitore_nome;
}

// ========== DURATA OVERRIDES (applicate nel calcolo, non nel DB) ==========
function getDurata(task) {
  if (task.durata_ore) return task.durata_ore;
  // Leonardo Mikhail: pattern-based overrides
  if (task.fornitore_nome === "Leonardo Mikhail") {
    const lt = task.titolo.toLowerCase();
    if (lt.includes("trovare e confermare")) return 1;
    if (lt.includes("smontaggio stripled")) return 2;
    if (lt.includes("verifica quadri")) return 1;
    if (lt.includes("controllo stripled")) return 0.5;
    if (lt.includes("passaggio cavo") || lt.includes("passaggio nuovi cavi")) return 1;
    if (lt.includes("messa a terra")) return 3;
    return 2; // default Leonardo NULL = 2h
  }
  // Ingegnere: "Definizione illuminazione" → 2h
  if (task.fornitore_nome === "Ingegnere") {
    const lt = task.titolo.toLowerCase();
    if (lt.includes("definizione illuminazione")) return 2;
  }
  return HPD; // default globale per NULL
}

// ========== TOPOLOGICAL SORT (Kahn's algorithm) ==========
function topoSort(taskIds, depGraph) {
  const inDeg = new Map();
  const adj = new Map();
  for (const id of taskIds) { inDeg.set(id, 0); adj.set(id, []); }
  for (const id of taskIds) {
    for (const depId of (depGraph.get(id) || [])) {
      if (taskIds.has(depId)) {
        adj.get(depId).push(id);
        inDeg.set(id, (inDeg.get(id) || 0) + 1);
      }
    }
  }
  const queue = [];
  for (const [id, deg] of inDeg) { if (deg === 0) queue.push(id); }
  const sorted = [];
  while (queue.length > 0) {
    const id = queue.shift();
    sorted.push(id);
    for (const next of (adj.get(id) || [])) {
      inDeg.set(next, inDeg.get(next) - 1);
      if (inDeg.get(next) === 0) queue.push(next);
    }
  }
  for (const id of taskIds) { if (!sorted.includes(id)) sorted.push(id); }
  return sorted;
}

// ========== PER-FORNITORE DAILY CAPACITY TRACKING ==========
const fornDailyHours = new Map(); // fornName -> Map<date, totalHours>
const fornDayTasks = new Map();   // fornName -> Map<date, [{task, ore}]>

function getFornDayHours(fn, d) {
  return fornDailyHours.get(fn)?.get(d) || 0;
}

function addFornDayHours(fn, d, h, task) {
  if (!fornDailyHours.has(fn)) fornDailyHours.set(fn, new Map());
  const m = fornDailyHours.get(fn);
  m.set(d, (m.get(d) || 0) + h);

  if (!fornDayTasks.has(fn)) fornDayTasks.set(fn, new Map());
  const dm = fornDayTasks.get(fn);
  if (!dm.has(d)) dm.set(d, []);
  dm.get(d).push({ task, ore: h });
}

// ========== MAIN ==========
async function main() {
  const apply = process.argv.includes("--apply");

  const { data: tasks } = await supabase.from("v_task_completa").select("id, titolo, zona_nome, lavorazione_nome, fornitore_nome, fornitore_id, data_inizio, data_fine, durata_ore, stato, stato_calcolato, tipologia");
  const { data: deps } = await supabase.from("task_dipendenze").select("task_id, dipende_da_id");

  const taskMap = new Map();
  tasks.forEach(t => taskMap.set(t.id, t));

  const depGraph = new Map();
  deps.forEach(d => {
    if (!depGraph.has(d.task_id)) depGraph.set(d.task_id, []);
    depGraph.get(d.task_id).push(d.dipende_da_id);
  });

  const scheduled = new Map(); // id -> { start, end }
  const conflicts = [];
  const warnings = [];

  // Pre-schedule completed tasks (their dates are fixed)
  tasks.filter(t => t.stato === "completata" && t.data_inizio).forEach(t => {
    scheduled.set(t.id, { start: t.data_inizio, end: t.data_fine || t.data_inizio });
  });

  const toSchedule = tasks.filter(t => t.stato !== "completata");

  // Apply fornitore overrides (in-memory, not DB)
  for (const t of toSchedule) { t.fornitore_nome = getFornitore(t); }

  // Topological sort ALL tasks to schedule
  const allIds = new Set(toSchedule.map(t => t.id));
  const sortedIds = topoSort(allIds, depGraph);

  const noFornitoreTasks = [];
  const deferredTasks = [];
  let nullDurataCount = 0;

  // ========== SINGLE PASS: schedule in topological order ==========
  for (const id of sortedIds) {
    const task = taskMap.get(id);
    if (!task || scheduled.has(task.id)) continue;

    if (!task.fornitore_nome) {
      noFornitoreTasks.push(task);
      continue;
    }

    const win = getWindow(task.fornitore_nome);
    const ore = getDurata(task);
    if (!task.durata_ore) nullDurataCount++;
    const exWE = win?.excludeWeekends || false;
    const persone = win?.persone || 1;
    const dailyCap = HPD * persone;
    const minimize = win?.minimize || false;

    // --- 0. Force-pinned tasks (date assolute, ignorano dipendenze) ---
    const fixed = getFixed(task.titolo);
    if (fixed?.force) {
      const start = fixed.preferredStart;
      const end = fixed.preferredEnd || start;
      addFornDayHours(task.fornitore_nome, start, ore, task);
      scheduled.set(task.id, { start, end, forced: true });
      continue;
    }

    // --- 0b. Deferred tasks (accettate fuori finestra, schedulate dopo il bin-packing) ---
    if (FUORI_FINESTRA_OK.some(p => task.titolo.toLowerCase().includes(p))) {
      deferredTasks.push(task);
      continue;
    }

    // --- 1. Earliest from dependencies (RIGID) ---
    let earliest = TODAY;
    for (const depId of (depGraph.get(task.id) || [])) {
      const sch = scheduled.get(depId);
      if (sch?.end) {
        const after = addDays(sch.end, 1);
        if (after > earliest) earliest = after;
      }
    }

    // --- 2. Window constraint ---
    if (win?.windows) {
      let found = false;
      for (const w of win.windows) {
        if (w.end >= earliest) {
          if (w.start > earliest) earliest = w.start;
          found = true;
          break;
        }
      }
      if (!found) {
        const lastW = win.windows[win.windows.length - 1];
        if (lastW.start > earliest) earliest = lastW.start;
      }
    } else {
      const ws = winStart(win);
      if (ws > earliest) earliest = ws;
    }
    if (earliest < TODAY) earliest = TODAY;

    // --- 3. Fixed dates (non-forced, preferred) ---
    if (fixed?.preferredStart && fixed.preferredStart >= earliest) earliest = fixed.preferredStart;

    // --- 4. Weekend exclusion ---
    if (exWE) earliest = nextWD(earliest);

    // --- 5. Schedule based on type ---
    if (minimize) {
      // BIN-PACKING: prefer existing partially-filled days
      let placed = false;

      if (ore <= HPD) {
        const existing = fornDailyHours.get(task.fornitore_nome);
        if (existing) {
          const candidates = [...existing.entries()]
            .filter(([d, used]) => d >= earliest && used + ore <= HPD)
            .sort((a, b) => a[0].localeCompare(b[0]));

          if (candidates.length > 0) {
            const day = candidates[0][0];
            addFornDayHours(task.fornitore_nome, day, ore, task);
            scheduled.set(task.id, { start: day, end: day });
            placed = true;
          }
        }
      }

      if (!placed) {
        let day = earliest;
        const maxDay = addDays(winEnd(win) || DEADLINE, 30);
        while (day <= maxDay) {
          if (getFornDayHours(task.fornitore_nome, day) + ore <= HPD) {
            addFornDayHours(task.fornitore_nome, day, ore, task);
            scheduled.set(task.id, { start: day, end: day });
            placed = true;
            break;
          }
          day = addDays(day, 1);
        }
        if (!placed) {
          addFornDayHours(task.fornitore_nome, earliest, ore, task);
          scheduled.set(task.id, { start: earliest, end: earliest });
        }
      }

      const sch = scheduled.get(task.id);
      if (sch.start > (winEnd(win) || DEADLINE)) {
        conflicts.push(`⚠ ${task.fornitore_nome}: "${task.titolo}" (${ore}h) piazzata ${sch.start}, FUORI finestra ${winEnd(win)}`);
      }

    } else {
      // REGULAR: sequential scheduling with capacity tracking
      if (ore <= dailyCap) {
        // Single-day task: find first day with enough remaining capacity
        let day = earliest;
        const maxDay = addDays(DEADLINE, 60);
        while (day <= maxDay) {
          if (exWE && isWE(day)) { day = addDays(day, 1); continue; }
          if (getFornDayHours(task.fornitore_nome, day) + ore <= dailyCap) break;
          day = addDays(day, 1);
        }
        addFornDayHours(task.fornitore_nome, day, ore, task);
        scheduled.set(task.id, { start: day, end: day });
      } else {
        // Multi-day task: spread across consecutive working days
        let day = earliest;
        let remaining = ore;
        let startDate = null;
        let endDate = null;
        while (remaining > 0) {
          if (exWE && isWE(day)) { day = addDays(day, 1); continue; }
          const used = getFornDayHours(task.fornitore_nome, day);
          const available = dailyCap - used;
          if (available <= 0) { day = addDays(day, 1); continue; }
          if (!startDate) startDate = day;
          const take = Math.min(remaining, available);
          addFornDayHours(task.fornitore_nome, day, take, task);
          remaining -= take;
          endDate = day;
          day = addDays(day, 1);
        }
        scheduled.set(task.id, { start: startDate || earliest, end: endDate || earliest });
      }

      const sch = scheduled.get(task.id);
      const wEnd = winEnd(win);
      if (sch.end > wEnd && win) {
        conflicts.push(`⚠ ${task.titolo} (${task.fornitore_nome}) finisce ${sch.end} ma finestra chiude ${wEnd}`);
      }
    }
  }

  // ========== DEFERRED TASKS (accettate fuori finestra) ==========
  for (const task of deferredTasks) {
    const ore = getDurata(task);
    let earliest = TODAY;
    for (const depId of (depGraph.get(task.id) || [])) {
      const sch = scheduled.get(depId);
      if (sch?.end) { const after = addDays(sch.end, 1); if (after > earliest) earliest = after; }
    }
    const win = getWindow(task.fornitore_nome);
    const ws = winStart(win);
    if (ws > earliest) earliest = ws;
    // Schedule on earliest date, no bin-packing optimization
    addFornDayHours(task.fornitore_nome, earliest, ore, task);
    scheduled.set(task.id, { start: earliest, end: earliest, deferred: true });
  }

  // ========== DEPENDENCY VIOLATION CHECK ==========
  for (const task of toSchedule) {
    const sch = scheduled.get(task.id);
    if (!sch || sch.forced) continue; // skip force-pinned tasks
    for (const depId of (depGraph.get(task.id) || [])) {
      const depSch = scheduled.get(depId);
      if (depSch?.end && sch.start <= depSch.end) {
        const depTask = taskMap.get(depId);
        conflicts.push(`⚠ DIPENDENZA VIOLATA: "${task.titolo}" inizia ${sch.start} ma dipende da "${depTask?.titolo}" che finisce ${depSch.end}`);
      }
    }
  }

  // ========== CAPACITY WARNINGS ==========
  for (const [fornName, win] of Object.entries(FINESTRE)) {
    if (win.minimize) continue;
    const fornTasks = toSchedule.filter(t => getWindow(t.fornitore_nome) === win && t.fornitore_nome);
    if (fornTasks.length === 0) continue;
    const totalOre = fornTasks.reduce((s, t) => s + getDurata(t), 0);
    const days = getWorkdays(winStart(win), winEnd(win), !!win.excludeWeekends);
    const cap = days.length * HPD * (win.persone || 1);
    if (totalOre > cap) warnings.push(`⚡ ${fornName}: ${totalOre}h di lavoro ma solo ${cap}h disponibili (${days.length}gg × ${win.persone || 1}p × ${HPD}h)`);
  }

  // ========== REPORT ==========
  console.log("\n=== AUTO-SCHEDULING REPORT ===\n");

  // Group by fornitore using fornDayTasks (accurate per-day breakdown)
  const allFornitori = new Set();
  for (const task of toSchedule) {
    if (task.fornitore_nome && scheduled.has(task.id)) allFornitori.add(task.fornitore_nome);
  }

  for (const fn of [...allFornitori].sort()) {
    const win = getWindow(fn);
    const minimize = win?.minimize || false;
    const dayMap = fornDayTasks.get(fn);
    if (!dayMap || dayMap.size === 0) continue;

    const days = [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const totalOre = days.reduce((s, [, dt]) => s + dt.reduce((ss, t) => ss + t.ore, 0), 0);
    const costoStr = minimize ? `, costo: ${days.length * (win?.costoGiorno || 100)}€` : "";

    console.log(`${fn.toUpperCase()} — ${days.length} giornate (${totalOre}h${costoStr}) [${winStart(win)} → ${winEnd(win)}]:`);
    for (const [day, dayTasks] of days) {
      const oreDay = dayTasks.reduce((s, t) => s + t.ore, 0);
      const taskList = dayTasks.map(t => `${t.task.titolo} (${t.ore}h)`).join(", ");
      console.log(`  ${day} ${dayName(day)}: ${taskList} = ${oreDay}h`);
    }
    console.log("");
  }

  // No fornitore
  if (noFornitoreTasks.length > 0) {
    console.log(`TASK SENZA FORNITORE (${noFornitoreTasks.length} — NON SCHEDULATE):`);
    for (const t of noFornitoreTasks) {
      console.log(`  - ${t.titolo} (${t.durata_ore || "?"}h) [${t.zona_nome} > ${t.lavorazione_nome}]`);
    }
    console.log("");
  }

  if (warnings.length > 0) { console.log("ATTENZIONE CAPACITA:"); for (const w of warnings) console.log(`  ${w}`); console.log(""); }

  const depViolations = conflicts.filter(c => c.includes("DIPENDENZA VIOLATA"));

  if (depViolations.length > 0) {
    console.log(`VIOLAZIONI DIPENDENZE (${depViolations.length}):`);
    for (const c of depViolations) console.log(`  ${c}`);
    console.log("");
  }

  // ========== DETAILED FUORI FINESTRA ANALYSIS ==========
  const fuoriFinestra = [];
  for (const task of toSchedule) {
    const sch = scheduled.get(task.id);
    if (!sch || sch.forced || !task.fornitore_nome) continue;
    const win = getWindow(task.fornitore_nome);
    if (!win) continue;
    const wEnd = winEnd(win);
    if ((sch.start > wEnd || sch.end > wEnd) && !FUORI_FINESTRA_OK.some(p => task.titolo.toLowerCase().includes(p))) {
      // Find bottleneck: the dep with the latest end date
      let bottleneckDep = null;
      let bottleneckEnd = null;
      for (const depId of (depGraph.get(task.id) || [])) {
        const depSch = scheduled.get(depId);
        if (depSch?.end && (!bottleneckEnd || depSch.end > bottleneckEnd)) {
          bottleneckEnd = depSch.end;
          bottleneckDep = taskMap.get(depId);
        }
      }

      // Determine reason
      let motivo;
      if (bottleneckDep && bottleneckEnd > wEnd) {
        motivo = `Dipende da "${bottleneckDep.titolo}" (${bottleneckDep.fornitore_nome || "no forn."}) che finisce ${bottleneckEnd}`;
      } else if (bottleneckDep && bottleneckEnd >= winStart(win)) {
        // Dep ends within window but capacity pushes this task out
        motivo = `Dipende da "${bottleneckDep.titolo}" (fine ${bottleneckEnd}) + capacita fornitore piena nel resto della finestra`;
      } else {
        // No dep bottleneck — pure capacity overflow
        const fornTasks = toSchedule.filter(t => t.fornitore_nome === task.fornitore_nome);
        const totalOre = fornTasks.reduce((s, t) => s + getDurata(t), 0);
        const days = getWorkdays(winStart(win), wEnd, !!win.excludeWeekends);
        const cap = days.length * HPD * (win.persone || 1);
        motivo = `Capacita insufficiente: ${totalOre}h di lavoro, finestra ha solo ${cap}h (${days.length}gg)`;
      }

      fuoriFinestra.push({
        titolo: task.titolo,
        zona: task.zona_nome,
        lav: task.lavorazione_nome,
        forn: task.fornitore_nome,
        start: sch.start,
        end: sch.end,
        wEnd,
        motivo,
      });
    }
  }

  if (fuoriFinestra.length > 0) {
    // Sort by fornitore, then by date
    fuoriFinestra.sort((a, b) => a.forn.localeCompare(b.forn) || a.start.localeCompare(b.start));

    console.log(`\nFUORI FINESTRA — DETTAGLIO (${fuoriFinestra.length}):\n`);
    let lastForn = null;
    let idx = 0;
    for (const f of fuoriFinestra) {
      if (f.forn !== lastForn) {
        if (lastForn) console.log("");
        console.log(`--- ${f.forn.toUpperCase()} (finestra chiude ${f.wEnd}) ---`);
        lastForn = f.forn;
      }
      idx++;
      const dateStr = f.start === f.end ? f.start : `${f.start} → ${f.end}`;
      console.log(`  ${idx}. ${f.titolo}`);
      console.log(`     [${f.zona} > ${f.lav}]`);
      console.log(`     Schedulata: ${dateStr} ${dayName(f.start)}`);
      console.log(`     Motivo: ${f.motivo}`);
    }
    console.log("");
  }

  const schCount = [...scheduled.values()].filter(v => v.start).length;
  const allEnds = [...scheduled.values()].filter(v => v.end).map(v => v.end).sort();
  const allStarts = [...scheduled.values()].filter(v => v.start).map(v => v.start).sort();
  console.log("RIEPILOGO:");
  console.log(`  Task schedulate: ${schCount}/${toSchedule.length} (${noFornitoreTasks.length} senza fornitore)`);
  console.log(`  Violazioni dipendenze: ${depViolations.length}`);
  console.log(`  Fuori finestra: ${fuoriFinestra.length}`);
  console.log(`  Avvertenze capacita: ${warnings.length}`);
  console.log(`  Task con durata non specificata (default ${HPD}h): ${nullDurataCount}`);
  if (allStarts.length) console.log(`  Periodo: ${allStarts[0]} — ${allEnds[allEnds.length - 1]} (${diffDays(allEnds[allEnds.length - 1], allStarts[0]) + 1} giorni)`);
  console.log("\n=== FINE REPORT ===\n");

  if (apply) {
    console.log("Applicando...");
    let upd = 0;
    for (const [id, r] of scheduled) {
      if (!r.start || taskMap.get(id)?.stato === "completata") continue;
      const { error } = await supabase.from("task").update({ data_inizio: r.start, data_fine: r.end }).eq("id", id);
      if (error) console.log(`  ERR: ${error.message}`); else upd++;
    }
    console.log(`  ${upd} task aggiornate.`);
  }
}

main().catch(console.error);
