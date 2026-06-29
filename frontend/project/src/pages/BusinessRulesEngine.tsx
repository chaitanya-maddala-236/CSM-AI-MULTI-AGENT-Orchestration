import PageIllustration from '../components/common/PageIllustration'
import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Zap, BarChart2, MessageSquare, Ticket,
  RotateCcw, Save, Play, CheckCircle, AlertTriangle, XCircle, Info
} from 'lucide-react'
import Header from '../components/layout/Header'
import { businessRulesApi } from '../services/api'
import { useToast } from '../components/common/Toast'

interface RuleRow {
  id: string
  label: string
  icon: typeof Shield
  description: string
  formula: string
  color: string
  threshold: number
  weight: number
  thresholdLabel: string
  thresholdUnit: string
  weightLabel: string
}

const RULES: RuleRow[] = [
  {
    id: 'usage_drop', label: 'Usage Drop', icon: BarChart2,
    description: 'Risk added when product usage drops below threshold',
    formula: 'if usage_drop ≥ threshold → risk += weight',
    color: '#3B82F6',
    threshold: 40, weight: 30,
    thresholdLabel: 'Min drop %', thresholdUnit: '%', weightLabel: 'Risk points'
  },
  {
    id: 'sentiment', label: 'Negative Sentiment', icon: MessageSquare,
    description: 'Risk added when customer sentiment turns negative',
    formula: 'if sentiment == "negative" → risk += weight',
    color: '#8B5CF6',
    threshold: 0, weight: 25,
    thresholdLabel: 'Triggers on negative', thresholdUnit: '', weightLabel: 'Risk points'
  },
  {
    id: 'tickets', label: 'Open Tickets', icon: Ticket,
    description: 'Risk added when unresolved support tickets exceed threshold',
    formula: 'if open_tickets ≥ threshold → risk += weight',
    color: '#F59E0B',
    threshold: 3, weight: 20,
    thresholdLabel: 'Min open tickets', thresholdUnit: '', weightLabel: 'Risk points'
  },
  {
    id: 'renewal', label: 'Renewal Proximity', icon: RotateCcw,
    description: 'Risk added when renewal date is approaching',
    formula: 'if days_to_renewal ≤ threshold → risk += weight',
    color: '#EF4444',
    threshold: 30, weight: 15,
    thresholdLabel: 'Days threshold', thresholdUnit: 'd', weightLabel: 'Risk points'
  },
]

function RiskMeter({ score, level }: { score: number; level: string }) {
  const color = level === 'critical' ? '#ef4444' : level === 'at_risk' ? '#f59e0b' : '#22c55e'
  const label = level === 'critical' ? 'Critical' : level === 'at_risk' ? 'At Risk' : 'Healthy'
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-40 h-40">
        <svg className="w-40 h-40 -rotate-90" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="60" fill="none" stroke="#e2e8f0" strokeWidth="16" />
          <circle cx="80" cy="80" r="60" fill="none" stroke={color} strokeWidth="16"
            strokeDasharray={`${2 * Math.PI * 60}`}
            strokeDashoffset={`${2 * Math.PI * 60 * (1 - score / 100)}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black" style={{ color }}>{Math.round(score)}</span>
          <span className="text-xs text-slate-400 font-medium">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-semibold px-3 py-1 rounded-full border"
        style={{ color, background: color + '15', borderColor: color + '40' }}>
        {label}
      </span>
    </div>
  )
}

export default function BusinessRulesEngine() {
  const toast = useToast()
  const [rules, setRules] = useState({ ...Object.fromEntries(RULES.map(r => [r.id + '_threshold', r.threshold])), ...Object.fromEntries(RULES.map(r => [r.id + '_weight', r.weight])) })
  const [autoApprove, setAutoApprove] = useState(false)
  const [confidenceThreshold, setConfidenceThreshold] = useState(75)
  const [saving, setSaving] = useState(false)

  // Live simulator inputs
  const [sim, setSim] = useState({ usage_drop: 45, negative_sentiment: true, open_tickets: 4, renewal_days: 25 })
  const [simResult, setSimResult] = useState<{ risk_score: number; risk_level: string; breakdown: any[] } | null>(null)
  const [simRunning, setSimRunning] = useState(false)

  useEffect(() => {
    businessRulesApi.get().then(r => {
      const d = r.data
      setAutoApprove(d.auto_approve_enabled ?? false)
      setConfidenceThreshold(d.auto_approve_confidence_threshold ?? 75)
    }).catch(() => {})
    runSim()
  }, [])

  const runSim = useCallback(async () => {
    setSimRunning(true)
    try {
      const r = await businessRulesApi.simulate(sim)
      setSimResult(r.data)
    } catch { } finally { setSimRunning(false) }
  }, [sim])

  useEffect(() => {
    const t = setTimeout(runSim, 300)
    return () => clearTimeout(t)
  }, [sim])

  const save = async () => {
    setSaving(true)
    try {
      await businessRulesApi.update({ auto_approve_enabled: autoApprove, auto_approve_confidence_threshold: confidenceThreshold })
      toast.success('Business rules saved', 'Agents will use these weights on next analysis run.')
    } catch { toast.error('Save failed', 'Please try again.') }
    finally { setSaving(false) }
  }

  const maxRisk = RULES.reduce((s, r) => s + r.weight, 0)

  return (
    <div>
      <Header title="Business Rules Engine" subtitle="Configure risk scoring weights and auto-approval thresholds" />
      <div className="p-6 space-y-6">

        {/* Formula explanation banner */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg mb-1">Risk Scoring Formula</h2>
              <p className="text-slate-300 text-sm mb-3">The AI agents use these rules to compute a cumulative risk score (0–100) for every customer. Scores above 70 = Critical, 40–70 = At Risk, below 40 = Healthy.</p>
              <div className="font-mono text-sm bg-white/10 rounded-xl p-4 space-y-1">
                <p className="text-green-400">risk_score = 0</p>
                {RULES.map(r => (
                  <p key={r.id} className="text-blue-300">{r.formula}</p>
                ))}
                <p className="text-yellow-300">risk_score = min(100, risk_score)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Rule Cards */}
          <div className="xl:col-span-2 space-y-4">
            <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wider text-slate-400">Risk Rules</h3>
            {RULES.map((rule, i) => {
              const Icon = rule.icon
              const weight = rule.weight
              const pct = Math.round((weight / maxRisk) * 100)
              return (
                <motion.div key={rule.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: rule.color + '15' }}>
                      <Icon className="w-5 h-5" style={{ color: rule.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-slate-900">{rule.label}</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: rule.color + '15', color: rule.color }}>
                          {weight} pts ({pct}% of max)
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">{rule.description}</p>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: rule.color }} />
                      </div>
                      <div className="font-mono text-xs bg-slate-50 rounded-lg px-3 py-2 text-slate-600 border border-slate-100">
                        {rule.formula}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}

            {/* Auto-Approve */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-5 h-5 text-purple-500" />
                <h4 className="font-semibold text-slate-900">Auto-Approval Gate</h4>
                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100">HITL Override</span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">Enable auto-approval</p>
                  <p className="text-xs text-slate-400">Recommendations above the confidence threshold skip the review queue</p>
                </div>
                <button onClick={() => setAutoApprove(a => !a)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${autoApprove ? 'bg-purple-500' : 'bg-slate-200'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoApprove ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              {autoApprove && (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Min confidence threshold</span>
                    <span className="font-semibold text-purple-600">{confidenceThreshold}%</span>
                  </div>
                  <input type="range" min={50} max={99} value={confidenceThreshold}
                    onChange={e => setConfidenceThreshold(Number(e.target.value))}
                    className="w-full accent-purple-500" />
                  <div className="flex justify-between text-xs text-slate-400 mt-1"><span>50%</span><span>99%</span></div>
                </div>
              )}
            </div>

            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-xl transition-all shadow-sm shadow-blue-200">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Save Business Rules
            </button>
          </div>

          {/* Live Simulator */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-400 text-sm uppercase tracking-wider">Live Risk Simulator</h3>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 sticky top-6">
              {simResult && <RiskMeter score={simResult.risk_score} level={simResult.risk_level} />}

              <div className="space-y-4">
                {/* Usage Drop */}
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-600 flex items-center gap-1.5"><BarChart2 className="w-3.5 h-3.5" /> Usage drop</span>
                    <span className="font-semibold text-blue-600">{sim.usage_drop}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={sim.usage_drop}
                    onChange={e => setSim(s => ({ ...s, usage_drop: Number(e.target.value) }))}
                    className="w-full accent-blue-500" />
                </div>

                {/* Open Tickets */}
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-600 flex items-center gap-1.5"><Ticket className="w-3.5 h-3.5" /> Open tickets</span>
                    <span className="font-semibold text-amber-600">{sim.open_tickets}</span>
                  </div>
                  <input type="range" min={0} max={10} value={sim.open_tickets}
                    onChange={e => setSim(s => ({ ...s, open_tickets: Number(e.target.value) }))}
                    className="w-full accent-amber-500" />
                </div>

                {/* Renewal Days */}
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-600 flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> Days to renewal</span>
                    <span className="font-semibold text-red-600">{sim.renewal_days}d</span>
                  </div>
                  <input type="range" min={1} max={365} value={sim.renewal_days}
                    onChange={e => setSim(s => ({ ...s, renewal_days: Number(e.target.value) }))}
                    className="w-full accent-red-500" />
                </div>

                {/* Negative Sentiment */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Negative sentiment</span>
                  <button onClick={() => setSim(s => ({ ...s, negative_sentiment: !s.negative_sentiment }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${sim.negative_sentiment ? 'bg-purple-500' : 'bg-slate-200'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${sim.negative_sentiment ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Rule breakdown */}
              {simResult && (
                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rule Breakdown</p>
                  {simResult.breakdown.map((b: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className={`flex items-center gap-1.5 ${b.triggered ? 'text-slate-700' : 'text-slate-400'}`}>
                        {b.triggered ? <CheckCircle className="w-3 h-3 text-red-500" /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                        {b.rule}
                      </span>
                      <span className={`font-semibold ${b.triggered ? 'text-red-600' : 'text-slate-300'}`}>
                        {b.triggered ? `+${b.points}` : '—'}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm font-bold border-t border-slate-100 pt-2">
                    <span className="text-slate-700">Total Risk Score</span>
                    <span className={simResult.risk_level === 'critical' ? 'text-red-600' : simResult.risk_level === 'at_risk' ? 'text-amber-600' : 'text-green-600'}>
                      {simResult.risk_score}/100
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
