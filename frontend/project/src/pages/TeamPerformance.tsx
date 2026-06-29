import PageIllustration from '../components/common/PageIllustration'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, TrendingUp, Brain, CheckSquare, AlertTriangle } from 'lucide-react'
import Header from '../components/layout/Header'
import { analyticsApi } from '../services/api'

interface CSMStat {
  csm_id: string
  csm_name: string
  total_accounts: number
  healthy: number
  at_risk: number
  critical: number
  total_arr: number
  approvals_given: number
  recs_generated: number
  acceptance_rate: number
  avg_health_score: number
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs text-slate-500 w-6 text-right">{value}</span>
    </div>
  )
}

export default function TeamPerformance() {
  const [csmStats, setCsmStats] = useState<CSMStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await analyticsApi.teamPerformance()
        setCsmStats(data.csm_stats || [])
      } catch { /* fallback to empty */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const maxArr = Math.max(...csmStats.map(c => c.total_arr), 1)
  const maxAccounts = Math.max(...csmStats.map(c => c.total_accounts), 1)

  const totals = csmStats.reduce(
    (acc, c) => ({
      accounts: acc.accounts + c.total_accounts,
      arr: acc.arr + c.total_arr,
      critical: acc.critical + c.critical,
      approvals: acc.approvals + c.approvals_given,
    }),
    { accounts: 0, arr: 0, critical: 0, approvals: 0 }
  )

  return (
    <div>
      <Header title="Team Performance" subtitle="Portfolio health across all CSMs" />
      <div className="p-6 space-y-5">

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Accounts', value: totals.accounts, icon: Users, color: 'text-blue-600' },
            { label: 'Total ARR', value: `$${(totals.arr / 1000).toFixed(0)}k`, icon: TrendingUp, color: 'text-green-600' },
            { label: 'Critical Accounts', value: totals.critical, icon: AlertTriangle, color: 'text-red-500' },
            { label: 'Total Approvals', value: totals.approvals, icon: CheckSquare, color: 'text-blue-500' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs text-slate-400">{s.label}</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{s.value}</div>
            </motion.div>
          ))}
        </div>

        {/* CSM Cards */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : csmStats.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-16 text-center">
            <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No CSM assignment data yet.</p>
            <p className="text-xs text-slate-300 mt-1">Assign customers to CSMs in customer settings to see team stats.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {csmStats.map((csm, i) => (
              <motion.div key={csm.csm_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                      {csm.csm_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{csm.csm_name}</h3>
                      <p className="text-xs text-slate-400">{csm.total_accounts} accounts · ${(csm.total_arr / 1000).toFixed(0)}k ARR</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-900">{Math.round(csm.avg_health_score)}</div>
                    <div className="text-xs text-slate-400">avg health</div>
                  </div>
                </div>

                {/* Health breakdown */}
                <div className="flex gap-2 mb-4">
                  {[
                    { label: 'Healthy', count: csm.healthy, color: 'bg-green-100 text-green-700' },
                    { label: 'At Risk', count: csm.at_risk, color: 'bg-amber-100 text-amber-700' },
                    { label: 'Critical', count: csm.critical, color: 'bg-red-100 text-red-700' },
                  ].map(b => (
                    <div key={b.label} className={`flex-1 text-center rounded-lg py-1.5 text-xs font-semibold ${b.color}`}>
                      {b.count} {b.label}
                    </div>
                  ))}
                </div>

                {/* Metrics */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Accounts vs team max</span>
                  </div>
                  <MiniBar value={csm.total_accounts} max={maxAccounts} color="#2563eb" />

                  <div className="flex items-center justify-between text-xs text-slate-500 mt-2 mb-1">
                    <span>AI acceptance rate</span>
                    <span className="font-medium text-slate-700">{csm.acceptance_rate}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-purple-500 transition-all duration-500"
                      style={{ width: `${csm.acceptance_rate}%` }} />
                  </div>

                  <div className="flex justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-50">
                    <span>Recs generated: <strong className="text-slate-600">{csm.recs_generated}</strong></span>
                    <span>Approved: <strong className="text-slate-600">{csm.approvals_given}</strong></span>
                    <div className="flex items-center gap-1">
                      <Brain className="w-3 h-3 text-blue-400" />
                      <span>{csm.acceptance_rate}% AI trust</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
