import { cn } from '../../utils/cn'

export default function HealthBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    healthy:  'bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900',
    at_risk:  'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900',
    critical: 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900',
  }
  const labels: Record<string, string> = { healthy: '● Healthy', at_risk: '● At Risk', critical: '● Critical' }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', styles[status] || 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400')}>
      {labels[status] || status}
    </span>
  )
}
