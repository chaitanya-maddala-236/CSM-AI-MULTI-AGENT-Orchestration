import PageIllustration from '../components/common/PageIllustration'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, TrendingUp, TrendingDown, RefreshCw, Search, Info, BarChart2, Target } from 'lucide-react'
import Header from '../components/layout/Header'
import { customersApi, recExtApi } from '../services/api'

const ACTION_META: Record<string, { emoji: string; desc: string; category: string }> = {
  'Executive Business Review': { emoji: '🏆', desc: 'Strategic alignment & value review', category: 'Engagement' },
  'Expansion Offer': { emoji: '📈', desc: 'Upsell & expansion opportunity', category: 'Growth' },
  'Health Check Call': { emoji: '💊', desc: 'Proactive health assessment', category: 'Retention' },
  'Feature Adoption Campaign': { emoji: '🚀', desc: 'Drive product adoption', category: 'Adoption' },
  'Renewal Kickoff': { emoji: '🔄', desc: 'Early renewal engagement', category: 'Renewal' },
  'Support Escalation': { emoji: '🆘', desc: 'Critical issue resolution', category: 'Support' },
  'Training Session': { emoji: '📚', desc: 'Product training & enablement', category: 'Adoption' },
  'Executive Sponsor Introduction': { emoji: '🤝', desc: 'Executive relationship building', category: 'Engagement' },
}



function SimulatorBar({
  item, selected, onClick
}: {
  item: Record<string, unknown>; selected: boolean; onClick: () => void
}) {
  const pct = Math.round((item.predicted_success_rate as number) * 100)
  const color = pct >= 80 ? '#22c55e' : pct >= 65 ? '#f59e0b' : '#ef4444'
  const meta = ACTION_META[item.action as string] || { emoji: '💡', desc: '', category: '' }

  return (
    <motion.div
      layout
      onClick={onClick}
      className={`rounded-2xl border-2 p-4 cursor-pointer transition-all ${
        selected ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{meta.emoji}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 text-sm">{item.action as string}</span>
            <span className="text-xl font-bold" style={{ color }}>{pct}%</span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-xs text-slate-500">{meta.desc}</span>
            {(item.data_points as number) > 0 && (
              <span className="text-xs text-slate-400">{item.data_points as number} cases</span>
            )}
          </div>
        </div>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      {selected && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 pt-3 border-t border-blue-200"
        >
          <div className="flex gap-4 text-xs">
            <div className="text-center">
              <div className="font-bold text-blue-600">{pct}%</div>
              <div className="text-slate-500">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-slate-800">{item.source === 'historical' ? '📊 Historical' : '📐 Baseline'}</div>
              <div className="text-slate-500">Data Source</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-slate-800">{pct >= 80 ? 'Recommended' : pct >= 60 ? 'Consider' : 'Low ROI'}</div>
              <div className="text-slate-500">AI Verdict</div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

export default function RecommendationSimulator() {
  const [customers, setCustomers] = useState<unknown[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [customerName, setCustomerName] = useState('')
  const [simulations, setSimulations] = useState<unknown[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'rate' | 'alpha'>('rate')

  useEffect(() => {
    customersApi.list({ page_size: 50 }).then(r => setCustomers(r.data.items || []))
  }, [])

  const runSimulation = async (customerId: string, name: string) => {
    setSelectedCustomer(customerId)
    setCustomerName(name)
    setSelected(null)
    setLoading(true)
    try {
      const r = await recExtApi.simulate(customerId)
      setSimulations(r.data.simulations || [])
    } catch {
      setSimulations([])
    } finally {
      setLoading(false)
    }
  }

  const sorted = [...simulations]
    .filter(s => {
      const item = s as Record<string, unknown>
      return search === '' || (item.action as string).toLowerCase().includes(search.toLowerCase())
    })
    .sort((a, b) => {
      const ai = a as Record<string, unknown>
      const bi = b as Record<string, unknown>
      if (sortBy === 'rate') return (bi.predicted_success_rate as number) - (ai.predicted_success_rate as number)
      return (ai.action as string).localeCompare(bi.action as string)
    })

  const top = sorted[0] as Record<string, unknown> | undefined
  const avg = simulations.length
    ? Math.round(simulations.reduce((acc: number, i) => acc + (((i as Record<string, unknown>).predicted_success_rate as number) ?? 0) * 100, 0) / simulations.length)
    : 0
  const highROI = simulations.filter(s => (s as Record<string, unknown>).predicted_success_rate as number >= 0.75).length

  return (
    <div>
      <Header
        title="Recommendation Simulator"
        subtitle="Predict outcome success rates before taking action"
      />
      <div className="p-6 space-y-5">

        {/* Hero banner */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-6 h-6" />
            <h2 className="text-lg font-bold">Decision Intelligence Simulator</h2>
          </div>
          <p className="text-purple-200 text-sm max-w-2xl">
            Select a customer to simulate predicted success rates for each action type.
            Rates are calibrated 60% from industry baseline data and 40% from this customer's
            historical interactions and CSM feedback patterns.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

          {/* Customer selector */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <h3 className="font-semibold text-slate-800 mb-3 text-sm">Select Customer</h3>
              <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
                {(customers as Record<string, unknown>[]).map(c => (
                  <button
                    key={c.id as string}
                    onClick={() => runSimulation(c.id as string, c.name as string)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all ${
                      selectedCustomer === c.id
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="font-medium truncate">{c.name as string}</div>
                    <div className={`text-xs truncate ${selectedCustomer === c.id ? 'text-blue-200' : 'text-slate-400'}`}>
                      {c.health_status as string} · {c.plan as string}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Simulation results */}
          <div className="lg:col-span-3 space-y-4">
            {!selectedCustomer && (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                <BarChart2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">Select a customer to run simulation</p>
                <p className="text-slate-300 text-sm mt-1">Predicted success rates will appear here</p>
              </div>
            )}

            {selectedCustomer && !loading && simulations.length > 0 && (
              <>
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Best Action', value: top?.action as string || '—', sub: `${Math.round((top?.predicted_success_rate as number || 0) * 100)}% success`, color: 'text-green-600' },
                    { label: 'Avg Success Rate', value: `${avg}%`, sub: 'across all actions', color: 'text-blue-600' },
                    { label: 'High ROI Actions', value: `${highROI}`, sub: 'above 75% threshold', color: 'text-purple-600' },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center">
                      <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                      <div className="text-xs text-slate-400">{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Controls */}
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Filter actions..."
                      className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as 'rate' | 'alpha')}
                    className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none"
                  >
                    <option value="rate">Sort: Success Rate</option>
                    <option value="alpha">Sort: Alphabetical</option>
                  </select>
                  <button
                    onClick={() => runSimulation(selectedCustomer, customerName)}
                    className="flex items-center gap-2 text-sm bg-white border border-slate-200 hover:border-slate-300 px-3 py-2 rounded-xl"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                {/* Bars */}
                <div className="space-y-2">
                  <AnimatePresence>
                    {sorted.map((s) => {
                      const item = s as Record<string, unknown>
                      return (
                        <SimulatorBar
                          key={item.action as string}
                          item={item}
                          selected={selected === item.action}
                          onClick={() => setSelected(selected === item.action ? null : item.action as string)}
                        />
                      )
                    })}
                  </AnimatePresence>
                </div>

                {/* Info box */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                  <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <strong>How this works:</strong> Success rates combine industry benchmarks (60%) with
                    this customer's historical CSM decision outcomes (40%). As you log more feedback after
                    executing actions, predictions become more accurate over time.
                    <span className="block mt-1 text-blue-500">
                      {customerName}: {simulations.filter(s => (s as Record<string, unknown>).source === 'historical').length} historical data points used.
                    </span>
                  </div>
                </div>
              </>
            )}

            {loading && (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-3"
                />
                <p className="text-slate-500 text-sm">Running simulation for {customerName}...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
