import { SupabaseClient } from "@supabase/supabase-js";
import { addDays, parseISO, format, differenceInDays } from "date-fns";

export interface OpMinimal {
  id: string;
  titolo: string;
  tipologia: string | null;
  data_inizio: string;
  data_fine: string;
  luogoNome: string | null;
  matNome: string;
}

export interface TaskMinimal {
  id: string;
  titolo: string;
  fornitore_nome: string | null;
  data_inizio: string | null;
  data_fine: string | null;
}

export interface ImpactedOp {
  id: string;
  label: string; // e.g. "Trasporto vernice (da Monterosi)"
  currentDataInizio: string;
  currentDataFine: string;
  newDataInizio: string;
  newDataFine: string;
}

export interface ImpactedTask {
  id: string;
  titolo: string;
  fornitore_nome: string | null;
  currentDataInizio: string | null;
  currentDataFine: string | null;
  newDataInizio: string;
  newDataFine: string;
  changed: boolean;
  depth: number;
  ops: ImpactedOp[]; // impacted operazioni for this task
}

export interface DepGraph {
  dependsOn: Map<string, string[]>;
  dependedBy: Map<string, string[]>;
  taskInfo: Map<string, TaskMinimal>;
  taskOps: Map<string, OpMinimal[]>; // task_id → operazioni with dates
}

export async function fetchDependencyGraph(
  supabase: SupabaseClient
): Promise<DepGraph> {
  const [{ data: deps }, { data: tasks }, { data: mats }, { data: ops }] =
    await Promise.all([
      supabase.from("task_dipendenze").select("task_id, dipende_da_id"),
      supabase
        .from("v_task_completa")
        .select("id, titolo, fornitore_nome, data_inizio, data_fine"),
      supabase.from("materiali").select("id, task_id, nome"),
      supabase
        .from("operazioni")
        .select(
          "id, materiale_id, titolo, tipologia, data_inizio, data_fine, luogo:luoghi!operazioni_luogo_id_fkey(nome)"
        )
        .not("data_inizio", "is", null),
    ]);

  const dependsOn = new Map<string, string[]>();
  const dependedBy = new Map<string, string[]>();

  for (const d of deps ?? []) {
    if (!dependsOn.has(d.task_id)) dependsOn.set(d.task_id, []);
    dependsOn.get(d.task_id)!.push(d.dipende_da_id);

    if (!dependedBy.has(d.dipende_da_id))
      dependedBy.set(d.dipende_da_id, []);
    dependedBy.get(d.dipende_da_id)!.push(d.task_id);
  }

  const taskInfo = new Map<string, TaskMinimal>();
  for (const t of tasks ?? []) {
    taskInfo.set(t.id, t as TaskMinimal);
  }

  // Build materiale → task lookup
  const matTaskMap = new Map<string, { task_id: string; nome: string }>();
  for (const m of (mats ?? []) as { id: string; task_id: string; nome: string }[]) {
    matTaskMap.set(m.id, m);
  }

  // Group ops by task_id
  const taskOps = new Map<string, OpMinimal[]>();
  for (const op of (ops ?? []) as {
    id: string;
    materiale_id: string;
    titolo: string;
    tipologia: string | null;
    data_inizio: string;
    data_fine: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    luogo: any;
  }[]) {
    const mat = matTaskMap.get(op.materiale_id);
    if (!mat) continue;
    const luogoNome = Array.isArray(op.luogo)
      ? op.luogo[0]?.nome
      : op.luogo?.nome;
    const opMin: OpMinimal = {
      id: op.id,
      titolo: op.titolo,
      tipologia: op.tipologia,
      data_inizio: op.data_inizio,
      data_fine: op.data_fine || op.data_inizio,
      luogoNome: luogoNome ?? null,
      matNome: mat.nome,
    };
    if (!taskOps.has(mat.task_id)) taskOps.set(mat.task_id, []);
    taskOps.get(mat.task_id)!.push(opMin);
  }

  return { dependsOn, dependedBy, taskInfo, taskOps };
}

/**
 * Compute impacted ops for a task that shifts by `daysDelta` days.
 */
function computeImpactedOps(
  taskId: string,
  daysDelta: number,
  graph: DepGraph
): ImpactedOp[] {
  const ops = graph.taskOps.get(taskId) || [];
  if (daysDelta === 0) return [];
  return ops.map((op) => {
    const newStart = format(
      addDays(parseISO(op.data_inizio), daysDelta),
      "yyyy-MM-dd"
    );
    const newEnd = format(
      addDays(parseISO(op.data_fine), daysDelta),
      "yyyy-MM-dd"
    );
    const tip = (op.tipologia || op.titolo || "").replace(/_/g, " ");
    const label =
      `${tip} ${op.matNome}`.trim() +
      (op.luogoNome ? ` (da ${op.luogoNome})` : "");
    return {
      id: op.id,
      label,
      currentDataInizio: op.data_inizio,
      currentDataFine: op.data_fine,
      newDataInizio: newStart,
      newDataFine: newEnd,
    };
  });
}

/**
 * Analyze the cascade impact of moving a task's end date.
 * Returns tasks whose dates need to change, with their impacted operazioni.
 */
export function analyzeImpact(
  taskId: string,
  newDataFine: string,
  graph: DepGraph
): ImpactedTask[] {
  const result: ImpactedTask[] = [];
  const visited = new Set<string>();

  function recurse(parentId: string, parentNewEnd: string, depth: number) {
    const dependents = graph.dependedBy.get(parentId) || [];
    for (const depId of dependents) {
      if (visited.has(depId)) continue;
      visited.add(depId);

      const info = graph.taskInfo.get(depId);
      if (!info) continue;

      const requiredStart = format(
        addDays(parseISO(parentNewEnd), 1),
        "yyyy-MM-dd"
      );

      const currentStart = info.data_inizio;
      const currentEnd = info.data_fine;

      // No conflict: dependent already starts on or after the required date
      if (currentStart && currentStart >= requiredStart) {
        continue;
      }

      // Compute new dates preserving duration
      let newEnd = requiredStart;
      if (currentStart && currentEnd) {
        const duration = differenceInDays(
          parseISO(currentEnd),
          parseISO(currentStart)
        );
        newEnd = format(
          addDays(parseISO(requiredStart), duration),
          "yyyy-MM-dd"
        );
      }

      // Compute how many days this task shifts
      const daysDelta = currentStart
        ? differenceInDays(parseISO(requiredStart), parseISO(currentStart))
        : 0;

      const ops = computeImpactedOps(depId, daysDelta, graph);

      result.push({
        id: depId,
        titolo: info.titolo,
        fornitore_nome: info.fornitore_nome,
        currentDataInizio: currentStart,
        currentDataFine: currentEnd,
        newDataInizio: requiredStart,
        newDataFine: newEnd,
        changed: true,
        depth,
        ops,
      });

      recurse(depId, newEnd, depth + 1);
    }
  }

  recurse(taskId, newDataFine, 1);

  return result;
}

/** Get task labels for "Dipende da" display */
export function getDependsOnLabels(
  taskId: string,
  graph: DepGraph
): { id: string; titolo: string }[] {
  const deps = graph.dependsOn.get(taskId) || [];
  return deps
    .map((id) => {
      const info = graph.taskInfo.get(id);
      return info ? { id, titolo: info.titolo } : null;
    })
    .filter(Boolean) as { id: string; titolo: string }[];
}

/** Get task labels for "Blocca" display */
export function getDependedByLabels(
  taskId: string,
  graph: DepGraph
): { id: string; titolo: string }[] {
  const deps = graph.dependedBy.get(taskId) || [];
  return deps
    .map((id) => {
      const info = graph.taskInfo.get(id);
      return info ? { id, titolo: info.titolo } : null;
    })
    .filter(Boolean) as { id: string; titolo: string }[];
}
