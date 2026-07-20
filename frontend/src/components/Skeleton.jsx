export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-6 w-1/3" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3 px-4"><Skeleton className="h-4 w-full" /></td>
      ))}
    </tr>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card p-6 space-y-3">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}
