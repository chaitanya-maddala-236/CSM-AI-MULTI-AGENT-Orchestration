// @ts-nocheck
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Brain, TrendingDown, TrendingUp, AlertTriangle,
  CheckCircle, Clock, DollarSign, Users, Shield, Zap,
  ChevronRight, Star, XCircle, BarChart2, Loader2, Sparkles
} from 'lucide-react'
import { customer360Api, recExtApi, executiveSummaryApi, memoryApi } from '../services/api'
import { useToast } from '../components/common/Toast'
import Header from '../components/layout/Header'
import ExecutiveSummaryCard from '../components/customers/ExecutiveSummaryCard'

const priorityColor: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
}

const statusIcon: Record<string, JSX.Element> = {
  approved: <CheckCircle className="w-4 h-4 text-green-500" />,
  rejected: <XCircle className="w-4 h-4 text-red-400" />,
  pending: <Clock className="w-4 h-4 text-amber-500" />,
  executed: <Star className="w-4 h-4 text-purple-500" />,
}

function ScoreGauge({ value, max = 100, label, color }: { value: number; max?: number; label: string; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="32" fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 32}`}
            strokeDashoffset={`${2 * Math.PI * 32 * (1 - pct / 100)}`}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-slate-800">{pct}</span>
        </div>
      </div>
      <span className="text-xs text-slate-500 font-medium text-center">{label}</span>
    </div>
  )
}

function TimelineItem({ entry }: { entry: Record<string, string> }) {
  const iconMap: Record<string, string> = {
    meeting: '💬', recommendation_executed: '✅', health_check: '💊',
    ticket: '🎫', memory_note: '📝', default: '📌',
  }
  return (
    <div className="flex gap-3 items-start">
      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm flex-shrink-0">
        {iconMap[entry.event_type] || iconMap.default}
      </div>
      <div className="flex-1 min-w-0 pb-4 border-b border-slate-100 last:border-0">
        <p className="text-sm font-medium text-slate-800 truncate">{entry.title}</p>
        {entry.description && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{entry.description}</p>
        )}
        <p className="text-xs text-slate-400 mt-1">
          {entry.occurred_at ? new Date(entry.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
        </p>
      </div>
    </div>
  )
}

function SimulationBar({ item }: { item: Record<string, unknown> }) {
  const pct = Math.round((item.predicted_success_rate as number) * 100)
  const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600 w-40 truncate">{item.action as string}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
          className="h-full rounded-full" style={{ background: color }} />
      </div>
      <span className="text-sm font-semibold w-10 text-right" style={{ color }}>{pct}%</span>
      {(item.data_points as number) > 0 && (
        <span className="text-xs text-slate-400">({item.data_points as number} cases)</span>
      )}
    </div>
  )
}

export default function Customer360() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [simulations, setSimulations] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'insights' | 'timeline' | 'simulator' | 'memory'>('insights')
  const [execSummary, setExecSummary] = useState<Record<string,unknown> | null>(null)
  const [feedbackRec, setFeedbackRec] = useState<string | null>(null)
  const [feedbackForm, setFeedbackForm] = useState({ outcome: 'success', notes: '' })

  useEffect(() => {
    if (!id) return
    Promise.all([
      customer360Api.get(id),
      recExtApi.simulate(id),
      executiveSummaryApi.get(id),
    ]).then(([r360, rsim, rexec]) => {
      setData(r360.data)
      setSimulations(rsim.data.simulations || [])
      setExecSummary(rexec.data)
    }).catch(() => toast.error('Failed to load', 'Could not fetch Customer 360 data'))
      .finally(() => setLoading(false))
  }, [id])

  const submitFeedback = async (recId: string) => {
    try {
      await recExtApi.feedback(recId, { outcome: feedbackForm.outcome, outcome_notes: feedbackForm.notes })
      toast.success('Feedback saved', 'Memory updated for future recommendations.')
      setFeedbackRec(null)
      // Refresh
      const r = await customer360Api.get(id!)
      setData(r.data)
    } catch {
      toast.error('Failed', 'Could not save feedback.')
    }
  }

  if (loading) return (
    <div className="min-h-screen relative"><PageIllustration type="customers" opacity={0.65} /><div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div></div>
  )

  if (!data) return null

  const customer = data.customer as Record<string, unknown>
  const scores = data.scores as Record<string, unknown>
  const aiInsights = data.ai_insights as Record<string, unknown>
  const recommendations = (data.recommendations as unknown[]) || []
  const timeline = (data.timeline as unknown[]) || []
  const meetings = (data.meetings as unknown[]) || []

  const churnPct = scores.churn_risk_pct as number
  const healthScore = scores.health_score as number

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Back */}
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Executive Summary Hero Card */}
        <ExecutiveSummaryCard summary={execSummary as Parameters<typeof ExecutiveSummaryCard>[0]['summary']} />

        {/* Hero Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-5">
          <div className="flex flex-wrap gap-6 items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-slate-900">{customer.name as string}</h1>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                  (customer.health_status as string) === 'critical' ? 'bg-red-100 text-red-700 border-red-200' :
                  (customer.health_status as string) === 'at_risk' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                  'bg-green-100 text-green-700 border-green-200'
                }`}>
                  {(customer.health_status as string)?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <p className="text-slate-500 text-sm">{customer.email as string}</p>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-600">
                <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-blue-400" /> {customer.plan as string}</span>
                <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-green-400" /> ARR ${((customer.arr as number) || 0).toLocaleString()}</span>
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-purple-400" /> {customer.seats as number} seats</span>
                {customer.renewal_days_left !== null && (
                  <span className={`flex items-center gap-1.5 font-medium ${
                    (customer.renewal_days_left as number) <= 30 ? 'text-red-600' : 'text-slate-600'
                  }`}>
                    <Clock className="w-4 h-4" />
                    Renewal in {customer.renewal_days_left as number} days
                  </span>
                )}
              </div>
            </div>

            {/* Score gauges */}
            <div className="flex gap-6 flex-wrap">
              <ScoreGauge value={healthScore} label="Health Score"
                color={healthScore >= 70 ? '#22c55e' : healthScore >= 40 ? '#f59e0b' : '#ef4444'} />
              <ScoreGauge value={churnPct} label="Churn Risk %"
                color={churnPct >= 70 ? '#ef4444' : churnPct >= 40 ? '#f59e0b' : '#22c55e'} />
              <ScoreGauge value={Math.round((scores.adoption_score as number) || 45)} label="Adoption"
                color="#6366f1" />
              <div className="flex flex-col items-center gap-1">
                <div className="w-20 h-20 flex items-center justify-center">
                  <span className={`text-3xl ${
                    (scores.sentiment_label as string) === 'negative' ? '😟' :
                    (scores.sentiment_label as string) === 'positive' ? '😊' : '😐'
                  }`} />
                </div>
                <span className="text-xs text-slate-500 font-medium capitalize">
                  {scores.sentiment_label as string} Sentiment
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* AI Executive Summary */}
        {execSummary && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-2xl p-6 mb-5 text-white shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-bold text-lg">AI Executive Summary</h3>
                  {execSummary.last_analyzed && (
                    <span className="text-blue-300 text-xs">Last analyzed {new Date(execSummary.last_analyzed as string).toLocaleDateString()}</span>
                  )}
                </div>
                <ul className="space-y-2 mb-4">
                  {(execSummary.bullets as string[]).map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-blue-100">
                      <span className="flex-shrink-0 mt-0.5">{b.slice(0, 2)}</span>
                      <span>{b.slice(2).trim()}</span>
                    </li>
                  ))}
                </ul>
                {execSummary.recommended_next_action && (
                  <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                    <Brain className="w-4 h-4 text-blue-300 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-blue-300 font-medium uppercase tracking-wider">Recommended Next Action</p>
                      <p className="text-sm font-semibold text-white">{execSummary.recommended_next_action as string}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-2xl font-black text-white">{execSummary.action_confidence as number}%</p>
                      <p className="text-xs text-blue-300">confidence</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5 w-fit">
          {(['insights', 'timeline', 'simulator', 'memory'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                activeTab === tab ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {tab === 'simulator' ? '🔮 Simulator' : tab === 'insights' ? '🧠 AI Insights' :
               tab === 'timeline' ? '📅 Timeline' : '🧬 Memory'}
            </button>
          ))}
        </div>

        {/* ── AI Insights Tab ── */}
        {activeTab === 'insights' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Issues & Opportunities */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h3 className="font-semibold text-slate-800">Issues Detected</h3>
                </div>
                {(aiInsights.issues as string[])?.length ? (
                  <ul className="space-y-2">
                    {(aiInsights.issues as string[]).map((issue, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="text-red-400 mt-0.5">•</span> {issue}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-slate-400">No critical issues detected.</p>}
              </div>

              {(aiInsights.opportunities as string[])?.length > 0 && (
                <div className="bg-white rounded-2xl border border-green-100 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <h3 className="font-semibold text-slate-800">Opportunities</h3>
                  </div>
                  <ul className="space-y-2">
                    {(aiInsights.opportunities as string[]).map((opp, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="text-green-500 mt-0.5">→</span> {opp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-5 h-5 text-purple-500" />
                  <h3 className="font-semibold text-slate-800">Agent Status</h3>
                </div>
                <p className="text-sm text-slate-500 capitalize">
                  Last analyzed: {aiInsights.last_analyzed ?
                    new Date(aiInsights.last_analyzed as string).toLocaleString() : 'Never'}
                </p>
                <span className={`inline-flex items-center gap-1 mt-2 text-xs px-2 py-1 rounded-full ${
                  aiInsights.agent_status === 'completed' ? 'bg-green-100 text-green-700' :
                  aiInsights.agent_status === 'running' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  <Zap className="w-3 h-3" /> {aiInsights.agent_status as string}
                </span>
              </div>
            </div>

            {/* Recommendations with explainability */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-500" /> Next Best Actions
              </h3>
              {recommendations.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 shadow-sm">
                  No recommendations yet. Trigger AI analysis to generate.
                </div>
              )}
              {recommendations.map((rec) => {
                const r = rec as Record<string, unknown>
                return (
                  <motion.div key={r.id as string} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {statusIcon[r.status as string] || statusIcon.pending}
                          <h4 className="font-semibold text-slate-900">{r.title as string}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor[r.priority as string] || priorityColor.medium}`}>
                            {(r.priority as string)?.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xl font-bold text-blue-600">
                            {Math.round((r.confidence_score as number || 0) * 100)}%
                          </div>
                          <div className="text-xs text-slate-400">confidence</div>
                        </div>
                      </div>

                      {/* Evidence */}
                      {(r.evidence as string[])?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Evidence</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(r.evidence as string[]).map((e, i) => (
                              <span key={i} className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full">
                                {e}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Reasoning */}
                      {r.reasoning && (
                        <p className="text-sm text-slate-500 italic mb-3 bg-slate-50 rounded-lg p-3 border border-slate-100">
                          💡 {r.reasoning as string}
                        </p>
                      )}

                      {/* Actions */}
                      {(r.actions as string[])?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Action Steps</p>
                          <ul className="space-y-1">
                            {(r.actions as string[]).slice(0, 3).map((a, i) => (
                              <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                                <ChevronRight className="w-3 h-3 text-blue-400 flex-shrink-0" /> {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Feedback (if executed) */}
                      {r.status === 'approved' && (
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          {feedbackRec === r.id ? (
                            <div className="space-y-2">
                              <select value={feedbackForm.outcome}
                                onChange={e => setFeedbackForm(f => ({ ...f, outcome: e.target.value }))}
                                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2">
                                <option value="success">✅ Success</option>
                                <option value="partial">⚡ Partial Success</option>
                                <option value="failed">❌ Failed</option>
                              </select>
                              <input placeholder="Outcome notes..."
                                value={feedbackForm.notes}
                                onChange={e => setFeedbackForm(f => ({ ...f, notes: e.target.value }))}
                                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
                              <div className="flex gap-2">
                                <button onClick={() => submitFeedback(r.id as string)}
                                  className="flex-1 text-sm bg-blue-600 text-white rounded-lg py-1.5 hover:bg-blue-700 transition-colors">
                                  Save Outcome
                                </button>
                                <button onClick={() => setFeedbackRec(null)}
                                  className="text-sm text-slate-500 px-3">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setFeedbackRec(r.id as string)}
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                              <Star className="w-3.5 h-3.5" /> Log outcome → teach the AI
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Timeline Tab ── */}
        {activeTab === 'timeline' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" /> Account Timeline
              </h3>
              {timeline.length === 0
                ? <p className="text-slate-400 text-sm">No timeline events yet.</p>
                : <div className="space-y-0">{timeline.map((e, i) => (
                    <TimelineItem key={i} entry={e as Record<string, string>} />
                  ))}</div>
              }
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Recent Meetings</h3>
              {meetings.length === 0
                ? <p className="text-slate-400 text-sm">No meetings logged.</p>
                : meetings.map((m, i) => {
                    const meet = m as Record<string, unknown>
                    return (
                      <div key={i} className="border-b border-slate-100 pb-4 mb-4 last:border-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-slate-800 text-sm">{meet.title as string}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            meet.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                            meet.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>{meet.sentiment as string}</span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">{meet.summary as string}</p>
                        {(meet.action_items as string[])?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(meet.action_items as string[]).slice(0, 2).map((a, j) => (
                              <span key={j} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{a}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })
              }
            </div>
          </div>
        )}

        {/* ── Simulator Tab ── */}
        {activeTab === 'simulator' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🔮</span>
              <h3 className="font-semibold text-slate-900 text-lg">Recommendation Outcome Simulator</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              Predicted success rates for each action type, calibrated against this customer's history and baseline data.
            </p>
            <div className="space-y-4 max-w-2xl">
              {simulations.map((s, i) => (
                <SimulationBar key={i} item={s as Record<string, unknown>} />
              ))}
              {simulations.length === 0 && (
                <p className="text-slate-400">No simulation data available yet.</p>
              )}
            </div>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              💡 Rates are weighted 60% baseline industry data + 40% this customer's historical outcomes.
              As you log more feedback, predictions become more accurate.
            </div>
          </div>
        )}

        {/* ── Memory Tab ── */}
        {activeTab === 'memory' && <MemoryTab customerId={id!} />}
      </div>
    </div>
  )
}

// ── Memory Tab subcomponent ──────────────────────────────────────────────────
function MemoryTab({ customerId }: { customerId: string }) {
  const [mem, setMem] = useState<Record<string, unknown> | null>(null)
  useEffect(() => {
    memoryApi.get(customerId).then((r: { data: Record<string, unknown> }) => setMem(r.data))
  }, [customerId])

  if (!mem) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>

  const summary = mem.learning_summary as Record<string, unknown>
  const entries = (mem.memory_entries as unknown[]) || []
  const catRates = summary.category_rates as Record<string, Record<string, number>>

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Learning summary */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            🧬 Learning Summary
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Total Recs', value: summary.total_recommendations },
              { label: 'Approved', value: summary.approved },
              { label: 'Rejected', value: summary.rejected },
              { label: 'Accept Rate', value: `${summary.acceptance_rate}%` },
            ].map((stat, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-slate-800">{stat.value as string | number}</div>
                <div className="text-xs text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
          {(summary.what_works as string[])?.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-green-600 uppercase mb-1">✅ What Works</p>
              {(summary.what_works as string[]).map((w, i) => (
                <span key={i} className="inline-block text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full mr-1 mb-1">{w}</span>
              ))}
            </div>
          )}
          {(summary.what_to_avoid as string[])?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-500 uppercase mb-1">❌ Avoid</p>
              {(summary.what_to_avoid as string[]).map((w, i) => (
                <span key={i} className="inline-block text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full mr-1 mb-1">{w}</span>
              ))}
            </div>
          )}
        </div>

        {/* Category rates */}
        {Object.keys(catRates || {}).length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h4 className="font-semibold text-slate-800 mb-3 text-sm">Category Acceptance Rates</h4>
            {Object.entries(catRates).map(([cat, counts]) => {
              const total = (counts.approved || 0) + (counts.rejected || 0)
              const rate = total > 0 ? Math.round((counts.approved / total) * 100) : 0
              return (
                <div key={cat} className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-slate-500 w-24 capitalize truncate">{cat}</span>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${rate}%` }} />
                  </div>
                  <span className="text-xs font-medium text-slate-700 w-8">{rate}%</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Memory entries */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-semibold text-slate-800 mb-4">📜 Interaction Memory</h3>
        {entries.length === 0 ? (
          <p className="text-slate-400 text-sm">No memory entries yet.</p>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {entries.map((entry, i) => {
              const e = entry as Record<string, unknown>
              return (
                <div key={i} className={`rounded-xl border p-3 ${
                  e.type === 'recommendation'
                    ? e.decision === 'approved' || e.decision === 'executed'
                      ? 'bg-green-50 border-green-200'
                      : e.decision === 'rejected'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-slate-50 border-slate-200'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{e.type === 'recommendation' ? '📋' : '💬'}</span>
                        <p className="text-sm font-medium text-slate-800">{e.title as string}</p>
                        {e.category && (
                          <span className="text-xs bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">
                            {e.category as string}
                          </span>
                        )}
                      </div>
                      {e.decision && (
                        <p className="text-xs mt-1 capitalize text-slate-600">
                          Decision: <span className="font-medium">{e.decision as string}</span>
                          {e.outcome && ` → Outcome: ${e.outcome}`}
                        </p>
                      )}
                      {e.feedback && <p className="text-xs text-slate-500 mt-0.5 italic">"{e.feedback}"</p>}
                      {e.summary && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{e.summary as string}</p>}
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {e.date ? new Date(e.date as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
