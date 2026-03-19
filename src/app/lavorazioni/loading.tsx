import { Skeleton } from "@/components/ui/skeleton";

export default function LavorazioniLoading() {
  return (
    <div className="space-y-8">
      {/* Page title */}
      <Skeleton className="h-8 w-48" />

      {/* Two column layout */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left column — zone list */}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[12px] border border-[#e5e5e7] bg-white p-5"
            >
              <Skeleton className="mb-3 h-5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>

        {/* Right column — lavorazione detail / task list */}
        <div className="space-y-4">
          <div className="rounded-[12px] border border-[#e5e5e7] bg-white p-6">
            <Skeleton className="mb-4 h-6 w-48" />
            <Skeleton className="mb-3 h-3 w-full" />
            <Skeleton className="mb-3 h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[12px] border border-[#e5e5e7] bg-white p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
