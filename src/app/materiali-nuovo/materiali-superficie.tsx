"use client";

import { useMemo } from "react";
import { BussolaBar } from "./components/bussola-bar";
import { PannelloControllo } from "./components/pannello-controllo";
import { ListaMateriali } from "./components/lista-materiali";
import { DrawerStack } from "./components/drawer-stack";
import { useSuperficieState } from "./hooks/use-superficie-state";
import { calcolaMateriali } from "@/lib/calcolo-materiali";

// ---- Raw data types (from server) ----

interface CatalogoRow {
  id: string;
  nome: string;
  categoria_comportamentale: string | null;
  tipologia_materiale: string | null;
  tipo_voce: string;
  unita: string | null;
  unita_default: string | null;
  prezzo_unitario: number | null;
  prezzo_unitario_default: number | null;
  fornitore_preferito: string | null;
}

interface MaterialeTaskRow {
  id: string;
  task_id: string;
  catalogo_id: string | null;
  quantita: number | null;
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
  catalogo: CatalogoRow[];
  materialiTask: MaterialeTaskRow[];
  disponibilita: DisponibilitaRow[];
  driver: DriverRow[];
  coefficienti: CoefficienteRow[];
  tasks: TaskRow[];
}

export function MaterialiSuperficie({
  catalogo,
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

  // Call calcolaMateriali (mattone 2 function — required by architecture)
  // Result used by future mattoni for formula-based fabbisogno
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

  // Build full enriched array from DB data
  const tuttiMateriali = useMemo(() => {
    // Index disponibilita by catalogo_id
    const dispMap = new Map<string, DisponibilitaRow>();
    for (const d of disponibilita) {
      if (d.catalogo_id) dispMap.set(d.catalogo_id, d);
    }

    // Sum materiali quantities by catalogo_id (fabbisogno from task links)
    const fabbisognoMap = new Map<string, number>();
    for (const m of materialiTask) {
      if (!m.catalogo_id || m.quantita == null) continue;
      fabbisognoMap.set(
        m.catalogo_id,
        (fabbisognoMap.get(m.catalogo_id) || 0) + m.quantita
      );
    }

    return catalogo.map((c): MaterialeArricchito => {
      const fabbisogno = fabbisognoMap.get(c.id) || 0;
      const disp = dispMap.get(c.id);
      const magazzino = disp?.qta_magazzino ?? 0;
      const recupero = disp?.qta_recupero ?? 0;
      const ordinato = disp?.qta_ordinata ?? 0;
      const disponibile = magazzino + recupero + ordinato;
      const da_comprare = Math.max(0, fabbisogno - disponibile);
      const prezzo = c.prezzo_unitario ?? c.prezzo_unitario_default ?? 0;
      const costo = da_comprare * prezzo;

      let semaforo: "verde" | "giallo" | "rosso" = "verde";
      if (fabbisogno > 0 && fabbisogno > disponibile) {
        semaforo = ordinato > 0 ? "giallo" : "rosso";
      }

      return {
        id: c.id,
        nome: c.nome,
        fornitore: c.fornitore_preferito || "Da assegnare",
        categoria_comp: c.categoria_comportamentale,
        tipologia: c.tipologia_materiale ?? null,
        tipo_voce: c.tipo_voce || "standard",
        unita: c.unita || c.unita_default || "pz",
        prezzo_unitario: prezzo,
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
  }, [catalogo, materialiTask, disponibilita]);

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
        // settimana
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

  // Distinct fornitore names from actual catalog data
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
