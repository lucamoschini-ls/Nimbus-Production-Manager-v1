"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Package, ClipboardList, Truck, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { ricercaGlobale } from "@/app/materiali-nuovo/actions";

interface SearchResult {
  tipo: "materiale" | "task" | "operazione" | "fornitore" | "zona";
  id: string;
  nome: string;
  contesto: string;
}

const ICONS = {
  materiale: Package,
  task: ClipboardList,
  operazione: ClipboardList,
  fornitore: Truck,
  zona: MapPin,
};

const LABELS = {
  materiale: "Materiale",
  task: "Task",
  operazione: "Operazione",
  fornitore: "Fornitore",
  zona: "Zona",
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debounceRef = useRef<NodeJS.Timeout>();

  // Cmd+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
        setQuery("");
        setResults([]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const r = await ricercaGlobale(q);
      setResults(r);
      setSelectedIdx(0);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  const handleChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 200);
  };

  const navigateTo = (r: SearchResult) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    switch (r.tipo) {
      case "materiale":
        router.push(`/materiali-nuovo?tab=catalogo&drawer=materiale:${r.id}`);
        break;
      case "task":
      case "operazione":
        router.push(`/materiali-nuovo?drawer=task:${r.id}`);
        break;
      case "fornitore":
        router.push(
          `/materiali-nuovo?filtri_forn=${encodeURIComponent(r.nome)}`
        );
        break;
      case "zona":
        router.push(`/lavorazioni`);
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && results[selectedIdx]) {
      navigateTo(results[selectedIdx]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      onClick={() => setOpen(false)}
    >
      <div className="fixed inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-xl shadow-2xl border border-[#e5e5e7] w-[560px] max-h-[400px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#e5e5e7]">
          <Search size={16} className="text-[#86868b] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cerca task, materiali, fornitori, zone..."
            className="flex-1 text-[14px] outline-none bg-transparent text-[#1d1d1f] placeholder-[#86868b]"
            autoFocus
          />
          <kbd className="text-[10px] text-[#86868b] border border-[#e5e5e7] rounded px-1.5 py-0.5">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-[320px]">
          {loading && (
            <div className="px-4 py-3 text-[12px] text-[#86868b]">
              Ricerca...
            </div>
          )}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="px-4 py-3 text-[12px] text-[#86868b]">
              Nessun risultato
            </div>
          )}
          {results.map((r, i) => {
            const Icon = ICONS[r.tipo];
            return (
              <button
                key={`${r.tipo}-${r.id}`}
                onClick={() => navigateTo(r)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === selectedIdx ? "bg-[#f5f5f7]" : "hover:bg-[#f5f5f7]"
                }`}
              >
                <Icon size={14} className="text-[#86868b] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-[#1d1d1f] font-medium truncate">
                    {r.nome}
                  </div>
                  <div className="text-[10px] text-[#86868b]">
                    {LABELS[r.tipo]} · {r.contesto}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {query.length < 2 && (
          <div className="px-4 py-3 text-[11px] text-[#86868b]">
            Digita almeno 2 caratteri · Cmd+K per aprire
          </div>
        )}
      </div>
    </div>
  );
}
