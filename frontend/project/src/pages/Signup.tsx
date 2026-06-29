import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, ArrowRight } from 'lucide-react'
import { authApi } from '../services/api'
import { useAuthStore } from '../stores/authStore'

const ROLES = ['csm','manager','support','executive']

export default function Signup() {
  const [form, setForm] = useState({ email:'', full_name:'', password:'', role:'csm' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setAuth } = useAuthStore()
  const nav = useNavigate()

  const handle = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const { data } = await authApi.signup(form.email, form.full_name, form.password, form.role)
      setAuth(data.user, data.access_token, data.refresh_token)
      nav('/dashboard')
    } catch (err: any) { setError(err.response?.data?.detail || 'Signup failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 bg-blue-600 rounded-2xl items-center justify-center mb-4">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Create your account</h2>
          <p className="text-slate-500 text-sm mt-1">Start your 14-day free trial</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
          {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl p-3 mb-4">{error}</div>}
          <form onSubmit={handle} className="space-y-4">
            {[
              { key:'full_name', label:'Full Name', type:'text', placeholder:'Sarah Chen' },
              { key:'email', label:'Work Email', type:'email', placeholder:'sarah@company.com' },
              { key:'password', label:'Password', type:'password', placeholder:'Min 8 characters' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
                <input type={type} value={form[key as keyof typeof form]} onChange={e => setForm({...form, [key]: e.target.value})}
                  required placeholder={placeholder}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white capitalize">
                {ROLES.map(r => <option key={r} value={r} className="capitalize">{r.toUpperCase()}</option>)}
              </select>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-6">Already have an account? <Link to="/login" className="text-blue-600 font-medium">Sign in</Link></p>
        </div>
      </motion.div>
    </div>
  )
}
