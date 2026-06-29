import PageIllustration from '../components/common/PageIllustration'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, TrendingUp, TrendingDown, Heart, Info,
  RefreshCw, ChevronRight, Zap, Shield, BarChart2,
  MessageSquare, Ticket, RotateCcw, AlertTriangle
} from 'lucide-react'
import Header from '../components/layout/Header'
import { customersApi } from '../services/api'
import { useNavigate } from 'react-router-dom'

// ─── Weight config (must sum to 100) ────────────────────────────────────────
const WEIGHTS = [
  { key: 'usage',     label: 'Product Usage',   pct: 40, color: '#3B82F6', icon: BarChart2,     desc: 'DAU/MAU ratio, feature breadth, API calls' },
  { key: 'sentiment', label: 'Sentiment',        pct: 30, color: '#8B5CF6', icon: MessageSquare, desc: 'Meeting tone, NPS, email sentiment analysis' },
  { key: 'support',   label: 'Support Health',   pct: 20, color: '#F59E0B', icon: Ticket,        desc: 'Open tickets, CSAT, escalation rate' },
  { key: 'renewal',   label: 'Renewal Signal',   pct: 10, color: '#10B981', icon: RotateCcw,     desc: 'Days to renewal, engagement in cycle' },
]

function weightedScore(customer: any): { total: number; breakdown: Record<string, number> } {
  const usage     = Math.min(100, (customer.usage_score     ?? customer.health_score * 0.9) * 100) || 50
  const sentiment = customer.sentiment === 'positive' ? 90 : customer.sentiment === 'neutral' ? 60 : 25
  const support   = Math.max(0, 100 - (customer.open_tickets ?? 0) * 12)
  const daysToRenewal = customer.days_to_renewal ?? 90
  const renewal   = daysToRenewal > 60 ? 80 : daysToRenewal > 30 ? 60 : 40

  const breakdown = { usage, sentiment, support, renewal }
  const total = Math.round(
    (usage     * WEIGHTS[0].pct +
     sentiment * WEIGHTS[1].pct +
     support   * WEIGHTS[2].pct +
     renewal   * WEIGHTS[3].pct) / 100
  )
  return { total, breakdown }
}

function healthColor(score: number) {
  if (score >= 70) return { text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', bar: '#22C55E', label: 'Healthy' }
  if (score >= 45) return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', bar: '#F59E0B', label: 'At Risk' }
  return { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', bar: '#EF4444', label: 'Critical' }
}

function ScoreBar({ value, color, animated = true }: { value: number; color: string; animated?: boolean }) {
  return (
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: animated ? 0.8 : 0, ease: 'easeOut' }}
      />
    </div>
  )
}

function FormulaCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-blue-500" />
        <h2 className="font-semibold text-slate-800">Health Score Formula</h2>
        <span className="ml-auto text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">Weighted</span>
      </div>

      <div className="font-mono text-sm bg-slate-950 text-green-400 rounded-xl p-4 mb-5 leading-relaxed">
        <span className="text-slate-500">// Health Score Calculation</span><br />
        Health = <span className="text-blue-400">40%</span> × Usage<br />
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ <span className="text-purple-400">30%</span> × Sentiment<br />
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ <span className="text-amber-400">20%</span> × Support<br />
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ <span className="text-emerald-400">10%</span> × Renewal
      </div>

      <div className="space-y-3">
        {WEIGHTS.map(w => {
          const Icon = w.icon
          return (
            <div key={w.key} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: w.color + '20' }}>
                <Icon className="w-4 h-4" style={{ color: w.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">{w.label}</span>
                  <span className="text-sm font-bold" style={{ color: w.color }}>{w.pct}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${w.pct}%`, backgroundColor: w.color }} />
                </div>
                <p className="text-xs text-slate-400 mt-1">{w.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 gap-3 text-center text-xs">
        {[
          { label: 'Healthy', range: '70–100', color: 'bg-green-50 text-green-700 border-green-200' },
          { label: 'At Risk',  range: '45–69',  color: 'bg-amber-50 text-amber-700 border-amber-200' },
          { label: 'Critical', range: '0–44',   color: 'bg-red-50 text-red-700 border-red-200' },
        ].map(b => (
          <div key={b.label} className={`rounded-lg border py-2 font-medium ${b.color}`}>
            {b.label}<br /><span className="font-mono text-xs opacity-70">{b.range}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CustomerHealthCard({ customer, onClick }: { customer: any; onClick: () => void }) {
  const { total, breakdown } = weightedScore(customer)
  const { text, bg, border, bar, label } = healthColor(total)
  const stored = customer.health_score ?? total

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl border shadow-sm p-5 cursor-pointer hover:shadow-md transition-all ${border}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-800">{customer.name}</h3>
          <p className="text-xs text-slate-400">{customer.company?.name} · {customer.plan}</p>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-black ${text}`}>{total}</div>
          <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${bg} ${text} border ${border} mt-1`}>{label}</div>
        </div>
      </div>

      {/* Comparison if AI score differs from stored */}
      {Math.abs(stored - total) > 3 && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
          <Info className="w-3 h-3" />
          <span>Stored: {stored} · Engine: {total}</span>
        </div>
      )}

      {/* Weight breakdown */}
      <div className="space-y-2">
        {WEIGHTS.map(w => {
          const val = Math.round(breakdown[w.key])
          return (
            <div key={w.key} className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-20 flex-shrink-0">{w.label}</span>
              <div className="flex-1">
                <ScoreBar value={val} color={w.color} />
              </div>
              <span className="text-xs font-medium text-slate-600 w-8 text-right">{val}</span>
              <span className="text-xs text-slate-300 w-8">×{w.pct}%</span>
            </div>
          )
        })}
      </div>

      {/* Contribution bars */}
      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
          {WEIGHTS.map(w => {
            const contrib = (breakdown[w.key] * w.pct) / 100
            return (
              <div
                key={w.key}
                className="h-full rounded-sm"
                style={{ width: `${contrib}%`, backgroundColor: w.color, minWidth: 4 }}
                title={`${w.label}: ${Math.round(contrib)} pts`}
              />
            )
          })}
        </div>
        <p className="text-xs text-slate-400 mt-1">Contribution breakdown</p>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>MRR: ${customer.mrr?.toLocaleString()}</span>
        <span className="flex items-center gap-1 text-blue-600 font-medium">
          View 360 <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </motion.div>
  )
}

function DemoScenario({ label, desc, scores, colorClass }: { label: string; desc: string; scores: Record<string, number>; colorClass: string }) {
  const total = Math.round(
    (scores.usage * 40 + scores.sentiment * 30 + scores.support * 20 + scores.renewal * 10) / 100
  )
  const { text, bg, border } = healthColor(total)
  return (
    <div className={`rounded-xl border p-4 ${border} ${bg}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`font-semibold text-sm ${text}`}>{label}</span>
        <span className={`text-2xl font-black ${text}`}>{total}</span>
      </div>
      <p className="text-xs text-slate-500 mb-3">{desc}</p>
      <div className="space-y-1.5">
        {WEIGHTS.map(w => (
          <div key={w.key} className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-20">{w.label}</span>
            <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${scores[w.key]}%`, backgroundColor: w.color }} />
            </div>
            <span className="text-xs font-medium text-slate-600 w-6 text-right">{scores[w.key]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CustomerHealthEngine() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [sortBy, setSortBy]       = useState<'score' | 'name' | 'mrr'>('score')
  const [filter, setFilter]       = useState<'all' | 'healthy' | 'at_risk' | 'critical'>('all')
  const nav = useNavigate()

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await customersApi.list({ page_size: 50 })
      setCustomers(data.items ?? [])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const scored = customers.map(c => ({ ...c, _computed: weightedScore(c) }))

  const filtered = scored.filter(c => {
    const s = c._computed.total
    if (filter === 'healthy')  return s >= 70
    if (filter === 'at_risk')  return s >= 45 && s < 70
    if (filter === 'critical') return s < 45
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'score') return b._computed.total - a._computed.total
    if (sortBy === 'mrr')   return (b.mrr ?? 0) - (a.mrr ?? 0)
    return a.name.localeCompare(b.name)
  })

  const avgScore = scored.length ? Math.round(scored.reduce((s, c) => s + c._computed.total, 0) / scored.length) : 0

  return (
    <div>
      <Header title="Customer Health Engine" subtitle="AI-powered weighted health scoring with dimensional breakdown" />
      <div className="p-6 space-y-6">

        {/* Summary banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-xl">Portfolio Health Engine</div>
                <div className="text-blue-100 text-sm">Real-time weighted scoring across {customers.length} customers</div>
              </div>
            </div>
            <div className="flex gap-8 text-center">
              <div>
                <div className="text-3xl font-black">{avgScore}</div>
                <div className="text-blue-200 text-xs">Avg Score</div>
              </div>
              <div>
                <div className="text-3xl font-black text-green-300">{scored.filter(c => c._computed.total >= 70).length}</div>
                <div className="text-blue-200 text-xs">Healthy</div>
              </div>
              <div>
                <div className="text-3xl font-black text-amber-300">{scored.filter(c => c._computed.total >= 45 && c._computed.total < 70).length}</div>
                <div className="text-blue-200 text-xs">At Risk</div>
              </div>
              <div>
                <div className="text-3xl font-black text-red-300">{scored.filter(c => c._computed.total < 45).length}</div>
                <div className="text-blue-200 text-xs">Critical</div>
              </div>
            </div>
            <button onClick={load} className="flex items-center gap-1.5 text-sm bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition-all">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Formula + Demo scenarios */}
          <div className="lg:col-span-1 space-y-5">
            <FormulaCard />

            {/* Demo scenarios */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Demo Scenarios
              </h3>
              <div className="space-y-3">
                <DemoScenario
                  label="Healthy Customer"
                  desc="High adoption, positive sentiment, clean support queue"
                  colorClass="green"
                  scores={{ usage: 90, sentiment: 88, support: 95, renewal: 80 }}
                />
                <DemoScenario
                  label="At Risk Customer"
                  desc="Usage declining, mixed sentiment, a few tickets open"
                  colorClass="amber"
                  scores={{ usage: 45, sentiment: 55, support: 70, renewal: 55 }}
                />
                <DemoScenario
                  label="Critical Customer"
                  desc="Usage collapsed, negative NPS, escalation active"
                  colorClass="red"
                  scores={{ usage: 22, sentiment: 20, support: 28, renewal: 35 }}
                />
                <DemoScenario
                  label="Expansion Ready"
                  desc="Power user, rave reviews, high ROI — upsell candidate"
                  colorClass="blue"
                  scores={{ usage: 95, sentiment: 92, support: 98, renewal: 85 }}
                />
              </div>
            </div>
          </div>

          {/* Right: Customer grid */}
          <div className="lg:col-span-3 space-y-4">
            {/* Filters + sort */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {(['all', 'healthy', 'at_risk', 'critical'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                      filter === f ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                    }`}>
                    {f.replace('_', ' ')}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-2 text-sm text-slate-500">
                Sort:
                {(['score', 'mrr', 'name'] as const).map(s => (
                  <button key={s} onClick={() => setSortBy(s)}
                    className={`px-2 py-1 rounded-lg capitalize transition-all ${
                      sortBy === s ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-slate-100'
                    }`}>
                    {s === 'mrr' ? 'MRR' : s}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200 h-48 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sorted.map((c, i) => (
                  <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <CustomerHealthCard
                      customer={c}
                      onClick={() => nav(`/customers/${c.id}/360`)}
                    />
                  </motion.div>
                ))}
                {sorted.length === 0 && (
                  <div className="col-span-2 text-center py-16 text-slate-400">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No customers match this filter
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
