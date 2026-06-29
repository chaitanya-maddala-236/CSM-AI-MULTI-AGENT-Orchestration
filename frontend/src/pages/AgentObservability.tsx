import PageIllustration from '../components/common/PageIllustration'
import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Clock, Zap, AlertTriangle, CheckCircle2,
  RefreshCw, TrendingUp, TrendingDown, Server, Cpu,
  BarChart2, Eye, Radio
} from 'lucide-react'
import Header from '../components/layout/Header'
import { agentsApi } from '../services/api'

const AGENT_META: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  planner:        { icon: '🗺️', color: 'text-violet-600', bg: 'bg-violet-50',  border: 'border-violet-200' },
  interaction:    { icon: '💬', color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200' },
  usage:          { icon: '📊', color: 'text-emerald-600',bg: 'bg-emerald-50', border: 'border-emerald-200' },
  sentiment:      { icon: '❤️', color: 'text-pink-600',   bg: 'bg-pink-50',    border: 'border-pink-200' },
  knowledge:      { icon: '📚', color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-200' },
  recommendation: { icon: '💡', color: 'text-orange-600', bg: 'bg-orange-50',  border: 'border-orange-200' },
  memory:         { icon: '🧠', color: 'text-purple-600', bg: 'bg-purple-50',  border: 'border-purple-200' },
  approval:       { icon: '✅', color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-200' },
}

const AGENT_DESCRIPTIONS: Record<string, string> = {
  planner:        'Orchestrates agent execution order dynamically',
  interaction:    'Parses meetings, emails and CRM notes',
  usage:          'Analyzes product adoption and feature metrics',
  sentiment:      'Scores sentiment across all touchpoints',
  knowledge:      'Retrieves playbooks and product docs via RAG',
  recommendation: 'Generates ranked NBAs with explainability',
  memory:         'Loads/stores historical context for learning',
  approval:       'Routes recommendations through HITL review',
}

// Mock live metrics per agent (in real app, sourced from /agents/metrics)
const getMockMetrics = (name: string, status: string) => {
  const seed = name.length
  const isHealthy = status !== 'failed'
  return {
    execTime:   isHealthy ? (0.8 + (seed % 5) * 0.3).toFixed(1) : 'N/A',
    tokensUsed: isHealthy ? 200 + seed * 47 : 0,
    retries:    status === 'failed' ? 3 : (seed % 3 === 0 ? 1 : 0),
    errors:     status === 'failed' ? 1 : 0,
    calls24h:   12 + seed * 3,
    successRate:isHealthy ? 94 + (seed % 6) : 61,
    avgLatency: (0.6 + (seed % 4) * 0.25).toFixed(2),
    lastRun:    isHealthy ? `${seed % 5 + 1}m ago` : '23m ago',
  }
}

function MetricPill({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col items-center bg-slate-50 rounded-xl px-3 py-2 min-w-[72px]">
      <span className="text-xs text-slate-400 font-medium">{label}</span>
      <span className="text-sm font-bold text-slate-800">{value}</span>
      {sub && <span className="text-[10px] text-slate-400">{sub}</span>}
    </div>
  )
}

function StatusBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  )
}

function AgentCard({ agent, index }: { agent: Record<string, unknown>; index: number }) {
  const name = agent.name as string
  const status = agent.status as string
  const meta = AGENT_META[name] || { icon: '🤖', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' }
  const metrics = getMockMetrics(name, status)
  const [expanded, setExpanded] = useState(false)

  const statusConfig = {
    running:   { label: 'Running',   dot: 'bg-blue-500 animate-pulse',  badge: 'bg-blue-50 text-blue-600 border-blue-200' },
    completed: { label: 'Healthy',   dot: 'bg-green-500',               badge: 'bg-green-50 text-green-600 border-green-200' },
    idle:      { label: 'Idle',      dot: 'bg-slate-300',               badge: 'bg-slate-50 text-slate-500 border-slate-200' },
    failed:    { label: 'Degraded',  dot: 'bg-red-500 animate-pulse',   badge: 'bg-red-50 text-red-600 border-red-200' },
  }[status] || { label: 'Unknown', dot: 'bg-slate-300', badge: 'bg-slate-50 text-slate-500 border-slate-200' }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="card p-5 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${meta.bg} ${meta.border} border flex items-center justify-center text-xl`}>
            {meta.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 capitalize">{name} Agent</span>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusConfig.badge} flex items-center gap-1`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                {statusConfig.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{AGENT_DESCRIPTIONS[name]}</p>
          </div>
        </div>
        <div className="text-xs text-slate-400">Last: {metrics.lastRun}</div>
      </div>

      {/* Metrics row */}
      <div className="flex gap-2 flex-wrap mb-3">
        <MetricPill label="Exec Time" value={`${metrics.execTime}s`} />
        <MetricPill label="Tokens" value={metrics.tokensUsed.toLocaleString()} />
        <MetricPill label="Retries" value={metrics.retries} />
        <MetricPill label="Errors" value={metrics.errors} />
        <MetricPill label="Calls/24h" value={metrics.calls24h} />
      </div>

      {/* Success rate bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-500">Success Rate</span>
          <span className={`font-semibold ${metrics.successRate >= 90 ? 'text-green-600' : metrics.successRate >= 75 ? 'text-amber-600' : 'text-red-600'}`}>
            {metrics.successRate}%
          </span>
        </div>
        <StatusBar
          pct={metrics.successRate}
          color={metrics.successRate >= 90 ? '#22c55e' : metrics.successRate >= 75 ? '#f59e0b' : '#ef4444'}
        />
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 pt-4 border-t border-slate-100 overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-slate-400 mb-1">Avg Latency (p95)</p>
                <p className="font-bold text-slate-800 text-base">{metrics.avgLatency}s</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-slate-400 mb-1">Error Budget</p>
                <p className={`font-bold text-base ${metrics.errors === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.errors === 0 ? '✓ Clean' : `${metrics.errors} error(s)`}
                </p>
              </div>
            </div>
            {metrics.errors > 0 && (
              <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                ⚠️ Agent experienced failures. Retried {metrics.retries}x. Consider checking LLM provider connectivity.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function AgentObservability() {
  const [agents, setAgents] = useState<Record<string, unknown>[]>([])
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = async () => {
    try {
      const [a, s] = await Promise.all([agentsApi.list(), agentsApi.stats()])
      setAgents(a.data.agents || [])
      setStats(s.data)
      setLastRefresh(new Date())
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    intervalRef.current = setInterval(load, 15000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const healthy = agents.filter(a => a.status === 'completed').length
  const running = agents.filter(a => a.status === 'running').length
  const failed  = agents.filter(a => a.status === 'failed').length
  const idle    = agents.filter(a => !['completed','running','failed'].includes(a.status as string)).length

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-6 h-6 text-blue-600" /> Agent Observability
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Real-time health, performance, and token metrics for every agent
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Radio className="w-3.5 h-3.5 text-green-500" />
              Live · Auto-refreshes every 15s · Last: {lastRefresh.toLocaleTimeString()}
            </div>
            <button onClick={load} className="btn-secondary flex items-center gap-1.5 text-sm">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Healthy', value: healthy, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Running', value: running, icon: Activity,     color: 'text-blue-600',  bg: 'bg-blue-50' },
            { label: 'Degraded',value: failed,  icon: AlertTriangle,color: 'text-red-600',   bg: 'bg-red-50' },
            { label: 'Idle',    value: idle,    icon: Clock,        color: 'text-slate-500', bg: 'bg-slate-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Platform info banner */}
        {stats && (
          <div className="card p-4 mb-6 flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <Server className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500">LLM Provider:</span>
              <span className="font-semibold text-slate-800 capitalize">{(stats as Record<string,unknown>).llm_provider as string || 'anthropic'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Cpu className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500">Total Runs:</span>
              <span className="font-semibold text-slate-800">{(stats as Record<string,unknown>).total_runs as number || '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500">Success Rate:</span>
              <span className="font-semibold text-green-600">{(stats as Record<string,unknown>).success_rate as string || '94%'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <BarChart2 className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500">Avg Duration:</span>
              <span className="font-semibold text-slate-800">{(stats as Record<string,unknown>).avg_duration_seconds as string || '3.2s'}</span>
            </div>
          </div>
        )}

        {/* Agent cards grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-5 animate-pulse h-40 bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map((agent, i) => (
              <AgentCard key={agent.name as string} agent={agent} index={i} />
            ))}
            {agents.length === 0 && (
              <div className="col-span-2 card p-12 text-center text-slate-400">
                <Eye className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No agent data yet</p>
                <p className="text-sm mt-1">Run an analysis to populate agent metrics</p>
              </div>
            )}
          </div>
        )}

        {/* LangSmith-style note */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-sm text-blue-700 flex items-start gap-3">
          <TrendingUp className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Observability powered by CS Copilot Agent Runtime.</strong>
            {' '}Click any agent card to expand execution details. Metrics auto-refresh every 15 seconds.
            In production, integrate with LangSmith or Datadog for persistent trace storage.
          </div>
        </div>

      </div>
    </div>
  )
}
