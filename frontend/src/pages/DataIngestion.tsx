// @ts-nocheck
import PageIllustration from '../components/common/PageIllustration'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileText, Mail, MessageSquare, Database, Sparkles,
  ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertTriangle,
  RefreshCw, Trash2, Search, X, ArrowRight, Brain, Zap,
  Eye, TrendingUp, TrendingDown, Minus, Clock, Users,
  BarChart3, Activity, Target, Shield, Lightbulb, Star,
  ChevronRight, Copy, CheckCheck, WifiOff
} from 'lucide-react'
import Header from '../components/layout/Header'
import { useToast } from '../components/common/Toast'
import { ingestionApi, customersApi } from '../services/api'
import { timeAgo, sentimentColor } from '../utils/helpers'
import type { IngestedInteraction, Customer } from '../types'

// ─── Source type config ──────────────────────────────────────────────────────
const SOURCE_TYPES = [
  { value: 'meeting_notes', label: 'Meeting Notes',  icon: FileText,      color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',   hint: 'QBRs, check-ins, onboarding calls, executive meetings' },
  { value: 'transcript',    label: 'Call Transcript', icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', hint: 'Verbatim Gong / Chorus / Zoom recordings' },
  { value: 'email',         label: 'Email Thread',   icon: Mail,           color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200',  hint: 'Customer escalations, renewal threads, support replies' },
  { value: 'crm_update',   label: 'CRM Update',     icon: Database,       color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', hint: 'Salesforce / HubSpot opportunity or contact updates' },
  { value: 'note',          label: 'CSM Note',       icon: FileText,       color: 'text-slate-600',  bg: 'bg-slate-50',  border: 'border-slate-200',  hint: 'Free-form context, observations, internal handover notes' },
  { value: 'other',         label: 'Other',          icon: Upload,         color: 'text-pink-600',   bg: 'bg-pink-50',   border: 'border-pink-200',   hint: 'Slack threads, NPS comments, support tickets, anything else' },
]

const STATUS_STYLES: Record<string, string> = {
  new:        'bg-slate-50 text-slate-500 border-slate-200',
  processing: 'bg-blue-50 text-blue-600 border-blue-200',
  processed:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed:     'bg-red-50 text-red-700 border-red-200',
}

// ─── Sample pastes for demo ("Try an example" button) ───────────────────────
const EXAMPLES = [
  {
    type: 'meeting_notes',
    title: 'Q3 Business Review — Acme Corp',
    content: `Meeting with Sarah Chen (VP Engineering) and David Kim (CTO) at Acme Corp.

DISCUSSED:
- Current usage at 78% of licensed capacity across 3 teams
- Integration with their internal CI/CD pipeline hit a blocker — SSO not syncing properly since the 2.4 update
- David mentioned they are evaluating a competitor (unnamed) for the data pipeline use case
- Sarah is happy with support responsiveness but wants proactive outreach, not reactive

ACTION ITEMS:
- Fix SSO sync issue by EOW — Raj to own
- Send competitive comparison doc for data pipeline by Friday
- Schedule exec alignment call with their CEO next month

RISKS: David's evaluation comment is concerning — need to understand timeline. Budget review happening in Q4.`
  },
  {
    type: 'email',
    title: 'RE: Contract Renewal — Beta Dynamics',
    content: `From: James Wilson <jwilson@betadynamics.com>
To: csm@company.com
Subject: RE: Contract Renewal — Beta Dynamics

Hi team,

Thanks for sending over the renewal paperwork. A few things I need to flag before we can move forward:

1. The price increase of 18% is more than we budgeted for FY24. We were expecting roughly 5-8% based on last year's conversation. This is going to be a hard conversation with our CFO.

2. We've had 3 production incidents in the last quarter that impacted our core reporting workflows. While your team resolved them quickly, the root cause analysis still hasn't been shared with us.

3. We're actually planning to add 2 new teams (Analytics and Data Science — ~25 users) in Q1 if we can get the pricing sorted.

Can we get on a call this week to work through the commercial terms?

Best,
James`
  },
  {
    type: 'transcript',
    title: 'Onboarding Call Week 3 — TechStart Inc',
    content: `[00:00] CSM: Hi everyone, thanks for joining week 3 of onboarding. How's the rollout going?
[00:15] Customer: Honestly, it's been tougher than expected. The API documentation for the webhooks section is really hard to follow.
[00:45] CSM: I'm sorry to hear that. Can you tell me more about where you got stuck?
[01:10] Customer: We spent about two days trying to get the real-time events pipeline working. Our engineer finally figured it out but it shouldn't have taken that long.
[02:00] CSM: That's valid feedback and I'll flag it to the product team. Are you unblocked now?
[02:20] Customer: Yes, we're unblocked. Actually the product itself is great once you get past the setup. Our team loves the dashboard views.
[03:00] CSM: Glad to hear that! You mentioned last week you were targeting full rollout by end of month?
[03:15] Customer: Yes, still on track. We're planning to roll out to the remaining 40 users next week.
[04:00] CSM: Excellent. Any other blockers I should know about?
[04:10] Customer: No, just the documentation thing. Oh — and can you add a feature for bulk CSV export? Multiple people have asked for it.`
  }
]

// ─── Signal confidence bar ────────────────────────────────────────────────────
function ConfidenceBar({ score, label }: { score: number; label: string }) {
  const pct = Math.round((score || 0) * 100)
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-16 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="text-xs font-mono text-slate-400 w-8 text-right">{pct}%</span>
    </div>
  )
}

// ─── Sentiment pill ────────────────────────────────────────────────────────────
function SentimentPill({ sentiment, score }: { sentiment: string; score?: number }) {
  const cfg = {
    positive: { icon: TrendingUp,   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    neutral:  { icon: Minus,        cls: 'bg-slate-50 text-slate-600 border-slate-200' },
    negative: { icon: TrendingDown, cls: 'bg-red-50 text-red-700 border-red-200' },
  }[sentiment] || { icon: Minus, cls: 'bg-slate-50 text-slate-600 border-slate-200' }
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {sentiment}
      {score != null && <span className="opacity-60">· {Math.round(score * 100)}%</span>}
    </span>
  )
}

// ─── Live character counter + word counter ────────────────────────────────────
function ContentStats({ text }: { text: string }) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const chars = text.length
  const quality = chars < 50 ? 0 : chars < 200 ? 1 : chars < 500 ? 2 : 3
  const labels = ['Too short', 'Minimal', 'Good', 'Excellent']
  const colors = ['text-red-400', 'text-amber-400', 'text-blue-500', 'text-emerald-500']
  return (
    <div className="flex items-center gap-3 text-xs text-slate-400">
      <span>{words} words</span>
      <span>{chars} chars</span>
      <span className={`font-medium ${colors[quality]}`}>{labels[quality]} signal quality</span>
    </div>
  )
}

// ─── Customer Picker ──────────────────────────────────────────────────────────
function CustomerPicker({ value, onChange }: { value: Customer | null; onChange: (c: Customer | null) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await customersApi.list({ search: query || undefined, page_size: 8 })
        setResults(data.items)
      } catch { }
      finally { setSearching(false) }
    }, 250)
    return () => clearTimeout(t)
  }, [query, open])

  return (
    <div className="relative" ref={boxRef}>
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
        Customer <span className="font-normal normal-case text-slate-400">(optional)</span>
      </label>
      {value ? (
        <div className="flex items-center justify-between px-3 py-2 text-sm border border-blue-200 bg-blue-50 rounded-xl">
          <div>
            <span className="font-semibold text-blue-800">{value.name}</span>
            {value.company && <span className="text-blue-400 ml-1.5 text-xs">· {value.company.name}</span>}
          </div>
          <button onClick={() => onChange(null)} className="text-blue-300 hover:text-blue-600 ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {open && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
              {searching ? (
                <div className="p-3 text-xs text-slate-400 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> Searching...
                </div>
              ) : results.length === 0 ? (
                <div className="p-3 text-xs text-slate-400">No customers found.</div>
              ) : results.map(c => (
                <button key={c.id} onClick={() => { onChange(c); setOpen(false); setQuery('') }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 flex items-center justify-between border-b border-slate-50 last:border-0">
                  <span className="font-medium text-slate-700">{c.name}</span>
                  <span className="text-xs text-slate-400">{c.company?.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── AI Preview Panel ─────────────────────────────────────────────────────────
function AiPreviewPanel({ record, onTriggerWorkflow, onRefresh }: {
  record: IngestedInteraction
  onTriggerWorkflow: (id: string) => void
  onRefresh: () => void
}) {
  const isProcessing = record.status === 'new' || record.status === 'processing'
  const isFailed = record.status === 'failed'
  const isDone = record.status === 'processed'

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      className="relative overflow-hidden rounded-2xl border border-indigo-100 shadow-lg"
    >
      {/* Gradient header */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">AI Signal Extraction</p>
            <p className="text-white/60 text-xs">Human-in-the-Loop review</p>
          </div>
        </div>
        {isProcessing && (
          <span className="flex items-center gap-1.5 text-xs text-white/80 bg-white/10 px-2.5 py-1 rounded-full">
            <Loader2 className="w-3 h-3 animate-spin" /> Classifying...
          </span>
        )}
        {isDone && (
          <span className="flex items-center gap-1.5 text-xs text-white/80 bg-white/10 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Analysis complete
          </span>
        )}
      </div>

      <div className="bg-gradient-to-br from-indigo-50/60 to-blue-50/60 p-5">
        {isProcessing && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-indigo-600">
              <Activity className="w-4 h-4 animate-pulse" />
              <span>Running LLM classification — extracting sentiment, topics, risks, opportunities…</span>
            </div>
            {[90, 70, 55].map((w, i) => (
              <div key={i} className="h-3 bg-white/60 rounded-full animate-pulse" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}

        {isFailed && (
          <div className="flex items-start gap-3">
            <WifiOff className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">AI classification unavailable</p>
              <p className="text-xs text-red-500 mt-0.5">
                {record.error
                  ? `Error: ${record.error}`
                  : 'No LLM key configured — set OPENAI_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY in .env'}
              </p>
              <p className="text-xs text-slate-500 mt-1.5">The raw data has been saved. You can reprocess when the key is available.</p>
              <button onClick={onRefresh} className="text-xs text-blue-600 underline mt-1.5 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          </div>
        )}

        {isDone && (
          <div className="space-y-4">
            {/* Summary */}
            {record.ai_summary && (
              <div className="bg-white rounded-xl border border-indigo-100 p-4">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" /> AI Summary
                </p>
                <p className="text-sm text-slate-700 leading-relaxed italic">"{record.ai_summary}"</p>
              </div>
            )}

            {/* Signals grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Sentiment */}
              <div className="bg-white rounded-xl border border-slate-100 p-3.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Sentiment</p>
                <SentimentPill sentiment={record.detected_sentiment || 'neutral'} score={record.detected_sentiment_score} />
                {record.detected_sentiment_score != null && (
                  <div className="mt-2.5">
                    <ConfidenceBar score={record.detected_sentiment_score} label="Confidence" />
                  </div>
                )}
              </div>

              {/* Topics */}
              <div className="bg-white rounded-xl border border-slate-100 p-3.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Key Topics <span className="text-slate-300">({record.detected_topics?.length || 0})</span>
                </p>
                {record.detected_topics?.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {record.detected_topics.slice(0, 6).map((t, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100">{t}</span>
                    ))}
                  </div>
                ) : <p className="text-xs text-slate-300">None detected</p>}
              </div>

              {/* Risk / Opportunity counts */}
              <div className="bg-white rounded-xl border border-slate-100 p-3.5 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Signal Counts</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Risks</span>
                  <span className={`text-sm font-bold ${(record.detected_risks?.length || 0) > 0 ? 'text-red-600' : 'text-slate-300'}`}>
                    {record.detected_risks?.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-600 flex items-center gap-1"><Star className="w-3 h-3" /> Opportunities</span>
                  <span className={`text-sm font-bold ${(record.detected_opportunities?.length || 0) > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                    {record.detected_opportunities?.length || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Risks */}
            {record.detected_risks?.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Risks Detected
                </p>
                <ul className="space-y-1.5">
                  {record.detected_risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-red-700">
                      <span className="text-red-400 mt-0.5 flex-shrink-0">▸</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Opportunities */}
            {record.detected_opportunities?.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" /> Opportunities Detected
                </p>
                <ul className="space-y-1.5">
                  {record.detected_opportunities.map((o, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-emerald-700">
                      <span className="text-emerald-400 mt-0.5 flex-shrink-0">▸</span> {o}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* HITL Action */}
            {record.customer_id && (
              <div className="bg-white border border-indigo-100 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {record.triggered_workflow ? '✅ Full analysis triggered' : 'Ready for full AI analysis'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {record.triggered_workflow
                      ? 'The full multi-agent workflow is running — check Recommendations for new actions.'
                      : 'Review the signals above, then approve to run the full planner → recommendation workflow.'}
                  </p>
                </div>
                {!record.triggered_workflow && (
                  <button
                    onClick={() => onTriggerWorkflow(record.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all whitespace-nowrap shadow-sm shadow-indigo-200"
                  >
                    <Brain className="w-4 h-4" /> Approve & Analyze
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Expanded row detail ──────────────────────────────────────────────────────
function ExpandedRow({ r, onTriggerWorkflow, nav }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(r.raw_content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <tr className="bg-slate-50/70 border-b border-slate-100">
      <td colSpan={7} className="px-5 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Raw content */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Raw Content</p>
              <button onClick={copy} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                {copied ? <CheckCheck className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="text-xs text-slate-600 bg-white border border-slate-100 rounded-xl p-3 max-h-40 overflow-y-auto whitespace-pre-wrap font-sans leading-relaxed">
              {r.raw_content}
            </pre>
          </div>
          {/* AI signals */}
          <div className="lg:col-span-3 space-y-3">
            {r.ai_summary && (
              <div>
                <p className="text-xs font-semibold text-indigo-600 mb-1 uppercase tracking-wide">AI Summary</p>
                <p className="text-xs text-slate-600 italic bg-white border border-slate-100 rounded-xl p-2.5 leading-relaxed">"{r.ai_summary}"</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {r.detected_topics?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Topics</p>
                  <div className="flex flex-wrap gap-1">
                    {r.detected_topics.map((t, i) => <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100">{t}</span>)}
                  </div>
                </div>
              )}
              {r.detected_risks?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-500 mb-1 uppercase tracking-wide">⚠ Risks</p>
                  <ul className="space-y-0.5">
                    {r.detected_risks.map((x, i) => <li key={i} className="text-xs text-red-600">• {x}</li>)}
                  </ul>
                </div>
              )}
              {r.detected_opportunities?.length > 0 && (
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-emerald-600 mb-1 uppercase tracking-wide">✦ Opportunities</p>
                  <ul className="space-y-0.5">
                    {r.detected_opportunities.map((x, i) => <li key={i} className="text-xs text-emerald-700">• {x}</li>)}
                  </ul>
                </div>
              )}
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {r.customer_id && !r.triggered_workflow && r.status === 'processed' && (
                <button onClick={() => onTriggerWorkflow(r.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors">
                  <Brain className="w-3.5 h-3.5" /> Run Full Analysis
                </button>
              )}
              {r.triggered_workflow && (
                <span className="text-xs text-indigo-500 flex items-center gap-1 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                  <CheckCircle2 className="w-3 h-3" /> Full analysis triggered
                </span>
              )}
              {r.customer_id && (
                <button onClick={() => nav(`/customers/${r.customer_id}`)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">
                  <Eye className="w-3 h-3" /> View Customer
                </button>
              )}
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
}

// ─── Stats card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, bg, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-start gap-3.5">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <div className="text-xs text-slate-500 font-medium">{label}</div>
        {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function DataIngestion() {
  const toast = useToast()
  const nav = useNavigate()

  const [form, setForm] = useState({ source_type: 'meeting_notes', title: '', raw_content: '' })
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [previewRecord, setPreviewRecord] = useState<IngestedInteraction | null>(null)
  const [triggerWfLoading, setTriggerWfLoading] = useState(false)

  const [records, setRecords] = useState<IngestedInteraction[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page_size: 50 }
      if (statusFilter !== 'all') params.status = statusFilter
      if (typeFilter !== 'all') params.source_type = typeFilter
      if (search) params.search = search
      const { data } = await ingestionApi.list(params)
      setRecords(data.items)
      setTotal(data.total)
    } catch {
      toast.error('Load error', 'Could not load ingested interactions')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter, search])

  useEffect(() => { load() }, [load])

  // Poll preview until processed
  useEffect(() => {
    if (!previewRecord || previewRecord.status === 'processed' || previewRecord.status === 'failed') {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await ingestionApi.get(previewRecord.id)
        setPreviewRecord(data)
        if (data.status === 'processed' || data.status === 'failed') {
          load()
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch { }
    }, 1500)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [previewRecord, load])

  const submit = async () => {
    if (!form.title.trim() || form.raw_content.trim().length < 5) {
      toast.warning('Add content', 'Fill in a title and at least a few words of content.')
      return
    }
    setSubmitting(true)
    try {
      const { data } = await ingestionApi.create({
        customer_id: selectedCustomer?.id,
        source_type: form.source_type,
        title: form.title,
        raw_content: form.raw_content,
        auto_process: true,
      })
      setPreviewRecord(data)
      setForm({ source_type: form.source_type, title: '', raw_content: '' })
      setSelectedCustomer(null)
      toast.success('Ingested!', 'AI is extracting signals now — watch the preview below.')
      load()
    } catch {
      toast.error('Ingestion failed', 'Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const triggerWorkflow = async (id: string) => {
    setTriggerWfLoading(true)
    try {
      await ingestionApi.triggerWorkflow(id)
      toast.success('Analysis triggered', 'Multi-agent workflow running — check Recommendations.')
      if (previewRecord?.id === id) setPreviewRecord({ ...previewRecord, triggered_workflow: true })
      load()
    } catch (e: any) {
      toast.error('Error', e?.response?.data?.detail || 'Could not trigger analysis.')
    } finally {
      setTriggerWfLoading(false)
    }
  }

  const reprocess = async (id: string) => {
    try {
      await ingestionApi.reprocess(id)
      toast.info('Reprocessing queued')
      load()
    } catch { toast.error('Reprocess failed') }
  }

  const remove = async (id: string) => {
    try {
      await ingestionApi.delete(id)
      setRecords(r => r.filter(x => x.id !== id))
      if (expandedId === id) setExpandedId(null)
      toast.success('Deleted')
    } catch { toast.error('Delete failed') }
  }

  const loadExample = (ex: typeof EXAMPLES[0]) => {
    setForm({ source_type: ex.type, title: ex.title, raw_content: ex.content })
  }

  const sourceIcon = (type: string) => (SOURCE_TYPES.find(s => s.value === type)?.icon || FileText)

  // Derived stats
  const processed = records.filter(r => r.status === 'processed').length
  const withRisks = records.filter(r => (r.detected_risks?.length || 0) > 0).length
  const withOpps = records.filter(r => (r.detected_opportunities?.length || 0) > 0).length
  const triggered = records.filter(r => r.triggered_workflow).length

  const activeCfg = SOURCE_TYPES.find(s => s.value === form.source_type) || SOURCE_TYPES[0]

  return (
    <div>
      <PageIllustration type="agents" opacity={0.5} />
      <Header title="Data Ingestion" subtitle="Feed raw interactions into the AI pipeline — meetings, transcripts, emails, CRM, notes" />

      <div className="p-6 space-y-6">

        {/* ── Stats row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Ingested"   value={total}      icon={Database}     color="text-blue-600"    bg="bg-blue-50"    sub="all time" />
          <StatCard label="AI Processed"     value={processed}  icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" sub={`${total ? Math.round(processed/total*100) : 0}% success rate`} />
          <StatCard label="Risks Flagged"    value={withRisks}  icon={AlertTriangle} color="text-red-600"    bg="bg-red-50"    sub="need attention" />
          <StatCard label="Workflows Triggered" value={triggered} icon={Brain}      color="text-indigo-600"  bg="bg-indigo-50" sub="→ recommendations" />
        </div>

        {/* ── Intake Form ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Form header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                <Upload className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Ingest New Interaction</h3>
                <p className="text-xs text-slate-400">AI extracts sentiment, topics, risks and opportunities automatically</p>
              </div>
            </div>
            {/* Try an example */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">Try:</span>
              {EXAMPLES.map((ex, i) => (
                <button key={i} onClick={() => loadExample(ex)}
                  className="text-xs px-2.5 py-1 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-lg transition-all">
                  {ex.type === 'meeting_notes' ? '📋 Meeting' : ex.type === 'email' ? '✉ Email' : '🎙 Transcript'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Source type picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Source Type</label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {SOURCE_TYPES.map(s => {
                  const Icon = s.icon
                  const active = form.source_type === s.value
                  return (
                    <button key={s.value} onClick={() => setForm(f => ({ ...f, source_type: s.value }))}
                      className={`flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-medium border transition-all ${
                        active
                          ? `${s.bg} ${s.border} ${s.color}`
                          : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                      title={s.hint}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-center leading-tight">{s.label}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${activeCfg.bg.replace('bg-', 'bg-').replace('50', '400')}`} />
                {activeCfg.hint}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomerPicker value={selectedCustomer} onChange={setSelectedCustomer} />
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Title</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={
                    form.source_type === 'meeting_notes' ? 'e.g. Q3 Business Review — Acme Corp' :
                    form.source_type === 'email' ? 'e.g. RE: Renewal Thread — Q4 Pricing' :
                    form.source_type === 'transcript' ? 'e.g. Gong Call — Week 3 Onboarding' :
                    form.source_type === 'crm_update' ? 'e.g. Opportunity Updated: Negotiation' :
                    'Title for this interaction record'
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Raw Content</label>
                <ContentStats text={form.raw_content} />
              </div>
              <textarea
                value={form.raw_content}
                onChange={e => setForm(f => ({ ...f, raw_content: e.target.value }))}
                rows={7}
                placeholder={`Paste the raw text here. No formatting required.\n\nThe AI will automatically:\n• Detect sentiment (positive / neutral / negative)\n• Extract key topics discussed\n• Identify risks and red flags\n• Surface expansion opportunities\n• Write a concise summary`}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono leading-relaxed placeholder:font-sans placeholder:text-slate-300"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                AI extraction runs in &lt;3s · Results stay in the knowledge base · HITL review before workflow triggers
              </div>
              <button
                onClick={submit}
                disabled={submitting || !form.title.trim() || form.raw_content.trim().length < 5}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-all shadow-sm shadow-blue-200"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {submitting ? 'Ingesting…' : 'Ingest & Extract Signals'}
              </button>
            </div>
          </div>
        </div>

        {/* ── HITL AI Preview ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {previewRecord && (
            <AiPreviewPanel
              record={previewRecord}
              onTriggerWorkflow={triggerWorkflow}
              onRefresh={async () => {
                const { data } = await ingestionApi.get(previewRecord.id)
                setPreviewRecord(data)
              }}
            />
          )}
        </AnimatePresence>

        {/* ── Internal Knowledge Data Table ──────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center gap-3">
            <h3 className="font-semibold text-slate-900 text-sm">
              Internal Knowledge Data
              <span className="ml-1.5 text-slate-400 font-normal text-xs">({total} records)</span>
            </h3>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search title..."
                className="pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-40" />
            </div>

            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">All types</option>
              {SOURCE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>

            <div className="flex gap-0.5 bg-slate-50 rounded-lg p-0.5">
              {['all', 'new', 'processing', 'processed', 'failed'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-all ${statusFilter === s ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
                  {s}
                </button>
              ))}
            </div>

            <button onClick={load} className="ml-auto p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-2.5 font-semibold">Type</th>
                  <th className="px-4 py-2.5 font-semibold">Title</th>
                  <th className="px-4 py-2.5 font-semibold">Customer</th>
                  <th className="px-4 py-2.5 font-semibold">Sentiment</th>
                  <th className="px-4 py-2.5 font-semibold">Signals</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Ingested</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-3.5 bg-slate-100 rounded animate-pulse" style={{ width: `${85 - i * 5}%` }} />
                    </td>
                  </tr>
                )) : records.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <Database className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 font-medium">No ingested data yet</p>
                      <p className="text-slate-300 text-sm mt-1">Use the form above or click a sample to get started</p>
                    </td>
                  </tr>
                ) : records.map(r => {
                  const Icon = sourceIcon(r.source_type)
                  const srcCfg = SOURCE_TYPES.find(s => s.value === r.source_type)
                  const isExpanded = expandedId === r.id
                  const risks = r.detected_risks?.length || 0
                  const opps = r.detected_opportunities?.length || 0

                  return (
                    <>
                      <tr key={r.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${srcCfg?.bg || 'bg-slate-50'} ${srcCfg?.color || 'text-slate-500'}`}>
                            <Icon className="w-3 h-3" />
                            <span className="hidden sm:inline">{srcCfg?.label || r.source_type}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : r.id)}
                            className="font-medium text-slate-800 hover:text-blue-600 text-left flex items-center gap-1.5 max-w-[220px]"
                          >
                            <span className="truncate">{r.title}</span>
                            {isExpanded
                              ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              : <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            }
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {r.customer ? (
                            <button onClick={() => nav(`/customers/${r.customer_id}`)}
                              className="text-xs text-blue-600 hover:underline font-medium">{r.customer.name}
                            </button>
                          ) : <span className="text-xs text-slate-300">Unlinked</span>}
                        </td>
                        <td className="px-4 py-3">
                          {r.detected_sentiment
                            ? <SentimentPill sentiment={r.detected_sentiment} />
                            : <span className="text-xs text-slate-300">—</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {risks > 0 && (
                              <span className="text-xs bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded-full">
                                {risks}⚠
                              </span>
                            )}
                            {opps > 0 && (
                              <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                                {opps}✦
                              </span>
                            )}
                            {r.triggered_workflow && (
                              <span className="text-xs bg-indigo-50 text-indigo-500 border border-indigo-100 px-1.5 py-0.5 rounded-full">
                                🧠
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_STYLES[r.status]}`}>
                            {r.status === 'processing' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                            {r.status === 'processed' && <CheckCircle2 className="w-2.5 h-2.5" />}
                            {r.status === 'failed' && <AlertTriangle className="w-2.5 h-2.5" />}
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{timeAgo(r.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {r.status === 'failed' && (
                              <button onClick={() => reprocess(r.id)} title="Reprocess"
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => remove(r.id)} title="Delete"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <ExpandedRow r={r} onTriggerWorkflow={triggerWorkflow} nav={nav} />
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
