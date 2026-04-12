"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Truck,
  Clock,
  Users,
} from "lucide-react";
import type {
  OggiTask,
  OggiOp,
  BlockedTask,
  OggiFornitore,
} from "./page";

const STATO_CHIP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  da_trovare: { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
  contattato: { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
  confermato: { bg: "#DBEAFE", text: "#1E40AF", border: "#BFDBFE" },
  sopralluogo_fatto: { bg: "#E0E7FF", text: "#3730A3", border: "#C7D2FE" },
  materiali_definiti: { bg: "#EDE9FE", text: "#5B21B6", border: "#DDD6FE" },
  pronto: { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" },
};

const STATO_BORDER: Record<string, string> = {
  completata: "#34C759",
  in_corso: "#FFD60A",
  bloccata: "#FF3B30",
  da_fare: "#C7C7CC",
  in_attesa_fornitore: "#FF9500",
  in_attesa_dipendenza: "#FF9500",
  in_attesa_materiali: "#FF9500",
  in_attesa_permesso: "#FF9500",
};

const STATO_CALCOLATO_LABEL: Record<string, string> = {
  in_attesa_fornitore: "Attesa fornitore",
  in_attesa_dipendenza: "Attesa dipendenza",
  in_attesa_materiali: "Attesa materiali",
  in_attesa_permesso: "Attesa permesso",
  bloccata: "Bloccata",
  da_fare: "Da fare",
  in_corso: "In corso",
  completata: "Completata",
};

const TIPOLOGIA_SHORT: Record<string, string> = {
  carpenteria: "CARP",
  allestimento: "ALLES",
  verniciatura: "VERN",
  elettrico: "ELET",
  idraulico: "IDRA",
  manutenzione: "MAN",
  audio_luci: "A/L",
  giardinaggio: "GIAR",
  pianificazione: "PLAN",
  amministrativo: "AMM",
  trasporto: "TRAS",
  acquisto: "ACQ",
  acquisto_e_trasporto: "A+T",
};

interface Props {
  todayTasks: OggiTask[];
  todayOps: OggiOp[];
  blockedTasks: BlockedTask[];
  fornitori: OggiFornitore[];
}

function extractFornitoreNome(
  f: { nome: string } | { nome: string }[] | null
): string | null {
  if (!f) return null;
  if (Array.isArray(f)) return f[0]?.nome ?? null;
  return f.nome;
}

function extractMaterialeNome(
  m: { nome: string } | { nome: string }[] | null
): string | null {
  if (!m) return null;
  if (Array.isArray(m)) return m[0]?.nome ?? null;
  return m.nome;
}

export function OggiClient({
  todayTasks,
  todayOps,
  blockedTasks,
  fornitori: _fornitori,
}: Props) {
  // _fornitori reserved for future use (e.g. filtering by fornitore stato)
  void _fornitori;
  // Build the narrative header
  const todayStr = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Rome",
  });

  // Group tasks by fornitore
  const { fornitoreGroups, unassignedTasks, activeFornitoriCount, inCorsoCount, overdueCount } =
    useMemo(() => {
      const groups = new Map<
        string,
        {
          fornitoreNome: string;
          fornitoreStato: string | null;
          tasks: OggiTask[];
          totalHours: number;
        }
      >();

      const unassigned: OggiTask[] = [];
      let inCorso = 0;
      let overdue = 0;
      const todayDate = new Date().toLocaleDateString("en-CA", {
        timeZone: "Europe/Rome",
      });

      for (const task of todayTasks) {
        if (task.stato === "completata" || task.stato_calcolato === "completata") continue;

        if (task.stato_calcolato === "in_corso" || task.stato === "in_corso") inCorso++;
        if (task.data_fine && task.data_fine < todayDate && task.stato !== "completata") overdue++;

        if (!task.fornitore_nome || !task.fornitore_id) {
          unassigned.push(task);
          continue;
        }

        const key = task.fornitore_id;
        if (!groups.has(key)) {
          groups.set(key, {
            fornitoreNome: task.fornitore_nome,
            fornitoreStato: task.fornitore_stato,
            tasks: [],
            totalHours: 0,
          });
        }
        const g = groups.get(key)!;
        g.tasks.push(task);
        g.totalHours += task.durata_ore ?? 8;
      }

      return {
        fornitoreGroups: Array.from(groups.values()).sort((a, b) =>
          a.fornitoreNome.localeCompare(b.fornitoreNome)
        ),
        unassignedTasks: unassigned,
        activeFornitoriCount: groups.size,
        inCorsoCount: inCorso,
        overdueCount: overdue,
      };
    }, [todayTasks]);

  // Filter ops for deliveries/arrivals
  const deliveryOps = useMemo(() => {
    const deliveryTypes = ["trasporto", "scarico", "consegna", "arrivo"];
    return todayOps.filter((op) => {
      const tip = (op.tipologia || op.titolo || "").toLowerCase();
      return deliveryTypes.some((dt) => tip.includes(dt));
    });
  }, [todayOps]);

  return (
    <div className="space-y-6">
      {/* BLOCK 1: OGGI IN CANTIERE */}
      <section>
        <div className="mb-4">
          <h1 className="text-xl font-bold text-[#1d1d1f] mb-1">
            Oggi in cantiere
          </h1>
          <p className="text-sm text-[#86868b]">
            Oggi, {todayStr}.{" "}
            {activeFornitoriCount > 0 && (
              <>
                {activeFornitoriCount} fornitor{activeFornitoriCount === 1 ? "e" : "i"} in cantiere.{" "}
              </>
            )}
            {inCorsoCount > 0 && (
              <>
                {inCorsoCount} task in corso
                {overdueCount > 0 && (
                  <>, <span className="text-red-600 font-medium">{overdueCount} in ritardo</span></>
                )}
                .
              </>
            )}
            {inCorsoCount === 0 && activeFornitoriCount === 0 && (
              <>Nessuna attivita programmata per oggi.</>
            )}
          </p>
        </div>

        <div className="bg-white border border-[#e5e5e7] rounded-[12px] overflow-hidden">
          {fornitoreGroups.length === 0 && unassignedTasks.length === 0 && (
            <div className="text-center text-sm text-[#86868b] py-12">
              Nessuna task programmata per oggi
            </div>
          )}

          {fornitoreGroups.map((group) => (
            <div
              key={group.fornitoreNome}
              className="border-b border-[#e5e5e7] last:border-b-0 px-4 py-3"
            >
              {/* Fornitore header */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-semibold text-[#1d1d1f]">
                  {group.fornitoreNome}
                </span>
                {group.fornitoreStato && (
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor:
                        STATO_CHIP_COLORS[group.fornitoreStato]?.bg ?? "#f5f5f7",
                      color:
                        STATO_CHIP_COLORS[group.fornitoreStato]?.text ?? "#86868b",
                    }}
                  >
                    {group.fornitoreStato.replace(/_/g, " ")}
                  </span>
                )}
                <span className="text-xs text-[#86868b] ml-auto">
                  <Clock size={12} className="inline mr-1" />
                  {Math.round(group.totalHours)}h
                </span>
              </div>

              {/* Task chips */}
              <div className="flex flex-wrap gap-2">
                {group.tasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/lavorazioni?task=${task.id}`}
                    className="text-left rounded-lg px-3 py-2 transition-opacity hover:opacity-80"
                    style={{
                      minHeight: "32px",
                      height: `${Math.max(32, (task.durata_ore || 1) * 12)}px`,
                      backgroundColor: "rgba(0,0,0,0.03)",
                      borderLeft: `4px solid ${STATO_BORDER[task.stato_calcolato || task.stato] || "#C7C7CC"}`,
                    }}
                  >
                    <div className="text-[11px] font-medium text-[#1d1d1f] truncate max-w-[200px]">
                      {task.tipologia
                        ? TIPOLOGIA_SHORT[task.tipologia] ||
                          task.tipologia.slice(0, 4).toUpperCase()
                        : ""}{" "}
                      {task.titolo}
                    </div>
                    {task.numero_persone && (
                      <div className="text-[10px] text-[#86868b] flex items-center gap-1 mt-0.5">
                        <Users size={10} /> {task.numero_persone} pax
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {/* Unassigned tasks */}
          {unassignedTasks.length > 0 && (
            <div className="border-b border-[#e5e5e7] last:border-b-0 px-4 py-3">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-semibold text-[#86868b]">
                  Da assegnare
                </span>
                <span className="text-xs text-[#86868b] ml-auto">
                  {unassignedTasks.length} task
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {unassignedTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/lavorazioni?task=${task.id}`}
                    className="text-left rounded-lg px-3 py-2 transition-opacity hover:opacity-80"
                    style={{
                      minHeight: "32px",
                      backgroundColor: "rgba(0,0,0,0.03)",
                      borderLeft: `4px solid ${STATO_BORDER[task.stato_calcolato || task.stato] || "#C7C7CC"}`,
                    }}
                  >
                    <div className="text-[11px] font-medium text-[#1d1d1f] truncate max-w-[200px]">
                      {task.tipologia
                        ? TIPOLOGIA_SHORT[task.tipologia] ||
                          task.tipologia.slice(0, 4).toUpperCase()
                        : ""}{" "}
                      {task.titolo}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* BLOCK 2: ARRIVI E CONSEGNE */}
      <section>
        <h2 className="text-lg font-bold text-[#1d1d1f] mb-3 flex items-center gap-2">
          <Truck size={18} />
          Arrivi e consegne
        </h2>
        <div className="bg-white border border-[#e5e5e7] rounded-[12px] p-4">
          {deliveryOps.length === 0 ? (
            <p className="text-sm text-[#86868b]">
              Nessuna consegna prevista oggi
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {deliveryOps.map((op) => {
                const fornNome = extractFornitoreNome(op.fornitore);
                const matNome = extractMaterialeNome(op.materiale);
                return (
                  <div
                    key={op.id}
                    className="rounded-lg px-3 py-2 bg-blue-50 border border-blue-100"
                  >
                    <div className="text-[11px] font-medium text-blue-800 truncate max-w-[200px]">
                      {matNome || op.titolo || "Consegna"}
                    </div>
                    {fornNome && (
                      <div className="text-[10px] text-blue-600 mt-0.5">
                        {fornNome}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* BLOCK 3: DA SBLOCCARE */}
      <section>
        <h2 className="text-lg font-bold text-[#1d1d1f] mb-3 flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-500" />
          Da sbloccare
        </h2>
        <div className="bg-white border border-[#e5e5e7] rounded-[12px] overflow-hidden">
          {blockedTasks.length === 0 ? (
            <div className="p-4">
              <p className="text-sm text-[#86868b]">
                Nessuna task bloccata nei prossimi 3 giorni
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#e5e5e7]">
              {blockedTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/lavorazioni?task=${task.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-[#f5f5f7]/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#1d1d1f] truncate">
                      {task.titolo}
                    </div>
                    <div className="text-xs text-[#86868b] mt-0.5">
                      {task.zona_nome} / {task.lavorazione_nome}
                      {task.fornitore_nome && ` — ${task.fornitore_nome}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    {task.data_inizio && (
                      <span className="text-[10px] text-[#86868b]">
                        {new Date(task.data_inizio).toLocaleDateString("it-IT", {
                          day: "numeric",
                          month: "short",
                          timeZone: "Europe/Rome",
                        })}
                      </span>
                    )}
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: "#FFF3E0",
                        color: "#E65100",
                      }}
                    >
                      {STATO_CALCOLATO_LABEL[task.stato_calcolato] ||
                        task.stato_calcolato.replace(/_/g, " ")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
