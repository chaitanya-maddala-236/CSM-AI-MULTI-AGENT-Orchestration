import PageIllustration from '../components/common/PageIllustration'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Brain, Filter, RefreshCw, ChevronRight, TrendingUp, AlertTriangle, Users, Repeat } from 'lucide-react'
import Header from '../components/layout/Header'
import PriorityBadge from '../components/common/PriorityBadge'
import HealthBadge from '../components/common/HealthBadge'
import { recommendationsApi } from '../services/api'
import { timeAgo } from '../utils/helpers'
import { useNavigate } from 'react-router-dom'
import type { Recommendation } from '../types'

const CATEGORY_ICONS: Record<string, any> = { churn_risk: AlertTriangle, expansion: TrendingUp, renewal: Repeat, adoption: Users }

export default function Recommendations() {
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [priority, setPriority] = useState('all')
  const [total, setTotal] = useState(0)
  const nav = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const params: any = { page_size: 30 }
      if (priority !== 'all') params.priority = priority
      const { data } = await recommendationsApi.list(params)
      setRecs(data.items); setTotal(data.total)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [priority])

  return (
    <div>
      <Header title="Recommendation Center" subtitle={`${total} AI-generated recommendations`} />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-white border border-slate-100 rounded-xl p-1 shadow-sm">
            {['all','critical','high','medium','low'].map(p => (
              <button key={p} onClick={() => setPriority(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${priority===p?'bg-blue-600 text-white shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
                {p}
              </button>
            ))}
          </div>
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-100 rounded-xl text-sm text-slate-500 hover:bg-slate-50 shadow-sm">
            <RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`} />
          </button>
        </div>

        <div className="space-y-3">
          {loading ? [...Array(5)].map((_,i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 animate-pulse">
              <div className="flex gap-3"><div className="w-10 h-10 bg-slate-100 rounded-xl flex-shrink-0" /><div className="flex-1 space-y-2"><div className="h-4 bg-slate-100 rounded w-1/2" /><div className="h-3 bg-slate-100 rounded w-3/4" /></div></div>
            </div>
          )) : recs.map((r, i) => {
            const CatIcon = CATEGORY_ICONS[r.category || ''] || Brain
            return (
              <motion.div key={r.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.03 }}
                className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all group cursor-pointer"
                onClick={() => nav('/approvals')}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${r.priority==='critical'?'bg-red-50':r.priority==='high'?'bg-orange-50':r.priority==='medium'?'bg-blue-50':'bg-slate-50'}`}>
                    <CatIcon className={`w-5 h-5 ${r.priority==='critical'?'text-red-500':r.priority==='high'?'text-orange-500':r.priority==='medium'?'text-blue-500':'text-slate-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{r.title}</h3>
                      <PriorityBadge priority={r.priority} />
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${r.status==='approved'?'bg-green-50 text-green-700 border-green-100':r.status==='rejected'?'bg-red-50 text-red-700 border-red-100':'bg-blue-50 text-blue-700 border-blue-100'}`}>{r.status}</span>
                    </div>
                    <p className="text-sm text-slate-500 mb-2">{r.description?.slice(0,140)}{r.description && r.description.length > 140 ? '…' : ''}</p>
                    <div className="flex flex-wrap gap-2">
                      {r.actions?.slice(0,2).map((a, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-500 text-xs rounded-lg">{a}</span>
                      ))}
                      {(r.actions?.length || 0) > 2 && <span className="text-xs text-slate-400">+{r.actions.length-2} more</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-900">{Math.round(r.confidence_score*100)}%</div>
                      <div className="text-xs text-slate-400">confidence</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color: r.risk_score>0.7?'#ef4444':r.risk_score>0.4?'#f59e0b':'#22c55e' }}>{Math.round(r.risk_score*100)}%</div>
                      <div className="text-xs text-slate-400">risk</div>
                    </div>
                    {r.customer && <HealthBadge status={r.customer.health_status} />}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-slate-400 transition-colors flex-shrink-0 self-center" />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-50 pt-3">
                  <div className="flex items-center gap-3">
                    <span>Customer: <span className="text-slate-600 font-medium">{r.customer?.name || '—'}</span></span>
                    {r.category && <span>·</span>}
                    {r.category && <span className="capitalize">{r.category.replace('_',' ')}</span>}
                  </div>
                  <span>{timeAgo(r.created_at)}</span>
                </div>
              </motion.div>
            )
          })}
          {!loading && recs.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-20 text-center">
              <Brain className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No recommendations found</p>
              <p className="text-slate-300 text-sm mt-1">Trigger AI analysis from a customer profile</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
