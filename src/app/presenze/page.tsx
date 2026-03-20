import { createClient } from "@/lib/supabase/server";
import { PresenzeClient } from "./presenze-client";

export default async function PresenzePage() {
  const supabase = await createClient();

  const [{ data: presenze }, { data: fornitori }, { data: tasks }] = await Promise.all([
    supabase.from("presenze").select("*, fornitore:fornitori!presenze_fornitore_id_fkey(nome), task:task!presenze_task_id_fkey(titolo)").order("data", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("fornitori").select("id, nome").order("nome"),
    supabase.from("task").select("id, titolo").order("titolo"),
  ]);

  return (
    <PresenzeClient
      presenze={(presenze ?? []) as unknown as import("./presenze-client").Presenza[]}
      fornitori={(fornitori ?? []) as { id: string; nome: string }[]}
      tasks={(tasks ?? []) as { id: string; titolo: string }[]}
    />
  );
}
