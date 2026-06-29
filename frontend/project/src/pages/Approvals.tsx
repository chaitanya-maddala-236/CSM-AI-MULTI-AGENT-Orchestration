import PageIllustration from '../components/common/PageIllustration'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Brain, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import Header from '../components/layout/Header'
import PriorityBadge from '../components/common/PriorityBadge'
import { recommendationsApi } from '../services/api'
import { useToast } from '../components/common/Toast'
import { timeAgo } from '../utils/helpers'
import type { Recommendation } from '../types'

export default function Approvals() {
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const toast = useToast()
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<'pending'|'approved'|'rejected'>('pending')

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await recommendationsApi.list({ status: tab, page_size: 50 })
      setRecs(data.items)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [tab])

  const handle = async (id: string, status: 'approved'|'rejected') => {
    setProcessing(id)
    try {
      await recommendationsApi.approve(id, { status, feedback_note: feedback[id] })
      setRecs(r => r.filter(x => x.id !== id))
      toast.success(status === 'approved' ? 'Recommendation approved' : 'Recommendation rejected', 'AI will learn from this decision.')
    } catch(e) {
      toast.error('Action failed', 'Please check your connection and try again.')
    }
    finally { setProcessing(null) }
  }

  return (
    <div>
      <Header title="Approval Center" subtitle="Review and approve AI-generated recommendations" />
      <div className="p-6 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-100 rounded-xl p-1 w-fit shadow-sm">
          {(['pending','approved','rejected'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${tab===t?'bg-blue-600 text-white shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-3">
          <AnimatePresence>
            {loading ? [...Array(4)].map((_,i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 animate-pulse">
                <div className="flex gap-3"><div className="w-10 h-10 bg-slate-100 rounded-xl" /><div className="flex-1 space-y-2"><div className="h-4 bg-slate-100 rounded w-1/2" /><div className="h-3 bg-slate-100 rounded w-1/3" /></div></div>
              </div>
            )) : recs.map(r => (
              <motion.div key={r.id} layout initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, scale:0.98 }}
                className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${r.priority==='critical'?'bg-red-50':r.priority==='high'?'bg-orange-50':r.priority==='medium'?'bg-blue-50':'bg-slate-50'}`}>
                      <Brain className={`w-5 h-5 ${r.priority==='critical'?'text-red-500':r.priority==='high'?'text-orange-500':r.priority==='medium'?'text-blue-500':'text-slate-400'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">{r.title}</h3>
                        <PriorityBadge priority={r.priority} />
                        {r.category && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full capitalize">{r.category.replace('_',' ')}</span>}
                      </div>
                      <p className="text-sm text-slate-500">{r.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                        <span>Customer: <span className="text-slate-600 font-medium">{r.customer?.name}</span></span>
                        <span>·</span>
                        <span>Confidence: <span className="text-blue-600 font-medium">{Math.round(r.confidence_score*100)}%</span></span>
                        <span>·</span>
                        <span>Risk: <span className="text-red-500 font-medium">{Math.round(r.risk_score*100)}%</span></span>
                        <span>·</span>
                        <span>{timeAgo(r.created_at)}</span>
                      </div>
                    </div>
                    <button onClick={() => setExpanded(expanded===r.id ? null : r.id)}
                      className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                      {expanded===r.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded */}
                <AnimatePresence>
                  {expanded === r.id && (
                    <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
                      className="border-t border-slate-50 overflow-hidden">
                      <div className="p-5 space-y-4">
                        {/* Actions */}
                        {r.actions?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Recommended Actions</h4>
                            <div className="space-y-1.5">
                              {r.actions.map((a, i) => (
                                <div key={i} className="flex items-center gap-2.5 text-sm text-slate-700">
                                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i+1}</div>{a}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Evidence */}
                        {r.evidence?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Supporting Evidence</h4>
                            <div className="flex flex-wrap gap-2">
                              {r.evidence.map((e, i) => (
                                <span key={i} className="px-2.5 py-1 bg-amber-50 border border-amber-100 text-amber-700 text-xs rounded-lg flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />{e}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Reasoning */}
                        {r.reasoning && (
                          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                            <span className="font-semibold">🧠 AI Reasoning: </span>{r.reasoning}
                          </div>
                        )}
                        {/* Feedback */}
                        {tab === 'pending' && (
                          <div>
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Feedback (Optional)</h4>
                            <textarea value={feedback[r.id] || ''} onChange={e => setFeedback(f => ({...f, [r.id]: e.target.value}))}
                              rows={2} placeholder="Add notes or feedback before approving/rejecting..."
                              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                {tab === 'pending' && (
                  <div className="px-5 pb-5 flex gap-2 justify-end">
                    <button onClick={() => handle(r.id, 'rejected')} disabled={!!processing}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl transition-all disabled:opacity-50">
                      {processing===r.id ? <div className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" /> : <XCircle className="w-4 h-4" />} Reject
                    </button>
                    <button onClick={() => handle(r.id, 'approved')} disabled={!!processing}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl transition-all disabled:opacity-50 shadow-sm shadow-green-200">
                      {processing===r.id ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />} Approve
                    </button>
                  </div>
                )}
                {tab !== 'pending' && (
                  <div className="px-5 pb-4 text-xs text-slate-400">
                    {r.feedback_note && <p>Feedback: {r.feedback_note}</p>}
                    {r.approved_at && <p>{tab === 'approved' ? '✓ Approved' : '✗ Rejected'} {timeAgo(r.approved_at)}</p>}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {!loading && recs.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-20 text-center">
              <CheckCircle className="w-10 h-10 text-green-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No {tab} recommendations</p>
              <p className="text-slate-300 text-sm mt-1">You're all caught up!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
