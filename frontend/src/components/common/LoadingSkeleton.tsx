export default function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-slate-100 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 dark:bg-gray-800 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-slate-100 dark:bg-gray-800 rounded w-1/3" />
              <div className="h-2 bg-slate-100 dark:bg-gray-800 rounded w-1/2" />
            </div>
            <div className="h-3 bg-slate-100 dark:bg-gray-800 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}
