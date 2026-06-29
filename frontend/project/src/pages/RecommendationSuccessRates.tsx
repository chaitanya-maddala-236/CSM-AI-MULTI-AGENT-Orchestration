import PageIllustration from '../components/common/PageIllustration'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Award, Target, RefreshCw, BarChart2 } from 'lucide-react'
import Header from '../components/layout/Header'
import { analyticsApi } from '../services/api'

interface SuccessRate {
  action: string
  success_rate: number
  data_points: number
  category?: string
  trend?: 'up' | 'down' | 'stable'
}

const MOCK_RATES: SuccessRate[] = [
  { action: 'Executive Business Review',   success_rate: 0.87, data_points: 47, category: 'Engagement', trend: 'up' },
  { action: 'Training Session',            success_rate: 0.82, data_points: 63, category: 'Enablement', trend: 'up' },
  { action: 'Product Roadmap Share',       success_rate: 0.79, data_points: 31, category: 'Engagement', trend: 'stable' },
  { action: 'CSM Check-in Call',           success_rate: 0.75, data_points: 88, category: 'Engagement', trend: 'up' },
  { action: 'Success Plan Review',         success_rate: 0.71, data_points: 29, category: 'Enablement', trend: 'stable' },
  { action: 'Feature Adoption Coaching',   success_rate: 0.68, data_points: 55, category: 'Enablement', trend: 'stable' },
  { action: 'Risk Escalation to Leadership', success_rate: 0.61, data_points: 22, category: 'Risk', trend: 'up' },
  { action: 'Discount / Pricing Offer',    success_rate: 0.44, data_points: 18, category: 'Commercial', trend: 'down' },
  { action: 'Support Ticket Escalation',   success_rate: 0.38, data_points: 41, category: 'Risk', trend: 'down' },
]

const CAT_COLORS: Record<string, string> = {
  Engagement: '#3b82f6',
  Enablement: '#22c55e',
  Risk:       '#f97316',
  Commercial: '#a855f7',
}

function RateBar({ item, index }: { item: SuccessRate; index: number }) {
  const pct = Math.round(item.success_rate * 100)
  const color = pct >= 75 ? '#22c55e' : pct >= 55 ? '#f59e0b' : '#ef4444'
  const catColor = CAT_COLORS[item.category || ''] || '#94a3b8'

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0"
    >
      {/* Rank */}
      <span className="text-sm font-bold text-slate-400 w-5 text-center">{index + 1}</span>

      {/* Action name + category */}
      <div className="w-56 flex-shrink-0">
        <p className="text-sm font-medium text-slate-800 leading-tight">{item.action}</p>
        {item.category && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 inline-block"
            style={{ background: catColor + '20', color: catColor }}>
            {item.category}
          </span>
        )}
      </div>

      {/* Bar */}
      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, delay: index * 0.05 + 0.2 }}
        />
      </div>

      {/* Pct */}
      <span className="w-10 text-right text-sm font-bold" style={{ color }}>{pct}%</span>

      {/* Data points */}
      <span className="w-20 text-right text-xs text-slate-400">{item.data_points} cases</span>

      {/* Trend */}
      <span className="w-8 text-center text-sm">
        {item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '→'}
      </span>
    </motion.div>
  )
}

export default function RecommendationSuccessRates() {
  const [rates, setRates] = useState<SuccessRate[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('All')

  const load = async () => {
    try {
      const res = await analyticsApi.successRates()
      const data = res.data.success_rates || []
      setRates(data.length > 0 ? data : MOCK_RATES)
    } catch {
      setRates(MOCK_RATES)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const categories = ['All', ...Array.from(new Set(rates.map(r => r.category).filter(Boolean)))]
  const filtered = filter === 'All' ? rates : rates.filter(r => r.category === filter)

  const avgRate = Math.round(rates.reduce((s, r) => s + r.success_rate, 0) / rates.length * 100) || 0
  const totalCases = rates.reduce((s, r) => s + r.data_points, 0)
  const topAction = rates[0]

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-6">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-500" />
              Recommendation Success Rates
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              The system learns from approved recommendations and tracks real-world outcomes
            </p>
          </div>
          <button onClick={load} className="btn-secondary flex items-center gap-1.5 text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{avgRate}%</p>
            <p className="text-xs text-slate-400 mt-1">Avg Success Rate</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-slate-800">{totalCases}</p>
            <p className="text-xs text-slate-400 mt-1">Total Cases</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-sm font-bold text-green-600 truncate">{topAction?.action}</p>
            <p className="text-xs text-slate-400 mt-1">Top Action ({Math.round((topAction?.success_rate || 0) * 100)}%)</p>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat ?? 'All')}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                filter === cat
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card p-6">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2 pl-9">
            <span className="w-56">Action</span>
            <span className="flex-1">Success Rate</span>
            <span className="w-10 text-right">Rate</span>
            <span className="w-20 text-right">Cases</span>
            <span className="w-8 text-center">Trend</span>
          </div>

          {loading ? (
            <div className="space-y-3 mt-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            filtered.map((item, i) => (
              <RateBar key={item.action} item={item} index={i} />
            ))
          )}
        </div>

        {/* Learning note */}
        <div className="mt-5 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-sm text-emerald-700 flex items-start gap-3">
          <TrendingUp className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Continuous Learning.</strong>
            {' '}As CSMs approve or reject recommendations and submit outcome feedback,
            the system updates success rates in real time — improving future NBA rankings for similar customer profiles.
          </div>
        </div>

      </div>
    </div>
  )
}
