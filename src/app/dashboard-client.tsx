"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cycleFornitoreStato } from "./lavorazioni/cycle-actions";

const STATO_LABELS: Record<string, string> = {
  da_trovare: "Da trovare",
  contattato: "Contattato",
  confermato: "Confermato",
  sopralluogo_fatto: "Sopralluogo fatto",
  materiali_definiti: "Mat. definiti",
  pronto: "Pronto",
};

const STATO_FORNITORE_COLORS: Record<string, string> = {
  da_trovare: "bg-[#FF3B30]/10 text-[#FF3B30]",
  contattato: "bg-[#FF9F0A]/10 text-[#FF9F0A]",
  confermato: "bg-[#0071E3]/10 text-[#0071E3]",
  sopralluogo_fatto: "bg-[#5856D6]/10 text-[#5856D6]",
  materiali_definiti: "bg-[#AF52DE]/10 text-[#AF52DE]",
  pronto: "bg-[#34C759]/10 text-[#34C759]",
};

interface ZonaRiepilogo {
  id: string;
  nome: string;
  colore: string;
  ordine: number;
  task_totali: number;
  task_completate: number;
  task_in_corso: number;
  task_bloccate: number;
  percentuale: number;
}

interface FornitoreNonPronto {
  id: string;
  nome: string;
  stato: string;
  task_totali: number;
  task_bloccate_da_me: number;
}

interface Props {
  zoneRiepilogo: ZonaRiepilogo[];
  fornitoriNonPronti: FornitoreNonPronto[];
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
  fornitoriDaTrovare: number;
  materialiDaAcquistare: number;
  trasportiDaOrganizzare: number;
}

export function DashboardClient({
  zoneRiepilogo,
  fornitoriNonPronti,
  totalTasks,
  completedTasks,
  blockedTasks,
  fornitoriDaTrovare,
  materialiDaAcquistare,
  trasportiDaOrganizzare,
}: Props) {
  // Countdown
  const apertura = new Date("2026-05-01");
  const oggi = new Date();
  const giorniApertura = Math.ceil((apertura.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
  const pctCompletate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Priority actions: top 5 fornitori blocking the most tasks
  const topBlockingFornitori = fornitoriNonPronti
    .filter((f) => f.task_bloccate_da_me > 0)
    .sort((a, b) => b.task_bloccate_da_me - a.task_bloccate_da_me)
    .slice(0, 5);

  // Fornitori needing action (da_trovare or contattato)
  const fornitoriNeedAction = fornitoriNonPronti
    .filter((f) => f.stato === "da_trovare" || f.stato === "contattato")
    .sort((a, b) => b.task_bloccate_da_me - a.task_bloccate_da_me);

  return (
    <div>
      <h1 className="text-[22px] font-semibold text-[#1d1d1f] mb-6">Dashboard</h1>

      {/* A) COUNTERS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {/* Giorni all'apertura */}
        <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-5">
          <p className="text-[12px] text-[#86868b] font-medium">Giorni all&apos;apertura</p>
          <p className={`text-[28px] font-bold mt-1 leading-none ${giorniApertura <= 30 ? "text-[#FF3B30]" : "text-[#1d1d1f]"}`}>
            {giorniApertura}
          </p>
          <p className="text-[11px] text-[#86868b] mt-1">1 maggio 2026</p>
        </div>

        {/* Completate */}
        <Link href="/lavorazioni" className="bg-white rounded-[12px] border border-[#e5e5e7] p-5 hover:shadow-md transition-shadow cursor-pointer">
          <p className="text-[12px] text-[#86868b] font-medium">Completate</p>
          <p className="text-[28px] font-bold text-[#1d1d1f] mt-1 leading-none">
            {completedTasks}<span className="text-[16px] font-normal text-[#86868b]">/{totalTasks}</span>
          </p>
          <div className="h-1.5 bg-[#e5e5e7] rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-[#34C759] rounded-full transition-all" style={{ width: `${pctCompletate}%` }} />
          </div>
        </Link>

        {/* Bloccate */}
        <Link href="/lavorazioni" className="bg-white rounded-[12px] border border-[#e5e5e7] p-5 hover:shadow-md transition-shadow cursor-pointer">
          <p className="text-[12px] text-[#86868b] font-medium">Bloccate</p>
          <p className={`text-[28px] font-bold mt-1 leading-none ${blockedTasks > 0 ? "text-[#FF3B30]" : "text-[#34C759]"}`}>
            {blockedTasks}
          </p>
        </Link>

        {/* Fornitori da trovare */}
        <Link href="/fornitori" className="bg-white rounded-[12px] border border-[#e5e5e7] p-5 hover:shadow-md transition-shadow cursor-pointer">
          <p className="text-[12px] text-[#86868b] font-medium">Fornitori da trovare</p>
          <p className={`text-[28px] font-bold mt-1 leading-none ${fornitoriDaTrovare > 0 ? "text-[#FF9F0A]" : "text-[#34C759]"}`}>
            {fornitoriDaTrovare}
          </p>
        </Link>
      </div>

      {/* B) AZIONI PRIORITARIE */}
      {(topBlockingFornitori.length > 0 || materialiDaAcquistare > 0 || trasportiDaOrganizzare > 0) && (
        <div className="mb-8">
          <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-3">Azioni prioritarie</h2>
          <div className="bg-white rounded-[12px] border border-[#e5e5e7] divide-y divide-[#e5e5e7]">
            {topBlockingFornitori.map((f) => (
              <div key={f.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#1d1d1f]">
                    {f.stato === "da_trovare" ? "Trovare" : "Avanzare"}{" "}
                    <span className="font-semibold">{f.nome}</span>
                  </p>
                  <p className="text-[11px] text-[#FF3B30]">
                    Sblocca {f.task_bloccate_da_me} task
                  </p>
                </div>
                <button
                  onClick={() => cycleFornitoreStato(f.id, f.stato)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0 ${STATO_FORNITORE_COLORS[f.stato] ?? "bg-gray-100 text-gray-600"}`}
                  title="Click per avanzare stato"
                >
                  {STATO_LABELS[f.stato] ?? f.stato}
                </button>
              </div>
            ))}

            {materialiDaAcquistare > 0 && (
              <Link href="/materiali" className="px-4 py-3 flex items-center gap-3 hover:bg-[#f5f5f7] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#1d1d1f]">
                    <span className="font-semibold text-[#FF3B30]">{materialiDaAcquistare}</span> materiali da acquistare
                  </p>
                </div>
                <span className="text-[12px] text-[#86868b]">Vai a Materiali</span>
                <ChevronRight size={14} className="text-[#86868b] flex-shrink-0" />
              </Link>
            )}

            {trasportiDaOrganizzare > 0 && (
              <Link href="/trasporti" className="px-4 py-3 flex items-center gap-3 hover:bg-[#f5f5f7] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#1d1d1f]">
                    <span className="font-semibold text-[#FF9F0A]">{trasportiDaOrganizzare}</span> trasporti da organizzare
                  </p>
                </div>
                <span className="text-[12px] text-[#86868b]">Vai a Trasporti</span>
                <ChevronRight size={14} className="text-[#86868b] flex-shrink-0" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* C) PROGRESSO ZONE — compact horizontal bars */}
      <div className="mb-8">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-3">Progresso zone</h2>
        <div className="bg-white rounded-[12px] border border-[#e5e5e7] divide-y divide-[#e5e5e7]">
          {zoneRiepilogo.map((z) => (
            <div key={z.id} className="px-4 py-3 flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: z.colore }} />
              <span className="text-[13px] font-medium text-[#1d1d1f] w-[140px] truncate flex-shrink-0">{z.nome}</span>
              <div className="flex-1 h-2 bg-[#e5e5e7] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${z.percentuale}%`, backgroundColor: z.colore }}
                />
              </div>
              <span className="text-[12px] text-[#86868b] w-[50px] text-right flex-shrink-0">
                {z.task_completate}/{z.task_totali}
              </span>
              {z.task_bloccate > 0 ? (
                <span className="text-[11px] text-[#FF3B30] font-medium flex-shrink-0 w-[70px] text-right">
                  {z.task_bloccate} bloccat{z.task_bloccate === 1 ? "a" : "e"}
                </span>
              ) : (
                <span className="w-[70px] flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* D) FORNITORI — only needing action */}
      {fornitoriNeedAction.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-3">Fornitori da gestire</h2>
          <div className="bg-white rounded-[12px] border border-[#e5e5e7] divide-y divide-[#e5e5e7]">
            {fornitoriNeedAction.map((f) => (
              <div key={f.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#1d1d1f]">{f.nome}</p>
                  {f.task_bloccate_da_me > 0 && (
                    <p className="text-[11px] text-[#FF3B30]">{f.task_bloccate_da_me} task bloccate</p>
                  )}
                </div>
                <button
                  onClick={() => cycleFornitoreStato(f.id, f.stato)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0 ${STATO_FORNITORE_COLORS[f.stato] ?? "bg-gray-100 text-gray-600"}`}
                  title="Click per avanzare stato"
                >
                  {STATO_LABELS[f.stato] ?? f.stato}
                </button>
              </div>
            ))}
            <Link href="/fornitori" className="px-4 py-3 flex items-center justify-center gap-1 hover:bg-[#f5f5f7] transition-colors">
              <span className="text-[12px] text-[#0071E3] font-medium">Vedi tutti</span>
              <ChevronRight size={12} className="text-[#0071E3]" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
