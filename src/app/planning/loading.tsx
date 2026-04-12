export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-8 bg-[#f5f5f7] rounded-lg w-40" />
        <div className="h-8 bg-[#f5f5f7] rounded-lg w-32" />
      </div>
      <div className="h-[500px] bg-[#f5f5f7] rounded-xl" />
    </div>
  );
}
