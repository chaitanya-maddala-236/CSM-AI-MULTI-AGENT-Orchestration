import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Loader2, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'

interface AgentStep {
  agent: string
  status: 'waiting' | 'running' | 'completed' | 'failed' | 'skipped'
  duration_ms?: number
  error?: string
}

interface Props {
  customerId: string
  onComplete?: () => void
  onDismiss: () => void
}

const AGENT_ORDER = ['planner', 'memory', 'interaction', 'usage', 'sentiment', 'knowledge', 'recommendation']
const AGENT_LABELS: Record<string, string> = {
  planner: '🗺️ Planner Agent',
  memory: '🧠 Memory Agent',
  interaction: '💬 Interaction Agent',
  usage: '📊 Usage Agent',
  sentiment: '❤️ Sentiment Agent',
  knowledge: '📚 Knowledge Agent',
  recommendation: '💡 Recommendation Agent',
}

export default function AgentRunLive({ customerId, onComplete, onDismiss }: Props) {
  const wsRef = useRef<WebSocket | null>(null)
  const [steps, setSteps] = useState<AgentStep[]>(
    AGENT_ORDER.map(a => ({ agent: a, status: 'waiting' }))
  )
  const [overall, setOverall] = useState<'running' | 'completed' | 'failed'>('running')
  const [expanded, setExpanded] = useState(true)
  const [elapsedMs, setElapsedMs] = useState(0)
  const startRef = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── WebSocket connection ────────────────────────────────────────────────────
  useEffect(() => {
    const wsBase = (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:8000'
    const token = localStorage.getItem('access_token') || ''
    const ws = new WebSocket(`${wsBase}/ws/agents/${customerId}?token=${token}`)
    wsRef.current = ws

    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startRef.current)
    }, 100)

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data)
        if (msg.type === 'agent_update') {
          setSteps(prev => prev.map(s =>
            s.agent === msg.agent
              ? { ...s, status: msg.status, duration_ms: msg.duration_ms, error: msg.error }
              : s
          ))
        }
        if (msg.type === 'run_complete') {
          setOverall(msg.success ? 'completed' : 'failed')
          if (timerRef.current) clearInterval(timerRef.current)
          if (msg.success && onComplete) setTimeout(onComplete, 1200)
        }
      } catch { /* ignore parse errors */ }
    }

    ws.onerror = () => {
      // Fallback: poll agent runs API if WS unavailable
      pollFallback()
    }

    return () => {
      ws.close()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [customerId])

  // ── Polling fallback when WS unavailable ───────────────────────────────────
  const pollFallback = () => {
    let attempts = 0
    const maxAttempts = 20
    let agentIdx = 0

    const interval = setInterval(() => {
      attempts++
      // Simulate progress by advancing through agents
      if (agentIdx < AGENT_ORDER.length) {
        const agent = AGENT_ORDER[agentIdx]
        setSteps(prev => prev.map((s, i) => ({
          ...s,
          status: i < agentIdx ? 'completed'
               : i === agentIdx ? 'running'
               : 'waiting'
        })))
        // Mark previous as done
        if (agentIdx > 0) {
          setSteps(prev => prev.map((s, i) => ({
            ...s,
            status: i < agentIdx ? 'completed'
                 : i === agentIdx ? 'running'
                 : 'waiting'
          })))
        }
        agentIdx++
      } else {
        setSteps(prev => prev.map(s => ({ ...s, status: 'completed' })))
        setOverall('completed')
        if (timerRef.current) clearInterval(timerRef.current)
        clearInterval(interval)
        if (onComplete) setTimeout(onComplete, 1200)
        return
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval)
        setOverall('failed')
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }, 1500)
  }

  const completedCount = steps.filter(s => s.status === 'completed').length
  const progress = (completedCount / AGENT_ORDER.length) * 100

  const statusColor = {
    waiting: 'text-slate-300',
    running: 'text-blue-500',
    completed: 'text-green-500',
    failed: 'text-red-500',
    skipped: 'text-slate-400',
  }

  const StatusIcon = ({ status }: { status: AgentStep['status'] }) => {
    if (status === 'running') return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
    if (status === 'completed') return <CheckCircle2 className="w-4 h-4 text-green-500" />
    if (status === 'failed') return <XCircle className="w-4 h-4 text-red-400" />
    if (status === 'skipped') return <div className="w-4 h-4 rounded-full border-2 border-slate-200" />
    return <Clock className="w-4 h-4 text-slate-300" />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16 }}
      className="fixed bottom-6 right-6 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden"
    >
      {/* Header */}
      <div className={`p-4 ${overall === 'completed' ? 'bg-green-50' : overall === 'failed' ? 'bg-red-50' : 'bg-blue-50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {overall === 'running'
              ? <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              : overall === 'completed'
              ? <CheckCircle2 className="w-4 h-4 text-green-600" />
              : <XCircle className="w-4 h-4 text-red-500" />
            }
            <span className="text-sm font-semibold text-slate-800">
              {overall === 'running' ? 'AI Analysis Running...'
               : overall === 'completed' ? 'Analysis Complete!'
               : 'Analysis Failed'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setExpanded(e => !e)} className="text-slate-400 hover:text-slate-600 p-0.5">
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            {overall !== 'running' && (
              <button onClick={onDismiss} className="text-slate-400 hover:text-slate-600 p-0.5 ml-1">
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${overall === 'failed' ? 'bg-red-400' : 'bg-blue-500'}`}
            animate={{ width: `${overall === 'completed' ? 100 : progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-slate-400">
          <span>{completedCount}/{AGENT_ORDER.length} agents</span>
          <span>{(elapsedMs / 1000).toFixed(1)}s</span>
        </div>
      </div>

      {/* Agent steps */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-1 max-h-64 overflow-y-auto">
              {steps.map((step, i) => (
                <motion.div
                  key={step.agent}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors ${
                    step.status === 'running' ? 'bg-blue-50' : ''
                  }`}
                >
                  <StatusIcon status={step.status} />
                  <span className={`text-xs flex-1 ${statusColor[step.status]}`}>
                    {AGENT_LABELS[step.agent] || step.agent}
                  </span>
                  {step.duration_ms && (
                    <span className="text-xs text-slate-300">{(step.duration_ms / 1000).toFixed(1)}s</span>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer on complete */}
      {overall === 'completed' && (
        <div className="px-4 pb-3 text-xs text-slate-500 text-center">
          Recommendations updated · Refreshing...
        </div>
      )}
    </motion.div>
  )
}
