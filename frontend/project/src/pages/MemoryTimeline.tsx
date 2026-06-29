// @ts-nocheck
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Brain, Search, Filter, CheckCircle, XCircle, MessageSquare, TrendingUp, Star, Clock } from 'lucide-react'
import Header from '../components/layout/Header'
import { customersApi, memoryApi } from '../services/api'

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  recommendation: { icon: '💡', color: 'text-blue-700', bg: 'bg-blue-50',   border: 'border-blue-200' },
  meeting:        { icon: '💬', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  memory_note:    { icon: '📝', color: 'text-slate-700',  bg: 'bg-slate-50',  border: 'border-slate-200' },
}

const DECISION_CONFIG: Record<string, { icon: JSX.Element; label: string; dot: string }> = {
  approved:  { icon: <CheckCircle className="w-3.5 h-3.5 text-green-500" />, label: 'Approved', dot: 'bg-green-500' },
  rejected:  { icon: <XCircle className="w-3.5 h-3.5 text-red-400" />,      label: 'Rejected', dot: 'bg-red-400' },
  executed:  { icon: <Star className="w-3.5 h-3.5 text-purple-500" />,       label: 'Executed', dot: 'bg-purple-500' },
  pending:   { icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,       label: 'Pending',  dot: 'bg-amber-400' },
}

function MonthGroup({ month, entries }: { month: string; entries: Record<string, unknown>[] }) {
  return (
    <div className="relative"><PageIllustration type="memory" opacity={0.65} /><div className="relative z-10">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{month}</div>
        <div className="flex-1 h-px bg-slate-100" />
        <div className="text-xs text-slate-400">{entries.length} events</div>
      </div>
      <div className="space-y-2 pl-4 border-l-2 border-slate-100">
        {entries.map((entry, i) => {
          const cfg = TYPE_CONFIG[entry.type as string] || TYPE_CONFIG.memory_note
          const dec = entry.decision ? DECISION_CONFIG[entry.decision as string] : null
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-xl border p-3 ${cfg.bg} ${cfg.border} relative`}
            >
              {/* timeline dot */}
              <div className={`absolute -left-5 top-4 w-2.5 h-2.5 rounded-full border-2 border-white ${
                dec ? DECISION_CONFIG[entry.decision as string]?.dot : 'bg-slate-300'
              }`} />

              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base flex-shrink-0">{cfg.icon}</span>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${cfg.color}`}>{entry.title as string}</p>
                    {entry.category && (
                      <span className="inline-block text-xs bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full mt-0.5">
                        {entry.category as string}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-400">
                    {entry.date ? new Date(entry.date as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                  </p>
                  {dec && (
                    <div className="flex items-center gap-1 mt-1 justify-end">
                      {dec.icon}
                      <span className="text-xs text-slate-600">{dec.label}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Outcome */}
              {entry.outcome && (
                <p className="text-xs mt-1.5 text-slate-600">
                  Outcome: <span className={`font-medium ${
                    entry.outcome === 'success' ? 'text-green-600' :
                    entry.outcome === 'failed'  ? 'text-red-500' : 'text-amber-600'
                  }`}>{entry.outcome as string}</span>
                  {entry.feedback && ` — "${entry.feedback}"`}
                </p>
              )}
              {entry.summary && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{entry.summary as string}</p>
              )}
              {(entry.action_items as string[])?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {(entry.action_items as string[]).slice(0, 2).map((a, j) => (
                    <span key={j} className="text-xs bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full">{a}</span>
                  ))}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div></div>
  )
}

export default function MemoryTimeline() {
  const [customers, setCustomers]     = useState<unknown[]>([])
  const [selectedId, setSelectedId]   = useState('')
  const [selectedName, setSelectedName] = useState('')
  const [memory, setMemory]           = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading]         = useState(false)
  const [search, setSearch]           = useState('')
  const [filterType, setFilterType]   = useState<'all'|'recommendation'|'meeting'>('all')

  useEffect(() => {
    customersApi.list({ page_size: 50 }).then(r => setCustomers(r.data.items || []))
  }, [])

  const load = async (id: string, name: string) => {
    setSelectedId(id); setSelectedName(name); setLoading(true)
    try {
      const r = await memoryApi.get(id)
      setMemory(r.data)
    } finally { setLoading(false) }
  }

  // Group entries by month
  const entries = ((memory?.memory_entries as unknown[]) || [])
    .filter(e => {
      const entry = e as Record<string, unknown>
      if (filterType !== 'all' && entry.type !== filterType) return false
      if (search && !(entry.title as string)?.toLowerCase().includes(search.toLowerCase())) return false
      return true
    }) as Record<string, unknown>[]

  const grouped: Record<string, Record<string, unknown>[]> = {}
  entries.forEach(e => {
    const month = e.date
      ? new Date(e.date as string).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'Unknown'
    if (!grouped[month]) grouped[month] = []
    grouped[month].push(e)
  })

  const summary = memory?.learning_summary as Record<string, unknown> | undefined

  return (
    <div>
      <Header title="Customer Memory" subtitle="Episodic interaction history and learning timeline" />
      <div className="p-6 space-y-5">

        {/* Hero */}
        <div className="bg-gradient-to-r from-pink-600 to-rose-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-6 h-6" />
            <h2 className="text-lg font-bold">AI Memory Timeline</h2>
          </div>
          <p className="text-pink-200 text-sm max-w-2xl">
            Every interaction, recommendation, and outcome is stored and used to improve future recommendations.
            The more feedback CSMs log, the smarter the AI becomes for each customer.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

          {/* Customer list */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <h3 className="font-semibold text-slate-800 mb-3 text-sm">Select Customer</h3>
              <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
                {(customers as Record<string, unknown>[]).map(c => (
                  <button
                    key={c.id as string}
                    onClick={() => load(c.id as string, c.name as string)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all ${
                      selectedId === c.id ? 'bg-pink-600 text-white' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="font-medium truncate">{c.name as string}</div>
                    <div className={`text-xs ${selectedId === c.id ? 'text-pink-200' : 'text-slate-400'}`}>
                      {c.health_status as string}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="lg:col-span-3 space-y-4">
            {!selectedId && (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                <Brain className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">Select a customer to view their memory timeline</p>
              </div>
            )}

            {selectedId && summary && (
              /* Learning summary */
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total Events', value: summary.total_recommendations as number || 0, icon: '📋', color: 'text-blue-600' },
                  { label: 'Approved', value: summary.approved as number || 0, icon: '✅', color: 'text-green-600' },
                  { label: 'Acceptance Rate', value: `${summary.acceptance_rate as number || 0}%`, icon: '🎯', color: 'text-purple-600' },
                  { label: 'Learning Quality', value: (summary.total_recommendations as number) > 5 ? 'Good' : 'Building', icon: '🧠', color: 'text-pink-600' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 text-center">
                    <div className="text-xl mb-1">{s.icon}</div>
                    <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-slate-400">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {selectedId && !loading && (
              <>
                {/* What works / avoid */}
                {summary && (
                  <div className="grid grid-cols-2 gap-3">
                    {(summary.what_works as string[])?.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                        <p className="text-xs font-bold text-green-700 uppercase mb-2 flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" /> What Works
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {(summary.what_works as string[]).map((w, i) => (
                            <span key={i} className="text-xs bg-white text-green-700 border border-green-300 px-2 py-0.5 rounded-full capitalize">{w}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(summary.what_to_avoid as string[])?.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                        <p className="text-xs font-bold text-red-600 uppercase mb-2">❌ Avoid</p>
                        <div className="flex flex-wrap gap-1">
                          {(summary.what_to_avoid as string[]).map((w, i) => (
                            <span key={i} className="text-xs bg-white text-red-600 border border-red-200 px-2 py-0.5 rounded-full capitalize">{w}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Filters */}
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Search events..."
                      className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400" />
                  </div>
                  <select value={filterType} onChange={e => setFilterType(e.target.value as 'all'|'recommendation'|'meeting')}
                    className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none">
                    <option value="all">All Types</option>
                    <option value="recommendation">Recommendations</option>
                    <option value="meeting">Meetings</option>
                  </select>
                </div>

                {/* Timeline groups */}
                <div className="space-y-6">
                  {Object.entries(grouped).map(([month, items]) => (
                    <MonthGroup key={month} month={month} entries={items} />
                  ))}
                  {Object.keys(grouped).length === 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
                      No memory entries match your filter.
                    </div>
                  )}
                </div>
              </>
            )}

            {loading && (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-10 h-10 border-4 border-pink-200 border-t-pink-600 rounded-full mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Loading memory for {selectedName}...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
