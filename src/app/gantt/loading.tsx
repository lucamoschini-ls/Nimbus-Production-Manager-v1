import { Skeleton } from "@/components/ui/skeleton";

export default function GanttLoading() {
  return (
    <div className="space-y-8">
      {/* Page title */}
      <Skeleton className="h-8 w-36" />

      {/* Gantt chart placeholder */}
      <div className="rounded-[12px] border border-[#e5e5e7] bg-white p-6">
        {/* Timeline header */}
        <div className="mb-6 flex gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-16" />
          ))}
        </div>

        {/* Gantt rows */}
        <Skeleton className="h-[480px] w-full rounded-md" />
      </div>
    </div>
  );
}
