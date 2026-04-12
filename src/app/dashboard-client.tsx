"use client";

import Link from "next/link";

const STATO_FORNITORE_COLORS: Record<string, string> = {
  da_trovare: "bg-[#FF3B30]/10 text-[#FF3B30]",
  contattato: "bg-[#FF9F0A]/10 text-[#FF9F0A]",
  confermato: "bg-[#0071E3]/10 text-[#0071E3]",
  sopralluogo_fatto: "bg-[#5856D6]/10 text-[#5856D6]",
  materiali_definiti: "bg-[#AF52DE]/10 text-[#AF52DE]",
  pronto: "bg-[#34C759]/10 text-[#34C759]",
};

const STATO_LABELS: Record<string, string> = {
  da_trovare: "Da trovare",
  contattato: "Contattato",
  confermato: "Confermato",
  sopralluogo_fatto: "Sopralluogo",
  materiali_definiti: "Mat. definiti",
  pronto: "Pronto",
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

interface TrendPoint {
  date: string;
  completate: number;
}

interface FornitoreLoad {
  id: string;
  nome: string;
  ore: number;
  stato: string;
}

interface Props {
  zoneRiepilogo: ZonaRiepilogo[];
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
  totalFornitori: number;
  readyFornitori: number;
  trasportiDaOrganizzare: number;
  trendData: TrendPoint[];
  fornitoreLoads: FornitoreLoad[];
}

export function DashboardClient({
  zoneRiepilogo,
  totalTasks,
  completedTasks,
  blockedTasks,
  totalFornitori,
  readyFornitori,
  trasportiDaOrganizzare,
  trendData,
  fornitoreLoads,
}: Props) {
  // Countdown
  const apertura = new Date("2026-05-01");
  const oggi = new Date();
  const giorniApertura = Math.ceil((apertura.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
  const pctCompletate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const backlogCount = blockedTasks + trasportiDaOrganizzare;

  // For the simple bar chart: last 7 days of trendData
  const recentTrend = trendData.slice(-14);
  const maxCompletate = Math.max(1, ...recentTrend.map((d) => d.completate));

  return (
    <div>
      <h1 className="text-[22px] font-semibold text-[#1d1d1f] mb-6">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link href="/lavorazioni" className="bg-white rounded-[12px] border border-[#e5e5e7] p-5 hover:shadow-md transition-shadow">
          <p className="text-xs uppercase text-[#86868b] font-medium tracking-wide">Task completate</p>
          <p className="text-4xl font-bold text-[#1d1d1f] mt-2 leading-none">
            {completedTasks}<span className="text-lg font-normal text-[#86868b]">/{totalTasks}</span>
          </p>
          <p className="text-xs text-[#86868b] mt-1">{pctCompletate}%</p>
          <div className="h-1.5 bg-[#e5e5e7] rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-[#34C759] rounded-full transition-all" style={{ width: `${pctCompletate}%` }} />
          </div>
        </Link>

        <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-5">
          <p className="text-xs uppercase text-[#86868b] font-medium tracking-wide">Giorni all&apos;apertura</p>
          <p className={`text-4xl font-bold mt-2 leading-none ${giorniApertura <= 30 ? "text-[#FF3B30]" : "text-[#1d1d1f]"}`}>
            {giorniApertura}
          </p>
          <p className="text-xs text-[#86868b] mt-1">1 maggio 2026</p>
        </div>

        <Link href="/fornitori" className="bg-white rounded-[12px] border border-[#e5e5e7] p-5 hover:shadow-md transition-shadow">
          <p className="text-xs uppercase text-[#86868b] font-medium tracking-wide">Fornitori operativi</p>
          <p className="text-4xl font-bold text-[#1d1d1f] mt-2 leading-none">
            {readyFornitori}<span className="text-lg font-normal text-[#86868b]">/{totalFornitori}</span>
          </p>
        </Link>

        <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-5">
          <p className="text-xs uppercase text-[#86868b] font-medium tracking-wide">Backlog</p>
          <p className={`text-4xl font-bold mt-2 leading-none ${backlogCount > 0 ? "text-[#FF3B30]" : "text-[#34C759]"}`}>
            {backlogCount}
          </p>
          <p className="text-xs text-[#86868b] mt-1">task bloccate + op da organizzare</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* a) Progresso per zona */}
        <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-5">
          <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Progresso per zona</h2>
          <div className="space-y-3">
            {zoneRiepilogo.map((z) => (
              <div key={z.id} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: z.colore }} />
                <span className="text-[13px] font-medium text-[#1d1d1f] w-[120px] truncate flex-shrink-0">{z.nome}</span>
                <div className="flex-1 h-2 bg-[#e5e5e7] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${z.percentuale}%`, backgroundColor: z.colore }}
                  />
                </div>
                <span className="text-[12px] text-[#86868b] w-[44px] text-right flex-shrink-0">
                  {z.task_completate}/{z.task_totali}
                </span>
                {z.task_bloccate > 0 ? (
                  <span className="text-[10px] text-[#FF3B30] font-medium flex-shrink-0 w-[60px] text-right">
                    {z.task_bloccate} bloccat{z.task_bloccate === 1 ? "a" : "e"}
                  </span>
                ) : (
                  <span className="w-[60px] flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* b) Trend settimanale — placeholder since recharts not installed */}
        <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-5">
          <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Trend completamenti</h2>
          {recentTrend.length === 0 || recentTrend.every((d) => d.completate === 0) ? (
            <div className="flex items-center justify-center h-[180px] text-[13px] text-[#86868b]">
              Nessuna task completata nel periodo
            </div>
          ) : (
            <div className="flex items-end gap-[3px] h-[180px] pt-4">
              {recentTrend.map((d) => {
                const barHeight = d.completate > 0 ? Math.max(8, (d.completate / maxCompletate) * 150) : 2;
                const dateLabel = d.date.slice(8, 10) + "/" + d.date.slice(5, 7);
                return (
                  <div key={d.date} className="flex flex-col items-center flex-1 min-w-0 justify-end h-full">
                    {d.completate > 0 && (
                      <span className="text-[9px] text-[#86868b] mb-1">{d.completate}</span>
                    )}
                    <div
                      className="w-full rounded-t bg-[#34C759] min-w-[4px] max-w-[28px] mx-auto"
                      style={{ height: `${barHeight}px` }}
                      title={`${dateLabel}: ${d.completate} completate`}
                    />
                    <span className="text-[8px] text-[#86868b] mt-1 truncate w-full text-center">{dateLabel}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* c) Carichi fornitori */}
        <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-5">
          <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Carichi fornitori questa settimana</h2>
          {fornitoreLoads.length === 0 ? (
            <div className="flex items-center justify-center h-[100px] text-[13px] text-[#86868b]">
              Nessuna operazione schedulata questa settimana
            </div>
          ) : (
            <div className="divide-y divide-[#f0f0f0]">
              {fornitoreLoads.map((fl) => (
                <div key={fl.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="text-[13px] font-medium text-[#1d1d1f] flex-1 truncate">{fl.nome}</span>
                  <span className="text-[13px] text-[#1d1d1f] font-semibold flex-shrink-0">{fl.ore}h</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATO_FORNITORE_COLORS[fl.stato] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATO_LABELS[fl.stato] ?? fl.stato}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* d) Traguardi settimanali */}
        <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-5">
          <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Traguardi settimanali</h2>
          <div className="flex items-center justify-center h-[100px] text-[13px] text-[#86868b]">
            Segna le task cruciali per vedere i traguardi settimanali qui.
          </div>
        </div>
      </div>
    </div>
  );
}
