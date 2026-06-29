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
  blue: {
    bg:     'bg-blue-50   dark:bg-blue-500/10',
    icon:   'bg-blue-100  dark:bg-blue-500/20',
    text:   'text-blue-600   dark:text-blue-400',
    border: 'border-blue-100  dark:border-blue-500/20',
    glow:   'hover:shadow-blue-100   dark:hover:shadow-blue-500/10',
  },
  green: {
    bg:     'bg-green-50  dark:bg-emerald-500/10',
    icon:   'bg-green-100 dark:bg-emerald-500/20',
    text:   'text-green-600  dark:text-emerald-400',
    border: 'border-green-100 dark:border-emerald-500/20',
    glow:   'hover:shadow-green-100  dark:hover:shadow-emerald-500/10',
  },
  amber: {
    bg:     'bg-amber-50  dark:bg-amber-500/10',
    icon:   'bg-amber-100 dark:bg-amber-500/20',
    text:   'text-amber-600  dark:text-amber-400',
    border: 'border-amber-100 dark:border-amber-500/20',
    glow:   'hover:shadow-amber-100  dark:hover:shadow-amber-500/10',
  },
  red: {
    bg:     'bg-red-50    dark:bg-red-500/10',
    icon:   'bg-red-100   dark:bg-red-500/20',
    text:   'text-red-600    dark:text-red-400',
    border: 'border-red-100   dark:border-red-500/20',
    glow:   'hover:shadow-red-100    dark:hover:shadow-red-500/10',
  },
  purple: {
    bg:     'bg-purple-50   dark:bg-purple-500/10',
    icon:   'bg-purple-100  dark:bg-purple-500/20',
    text:   'text-purple-600   dark:text-purple-400',
    border: 'border-purple-100  dark:border-purple-500/20',
    glow:   'hover:shadow-purple-100  dark:hover:shadow-purple-500/10',
  },
  indigo: {
    bg:     'bg-indigo-50   dark:bg-indigo-500/10',
    icon:   'bg-indigo-100  dark:bg-indigo-500/20',
    text:   'text-indigo-600   dark:text-indigo-400',
    border: 'border-indigo-100  dark:border-indigo-500/20',
    glow:   'hover:shadow-indigo-100  dark:hover:shadow-indigo-500/10',
  },
}

export default function StatCard({ title, value, icon: Icon, color, subtitle, trend, onClick }: StatCardProps) {
  const p = PALETTE[color]
  return (
    <motion.div
      whileHover={onClick ? { y: -2 } : {}}
      onClick={onClick}
      className={`
        bg-white dark:bg-[#111827] rounded-2xl border ${p.border}
        shadow-[0_1px_4px_rgba(0,0,0,0.05)] dark:shadow-none
        p-5 transition-all duration-200
        ${onClick ? `cursor-pointer hover:shadow-[0_8px_28px_rgba(0,0,0,0.09)] ${p.glow}` : ''}
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${p.icon} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${p.text}`} />
        </div>
        {trend !== undefined && (
          <div className={`
            flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full
            ${trend >= 0
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-50    dark:bg-red-500/10    text-red-500    dark:text-red-400'
            }
          `}>
            {trend >= 0
              ? <TrendingUp className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />
            }
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-[26px] font-black text-slate-900 dark:text-white leading-none mb-1 tabular-nums">
        {value}
      </div>
      <div className="text-[13px] font-semibold text-slate-600 dark:text-slate-400">{title}</div>
      {subtitle && (
        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</div>
      )}
    </motion.div>
  )
}
