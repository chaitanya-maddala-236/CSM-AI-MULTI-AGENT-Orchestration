import PageIllustration from '../components/common/PageIllustration'
import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, Activity, Clock, Zap, AlertCircle, CheckCircle2,
  RefreshCw, ChevronDown, ChevronUp, Radio, Database,
  GitBranch, Cpu, MemoryStick, Server
} from 'lucide-react'
import Header from '../components/layout/Header'
import { agentsApi } from '../services/api'
import { timeAgo } from '../utils/helpers'
import api from '../services/api'

const AGENT_ICONS: Record<string, string> = {
  planner:'🗺️', interaction:'💬', usage:'📊', sentiment:'❤️',
  knowledge:'📚', recommendation:'💡', memory:'🧠', approval:'✅'
}

const AGENT_DESCRIPTIONS: Record<string, string> = {
  planner: 'Orchestrates agent execution order dynamically',
  interaction: 'Parses meetings, emails and CRM notes',
  usage: 'Analyzes product adoption and feature metrics',
  sentiment: 'Scores sentiment across all touchpoints',
  knowledge: 'Retrieves playbooks and product docs via RAG',
  recommendation: 'Generates ranked NBAs with explainability',
  memory: 'Loads/stores historical context for learning',
  approval: 'Routes recommendations through HITL review',
}

const EVENT_ICONS: Record<string, string> = {
  'meeting.uploaded': '💬',
  'usage.dropped': '📉',
  'ticket.opened': '🎫',
  'ticket.escalated': '🚨',
  'analysis.triggered': '🚀',
  'analysis.completed': '✅',
  'recommendation.ready': '💡',
  'churn.alert': '🔴',
}

const statusColor = (s: string) => ({
  running:   'bg-blue-50 text-blue-600 border-blue-200',
  completed: 'bg-green-50 text-green-600 border-green-200',
  failed:    'bg-red-50 text-red-600 border-red-200',
  idle:      'bg-slate-50 text-slate-500 border-slate-200',
}[s] || 'bg-slate-50 text-slate-500 border-slate-200')

const statusDot = (s: string) => ({
  running:   'bg-blue-500 animate-pulse',
  completed: 'bg-green-500',
  failed:    'bg-red-500',
  idle:      'bg-slate-300',
}[s] || 'bg-slate-300')

export default function Agents() {
  const [agents, setAgents]         = useState<any[]>([])
  const [runs, setRuns]             = useState<any[]>([])
  const [stats, setStats]           = useState<any>(null)
  const [meta, setMeta]             = useState<any>(null)
  const [events, setEvents]         = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [expandedRun, setExpandedRun] = useState<string|null>(null)
  const [activeTab, setActiveTab]   = useState<'agents'|'observability'|'runs'|'events'|'architecture'>('agents')
  const wsRef = useRef<WebSocket|null>(null)
  const [liveNotifs, setLiveNotifs] = useState<string[]>([])

  useEffect(() => { load() }, [])

  // Live WS connection for real-time events
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws/notifications`)
    wsRef.current = ws
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'notification') {
          setLiveNotifs(n => [data.message, ...n].slice(0, 5))
          load() // refresh on new event
        }
      } catch {}
    }
    ws.onopen = () => ws.send('ping')
    return () => ws.close()
  }, [])

  const load = async () => {
    try {
      const [a, r, s, ev] = await Promise.all([
        agentsApi.list(),
        agentsApi.runs({ page_size: 20 }),
        agentsApi.stats(),
        api.get('/events/recent?limit=30'),
      ])
      setAgents(a.data.agents)
      setMeta({ llm_provider: a.data.llm_provider, llm_model: a.data.llm_model })
      setRuns(r.data.items)
      setStats(s.data)
      setEvents(ev.data.events || [])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const TABS = [
    { id: 'agents', label: '🤖 Agents', desc: 'Registry & Status' },
    { id: 'observability', label: '📡 Observability', desc: 'Live Metrics' },
    { id: 'runs', label: '📋 Runs', desc: 'Execution History' },
    { id: 'events', label: '🔔 Event Bus', desc: 'Redis Pub/Sub' },
    { id: 'architecture', label: '🏗️ Architecture', desc: 'System Design' },
  ] as const

  return (
    <div>
      <Header title="AI Agent Monitor" subtitle="Real-time orchestration intelligence & event bus" />
      <div className="p-6 space-y-5">

        {/* Live Notifications */}
        <AnimatePresence>
          {liveNotifs.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
              <Radio className="w-4 h-4 text-blue-500 animate-pulse flex-shrink-0" />
              <p className="text-sm text-blue-700 truncate">{liveNotifs[0]}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LLM Banner */}
        {meta && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold">Active LLM Provider</div>
                <div className="text-blue-100 text-sm capitalize">{meta.llm_provider} — {meta.llm_model}</div>
              </div>
            </div>
            {stats && (
              <div className="flex gap-6 text-center">
                {[
                  ['Total Runs', stats.total_runs],
                  ['Success Rate', `${stats.success_rate}%`],
                  ['Avg Time', `${((stats.avg_execution_ms||0)/1000).toFixed(1)}s`],
                  ['Failed', stats.failed],
                  ['Total Tokens', (stats.total_tokens||0).toLocaleString()],
                ].map(([l, v]) => (
                  <div key={String(l)}>
                    <div className="text-xl font-bold">{v}</div>
                    <div className="text-blue-200 text-xs">{l}</div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={load} className="flex items-center gap-1.5 text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-all">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === t.id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Agents Tab ── */}
        {activeTab === 'agents' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {agents.map((agent: any) => (
              <motion.div key={agent.name} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{AGENT_ICONS[agent.name] || '🤖'}</span>
                  <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border font-medium ${statusColor(agent.status)}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusDot(agent.status)}`} />
                    {agent.status}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-800 capitalize mb-1">{agent.name} Agent</h3>
                <p className="text-xs text-slate-500 mb-3">{AGENT_DESCRIPTIONS[agent.name] || agent.description}</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Runs', value: agent.runs_count || 0 },
                    { label: 'Avg (ms)', value: agent.avg_duration_ms || 0 },
                    { label: 'Errors', value: agent.error_count || 0 },
                    { label: 'Tokens', value: (agent.total_tokens || 0).toLocaleString() },
                  ].map(m => (
                    <div key={m.label} className="bg-slate-50 rounded-lg p-2 text-center">
                      <div className={`text-sm font-bold ${m.label === 'Errors' && m.value > 0 ? 'text-red-500' : 'text-slate-800'}`}>
                        {m.value}
                      </div>
                      <div className="text-xs text-slate-400">{m.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
            {agents.length === 0 && !loading && (
              <div className="col-span-4 text-center py-12 text-slate-400">No agent data available yet. Trigger an analysis to populate.</div>
            )}
          </div>
        )}

        {/* ── Observability Tab ── */}
        {activeTab === 'observability' && <AgentObservabilityDashboard agents={agents} stats={stats} runs={runs} />}

        {/* ── Runs Tab ── */}
        {activeTab === 'runs' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {runs.map((run: any) => (
                <div key={run.id}>
                  <div className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}>
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${statusDot(run.status)}`} />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{run.customer?.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-400">{run.trigger_reason} · {timeAgo(run.started_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(run.status)}`}>{run.status}</span>
                      <span className="text-xs text-slate-400">{run.execution_time_ms ? `${(run.execution_time_ms/1000).toFixed(1)}s` : '—'}</span>
                      <span className="text-xs text-slate-400">{(run.output_data?.tokens_used || 0).toLocaleString()} tokens</span>
                      {expandedRun === run.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>
                  <AnimatePresence>
                    {expandedRun === run.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-100 bg-slate-50">
                        <div className="p-4 space-y-3">
                          {/* Agent pipeline visualization */}
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Agent Pipeline</p>
                            <div className="flex items-center gap-1 flex-wrap">
                              {['memory', 'planner', 'interaction', 'usage', 'sentiment', 'knowledge', 'recommendation'].map((a, i) => (
                                <div key={a} className="flex items-center gap-1">
                                  <span className={`text-xs px-2 py-1 rounded-lg border font-medium ${
                                    run.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                    run.status === 'failed' ? 'bg-red-50 text-red-500 border-red-200' :
                                    'bg-blue-50 text-blue-600 border-blue-200'
                                  }`}>
                                    {AGENT_ICONS[a]} {a}
                                  </span>
                                  {i < 6 && <span className="text-slate-300 text-xs">→</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Logs */}
                          {run.logs?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Agent Logs</p>
                              <div className="bg-slate-900 rounded-xl p-3 space-y-1 max-h-40 overflow-y-auto">
                                {run.logs.map((log: string, i: number) => (
                                  <p key={i} className="text-xs text-green-400 font-mono">{log}</p>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Outputs */}
                          {run.output_data && (
                            <div className="flex gap-4 text-sm">
                              <span className="text-slate-500">Recommendations: <b>{run.output_data.recommendations_count}</b></span>
                              <span className="text-slate-500">Health Score: <b>{run.output_data.health_score?.toFixed(0)}</b></span>
                              <span className="text-slate-500">Memory: <b>{run.output_data.memory_loaded ? 'Loaded' : 'Cold start'}</b></span>
                            </div>
                          )}
                          {run.error && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{run.error}</p>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
              {runs.length === 0 && !loading && (
                <div className="text-center py-12 text-slate-400">No agent runs yet.</div>
              )}
            </div>
          </div>
        )}

        {/* ── Event Bus Tab ── */}
        {activeTab === 'events' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-blue-500" /> Event Channels
                </h3>
                {[
                  { ch: 'cs:events:meeting', label: 'Meeting', color: 'bg-blue-500' },
                  { ch: 'cs:events:usage', label: 'Usage', color: 'bg-orange-500' },
                  { ch: 'cs:events:ticket', label: 'Ticket', color: 'bg-red-500' },
                  { ch: 'cs:events:trigger', label: 'Trigger', color: 'bg-purple-500' },
                  { ch: 'cs:events:result', label: 'Result', color: 'bg-green-500' },
                  { ch: 'cs:events:alert', label: 'Alert', color: 'bg-red-600' },
                ].map(ch => (
                  <div key={ch.ch} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                    <div className={`w-2 h-2 rounded-full ${ch.color}`} />
                    <div>
                      <p className="text-sm font-medium text-slate-700">{ch.label}</p>
                      <p className="text-xs text-slate-400 font-mono">{ch.ch}</p>
                    </div>
                  </div>
                ))}
                <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-600">Architecture</p>
                  <p>Meeting Uploaded → <span className="text-blue-600">cs:events:meeting</span></p>
                  <p>→ Event Handler → Celery Queue</p>
                  <p>→ AI Analysis → <span className="text-green-600">cs:events:result</span></p>
                  <p>→ WebSocket → Dashboard</p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Radio className="w-5 h-5 text-blue-500" /> Recent Events
                  <span className="text-xs text-slate-400">({events.length})</span>
                </h3>
                <button onClick={load} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {events.map((ev: any, i: number) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-lg flex-shrink-0">{EVENT_ICONS[ev.event_type] || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700 font-mono">{ev.event_type}</span>
                        <span className="text-xs text-slate-400">via {ev.source}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">customer: {ev.customer_id}</p>
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ''}
                    </span>
                  </motion.div>
                ))}
                {events.length === 0 && (
                  <p className="text-center text-slate-400 py-8 text-sm">No events yet. Log a meeting to see the event bus in action.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Architecture Tab ── */}
        {activeTab === 'architecture' && <ArchitectureDiagram />}
      </div>
    </div>
  )
}

function AgentObservabilityDashboard({ agents, stats, runs }: { agents: any[]; stats: any; runs: any[] }) {
  const recentRuns = runs.slice(0, 10)
  const avgMs = stats?.avg_execution_ms ?? 0
  const successRate = stats?.success_rate ?? 0

  // Build per-agent sparkline data from runs
  const agentActivity = agents.map(agent => {
    const agentRuns = runs.filter(r =>
      r.logs?.some((l: string) => l.toLowerCase().includes(agent.name))
    )
    return {
      ...agent,
      recent_runs: agentRuns.length,
      health: agent.error_count > 2 ? 'degraded' : agent.status === 'running' ? 'running' : 'healthy',
    }
  })

  return (
    <div className="space-y-5">
      {/* Top-level system health */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'System Status', value: successRate >= 80 ? 'Operational' : 'Degraded', icon: '🟢', color: successRate >= 80 ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200' },
          { label: 'Avg Execution', value: `${(avgMs / 1000).toFixed(1)}s`, icon: '⏱️', color: 'text-blue-700 bg-blue-50 border-blue-200' },
          { label: 'Success Rate', value: `${successRate}%`, icon: '✅', color: 'text-green-700 bg-green-50 border-green-200' },
          { label: 'Total Tokens', value: (stats?.total_tokens ?? 0).toLocaleString(), icon: '🔤', color: 'text-purple-700 bg-purple-50 border-purple-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 flex items-center gap-3 ${s.color}`}>
            <span className="text-2xl">{s.icon}</span>
            <div>
              <div className="font-black text-lg leading-none">{s.value}</div>
              <div className="text-xs opacity-70 mt-1">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Agent Status Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Server className="w-4 h-4 text-blue-500" /> Agent Status Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-100">
                <th className="text-left pb-3 pr-4">Agent</th>
                <th className="text-left pb-3 pr-4">Status</th>
                <th className="text-right pb-3 pr-4">Runs</th>
                <th className="text-right pb-3 pr-4">Avg (ms)</th>
                <th className="text-right pb-3 pr-4">Errors</th>
                <th className="text-right pb-3 pr-4">Tokens</th>
                <th className="text-right pb-3">Retries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {agents.map(agent => (
                <tr key={agent.name} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span>{AGENT_ICONS[agent.name] ?? '🤖'}</span>
                      <span className="font-medium text-slate-800 capitalize">{agent.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full w-fit border ${statusColor(agent.status)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusDot(agent.status)}`} />
                      {agent.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right text-slate-700 font-medium">{agent.runs_count ?? 0}</td>
                  <td className="py-3 pr-4 text-right">
                    <span className={`${(agent.avg_duration_ms ?? 0) > 8000 ? 'text-amber-600 font-medium' : 'text-slate-600'}`}>
                      {agent.avg_duration_ms ?? 0}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className={`${(agent.error_count ?? 0) > 0 ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                      {agent.error_count ?? 0}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right text-slate-600">{(agent.total_tokens ?? 0).toLocaleString()}</td>
                  <td className="py-3 text-right text-slate-400">{agent.retry_count ?? 0}</td>
                </tr>
              ))}
              {agents.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-slate-400">No agent data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Execution Timeline — last 10 runs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-green-500" /> Execution Timeline
          <span className="text-xs text-slate-400">Last {recentRuns.length} runs</span>
        </h3>
        <div className="flex items-end gap-1.5 h-24 mb-3">
          {recentRuns.length === 0 && (
            <p className="text-sm text-slate-400 self-center ml-2">No runs yet</p>
          )}
          {recentRuns.map((run, i) => {
            const maxMs = Math.max(...recentRuns.map(r => r.execution_time_ms ?? 1000), 1)
            const height = Math.max(8, Math.round(((run.execution_time_ms ?? 1000) / maxMs) * 96))
            const color = run.status === 'completed' ? '#22C55E' : run.status === 'failed' ? '#EF4444' : '#3B82F6'
            return (
              <div key={run.id} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className="w-full rounded-t-sm transition-all"
                  style={{ height, backgroundColor: color, opacity: 0.8 }}
                />
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                  {run.customer?.name ?? 'Unknown'}<br />
                  {run.execution_time_ms ? `${(run.execution_time_ms/1000).toFixed(1)}s` : '?'} · {run.status}
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> Completed</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Failed</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Running</span>
          <span className="ml-auto">Bar height = execution time</span>
        </div>
      </div>

      {/* Token usage breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <MemoryStick className="w-4 h-4 text-purple-500" /> Token Usage by Agent
        </h3>
        {agents.length === 0 ? (
          <p className="text-slate-400 text-sm">No token data available</p>
        ) : (
          <div className="space-y-3">
            {[...agents].sort((a, b) => (b.total_tokens ?? 0) - (a.total_tokens ?? 0)).map(agent => {
              const total = agents.reduce((s: number, a: any) => s + (a.total_tokens ?? 0), 0)
              const pct   = total > 0 ? Math.round(((agent.total_tokens ?? 0) / total) * 100) : 0
              return (
                <div key={agent.name} className="flex items-center gap-3">
                  <span className="text-sm w-6">{AGENT_ICONS[agent.name] ?? '🤖'}</span>
                  <span className="text-sm text-slate-700 capitalize w-28">{agent.name}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-purple-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-slate-500 w-20 text-right">
                    {(agent.total_tokens ?? 0).toLocaleString()} ({pct}%)
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ArchitectureDiagram() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* High-Level Architecture */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-500" /> System Architecture
          </h3>
          {[
            { label: 'Next.js / React', icon: '⚛️', color: 'bg-blue-50 border-blue-200 text-blue-700' },
            { label: 'FastAPI Backend', icon: '⚡', color: 'bg-green-50 border-green-200 text-green-700' },
            { label: 'Planner Agent', icon: '🗺️', color: 'bg-purple-50 border-purple-200 text-purple-700' },
            { label: 'Specialized Agents (×6)', icon: '🤖', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
            { label: 'Memory Agent', icon: '🧠', color: 'bg-pink-50 border-pink-200 text-pink-700' },
            { label: 'Recommendation Engine', icon: '💡', color: 'bg-amber-50 border-amber-200 text-amber-700' },
            { label: 'HITL Approval Layer', icon: '✅', color: 'bg-teal-50 border-teal-200 text-teal-700' },
            { label: 'Dashboard', icon: '📊', color: 'bg-slate-50 border-slate-200 text-slate-700' },
          ].map((item, i, arr) => (
            <div key={item.label}>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${item.color}`}>
                <span>{item.icon}</span> {item.label}
              </div>
              {i < arr.length - 1 && <div className="text-slate-300 text-center text-lg leading-none my-0.5">↓</div>}
            </div>
          ))}
        </div>

        {/* Sequence Flow */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-500" /> Sequence Flow
          </h3>
          {[
            { step: '1', label: 'Meeting / Email uploaded', icon: '💬' },
            { step: '2', label: 'Event Bus → Redis Pub/Sub', icon: '🔔' },
            { step: '3', label: 'Celery Worker picks up task', icon: '⚙️' },
            { step: '4', label: 'Planner Agent orchestrates', icon: '🗺️' },
            { step: '5', label: 'Memory Agent loads history', icon: '🧠' },
            { step: '6', label: 'Sentiment + Usage analysis', icon: '📊' },
            { step: '7', label: 'Knowledge Agent RAG retrieval', icon: '📚' },
            { step: '8', label: 'Recommendation Agent → NBAs', icon: '💡' },
            { step: '9', label: 'HITL Review → approve/reject', icon: '✅' },
            { step: '10', label: 'Memory Agent stores outcome', icon: '💾' },
            { step: '11', label: 'WebSocket → Dashboard notif', icon: '📡' },
          ].map((s, i, arr) => (
            <div key={s.step} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">{s.step}</div>
                {i < arr.length - 1 && <div className="w-0.5 h-3 bg-blue-200" />}
              </div>
              <p className="text-sm text-slate-600 py-0.5">{s.icon} {s.label}</p>
            </div>
          ))}
        </div>

        {/* Deployment */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-500" /> Deployment Stack
          </h3>
          {[
            { label: 'Nginx (reverse proxy)', icon: '🌐', color: 'text-slate-700 bg-slate-50 border-slate-200' },
            { label: 'Next.js (port 3000)', icon: '⚛️', color: 'text-blue-700 bg-blue-50 border-blue-200' },
            { label: 'FastAPI (port 8000)', icon: '⚡', color: 'text-green-700 bg-green-50 border-green-200' },
            { label: 'Celery Workers (async)', icon: '⚙️', color: 'text-orange-700 bg-orange-50 border-orange-200' },
            { label: 'Redis (pub/sub + cache)', icon: '🔴', color: 'text-red-700 bg-red-50 border-red-200' },
            { label: 'PostgreSQL (primary DB)', icon: '🐘', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
            { label: 'ChromaDB (vector store)', icon: '🔮', color: 'text-purple-700 bg-purple-50 border-purple-200' },
          ].map((item, i, arr) => (
            <div key={item.label}>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${item.color}`}>
                <span>{item.icon}</span> {item.label}
              </div>
              {i < arr.length - 1 && <div className="text-slate-300 text-center text-lg leading-none my-0.5">↓</div>}
            </div>
          ))}
          <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-500 space-y-1">
            <p>All services run in Docker containers</p>
            <p>docker-compose for local development</p>
            <p>Health checks on all services</p>
          </div>
        </div>
      </div>

      {/* Requirement coverage matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-semibold text-slate-800 mb-4">📋 Hackathon Requirement Coverage</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {[
            ['Planner Agent', '✅'],
            ['Specialized Agents', '✅'],
            ['Shared Memory', '✅'],
            ['RAG / Knowledge', '✅'],
            ['Ranked Recommendations', '✅'],
            ['Explainability + Evidence', '✅'],
            ['Human-in-the-Loop', '✅'],
            ['Learning from History', '✅'],
            ['Event-Driven Architecture', '✅'],
            ['Background Task Queue', '✅'],
            ['WebSocket Notifications', '✅'],
            ['Reusable Architecture', '✅'],
            ['Extensible Framework', '✅'],
            ['Customer 360 View', '✅'],
            ['Outcome Simulator', '✅'],
            ['Memory Timeline', '✅'],
          ].map(([req, status]) => (
            <div key={req} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-green-50 border border-green-200">
              <span className="text-green-600">{status}</span>
              <span className="text-slate-700 text-xs">{req}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
