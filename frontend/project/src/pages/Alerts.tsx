import PageIllustration from '../components/common/PageIllustration'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Check, CheckCheck, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react'
import Header from '../components/layout/Header'
import { notificationsApi } from '../services/api'
import { timeAgo } from '../utils/helpers'
import type { Notification } from '../types'

const TYPE_STYLES: Record<string, { bg: string; icon: any; color: string }> = {
  alert: { bg:'bg-red-50 border-red-100', icon: AlertTriangle, color:'text-red-500' },
  warning: { bg:'bg-amber-50 border-amber-100', icon: AlertTriangle, color:'text-amber-500' },
  info: { bg:'bg-blue-50 border-blue-100', icon: Info, color:'text-blue-500' },
  success: { bg:'bg-green-50 border-green-100', icon: CheckCircle, color:'text-green-500' },
}

export default function Alerts() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await notificationsApi.list()
      setNotifications(data.items); setUnread(data.unread)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const markRead = async (id: string) => {
    await notificationsApi.markRead(id)
    setNotifications(n => n.map(x => x.id===id ? {...x, is_read:true} : x))
    setUnread(u => Math.max(0, u-1))
  }

  const markAll = async () => {
    await notificationsApi.markAllRead()
    setNotifications(n => n.map(x => ({...x, is_read:true})))
    setUnread(0)
  }

  return (
    <div>
      <Header title="Alerts Center" subtitle={`${unread} unread notifications`} />
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600 font-medium">{notifications.length} total</span>
            {unread > 0 && <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-bold">{unread} new</span>}
          </div>
          {unread > 0 && (
            <button onClick={markAll} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
        </div>

        <div className="space-y-2">
          {loading ? [...Array(5)].map((_,i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 animate-pulse flex gap-3">
              <div className="w-9 h-9 bg-slate-100 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2"><div className="h-3 bg-slate-100 rounded w-2/3" /><div className="h-2 bg-slate-100 rounded w-1/2" /></div>
            </div>
          )) : notifications.map((n, i) => {
            const style = TYPE_STYLES[n.type] || TYPE_STYLES.info
            const Icon = style.icon
            return (
              <motion.div key={n.id} initial={{ opacity:0, x:-5 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.03 }}
                className={`rounded-xl border p-4 flex items-start gap-3 transition-all ${n.is_read?'bg-white border-slate-100':'bg-blue-50/40 border-blue-100'}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${style.bg}`}>
                  <Icon className={`w-4 h-4 ${style.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-semibold ${n.is_read?'text-slate-700':'text-slate-900'}`}>{n.title}</p>
                    {!n.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <button onClick={() => markRead(n.id)} className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white transition-colors text-slate-400 hover:text-green-500">
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            )
          })}
          {!loading && notifications.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-100 py-20 text-center">
              <Bell className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No notifications</p>
              <p className="text-slate-300 text-sm mt-1">You'll be alerted when important events occur</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
