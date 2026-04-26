export function LoadingSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`shimmer rounded-xl ${className}`} />
  );
}

export function TableRowSkeleton() {
  return (
    <tr className="animate-pulse border-b border-slate-50">
      <td className="px-8 py-5"><LoadingSkeleton className="h-10 w-48" /></td>
      <td className="px-8 py-5"><LoadingSkeleton className="h-6 w-24" /></td>
      <td className="px-8 py-5"><LoadingSkeleton className="h-6 w-20" /></td>
      <td className="px-8 py-5"><LoadingSkeleton className="h-6 w-20" /></td>
      <td className="px-8 py-5"><LoadingSkeleton className="h-10 w-32" /></td>
      <td className="px-8 py-5 text-center"><LoadingSkeleton className="h-8 w-24 mx-auto rounded-full" /></td>
    </tr>
  );
}
