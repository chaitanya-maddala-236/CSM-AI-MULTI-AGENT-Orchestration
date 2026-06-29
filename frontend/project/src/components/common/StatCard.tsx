import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { motion } from 'framer-motion'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'indigo'
  subtitle?: string
  trend?: number
  onClick?: () => void
}

const PALETTE = {
  blue:   { bg: 'bg-blue-50 dark:bg-blue-950/40',   icon: 'bg-blue-100 dark:bg-blue-900/60',  text: 'text-blue-600 dark:text-blue-400',  border: 'border-blue-100 dark:border-blue-900/60' },
  green:  { bg: 'bg-green-50 dark:bg-green-950/40', icon: 'bg-green-100 dark:bg-green-900/60',text: 'text-green-600 dark:text-green-400', border: 'border-green-100 dark:border-green-900/60' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-950/40', icon: 'bg-amber-100 dark:bg-amber-900/60',text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-900/60' },
  red:    { bg: 'bg-red-50 dark:bg-red-950/40',     icon: 'bg-red-100 dark:bg-red-900/60',    text: 'text-red-600 dark:text-red-400',    border: 'border-red-100 dark:border-red-900/60' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/40',icon:'bg-purple-100 dark:bg-purple-900/60',text:'text-purple-600 dark:text-purple-400',border:'border-purple-100 dark:border-purple-900/60' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/40',icon:'bg-indigo-100 dark:bg-indigo-900/60',text:'text-indigo-600 dark:text-indigo-400',border:'border-indigo-100 dark:border-indigo-900/60' },
}

export default function StatCard({ title, value, icon: Icon, color, subtitle, trend, onClick }: StatCardProps) {
  const p = PALETTE[color]
  return (
    <motion.div
      whileHover={onClick ? { y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.09)' } : {}}
      onClick={onClick}
      className={`bg-white dark:bg-gray-900 rounded-2xl border ${p.border} shadow-card p-5 transition-all ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${p.icon} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${p.text}`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400'}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-black text-slate-900 dark:text-white leading-none mb-1">{value}</div>
      <div className="text-[13px] font-semibold text-slate-600 dark:text-slate-400">{title}</div>
      {subtitle && <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</div>}
    </motion.div>
  )
}
