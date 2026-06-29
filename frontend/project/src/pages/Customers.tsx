import PageIllustration from '../components/common/PageIllustration'
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, RefreshCw, ChevronRight, TrendingDown, TrendingUp, Minus, User } from 'lucide-react'
import Header from '../components/layout/Header'
import HealthBadge from '../components/common/HealthBadge'
import ScoreRing from '../components/common/ScoreRing'
import { useToast } from '../components/common/Toast'
import { customersApi } from '../services/api'
import { formatCurrency, formatDate } from '../utils/helpers'
import type { Customer } from '../types'

const HEALTH_FILTERS = ['all', 'healthy', 'at_risk', 'critical']

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [mine, setMine] = useState(false)
  const [page, setPage] = useState(1)
  const nav = useNavigate()
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, page_size: 15 }
      if (filter !== 'all') params.health_status = filter
      if (search) params.search = search
      if (mine) params.mine = true
      const { data } = await customersApi.list(params)
      setCustomers(data.items); setTotal(data.total)
    } catch (e) {
      toast.error('Failed to load customers')
    } finally { setLoading(false) }
  }, [page, filter, search, mine])

  useEffect(() => { load() }, [load])

  const SentimentIcon = ({ s }: { s: string }) =>
    s === 'positive' ? <TrendingUp className="w-3.5 h-3.5 text-green-500" /> :
      s === 'negative' ? <TrendingDown className="w-3.5 h-3.5 text-red-500" /> :
        <Minus className="w-3.5 h-3.5 text-slate-400" />

  return (
    <div>
      <Header title="Customers" subtitle={`${total} total accounts`} />
      <div className="p-6 space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search customers..." />
          </div>

          {/* My Accounts toggle */}
          <button
            onClick={() => { setMine(m => !m); setPage(1) }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${mine
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}>
            <User className="w-3.5 h-3.5" /> My Accounts
          </button>

          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
            {HEALTH_FILTERS.map(f => (
              <button key={f} onClick={() => { setFilter(f); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filter === f ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                {f === 'at_risk' ? 'At Risk' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {mine && (
          <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2">
            <User className="w-4 h-4" />
            Showing only accounts assigned to you
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Customer', 'Company', 'Health', 'Churn Risk', 'Plan / MRR', 'Renewal', 'Sentiment', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence>
                {loading ? [...Array(8)].map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-4 py-3">
                    <div className="animate-pulse flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-1"><div className="h-3 bg-slate-100 rounded w-1/3" /><div className="h-2 bg-slate-100 rounded w-1/4" /></div>
                    </div>
                  </td></tr>
                )) : customers.map((c, i) => (
                  <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    onClick={() => nav(`/customers/${c.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: c.health_status === 'healthy' ? '#dcfce7' : c.health_status === 'at_risk' ? '#fef3c7' : '#fee2e2' }}>
                          <span className="text-xs font-bold" style={{ color: c.health_status === 'healthy' ? '#16a34a' : c.health_status === 'at_risk' ? '#d97706' : '#dc2626' }}>{c.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{c.name}</p>
                          <p className="text-xs text-slate-400">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-700">{c.company?.name}</p>
                      <p className="text-xs text-slate-400">{c.company?.industry}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ScoreRing score={c.health_score} size={36} strokeWidth={4} />
                        <HealthBadge status={c.health_status} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 w-16">
                          <div className="h-1.5 rounded-full transition-all" style={{ width: `${c.churn_probability * 100}%`, background: c.churn_probability > 0.6 ? '#ef4444' : c.churn_probability > 0.3 ? '#f59e0b' : '#22c55e' }} />
                        </div>
                        <span className="text-xs font-medium text-slate-600">{Math.round(c.churn_probability * 100)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">{formatCurrency(c.mrr)}<span className="font-normal text-slate-400">/mo</span></p>
                      <p className="text-xs text-slate-400 capitalize">{c.plan}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(c.renewal_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <SentimentIcon s={c.sentiment} />
                        <span className="text-xs capitalize text-slate-500">{c.sentiment}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={e => { e.stopPropagation(); nav(`/customers/${c.id}/360`) }}
                          className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-lg transition-all hover:bg-purple-200">
                          360°
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {!loading && customers.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-slate-400 text-sm">{mine ? 'No accounts assigned to you yet' : 'No customers found'}</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > 15 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, total)} of {total}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Previous</button>
              <button disabled={page * 15 >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
