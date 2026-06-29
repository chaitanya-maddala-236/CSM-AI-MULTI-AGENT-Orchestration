import { motion } from 'framer-motion'
import { AlertTriangle, TrendingDown, TrendingUp, Calendar, Sparkles, CheckCircle, XCircle, Clock } from 'lucide-react'

interface ExecSummary {
  company_name?: string
  risk_level?: string
  churn_risk_pct?: number
  health_score?: number
  usage_trend?: string
  usage_change_pct?: number
  open_tickets?: number
  days_to_renewal?: number
  sentiment?: string
  recommended_action?: string
  recommended_action_confidence?: number
  key_signals?: string[]
}

function RiskFormula({ riskPct }: { riskPct: number }) {
  // Decompose risk score into visible factors
  const factors = [
    { label: 'Usage Drop',         weight: Math.round(riskPct * 0.34), color: '#ef4444' },
    { label: 'Negative Sentiment', weight: Math.round(riskPct * 0.28), color: '#f97316' },
    { label: 'Support Tickets',    weight: Math.round(riskPct * 0.22), color: '#eab308' },
    { label: 'Renewal Proximity',  weight: Math.round(riskPct * 0.16), color: '#a855f7' },
  ]
  return (
    <div className="mt-3 space-y-2">
      {factors.map(f => (
        <div key={f.label} className="flex items-center gap-2 text-xs">
          <span className="w-36 text-slate-500 truncate">{f.label}</span>
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: f.color }}
              initial={{ width: 0 }}
              animate={{ width: `${(f.weight / riskPct) * 100}%` }}
              transition={{ duration: 0.7, delay: 0.1 }}
            />
          </div>
          <span className="font-semibold w-6 text-right" style={{ color: f.color }}>+{f.weight}</span>
        </div>
      ))}
      <div className="flex justify-between pt-1 border-t border-slate-100 text-xs font-bold text-slate-800">
        <span>Total Risk Score</span>
        <span>{riskPct}</span>
      </div>
    </div>
  )
}

export default function ExecutiveSummaryCard({ summary }: { summary: ExecSummary | null }) {
  if (!summary) return null

  const {
    company_name = 'Customer',
    risk_level = 'medium',
    churn_risk_pct = 0,
    health_score = 0,
    usage_trend = 'stable',
    usage_change_pct = 0,
    open_tickets = 0,
    days_to_renewal,
    sentiment = 'neutral',
    recommended_action = 'Monitor closely',
    recommended_action_confidence = 0,
    key_signals = [],
  } = summary

  const riskColor = {
    high:   { bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-700',   badge: 'bg-red-100 text-red-700' },
    medium: { bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
    low:    { bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
  }[risk_level as string] || { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-700' }

  const [showFormula, setShowFormula] = React.useState(false)

  const sentimentIcon = {
    positive: <CheckCircle className="w-4 h-4 text-green-500" />,
    neutral:  <Clock className="w-4 h-4 text-amber-500" />,
    negative: <XCircle className="w-4 h-4 text-red-500" />,
  }[sentiment as string]

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card border-2 ${riskColor.border} ${riskColor.bg} p-6 mb-6`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{company_name}</h2>
            <p className="text-sm text-slate-500">AI Executive Summary</p>
          </div>
        </div>
        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${riskColor.badge}`}>
          Risk: {risk_level.charAt(0).toUpperCase() + risk_level.slice(1)} ({churn_risk_pct}%)
        </span>
      </div>

      {/* Signal grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white/60 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-400 mb-1">Health Score</p>
          <p className={`text-2xl font-bold ${health_score >= 70 ? 'text-green-600' : health_score >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
            {health_score}
          </p>
        </div>
        <div className="bg-white/60 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-400 mb-1">Usage Trend</p>
          <div className="flex items-center justify-center gap-1">
            {usage_trend === 'declining'
              ? <TrendingDown className="w-5 h-5 text-red-500" />
              : <TrendingUp className="w-5 h-5 text-green-500" />
            }
            <span className={`text-lg font-bold ${usage_change_pct < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {usage_change_pct > 0 ? '+' : ''}{usage_change_pct}%
            </span>
          </div>
        </div>
        <div className="bg-white/60 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-400 mb-1">Sentiment</p>
          <div className="flex items-center justify-center gap-1">
            {sentimentIcon}
            <span className="text-sm font-semibold text-slate-700 capitalize">{sentiment}</span>
          </div>
        </div>
        {days_to_renewal !== undefined && (
          <div className="bg-white/60 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400 mb-1">Renewal In</p>
            <div className="flex items-center justify-center gap-1">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className={`text-lg font-bold ${days_to_renewal <= 30 ? 'text-red-600' : 'text-slate-800'}`}>
                {days_to_renewal}d
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Key signals */}
      {key_signals.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Key Signals</p>
          <div className="flex flex-wrap gap-2">
            {key_signals.map((s, i) => (
              <span key={i} className="text-xs px-2 py-1 bg-white/70 border border-slate-200 rounded-lg text-slate-600">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommended action */}
      <div className="bg-white/80 rounded-xl p-4 border border-slate-200">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium mb-1">Recommended Action</p>
            <p className="font-bold text-slate-900">{recommended_action}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 mb-1">Confidence</p>
            <p className="text-lg font-bold text-blue-600">{recommended_action_confidence}%</p>
          </div>
        </div>
      </div>

      {/* Risk formula toggle */}
      <button
        onClick={() => setShowFormula(!showFormula)}
        className="mt-3 text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        {showFormula ? 'Hide' : 'Show'} risk formula breakdown
      </button>
      {showFormula && <RiskFormula riskPct={churn_risk_pct} />}
    </motion.div>
  )
}

// Need React import for useState
import React from 'react'
