"use client";

import { Badge } from "@/components/ui/badge";

const STATO_LABELS: Record<string, string> = {
  da_trovare: "Da trovare",
  contattato: "Contattato",
  confermato: "Confermato",
  sopralluogo_fatto: "Sopralluogo fatto",
  materiali_definiti: "Mat. definiti",
  pronto: "Pronto",
  in_attesa_fornitore: "Attesa fornitore",
  in_attesa_dipendenza: "Attesa dipendenza",
  in_attesa_materiali: "Attesa materiali",
  in_attesa_permesso: "Attesa permesso",
  bloccata: "Bloccata",
};

const STATO_FORNITORE_COLORS: Record<string, string> = {
  da_trovare: "bg-red-100 text-red-700",
  contattato: "bg-amber-100 text-amber-700",
  confermato: "bg-blue-100 text-blue-700",
  sopralluogo_fatto: "bg-indigo-100 text-indigo-700",
  materiali_definiti: "bg-violet-100 text-violet-700",
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

interface TaskUrgente {
  id: string;
  titolo: string;
  zona_nome: string;
  zona_colore: string;
  fornitore_nome: string | null;
  stato_calcolato: string;
  data_fine: string | null;
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
  taskUrgenti: TaskUrgente[];
  fornitoriNonPronti: FornitoreNonPronto[];
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
  fornitoriDaTrovare: number;
}

export function DashboardClient({
  zoneRiepilogo,
  taskUrgenti,
  fornitoriNonPronti,
  totalTasks,
  completedTasks,
  blockedTasks,
  fornitoriDaTrovare,
}: Props) {
  // Countdown
  const apertura = new Date("2026-05-01");
  const oggi = new Date();
  const giorniApertura = Math.ceil((apertura.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
  const pctCompletate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#1d1d1f] mb-6">Dashboard</h1>

      {/* ROW 1 — Contatori principali */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-5">
          <p className="text-xs text-[#86868b] font-medium">Giorni all&apos;apertura</p>
          <p className={`text-3xl font-bold mt-1 ${giorniApertura <= 30 ? "text-red-600" : "text-[#1d1d1f]"}`}>
            {giorniApertura}
          </p>
          <p className="text-[10px] text-[#86868b] mt-0.5">1 maggio 2026</p>
        </div>

        <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-5">
          <p className="text-xs text-[#86868b] font-medium">Task completate</p>
          <p className="text-3xl font-bold text-[#1d1d1f] mt-1">
            {completedTasks}<span className="text-lg font-normal text-[#86868b]">/{totalTasks}</span>
          </p>
          <div className="h-1.5 bg-[#e5e5e7] rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pctCompletate}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-5">
          <p className="text-xs text-[#86868b] font-medium">Task bloccate</p>
          <p className={`text-3xl font-bold mt-1 ${blockedTasks > 0 ? "text-red-600" : "text-green-600"}`}>
            {blockedTasks}
          </p>
        </div>

        <div className="bg-white rounded-[12px] border border-[#e5e5e7] p-5">
          <p className="text-xs text-[#86868b] font-medium">Fornitori da trovare</p>
          <p className={`text-3xl font-bold mt-1 ${fornitoriDaTrovare > 0 ? "text-amber-600" : "text-green-600"}`}>
            {fornitoriDaTrovare}
          </p>
        </div>
      </div>

      {/* ROW 2 — Progresso per zona */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-[#1d1d1f] mb-3">Progresso per zona</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {zoneRiepilogo.map((z) => (
            <div key={z.id} className="bg-white rounded-[12px] border border-[#e5e5e7] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: z.colore }} />
                <span className="text-sm font-medium text-[#1d1d1f]">{z.nome}</span>
                <span className="text-xs text-[#86868b] ml-auto">
                  {z.task_completate}/{z.task_totali}
                </span>
              </div>
              <div className="h-2 bg-[#e5e5e7] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${z.percentuale}%`, backgroundColor: z.colore }}
                />
              </div>
              {z.task_bloccate > 0 && (
                <p className="text-[10px] text-red-500 mt-1">{z.task_bloccate} bloccate</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ROW 3 — Task urgenti */}
      {taskUrgenti.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[#1d1d1f] mb-3">Task in attesa / bloccate</h2>
          <div className="bg-white rounded-[12px] border border-[#e5e5e7] divide-y divide-[#e5e5e7]">
            {taskUrgenti.map((t) => (
              <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: t.zona_colore }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#1d1d1f] truncate">{t.titolo}</p>
                  <p className="text-[10px] text-[#86868b]">{t.zona_nome}</p>
                </div>
                <Badge className="bg-amber-100 text-amber-700 text-[10px] flex-shrink-0">
                  {STATO_LABELS[t.stato_calcolato] ?? t.stato_calcolato}
                </Badge>
                {t.fornitore_nome && (
                  <span className="text-[10px] text-[#86868b] flex-shrink-0 hidden md:inline">
                    {t.fornitore_nome}
                  </span>
                )}
                {t.data_fine && (
                  <span className="text-[10px] text-[#86868b] flex-shrink-0">
                    {new Date(t.data_fine).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ROW 4 — Fornitori non pronti */}
      {fornitoriNonPronti.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[#1d1d1f] mb-3">Stato fornitori</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {fornitoriNonPronti.map((f) => (
              <div key={f.id} className="bg-white rounded-[12px] border border-[#e5e5e7] p-3">
                <p className="text-xs font-medium text-[#1d1d1f] truncate">{f.nome}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge className={`text-[10px] ${STATO_FORNITORE_COLORS[f.stato] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATO_LABELS[f.stato] ?? f.stato}
                  </Badge>
                </div>
                {f.task_bloccate_da_me > 0 && (
                  <p className="text-[10px] text-red-500 mt-1">{f.task_bloccate_da_me} task bloccate</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
