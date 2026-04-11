import { createClient } from "@/lib/supabase/server";
import { CalcolatoreClient } from "./calcolatore-client";

export default async function CalcolatorePage() {
  const supabase = await createClient();

  const [{ data: drivers }, { data: coefficienti }, { data: disponibilita }, { data: unaTantum }, { data: catalogo }] =
    await Promise.all([
      supabase.from("calcolatore_driver").select("*").order("ordine"),
      supabase.from("calcolatore_coefficienti").select("*").order("ordine"),
      supabase.from("materiali_disponibilita").select("*"),
      supabase.from("materiali_una_tantum").select("*").order("ordine"),
      supabase.from("v_catalogo_acquisti").select("id, nome, prezzo_unitario, unita, fornitore_preferito, quantita_disponibile_globale"),
    ]);

  return (
    <CalcolatoreClient
      drivers={drivers ?? []}
      coefficienti={coefficienti ?? []}
      disponibilita={disponibilita ?? []}
      unaTantum={unaTantum ?? []}
      catalogo={catalogo ?? []}
    />
  );
}
