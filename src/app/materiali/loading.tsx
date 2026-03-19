import { Skeleton } from "@/components/ui/skeleton";

export default function MaterialiLoading() {
  return (
    <div className="space-y-8">
      {/* Page title */}
      <Skeleton className="h-8 w-40" />

      {/* 5 counter cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[12px] border border-[#e5e5e7] bg-white p-6"
          >
            <Skeleton className="mb-3 h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Materiali grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[12px] border border-[#e5e5e7] bg-white p-6"
          >
            <Skeleton className="mb-3 h-5 w-40" />
            <Skeleton className="mb-2 h-3 w-full" />
            <Skeleton className="mb-2 h-3 w-3/4" />
            <div className="mt-4 flex items-center justify-between">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
