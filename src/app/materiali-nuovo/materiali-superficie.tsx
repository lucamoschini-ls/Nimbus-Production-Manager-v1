"use client";

import { useMemo } from "react";
import { BussolaBar } from "./components/bussola-bar";
import { PannelloControllo } from "./components/pannello-controllo";
import { ListaMateriali } from "./components/lista-materiali";
import { DrawerStack } from "./components/drawer-stack";
import { useSuperficieState } from "./hooks/use-superficie-state";
import { calcolaMateriali } from "@/lib/calcolo-materiali";

// ---- Raw data types (from server) ----

/** Row from v_catalogo_acquisti view — canonical source for unit, price, aggregates */
interface CatalogoViewRow {
  id: string;
  nome: string;
  tipologia_materiale: string;
  unita: string | null;
  prezzo_unitario: number | null;
  quantita_disponibile_globale: number;
  fornitore_preferito: string | null;
  provenienza_default: string | null;
  note: string | null;
  quantita_totale_necessaria: number;
  num_task: number;
  quantita_da_acquistare: number;
  costo_stimato: number | null;
}

/** Extra columns from catalogo_materiali not in the view */
interface CatalogoExtraRow {
  id: string;
  categoria_comportamentale: string | null;
  tipo_voce: string;
}

/** Task link — only for time filtering */
interface MaterialeTaskRow {
  task_id: string;
  catalogo_id: string | null;
}

interface DisponibilitaRow {
  catalogo_id: string;
  qta_magazzino: number;
  qta_recupero: number;
  qta_ordinata: number;
}

interface DriverRow {
  chiave: string;
  valore: number;
}
interface CoefficienteRow {
  chiave: string;
  valore: number;
}
interface TaskRow {
  id: string;
  data_inizio: string | null;
}

// ---- Enriched material type (exported for child components) ----

export interface MaterialeArricchito {
  id: string;
  nome: string;
  fornitore: string;
  categoria_comp: string | null;
  tipologia: string | null;
  tipo_voce: string;
  unita: string;
  prezzo_unitario: number;
  fabbisogno_calcolato: number;
  qta_magazzino: number;
  qta_recupero: number;
  qta_ordinata: number;
  disponibile: number;
  da_comprare: number;
  costo_da_comprare: number;
  stato_semaforo: "verde" | "giallo" | "rosso";
}

// ---- Props ----

interface Props {
  catalogoView: CatalogoViewRow[];
  catalogoExtra: CatalogoExtraRow[];
  materialiTask: MaterialeTaskRow[];
  disponibilita: DisponibilitaRow[];
  driver: DriverRow[];
  coefficienti: CoefficienteRow[];
  tasks: TaskRow[];
}

export function MaterialiSuperficie({
  catalogoView,
  catalogoExtra,
  materialiTask,
  disponibilita,
  driver,
  coefficienti,
  tasks,
}: Props) {
  const {
    state,
    setRaggruppa,
    setFinestra,
    setCerca,
    toggleFiltroCat,
    toggleFiltroForn,
    aprireDrawer,
    chiudereDrawer,
    chiudereUltimoDrawer,
    resetSuperficie,
    applicaPreset,
  } = useSuperficieState();

  // Task date lookup
  const taskDateMap = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const t of tasks) map.set(t.id, t.data_inizio);
    return map;
  }, [tasks]);

  // Call calcolaMateriali (mattone 2 function — kept for future drawer use)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const calcoloResults = useMemo(() => {
    try {
      const driverMap: Record<string, number> = {};
      for (const d of driver) driverMap[d.chiave] = d.valore ?? 0;
      const coeffMap: Record<string, number> = {};
      for (const co of coefficienti) coeffMap[co.chiave] = co.valore ?? 0;
      return calcolaMateriali({ driverMap, coeffMap });
    } catch (e) {
      console.error("calcolaMateriali error:", e);
      return [];
    }
  }, [driver, coefficienti]);

  // Build enriched array from v_catalogo_acquisti + extras
  const tuttiMateriali = useMemo(() => {
    // Index extra data (categoria, tipo_voce) by id
    const extraMap = new Map<string, CatalogoExtraRow>();
    for (const e of catalogoExtra) extraMap.set(e.id, e);

    // Index disponibilita by catalogo_id
    const dispMap = new Map<string, DisponibilitaRow>();
    for (const d of disponibilita) {
      if (d.catalogo_id) dispMap.set(d.catalogo_id, d);
    }

    return catalogoView.map((c): MaterialeArricchito => {
      const extra = extraMap.get(c.id);
      const disp = dispMap.get(c.id);
      const magazzino = disp?.qta_magazzino ?? 0;
      const recupero = disp?.qta_recupero ?? 0;
      const ordinato = disp?.qta_ordinata ?? 0;
      const disponibile = magazzino + recupero + ordinato;
      const fabbisogno = c.quantita_totale_necessaria ?? 0;
      const da_comprare = c.quantita_da_acquistare ?? 0;
      const costo = c.costo_stimato ?? 0;

      let semaforo: "verde" | "giallo" | "rosso" = "verde";
      if (fabbisogno > 0 && da_comprare > 0) {
        semaforo = ordinato > 0 ? "giallo" : "rosso";
      }

      return {
        id: c.id,
        nome: c.nome,
        fornitore: c.fornitore_preferito || "Da assegnare",
        categoria_comp: extra?.categoria_comportamentale ?? null,
        tipologia: c.tipologia_materiale ?? null,
        tipo_voce: extra?.tipo_voce || "standard",
        unita: c.unita || "pz",
        prezzo_unitario: c.prezzo_unitario ?? 0,
        fabbisogno_calcolato: fabbisogno,
        qta_magazzino: magazzino,
        qta_recupero: recupero,
        qta_ordinata: ordinato,
        disponibile,
        da_comprare,
        costo_da_comprare: costo,
        stato_semaforo: semaforo,
      };
    });
  }, [catalogoView, catalogoExtra, disponibilita]);

  // Catalog → task links for time filtering
  const catalogoTaskIds = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const m of materialiTask) {
      if (!m.catalogo_id) continue;
      if (!map.has(m.catalogo_id)) map.set(m.catalogo_id, new Set());
      map.get(m.catalogo_id)!.add(m.task_id);
    }
    return map;
  }, [materialiTask]);

  // Apply all filters
  const materialiFiltrati = useMemo(() => {
    let result = tuttiMateriali;

    // Time window filter
    if (state.finestra !== "stagione") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let start: Date;
      let end: Date;

      if (state.finestra === "oggi") {
        start = today;
        end = new Date(today);
        end.setDate(end.getDate() + 1);
      } else {
        const day = now.getDay();
        const mondayOff = day === 0 ? -6 : 1 - day;
        start = new Date(today);
        start.setDate(today.getDate() + mondayOff);
        end = new Date(start);
        end.setDate(start.getDate() + 7);
      }

      result = result.filter((m) => {
        const taskIds = catalogoTaskIds.get(m.id);
        if (!taskIds) return false;
        return Array.from(taskIds).some((tid) => {
          const ds = taskDateMap.get(tid);
          if (!ds) return false;
          const d = new Date(ds);
          return d >= start && d < end;
        });
      });
    }

    // Category filter
    if (state.filtriCat.length > 0) {
      result = result.filter(
        (m) =>
          m.categoria_comp != null && state.filtriCat.includes(m.categoria_comp)
      );
    }

    // Fornitore filter
    if (state.filtriForn.length > 0) {
      result = result.filter((m) => state.filtriForn.includes(m.fornitore));
    }

    // Search
    if (state.cerca) {
      const q = state.cerca.toLowerCase();
      result = result.filter((m) => m.nome.toLowerCase().includes(q));
    }

    return result;
  }, [
    tuttiMateriali,
    state.finestra,
    state.filtriCat,
    state.filtriForn,
    state.cerca,
    catalogoTaskIds,
    taskDateMap,
  ]);

  // Distinct fornitore names from catalog data
  const fornitoriDistinti = useMemo(() => {
    const set = new Set<string>();
    for (const m of tuttiMateriali) set.add(m.fornitore);
    return Array.from(set).sort();
  }, [tuttiMateriali]);

  return (
    <div className="flex flex-col h-screen -m-6 -mb-24 md:-mb-6">
      <BussolaBar
        state={state}
        materiali={materialiFiltrati}
        onReset={resetSuperficie}
      />
      <div className="flex flex-1 overflow-hidden">
        <PannelloControllo
          state={state}
          fornitori={fornitoriDistinti}
          onRaggruppa={setRaggruppa}
          onToggleCat={toggleFiltroCat}
          onToggleForn={toggleFiltroForn}
          onFinestra={setFinestra}
          onCerca={setCerca}
          onPreset={applicaPreset}
        />
        <ListaMateriali
          state={state}
          materiali={materialiFiltrati}
          onOpenDrawer={aprireDrawer}
        />
        <DrawerStack
          drawers={state.drawers}
          onClose={chiudereDrawer}
          onCloseUltimo={chiudereUltimoDrawer}
          onOpenDrawer={aprireDrawer}
        />
      </div>
    </div>
  );
}
