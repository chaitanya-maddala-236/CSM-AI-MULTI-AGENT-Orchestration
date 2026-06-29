import PageIllustration from '../components/common/PageIllustration'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts'
import Header from '../components/layout/Header'
import { analyticsApi } from '../services/api'
import { formatCurrency } from '../utils/helpers'
import { TrendingUp, Brain, Target, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

const COLORS = ['#22C55E', '#F59E0B', '#EF4444', '#2563EB', '#8B5CF6', '#EC4899']

function MetricBar({ label, value, color, max = 100 }: { label: string; value: number; color: string; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="font-bold tabular-nums" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full" style={{ background: color }} />
      </div>
    </div>
  )
}

function RiskFormulaCard({ formula }: { formula: any }) {
  if (!formula) return null
  const weights = Object.entries(formula.formula) as [string, number][]
  const labels: Record<string, { label: string; icon: any; color: string }> = {
    usage_weight:           { label: 'Product Usage',       icon: TrendingUp,    color: '#2563EB' },
    sentiment_weight:       { label: 'Customer Sentiment',  icon: Brain,         color: '#8B5CF6' },
    support_tickets_weight: { label: 'Support Tickets',     icon: AlertTriangle, color: '#EF4444' },
    renewal_health_weight:  { label: 'Renewal Health',      icon: Clock,         color: '#F59E0B' },
    historical_risk_weight: { label: 'Historical Pattern',  icon: Target,        color: '#22C55E' },
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
      <h3 className="font-bold text-slate-900 mb-1">Risk Score Formula</h3>
      <p className="text-xs text-slate-400 mb-4">How we calculate customer risk — fully explainable</p>
      <div className="space-y-3">
        {weights.map(([key, weight]) => {
          const meta = labels[key]
          if (!meta) return null
          const Icon = meta.icon
          const pct = Math.round(weight * 100)
          return (
            <div key={key} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: meta.color + '18' }}>
                <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700 font-medium">{meta.label}</span>
                  <span className="font-bold tabular-nums" style={{ color: meta.color }}>{pct}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.1 }}
                    className="h-full rounded-full" style={{ background: meta.color }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {Object.entries(formula.thresholds).map(([k, v]) => (
          <div key={k} className={`px-3 py-2 rounded-xl text-xs font-semibold text-center border ${
            k === 'critical' ? 'bg-red-50 text-red-700 border-red-100' :
            k === 'high' ? 'bg-orange-50 text-orange-700 border-orange-100' :
            k === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-100' :
            'bg-green-50 text-green-700 border-green-100'
          }`}>
            <div className="capitalize">{k}</div>
            <div className="font-normal opacity-70">{v as string}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Analytics() {
  const [healthTrend, setHealthTrend] = useState<any[]>([])
  const [revTrend, setRevTrend] = useState<any[]>([])
  const [recStats, setRecStats] = useState<any>(null)
  const [aiPerf, setAiPerf] = useState<any>(null)
  const [riskFormula, setRiskFormula] = useState<any>(null)
  const [successRates, setSuccessRates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      analyticsApi.healthTrend(),
      analyticsApi.revenueTrend(),
      analyticsApi.recommendationStats(),
      (analyticsApi as any).aiPerformance(),
      (analyticsApi as any).riskFormula(),
      (analyticsApi as any).successRates(),
    ]).then(([h, r, rs, ap, rf, sr]) => {
      setHealthTrend(h.data)
      setRevTrend(r.data)
      setRecStats(rs.data)
      setAiPerf(ap.data)
      setRiskFormula(rf.data)
      setSuccessRates(sr.data)
    }).finally(() => setLoading(false))
  }, [])

  const pieData = recStats ? [
    { name: 'Approved', value: recStats.approved },
    { name: 'Pending',  value: recStats.pending },
    { name: 'Rejected', value: recStats.rejected },
  ] : []

  return (
    <div className="page-enter relative">
      <PageIllustration type="analytics" opacity={0.65} />
      <Header title="Analytics" subtitle="Business intelligence & AI performance metrics" />
      <div className="p-6 space-y-6">

        {/* KPI Row */}
        {recStats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Recommendations', value: recStats.total,           color: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-100' },
              { label: 'Approved',              value: recStats.approved,        color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
              { label: 'Rejected',              value: recStats.rejected,        color: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-100' },
              { label: 'Pending Review',        value: recStats.pending,         color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
              { label: 'Acceptance Rate',       value: `${recStats.acceptance_rate}%`, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
            ].map(({ label, value, color, bg, border }, i) => (
              <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`rounded-2xl border ${border} ${bg} p-5 text-center`}>
                <div className={`text-3xl font-black ${color} leading-none`}>{value}</div>
                <div className="text-xs text-slate-500 mt-2 font-semibold">{label}</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ARR Trend */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <h3 className="font-bold text-slate-900 mb-1">ARR Growth Trend</h3>
            <p className="text-xs text-slate-400 mb-4">Last 6 months</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revTrend}>
                <defs>
                  <linearGradient id="gaArr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} /><stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
                <Area type="monotone" dataKey="arr" stroke="#2563EB" fill="url(#gaArr)" strokeWidth={2.5} name="ARR" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Health Over Time */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <h3 className="font-bold text-slate-900 mb-1">Portfolio Health</h3>
            <p className="text-xs text-slate-400 mb-4">8-day rolling view</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={healthTrend} barSize={10} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0' }} />
                <Bar dataKey="healthy" fill="#22C55E" radius={[4, 4, 0, 0]} name="Healthy" />
                <Bar dataKey="at_risk" fill="#F59E0B" radius={[4, 4, 0, 0]} name="At Risk" />
                <Bar dataKey="critical" fill="#EF4444" radius={[4, 4, 0, 0]} name="Critical" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Performance + Risk Formula */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* AI Performance — real data */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-4 h-4 text-purple-500" />
              <h3 className="font-bold text-slate-900">AI Performance</h3>
            </div>
            <p className="text-xs text-slate-400 mb-5">Live metrics from agent runs</p>
            {aiPerf ? (
              <div className="space-y-4">
                <MetricBar label="Agent Success Rate"   value={aiPerf.success_rate}   color="#22C55E" />
                <MetricBar label="Recommendation Acceptance" value={aiPerf.accuracy_rate} color="#2563EB" />
                <MetricBar label="Avg Confidence Score" value={Math.round(aiPerf.avg_confidence_score * 100)} color="#8B5CF6" />
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-center">
                  <div>
                    <div className="text-xl font-black text-slate-900">{aiPerf.total_runs}</div>
                    <div className="text-xs text-slate-400 font-medium">Total Runs</div>
                  </div>
                  <div>
                    <div className="text-xl font-black text-slate-900">{(aiPerf.avg_execution_ms / 1000).toFixed(1)}s</div>
                    <div className="text-xs text-slate-400 font-medium">Avg Time</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex justify-between mb-1.5"><div className="h-3 bg-slate-100 rounded w-32" /><div className="h-3 bg-slate-100 rounded w-8" /></div>
                    <div className="h-2 bg-slate-100 rounded-full" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommendation Status Pie */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <h3 className="font-bold text-slate-900 mb-1">Recommendation Status</h3>
            <p className="text-xs text-slate-400 mb-2">Distribution by outcome</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} innerRadius={40} paddingAngle={4} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Risk Formula */}
          <RiskFormulaCard formula={riskFormula} />
        </div>

        {/* Success Rates by Category — the learning loop evidence */}
        {successRates.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <h3 className="font-bold text-slate-900">Recommendation Success Rates by Category</h3>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Acceptance rate per recommendation type — evidence the platform continuously learns from feedback
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-4">
              {successRates.map((row, i) => {
                const color = row.success_rate >= 80 ? '#22C55E' : row.success_rate >= 60 ? '#2563EB' : row.success_rate >= 40 ? '#F59E0B' : '#EF4444'
                return (
                  <div key={row.category}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-slate-700 font-semibold capitalize">{row.category.replace('_', ' ')}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{row.total} recs</span>
                        <span className="font-bold tabular-nums" style={{ color }}>{row.success_rate}%</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${row.success_rate}%` }} transition={{ duration: 0.8, delay: i * 0.06 }}
                        className="h-full rounded-full" style={{ background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* MRR vs ARR */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
          <h3 className="font-bold text-slate-900 mb-1">MRR vs ARR Comparison</h3>
          <p className="text-xs text-slate-400 mb-4">Monthly breakdown</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revTrend} barSize={22} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0' }} />
              <Bar dataKey="arr" fill="#2563EB" radius={[6, 6, 0, 0]} name="ARR" />
              <Bar dataKey="mrr" fill="#93C5FD" radius={[6, 6, 0, 0]} name="MRR" />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
