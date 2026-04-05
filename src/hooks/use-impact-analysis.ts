"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchDependencyGraph,
  analyzeImpact,
  type DepGraph,
  type ImpactedTask,
} from "@/lib/dependency-utils";

export interface PendingImpact {
  taskId: string;
  taskTitle: string;
  field: string;
  value: string;
  newEnd: string;
  impacted: ImpactedTask[];
  onSave: () => void; // callback to save just this task's field
}

export function useImpactAnalysis() {
  const graphRef = useRef<DepGraph | null>(null);
  const [pending, setPending] = useState<PendingImpact | null>(null);

  // Prefetch graph on mount
  useEffect(() => {
    fetchDependencyGraph(createClient()).then((g) => {
      graphRef.current = g;
    });
  }, []);

  /** Ensure graph is loaded, fetching if necessary */
  const getGraph = useCallback(async (): Promise<DepGraph> => {
    if (graphRef.current) return graphRef.current;
    const g = await fetchDependencyGraph(createClient());
    graphRef.current = g;
    return g;
  }, []);

  /**
   * Check if changing a date creates dependency conflicts.
   * - If there are impacts: opens the modal (sets pending state), does NOT save.
   * - If no impacts: calls saveFn immediately.
   *
   * Use for data_fine changes. data_inizio changes without data_fine shift don't create conflicts.
   */
  const checkDateChange = useCallback(
    async (
      taskId: string,
      taskTitle: string,
      newDataFine: string,
      saveFn: () => void
    ) => {
      const graph = await getGraph();
      const impacted = analyzeImpact(taskId, newDataFine, graph);
      const hasChanges = impacted.some((t) => t.changed);

      if (hasChanges) {
        setPending({
          taskId,
          taskTitle,
          field: "data_fine",
          value: newDataFine,
          newEnd: newDataFine,
          impacted,
          onSave: saveFn,
        });
        return; // Don't save — modal will handle it
      }

      saveFn(); // No impact — save directly
    },
    [getGraph]
  );

  /** Handle "Sposta solo questa" — save just the changed task */
  const handleSingleOnly = useCallback(() => {
    if (pending) {
      pending.onSave();
    }
    setPending(null);
  }, [pending]);

  /** Handle "Sposta tutto" — save changed task + cascade all impacted */
  const handleCascade = useCallback(async () => {
    if (!pending) return;
    // Save the original task
    pending.onSave();
    // Save all impacted tasks
    const sb = createClient();
    for (const t of pending.impacted.filter((x) => x.changed)) {
      await sb
        .from("task")
        .update({ data_inizio: t.newDataInizio, data_fine: t.newDataFine })
        .eq("id", t.id);
    }
    // Update graph cache
    if (graphRef.current) {
      const info = graphRef.current.taskInfo.get(pending.taskId);
      if (info) {
        info.data_fine = pending.value;
      }
      for (const t of pending.impacted.filter((x) => x.changed)) {
        const tInfo = graphRef.current.taskInfo.get(t.id);
        if (tInfo) {
          tInfo.data_inizio = t.newDataInizio;
          tInfo.data_fine = t.newDataFine;
        }
      }
    }
    setPending(null);
  }, [pending]);

  /** Handle "Annulla" */
  const handleCancel = useCallback(() => {
    setPending(null);
  }, []);

  return {
    checkDateChange,
    getGraph,
    pending,
    handleSingleOnly,
    handleCascade,
    handleCancel,
    graphRef,
  };
}
