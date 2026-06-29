import PageIllustration from '../components/common/PageIllustration'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Brain, Play, Ticket, Clock, MessageSquare,
  CheckCircle, XCircle, AlertTriangle, Plus, X, Loader2,
  ChevronDown, ChevronUp, User
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import Header from '../components/layout/Header'
import HealthBadge from '../components/common/HealthBadge'
import PriorityBadge from '../components/common/PriorityBadge'
import ScoreRing from '../components/common/ScoreRing'
import { useToast } from '../components/common/Toast'
import { customersApi, recommendationsApi, timelineApi, agentsApi, meetingsApi, csmApi } from '../services/api'
import { formatCurrency, formatDate, timeAgo } from '../utils/helpers'
import type { Customer, Recommendation, Timeline } from '../types'

const TABS = ['overview', 'interactions', 'usage', 'recommendations', 'timeline']

// ─── Log Interaction Modal ───────────────────────────────────────────────────
interface LogModalProps {
  customerId: string
  onClose: () => void
  onSaved: () => void
}

function LogInteractionModal({ customerId, onClose, onSaved }: LogModalProps) {
  const toast = useToast()
  const [form, setForm] = useState({
    type: 'meeting', title: '', summary: '', sentiment: 'neutral', duration_minutes: ''
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.title.trim() || !form.summary.trim()) {
      toast.warning('Missing fields', 'Title and summary are required.')
      return
    }
    setSaving(true)
    try {
      await meetingsApi.log({
        customer_id: customerId,
        type: form.type as 'meeting'|'email'|'note',
        title: form.title,
        summary: form.summary,
        sentiment: form.sentiment as 'positive'|'neutral'|'negative',
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined,
      })
      toast.success('Interaction logged', 'This will be picked up by the AI on next analysis.')
      onSaved()
      onClose()
    } catch (e) {
      toast.error('Failed to log interaction', 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 text-lg">Log Interaction</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="meeting">Meeting / Call</option>
                <option value="email">Email</option>
                <option value="note">Note</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Sentiment</label>
              <select value={form.sentiment} onChange={e => setForm(f => ({ ...f, sentiment: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="positive">😊 Positive</option>
                <option value="neutral">😐 Neutral</option>
                <option value="negative">😟 Negative</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Q2 Business Review Call" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Summary</label>
            <textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
              rows={4} placeholder="What was discussed? Key outcomes, concerns, next steps..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {form.type === 'meeting' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Duration (minutes)</label>
              <input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 45" />
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end p-5 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl transition-all shadow-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Log Interaction
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Agent Progress Banner ────────────────────────────────────────────────────
interface AgentProgressProps {
  customerId: string
  onComplete: () => void
}

const AGENT_STEPS = ['memory', 'interaction', 'usage', 'sentiment', 'knowledge', 'recommendation']

function AgentProgressBanner({ customerId, onComplete }: AgentProgressProps) {
  const [currentAgent, setCurrentAgent] = useState('planner')
  const [stepIdx, setStepIdx] = useState(0)
  const [done, setDone] = useState(false)
  const pollRef = useRef<number | null>(null)
  const completedRef = useRef(false)

  const poll = useCallback(async () => {
    try {
      const { data } = await agentsApi.runs({ customer_id: customerId, page_size: 1 })
      const latest = data.items?.[0]
      if (!latest) return
      if (latest.status === 'completed' && !completedRef.current) {
        completedRef.current = true
        setDone(true)
        setTimeout(() => { onComplete() }, 1200)
        if (pollRef.current) clearInterval(pollRef.current)
        return
      }
      if (latest.status === 'failed') {
        setDone(true)
        if (pollRef.current) clearInterval(pollRef.current)
        return
      }
      // Advance visual step
      setStepIdx(i => {
        const next = Math.min(i + 1, AGENT_STEPS.length - 1)
        setCurrentAgent(AGENT_STEPS[next])
        return next
      })
    } catch { /* ignore */ }
  }, [customerId, onComplete])

  useEffect(() => {
    pollRef.current = window.setInterval(poll, 2500)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [poll])

  if (done) return null

  const progress = Math.round((stepIdx / (AGENT_STEPS.length - 1)) * 100)

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-sm font-medium text-blue-800">
              AI Analysis Running — {currentAgent.charAt(0).toUpperCase() + currentAgent.slice(1)} Agent
            </span>
            <span className="text-xs text-blue-600">{progress}%</span>
          </div>
          <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
            <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }}
              className="h-full bg-blue-500 rounded-full" />
          </div>
          <div className="flex gap-1.5 mt-2">
            {AGENT_STEPS.map((s, i) => (
              <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                i < stepIdx ? 'bg-blue-200 text-blue-700' :
                i === stepIdx ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-400'
              }`}>{s}</span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const toast = useToast()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [timeline, setTimeline] = useState<Timeline[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [showAgentProgress, setShowAgentProgress] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [showLogModal, setShowLogModal] = useState(false)
  const [approving, setApproving] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showAssignCSM, setShowAssignCSM] = useState(false)
  const [csmList, setCsmList] = useState<any[]>([])
  const [assigningCSM, setAssigningCSM] = useState(false)

  useEffect(() => { if (id) load() }, [id])

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [c, r, t] = await Promise.all([
        customersApi.get(id), recommendationsApi.byCustomer(id), timelineApi.byCustomer(id)
      ])
      setCustomer(c.data); setRecs(r.data); setTimeline(t.data)
    } catch (e) {
      toast.error('Failed to load customer data')
    } finally { setLoading(false) }
  }

  const loadCSMList = async () => {
    try { const { data } = await csmApi.list(); setCsmList(data) } catch {}
  }

  const handleAssignCSM = async (csm_id: string | null) => {
    if (!id) return
    setAssigningCSM(true)
    try {
      await csmApi.assign(id, csm_id)
      await load()
      toast.success(csm_id ? 'CSM assigned' : 'CSM unassigned', 'Account assignment updated.')
      setShowAssignCSM(false)
    } catch {
      toast.error('Assignment failed', 'Please try again.')
    } finally { setAssigningCSM(false) }
  }

  const triggerAnalysis = async () => {
    if (!id) return
    setTriggering(true)
    try {
      await recommendationsApi.trigger(id)
      toast.success('AI Analysis started', 'Agents are running — watch progress below.')
      setShowAgentProgress(true)
    } catch (e) {
      toast.error('Failed to trigger analysis', 'Please check your connection and try again.')
    } finally { setTriggering(false) }
  }

  const handleApprove = async (recId: string, status: 'approved' | 'rejected') => {
    setApproving(recId)
    try {
      await recommendationsApi.approve(recId, { status })
      setRecs(r => r.map(x => x.id === recId ? { ...x, status } : x))
      toast.success(
        status === 'approved' ? 'Recommendation approved' : 'Recommendation rejected',
        'The AI will factor this into future analysis.'
      )
    } catch (e) {
      toast.error('Action failed', 'Please try again.')
    } finally { setApproving(null) }
  }

  const usageData = (customer as any)?.usage_metrics?.slice(0, 14).reverse().map((u: any, i: number) => ({
    day: `D${i + 1}`, sessions: u.sessions, adoption: Math.round(u.adoption_score * 100)
  })) || []

  if (loading) return (
    <div>
      <Header title="Loading..." />
      <div className="p-6 space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-white rounded-xl border border-slate-100 animate-pulse" />)}
      </div>
    </div>
  )

  if (!customer) return <div className="p-6 text-center text-slate-400">Customer not found</div>

  return (
    <div>
      <Header title={customer.name} subtitle={customer.company?.name} />
      <div className="p-6 space-y-5">
        {/* Back + Actions */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button onClick={() => nav(-1)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex gap-2">
            <button onClick={() => { setShowAssignCSM(true); loadCSMList() }}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-xl transition-all shadow-sm">
              <User className="w-4 h-4" /> {customer?.csm ? customer.csm.full_name : 'Assign CSM'}
            </button>
            <button onClick={() => nav(`/customers/${id}/360`)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all shadow-sm">
              <Brain className="w-4 h-4" /> View 360°
            </button>
            <button onClick={() => setShowLogModal(true)}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-xl transition-all shadow-sm">
              <Plus className="w-4 h-4" /> Log Interaction
            </button>
            <button onClick={triggerAnalysis} disabled={triggering || showAgentProgress}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all shadow-sm shadow-blue-200">
              {triggering
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><Play className="w-4 h-4" /> Run AI Analysis</>}
            </button>
          </div>
        </div>

        {/* Agent Progress Banner */}
        <AnimatePresence>
          {showAgentProgress && (
            <AgentProgressBanner
              customerId={id!}
              onComplete={() => { setShowAgentProgress(false); load(); toast.success('Analysis complete', 'Recommendations updated.') }}
            />
          )}
        </AnimatePresence>

        {/* Hero Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex flex-wrap gap-6 items-start">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                style={{ background: customer.health_status === 'healthy' ? '#16a34a' : customer.health_status === 'at_risk' ? '#d97706' : '#dc2626' }}>
                {customer.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{customer.name}</h2>
                <p className="text-slate-500">{customer.title} @ {customer.company?.name}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <HealthBadge status={customer.health_status} />
                  {customer.tags?.map(t => <span key={t} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">{t}</span>)}
                </div>
              </div>
            </div>
            <div className="flex gap-8 ml-auto flex-wrap">
              {[
                { label: 'Health Score', node: <ScoreRing score={customer.health_score} size={56} /> },
                { label: 'Churn Risk', node: <div className="text-2xl font-bold" style={{ color: customer.churn_probability > 0.6 ? '#ef4444' : customer.churn_probability > 0.3 ? '#f59e0b' : '#22c55e' }}>{Math.round(customer.churn_probability * 100)}%</div> },
                { label: 'MRR', node: <div className="text-2xl font-bold text-slate-900">{formatCurrency(customer.mrr)}</div> },
                { label: 'ARR', node: <div className="text-2xl font-bold text-slate-900">{formatCurrency(customer.arr)}</div> },
                { label: 'Renewal', node: <div className="text-base font-semibold text-slate-700">{formatDate(customer.renewal_date)}</div> },
              ].map(({ label, node }) => (
                <div key={label} className="text-center">
                  <div className="flex justify-center">{node}</div>
                  <p className="text-xs text-slate-400 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-100 rounded-xl p-1 w-fit shadow-sm">
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === t ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'recommendations' ? `AI Recs (${recs.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <h3 className="font-semibold text-slate-900 mb-4">Product Usage (Last 14 Days)</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={usageData}>
                    <defs>
                      <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} /><stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                    <Area type="monotone" dataKey="sessions" stroke="#2563EB" fill="url(#gS)" strokeWidth={2} name="Sessions" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {/* Latest Recs preview */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <h3 className="font-semibold text-slate-900 mb-3">Latest AI Recommendations</h3>
                <div className="space-y-3">
                  {recs.slice(0, 3).map(r => (
                    <div key={r.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                      <Brain className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{r.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{r.description?.slice(0, 100)}...</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <PriorityBadge priority={r.priority} />
                        <span className="text-xs text-slate-400">{Math.round(r.confidence_score * 100)}% conf.</span>
                      </div>
                    </div>
                  ))}
                  {recs.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No recommendations yet. Run AI Analysis.</p>}
                </div>
              </div>
            </div>
            {/* Sidebar */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-3">
                <h3 className="font-semibold text-slate-900">Account Details</h3>
                {[
                  ['Email', customer.email], ['Plan', customer.plan || '—'],
                  ['Seats', customer.seats], ['Industry', customer.company?.industry || '—'],
                  ['Country', customer.company?.country || '—'],
                  ['Last Activity', timeAgo(customer.last_activity)],
                ].map(([l, v]) => (
                  <div key={String(l)} className="flex justify-between text-sm">
                    <span className="text-slate-400">{l}</span>
                    <span className="font-medium text-slate-700 capitalize">{String(v)}</span>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <h3 className="font-semibold text-slate-900 mb-3">AI Signals</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Sentiment', value: customer.sentiment, color: customer.sentiment === 'positive' ? 'text-green-600' : customer.sentiment === 'negative' ? 'text-red-600' : 'text-slate-500' },
                    { label: 'Health Status', value: customer.health_status.replace('_', ' '), color: customer.health_status === 'healthy' ? 'text-green-600' : customer.health_status === 'at_risk' ? 'text-amber-600' : 'text-red-600' },
                    { label: 'Sentiment Score', value: `${Math.round(customer.sentiment_score * 100)}%`, color: 'text-slate-700' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-slate-400">{label}</span>
                      <span className={`font-medium capitalize ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Recommendations Tab (with inline Approve/Reject) ── */}
        {activeTab === 'recommendations' && (
          <div className="space-y-3">
            {recs.map(r => (
              <motion.div key={r.id} layout initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${r.priority === 'critical' ? 'bg-red-50' : r.priority === 'high' ? 'bg-orange-50' : r.priority === 'medium' ? 'bg-blue-50' : 'bg-slate-50'}`}>
                      <Brain className={`w-5 h-5 ${r.priority === 'critical' ? 'text-red-500' : r.priority === 'high' ? 'text-orange-500' : r.priority === 'medium' ? 'text-blue-500' : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-slate-900">{r.title}</h4>
                        <PriorityBadge priority={r.priority} />
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'approved' ? 'bg-green-50 text-green-700' : r.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{r.status}</span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{r.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className="text-lg font-bold text-slate-900">{Math.round(r.confidence_score * 100)}%</div>
                      <div className="text-xs text-slate-400">confidence</div>
                      <div className="text-sm font-semibold text-red-500">{Math.round(r.risk_score * 100)}%</div>
                      <div className="text-xs text-slate-400">risk</div>
                    </div>
                    <button onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                      className="text-slate-400 hover:text-slate-600 flex-shrink-0 self-start">
                      {expanded === r.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {expanded === r.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} className="border-t border-slate-50 overflow-hidden">
                      <div className="p-5 space-y-4">
                        {r.actions?.length > 0 && (
                          <div>
                            <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Recommended Actions</h5>
                            <div className="space-y-1.5">
                              {r.actions.map((a, i) => (
                                <div key={i} className="flex items-center gap-2.5 text-sm text-slate-700">
                                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>{a}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {r.evidence?.length > 0 && (
                          <div>
                            <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Evidence Chain</h5>
                            <div className="space-y-2">
                              {r.evidence.map((e: string, i: number) => (
                                <div key={i} className="flex items-start gap-3 p-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                                  <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
                                  <span className="text-xs text-amber-800 leading-relaxed">{e}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {(r as any).counterfactual && (
                          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700">
                            <span className="font-semibold">⚠️ If ignored: </span>{(r as any).counterfactual}
                          </div>
                        )}
                        {r.reasoning && (
                          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 space-y-1">
                            <p className="font-semibold text-blue-800">🧠 AI Reasoning Chain</p>
                            {(r as any).reasoning_chain?.length > 0
                              ? (r as any).reasoning_chain.map((step: string, i: number) => (
                                  <p key={i} className="pl-3 border-l-2 border-blue-200">{step}</p>
                                ))
                              : <p>{r.reasoning}</p>
                            }
                          </div>
                        )}
                        {(r as any).success_criteria && (
                          <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-700">
                            <span className="font-semibold">✅ Success criteria: </span>{(r as any).success_criteria}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Inline approve / reject */}
                {r.status === 'pending' && (
                  <div className="px-5 pb-4 flex gap-2 justify-end border-t border-slate-50 pt-3">
                    <button onClick={() => handleApprove(r.id, 'rejected')} disabled={approving === r.id}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl transition-all disabled:opacity-50">
                      {approving === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-4 h-4" />} Reject
                    </button>
                    <button onClick={() => handleApprove(r.id, 'approved')} disabled={approving === r.id}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl transition-all disabled:opacity-50 shadow-sm shadow-green-200">
                      {approving === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Approve
                    </button>
                  </div>
                )}
                {r.status !== 'pending' && (
                  <div className="px-5 pb-3 text-xs text-slate-400 border-t border-slate-50 pt-2">
                    {r.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                    {r.approved_at && ` · ${timeAgo(r.approved_at)}`}
                    {r.feedback_note && ` · "${r.feedback_note}"`}
                  </div>
                )}
              </motion.div>
            ))}
            {recs.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-16 text-center">
                <Brain className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No recommendations yet</p>
                <button onClick={triggerAnalysis} className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">Run AI Analysis →</button>
              </div>
            )}
          </div>
        )}

        {/* ── Timeline Tab ── */}
        {activeTab === 'timeline' && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-900 mb-5">Activity Timeline</h3>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-100" />
              <div className="space-y-4">
                {timeline.map((t, i) => (
                  <motion.div key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex gap-4 pl-10 relative">
                    <div className="absolute left-0 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center flex-shrink-0"
                      style={{ background: t.event_type.includes('risk') || t.event_type.includes('critical') ? '#fee2e2' : t.event_type.includes('approved') ? '#dcfce7' : '#eff6ff' }}>
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium text-slate-900">{t.title}</p>
                      {t.description && <p className="text-xs text-slate-400 mt-0.5">{t.description}</p>}
                      <p className="text-xs text-slate-300 mt-1">{timeAgo(t.occurred_at)}</p>
                    </div>
                  </motion.div>
                ))}
                {timeline.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No timeline events yet</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── Interactions Tab ── */}
        {activeTab === 'interactions' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => nav(`/customers/${id}/360`)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all shadow-sm">
              <Brain className="w-4 h-4" /> View 360°
            </button>
            <button onClick={() => setShowLogModal(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all shadow-sm shadow-blue-200">
                <Plus className="w-4 h-4" /> Log Interaction
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  <h3 className="font-semibold text-slate-900">Meetings</h3>
                </div>
                <div className="space-y-3">
                  {(customer as any).meetings?.map((m: any) => (
                    <div key={m.id} className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-sm font-medium text-slate-900">{m.title}</p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{m.summary}</p>
                      <div className="flex gap-2 mt-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${m.sentiment === 'positive' ? 'bg-green-50 text-green-700' : m.sentiment === 'negative' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'}`}>{m.sentiment}</span>
                        <span className="text-xs text-slate-400">{formatDate(m.meeting_date)}{m.duration_minutes ? ` · ${m.duration_minutes}min` : ''}</span>
                      </div>
                    </div>
                  )) || <p className="text-sm text-slate-400 py-4 text-center">No meetings recorded</p>}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Ticket className="w-4 h-4 text-orange-500" />
                  <h3 className="font-semibold text-slate-900">Support Tickets</h3>
                </div>
                <div className="space-y-3">
                  {(customer as any).support_tickets?.map((t: any) => (
                    <div key={t.id} className="p-3 bg-slate-50 rounded-xl">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium text-slate-900">{t.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'open' ? 'bg-red-50 text-red-600' : t.status === 'resolved' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>{t.status}</span>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${t.priority === 'high' ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>{t.priority}</span>
                        <span className="text-xs text-slate-400">{formatDate(t.opened_at)}</span>
                      </div>
                    </div>
                  )) || <p className="text-sm text-slate-400 py-4 text-center">No tickets</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Usage Tab ── */}
        {activeTab === 'usage' && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Usage Analytics</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={usageData}>
                <defs>
                  <linearGradient id="gUs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} /><stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gAd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2} /><stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="sessions" stroke="#2563EB" fill="url(#gUs)" strokeWidth={2} name="Sessions" />
                <Area type="monotone" dataKey="adoption" stroke="#22C55E" fill="url(#gAd)" strokeWidth={2} name="Adoption %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Log Interaction Modal */}
      <AnimatePresence>
        {showLogModal && (
          <LogInteractionModal
            customerId={id!}
            onClose={() => setShowLogModal(false)}
            onSaved={load}
          />
        )}
      </AnimatePresence>

      {/* FIX P2 — Assign CSM Modal */}
      <AnimatePresence>
        {showAssignCSM && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900 text-lg">Assign CSM</h3>
                <button onClick={() => setShowAssignCSM(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-2">
                <p className="text-xs text-slate-400 mb-3">Current: <span className="font-medium text-slate-600">{customer?.csm?.full_name ?? 'Unassigned'}</span></p>
                {csmList.map(u => (
                  <button key={u.id} onClick={() => handleAssignCSM(u.id)} disabled={assigningCSM}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm transition-all border
                      ${customer?.csm?.id === u.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                        : 'border-slate-100 hover:bg-slate-50 text-slate-700'}`}>
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                      {u.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{u.full_name}</p>
                      <p className="text-xs text-slate-400 capitalize">{u.role}</p>
                    </div>
                    {assigningCSM && <Loader2 className="w-4 h-4 animate-spin text-slate-400 flex-shrink-0" />}
                  </button>
                ))}
                {customer?.csm && (
                  <button onClick={() => handleAssignCSM(null)} disabled={assigningCSM}
                    className="w-full mt-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-all border border-red-100">
                    Remove Assignment
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
