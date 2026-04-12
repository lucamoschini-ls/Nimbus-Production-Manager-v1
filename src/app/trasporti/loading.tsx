export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-[#f5f5f7] rounded-lg w-1/2" />
      <div className="flex gap-3">
        <div className="h-8 bg-[#f5f5f7] rounded-lg w-24" />
        <div className="h-8 bg-[#f5f5f7] rounded-lg w-24" />
        <div className="h-8 bg-[#f5f5f7] rounded-lg w-24" />
      </div>
      <div className="h-[400px] bg-[#f5f5f7] rounded-xl" />
    </div>
  );
}
