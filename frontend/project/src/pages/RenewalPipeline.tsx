import PageIllustration from '../components/common/PageIllustration'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, DollarSign, AlertTriangle, TrendingUp, ChevronRight, RefreshCw } from 'lucide-react'
import Header from '../components/layout/Header'
import HealthBadge from '../components/common/HealthBadge'
import ScoreRing from '../components/common/ScoreRing'
import { customersApi } from '../services/api'
import { formatCurrency, formatDate } from '../utils/helpers'

interface RenewalCustomer {
  id: string
  name: string
  email: string
  arr: number
  mrr: number
  renewal_date: string
  health_score: number
  health_status: string
  churn_probability: number
  plan: string
  company?: { name: string; industry: string }
  days_until_renewal: number
}

type UrgencyBucket = 'overdue' | 'this_week' | 'this_month' | 'next_60' | 'next_90'

function urgencyOf(days: number): UrgencyBucket {
  if (days < 0)  return 'overdue'
  if (days <= 7)  return 'this_week'
  if (days <= 30) return 'this_month'
  if (days <= 60) return 'next_60'
  return 'next_90'
}

const BUCKET_META: Record<UrgencyBucket, { label: string; color: string; dotColor: string }> = {
  overdue:    { label: 'Overdue',        color: 'text-red-700 bg-red-100 border-red-200',     dotColor: 'bg-red-500' },
  this_week:  { label: 'This Week',      color: 'text-orange-700 bg-orange-100 border-orange-200', dotColor: 'bg-orange-500' },
  this_month: { label: 'This Month',     color: 'text-amber-700 bg-amber-100 border-amber-200', dotColor: 'bg-amber-400' },
  next_60:    { label: 'Next 60 Days',   color: 'text-blue-700 bg-blue-100 border-blue-200',  dotColor: 'bg-blue-400' },
  next_90:    { label: 'Next 90 Days',   color: 'text-slate-700 bg-slate-100 border-slate-200', dotColor: 'bg-slate-400' },
}

export default function RenewalPipeline() {
  const nav = useNavigate()
  const [customers, setCustomers] = useState<RenewalCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<UrgencyBucket | 'all'>('all')

  const load = async () => {
    setLoading(true)
    try {
      // Get all customers — backend sorts by renewal_date
      const { data } = await customersApi.list({ page_size: 100 })
      const all = (data.items || []) as RenewalCustomer[]
      const now = Date.now()
      const withDays = all
        .filter(c => !!c.renewal_date)
        .map(c => ({
          ...c,
          days_until_renewal: Math.round(
            (new Date(c.renewal_date).getTime() - now) / 86400000
          ),
        }))
        .filter(c => c.days_until_renewal <= 90)
        .sort((a, b) => a.days_until_renewal - b.days_until_renewal)
      setCustomers(withDays)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? customers : customers.filter(c => urgencyOf(c.days_until_renewal) === filter)

  const totalArr = filtered.reduce((s, c) => s + (c.arr || 0), 0)
  const atRiskArr = filtered.filter(c => c.health_status !== 'healthy').reduce((s, c) => s + (c.arr || 0), 0)

  const bucketCounts = (['overdue', 'this_week', 'this_month', 'next_60', 'next_90'] as UrgencyBucket[]).reduce(
    (acc, b) => ({ ...acc, [b]: customers.filter(c => urgencyOf(c.days_until_renewal) === b).length }),
    {} as Record<UrgencyBucket, number>
  )

  return (
    <div>
      <Header title="Renewal Pipeline" subtitle="Upcoming renewals in the next 90 days" />
      <div className="p-6 space-y-5">

        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Renewals', value: customers.length, icon: Calendar, color: 'text-blue-600' },
            { label: 'Pipeline ARR', value: formatCurrency(totalArr), icon: DollarSign, color: 'text-green-600' },
            { label: 'At-Risk ARR', value: formatCurrency(atRiskArr), icon: AlertTriangle, color: 'text-red-500' },
            { label: 'Healthy ARR', value: formatCurrency(totalArr - atRiskArr), icon: TrendingUp, color: 'text-green-500' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs text-slate-400 font-medium">{s.label}</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{s.value}</div>
            </motion.div>
          ))}
        </div>

        {/* Bucket filters */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium border transition-all ${filter === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
            All ({customers.length})
          </button>
          {(Object.entries(bucketCounts) as [UrgencyBucket, number][]).map(([bucket, count]) => {
            if (count === 0) return null
            const meta = BUCKET_META[bucket]
            return (
              <button key={bucket} onClick={() => setFilter(bucket)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                  filter === bucket ? meta.color + ' border-current' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}>
                <div className={`w-2 h-2 rounded-full ${filter === bucket ? meta.dotColor : 'bg-slate-300'}`} />
                {meta.label} ({count})
              </button>
            )
          })}
          <button onClick={load} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Customer', 'Health', 'Churn Risk', 'ARR', 'Renewal Date', 'Urgency', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? [...Array(6)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-4 py-3">
                    <div className="h-10 bg-slate-100 animate-pulse rounded-lg" />
                  </td>
                </tr>
              )) : filtered.map((c, i) => {
                const bucket = urgencyOf(c.days_until_renewal)
                const meta = BUCKET_META[bucket]
                return (
                  <motion.tr key={c.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    onClick={() => nav(`/customers/${c.id}/360`)}
                    className="hover:bg-slate-50 cursor-pointer group transition-colors">

                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.company?.name} · {c.plan}</p>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ScoreRing score={c.health_score} size={32} strokeWidth={4} />
                        <HealthBadge status={c.health_status} />
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${c.churn_probability * 100}%`,
                            background: c.churn_probability > 0.6 ? '#ef4444' : c.churn_probability > 0.3 ? '#f59e0b' : '#22c55e'
                          }} />
                        </div>
                        <span className="text-xs text-slate-600 font-medium">{Math.round(c.churn_probability * 100)}%</span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(c.arr)}</span>
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(c.renewal_date)}</td>

                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${meta.color}`}>
                        {c.days_until_renewal < 0 ? 'OVERDUE' : `${c.days_until_renewal}d`}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>

          {!loading && filtered.length === 0 && (
            <div className="py-16 text-center">
              <Calendar className="w-8 h-8 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No renewals in this window</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
