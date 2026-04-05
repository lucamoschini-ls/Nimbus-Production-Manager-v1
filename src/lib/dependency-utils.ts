import { SupabaseClient } from "@supabase/supabase-js";
import { addDays, parseISO, format, differenceInDays } from "date-fns";

export interface TaskMinimal {
  id: string;
  titolo: string;
  fornitore_nome: string | null;
  data_inizio: string | null;
  data_fine: string | null;
}

export interface ImpactedTask {
  id: string;
  titolo: string;
  fornitore_nome: string | null;
  currentDataInizio: string | null;
  currentDataFine: string | null;
  newDataInizio: string;
  newDataFine: string;
  changed: boolean; // true if dates actually change
  depth: number;
}

export interface DepGraph {
  dependsOn: Map<string, string[]>;   // task_id → IDs it depends on
  dependedBy: Map<string, string[]>;  // task_id → IDs that depend on it (blocca)
  taskInfo: Map<string, TaskMinimal>;
}

export async function fetchDependencyGraph(
  supabase: SupabaseClient
): Promise<DepGraph> {
  const [{ data: deps }, { data: tasks }] = await Promise.all([
    supabase.from("task_dipendenze").select("task_id, dipende_da_id"),
    supabase
      .from("v_task_completa")
      .select("id, titolo, fornitore_nome, data_inizio, data_fine"),
  ]);

  const dependsOn = new Map<string, string[]>();
  const dependedBy = new Map<string, string[]>();

  for (const d of deps ?? []) {
    if (!dependsOn.has(d.task_id)) dependsOn.set(d.task_id, []);
    dependsOn.get(d.task_id)!.push(d.dipende_da_id);

    if (!dependedBy.has(d.dipende_da_id)) dependedBy.set(d.dipende_da_id, []);
    dependedBy.get(d.dipende_da_id)!.push(d.task_id);
  }

  const taskInfo = new Map<string, TaskMinimal>();
  for (const t of tasks ?? []) {
    taskInfo.set(t.id, t as TaskMinimal);
  }

  return { dependsOn, dependedBy, taskInfo };
}

/**
 * Analyze the cascade impact of moving a task's end date.
 * Returns only tasks whose dates actually need to change.
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

      // The dependent must start AFTER the parent's new end
      const requiredStart = format(
        addDays(parseISO(parentNewEnd), 1),
        "yyyy-MM-dd"
      );

      const currentStart = info.data_inizio;
      const currentEnd = info.data_fine;

      // If the dependent already starts after the required date, no change needed
      if (currentStart && currentStart > parentNewEnd) {
        // No conflict — but still add to list as "unchanged" for information
        result.push({
          id: depId,
          titolo: info.titolo,
          fornitore_nome: info.fornitore_nome,
          currentDataInizio: currentStart,
          currentDataFine: currentEnd,
          newDataInizio: currentStart,
          newDataFine: currentEnd || currentStart,
          changed: false,
          depth,
        });
        // Don't recurse for unchanged tasks
        continue;
      }

      // Calculate new end preserving duration
      let newEnd = requiredStart;
      if (currentStart && currentEnd) {
        const duration = differenceInDays(
          parseISO(currentEnd),
          parseISO(currentStart)
        );
        newEnd = format(addDays(parseISO(requiredStart), duration), "yyyy-MM-dd");
      }

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
      });

      // Recurse into this task's dependents with its new end date
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
