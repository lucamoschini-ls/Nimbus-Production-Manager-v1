"use client";

import { BussolaBar } from "./components/bussola-bar";
import { PannelloControllo } from "./components/pannello-controllo";
import { ListaMateriali } from "./components/lista-materiali";
import { DrawerStack } from "./components/drawer-stack";
import { useSuperficieState } from "./hooks/use-superficie-state";

export function MaterialiSuperficie() {
  const {
    state,
    setRaggruppa, setFinestra, setCerca,
    toggleFiltroCat,
    aprireDrawer, chiudereDrawer, chiudereUltimoDrawer,
    resetSuperficie, applicaPreset,
  } = useSuperficieState();

  return (
    <div className="flex flex-col h-screen -m-6 -mb-24 md:-mb-6">
      <BussolaBar state={state} onReset={resetSuperficie} />
      <div className="flex flex-1 overflow-hidden">
        <PannelloControllo
          state={state}
          onRaggruppa={setRaggruppa}
          onToggleCat={toggleFiltroCat}
          onFinestra={setFinestra}
          onCerca={setCerca}
          onPreset={applicaPreset}
        />
        <ListaMateriali state={state} onOpenDrawer={aprireDrawer} />
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
