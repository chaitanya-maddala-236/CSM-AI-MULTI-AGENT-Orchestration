import PageIllustration from '../components/common/PageIllustration'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, TrendingUp, AlertTriangle, XCircle, RefreshCw, DollarSign, Clock, CheckSquare, ListChecks, Calendar, Sparkles, ArrowUpRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid } from 'recharts'
import Header from '../components/layout/Header'
import StatCard from '../components/common/StatCard'
import HealthBadge from '../components/common/HealthBadge'
import { customersApi, analyticsApi, recommendationsApi } from '../services/api'
import { formatCurrency, formatDate, timeAgo } from '../utils/helpers'
import type { DashboardStats, Customer, Recommendation } from '../types'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

const COLORS = ['#22C55E', '#F59E0B', '#EF4444']

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [healthTrend, setHealthTrend] = useState<any[]>([])
  const [revTrend, setRevTrend] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const nav = useNavigate()
  const { user } = useAuthStore()

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [s, c, r, ht, rv] = await Promise.all([
        customersApi.stats(),
        customersApi.list({ page_size: 8, health_status: 'critical' }),
        recommendationsApi.list({ status: 'pending', page_size: 5 }),
        analyticsApi.healthTrend(),
        analyticsApi.revenueTrend(),
      ])
      setStats(s.data); setCustomers(c.data.items)
      setRecs(r.data.items); setHealthTrend(ht.data); setRevTrend(rv.data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const pieData = stats ? [
    { name: 'Healthy', value: stats.healthy },
    { name: 'At Risk', value: stats.at_risk },
    { name: 'Critical', value: stats.critical },
  ] : []

  return (
    <div className="page-enter relative">
      <PageIllustration type="dashboard" opacity={0.65} />
      <Header title="Dashboard" subtitle="AI-powered customer success intelligence" />
      <div className="p-6 space-y-6">

        {/* Hero greeting */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #4338CA 60%, #6D28D9 100%)' }}>
          <div className="absolute top-0 right-0 w-64 h-full opacity-10">
            <Sparkles className="w-full h-full" />
          </div>
          <p className="text-blue-200 text-sm font-medium">{greeting()}, {user?.full_name?.split(' ')[0]} 👋</p>
          <h2 className="text-2xl font-black mt-1 mb-4">Here's your portfolio at a glance</h2>
          <div className="flex flex-wrap gap-6">
            {stats ? [
              { label: 'Total ARR',        value: formatCurrency(stats.total_arr),           accent: 'text-green-300' },
              { label: 'Avg Health Score', value: `${Math.round(stats.avg_health_score)}/100`, accent: 'text-blue-200' },
              { label: 'Pending Actions',  value: String(stats.pending_approvals),            accent: 'text-amber-300' },
              { label: 'Renewals Soon',    value: String(stats.renewals_this_month),          accent: 'text-purple-300' },
            ].map(({ label, value, accent }) => (
              <div key={label}>
                <div className={`text-xl font-black ${accent}`}>{value}</div>
                <div className="text-blue-300 text-xs font-medium mt-0.5">{label}</div>
              </div>
            )) : <div className="text-blue-300 text-sm animate-pulse">Loading portfolio...</div>}
          </div>
        </motion.div>

        {/* Stats Row 1 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Total Customers', value: stats?.total_customers ?? '—', icon: Users,         color: 'blue' as const,   subtitle: 'Active accounts' },
            { title: 'Healthy',         value: stats?.healthy ?? '—',          icon: TrendingUp,    color: 'green' as const,  subtitle: `${stats ? Math.round(stats.healthy/stats.total_customers*100) : 0}% of portfolio` },
            { title: 'At Risk',         value: stats?.at_risk ?? '—',          icon: AlertTriangle, color: 'amber' as const,  subtitle: 'Need attention' },
            { title: 'Critical',        value: stats?.critical ?? '—',         icon: XCircle,       color: 'red' as const,    subtitle: 'Immediate action' },
          ].map((s, i) => (
            <motion.div key={s.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <StatCard {...s} onClick={() => nav('/customers')} />
            </motion.div>
          ))}
        </div>

        {/* Stats Row 2 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Renewals This Month', value: stats?.renewals_this_month ?? '—', icon: Clock,       color: 'purple' as const, subtitle: 'Upcoming renewals', onClick: () => nav('/renewals') },
            { title: 'Upsell Opportunities', value: stats?.upsell_opportunities ?? '—', icon: TrendingUp, color: 'green' as const,  subtitle: 'Expansion candidates' },
            { title: 'Pending Approvals',  value: stats?.pending_approvals ?? '—',    icon: CheckSquare, color: 'blue' as const,   subtitle: 'AI recs awaiting review', onClick: () => nav('/approvals') },
            { title: 'Total ARR',          value: stats ? formatCurrency(stats.total_arr) : '—', icon: DollarSign, color: 'green' as const, subtitle: 'Annual recurring revenue' },
          ].map((s, i) => (
            <motion.div key={s.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 + i * 0.06 }}>
              <StatCard {...s} />
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-card p-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Customer Health Trend</h3>
                <p className="text-xs text-slate-400">Last 8 days</p>
              </div>
              <button onClick={load} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={healthTrend}>
                <defs>
                  <linearGradient id="gH" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22C55E" stopOpacity={0.2}/><stop offset="95%" stopColor="#22C55E" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2}/><stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/><stop offset="95%" stopColor="#EF4444" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #374151', background: 'var(--tooltip-bg, #fff)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
                <Area type="monotone" dataKey="healthy" stroke="#22C55E" fill="url(#gH)" strokeWidth={2} name="Healthy" />
                <Area type="monotone" dataKey="at_risk"  stroke="#F59E0B" fill="url(#gR)" strokeWidth={2} name="At Risk" />
                <Area type="monotone" dataKey="critical" stroke="#EF4444" fill="url(#gC)" strokeWidth={2} name="Critical" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-card p-5">
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">Health Distribution</h3>
            <p className="text-xs text-slate-400 mb-3">Current snapshot</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={4} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-around text-center mt-2">
              {pieData.map((d, i) => (
                <div key={d.name}>
                  <div className="text-base font-black text-slate-900 dark:text-white">{d.value}</div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />{d.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-card p-5">
          <h3 className="font-bold text-slate-900 dark:text-white mb-1">Revenue Trend (ARR)</h3>
          <p className="text-xs text-slate-400 mb-4">Last 6 months</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={revTrend} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0' }} />
              <Bar dataKey="arr" fill="#2563EB" radius={[6,6,0,0]} name="ARR" />
              <Bar dataKey="mrr" fill="#93C5FD" radius={[6,6,0,0]} name="MRR" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Critical Customers */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-card">
            <div className="p-5 border-b border-slate-50 dark:border-gray-800 dark:border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Critical Customers</h3>
                <p className="text-xs text-slate-400">Immediate attention needed</p>
              </div>
              <button onClick={() => nav('/customers')} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold">
                View all <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-gray-800">
              {loading ? [...Array(4)].map((_,i) => (
                <div key={i} className="p-4 animate-pulse flex gap-3">
                  <div className="w-9 h-9 bg-slate-100 rounded-full" />
                  <div className="flex-1 space-y-2"><div className="h-3 bg-slate-100 rounded w-1/2" /><div className="h-2 bg-slate-100 rounded w-1/3" /></div>
                </div>
              )) : customers.slice(0,5).map(c => (
                <div key={c.id} onClick={() => nav(`/customers/${c.id}`)}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-gray-800 cursor-pointer transition-colors flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-red-600 text-xs font-black">{c.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{c.company?.name} · {c.plan}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-bold text-red-600">{Math.round(c.churn_probability*100)}% churn</div>
                    <div className="text-xs text-slate-400">Score: {Math.round(c.health_score)}</div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
                </div>
              ))}
              {!loading && customers.length === 0 && (
                <div className="p-10 text-center text-slate-400 dark:text-slate-500 text-sm">No critical customers 🎉</div>
              )}
            </div>
          </div>

          {/* Pending Recs */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-card">
            <div className="p-5 border-b border-slate-50 dark:border-gray-800 dark:border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Pending Recommendations</h3>
                <p className="text-xs text-slate-400">Awaiting your approval</p>
              </div>
              <button onClick={() => nav('/approvals')} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold">
                View all <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-gray-800">
              {loading ? [...Array(4)].map((_,i) => (
                <div key={i} className="p-4 animate-pulse flex gap-3">
                  <div className="w-9 h-9 bg-slate-100 rounded-xl" />
                  <div className="flex-1 space-y-2"><div className="h-3 bg-slate-100 rounded w-2/3" /><div className="h-2 bg-slate-100 rounded w-1/2" /></div>
                </div>
              )) : recs.map(r => (
                <div key={r.id} onClick={() => nav('/approvals')}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-gray-800 cursor-pointer transition-colors group">
                  <div className="flex items-start gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${r.priority==='critical'?'bg-red-500':r.priority==='high'?'bg-orange-500':r.priority==='medium'?'bg-blue-500':'bg-slate-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{r.title}</p>
                      <p className="text-xs text-slate-400">{r.customer?.name} · {timeAgo(r.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="text-xs font-bold text-blue-600">{Math.round(r.confidence_score*100)}%</div>
                      <div className="text-xs text-slate-300">conf</div>
                    </div>
                  </div>
                </div>
              ))}
              {!loading && recs.length === 0 && (
                <div className="p-10 text-center text-slate-400 dark:text-slate-500 text-sm">All caught up! No pending approvals ✓</div>
              )}
            </div>
          </div>
        </div>

        {/* Today's Actions + Renewals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-card">
            <div className="p-5 border-b border-slate-50 dark:border-gray-800 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-50 dark:bg-blue-950/50 rounded-xl flex items-center justify-center"><ListChecks className="w-4 h-4 text-blue-600" /></div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Today's Priority Actions</h3>
                  <p className="text-xs text-slate-400">Critical accounts + pending approvals</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-gray-800">
              {(() => {
                const actions: {id:string; label:string; sub:string; urgency:'red'|'amber'|'blue'; path:string}[] = []
                customers.slice(0,2).forEach(c => actions.push({ id: c.id, label: `Review ${c.name}`, sub: `${Math.round(c.churn_probability*100)}% churn risk · ${c.company?.name}`, urgency: 'red', path: `/customers/${c.id}` }))
                recs.slice(0,3).forEach(r => actions.push({ id: r.id, label: r.title, sub: `Pending approval · ${r.customer?.name} · ${Math.round(r.confidence_score*100)}% conf`, urgency: r.priority === 'critical' ? 'red' : r.priority === 'high' ? 'amber' : 'blue', path: '/approvals' }))
                if (!actions.length) return <div className="p-10 text-center text-slate-400 dark:text-slate-500 text-sm">No urgent actions today 🎉</div>
                return actions.map((a, i) => (
                  <motion.div key={a.id+i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i*0.04 }}
                    onClick={() => nav(a.path)}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-gray-800 cursor-pointer transition-colors flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.urgency==='red'?'bg-red-500 live-dot':a.urgency==='amber'?'bg-amber-500':'bg-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{a.label}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{a.sub}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${a.urgency==='red'?'bg-red-50 text-red-600':a.urgency==='amber'?'bg-amber-50 text-amber-600':'bg-blue-50 text-blue-600'}`}>
                      {a.urgency === 'red' ? 'Urgent' : a.urgency === 'amber' ? 'High' : 'Review'}
                    </span>
                  </motion.div>
                ))
              })()}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-card">
            <div className="p-5 border-b border-slate-50 dark:border-gray-800 dark:border-gray-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-50 dark:bg-purple-950/50 rounded-xl flex items-center justify-center"><Calendar className="w-4 h-4 text-purple-600" /></div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Upcoming Renewals</h3>
                  <p className="text-xs text-slate-400">Sorted by soonest renewal</p>
                </div>
              </div>
              <button onClick={() => nav('/renewals')} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold">
                View all <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-gray-800">
              {[...customers].filter(c=>c.renewal_date).sort((a,b) => new Date(a.renewal_date!).getTime()-new Date(b.renewal_date!).getTime()).slice(0,6).map(c => {
                const daysLeft = Math.ceil((new Date(c.renewal_date!).getTime()-Date.now())/86400000)
                return (
                  <div key={c.id} onClick={() => nav(`/customers/${c.id}`)}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-gray-800 cursor-pointer transition-colors flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: c.health_status==='healthy'?'#DCFCE7':c.health_status==='at_risk'?'#FEF3C7':'#FEE2E2' }}>
                      <span className="text-xs font-black" style={{ color: c.health_status==='healthy'?'#16A34A':c.health_status==='at_risk'?'#D97706':'#DC2626' }}>{c.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{c.name}</p>
                      <p className="text-xs text-slate-400">{formatCurrency(c.arr)} ARR · Health {Math.round(c.health_score)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`text-sm font-black ${daysLeft<=30?'text-red-600':daysLeft<=60?'text-amber-600':'text-slate-600'}`}>{daysLeft}d</div>
                      <div className="text-[10px] text-slate-400">{formatDate(c.renewal_date)}</div>
                    </div>
                  </div>
                )
              })}
              {!loading && customers.filter(c=>c.renewal_date).length===0 && (
                <div className="p-10 text-center text-slate-400 dark:text-slate-500 text-sm">No upcoming renewals</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
