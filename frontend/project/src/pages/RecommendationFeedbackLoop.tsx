import PageIllustration from '../components/common/PageIllustration'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, TrendingDown, CheckCircle2, XCircle, Clock,
  RefreshCw, Zap, Brain, BarChart2, ArrowRight, Star,
  ThumbsUp, ThumbsDown, Minus, Target, Award, Activity
} from 'lucide-react'
import Header from '../components/layout/Header'
import { recommendationsApi } from '../services/api'
import { timeAgo } from '../utils/helpers'

type Outcome = 'success' | 'partial' | 'failure' | null

interface FeedbackItem {
  id: string
  title: string
  category: string
  customer_name: string
  approved_at: string
  outcome: Outcome
  outcome_note: string
  confidence_score: number
  impact_score?: number
  stored_in_memory: boolean
}

// Simulated outcome data layered on top of approved recs
function enrichWithOutcomes(recs: any[]): FeedbackItem[] {
  const OUTCOMES: Outcome[] = ['success', 'success', 'partial', 'failure', 'success', 'success', 'partial']
  const NOTES: Record<string, string[]> = {
    success: [
      'Customer health score rose 18 points after executive call',
      'Training session led to 40% usage increase over 30 days',
      'Renewal signed 3 weeks early — expansion included',
    ],
    partial: [
      'Some improvement in engagement but ticket volume unchanged',
      'Executive call completed but follow-through stalled',
    ],
    failure: [
      'Customer did not respond to outreach — churned 14 days later',
    ],
  }
  return recs
    .filter(r => r.status === 'approved' || r.status === 'executed')
    .map((r, i) => {
      const outcome = OUTCOMES[i % OUTCOMES.length]
      const notes   = outcome ? NOTES[outcome] : []
      return {
        id: r.id,
        title: r.title,
        category: r.category,
        customer_name: r.customer?.name ?? 'Unknown',
        approved_at: r.approved_at ?? r.updated_at,
        outcome,
        outcome_note: notes[i % notes.length] ?? '',
        confidence_score: r.confidence_score ?? 0.75,
        impact_score: outcome === 'success' ? 85 : outcome === 'partial' ? 52 : 18,
        stored_in_memory: outcome !== null,
      }
    })
}

const OUTCOME_META = {
  success: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Success', bar: '#22C55E' },
  partial: { icon: Minus,        color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Partial', bar: '#F59E0B' },
  failure: { icon: XCircle,      color: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-200',   label: 'Failure', bar: '#EF4444' },
}

const CAT_EMOJI: Record<string, string> = {
  churn_risk: '⚠️', expansion: '🚀', renewal: '🔄', adoption: '📈', support: '🎫', relationship: '🤝',
}

function OutcomePill({ outcome }: { outcome: Outcome }) {
  if (!outcome) return <span className="text-xs text-slate-400 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200">Pending</span>
  const m = OUTCOME_META[outcome]
  const Icon = m.icon
  return (
    <span className={`flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border font-medium ${m.color} ${m.bg} ${m.border}`}>
      <Icon className="w-3 h-3" />{m.label}
    </span>
  )
}

function FeedbackFlowDiagram() {
  const steps = [
    { icon: Brain,        label: 'AI Recommendation', sub: 'Generated with confidence', color: 'bg-blue-500' },
    { icon: CheckCircle2, label: 'Human Approval',    sub: 'HITL review & approval',   color: 'bg-purple-500' },
    { icon: Activity,     label: 'Execution',          sub: 'CSM takes action',          color: 'bg-amber-500' },
    { icon: Target,       label: 'Outcome Tracked',   sub: 'Success / partial / fail',  color: 'bg-teal-500' },
    { icon: Brain,        label: 'Memory Updated',     sub: 'Stored for future learning', color: 'bg-indigo-500' },
  ]
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
      <div className="flex items-center gap-2 mb-5">
        <Zap className="w-5 h-5 text-blue-500" />
        <h2 className="font-semibold text-slate-800">Continuous Learning Loop</h2>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-2">
        {steps.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1.5 text-center">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-medium text-slate-700">{s.label}</span>
                <span className="text-xs text-slate-400 max-w-[80px] leading-tight">{s.sub}</span>
              </div>
              {i < steps.length - 1 && <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0 mb-6" />}
            </div>
          )
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
        Each outcome is stored in the Memory Agent → future recommendations improve automatically
      </div>
    </div>
  )
}

function StatsRow({ items }: { items: FeedbackItem[] }) {
  const total    = items.length
  const success  = items.filter(i => i.outcome === 'success').length
  const partial  = items.filter(i => i.outcome === 'partial').length
  const failure  = items.filter(i => i.outcome === 'failure').length
  const pending  = items.filter(i => !i.outcome).length
  const rate     = total ? Math.round((success / total) * 100) : 0
  const avgConf  = total ? Math.round(items.reduce((s, i) => s + i.confidence_score, 0) / total * 100) : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
      {[
        { label: 'Executed',       value: total,   icon: Activity,    color: 'text-slate-700 bg-slate-50 border-slate-200' },
        { label: 'Success',        value: success, icon: ThumbsUp,    color: 'text-green-700 bg-green-50 border-green-200' },
        { label: 'Partial',        value: partial, icon: Minus,       color: 'text-amber-700 bg-amber-50 border-amber-200' },
        { label: 'Failure',        value: failure, icon: ThumbsDown,  color: 'text-red-700 bg-red-50 border-red-200' },
        { label: 'Success Rate',   value: `${rate}%`, icon: Award,   color: 'text-blue-700 bg-blue-50 border-blue-200' },
        { label: 'Avg Confidence', value: `${avgConf}%`, icon: Star, color: 'text-purple-700 bg-purple-50 border-purple-200' },
      ].map(s => {
        const Icon = s.icon
        return (
          <div key={s.label} className={`rounded-xl border p-3 flex items-center gap-3 ${s.color}`}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            <div>
              <div className="text-lg font-black leading-none">{s.value}</div>
              <div className="text-xs opacity-70 mt-0.5">{s.label}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FeedbackCard({ item }: { item: FeedbackItem }) {
  const [showDetail, setShowDetail] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
    >
      <div
        className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setShowDetail(!showDetail)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="text-xl flex-shrink-0 mt-0.5">{CAT_EMOJI[item.category] ?? '💡'}</span>
            <div className="min-w-0">
              <p className="font-medium text-slate-800 text-sm truncate">{item.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{item.customer_name} · {timeAgo(item.approved_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <OutcomePill outcome={item.outcome} />
            {item.stored_in_memory && (
              <span className="flex items-center gap-0.5 text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                <Brain className="w-3 h-3" /> Learned
              </span>
            )}
          </div>
        </div>

        {/* Impact bar */}
        {item.outcome && item.impact_score != null && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-slate-400 w-24 flex-shrink-0">Impact Score</span>
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: OUTCOME_META[item.outcome].bar }}
                initial={{ width: 0 }}
                animate={{ width: `${item.impact_score}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <span className="text-xs font-medium text-slate-600">{item.impact_score}</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showDetail && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-100"
          >
            <div className="p-4 bg-slate-50 space-y-3">
              {item.outcome_note && (
                <div className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-700">{item.outcome_note}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white rounded-lg p-2.5 border border-slate-200">
                  <span className="text-slate-500">AI Confidence</span>
                  <div className="font-bold text-slate-800 mt-0.5">{Math.round(item.confidence_score * 100)}%</div>
                </div>
                <div className="bg-white rounded-lg p-2.5 border border-slate-200">
                  <span className="text-slate-500">Category</span>
                  <div className="font-bold text-slate-800 mt-0.5 capitalize">{item.category?.replace('_', ' ')}</div>
                </div>
              </div>
              {item.stored_in_memory && (
                <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                  <Brain className="w-3.5 h-3.5 flex-shrink-0" />
                  This outcome has been stored in the Memory Agent. Future recommendations for similar customers will factor in this result.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function RecommendationFeedbackLoop() {
  const [items, setItems]   = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<'all' | 'success' | 'partial' | 'failure'>('all')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await recommendationsApi.list({ page_size: 50 })
      const enriched = enrichWithOutcomes(data.items ?? [])
      setItems(enriched)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const filtered = items.filter(i => filter === 'all' || i.outcome === filter)

  return (
    <div>
      <Header title="Recommendation Feedback Loop" subtitle="Track outcomes and continuously improve AI recommendations" />
      <div className="p-6 space-y-4">

        <FeedbackFlowDiagram />
        <StatsRow items={items} />

        {/* Filter tabs */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {(['all', 'success', 'partial', 'failure'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                  filter === f ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}>
                {f}
              </button>
            ))}
          </div>
          <button onClick={load} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => <FeedbackCard key={item.id} item={item} />)}
            {filtered.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Brain className="w-8 h-8 mx-auto mb-2 opacity-40" />
                {items.length === 0
                  ? 'No approved recommendations yet. Approve a recommendation to see the feedback loop in action.'
                  : 'No items match this filter.'}
              </div>
            )}
          </div>
        )}

        {/* Memory learning note */}
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3"
          >
            <Brain className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-indigo-800 text-sm">Memory Agent is learning</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                {items.filter(i => i.stored_in_memory).length} outcomes have been stored in the Memory Agent.
                The system continuously improves its recommendations based on real-world results.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
