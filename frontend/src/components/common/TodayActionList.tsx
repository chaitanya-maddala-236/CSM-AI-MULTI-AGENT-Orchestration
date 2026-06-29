import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, Clock, Brain, ChevronRight, CheckSquare } from 'lucide-react'
import { customersApi, recommendationsApi } from '../../services/api'
import { formatDate, timeAgo } from '../../utils/helpers'

interface ActionItem {
  id: string
  type: 'critical_customer' | 'renewal' | 'pending_approval'
  priority: 'P0' | 'P1' | 'P2'
  label: string
  sublabel: string
  link: string
  icon: 'alert' | 'clock' | 'brain'
  days?: number
}

const ICON_MAP = {
  alert: AlertTriangle,
  clock: Clock,
  brain: Brain,
}

const COLOR_MAP: Record<ActionItem['priority'], string> = {
  P0: 'bg-red-50 border-red-200 text-red-700',
  P1: 'bg-amber-50 border-amber-200 text-amber-700',
  P2: 'bg-blue-50 border-blue-200 text-blue-700',
}

const DOT_MAP: Record<ActionItem['priority'], string> = {
  P0: 'bg-red-500',
  P1: 'bg-amber-500',
  P2: 'bg-blue-500',
}

export default function TodayActionList() {
  const nav = useNavigate()
  const [items, setItems] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [critRes, pendRes] = await Promise.all([
          customersApi.list({ health_status: 'critical', page_size: 20 }),
          recommendationsApi.list({ status: 'pending', page_size: 20 }),
        ])

        const actions: ActionItem[] = []

        // Critical customers → P0
        for (const c of (critRes.data.items || []).slice(0, 3)) {
          actions.push({
            id: `crit-${c.id}`,
            type: 'critical_customer',
            priority: 'P0',
            label: c.name,
            sublabel: `Health: ${c.health_score} · Churn risk: ${Math.round(c.churn_probability * 100)}%`,
            link: `/customers/${c.id}/360`,
            icon: 'alert',
          })
        }

        // Renewals in ≤30 days → P0 or P1
        for (const c of (critRes.data.items || [])) {
          const days = c.renewal_date
            ? Math.round((new Date(c.renewal_date).getTime() - Date.now()) / 86400000)
            : null
          if (days !== null && days >= 0 && days <= 30) {
            actions.push({
              id: `renew-${c.id}`,
              type: 'renewal',
              priority: days <= 7 ? 'P0' : 'P1',
              label: `${c.name} renews in ${days}d`,
              sublabel: `ARR: $${c.arr?.toLocaleString() || '—'} · ${formatDate(c.renewal_date)}`,
              link: `/customers/${c.id}/360`,
              icon: 'clock',
              days,
            })
          }
        }

        // Also check from all customers list for renewals
        const allRes = await customersApi.list({ page_size: 50 })
        for (const c of (allRes.data.items || [])) {
          const days = c.renewal_date
            ? Math.round((new Date(c.renewal_date).getTime() - Date.now()) / 86400000)
            : null
          if (days !== null && days >= 0 && days <= 14 && !actions.find(a => a.id === `renew-${c.id}`)) {
            actions.push({
              id: `renew-${c.id}`,
              type: 'renewal',
              priority: days <= 7 ? 'P0' : 'P1',
              label: `${c.name} renews in ${days}d`,
              sublabel: `ARR: $${c.arr?.toLocaleString() || '—'}`,
              link: `/customers/${c.id}/360`,
              icon: 'clock',
              days,
            })
          }
        }

        // Old pending approvals (>24h) → P2
        const pending = pendRes.data.items || []
        const stale = pending.filter((r: any) => {
          const hours = (Date.now() - new Date(r.created_at).getTime()) / 3600000
          return hours > 24
        })
        if (stale.length > 0) {
          actions.push({
            id: 'stale-approvals',
            type: 'pending_approval',
            priority: 'P2',
            label: `${stale.length} approval${stale.length > 1 ? 's' : ''} awaiting review`,
            sublabel: `Oldest: ${timeAgo(stale[stale.length - 1]?.created_at)}`,
            link: '/approvals',
            icon: 'brain',
          })
        }

        // Sort: P0 first, then P1, then P2
        const order: Record<string, number> = { P0: 0, P1: 1, P2: 2 }
        actions.sort((a, b) => order[a.priority] - order[b.priority])
        setItems(actions.slice(0, 6))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-blue-500" /> Today's Actions
        </h3>
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-blue-500" /> Today's Actions
        </h3>
        <span className="text-xs text-slate-400">{items.length} items</span>
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-slate-500 text-sm">All clear! No urgent actions today.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => {
            const Icon = ICON_MAP[item.icon]
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => nav(item.link)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border hover:shadow-sm transition-all text-left group"
              >
                {/* Priority dot */}
                <div className="flex-shrink-0 flex flex-col items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${DOT_MAP[item.priority]}`} />
                  <span className="text-xs font-bold text-slate-400">{item.priority}</span>
                </div>

                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${COLOR_MAP[item.priority]}`}>
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{item.label}</p>
                  <p className="text-xs text-slate-400 truncate">{item.sublabel}</p>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}
