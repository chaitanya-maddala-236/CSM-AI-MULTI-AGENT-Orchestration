import PageIllustration from '../components/common/PageIllustration'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Plus, Trash2, Tag, Search } from 'lucide-react'
import Header from '../components/layout/Header'
import { knowledgeApi } from '../services/api'
import { formatDate } from '../utils/helpers'

const CATEGORY_COLORS: Record<string, string> = { playbook:'bg-blue-50 text-blue-700', documentation:'bg-purple-50 text-purple-700', faq:'bg-green-50 text-green-700', case_study:'bg-amber-50 text-amber-700', churn_risk:'bg-red-50 text-red-700', expansion:'bg-emerald-50 text-emerald-700', renewal:'bg-indigo-50 text-indigo-700', onboarding:'bg-teal-50 text-teal-700', support:'bg-orange-50 text-orange-700' }

export default function Knowledge() {
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title:'', content:'', category:'playbook', tags:'' })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try { const { data } = await knowledgeApi.list(); setDocs(data.items) }
    catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    try {
      await knowledgeApi.create({ ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) })
      setShowForm(false); setForm({ title:'', content:'', category:'playbook', tags:'' }); load()
    } catch(e) { console.error(e) }
    finally { setSaving(false) }
  }

  const del = async (id: string) => {
    await knowledgeApi.delete(id); setDocs(d => d.filter(x => x.id !== id))
  }

  const filtered = docs.filter(d => !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.category.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <Header title="Knowledge Base" subtitle="Playbooks, documentation, and AI training data" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search documents..." />
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all shadow-sm shadow-blue-200">
            <Plus className="w-4 h-4" /> Add Document
          </button>
        </div>

        {/* Add Form */}
        {showForm && (
          <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}
            className="bg-white rounded-xl border border-blue-100 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-slate-900">Add New Document</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
                <input value={form.title} onChange={e => setForm({...form, title:e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Document title" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                <select value={form.category} onChange={e => setForm({...form, category:e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  {['playbook','documentation','faq','case_study','churn_risk','expansion','renewal','onboarding','support'].map(c => <option key={c} value={c} className="capitalize">{c.replace('_',' ')}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Content</label>
              <textarea value={form.content} onChange={e => setForm({...form, content:e.target.value})} rows={4}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Document content..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tags (comma-separated)</label>
              <input value={form.tags} onChange={e => setForm({...form, tags:e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="churn, playbook, enterprise" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Cancel</button>
              <button onClick={save} disabled={saving || !form.title || !form.content}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Document'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? [...Array(6)].map((_,i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-1/2 mb-4" />
              <div className="h-3 bg-slate-100 rounded w-full mb-2" />
              <div className="h-3 bg-slate-100 rounded w-5/6" />
            </div>
          )) : filtered.map((doc, i) => (
            <motion.div key={doc.id} initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }} transition={{ delay:i*0.04 }}
              className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                </div>
                <button onClick={() => del(doc.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-500 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <h3 className="font-semibold text-slate-900 text-sm mb-2">{doc.title}</h3>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize mb-3 ${CATEGORY_COLORS[doc.category] || 'bg-slate-50 text-slate-500'}`}>
                {doc.category.replace('_',' ')}
              </span>
              {doc.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {doc.tags.slice(0,3).map((t: string) => (
                    <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-400 text-xs rounded-lg">
                      <Tag className="w-2.5 h-2.5" />{t}
                    </span>
                  ))}
                </div>
              )}
              {doc.content && (
                <p className="text-xs text-slate-500 mt-2 line-clamp-2 italic border-l-2 border-slate-100 pl-2">{doc.content.slice(0,150)}{doc.content.length > 150 ? '…' : ''}</p>
              )}
              <p className="text-xs text-slate-400 mt-3">{formatDate(doc.created_at)}</p>
            </motion.div>
          ))}
        </div>
        {!loading && filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-100 py-16 text-center">
            <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No documents yet</p>
            <p className="text-slate-300 text-sm mt-1">Add playbooks and documentation for the AI to reference</p>
          </div>
        )}
      </div>
    </div>
  )
}
