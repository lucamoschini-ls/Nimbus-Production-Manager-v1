"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";

export type Raggruppamento = "nessuno" | "fornitore" | "categoria_comp" | "categoria_tech" | "zona" | "data" | "gruppo_merceologico";
export type FinestraTemporale = "oggi" | "settimana" | "stagione" | string; // string for "range:DDMM-DDMM"
export type DrawerEntry = { tipo: "materiale" | "task" | "calcoli" | "operazione"; id: string };
export type TabSuperficie = "lista" | "catalogo" | "calcolatore";

export interface SuperficieState {
  tab: TabSuperficie;
  raggruppa: Raggruppamento;
  filtriCat: string[];
  filtriForn: string[];
  filtriGruppo: string[];
  finestra: FinestraTemporale;
  cerca: string;
  drawers: DrawerEntry[];
  ordina: string;
}

const MAX_DRAWERS = 3;

function parseDrawers(raw: string | null): DrawerEntry[] {
  if (!raw) return [];
  return raw.split(",").map(s => {
    const [tipo, id] = s.split(":");
    return { tipo: tipo as DrawerEntry["tipo"], id: id || "" };
  }).filter(d => d.id);
}

function serializeDrawers(drawers: DrawerEntry[]): string {
  return drawers.map(d => `${d.tipo}:${d.id}`).join(",");
}

export function useSuperficieState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const state: SuperficieState = useMemo(() => ({
    tab: (searchParams.get("tab") as TabSuperficie) || "lista",
    raggruppa: (searchParams.get("raggruppa") as Raggruppamento) || "nessuno",
    filtriCat: searchParams.get("filtri_cat")?.split(",").filter(Boolean) || [],
    filtriForn: searchParams.get("filtri_forn")?.split(",").filter(Boolean) || [],
    filtriGruppo: searchParams.get("filtri_gruppo")?.split(",").filter(Boolean) || [],
    finestra: (searchParams.get("finestra") as FinestraTemporale) || "stagione",
    cerca: searchParams.get("cerca") || "",
    drawers: parseDrawers(searchParams.get("drawer")),
    ordina: searchParams.get("ordina") || "nome_asc",
  }), [searchParams]);

  const setParam = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "" || v === "nessuno" || v === "stagione") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? "?" + qs : ""}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const setTab = useCallback((v: TabSuperficie) => {
    const params = new URLSearchParams(searchParams.toString());
    if (v === "lista") params.delete("tab");
    else params.set("tab", v);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? "?" + qs : ""}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const setRaggruppa = useCallback((v: Raggruppamento) => setParam({ raggruppa: v }), [setParam]);
  const setFinestra = useCallback((v: FinestraTemporale) => setParam({ finestra: v }), [setParam]);
  const setCerca = useCallback((v: string) => setParam({ cerca: v || null }), [setParam]);

  const toggleFiltroCat = useCallback((cat: string) => {
    const next = state.filtriCat.includes(cat)
      ? state.filtriCat.filter(c => c !== cat)
      : [...state.filtriCat, cat];
    setParam({ filtri_cat: next.length ? next.join(",") : null });
  }, [state.filtriCat, setParam]);

  const toggleFiltroForn = useCallback((forn: string) => {
    const next = state.filtriForn.includes(forn)
      ? state.filtriForn.filter(f => f !== forn)
      : [...state.filtriForn, forn];
    setParam({ filtri_forn: next.length ? next.join(",") : null });
  }, [state.filtriForn, setParam]);

  const toggleFiltroGruppo = useCallback((gruppo: string) => {
    const next = state.filtriGruppo.includes(gruppo)
      ? state.filtriGruppo.filter(g => g !== gruppo)
      : [...state.filtriGruppo, gruppo];
    setParam({ filtri_gruppo: next.length ? next.join(",") : null });
  }, [state.filtriGruppo, setParam]);

  const aprireDrawer = useCallback((tipo: DrawerEntry["tipo"], id: string) => {
    // Don't duplicate
    const existing = state.drawers.findIndex(d => d.tipo === tipo && d.id === id);
    if (existing >= 0) return;
    let next = [...state.drawers, { tipo, id }];
    // Rule of three: if >MAX, drop oldest
    if (next.length > MAX_DRAWERS) next = next.slice(next.length - MAX_DRAWERS);
    setParam({ drawer: serializeDrawers(next) });
  }, [state.drawers, setParam]);

  const chiudereDrawer = useCallback((idx: number) => {
    const next = state.drawers.filter((_, i) => i !== idx);
    setParam({ drawer: next.length ? serializeDrawers(next) : null });
  }, [state.drawers, setParam]);

  const chiudereUltimoDrawer = useCallback(() => {
    if (state.drawers.length === 0) return;
    chiudereDrawer(state.drawers.length - 1);
  }, [state.drawers, chiudereDrawer]);

  const resetSuperficie = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  // Preset applicators
  const applicaPreset = useCallback((preset: "acquisti" | "cantiere" | "catalogo") => {
    const presets: Record<string, Record<string, string | null>> = {
      acquisti: { raggruppa: "fornitore", filtri_cat: "consumo", finestra: "settimana", cerca: null, drawer: null, filtri_forn: null },
      cantiere: { raggruppa: "zona", filtri_cat: null, finestra: "oggi", cerca: null, drawer: null, filtri_forn: null },
      catalogo: { raggruppa: null, filtri_cat: null, finestra: null, cerca: null, drawer: null, filtri_forn: null },
    };
    const p = presets[preset];
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) { if (v) params.set(k, v); }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? "?" + qs : ""}`, { scroll: false });
  }, [router, pathname]);

  return {
    state,
    setTab, setRaggruppa, setFinestra, setCerca,
    toggleFiltroCat, toggleFiltroForn, toggleFiltroGruppo,
    aprireDrawer, chiudereDrawer, chiudereUltimoDrawer,
    resetSuperficie, applicaPreset,
    setParam,
  };
}
