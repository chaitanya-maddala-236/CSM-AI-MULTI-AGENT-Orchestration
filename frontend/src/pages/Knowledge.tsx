// @ts-nocheck
import PageIllustration from '../components/common/PageIllustration'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Plus, Trash2, Tag, Search, Edit3, X, Save,
  ChevronDown, ChevronUp, Brain, Zap, Filter, Eye,
  FileText, Shield, TrendingUp, RefreshCw, Star, Lightbulb,
  CheckCircle2, AlertCircle, Copy, CheckCheck, BarChart3
} from 'lucide-react'
import Header from '../components/layout/Header'
import { knowledgeApi, recommendationsApi, customersApi } from '../services/api'
import { formatDate } from '../utils/helpers'
import { useToast } from '../components/common/Toast'

const CATEGORIES = [
  'playbook', 'documentation', 'faq', 'case_study',
  'churn_risk', 'expansion', 'renewal', 'onboarding', 'support'
]

const CAT_CFG: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  playbook:      { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    icon: FileText },
  documentation: { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200',  icon: BookOpen },
  faq:           { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',   icon: Star },
  case_study:    { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: BarChart3 },
  churn_risk:    { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     icon: Shield },
  expansion:     { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: TrendingUp },
  renewal:       { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  icon: RefreshCw },
  onboarding:    { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200',    icon: Zap },
  support:       { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  icon: AlertCircle },
}

const EMPTY_FORM = { title: '', content: '', category: 'playbook', tags: '' }

function CategoryBadge({ category }: { category: string }) {
  const cfg = CAT_CFG[category] || { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', icon: FileText }
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon className="w-3 h-3" />
      {category.replace(/_/g, ' ')}
    </span>
  )
}

// ─── Edit/Create modal ────────────────────────────────────────────────────────
function DocModal({ doc, onSave, onClose }: { doc: any | null; onSave: (data: any) => void; onClose: () => void }) {
  const [form, setForm] = useState(doc
    ? { title: doc.title, content: doc.content, category: doc.category, tags: (doc.tags || []).join(', ') }
    : { ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!form.title.trim() || !form.content.trim()) return
    setSaving(true)
    try {
      await onSave({ ...form, tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) })
    } finally { setSaving(false) }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
              {doc ? <Edit3 className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
            </div>
            <h2 className="font-semibold text-slate-900">{doc ? 'Edit Document' : 'Add Knowledge Document'}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Title *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Churn Risk Playbook — Enterprise" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Content *</label>
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={8}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
              placeholder="Write the playbook, documentation, best practice, or case study content here. The AI will use this when generating recommendations..." />
            <p className="text-xs text-slate-400 mt-1">{form.content.length} characters</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Tags <span className="font-normal normal-case text-slate-400">(comma-separated)</span>
            </label>
            <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="churn, enterprise, escalation, best-practice" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-blue-400" />
            Saved documents are embedded into ChromaDB and used by the AI recommendation engine
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Cancel</button>
            <button onClick={submit} disabled={saving || !form.title.trim() || !form.content.trim()}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50">
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving…' : doc ? 'Save Changes' : 'Add Document'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Push to Recommendation modal ─────────────────────────────────────────────
function PushModal({ doc, customers, onClose, onPushed }: {
  doc: any; customers: any[]; onClose: () => void; onPushed: () => void
}) {
  const toast = useToast()
  const [customerId, setCustomerId] = useState('')
  const [pushing, setPushing] = useState(false)

  const push = async () => {
    if (!customerId) return
    setPushing(true)
    try {
      await recommendationsApi.trigger(customerId)
      toast.success('Analysis triggered', `AI will generate recommendations for the selected customer using this playbook.`)
      onPushed()
      onClose()
    } catch {
      toast.error('Error', 'Could not trigger analysis')
    } finally { setPushing(false) }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">Push to AI Recommendation</h2>
            <p className="text-xs text-slate-400">Apply this knowledge to generate customer recommendations</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
            <p className="text-xs font-semibold text-indigo-700 mb-0.5">Document</p>
            <p className="text-sm text-indigo-800 font-medium">{doc.title}</p>
            <CategoryBadge category={doc.category} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Target Customer</label>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select a customer…</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company?.name}</option>)}
            </select>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            This will trigger the full multi-agent analysis for the selected customer. The AI will use all knowledge documents — including this one — to generate contextual next-best-action recommendations.
          </p>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Cancel</button>
          <button onClick={push} disabled={!customerId || pushing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50">
            {pushing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            {pushing ? 'Triggering…' : 'Trigger Analysis'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Knowledge() {
  const toast = useToast()
  const [docs, setDocs] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [editDoc, setEditDoc] = useState<any | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [pushDoc, setPushDoc] = useState<any | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [kRes, cRes] = await Promise.all([
        knowledgeApi.list({ page_size: 100, search: search || undefined, category: catFilter !== 'all' ? catFilter : undefined }),
        customersApi.list({ page_size: 100 }),
      ])
      setDocs(kRes.data.items || [])
      setCustomers(cRes.data.items || [])
    } catch { toast.error('Load error', 'Could not fetch knowledge documents') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, catFilter])

  const create = async (data: any) => {
    await knowledgeApi.create(data)
    toast.success('Document added', 'Embedded into ChromaDB for AI retrieval')
    setShowCreate(false)
    load()
  }

  const update = async (data: any) => {
    await knowledgeApi.update(editDoc.id, data)
    toast.success('Saved', 'Document updated')
    setEditDoc(null)
    load()
  }

  const del = async (id: string) => {
    await knowledgeApi.delete(id)
    setDocs(d => d.filter(x => x.id !== id))
    toast.success('Deleted')
  }

  const copy = (doc: any) => {
    navigator.clipboard.writeText(doc.content)
    setCopiedId(doc.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const catCounts = docs.reduce<Record<string, number>>((acc, d) => {
    acc[d.category] = (acc[d.category] || 0) + 1
    return acc
  }, {})

  return (
    <div>
      <PageIllustration type="knowledge" opacity={0.5} />
      <Header title="Knowledge Base" subtitle="Playbooks, documentation, and AI training data powering the recommendation engine" />

      <div className="p-6 space-y-5">

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Documents', value: docs.length, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Playbooks', value: catCounts['playbook'] || 0, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Risk Guides', value: (catCounts['churn_risk'] || 0) + (catCounts['support'] || 0), icon: Shield, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Growth Plays', value: (catCounts['expansion'] || 0) + (catCounts['renewal'] || 0), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Search documents..." />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setCatFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${catFilter === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
              All
            </button>
            {CATEGORIES.map(c => {
              const cfg = CAT_CFG[c]
              return (
                <button key={c} onClick={() => setCatFilter(c)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all capitalize ${catFilter === c ? `${cfg.bg} ${cfg.text} ${cfg.border}` : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}>
                  {c.replace(/_/g, ' ')}
                  {catCounts[c] ? <span className="ml-1 opacity-60">({catCounts[c]})</span> : null}
                </button>
              )
            })}
          </div>

          <div className="flex-1" />
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm shadow-blue-200">
            <Plus className="w-4 h-4" /> Add Document
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs text-slate-400 uppercase tracking-wide">
                <th className="px-5 py-3 font-semibold">Document</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Tags</th>
                <th className="px-5 py-3 font-semibold">Added</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td colSpan={5} className="px-5 py-3.5">
                    <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${80 - i * 8}%` }} />
                  </td>
                </tr>
              )) : docs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">No documents yet</p>
                    <p className="text-slate-300 text-sm mt-1">Add playbooks and documentation for the AI to reference when making recommendations</p>
                    <button onClick={() => setShowCreate(true)} className="mt-3 text-sm text-blue-600 hover:underline">+ Add your first document</button>
                  </td>
                </tr>
              ) : docs.map(doc => {
                const isExpanded = expandedId === doc.id
                const cfg = CAT_CFG[doc.category] || CAT_CFG.playbook
                return (
                  <>
                    <tr key={doc.id} className={`border-b border-slate-50 hover:bg-slate-50/40 transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}>
                      <td className="px-5 py-3.5">
                        <button onClick={() => setExpandedId(isExpanded ? null : doc.id)}
                          className="flex items-center gap-2 text-left group">
                          <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                            <cfg.icon className={`w-3.5 h-3.5 ${cfg.text}`} />
                          </div>
                          <span className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors">{doc.title}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <CategoryBadge category={doc.category} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {(doc.tags || []).slice(0, 4).map((t: string) => (
                            <span key={t} className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 text-slate-500 text-xs rounded-md border border-slate-100">
                              <Tag className="w-2.5 h-2.5" />{t}
                            </span>
                          ))}
                          {(doc.tags || []).length > 4 && (
                            <span className="text-xs text-slate-400">+{doc.tags.length - 4}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">{formatDate(doc.created_at)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setPushDoc(doc)} title="Generate Recommendation"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <Brain className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => copy(doc)} title="Copy content"
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            {copiedId === doc.id ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => setEditDoc(doc)} title="Edit"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => del(doc.id)} title="Delete"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50/60 border-b border-slate-100">
                        <td colSpan={5} className="px-5 py-4">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="lg:col-span-2">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Content</p>
                              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-52 overflow-y-auto bg-white border border-slate-100 rounded-xl p-3.5">
                                {doc.content}
                              </p>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Quick Actions</p>
                                <div className="space-y-2">
                                  <button onClick={() => setPushDoc(doc)}
                                    className="w-full flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors">
                                    <Brain className="w-3.5 h-3.5" /> Generate Recommendation
                                  </button>
                                  <button onClick={() => setEditDoc(doc)}
                                    className="w-full flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium rounded-xl transition-colors">
                                    <Edit3 className="w-3.5 h-3.5" /> Edit Document
                                  </button>
                                  <button onClick={() => copy(doc)}
                                    className="w-full flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium rounded-xl transition-colors">
                                    {copiedId === doc.id ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copiedId === doc.id ? 'Copied!' : 'Copy Content'}
                                  </button>
                                </div>
                              </div>
                              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                                <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1.5">
                                  <Lightbulb className="w-3 h-3" /> AI Usage
                                </p>
                                <p className="text-xs text-blue-600">This document is embedded in ChromaDB and retrieved by the Knowledge Agent during every recommendation cycle.</p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreate && <DocModal doc={null} onSave={create} onClose={() => setShowCreate(false)} />}
        {editDoc && <DocModal doc={editDoc} onSave={update} onClose={() => setEditDoc(null)} />}
        {pushDoc && <PushModal doc={pushDoc} customers={customers} onClose={() => setPushDoc(null)} onPushed={load} />}
      </AnimatePresence>
    </div>
  )
}
