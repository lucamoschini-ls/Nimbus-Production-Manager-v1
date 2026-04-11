"use client";

import { useMemo, useState, useCallback } from "react";
import { BussolaBar } from "./components/bussola-bar";
import { PannelloControllo } from "./components/pannello-controllo";
import { ListaMateriali } from "./components/lista-materiali";
import { DrawerStack } from "./components/drawer-stack";
import { useSuperficieState } from "./hooks/use-superficie-state";
import { calcolaMateriali } from "@/lib/calcolo-materiali";

// ---- Raw data types (from server) ----

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

interface CatalogoExtraRow {
  id: string;
  categoria_comportamentale: string | null;
  tipo_voce: string;
}

interface MaterialeTaskRow {
  task_id: string;
  catalogo_id: string | null;
  quantita: number | null;
  unita: string | null;
}

interface DisponibilitaRow {
  catalogo_id: string;
  qta_magazzino: number;
  qta_recupero: number;
  qta_ordinata: number;
}

export interface DriverRow {
  id: string;
  chiave: string;
  label: string;
  valore: number;
  valore_default: number | null;
  unita: string | null;
  gruppo: string | null;
  ordine: number;
  tooltip: string | null;
}
export interface CoefficienteRow {
  id: string;
  chiave: string;
  label: string;
  valore: number;
  valore_default: number | null;
  unita: string | null;
  gruppo: string | null;
  ordine: number;
  tooltip: string | null;
}
interface TaskRow {
  id: string;
  titolo: string;
  tipologia: string | null;
  stato: string;
  stato_calcolato: string;
  data_inizio: string | null;
  data_fine: string | null;
  durata_ore: number | null;
  numero_persone: number | null;
  fornitore_id: string | null;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  lavorazione: any; // PostgREST returns object or array depending on FK inference
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

// ---- Exported types for child components ----

export interface MaterialeArricchito {
  id: string;
  nome: string;
  fornitore: string;
  categoria_comp: string | null;
  tipologia: string | null;
  tipo_voce: string;
  unita: string;
  prezzo_unitario: number;
  provenienza: string;
  fabbisogno_calcolato: number;
  qta_magazzino: number;
  qta_recupero: number;
  qta_ordinata: number;
  disponibile: number;
  da_comprare: number;
  costo_da_comprare: number;
  stato_semaforo: "verde" | "giallo" | "rosso";
}

export interface TaskInfo {
  id: string;
  titolo: string;
  tipologia: string | null;
  stato: string;
  stato_calcolato: string;
  data_inizio: string | null;
  data_fine: string | null;
  durata_ore: number | null;
  numero_persone: number | null;
  fornitore_id: string | null;
  lavorazione_nome: string;
  zona_nome: string;
}

export interface TaskLink {
  task_id: string;
  quantita: number | null;
  unita: string | null;
}

export interface MaterialLink {
  catalogo_id: string;
  quantita: number | null;
  unita: string | null;
}

export interface DrawerData {
  materialiMap: Map<string, MaterialeArricchito>;
  taskMap: Map<string, TaskInfo>;
  taskLinksByCatalogo: Map<string, TaskLink[]>;
  matLinksByTask: Map<string, MaterialLink[]>;
  driverItems: DriverRow[];
  coeffItems: CoefficienteRow[];
  onUpdateDriver: (id: string, valore: number) => void;
  onUpdateCoeff: (id: string, valore: number) => void;
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

  // Local state — updated by inline editors, drives recomputation
  const [dispState, setDispState] = useState(disponibilita);
  const [driverState, setDriverState] = useState(driver);
  const [coeffState, setCoeffState] = useState(coefficienti);

  const handleUpdateDisp = useCallback(
    (
      catalogoId: string,
      campo: "qta_magazzino" | "qta_recupero" | "qta_ordinata",
      valore: number
    ) => {
      setDispState((prev) =>
        prev.map((d) =>
          d.catalogo_id === catalogoId ? { ...d, [campo]: valore } : d
        )
      );
    },
    []
  );

  const handleUpdateDriver = useCallback((id: string, valore: number) => {
    setDriverState((prev) =>
      prev.map((d) => (d.id === id ? { ...d, valore } : d))
    );
  }, []);

  const handleUpdateCoeff = useCallback((id: string, valore: number) => {
    setCoeffState((prev) =>
      prev.map((c) => (c.id === id ? { ...c, valore } : c))
    );
  }, []);

  // Call calcolaMateriali with reactive driver/coeff state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const calcoloResults = useMemo(() => {
    try {
      const driverMap: Record<string, number> = {};
      for (const d of driverState) driverMap[d.chiave] = d.valore ?? 0;
      const coeffMap: Record<string, number> = {};
      for (const co of coeffState) coeffMap[co.chiave] = co.valore ?? 0;
      return calcolaMateriali({ driverMap, coeffMap });
    } catch (e) {
      console.error("calcolaMateriali error:", e);
      return [];
    }
  }, [driverState, coeffState]);

  // Build enriched array from v_catalogo_acquisti + extras
  const tuttiMateriali = useMemo(() => {
    const extraMap = new Map<string, CatalogoExtraRow>();
    for (const e of catalogoExtra) extraMap.set(e.id, e);

    const dispMap = new Map<string, DisponibilitaRow>();
    for (const d of dispState) {
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
      const da_comprare = Math.max(0, fabbisogno - disponibile);
      const costo = da_comprare * (c.prezzo_unitario ?? 0);

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
        provenienza: c.provenienza_default || "—",
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
  }, [catalogoView, catalogoExtra, dispState]);

  // ---- Drawer data lookups ----

  const taskMap = useMemo(() => {
    const map = new Map<string, TaskInfo>();
    for (const t of tasks) {
      // PostgREST may return joins as object or array
      const lav = Array.isArray(t.lavorazione)
        ? t.lavorazione[0]
        : t.lavorazione;
      const zona = lav
        ? Array.isArray(lav.zona)
          ? lav.zona[0]
          : lav.zona
        : null;
      map.set(t.id, {
        id: t.id,
        titolo: t.titolo,
        tipologia: t.tipologia,
        stato: t.stato,
        stato_calcolato: t.stato_calcolato,
        data_inizio: t.data_inizio,
        data_fine: t.data_fine,
        durata_ore: t.durata_ore,
        numero_persone: t.numero_persone,
        fornitore_id: t.fornitore_id,
        lavorazione_nome: lav?.nome ?? "—",
        zona_nome: zona?.nome ?? "—",
      });
    }
    return map;
  }, [tasks]);

  const materialiMap = useMemo(() => {
    const map = new Map<string, MaterialeArricchito>();
    for (const m of tuttiMateriali) map.set(m.id, m);
    return map;
  }, [tuttiMateriali]);

  const taskLinksByCatalogo = useMemo(() => {
    const map = new Map<string, TaskLink[]>();
    for (const m of materialiTask) {
      if (!m.catalogo_id) continue;
      if (!map.has(m.catalogo_id)) map.set(m.catalogo_id, []);
      map.get(m.catalogo_id)!.push({
        task_id: m.task_id,
        quantita: m.quantita,
        unita: m.unita,
      });
    }
    return map;
  }, [materialiTask]);

  const matLinksByTask = useMemo(() => {
    const map = new Map<string, MaterialLink[]>();
    for (const m of materialiTask) {
      if (!m.catalogo_id) continue;
      if (!map.has(m.task_id)) map.set(m.task_id, []);
      map.get(m.task_id)!.push({
        catalogo_id: m.catalogo_id,
        quantita: m.quantita,
        unita: m.unita,
      });
    }
    return map;
  }, [materialiTask]);

  // Earliest task date per catalog item (for raggruppa-per-data)
  const materialeEarliestDate = useMemo(() => {
    const map = new Map<string, string>();
    taskLinksByCatalogo.forEach((links, catalogoId) => {
      let earliest: string | null = null;
      for (const link of links) {
        const task = taskMap.get(link.task_id);
        if (task?.data_inizio) {
          if (!earliest || task.data_inizio < earliest) {
            earliest = task.data_inizio;
          }
        }
      }
      if (earliest) map.set(catalogoId, earliest);
    });
    return map;
  }, [taskLinksByCatalogo, taskMap]);

  const drawerData: DrawerData = useMemo(
    () => ({
      materialiMap,
      taskMap,
      taskLinksByCatalogo,
      matLinksByTask,
      driverItems: driverState,
      coeffItems: coeffState,
      onUpdateDriver: handleUpdateDriver,
      onUpdateCoeff: handleUpdateCoeff,
    }),
    [
      materialiMap,
      taskMap,
      taskLinksByCatalogo,
      matLinksByTask,
      driverState,
      coeffState,
      handleUpdateDriver,
      handleUpdateCoeff,
    ]
  );

  // ---- Time filtering ----

  const taskDateMap = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const t of tasks) map.set(t.id, t.data_inizio);
    return map;
  }, [tasks]);

  const catalogoTaskIds = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const m of materialiTask) {
      if (!m.catalogo_id) continue;
      if (!map.has(m.catalogo_id)) map.set(m.catalogo_id, new Set());
      map.get(m.catalogo_id)!.add(m.task_id);
    }
    return map;
  }, [materialiTask]);

  // ---- Filters ----

  const materialiFiltrati = useMemo(() => {
    let result = tuttiMateriali;

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
        const tIds = catalogoTaskIds.get(m.id);
        if (!tIds) return false;
        return Array.from(tIds).some((tid) => {
          const ds = taskDateMap.get(tid);
          if (!ds) return false;
          const d = new Date(ds);
          return d >= start && d < end;
        });
      });
    }

    if (state.filtriCat.length > 0) {
      result = result.filter(
        (m) =>
          m.categoria_comp != null && state.filtriCat.includes(m.categoria_comp)
      );
    }
    if (state.filtriForn.length > 0) {
      result = result.filter((m) => state.filtriForn.includes(m.fornitore));
    }
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
        onOpenCalcoli={() => aprireDrawer("calcoli", "main")}
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
          materialeEarliestDate={materialeEarliestDate}
          onOpenDrawer={aprireDrawer}
          onUpdateDisp={handleUpdateDisp}
        />
        <DrawerStack
          drawers={state.drawers}
          drawerData={drawerData}
          onClose={chiudereDrawer}
          onCloseUltimo={chiudereUltimoDrawer}
          onOpenDrawer={aprireDrawer}
        />
      </div>
    </div>
  );
}
