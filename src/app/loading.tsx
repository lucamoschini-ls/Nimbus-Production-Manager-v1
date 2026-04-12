export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-[#f5f5f7] rounded-xl" />)}
      </div>
      <div className="h-48 bg-[#f5f5f7] rounded-xl" />
    </div>
  );
}
