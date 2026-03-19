import { Skeleton } from "@/components/ui/skeleton";

export default function CostiLoading() {
  return (
    <div className="space-y-8">
      {/* Page title */}
      <Skeleton className="h-8 w-48" />

      {/* Table skeleton */}
      <div className="rounded-[12px] border border-[#e5e5e7] bg-white">
        {/* Table header */}
        <div className="flex gap-4 border-b border-[#e5e5e7] px-6 py-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>

        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 border-b border-[#e5e5e7] px-6 py-4 last:border-b-0"
          >
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
