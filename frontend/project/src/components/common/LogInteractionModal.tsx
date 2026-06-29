import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MessageSquare, Mail, FileText, Loader2 } from 'lucide-react'
import { meetingsApi } from '../../services/api'
import { useToast } from './Toast'

interface Props {
  customerId: string
  customerName: string
  onClose: () => void
  onSuccess: () => void
}

const TYPES = [
  { key: 'meeting', label: 'Meeting', icon: MessageSquare, color: 'blue' },
  { key: 'email',   label: 'Email',   icon: Mail,          color: 'purple' },
  { key: 'note',    label: 'Note',    icon: FileText,      color: 'amber' },
] as const

const SENTIMENTS = [
  { key: 'positive', label: '😊 Positive', bg: 'bg-green-50 border-green-300 text-green-700' },
  { key: 'neutral',  label: '😐 Neutral',  bg: 'bg-slate-50 border-slate-300 text-slate-600' },
  { key: 'negative', label: '😟 Negative', bg: 'bg-red-50 border-red-300 text-red-700' },
] as const

export default function LogInteractionModal({ customerId, customerName, onClose, onSuccess }: Props) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    type: 'meeting' as 'meeting' | 'email' | 'note',
    title: '',
    summary: '',
    sentiment: 'neutral' as 'positive' | 'neutral' | 'negative',
    duration_minutes: '' as string | number,
  })

  const isValid = form.title.trim().length > 0 && form.summary.trim().length > 0

  const submit = async () => {
    if (!isValid) return
    setSaving(true)
    try {
      await meetingsApi.log({
        customer_id: customerId,
        type: form.type,
        title: form.title.trim(),
        summary: form.summary.trim(),
        sentiment: form.sentiment,
        duration_minutes: form.type === 'meeting' && form.duration_minutes
          ? Number(form.duration_minutes) : undefined,
      })
      toast.success('Interaction logged', 'AI agents will use this on the next analysis run.')
      onSuccess()
      onClose()
    } catch {
      toast.error('Failed to log', 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div>
              <h2 className="font-semibold text-slate-900">Log Interaction</h2>
              <p className="text-xs text-slate-400 mt-0.5">{customerName}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Type selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Type</label>
              <div className="flex gap-2">
                {TYPES.map(({ key, label, icon: Icon }) => (
                  <button key={key} onClick={() => setForm(f => ({ ...f, type: key }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm font-medium transition-all ${
                      form.type === key
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}>
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Title</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder={form.type === 'meeting' ? 'Q3 Business Review' : form.type === 'email' ? 'Re: Renewal discussion' : 'Key concern noted'}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Summary */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Summary</label>
              <textarea
                value={form.summary}
                onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
                rows={3}
                placeholder="What happened? Key concerns, outcomes, follow-ups..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Sentiment */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Customer Sentiment</label>
              <div className="flex gap-2">
                {SENTIMENTS.map(({ key, label, bg }) => (
                  <button key={key} onClick={() => setForm(f => ({ ...f, sentiment: key }))}
                    className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${
                      form.sentiment === key ? bg + ' border-2' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration (only for meetings) */}
            {form.type === 'meeting' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Duration (minutes)</label>
                <input
                  type="number" min={5} max={480}
                  value={form.duration_minutes}
                  onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                  placeholder="60"
                  className="w-32 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
            <p className="text-xs text-slate-400">This data will feed the AI agents on next analysis run</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">
                Cancel
              </button>
              <button onClick={submit} disabled={!isValid || saving}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? 'Saving...' : 'Log Interaction'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
