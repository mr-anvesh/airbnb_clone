export function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/3] rounded-[14px] bg-[#e8e8e8] dark:bg-[#2c2c2c]" />
      <div className="mt-3 space-y-2">
        <div className="h-4 bg-[#e8e8e8] dark:bg-[#2c2c2c] rounded-[8px] w-3/4" />
        <div className="h-3 bg-[#e8e8e8] dark:bg-[#2c2c2c] rounded-[8px] w-1/2" />
        <div className="h-3 bg-[#e8e8e8] dark:bg-[#2c2c2c] rounded-[8px] w-2/3" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
