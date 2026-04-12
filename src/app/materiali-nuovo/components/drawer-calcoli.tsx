"use client";

import type { DrawerData } from "../materiali-superficie";
import { CalcoloPanel } from "./calcolo-panel";

interface Props {
  id: string;
  drawerData: DrawerData;
}

export function DrawerCalcoli({ id, drawerData }: Props) {
  void id;
  return (
    <CalcoloPanel
      driverItems={drawerData.driverItems}
      coeffItems={drawerData.coeffItems}
      onUpdateDriver={drawerData.onUpdateDriver}
      onUpdateCoeff={drawerData.onUpdateCoeff}
    />
  );
}
