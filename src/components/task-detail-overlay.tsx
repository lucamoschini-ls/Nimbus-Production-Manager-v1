"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { TaskDetailSheet } from "@/app/lavorazioni/task-detail-sheet";

interface Props {
  taskId: string | null;
  onClose: () => void;
  onTaskUpdated?: () => void;
}

export function TaskDetailOverlay({ taskId, onClose, onTaskUpdated }: Props) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [task, setTask] = useState<any>(null);
  const [fornitori, setFornitori] = useState<any[]>([]);
  const [tipologie, setTipologie] = useState<any[]>([]);
  const [zone, setZone] = useState<any[]>([]);
  const [lavorazioni, setLavorazioni] = useState<any[]>([]);
  const [luoghi, setLuoghi] = useState<any[]>([]);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      return;
    }
    const sb = createClient();

    // Fetch task
    sb.from("v_task_completa")
      .select("*")
      .eq("id", taskId)
      .single()
      .then(({ data }) => setTask(data));

    // Fetch reference data
    sb.from("fornitori")
      .select("id, nome, stato")
      .order("nome")
      .then(({ data }) => setFornitori(data ?? []));
    sb.from("tipologie")
      .select("nome, colore")
      .order("ordine")
      .then(({ data }) => setTipologie(data ?? []));
    sb.from("zone")
      .select("id, nome, colore")
      .order("ordine")
      .then(({ data }) => setZone(data ?? []));
    sb.from("lavorazioni")
      .select("id, zona_id, nome")
      .order("ordine")
      .then(({ data }) => setLavorazioni(data ?? []));
    sb.from("luoghi")
      .select("id, nome")
      .order("ordine")
      .then(({ data }) => setLuoghi(data ?? []));
  }, [taskId]);

  if (!taskId || !task) return null;

  return (
    <TaskDetailSheet
      task={task}
      fornitori={fornitori}
      tipologieDb={tipologie}
      zone={zone}
      lavorazioni={lavorazioni}
      luoghi={luoghi}
      open={!!taskId}
      onClose={onClose}
      onSave={async (data) => {
        const sb = createClient();
        await sb.from("task").update(data).eq("id", taskId);
        // Refetch task to update UI
        const { data: updated } = await sb
          .from("v_task_completa")
          .select("*")
          .eq("id", taskId)
          .single();
        if (updated) setTask(updated);
        onTaskUpdated?.();
      }}
    />
  );
}
