import { createClient } from "@/lib/supabase/server";
import { FornitoriClient } from "./fornitori-client";

export default async function FornitoriPage() {
  const supabase = await createClient();

  const [{ data: fornitori }, { data: permessi }] = await Promise.all([
    supabase
      .from("v_fornitori_riepilogo")
      .select("*")
      .order("nome"),
    supabase
      .from("permessi")
      .select("*")
      .order("nome"),
  ]);

  return (
    <FornitoriClient
      fornitori={fornitori ?? []}
      permessi={permessi ?? []}
    />
  );
}
