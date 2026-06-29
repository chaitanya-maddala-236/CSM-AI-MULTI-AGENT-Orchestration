import PageIllustration from '../components/common/PageIllustration'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Monitor, GitBranch, Database, Layers, Activity } from 'lucide-react'
import Header from '../components/layout/Header'

const TABS = [
  { id: 'highlevel',  label: '🏗️ High-Level',    icon: Layers },
  { id: 'sequence',   label: '🔄 Sequence Flow',  icon: Activity },
  { id: 'agents',     label: '🤖 Agent Workflow', icon: GitBranch },
  { id: 'deployment', label: '🚀 Deployment',     icon: Monitor },
  { id: 'database',   label: '🗄️ Database ER',    icon: Database },
] as const

type TabId = typeof TABS[number]['id']

// ── Diagram components ────────────────────────────────────────────────────────

function Box({ label, icon, color, sub }: { label: string; icon?: string; color: string; sub?: string }) {
  return (
    <div className={`rounded-xl border-2 px-4 py-2.5 text-center shadow-sm ${color}`}>
      {icon && <div className="text-xl mb-0.5">{icon}</div>}
      <div className="font-semibold text-sm">{label}</div>
      {sub && <div className="text-xs opacity-70 mt-0.5">{sub}</div>}
    </div>
  )
}

function Arrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center my-1">
      {label && <span className="text-xs text-slate-400 mb-0.5">{label}</span>}
      <div className="text-slate-300 text-lg leading-none">↓</div>
    </div>
  )
}

function HArrow() {
  return <div className="text-slate-300 text-lg mx-2 self-center">→</div>
}

// ─────────────────────────────────────────────────────────────────────────────

function HighLevelDiagram() {
  return (
    <div className="max-w-2xl mx-auto space-y-1">
      <h3 className="text-center text-slate-500 text-sm mb-4">End-to-End Platform Architecture</h3>
      <Box label="Next.js / React Dashboard" icon="⚛️" color="border-blue-300 bg-blue-50 text-blue-800" sub="Streamlit UI · HITL Approval · Customer 360" />
      <Arrow label="REST + WebSocket" />
      <Box label="FastAPI Backend" icon="⚡" color="border-green-300 bg-green-50 text-green-800" sub="Auth · CRUD · Analytics · Memory APIs" />
      <Arrow label="Event Bus (Redis Pub/Sub)" />
      <Box label="Planner Agent" icon="🗺️" color="border-purple-300 bg-purple-50 text-purple-800" sub="LangGraph supervisor — dynamic orchestration" />
      <Arrow />
      <div className="grid grid-cols-3 gap-3">
        <Box label="Interaction Agent" icon="💬" color="border-indigo-200 bg-indigo-50 text-indigo-700" sub="Parse meetings, emails, CRM" />
        <Box label="Sentiment Agent" icon="❤️" color="border-pink-200 bg-pink-50 text-pink-700" sub="NLP sentiment scoring" />
        <Box label="Usage Agent" icon="📊" color="border-orange-200 bg-orange-50 text-orange-700" sub="Adoption & engagement" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Box label="Knowledge Agent (RAG)" icon="📚" color="border-amber-200 bg-amber-50 text-amber-700" sub="ChromaDB vector retrieval" />
        <Box label="Memory Agent" icon="🧠" color="border-rose-200 bg-rose-50 text-rose-700" sub="Episodic context store" />
      </div>
      <Arrow />
      <Box label="Recommendation Agent + Explainability Engine" icon="💡" color="border-yellow-300 bg-yellow-50 text-yellow-800" sub="Ranked NBAs · Evidence · Confidence · Reasoning" />
      <Arrow />
      <Box label="HITL Approval Layer" icon="✅" color="border-teal-300 bg-teal-50 text-teal-800" sub="Approve · Reject · Modify · Feedback → Memory" />
      <Arrow />
      <div className="grid grid-cols-3 gap-3">
        <Box label="PostgreSQL" icon="🐘" color="border-slate-300 bg-slate-50 text-slate-700" sub="Primary store" />
        <Box label="ChromaDB" icon="🔮" color="border-purple-200 bg-purple-50 text-purple-700" sub="Vector store" />
        <Box label="Redis" icon="🔴" color="border-red-200 bg-red-50 text-red-700" sub="Cache + Pub/Sub" />
      </div>
    </div>
  )
}

function SequenceDiagram() {
  const steps = [
    { actor: 'CSM', action: 'Uploads meeting / email / CRM note', icon: '👤' },
    { actor: 'API', action: 'Validates & stores interaction in PostgreSQL', icon: '⚡' },
    { actor: 'Event Bus', action: 'Publishes meeting.uploaded → Redis Pub/Sub', icon: '🔔' },
    { actor: 'Celery', action: 'Worker picks up task from analysis queue', icon: '⚙️' },
    { actor: 'Planner', action: 'Reasons about agents to invoke and order', icon: '🗺️' },
    { actor: 'Memory Agent', action: 'Loads historical context for this customer', icon: '🧠' },
    { actor: 'Interaction Agent', action: 'Parses & extracts signals from input', icon: '💬' },
    { actor: 'Sentiment Agent', action: 'Scores sentiment across all touchpoints', icon: '❤️' },
    { actor: 'Usage Agent', action: 'Analyzes product adoption metrics', icon: '📊' },
    { actor: 'Knowledge Agent', action: 'RAG retrieval from ChromaDB playbooks', icon: '📚' },
    { actor: 'Recommendation Agent', action: 'Generates ranked NBAs with explainability', icon: '💡' },
    { actor: 'Explainability Engine', action: 'Attaches evidence, reasoning chain, confidence', icon: '🔍' },
    { actor: 'HITL Layer', action: 'CSM reviews: Approve / Reject / Modify', icon: '✅' },
    { actor: 'Memory Agent', action: 'Stores decision → learns for next interaction', icon: '💾' },
    { actor: 'WebSocket', action: 'Broadcasts notification to dashboard in real-time', icon: '📡' },
  ]
  return (
    <div className="max-w-2xl mx-auto">
      <h3 className="text-center text-slate-500 text-sm mb-4">Full Request-to-Recommendation Sequence</h3>
      <div className="space-y-0">
        {steps.map((step, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center w-8">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                  {i + 1}
                </div>
                {i < steps.length - 1 && <div className="w-0.5 h-4 bg-blue-200" />}
              </div>
              <div className="flex items-center gap-3 py-1.5 flex-1">
                <span className="text-lg">{step.icon}</span>
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">{step.actor}</span>
                  <p className="text-sm text-slate-700">{step.action}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function AgentWorkflow() {
  return (
    <div className="max-w-3xl mx-auto">
      <h3 className="text-center text-slate-500 text-sm mb-4">LangGraph Agent Orchestration Workflow</h3>
      <div className="bg-slate-900 rounded-2xl p-6 font-mono text-sm overflow-auto">
        <pre className="text-green-400">{`
# LangGraph StateGraph — Dynamic Agent Workflow

state = AgentState(
    customer_id, interaction_data, workflow_id
)

graph = StateGraph(AgentState)

# ── Nodes ────────────────────────────────────────
graph.add_node("memory",         memory_node)
graph.add_node("planner",        planner_node)
graph.add_node("interaction",    interaction_node)
graph.add_node("usage",          usage_node)
graph.add_node("sentiment",      sentiment_node)
graph.add_node("knowledge",      knowledge_node)
graph.add_node("recommendation", recommendation_node)

# ── Edges ────────────────────────────────────────
graph.set_entry_point("memory")
graph.add_edge("memory",     "planner")
graph.add_edge("planner",    "interaction")

# Planner decides parallel vs sequential
graph.add_conditional_edges(
    "interaction",
    route_by_signals,          # LLM decides routing
    {
        "high_risk":   "sentiment",  # → sentiment → usage → knowledge
        "low_risk":    "knowledge",  # skip usage deep-dive
        "expansion":   "usage",      # focus on adoption
    }
)

graph.add_edge("sentiment",  "usage")
graph.add_edge("usage",      "knowledge")
graph.add_edge("knowledge",  "recommendation")
graph.add_edge("recommendation", END)

# ── Compile & run ────────────────────────────────
workflow = graph.compile(checkpointer=memory_saver)
result   = await workflow.ainvoke(state)

# ── Output ───────────────────────────────────────
recommendations = result["recommendations"]
# Each has: title, evidence[], reasoning_chain[],
#           confidence_score, risk_score, actions[]
        `}</pre>
      </div>
      <div className="grid grid-cols-4 gap-2 mt-4">
        {[
          { name: 'Memory', desc: 'Load history', color: 'bg-rose-50 border-rose-200 text-rose-700' },
          { name: 'Planner', desc: 'Route decisions', color: 'bg-purple-50 border-purple-200 text-purple-700' },
          { name: 'Agents ×4', desc: 'Parallel analysis', color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { name: 'Recommend', desc: 'Generate NBAs', color: 'bg-green-50 border-green-200 text-green-700' },
        ].map(s => (
          <div key={s.name} className={`rounded-xl border p-3 text-center ${s.color}`}>
            <div className="font-semibold text-sm">{s.name}</div>
            <div className="text-xs opacity-70 mt-0.5">{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DeploymentDiagram() {
  return (
    <div className="max-w-2xl mx-auto space-y-1">
      <h3 className="text-center text-slate-500 text-sm mb-4">Docker Compose Deployment Stack</h3>
      <Box label="Client Browser" icon="🌐" color="border-slate-300 bg-slate-50 text-slate-700" />
      <Arrow label="HTTPS :443" />
      <Box label="Nginx (Reverse Proxy)" icon="🔀" color="border-gray-300 bg-gray-50 text-gray-700" sub="SSL termination · Load balancing · Static files" />
      <Arrow />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Box label="Next.js :3000" icon="⚛️" color="border-blue-300 bg-blue-50 text-blue-800" sub="React frontend" />
          <Arrow />
          <Box label="FastAPI :8000" icon="⚡" color="border-green-300 bg-green-50 text-green-800" sub="REST API + WebSocket" />
        </div>
        <div className="space-y-1">
          <Box label="Celery Workers" icon="⚙️" color="border-orange-300 bg-orange-50 text-orange-800" sub="analysis · transcripts · scheduled" />
          <Arrow />
          <Box label="Celery Beat" icon="⏰" color="border-amber-300 bg-amber-50 text-amber-800" sub="Periodic health snapshots · churn sweep" />
        </div>
      </div>
      <Arrow label="Internal network" />
      <div className="grid grid-cols-3 gap-3">
        <Box label="PostgreSQL :5432" icon="🐘" color="border-indigo-300 bg-indigo-50 text-indigo-800" sub="Primary DB" />
        <Box label="Redis :6379" icon="🔴" color="border-red-300 bg-red-50 text-red-800" sub="Cache · Pub/Sub · Celery broker" />
        <Box label="ChromaDB :8001" icon="🔮" color="border-purple-300 bg-purple-50 text-purple-800" sub="Vector store · RAG" />
      </div>
      <div className="mt-4 bg-slate-900 rounded-xl p-4 text-xs font-mono text-green-400">
        <div className="text-slate-400 mb-2"># docker-compose up --build</div>
        <div>services: nginx, frontend, backend, celery_worker,</div>
        <div>           celery_beat, postgres, redis, chromadb</div>
        <div className="text-slate-400 mt-2"># Health checks on all services</div>
        <div className="text-slate-400"># volumes: pgdata, chromadb_data, redis_data</div>
      </div>
    </div>
  )
}

function ERDiagram() {
  const tables = [
    { name: 'users', fields: ['id PK', 'email', 'full_name', 'role', 'company_id FK', 'preferences JSON'] },
    { name: 'customers', fields: ['id PK', 'name', 'email', 'arr', 'plan', 'health_score', 'churn_probability', 'sentiment', 'renewal_date', 'csm_id FK'] },
    { name: 'recommendations', fields: ['id PK', 'customer_id FK', 'title', 'category', 'priority', 'status', 'confidence_score', 'risk_score', 'evidence JSON', 'reasoning', 'reasoning_chain JSON', 'actions JSON', 'approved_by FK'] },
    { name: 'agent_runs', fields: ['id PK', 'customer_id FK', 'status', 'trigger_reason', 'logs JSON', 'output_data JSON', 'execution_time_ms', 'started_at', 'completed_at'] },
    { name: 'meetings', fields: ['id PK', 'customer_id FK', 'title', 'summary', 'sentiment', 'sentiment_score', 'transcript', 'action_items JSON', 'risks_identified JSON'] },
    { name: 'customer_memories', fields: ['id PK', 'customer_id FK', 'memory_type', 'content', 'importance_score', 'tags JSON', 'source_type', 'expires_at'] },
    { name: 'recommendation_feedback', fields: ['id PK', 'recommendation_id FK', 'customer_id FK', 'submitted_by FK', 'outcome', 'outcome_notes', 'churn_prevented', 'revenue_impacted'] },
    { name: 'customer_health_scores', fields: ['id PK', 'customer_id FK', 'health_score', 'churn_probability', 'adoption_score', 'snapshot_reason', 'recorded_at'] },
    { name: 'approval_logs', fields: ['id PK', 'recommendation_id FK', 'approver_id FK', 'decision', 'reason', 'time_to_decide_seconds', 'created_at'] },
    { name: 'timelines', fields: ['id PK', 'customer_id FK', 'event_type', 'title', 'description', 'metadata JSON', 'occurred_at'] },
  ]
  return (
    <div>
      <h3 className="text-center text-slate-500 text-sm mb-4">Database Entity Relationship Diagram</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {tables.map(t => (
          <div key={t.name} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-slate-800 text-white text-xs font-bold px-3 py-2 font-mono">{t.name}</div>
            <div className="p-2 space-y-0.5">
              {t.fields.map(f => (
                <div key={f} className={`text-xs font-mono px-1 py-0.5 rounded ${
                  f.includes('PK') ? 'bg-blue-50 text-blue-700 font-bold' :
                  f.includes('FK') ? 'bg-amber-50 text-amber-700' :
                  f.includes('JSON') ? 'bg-purple-50 text-purple-600' :
                  'text-slate-600'
                }`}>{f}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-4 text-xs text-slate-500 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block" /> Primary Key</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block" /> Foreign Key</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-100 border border-purple-300 inline-block" /> JSON / JSONB column</span>
      </div>
    </div>
  )
}

export default function ArchitectureDiagrams() {
  const [tab, setTab] = useState<TabId>('highlevel')

  const CONTENT: Record<TabId, JSX.Element> = {
    highlevel:  <HighLevelDiagram />,
    sequence:   <SequenceDiagram />,
    agents:     <AgentWorkflow />,
    deployment: <DeploymentDiagram />,
    database:   <ERDiagram />,
  }

  return (
    <div>
      <Header title="Architecture Diagrams" subtitle="System design, sequence flows and deployment stack" />
      <div className="p-6 space-y-5">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {CONTENT[tab]}
        </motion.div>
      </div>
    </div>
  )
}
